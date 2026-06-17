// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — request-access Edge Function v2
// Receives visitor data + category/linkedin, initiates Twilio Verify OTP
// Deploy: supabase functions deploy request-access --no-verify-jwt --project-ref isciigqmdfcozrtojqcm
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { name, email, phone, category, linkedin } = await req.json()

    // ── Validate required fields ──
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return json(400, { error: 'Name is required (min 2 characters)' })
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return json(400, { error: 'Valid email is required' })
    }
    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return json(400, { error: 'Valid phone number is required (include country code)' })
    }

    // Normalize phone — ensure it starts with +
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Rate limiting: max 5 requests per hour per IP ──
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: recentCount } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo)

    if ((recentCount ?? 0) >= 5) {
      return json(429, { error: 'Too many requests. Please try again later.' })
    }

    // ── Rate limiting: max 3 requests per phone per hour ──
    const { count: phoneCount } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .gte('created_at', oneHourAgo)

    if ((phoneCount ?? 0) >= 3) {
      return json(429, { error: 'Too many attempts for this phone number. Please try again later.' })
    }

    // ── Create pending access request ──
    const { data: request, error: insertErr } = await supabase
      .from('access_requests')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        category: category?.trim() || null,
        linkedin: linkedin?.trim() || null,
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown',
        status: 'pending_verification',
      })
      .select('id')
      .single()

    if (insertErr || !request) {
      console.error('Insert error:', insertErr)
      return json(500, { error: 'Failed to create request' })
    }

    // ── Send OTP via Twilio Verify ──
    const TWILIO_SID    = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const TWILIO_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const VERIFY_SID    = Deno.env.get('TWILIO_VERIFY_SID')!

    const twilioUrl  = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`
    const twilioAuth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        Channel: 'sms',
      }),
    })

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioData)
      await supabase.from('access_requests').delete().eq('id', request.id)
      return json(500, { error: 'Failed to send verification code. Please check your phone number.' })
    }

    return json(200, {
      request_id: request.id,
      status: 'otp_sent',
      phone_last4: normalizedPhone.slice(-4),
    })

  } catch (err) {
    console.error('request-access error:', err)
    return json(500, { error: 'Internal error' })
  }
})

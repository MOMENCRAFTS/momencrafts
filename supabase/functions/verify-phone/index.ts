// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — verify-phone Edge Function
// Verifies Twilio OTP, generates 30-min MCR token, emails notification
// Deploy: supabase functions deploy verify-phone --no-verify-jwt --project-ref isciigqmdfcozrtojqcm
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

/** Generate MCR-XXXXXXXX token */
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 for clarity
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `MCR-${code}`
}

/** Send notification email to admin via Resend */
async function sendNotificationEmail(
  resendKey: string,
  request: { name: string; email: string; phone: string; company?: string | null; category?: string | null; job_title?: string | null; referral_source?: string | null; message?: string | null; linkedin?: string | null },
  token: string,
  expiresAt: string,
  ip: string,
) {
  const expiryFormatted = new Date(expiresAt).toLocaleString('en-SA', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh',
  })

  const row = (label: string, val: string, isLink = false) =>
    `<tr><td style="padding: 10px 0; color: #9A9485; border-bottom: 1px solid rgba(200,169,110,0.15); width: 120px;">${label}</td><td style="padding: 10px 0; color: #EDE8DC; border-bottom: 1px solid rgba(200,169,110,0.15); font-weight: 500;">${isLink ? `<a href="${val}" style="color: #00A651;">${val}</a>` : val}</td></tr>`

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0C0A09; color: #EDE8DC; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #006C35 0%, #004D26 100%); padding: 28px 32px;">
        <h1 style="margin: 0; font-size: 18px; letter-spacing: 0.15em; color: #fff; font-weight: 600;">
          ✦ MOMENCRAFTS — NEW ACCESS REQUEST
        </h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #C8A96E; font-family: monospace; font-size: 12px; letter-spacing: 0.2em; margin: 0 0 20px;">VISITOR DETAILS</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${row('Name', request.name)}
          ${row('Email', request.email)}
          ${row('Phone', request.phone + ' ✓ verified')}
          ${request.category ? row('Interest', request.category) : ''}
          ${request.company ? row('Company', request.company) : ''}
          ${request.job_title ? row('Title', request.job_title) : ''}
          ${request.linkedin ? row('LinkedIn', request.linkedin, true) : ''}
          ${request.referral_source ? row('Source', request.referral_source) : ''}
        </table>
        ${request.message ? `
        <div style="margin: 20px 0 0; padding: 16px; background: rgba(200,169,110,0.06); border: 1px solid rgba(200,169,110,0.15); border-radius: 8px;">
          <p style="color: #C8A96E; font-family: monospace; font-size: 10px; letter-spacing: 0.2em; margin: 0 0 8px;">MESSAGE</p>
          <p style="color: #EDE8DC; font-size: 14px; line-height: 1.6; margin: 0;">${request.message}</p>
        </div>` : ''}
        <div style="margin: 28px 0; padding: 20px; background: rgba(0,108,53,0.15); border: 1px solid rgba(0,166,81,0.3); border-radius: 8px;">
          <p style="color: #C8A96E; font-family: monospace; font-size: 11px; letter-spacing: 0.2em; margin: 0 0 8px;">TOKEN ISSUED</p>
          <p style="font-family: monospace; font-size: 22px; color: #00A651; margin: 0; font-weight: 700; letter-spacing: 0.1em;">${token}</p>
          <p style="font-size: 12px; color: #9A9485; margin: 8px 0 0;">Expires: ${expiryFormatted} (Riyadh) · 30 min access</p>
        </div>
        <p style="color: #9A9485; font-size: 11px; font-family: monospace; letter-spacing: 0.05em; margin: 24px 0 0;">IP: ${ip} · ${new Date().toISOString()}</p>
      </div>
      <div style="padding: 16px 32px; background: rgba(255,255,255,0.03); border-top: 1px solid rgba(200,169,110,0.1);">
        <p style="color: #5C5650; font-size: 11px; margin: 0; text-align: center;">MomenCrafts & Co · Riyadh, Saudi Arabia · momencrafts.com</p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MomenCrafts <hello@momencrafts.com>',
        to: ['momen@momencrafts.com'],
        subject: `🔑 New Access Request — ${request.name} · ${request.company ?? 'Unknown'} (${request.category ?? 'N/A'})`,

        html,
      }),
    })
    if (!res.ok) console.error('Admin email error:', await res.text())
  } catch (err) {
    console.error('Admin email send error:', err)
  }
}

/** Send the visitor their token + magic link */
async function sendVisitorEmail(
  resendKey: string,
  visitorEmail: string,
  visitorName: string,
  token: string,
  expiresAt: string,
) {
  const magicLink = `https://momencrafts.com/?token=${token}`
  const expiryFormatted = new Date(expiresAt).toLocaleString('en-SA', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh',
  })

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0C0A09; color: #EDE8DC; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a1207 0%, #0C0A09 100%); padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid rgba(200,169,110,0.15);">
        <div style="font-size: 28px; margin-bottom: 8px;">✦</div>
        <div style="font-family: monospace; font-size: 11px; letter-spacing: 0.3em; color: rgba(200,169,110,0.6); margin-bottom: 4px;">MOMENCRAFTS & CO</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #EDE8DC;">Your Access Key</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #9A9485; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          Hi ${visitorName}, your identity has been verified. Here is your 30-minute access pass to MomenCrafts & Co.
        </p>

        <div style="background: rgba(200,169,110,0.06); border: 1px solid rgba(200,169,110,0.25); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-family: monospace; font-size: 10px; letter-spacing: 0.25em; color: rgba(200,169,110,0.5); margin-bottom: 10px;">ACCESS KEY</div>
          <div style="font-family: monospace; font-size: 28px; font-weight: 900; letter-spacing: 0.12em; color: #C8A96E; margin-bottom: 10px;">${token}</div>
          <div style="font-family: monospace; font-size: 11px; color: #5C5650;">⏱ Expires: ${expiryFormatted} (Riyadh time)</div>
        </div>

        <a href="${magicLink}" style="display: block; background: #006C35; color: #fff; text-align: center; padding: 16px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; margin-bottom: 20px;">
          Enter the Studio →
        </a>

        <p style="font-size: 12px; color: #5C5650; font-family: monospace; text-align: center; margin: 0;">
          Or paste this key at momencrafts.com · Valid for 30 minutes only
        </p>
      </div>
      <div style="padding: 16px 32px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(200,169,110,0.08);">
        <p style="color: #3a3530; font-size: 11px; margin: 0; text-align: center;">MomenCrafts & Co · Riyadh, Saudi Arabia</p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MomenCrafts <hello@momencrafts.com>',
        to: [visitorEmail],
        subject: `✦ Your MomenCrafts Access Key — ${token}`,
        html,
      }),
    })
    if (!res.ok) console.error('Visitor email error:', await res.text())
  } catch (err) {
    console.error('Visitor email send error:', err)
  }
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { request_id, otp_code } = await req.json()

    if (!request_id || typeof request_id !== 'string') {
      return json(400, { error: 'request_id is required' })
    }
    if (!otp_code || typeof otp_code !== 'string' || otp_code.length < 4) {
      return json(400, { error: 'Valid OTP code is required' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── 1. Look up pending request ──
    const { data: request, error: fetchErr } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', request_id)
      .eq('status', 'pending_verification')
      .single()

    if (fetchErr || !request) {
      return json(404, { error: 'Request not found or already verified' })
    }

    // ── 2. Check request age (max 10 min for OTP entry) ──
    const requestAge = Date.now() - new Date(request.created_at).getTime()
    if (requestAge > 10 * 60 * 1000) {
      await supabase.from('access_requests')
        .update({ status: 'expired' })
        .eq('id', request_id)
      return json(410, { error: 'Verification window expired. Please start over.' })
    }

    // ── 3. Verify OTP with Twilio ──
    const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const VERIFY_SID = Deno.env.get('TWILIO_VERIFY_SID')!

    const twilioUrl = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`
    const twilioAuth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: request.phone,
        Code: otp_code.trim(),
      }),
    })

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok || twilioData.status !== 'approved') {
      return json(400, { error: 'Invalid verification code. Please try again.' })
    }

    // ── 4. Generate MCR token (30-min expiry) ──
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    // Ensure token is unique (extremely unlikely collision but safe)
    const { data: existing } = await supabase
      .from('investor_tokens')
      .select('id')
      .eq('token', token)
      .maybeSingle()

    if (existing) {
      // Regenerate on collision
      const token2 = generateToken()
      const { data: tokenRow, error: tokenErr } = await supabase
        .from('investor_tokens')
        .insert({
          token: token2,
          label: `${request.name} (self-service)`,
          email: request.email,
          notes: `Self-service request. Phone: ${request.phone}${request.company ? `. Company: ${request.company}` : ''}`,
          token_type: 'HALF_HOUR',
          expires_at: expiresAt,
        })
        .select('id')
        .single()

      if (tokenErr || !tokenRow) {
        console.error('Token insert error:', tokenErr)
        return json(500, { error: 'Failed to generate access token' })
      }

      // Update access request
      await supabase.from('access_requests')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          token_id: tokenRow.id,
        })
        .eq('id', request_id)

      // Send notification email
      const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      await sendNotificationEmail(RESEND_KEY, request, token2, expiresAt, ip)
      await sendVisitorEmail(RESEND_KEY, request.email, request.name, token2, expiresAt)

      return json(200, {
        success: true,
        token: token2,
        expires_at: expiresAt,
        name: request.name,
      })
    }

    // ── 5. Insert token (no collision) ──
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('investor_tokens')
      .insert({
        token,
        label: `${request.name} (self-service)`,
        email: request.email,
        notes: `Self-service request. Phone: ${request.phone}${request.company ? `. Company: ${request.company}` : ''}`,
        token_type: 'HALF_HOUR',
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (tokenErr || !tokenRow) {
      console.error('Token insert error:', tokenErr)
      return json(500, { error: 'Failed to generate access token' })
    }

    // ── 6. Update access request → verified ──
    await supabase.from('access_requests')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        token_id: tokenRow.id,
      })
      .eq('id', request_id)

    // ── 7. Send emails via Resend ──
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await sendNotificationEmail(RESEND_KEY, request, token, expiresAt, ip)
    await sendVisitorEmail(RESEND_KEY, request.email, request.name, token, expiresAt)

    // ── 8. Return token to client ──
    return json(200, {
      success: true,
      token,
      expires_at: expiresAt,
      name: request.name,
    })

  } catch (err) {
    console.error('verify-phone error:', err)
    return json(500, { error: 'Internal error' })
  }
})

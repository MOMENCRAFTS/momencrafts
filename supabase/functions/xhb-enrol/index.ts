// ═══════════════════════════════════════════════════════════
// XHB — Enrolment Edge Function
// Redeems a one-time access token, creates an allowed_users row,
// then triggers phone OTP for the new user.
//
// Deploy: supabase functions deploy xhb-enrol --no-verify-jwt --project-ref isciigqmdfcozrtojqcm
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const PAD_TO_MS = 3000
const UNIFORM_RESPONSE = {
  enrolled: true,
  message: 'If this token is valid, your account has been created and a verification code sent.',
}

function normalizePhone(phone: string): string {
  let n = phone.replace(/[^\d+]/g, '')
  if (!n.startsWith('+')) n = '+' + n
  return n
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase()
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}

function json(status: number, body: object, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function padToConstantTime(startMs: number): Promise<void> {
  const elapsed = Date.now() - startMs
  const remaining = Math.max(0, PAD_TO_MS - elapsed)
  if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  const startMs = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const { token, email, phone } = await req.json()

    if (!token || !email || !phone) {
      await padToConstantTime(startMs)
      return json(200, UNIFORM_RESPONSE, cors)
    }

    const normEmail = normalizeEmail(email)
    const normPhone = normalizePhone(phone)
    const tokenHash = await sha256(token.trim())

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Find token: must exist, unexpired, unredeemed, unrevoked ──
    const { data: tok } = await sb
      .schema('xhb')
      .from('enrolment_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!tok) {
      await sb.schema('xhb').from('access_log')
        .insert({ actor: 'system', subject: normEmail, action: 'enrol_denied', detail: { reason: 'invalid_token' } })
      await padToConstantTime(startMs)
      return json(200, UNIFORM_RESPONSE, cors)
    }

    // ── Bindings must match ──
    if (normalizeEmail(tok.bound_email) !== normEmail || normalizePhone(tok.bound_phone) !== normPhone) {
      await sb.schema('xhb').from('access_log')
        .insert({ actor: 'system', subject: normEmail, action: 'enrol_denied', detail: { reason: 'binding_mismatch' } })
      await padToConstantTime(startMs)
      return json(200, UNIFORM_RESPONSE, cors)
    }

    // ── Create allowed_users row ──
    const { error: insertErr } = await sb
      .schema('xhb')
      .from('allowed_users')
      .insert({
        email: normEmail,
        phone: normPhone,
        display_name: tok.display_name || '',
        tier: tok.tier || 'guest',
        is_superadmin: false,
      })

    if (insertErr) {
      // If already exists (conflict), that's fine — continue to OTP
      if (!insertErr.message?.includes('duplicate')) {
        console.error('Enrol insert error:', insertErr)
        await padToConstantTime(startMs)
        return json(200, UNIFORM_RESPONSE, cors)
      }
    }

    // ── Stamp token as redeemed ──
    await sb.schema('xhb').from('enrolment_tokens')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('id', tok.id)

    // ── Log the enrolment ──
    await sb.schema('xhb').from('access_log')
      .insert({ actor: normEmail, subject: normEmail, action: 'enrol_redeemed', detail: { token_id: tok.id, tier: tok.tier } })

    // ── Send phone OTP ──
    const otpRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/otp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        },
        body: JSON.stringify({ phone: normPhone }),
      },
    )

    if (!otpRes.ok) {
      console.error('Enrol OTP send failed:', await otpRes.text())
    }

    await padToConstantTime(startMs)
    return json(200, UNIFORM_RESPONSE, cors)

  } catch (err) {
    console.error('xhb-enrol error:', err)
    await padToConstantTime(startMs)
    return json(200, UNIFORM_RESPONSE, cors)
  }
})

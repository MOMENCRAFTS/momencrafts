// ═══════════════════════════════════════════════════════════
// XHB — Gate Request Edge Function
// Validates email+phone pair against xhb.allowed_users, then
// sends native Supabase phone OTP only on match.
// Returns a uniform 200 response regardless of outcome.
//
// Deploy: supabase functions deploy xhb-gate-request --no-verify-jwt --project-ref isciigqmdfcozrtojqcm
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ── Constants ─────────────────────────────────────────────
const MAX_ATTEMPTS_PER_HOUR = 5
const LOCKOUT_DURATION_MS = 60 * 60 * 1000 // 1 hour
const UNIFORM_RESPONSE = {
  sent: true,
  message: 'If this number is registered, a verification code has been sent.',
}
// Pad every response to this wall-clock time (ms).
// Must exceed the slowest real path (Twilio OTP send ≈ 1–2s).
const PAD_TO_MS = 3000

// ── Helpers ───────────────────────────────────────────────

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

// ── Main handler ──────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  const startMs = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const { email, phone } = await req.json()

    // ── Input validation ──
    if (!email || typeof email !== 'string' || !phone || typeof phone !== 'string') {
      await padToConstantTime(startMs)
      return json(200, UNIFORM_RESPONSE, cors) // uniform even on bad input
    }

    const normEmail = normalizeEmail(email)
    const normPhone = normalizePhone(phone)
    const phoneHash = await sha256(normPhone)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ua = req.headers.get('user-agent') || ''

    // ── Service-role client (reads xhb.* tables, bypasses RLS) ──
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Rate-limit check ──
    let locked = false
    const { data: attempt } = await sb
      .schema('xhb')
      .from('gate_attempts')
      .select('*')
      .eq('phone_hash', phoneHash)
      .maybeSingle()

    if (attempt) {
      // Check lockout
      if (attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
        locked = true
      } else {
        const windowStart = new Date(attempt.window_start)
        const hourAgo = new Date(Date.now() - LOCKOUT_DURATION_MS)

        if (windowStart > hourAgo && attempt.attempts >= MAX_ATTEMPTS_PER_HOUR) {
          // Lock this phone for 1 hour
          await sb.schema('xhb').from('gate_attempts')
            .update({ locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString() })
            .eq('id', attempt.id)
          locked = true
        } else if (windowStart <= hourAgo) {
          // Window expired — reset
          await sb.schema('xhb').from('gate_attempts')
            .update({ attempts: 1, window_start: new Date().toISOString(), locked_until: null })
            .eq('id', attempt.id)
        } else {
          // Increment within window
          await sb.schema('xhb').from('gate_attempts')
            .update({ attempts: attempt.attempts + 1 })
            .eq('id', attempt.id)
        }
      }
    } else {
      // First attempt from this phone
      await sb.schema('xhb').from('gate_attempts')
        .insert({ phone_hash: phoneHash, attempts: 1 })
    }

    if (locked) {
      await sb.schema('xhb').from('gate_log')
        .insert({ phone_hash: phoneHash, outcome: 'locked', ip, user_agent: ua })
      await padToConstantTime(startMs)
      return json(200, UNIFORM_RESPONSE, cors)
    }

    // ── Allowlist check: BOTH email AND phone must match the same row ──
    //    AND the user must not be disabled.
    const { data: match } = await sb
      .schema('xhb')
      .from('allowed_users')
      .select('email')
      .eq('email', normEmail)
      .eq('phone', normPhone)
      .is('disabled_at', null)
      .maybeSingle()

    if (!match) {
      // No match — log and return uniform response (no OTP sent)
      await sb.schema('xhb').from('gate_log')
        .insert({ phone_hash: phoneHash, outcome: 'denied', ip, user_agent: ua })
      await sb.schema('xhb').from('access_log')
        .insert({ actor: 'system', subject: normEmail, action: 'gate_denied', detail: { ip, reason: 'no_match' } })
      await padToConstantTime(startMs)
      return json(200, UNIFORM_RESPONSE, cors)
    }

    // ── Match found: send native Supabase phone OTP ──
    // This calls the GoTrue /otp endpoint which triggers Twilio via
    // the configured Phone provider in Supabase Auth settings.
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

    const outcome = otpRes.ok ? 'otp_sent' : 'error'
    if (!otpRes.ok) {
      console.error('OTP send failed:', await otpRes.text())
    }

    await sb.schema('xhb').from('gate_log')
      .insert({ phone_hash: phoneHash, outcome, ip, user_agent: ua })
    await sb.schema('xhb').from('access_log')
      .insert({ actor: normEmail, subject: normEmail, action: outcome === 'otp_sent' ? 'gate_otp_sent' : 'gate_otp_error', detail: { ip } })

    await padToConstantTime(startMs)
    return json(200, UNIFORM_RESPONSE, cors)

  } catch (err) {
    console.error('xhb-gate-request error:', err)
    await padToConstantTime(startMs)
    return json(200, UNIFORM_RESPONSE, cors) // uniform even on crash
  }
})

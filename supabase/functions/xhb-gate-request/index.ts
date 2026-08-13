// ═══════════════════════════════════════════════════════════
// XHB — Gate Request Edge Function
// Two actions:
//   1. action:"gate"  — Original phone OTP gate (email+phone → verify → OTP)
//   2. action:"sso"   — SSO session minter (mcr_token → verify MCR token →
//                        confirm xhb.allowed_users → mint Supabase session)
//
// The service_role key lives HERE as a function secret — NEVER in the browser.
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

// ── Login notification email (fire-and-forget) ────────────
const NOTIFY_EMAIL = 'momen@momencrafts.com'

async function notifyLogin(who: string, displayName: string, method: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  // Don't notify Momen about his own logins
  if (who.toLowerCase() === NOTIFY_EMAIL) return
  const now = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Riyadh',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MomenCrafts XHB <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject: `\u2726 ${displayName || who} just entered XHB`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:20px;background:#0d0d0d;color:#f0ebe3;border-radius:12px;">
            <div style="text-align:center;color:#c8a96e;font-size:20px;margin-bottom:6px;">\u2726</div>
            <div style="text-align:center;font-size:10px;letter-spacing:3px;color:#c8a96e;margin-bottom:14px;">XHB LOGIN</div>
            <hr style="border:none;border-top:1px solid #2a2520;margin:12px 0;">
            <p style="font-size:15px;margin:0 0 6px;"><strong style="color:#c8a96e;">${displayName || who}</strong> logged in.</p>
            <p style="font-size:12px;color:#888;margin:0 0 12px;">Method: ${method} &middot; ${now} KSA</p>
            <a href="https://www.momencrafts.com/xhb/" style="display:inline-block;padding:10px 24px;background:#c8a96e;color:#0d0d0d;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;">Open XHB &rarr;</a>
          </div>
        `,
      }),
    })
  } catch (_) { /* non-blocking */ }
}

// ── SSO handler ───────────────────────────────────────────
// Called by the MomenCrafts portal when a co-founder picks XHB.
// Verifies the MCR token, confirms the person is in xhb.allowed_users,
// creates the Supabase auth user if missing, and returns session tokens.

async function handleSSO(
  req: Request,
  cors: Record<string, string>,
  body: { mcr_token?: string },
): Promise<Response> {
  const UNIFORM_SSO_DENY = { error: 'Access denied' }
  const { mcr_token } = body
  if (!mcr_token || typeof mcr_token !== 'string') {
    return json(403, UNIFORM_SSO_DENY, cors)
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // 1. Rate-limit SSO attempts by IP (max 10 per 15 minutes)
  const ssoHash = await sha256('sso:' + ip)
  const { data: ssoAttempt } = await sb
    .schema('xhb')
    .from('gate_attempts')
    .select('*')
    .eq('phone_hash', ssoHash)
    .maybeSingle()

  if (ssoAttempt) {
    const windowStart = new Date(ssoAttempt.window_start)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (ssoAttempt.locked_until && new Date(ssoAttempt.locked_until) > new Date()) {
      return json(403, UNIFORM_SSO_DENY, cors)
    }
    if (windowStart > fifteenMinAgo && ssoAttempt.attempts >= 10) {
      await sb.schema('xhb').from('gate_attempts')
        .update({ locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() })
        .eq('id', ssoAttempt.id)
      return json(403, UNIFORM_SSO_DENY, cors)
    }
    if (windowStart <= fifteenMinAgo) {
      await sb.schema('xhb').from('gate_attempts')
        .update({ attempts: 1, window_start: new Date().toISOString(), locked_until: null })
        .eq('id', ssoAttempt.id)
    } else {
      await sb.schema('xhb').from('gate_attempts')
        .update({ attempts: ssoAttempt.attempts + 1 })
        .eq('id', ssoAttempt.id)
    }
  } else {
    await sb.schema('xhb').from('gate_attempts')
      .insert({ phone_hash: ssoHash, attempts: 1 })
  }

  // 2. Verify the MCR token (lookup investor_tokens with service role)
  const normalizedToken = (mcr_token || '').toUpperCase().trim().slice(0, 24)
  const { data: tokenRow, error: tokenErr } = await sb
    .from('investor_tokens')
    .select('id, label, email, token_type, expires_at, revoked_at, project_access')
    .eq('token', normalizedToken)
    .maybeSingle()

  if (tokenErr || !tokenRow) {
    await sb.schema('xhb').from('access_log').insert({
      actor: 'system', subject: 'unknown',
      action: 'sso_denied', detail: { ip, reason: 'invalid_token' },
    })
    return json(403, UNIFORM_SSO_DENY, cors)
  }

  // 3. Check token validity
  if (tokenRow.revoked_at || (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date())) {
    return json(403, UNIFORM_SSO_DENY, cors)
  }

  // 4. Check project_access includes 'xhb'
  const projects: string[] = tokenRow.project_access || []
  if (!projects.includes('xhb')) {
    return json(403, UNIFORM_SSO_DENY, cors)
  }

  // 5. Identity is bound to the token — NEVER from the client
  const resolvedEmail = normalizeEmail(tokenRow.email)
  if (!resolvedEmail) {
    return json(403, UNIFORM_SSO_DENY, cors) // token not bound to an identity
  }

  // 5. Confirm the person is in xhb.allowed_users and not disabled
  const { data: allowedUser } = await sb
    .schema('xhb')
    .from('allowed_users')
    .select('email, display_name')
    .eq('email', resolvedEmail)
    .is('disabled_at', null)
    .maybeSingle()

  if (!allowedUser) {
    await sb.schema('xhb').from('access_log').insert({
      actor: resolvedEmail, subject: resolvedEmail,
      action: 'sso_denied', detail: { ip, reason: 'not_in_allowed_users' },
    })
    return json(403, { error: 'Not authorized for XHB' }, cors)
  }

  // 6. Create or find the Supabase auth user
  //    Look up by email first; create if missing.
  let userId: string | null = null

  const { data: existingUsers } = await sb.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(
    (u: { email?: string }) => normalizeEmail(u.email || '') === resolvedEmail
  )

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Create user — email_confirm:true, suppress signup email
    const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
      email: resolvedEmail,
      email_confirm: true,
      user_metadata: {
        display_name: allowedUser.display_name || tokenRow.label || '',
        source: 'xhb_sso',
      },
    })
    if (createErr || !newUser?.user) {
      console.error('User creation failed:', createErr)
      return json(500, { error: 'Failed to provision user' }, cors)
    }
    userId = newUser.user.id
  }

  // 7. Generate a magic link and extract the session tokens
  //    We use generateLink to get a link, then exchange it server-side.
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: resolvedEmail,
  })

  if (linkErr || !linkData) {
    console.error('Link generation failed:', linkErr)
    return json(500, { error: 'Failed to mint session' }, cors)
  }

  // The generateLink response contains properties.hashed_token
  // which we can use to verify the OTP and get a session
  const hashedToken = linkData.properties?.hashed_token
  if (!hashedToken) {
    console.error('No hashed_token in generateLink response')
    return json(500, { error: 'Failed to mint session' }, cors)
  }

  // Verify the OTP server-side to obtain the session
  const verifyRes = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      },
      body: JSON.stringify({
        type: 'magiclink',
        token_hash: hashedToken,
      }),
    },
  )

  if (!verifyRes.ok) {
    const errText = await verifyRes.text()
    console.error('OTP verify failed:', errText)
    return json(500, { error: 'Failed to mint session' }, cors)
  }

  const session = await verifyRes.json()

  // 8. Log success
  await sb.schema('xhb').from('access_log').insert({
    actor: resolvedEmail, subject: resolvedEmail,
    action: 'sso_session_minted', detail: { ip, token_type: tokenRow.token_type },
  })

  // 8b. Notify Momen about login (fire-and-forget)
  notifyLogin(resolvedEmail, allowedUser.display_name || '', 'SSO token').catch(() => {})

  // 9. Return session tokens — the portal calls setSession with these
  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: {
      id: session.user?.id || userId,
      email: resolvedEmail,
      display_name: allowedUser.display_name || tokenRow.label || '',
    },
  }, cors)
}

// ── Admin SSO handler ─────────────────────────────────────
// Called when the portal admin has a valid portal session but
// the mcr_token has expired/cleared. Verifies the email is a
// superadmin in xhb.allowed_users, then mints a session.

async function handleAdminSSO(
  req: Request,
  cors: Record<string, string>,
  body: { email?: string },
): Promise<Response> {
  const DENY = { error: 'Access denied' }
  const { email } = body
  if (!email || typeof email !== 'string') {
    return json(403, DENY, cors)
  }

  const resolvedEmail = normalizeEmail(email)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Rate-limit by IP
  const ssoHash = await sha256('admin_sso:' + ip)
  const { data: attempt } = await sb.schema('xhb').from('gate_attempts')
    .select('*').eq('phone_hash', ssoHash).maybeSingle()
  if (attempt) {
    if (attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
      return json(403, DENY, cors)
    }
    const windowStart = new Date(attempt.window_start)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (windowStart > fiveMinAgo && attempt.attempts >= 5) {
      await sb.schema('xhb').from('gate_attempts')
        .update({ locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() })
        .eq('id', attempt.id)
      return json(403, DENY, cors)
    }
    if (windowStart <= fiveMinAgo) {
      await sb.schema('xhb').from('gate_attempts')
        .update({ attempts: 1, window_start: new Date().toISOString(), locked_until: null })
        .eq('id', attempt.id)
    } else {
      await sb.schema('xhb').from('gate_attempts')
        .update({ attempts: attempt.attempts + 1 }).eq('id', attempt.id)
    }
  } else {
    await sb.schema('xhb').from('gate_attempts').insert({ phone_hash: ssoHash, attempts: 1 })
  }

  // Verify: must be a superadmin in xhb.allowed_users
  const { data: admin } = await sb.schema('xhb').from('allowed_users')
    .select('email, display_name, is_superadmin')
    .eq('email', resolvedEmail)
    .eq('is_superadmin', true)
    .is('disabled_at', null)
    .maybeSingle()

  if (!admin) {
    await sb.schema('xhb').from('access_log').insert({
      actor: resolvedEmail, subject: resolvedEmail,
      action: 'admin_sso_denied', detail: { ip, reason: 'not_superadmin' },
    })
    return json(403, DENY, cors)
  }

  // Mint session (same flow as SSO step 6-7)
  let userId: string | null = null
  const { data: existingUsers } = await sb.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(
    (u: { email?: string }) => normalizeEmail(u.email || '') === resolvedEmail
  )

  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
      email: resolvedEmail, email_confirm: true,
      user_metadata: { display_name: admin.display_name || '', source: 'admin_sso' },
    })
    if (createErr || !newUser?.user) {
      return json(500, { error: 'Failed to provision user' }, cors)
    }
    userId = newUser.user.id
  }

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink', email: resolvedEmail,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    return json(500, { error: 'Failed to mint session' }, cors)
  }

  const verifyRes = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      },
      body: JSON.stringify({ type: 'magiclink', token_hash: linkData.properties.hashed_token }),
    },
  )

  if (!verifyRes.ok) {
    return json(500, { error: 'Failed to mint session' }, cors)
  }

  const session = await verifyRes.json()

  await sb.schema('xhb').from('access_log').insert({
    actor: resolvedEmail, subject: resolvedEmail,
    action: 'admin_sso_session_minted', detail: { ip },
  })

  // Notify Momen about login (fire-and-forget)
  notifyLogin(resolvedEmail, admin.display_name || '', 'Admin SSO').catch(() => {})

  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: { id: session.user?.id || userId, email: resolvedEmail, display_name: admin.display_name || '' },
  }, cors)
}

// ── Original gate handler (phone OTP) ─────────────────────

async function handleGate(
  req: Request,
  cors: Record<string, string>,
  body: { email?: string; phone?: string },
  startMs: number,
): Promise<Response> {
  const { email, phone } = body

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
    if (attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
      locked = true
    } else {
      const windowStart = new Date(attempt.window_start)
      const hourAgo = new Date(Date.now() - LOCKOUT_DURATION_MS)

      if (windowStart > hourAgo && attempt.attempts >= MAX_ATTEMPTS_PER_HOUR) {
        await sb.schema('xhb').from('gate_attempts')
          .update({ locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString() })
          .eq('id', attempt.id)
        locked = true
      } else if (windowStart <= hourAgo) {
        await sb.schema('xhb').from('gate_attempts')
          .update({ attempts: 1, window_start: new Date().toISOString(), locked_until: null })
          .eq('id', attempt.id)
      } else {
        await sb.schema('xhb').from('gate_attempts')
          .update({ attempts: attempt.attempts + 1 })
          .eq('id', attempt.id)
      }
    }
  } else {
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
  const { data: match } = await sb
    .schema('xhb')
    .from('allowed_users')
    .select('email')
    .eq('email', normEmail)
    .eq('phone', normPhone)
    .is('disabled_at', null)
    .maybeSingle()

  if (!match) {
    await sb.schema('xhb').from('gate_log')
      .insert({ phone_hash: phoneHash, outcome: 'denied', ip, user_agent: ua })
    await sb.schema('xhb').from('access_log')
      .insert({ actor: 'system', subject: normEmail, action: 'gate_denied', detail: { ip, reason: 'no_match' } })
    await padToConstantTime(startMs)
    return json(200, UNIFORM_RESPONSE, cors)
  }

  // ── Match found: send native Supabase phone OTP ──
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
}

// ── Main handler ──────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  const startMs = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const body = await req.json()
    const action = body.action || 'gate' // default to original behaviour

    if (action === 'sso') {
      return await handleSSO(req, cors, body)
    } else if (action === 'admin_sso') {
      return await handleAdminSSO(req, cors, body)
    } else {
      return await handleGate(req, cors, body, startMs)
    }
  } catch (err) {
    console.error('xhb-gate-request error:', err)
    await padToConstantTime(startMs)
    return json(200, UNIFORM_RESPONSE, cors) // uniform even on crash
  }
})

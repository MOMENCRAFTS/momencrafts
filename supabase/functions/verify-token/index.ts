// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — verify-token Edge Function
// Validates investor token, creates session, returns data
// SECURITY: Rate-limited per IP (10 attempts/15min) and per token (5/15min)
// Deploy: supabase functions deploy verify-token --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return json(400, { valid: false, error: 'Token is required' }, cors)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const ip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown'

    // ── Rate limit: max 10 attempts per IP per 15 minutes ──
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count: ipAttempts } = await supabase
      .from('investor_failed_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', fifteenMinAgo)

    if ((ipAttempts ?? 0) >= 10) {
      return json(429, { valid: false, error: 'Too many attempts. Please wait 15 minutes.' }, cors)
    }

    // ── Rate limit: max 5 attempts per token string per 15 minutes ──
    const normalizedToken = token.toUpperCase().trim().slice(0, 24) // cap length
    const { count: tokenAttempts } = await supabase
      .from('investor_failed_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('attempted_token', normalizedToken.slice(0, 12))
      .gte('created_at', fifteenMinAgo)

    if ((tokenAttempts ?? 0) >= 5) {
      return json(429, { valid: false, error: 'Too many attempts for this key. Please wait.' }, cors)
    }

    // 1. Look up token
    const { data: row, error } = await supabase
      .from('investor_tokens')
      .select('id, label, email, token_type, expires_at, revoked_at, nda_signed_at, project_access')
      .eq('token', normalizedToken)
      .maybeSingle()

    if (error || !row) {
      // Log failed attempt
      await supabase.from('investor_failed_attempts').insert({
        attempted_token: normalizedToken.slice(0, 12),
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown',
      })
      return json(401, { valid: false, error: 'Invalid access key' }, cors)
    }

    // 2. Check revoked
    if (row.revoked_at) {
      return json(403, { valid: false, error: 'Access has been revoked' }, cors)
    }

    // 3. Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return json(403, { valid: false, error: 'Access key has expired' }, cors)
    }

    // 4. Create session
    const sessionKey = crypto.randomUUID()
    const { error: sessErr } = await supabase.from('investor_sessions').insert({
      token_id: row.id,
      session_key: sessionKey,
      user_agent: req.headers.get('user-agent') || 'unknown',
      ip_address: ip,
    })

    if (sessErr) {
      console.error('Session create error:', sessErr)
      return json(500, { valid: false, error: 'Internal error' }, cors)
    }

    // 5. Return success
    return json(200, {
      valid: true,
      sessionKey,
      tokenId: row.id,
      tokenType: row.token_type,
      expiresAt: row.expires_at,
      investorLabel: row.label,
      investorEmail: row.email,
      ndaSignedAt: row.nda_signed_at,
      ndaRequired: !row.nda_signed_at,
      projectAccess: row.project_access || [],
    }, cors)
  } catch (err) {
    console.error('verify-token error:', err)
    return json(500, { valid: false, error: 'Internal error' }, cors)
  }
})

// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — verify-token Edge Function
// Validates investor token, creates session, returns data
// Deploy: supabase functions deploy verify-token --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return json(400, { valid: false, error: 'Token is required' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Look up token
    const { data: row, error } = await supabase
      .from('investor_tokens')
      .select('id, label, email, token_type, expires_at, revoked_at, nda_signed_at')
      .eq('token', token.toUpperCase().trim())
      .maybeSingle()

    if (error || !row) {
      // Log failed attempt
      await supabase.from('investor_failed_attempts').insert({
        attempted_token: token.slice(0, 12),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      })
      return json(401, { valid: false, error: 'Invalid access key' })
    }

    // 2. Check revoked
    if (row.revoked_at) {
      return json(403, { valid: false, error: 'Access has been revoked' })
    }

    // 3. Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return json(403, { valid: false, error: 'Access key has expired' })
    }

    // 4. Create session
    const sessionKey = crypto.randomUUID()
    const { error: sessErr } = await supabase.from('investor_sessions').insert({
      token_id: row.id,
      session_key: sessionKey,
      user_agent: req.headers.get('user-agent') || 'unknown',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    })

    if (sessErr) {
      console.error('Session create error:', sessErr)
      return json(500, { valid: false, error: 'Internal error' })
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
    })
  } catch (err) {
    console.error('verify-token error:', err)
    return json(500, { valid: false, error: 'Internal error' })
  }
})

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

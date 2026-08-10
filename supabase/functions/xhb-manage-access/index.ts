// ═══════════════════════════════════════════════════════════
// XHB — Access Management Edge Function
// Issue, list, revoke enrolment tokens; enable/disable users;
// view access log. Restricted to superadmin (X-Admin-Key header).
//
// Deploy: supabase functions deploy xhb-manage-access --no-verify-jwt --project-ref isciigqmdfcozrtojqcm
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const ADMIN_KEY = Deno.env.get('XHB_ADMIN_KEY') || ''

function json(status: number, body: object, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return 'XHB-' + Array.from(bytes, b => chars[b % chars.length]).join('')
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  // ── Auth: X-Admin-Key header ──
  const adminKey = req.headers.get('X-Admin-Key') || ''
  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return json(401, { error: 'Unauthorized' }, cors)
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { action, ...params } = await req.json()

    // ── Issue a new enrolment token ──
    if (action === 'issue_token') {
      const { email, phone, display_name, tier } = params
      if (!email || !phone) return json(400, { error: 'email and phone required' }, cors)

      const plainToken = generateToken()
      const tokenHash = await sha256(plainToken)

      const { error } = await sb.schema('xhb').from('enrolment_tokens').insert({
        token_hash: tokenHash,
        bound_email: email.trim().toLowerCase(),
        bound_phone: phone.replace(/[^\d+]/g, ''),
        display_name: display_name || '',
        tier: tier || 'guest',
        created_by: 'momen@momencrafts.com',
      })

      if (error) return json(500, { error: error.message }, cors)

      await sb.schema('xhb').from('access_log').insert({
        actor: 'momen@momencrafts.com',
        subject: email.trim().toLowerCase(),
        action: 'token_issued',
        detail: { tier: tier || 'guest', display_name: display_name || '' },
      })

      // Show token ONCE — it cannot be retrieved after this
      return json(200, {
        token: plainToken,
        message: 'Token created. Share it securely — it cannot be shown again.',
        expires_in: '7 days',
      }, cors)
    }

    // ── List tokens ──
    if (action === 'list_tokens') {
      const { data } = await sb.schema('xhb').from('enrolment_tokens')
        .select('id, bound_email, bound_phone, display_name, tier, expires_at, created_at, emailed_at, redeemed_at, revoked_at')
        .order('created_at', { ascending: false })
        .limit(50)
      return json(200, { tokens: data || [] }, cors)
    }

    // ── Revoke a token ──
    if (action === 'revoke_token') {
      const { token_id } = params
      if (!token_id) return json(400, { error: 'token_id required' }, cors)

      await sb.schema('xhb').from('enrolment_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', token_id)
        .is('revoked_at', null)

      await sb.schema('xhb').from('access_log').insert({
        actor: 'momen@momencrafts.com',
        subject: token_id,
        action: 'token_revoked',
      })

      return json(200, { revoked: true }, cors)
    }

    // ── List users ──
    if (action === 'list_users') {
      const { data } = await sb.schema('xhb').from('allowed_users')
        .select('email, phone, display_name, tier, is_superadmin, disabled_at, added_at')
        .order('added_at', { ascending: true })
      return json(200, { users: data || [] }, cors)
    }

    // ── Disable a user ──
    if (action === 'disable_user') {
      const { email } = params
      if (!email) return json(400, { error: 'email required' }, cors)
      if (email.toLowerCase() === 'momen@momencrafts.com') {
        return json(400, { error: 'Cannot disable the superadmin' }, cors)
      }

      await sb.schema('xhb').from('allowed_users')
        .update({ disabled_at: new Date().toISOString() })
        .eq('email', email.toLowerCase())

      await sb.schema('xhb').from('access_log').insert({
        actor: 'momen@momencrafts.com',
        subject: email.toLowerCase(),
        action: 'user_disabled',
      })

      return json(200, { disabled: true }, cors)
    }

    // ── Enable a user ──
    if (action === 'enable_user') {
      const { email } = params
      if (!email) return json(400, { error: 'email required' }, cors)

      await sb.schema('xhb').from('allowed_users')
        .update({ disabled_at: null })
        .eq('email', email.toLowerCase())

      await sb.schema('xhb').from('access_log').insert({
        actor: 'momen@momencrafts.com',
        subject: email.toLowerCase(),
        action: 'user_enabled',
      })

      return json(200, { enabled: true }, cors)
    }

    // ── View access log ──
    if (action === 'access_log') {
      const limit = params.limit || 100
      const { data } = await sb.schema('xhb').from('access_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      return json(200, { log: data || [] }, cors)
    }

    return json(400, { error: 'Unknown action: ' + action }, cors)

  } catch (err) {
    console.error('xhb-manage-access error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

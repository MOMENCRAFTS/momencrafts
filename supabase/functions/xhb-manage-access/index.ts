// ═══════════════════════════════════════════════════════════
// XHB — Access Management Edge Function
// Issue, list, revoke enrolment tokens; enable/disable users;
// view access log. Restricted to superadmin (X-Admin-Key header).
//
// Deploy: supabase functions deploy xhb-manage-access --no-verify-jwt --project-ref isciigqmdfcozrtojqcm
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'
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
        .select('email, phone, display_name, tier, is_superadmin, is_builder, disabled_at, added_at')
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

    // ── Round progress: settled / who holds the ball / how long ──
    if (action === 'round_progress') {
      const { data: users, error: uErr } = await sb.schema('xhb')
        .from('allowed_users')
        .select('email, display_name, is_builder, disabled_at')
        .is('disabled_at', null)
      if (uErr) return json(500, { error: 'allowed_users: ' + uErr.message }, cors)

      const builders = new Set((users || []).filter(u => u.is_builder).map(u => u.email.toLowerCase()))

      const { data: allItems, error: iErr } = await sb.schema('xhb')
        .from('alignment_items')
        .select('id, title, round, round_status, category, position, updated_at')
        .eq('round_status', 'published')
        .order('position', { ascending: true })
      if (iErr) return json(500, { error: 'alignment_items: ' + iErr.message }, cors)

      const rounds   = (allItems || []).map(i => i.round ?? 1)
      const openRound = rounds.length ? Math.max(...rounds) : 1
      const items = (allItems || []).filter(i => (i.round ?? 1) === openRound && i.category !== 'recap')

      // NOTE: columns are `email` and `disposition` — not `founder_email`/`status`.
      const { data: disps, error: dErr } = await sb.schema('xhb')
        .from('alignment_dispositions')
        .select('item_id, email, disposition, note, updated_at')
      if (dErr) return json(500, { error: 'alignment_dispositions: ' + dErr.message }, cors)

      // Revision pressure: how many times each item has been re-annotated.
      const { data: hist } = await sb.schema('xhb')
        .from('alignment_history')
        .select('item_id')

      const revisions = new Map<string, number>()
      for (const h of (hist || [])) {
        revisions.set(h.item_id, (revisions.get(h.item_id) || 0) + 1)
      }

      const rows = items.map(it => {
        const mine       = (disps || []).filter(d => d.item_id === it.id)
        const annotation = mine.find(d => d.disposition === 'annotate' && !builders.has(d.email.toLowerCase()))
        const approval   = mine.find(d => d.disposition === 'approve'  &&  builders.has(d.email.toLowerCase()))
        const contest    = mine.find(d => d.disposition === 'contest'  &&  builders.has(d.email.toLowerCase()))

        let state = 'awaiting_design_answer'
        let ball: string | null = 'author'
        let since: string | null = null

        if (annotation) {
          const annAt = new Date(annotation.updated_at).getTime()
          if (contest && new Date(contest.updated_at).getTime() > annAt) {
            state = 'contested'; ball = 'author'; since = contest.updated_at
          } else if (approval && new Date(approval.updated_at).getTime() > annAt) {
            state = 'settled';   ball = null;     since = approval.updated_at
          } else {
            state = 'awaiting_review'; ball = 'builder'; since = annotation.updated_at
          }
        }

        const days = since ? Math.floor((Date.now() - new Date(since).getTime()) / 86400000) : null

        return {
          id: it.id, position: it.position, title: it.title,
          state, ball, since, days_in_state: days,
          revisions: revisions.get(it.id) || 0,
        }
      })

      // "Last active" — a DATE per founder, deliberately not a login history.
      const { data: activity } = await sb.schema('xhb')
        .from('access_log')
        .select('actor, action, created_at')
        .in('action', ['sso_session_minted', 'token_login'])
        .order('created_at', { ascending: false })
        .limit(400)

      const lastActive: Record<string, string> = {}
      for (const a of (activity || [])) {
        const who = (a.actor || '').toLowerCase()
        if (who && !lastActive[who]) lastActive[who] = a.created_at.slice(0, 10)
      }

      return json(200, {
        round: openRound,
        summary: {
          total:              rows.length,
          settled:            rows.filter(r => r.state === 'settled').length,
          contested:          rows.filter(r => r.state === 'contested').length,
          waiting_on_author:  rows.filter(r => r.ball === 'author').length,
          waiting_on_builder: rows.filter(r => r.ball === 'builder').length,
        },
        founders: (users || []).map(u => ({
          email: u.email,
          name: u.display_name,
          role: u.is_builder ? 'builder' : 'author',
          last_active: lastActive[u.email.toLowerCase()] || null,
        })),
        items: rows,
        oldest_open: rows
          .filter(r => r.state !== 'settled')
          .sort((a, b) => (b.days_in_state ?? 9999) - (a.days_in_state ?? 9999))
          .slice(0, 3),
      }, cors)
    }

    return json(400, { error: 'Unknown action: ' + action }, cors)

  } catch (err) {
    console.error('xhb-manage-access error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

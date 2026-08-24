// ═══════════════════════════════════════════════════════════
// XHB-REMINDER — round nudges and progress summaries
//
// REPLACES the previous version, which was broken:
//   • selected `founder_email, status` from xhb.alignment_dispositions;
//     the real columns are `email` and `disposition` (migration 070 L288)
//   • never checked `error`, so the query failed silently and every founder
//     read as having answered nothing — it would have emailed Mulham a daily
//     list of every settled Round 1 item plus all of Round 2, forever
//
// Modes:
//   { mode: 'pending'  }  → nudge whoever holds the ball, per the asymmetric protocol
//   { mode: 'progress' }  → round summary to BOTH founders (same content to each)
//   { dryRun: true }      → compute and return, send nothing
//
// Auth: X-Admin-Key === XHB_ADMIN_KEY (same as xhb-manage-access).
// Deploy: supabase functions deploy xhb-reminder --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, json, escapeHtml } from '../_shared/cors.ts'

const ADMIN_KEY = Deno.env.get('XHB_ADMIN_KEY') || ''
const APP_URL   = 'https://www.momencrafts.com/xhb/'

/** Don't nag more often than this. A co-founder who gets a daily email stops reading the sender. */
const MIN_DAYS_BETWEEN_NUDGES = 5

/* ── item state, derived exactly as complete_round() will ────────────── */
type ItemState = 'awaiting_design_answer' | 'awaiting_review' | 'contested' | 'settled'

interface Disp { item_id: string; email: string; disposition: string; note: string; updated_at: string }

function stateOf(
  itemId: string,
  disps: Disp[],
  builderEmails: Set<string>,
): { state: ItemState; ball: 'author' | 'builder' | null; since: string | null } {
  const rows = disps.filter(d => d.item_id === itemId)
  const annotation = rows.find(d => d.disposition === 'annotate' && !builderEmails.has(d.email.toLowerCase()))
  const approval   = rows.find(d => d.disposition === 'approve'  &&  builderEmails.has(d.email.toLowerCase()))
  const contest    = rows.find(d => d.disposition === 'contest'  &&  builderEmails.has(d.email.toLowerCase()))

  if (!annotation) {
    return { state: 'awaiting_design_answer', ball: 'author', since: null }
  }
  const annAt = new Date(annotation.updated_at).getTime()

  // A contest newer than the current annotation puts the ball back with the author.
  if (contest && new Date(contest.updated_at).getTime() > annAt) {
    return { state: 'contested', ball: 'author', since: contest.updated_at }
  }
  // Settled only if the approval is NEWER than the annotation it approves.
  if (approval && new Date(approval.updated_at).getTime() > annAt) {
    return { state: 'settled', ball: null, since: approval.updated_at }
  }
  return { state: 'awaiting_review', ball: 'builder', since: annotation.updated_at }
}

/* ── email chrome — XHB white + gold, AA-checked ─────────────────────── */
function shell(inner: string, footNote: string): string {
  return `
<div style="background:#F1EFEA;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid rgba(122,90,30,.20);">
    <div style="padding:26px 30px 20px;border-bottom:1px solid rgba(122,90,30,.20);background:#FFFDF9;">
      <div style="font-size:13px;letter-spacing:.36em;color:#17150F;font-weight:700;">X H B</div>
      <div style="font-size:9.5px;letter-spacing:.22em;color:#7A5A1E;margin-top:7px;text-transform:uppercase;">Founders' Alignment &middot; MomenCrafts</div>
      <div style="width:46px;height:2px;background:#B8863A;margin-top:16px;"></div>
    </div>
    <div style="padding:26px 30px 28px;color:#17150F;">
      ${inner}
    </div>
    <div style="padding:16px 30px 22px;border-top:1px solid rgba(23,21,15,.10);background:#FCFAF6;">
      <div style="font-size:11px;line-height:1.6;color:#6B655C;">${footNote}</div>
    </div>
  </div>
</div>`
}

function button(label: string): string {
  return `<div style="margin:24px 0 6px;">
    <a href="${APP_URL}" style="display:inline-block;padding:12px 26px;background:#B8863A;color:#17150F;
      text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">${label} &rarr;</a>
  </div>`
}

function itemRow(title: string, meta: string): string {
  return `<div style="padding:11px 14px;margin:7px 0;background:#FCFAF6;border-left:3px solid #B8863A;
    border-radius:0 6px 6px 0;">
    <div style="font-size:14px;line-height:1.45;color:#17150F;">${escapeHtml(title)}</div>
    <div style="font-size:11px;color:#6B655C;margin-top:4px;">${meta}</div>
  </div>`
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/* ═════════════════════════════════════════════════════════════════════ */
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const key = req.headers.get('X-Admin-Key') || ''
  if (!ADMIN_KEY || key !== ADMIN_KEY) return json(401, { error: 'Unauthorized' }, cors)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const sender    = Deno.env.get('XHB_MAIL_FROM') || 'MomenCrafts XHB <xhb@momencrafts.com>'

  let body: { mode?: string; dryRun?: boolean; force?: boolean } = {}
  try { body = await req.json() } catch { /* GET-from-cron: defaults apply */ }
  const mode   = body.mode === 'progress' ? 'progress' : 'pending'
  const dryRun = body.dryRun === true
  const force  = body.force === true

  if (!resendKey && !dryRun) return json(500, { error: 'RESEND_API_KEY not configured' }, cors)

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    /* ── 1. recipients come from allowed_users, never a hardcoded map ── */
    const { data: users, error: usersErr } = await sb.schema('xhb')
      .from('allowed_users')
      .select('email, display_name, is_builder, disabled_at')
      .is('disabled_at', null)
    if (usersErr) {
      console.error('allowed_users query failed:', usersErr)
      return json(500, { error: 'DB error (allowed_users)', detail: usersErr.message }, cors)
    }
    if (!users?.length) return json(200, { message: 'No active users', sent: 0 }, cors)

    const builderEmails = new Set(
      users.filter(u => u.is_builder).map(u => u.email.toLowerCase()),
    )

    /* ── 2. the OPEN round only — settled rounds must never be nagged about ── */
    const { data: allItems, error: itemsErr } = await sb.schema('xhb')
      .from('alignment_items')
      .select('id, title, round, round_status, category, position')
      .eq('round_status', 'published')
      .order('position', { ascending: true })
    if (itemsErr) {
      console.error('alignment_items query failed:', itemsErr)
      return json(500, { error: 'DB error (alignment_items)', detail: itemsErr.message }, cors)
    }
    if (!allItems?.length) return json(200, { message: 'No published items', sent: 0 }, cors)

    const openRound = Math.max(...allItems.map(i => i.round ?? 1))
    const items = allItems.filter(i => (i.round ?? 1) === openRound && i.category !== 'recap')

    /* ── 3. dispositions — CORRECT column names, and the error IS checked ── */
    const { data: disps, error: dispErr } = await sb.schema('xhb')
      .from('alignment_dispositions')
      .select('item_id, email, disposition, note, updated_at')
    if (dispErr) {
      console.error('alignment_dispositions query failed:', dispErr)
      return json(500, { error: 'DB error (alignment_dispositions)', detail: dispErr.message }, cors)
    }

    /* ── 4. derive state per item ── */
    const states = items.map(it => ({
      ...it,
      ...stateOf(it.id, (disps || []) as Disp[], builderEmails),
    }))

    const settled   = states.filter(s => s.state === 'settled')
    const onAuthor  = states.filter(s => s.ball === 'author')
    const onBuilder = states.filter(s => s.ball === 'builder')
    const contested = states.filter(s => s.state === 'contested')

    const summary = {
      round: openRound,
      total: states.length,
      settled: settled.length,
      contested: contested.length,
      waiting_on_author: onAuthor.length,
      waiting_on_builder: onBuilder.length,
    }

    /* ── 5. frequency cap, read from access_log (no new table needed) ── */
    const capIso = new Date(Date.now() - MIN_DAYS_BETWEEN_NUDGES * 86_400_000).toISOString()
    const { data: recent } = await sb.schema('xhb')
      .from('access_log')
      .select('subject, created_at')
      .eq('action', 'reminder_sent')
      .gte('created_at', capIso)
    const recentlyNudged = new Set((recent || []).map(r => (r.subject || '').toLowerCase()))

    /* ── 6. build one message per recipient ── */
    const outbox: { to: string; name: string; subject: string; html: string; kind: string }[] = []

    for (const u of users) {
      const email = u.email.toLowerCase()
      const name  = u.display_name || email.split('@')[0]
      const isBuilder = builderEmails.has(email)
      const mine = isBuilder ? onBuilder : onAuthor

      if (mode === 'progress') {
        const bar = summary.total ? Math.round((summary.settled / summary.total) * 100) : 0
        const inner = `
          <div style="font-size:10px;letter-spacing:.20em;text-transform:uppercase;color:#7A5A1E;margin-bottom:10px;">Round ${openRound} &middot; progress</div>
          <div style="font-size:22px;line-height:1.3;font-weight:600;margin:0 0 6px;">${summary.settled} of ${summary.total} settled</div>
          <div style="height:8px;background:#F1EFEA;border-radius:99px;overflow:hidden;margin:14px 0 18px;">
            <div style="height:8px;width:${bar}%;background:#B8863A;"></div>
          </div>
          <div style="font-size:14px;line-height:1.7;color:#6B655C;">
            Waiting on <strong style="color:#17150F;">Mulham</strong>: ${summary.waiting_on_author}<br>
            Waiting on <strong style="color:#17150F;">Momen</strong>: ${summary.waiting_on_builder}<br>
            Contested and back for another pass: ${summary.contested}
          </div>
          ${mine.length ? `<div style="margin-top:20px;font-size:13px;color:#6B655C;">Your ${mine.length} open card${mine.length > 1 ? 's' : ''}:</div>
            ${mine.slice(0, 6).map(m => itemRow(m.title, m.state.replace(/_/g, ' '))).join('')}` : ''}
          ${button('Open XHB')}`
        outbox.push({
          to: u.email, name, kind: 'progress',
          subject: `XHB Round ${openRound} — ${summary.settled}/${summary.total} settled`,
          html: shell(inner, `Sent to both founders. The same figures are on the round page.`),
        })
        continue
      }

      /* mode === 'pending' */
      if (mine.length === 0) continue
      if (!force && recentlyNudged.has(email)) continue

      const verb = isBuilder
        ? `${mine.length} card${mine.length > 1 ? 's are' : ' is'} waiting on your review`
        : `${mine.length} card${mine.length > 1 ? 's are' : ' is'} waiting on your design answer`
      const inner = `
        <div style="font-size:10px;letter-spacing:.20em;text-transform:uppercase;color:#7A5A1E;margin-bottom:10px;">Round ${openRound}</div>
        <div style="font-size:20px;line-height:1.35;font-weight:600;margin:0 0 8px;">${escapeHtml(name)}, ${verb}.</div>
        <div style="font-size:13px;line-height:1.65;color:#6B655C;margin-bottom:4px;">
          ${summary.settled} of ${summary.total} are already settled. A partial answer that names its own gap counts &mdash;
          &ldquo;I need to confirm this with the client&rdquo; settles a card honestly.
        </div>
        ${mine.slice(0, 8).map(m => {
          const d = daysSince(m.since)
          return itemRow(m.title, d === null ? 'not started' : `${d} day${d === 1 ? '' : 's'} in this state`)
        }).join('')}
        ${mine.length > 8 ? `<div style="font-size:12px;color:#6B655C;margin-top:8px;">and ${mine.length - 8} more.</div>` : ''}
        ${button('Open XHB')}`
      outbox.push({
        to: u.email, name, kind: 'pending',
        subject: `XHB Round ${openRound} — ${mine.length} card${mine.length > 1 ? 's' : ''} with you`,
        html: shell(inner, `You are getting this because Round ${openRound} is open and these cards are with you. Reminders are capped at one every ${MIN_DAYS_BETWEEN_NUDGES} days.`),
      })
    }

    /* ── 7. dry run stops here — this is what the admin "preview" uses ── */
    if (dryRun) {
      return json(200, {
        dryRun: true, mode, summary,
        would_send: outbox.map(o => ({ to: o.to, subject: o.subject, kind: o.kind })),
        states: states.map(s => ({ title: s.title, state: s.state, ball: s.ball, since: s.since })),
      }, cors)
    }

    /* ── 8. send ── */
    const sent: string[] = []
    const failed: { to: string; error: string }[] = []

    for (const msg of outbox) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: sender, to: [msg.to], subject: msg.subject, html: msg.html }),
      })
      if (res.ok) {
        sent.push(msg.to)
        await sb.schema('xhb').from('access_log').insert({
          actor: 'system', subject: msg.to.toLowerCase(),
          action: msg.kind === 'pending' ? 'reminder_sent' : 'progress_sent',
          detail: { round: openRound, mode, subject_line: msg.subject },
        })
      } else {
        const text = await res.text()
        console.error(`Resend failed for ${msg.to}:`, text)
        failed.push({ to: msg.to, error: text.slice(0, 300) })
      }
    }

    return json(failed.length ? 207 : 200, { mode, summary, sent, failed }, cors)

  } catch (err) {
    console.error('xhb-reminder error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

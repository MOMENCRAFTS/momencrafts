// ═══════════════════════════════════════════════════════════
// XHB-REMINDER — Daily alignment reminder for co-founders
// Checks for pending alignment items and emails reminders
// Triggered by pg_cron daily at 9 AM KSA (6 AM UTC)
// Deploy: supabase functions deploy xhb-reminder --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, json } from '../_shared/cors.ts'

const FOUNDER_EMAILS: Record<string, { email: string; name: string }> = {
  'mulham.zahabi@gmail.com': { email: 'mulham.zahabi@gmail.com', name: 'Mulham' },
  'momen@momencrafts.com': { email: 'momen@momencrafts.com', name: 'Momen' },
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return json(500, { error: 'RESEND_API_KEY not configured' }, cors)
    }

    // 1. Get all alignment items with their dispositions
    const { data: items, error: itemsErr } = await supabase
      .schema('xhb')
      .from('alignment_items')
      .select('id, title, round, round_status')
      .eq('round_status', 'published')
      .order('round', { ascending: true })

    if (itemsErr) {
      console.error('Failed to load alignment items:', itemsErr)
      return json(500, { error: 'DB error' }, cors)
    }

    if (!items || items.length === 0) {
      return json(200, { message: 'No alignment items found', reminders_sent: 0 }, cors)
    }

    // 2. Get all dispositions
    const { data: dispositions } = await supabase
      .schema('xhb')
      .from('alignment_dispositions')
      .select('item_id, founder_email, status')

    const dispMap = new Map<string, Set<string>>()
    for (const d of (dispositions || [])) {
      if (d.status && d.status !== 'pending') {
        const key = d.founder_email?.toLowerCase()
        if (!dispMap.has(key)) dispMap.set(key, new Set())
        dispMap.get(key)!.add(d.item_id)
      }
    }

    // 3. For each founder, find pending items
    const remindersSent: string[] = []

    for (const [founderEmail, info] of Object.entries(FOUNDER_EMAILS)) {
      const answeredIds = dispMap.get(founderEmail.toLowerCase()) || new Set()
      const pending = items.filter(item => !answeredIds.has(item.id))

      if (pending.length === 0) continue

      // Group by round
      const byRound = new Map<number, typeof pending>()
      for (const p of pending) {
        const r = p.round || 1
        if (!byRound.has(r)) byRound.set(r, [])
        byRound.get(r)!.push(p)
      }

      // Build email
      let itemsHtml = ''
      for (const [round, roundItems] of [...byRound.entries()].sort((a, b) => a[0] - b[0])) {
        itemsHtml += `<div style="margin:12px 0 4px;font-size:11px;letter-spacing:2px;color:#c8a96e;">ROUND ${round}</div>`
        for (const item of roundItems) {
          itemsHtml += `<div style="padding:8px 12px;margin:4px 0;background:#1a1814;border-left:3px solid #c8a96e;border-radius:4px;font-size:13px;">${item.title}</div>`
        }
      }

      const now = new Date().toLocaleDateString('en-GB', {
        timeZone: 'Asia/Riyadh',
        day: 'numeric', month: 'short', year: 'numeric',
      })

      const emailHtml = `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0d0d0d;color:#f0ebe3;border-radius:12px;">
          <div style="text-align:center;color:#c8a96e;font-size:24px;margin-bottom:8px;">✦</div>
          <div style="text-align:center;font-size:11px;letter-spacing:3px;color:#c8a96e;margin-bottom:16px;">XHB · FOUNDERS' HQ</div>
          <hr style="border:none;border-top:1px solid #2a2520;margin:16px 0;">
          
          <h2 style="color:#f0ebe3;font-size:18px;font-weight:400;margin:0 0 8px;">
            ${info.name}, you have <strong style="color:#c8a96e;">${pending.length}</strong> pending decision${pending.length > 1 ? 's' : ''}
          </h2>
          <p style="color:#999;font-size:13px;margin:0 0 16px;">
            The following alignment items are waiting for your input.
          </p>

          ${itemsHtml}

          <div style="text-align:center;margin:24px 0 16px;">
            <a href="https://www.momencrafts.com/xhb/" 
               style="display:inline-block;padding:12px 32px;background:#c8a96e;color:#0d0d0d;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
              Open XHB →
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #2a2520;margin:16px 0;">
          <div style="text-align:center;font-size:10px;color:#666;">
            ${now} · MomenCrafts & Co · Riyadh, KSA
          </div>
        </div>
      `

      // Send email
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MomenCrafts XHB <onboarding@resend.dev>',
          to: [info.email],
          cc: founderEmail !== 'momen@momencrafts.com' ? ['momen@momencrafts.com'] : undefined,
          subject: `✦ ${info.name}, ${pending.length} alignment decision${pending.length > 1 ? 's' : ''} awaiting you`,
          html: emailHtml,
        }),
      })

      if (res.ok) {
        remindersSent.push(founderEmail)
        console.log(`Reminder sent to ${founderEmail}: ${pending.length} pending items`)
      } else {
        const err = await res.text()
        console.error(`Failed to send to ${founderEmail}:`, err)
      }
    }

    return json(200, {
      message: `Reminders sent: ${remindersSent.length}`,
      reminders_sent: remindersSent.length,
      recipients: remindersSent,
    }, cors)

  } catch (err) {
    console.error('xhb-reminder error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

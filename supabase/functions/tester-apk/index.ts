// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — tester-apk Edge Function
//
// The tester portal's whole API. Three actions, all token-gated:
//
//   POST { token }                        → { testerName, assigned[], open[] }
//   POST { token, appId }                 → { url, expiresIn, ... } signed download
//   POST { token, appId, action:'request' } → { requested: true } join request
//
// Access rules
//   · Downloads require a row in tester_assignments. There is no
//     implicit "all apps" — an unassigned app is not downloadable.
//   · `assigned` lists what the tester has. `open` lists programmes
//     flagged open_enrolment that they do NOT have, so they can ask.
//   · Private programmes (tester_visible without open_enrolment) are
//     invisible unless assigned.
//
// The APK itself lives in a PRIVATE bucket; links are signed for five
// minutes and every issue is logged.
//
// Deploy: supabase functions deploy tester-apk --no-verify-jwt
// Requires: private storage bucket `tester-apks`
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, json } from '../_shared/cors.ts'

const BUCKET = 'tester-apks'
const SIGNED_URL_TTL = 300 // seconds — enough to start a download, useless if forwarded

// Token types allowed to pull tester builds. Co-founders and the founder
// are included so you can check the portal with your own token.
const ALLOWED_TYPES = new Set(['TESTER', 'PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])
// These types bypass assignment — they can reach any tester_visible build.
const UNRESTRICTED_TYPES = new Set(['PERMANENT', 'FOUNDER'])

const APP_FIELDS =
  'app_id, name, name_ar, version, status, emoji, size, description, guide_url, build_date, min_android, test_stage, apk_path, open_enrolment, tester_visible'

// deno-lint-ignore no-explicit-any
function shape(r: any, extra: Record<string, unknown> = {}) {
  return {
    appId: r.app_id,
    name: r.name,
    nameAr: r.name_ar,
    version: r.version,
    status: r.status,
    stage: r.test_stage,
    emoji: r.emoji,
    size: r.size,
    description: r.description,
    guideUrl: r.guide_url,
    buildDate: r.build_date,
    minAndroid: r.min_android,
    // Never leak the storage path — only whether a build exists.
    hasBuild: Boolean(r.apk_path),
    ...extra,
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' }, cors)

  try {
    const { token, appId, action, message } = await req.json()
    if (!token || typeof token !== 'string') return json(400, { error: 'token is required' }, cors)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const ip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown'
    const ua = req.headers.get('user-agent') || 'unknown'

    // ── 1. Validate the token ──
    const normalizedToken = token.toUpperCase().trim().slice(0, 24)
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('investor_tokens')
      .select('id, label, email, token_type, expires_at, revoked_at')
      .eq('token', normalizedToken)
      .maybeSingle()

    if (tokenErr || !tokenRow) return json(401, { error: 'Invalid access key' }, cors)
    if (tokenRow.revoked_at) return json(403, { error: 'Access has been revoked' }, cors)
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return json(403, { error: 'Access key has expired' }, cors)
    }
    if (!ALLOWED_TYPES.has(tokenRow.token_type)) {
      return json(403, { error: 'This access key cannot download test builds' }, cors)
    }

    const unrestricted = UNRESTRICTED_TYPES.has(tokenRow.token_type)

    // Everything this tester has been granted.
    const { data: assignRows } = await supabase
      .from('tester_assignments')
      .select('app_id')
      .eq('token_id', tokenRow.id)
    const assignedIds = new Set((assignRows || []).map(r => r.app_id))

    const canReach = (id: string) => unrestricted || assignedIds.has(id)

    /* ═══════════ LIST ═══════════ */
    if (!appId) {
      const { data: rows, error: listErr } = await supabase
        .from('co_downloads')
        .select(APP_FIELDS)
        .eq('tester_visible', true)
        .order('sort_order', { ascending: true })
      if (listErr) throw listErr

      // Pending / decided requests, so the portal can show "requested".
      const { data: reqRows } = await supabase
        .from('tester_join_requests')
        .select('app_id, status')
        .eq('token_id', tokenRow.id)
        .order('created_at', { ascending: false })
      const reqByApp = new Map<string, string>()
      for (const r of reqRows || []) if (!reqByApp.has(r.app_id)) reqByApp.set(r.app_id, r.status)

      const all = rows || []
      const assigned = all.filter(r => canReach(r.app_id)).map(r => shape(r))
      // Joinable = advertised, and not already reachable.
      const open = all
        .filter(r => r.open_enrolment && !canReach(r.app_id))
        .map(r => shape(r, { requestStatus: reqByApp.get(r.app_id) ?? null }))

      return json(200, { testerName: tokenRow.label, assigned, open }, cors)
    }

    // ── The app, for both remaining actions ──
    const { data: app, error: appErr } = await supabase
      .from('co_downloads')
      .select(APP_FIELDS)
      .eq('app_id', appId)
      .maybeSingle()

    if (appErr || !app) return json(404, { error: 'Unknown app' }, cors)
    if (!app.tester_visible) return json(403, { error: 'This app is not available for testing' }, cors)

    /* ═══════════ REQUEST TO JOIN ═══════════ */
    if (action === 'request') {
      if (canReach(appId)) return json(409, { error: 'You already have access to this app' }, cors)
      if (!app.open_enrolment) return json(403, { error: 'This programme is invitation only' }, cors)

      const { error: insErr } = await supabase.from('tester_join_requests').insert({
        token_id: tokenRow.id,
        app_id: appId,
        message: typeof message === 'string' ? message.slice(0, 500) : null,
        ip_address: ip,
      })
      // The partial unique index makes a duplicate pending request a 23505.
      if (insErr) {
        if ((insErr as { code?: string }).code === '23505') {
          return json(200, { requested: true, alreadyPending: true }, cors)
        }
        console.error('join request insert error:', insErr)
        return json(500, { error: 'Could not submit your request' }, cors)
      }

      // Tell the founder (fire-and-forget — a failed email must not fail the request)
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (resendKey) {
        const now = new Date().toLocaleString('en-GB', {
          timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short',
        })
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'MomenCrafts <onboarding@resend.dev>',
            to: ['momen@momencrafts.com'],
            subject: `🧪 ${tokenRow.label || normalizedToken} wants to test ${app.name}`,
            html: `
              <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0E4372;color:#FFFFFF;border-radius:12px;">
                <div style="text-align:center;color:#E2B96B;font-size:24px;margin-bottom:8px;">✦</div>
                <div style="text-align:center;font-size:11px;letter-spacing:3px;color:#E2B96B;margin-bottom:16px;">TESTER JOIN REQUEST</div>
                <hr style="border:none;border-top:1px solid rgba(255,255,255,.18);margin:16px 0;">
                <table style="width:100%;font-size:14px;">
                  <tr><td style="padding:6px 0;color:#E2B96B;">Tester</td><td style="padding:6px 0;text-align:right;">${tokenRow.label || 'Unknown'}</td></tr>
                  <tr><td style="padding:6px 0;color:#E2B96B;">Email</td><td style="padding:6px 0;text-align:right;">${tokenRow.email || '—'}</td></tr>
                  <tr><td style="padding:6px 0;color:#E2B96B;">App</td><td style="padding:6px 0;text-align:right;">${app.name} ${app.version}</td></tr>
                  <tr><td style="padding:6px 0;color:#E2B96B;">Token</td><td style="padding:6px 0;text-align:right;font-family:monospace;">${normalizedToken}</td></tr>
                  <tr><td style="padding:6px 0;color:#E2B96B;">Time (KSA)</td><td style="padding:6px 0;text-align:right;">${now}</td></tr>
                </table>
                <hr style="border:none;border-top:1px solid rgba(255,255,255,.18);margin:16px 0;">
                <div style="text-align:center;font-size:12px;color:#C3D9EC;">Approve or deny in Admin → Testers</div>
              </div>
            `,
          }),
        }).catch(e => console.error('Resend join-request error:', e))
      }

      return json(200, { requested: true }, cors)
    }

    /* ═══════════ SIGNED DOWNLOAD ═══════════ */
    // Rate limit: 30 signed URLs per IP per hour. Generous for a tester
    // re-downloading, useless for scraping.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recent } = await supabase
      .from('tester_downloads')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', hourAgo)

    if ((recent ?? 0) >= 30) {
      return json(429, { error: 'Too many downloads. Please wait an hour.' }, cors)
    }

    if (!canReach(appId)) {
      return json(403, { error: 'This app is not assigned to your access key' }, cors)
    }
    if (!app.apk_path) {
      return json(409, { error: 'No build uploaded yet for this app' }, cors)
    }

    const { data: signed, error: signErr } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(app.apk_path, SIGNED_URL_TTL, {
        download: app.apk_path.split('/').pop() || `${appId}.apk`,
      })

    if (signErr || !signed?.signedUrl) {
      console.error('createSignedUrl error:', signErr)
      return json(500, { error: 'Could not prepare the download' }, cors)
    }

    await supabase.from('tester_downloads').insert({
      token_id: tokenRow.id,
      app_id: appId,
      version: app.version,
      ip_address: ip,
      user_agent: ua,
    })

    return json(200, {
      url: signed.signedUrl,
      expiresIn: SIGNED_URL_TTL,
      version: app.version,
      fileName: app.apk_path.split('/').pop(),
    }, cors)
  } catch (err) {
    console.error('tester-apk error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — tester-apk Edge Function
//
// Issues a short-lived signed download URL for a tester's APK.
// This is the part that makes the gate real: the APK lives in a PRIVATE
// storage bucket, the link expires in 5 minutes, and every issue is logged.
//
// POST { token }         →  { apps: [...] }        list what this tester may test
// POST { token, appId }  →  { url, expiresIn, ... } signed download for one app
//
// The list is behind the token too, so the set of in-testing builds is not
// public the way co-data is.
//
// Checks, in order:
//   1. rate limit per IP
//   2. token exists, not revoked, not expired
//   3. app is tester_visible and has an apk_path
//   4. token's project_access allows this app  (same rule as xhb-gate-request)
//
// Deploy: supabase functions deploy tester-apk --no-verify-jwt
// Requires: a private storage bucket named `tester-apks`
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, json } from '../_shared/cors.ts'

const BUCKET = 'tester-apks'
const SIGNED_URL_TTL = 300 // seconds — long enough to start a download, short enough to be useless if shared

// Token types allowed to pull tester builds. Co-founders and the founder can
// too, so you can sanity-check the portal with your own token.
const ALLOWED_TYPES = new Set(['TESTER', 'PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' }, cors)

  try {
    const { token, appId } = await req.json()
    if (!token || typeof token !== 'string') return json(400, { error: 'token is required' }, cors)
    const isList = !appId

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const ip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown'
    const ua = req.headers.get('user-agent') || 'unknown'

    // ── 1. Rate limit: 30 signed URLs per IP per hour ──
    // Generous for a legitimate tester re-downloading; useless for scraping.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recent } = await supabase
      .from('tester_downloads')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', hourAgo)

    if (!isList && (recent ?? 0) >= 30) {
      return json(429, { error: 'Too many downloads. Please wait an hour.' }, cors)
    }

    // ── 2. Validate the token ──
    const normalizedToken = token.toUpperCase().trim().slice(0, 24)
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('investor_tokens')
      .select('id, label, token_type, expires_at, revoked_at, project_access')
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

    const projects: string[] = tokenRow.project_access || []

    // ── 2b. List mode — what may this tester test? ──
    if (isList) {
      const { data: rows, error: listErr } = await supabase
        .from('co_downloads')
        .select('app_id, name, name_ar, version, status, emoji, size, description, guide_url, build_date, min_android, test_stage, apk_path')
        .eq('tester_visible', true)
        .order('sort_order', { ascending: true })

      if (listErr) throw listErr

      // An empty project_access means "all apps"; otherwise it is an allow-list.
      const visible = (rows || []).filter(r => projects.length === 0 || projects.includes(r.app_id))

      return json(200, {
        testerName: tokenRow.label,
        apps: visible.map(r => ({
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
          // Never leak the storage path — just whether a build is downloadable.
          hasBuild: Boolean(r.apk_path),
        })),
      }, cors)
    }

    // ── 3. Look up the app ──
    const { data: app, error: appErr } = await supabase
      .from('co_downloads')
      .select('app_id, name, version, apk_path, tester_visible')
      .eq('app_id', appId)
      .maybeSingle()

    if (appErr || !app) return json(404, { error: 'Unknown app' }, cors)
    if (!app.tester_visible) return json(403, { error: 'This app is not available for testing' }, cors)
    if (!app.apk_path) {
      return json(409, { error: 'No build uploaded yet for this app' }, cors)
    }

    // ── 4. project_access gate ──
    // An empty array means "all apps" (matches how investor tokens behave);
    // a populated array is an explicit allow-list of app ids.
    if (projects.length > 0 && !projects.includes(appId)) {
      return json(403, { error: 'This app is not assigned to your access key' }, cors)
    }

    // ── 5. Mint the signed URL ──
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

    // ── 6. Audit ──
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

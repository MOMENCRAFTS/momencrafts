// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-manage-testers Edge Function
//
// Everything the Testers panel needs. Same X-Admin-Key guard as the
// other admin functions.
//
//   POST { action:'list' }
//     → { apps[], testers[{ tokenId, label, email, expiresAt, revoked,
//                            appIds[] }], requests[] }
//   POST { action:'assign',   tokenId, appId }
//   POST { action:'unassign', tokenId, appId }
//   POST { action:'approve',  requestId }   → also creates the assignment
//   POST { action:'deny',     requestId }
//   POST { action:'setApp',   appId, testerVisible?, openEnrolment?, apkPath?,
//                             guideUrl?, buildDate?, minAndroid?, testStage? }
//
// Deploy: supabase functions deploy admin-manage-testers --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = { ...getCorsHeaders(req), 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' }, cors)

  try {
    const ADMIN_KEY = Deno.env.get('ADMIN_SECRET_KEY')
    const clientKey = req.headers.get('X-Admin-Key')
    if (!ADMIN_KEY || !clientKey || clientKey !== ADMIN_KEY) {
      return json(401, { error: 'Unauthorized' }, cors)
    }

    const body = await req.json()
    const { action } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    switch (action) {
      /* ── Everything the panel renders, in one round trip ── */
      case 'list': {
        const [apps, tokens, assigns, requests] = await Promise.all([
          supabase.from('co_downloads')
            .select('app_id, name, version, status, emoji, tester_visible, open_enrolment, apk_path, guide_url, build_date, min_android, test_stage')
            .order('sort_order', { ascending: true }),
          supabase.from('investor_tokens')
            .select('id, token, label, email, token_type, expires_at, revoked_at, created_at')
            .eq('token_type', 'TESTER')
            .order('created_at', { ascending: false })
            .limit(200),
          supabase.from('tester_assignments').select('token_id, app_id, assigned_at'),
          supabase.from('tester_join_requests')
            .select('id, token_id, app_id, status, message, created_at')
            .order('created_at', { ascending: false })
            .limit(100),
        ])

        const byToken = new Map<string, string[]>()
        for (const a of assigns.data || []) {
          const list = byToken.get(a.token_id) || []
          list.push(a.app_id)
          byToken.set(a.token_id, list)
        }

        const labelByToken = new Map((tokens.data || []).map(t => [t.id, t.label]))

        return json(200, {
          apps: (apps.data || []).map(a => ({
            appId: a.app_id, name: a.name, version: a.version, status: a.status, emoji: a.emoji,
            testerVisible: a.tester_visible, openEnrolment: a.open_enrolment,
            hasBuild: Boolean(a.apk_path), apkPath: a.apk_path,
            guideUrl: a.guide_url, buildDate: a.build_date,
            minAndroid: a.min_android, testStage: a.test_stage,
          })),
          testers: (tokens.data || []).map(t => ({
            tokenId: t.id,
            token: t.token,
            label: t.label,
            email: t.email,
            expiresAt: t.expires_at,
            revoked: Boolean(t.revoked_at),
            createdAt: t.created_at,
            appIds: byToken.get(t.id) || [],
          })),
          requests: (requests.data || []).map(r => ({
            id: r.id,
            tokenId: r.token_id,
            testerName: labelByToken.get(r.token_id) ?? '—',
            appId: r.app_id,
            status: r.status,
            message: r.message,
            createdAt: r.created_at,
          })),
        }, cors)
      }

      /* ── Grant / revoke one app for one tester ── */
      case 'assign': {
        const { tokenId, appId } = body
        if (!tokenId || !appId) return json(400, { error: 'tokenId and appId are required' }, cors)
        const { error } = await supabase.from('tester_assignments')
          .upsert({ token_id: tokenId, app_id: appId, assigned_by: 'admin' },
                  { onConflict: 'token_id,app_id' })
        if (error) { console.error('assign error:', error); return json(500, { error: 'Could not assign' }, cors) }
        return json(200, { assigned: true }, cors)
      }

      case 'unassign': {
        const { tokenId, appId } = body
        if (!tokenId || !appId) return json(400, { error: 'tokenId and appId are required' }, cors)
        const { error } = await supabase.from('tester_assignments')
          .delete().eq('token_id', tokenId).eq('app_id', appId)
        if (error) { console.error('unassign error:', error); return json(500, { error: 'Could not unassign' }, cors) }
        return json(200, { unassigned: true }, cors)
      }

      /* ── Decide a join request ── */
      case 'approve':
      case 'deny': {
        const { requestId } = body
        if (!requestId) return json(400, { error: 'requestId is required' }, cors)

        const { data: reqRow, error: reqErr } = await supabase
          .from('tester_join_requests')
          .select('id, token_id, app_id, status')
          .eq('id', requestId)
          .maybeSingle()
        if (reqErr || !reqRow) return json(404, { error: 'Request not found' }, cors)
        if (reqRow.status !== 'pending') return json(409, { error: 'Request already decided' }, cors)

        if (action === 'approve') {
          const { error: aErr } = await supabase.from('tester_assignments')
            .upsert({ token_id: reqRow.token_id, app_id: reqRow.app_id, assigned_by: 'request-approval' },
                    { onConflict: 'token_id,app_id' })
          if (aErr) { console.error('approve assign error:', aErr); return json(500, { error: 'Could not grant access' }, cors) }
        }

        const { error: uErr } = await supabase.from('tester_join_requests')
          .update({
            status: action === 'approve' ? 'approved' : 'denied',
            decided_at: new Date().toISOString(),
            decided_by: 'admin',
          })
          .eq('id', requestId)
        if (uErr) { console.error('decide error:', uErr); return json(500, { error: 'Could not update the request' }, cors) }

        return json(200, { decided: action }, cors)
      }

      /* ── Signed upload URL for APK builds ── */
      case 'uploadUrl': {
        const { appId, fileName } = body
        if (!appId || !fileName) return json(400, { error: 'appId and fileName are required' }, cors)

        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${appId}/${safeName}`

        // Delete previous file at this path (overwrite)
        await supabase.storage.from('tester-apks').remove([storagePath])

        const { data, error } = await supabase.storage
          .from('tester-apks')
          .createSignedUploadUrl(storagePath)

        if (error) {
          console.error('uploadUrl error:', error)
          return json(500, { error: 'Could not create upload URL' }, cors)
        }

        return json(200, {
          signedUrl: data.signedUrl,
          token: data.token,
          storagePath,
        }, cors)
      }

      /* ── Delete an APK from storage ── */
      case 'deleteApk': {
        const { appId } = body
        if (!appId) return json(400, { error: 'appId is required' }, cors)

        // Get current path from DB
        const { data: appRow } = await supabase
          .from('co_downloads')
          .select('apk_path')
          .eq('app_id', appId)
          .maybeSingle()

        if (appRow?.apk_path) {
          await supabase.storage.from('tester-apks').remove([appRow.apk_path])
        }

        // Clear the path in DB
        const { error } = await supabase
          .from('co_downloads')
          .update({ apk_path: null })
          .eq('app_id', appId)

        if (error) {
          console.error('deleteApk error:', error)
          return json(500, { error: 'Could not clear build' }, cors)
        }
        return json(200, { deleted: true }, cors)
      }

      /* ── Edit an app's tester-facing settings ── */
      case 'setApp': {
        const { appId } = body
        if (!appId) return json(400, { error: 'appId is required' }, cors)

        const patch: Record<string, unknown> = {}
        if ('testerVisible' in body) patch.tester_visible = Boolean(body.testerVisible)
        if ('openEnrolment' in body) patch.open_enrolment = Boolean(body.openEnrolment)
        if ('apkPath'    in body) patch.apk_path    = body.apkPath    || null
        if ('guideUrl'   in body) patch.guide_url   = body.guideUrl   || null
        if ('buildDate'  in body) patch.build_date  = body.buildDate  || null
        if ('minAndroid' in body) patch.min_android = body.minAndroid || null
        if ('testStage'  in body) patch.test_stage  = body.testStage  || null
        if (Object.keys(patch).length === 0) return json(400, { error: 'Nothing to update' }, cors)

        const { error } = await supabase.from('co_downloads').update(patch).eq('app_id', appId)
        if (error) { console.error('setApp error:', error); return json(500, { error: 'Could not update the app' }, cors) }
        return json(200, { updated: true }, cors)
      }

      default:
        return json(400, { error: `Unknown action: ${action}` }, cors)
    }
  } catch (err) {
    console.error('admin-manage-testers error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

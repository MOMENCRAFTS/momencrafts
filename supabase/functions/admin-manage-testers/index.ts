// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-manage-testers Edge Function
//
// Everything the Testers panel needs. Same X-Admin-Key guard as the
// other admin functions.
//
//   POST { action:'list' }
//   POST { action:'assign',   tokenId, appId }
//   POST { action:'unassign', tokenId, appId }
//   POST { action:'approve',  requestId }
//   POST { action:'deny',     requestId }
//   POST { action:'setApp',   appId, ...fields }
//   POST { action:'uploadUrl', appId, fileName }
//   POST { action:'deleteApk', appId }
//   POST { action:'setRelease', appId, version, changelog }
//   POST { action:'notifyTesters', appId, version }
//
// Deploy: supabase functions deploy admin-manage-testers --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, json, escapeHtml } from '../_shared/cors.ts'

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
        const [apps, tokens, assigns, requests, releases] = await Promise.all([
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
          supabase.from('co_releases')
            .select('app_id, version, changelog, notified_at, released_at')
            .order('released_at', { ascending: false }),
        ])

        const byToken = new Map<string, string[]>()
        for (const a of assigns.data || []) {
          const list = byToken.get(a.token_id) || []
          list.push(a.app_id)
          byToken.set(a.token_id, list)
        }

        const labelByToken = new Map((tokens.data || []).map(t => [t.id, t.label]))

        // Latest release per app
        // deno-lint-ignore no-explicit-any
        const latestRelease = new Map<string, any>()
        for (const r of releases.data || []) {
          if (!latestRelease.has(r.app_id)) latestRelease.set(r.app_id, r)
        }

        return json(200, {
          apps: (apps.data || []).map(a => {
            const rel = latestRelease.get(a.app_id)
            return {
              appId: a.app_id, name: a.name, version: a.version, status: a.status, emoji: a.emoji,
              testerVisible: a.tester_visible, openEnrolment: a.open_enrolment,
              hasBuild: Boolean(a.apk_path), apkPath: a.apk_path,
              guideUrl: a.guide_url, buildDate: a.build_date,
              minAndroid: a.min_android, testStage: a.test_stage,
              release: rel ? {
                version: rel.version,
                changelog: rel.changelog,
                notifiedAt: rel.notified_at,
                releasedAt: rel.released_at,
              } : null,
            }
          }),
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

        // Upsert a co_releases row so notes have somewhere to live immediately
        const { data: appRow } = await supabase.from('co_downloads')
          .select('version').eq('app_id', appId).maybeSingle()
        if (appRow?.version) {
          await supabase.from('co_releases')
            .upsert({ app_id: appId, version: appRow.version }, { onConflict: 'app_id,version' })
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

      /* ── Save release notes (does NOT send anything) ── */
      case 'setRelease': {
        const { appId, version, changelog } = body
        if (!appId || !version) return json(400, { error: 'appId and version are required' }, cors)

        const { error } = await supabase.from('co_releases')
          .upsert(
            { app_id: appId, version, changelog: changelog ?? null },
            { onConflict: 'app_id,version' },
          )
        if (error) { console.error('setRelease error:', error); return json(500, { error: 'Could not save release notes' }, cors) }
        return json(200, { saved: true }, cors)
      }

      /* ── Notify assigned testers about a new build ── */
      case 'notifyTesters': {
        const { appId, version } = body
        if (!appId || !version) return json(400, { error: 'appId and version are required' }, cors)

        // 1. Load app + release
        const [{ data: app }, { data: release }] = await Promise.all([
          supabase.from('co_downloads').select('app_id, name, name_ar, version, emoji').eq('app_id', appId).maybeSingle(),
          supabase.from('co_releases').select('changelog').eq('app_id', appId).eq('version', version).maybeSingle(),
        ])
        if (!app) return json(404, { error: 'App not found' }, cors)
        if (!release) return json(404, { error: 'No release found for that version — save release notes first' }, cors)

        const changelog = release?.changelog || ''

        // 2. Find eligible recipients
        const { data: assignRows } = await supabase
          .from('tester_assignments')
          .select('token_id, investor_tokens!inner(id, label, email, revoked_at, expires_at)')
          .eq('app_id', appId)

        const now = new Date()
        // deno-lint-ignore no-explicit-any
        const eligible: { tokenId: string; name: string; email: string }[] = []
        let skippedNoEmail = 0

        for (const row of assignRows || []) {
          // deno-lint-ignore no-explicit-any
          const t = (row as any).investor_tokens
          if (!t || t.revoked_at) continue
          if (t.expires_at && new Date(t.expires_at) < now) continue
          if (!t.email || !t.email.trim()) { skippedNoEmail++; continue }
          eligible.push({ tokenId: t.id, name: (t.label || '').trim(), email: t.email.trim() })
        }

        // 3. Insert notification rows — ON CONFLICT DO NOTHING = duplicate guard
        const toInsert = eligible.map(e => ({
          app_id: appId,
          version,
          token_id: e.tokenId,
          sent_to: e.email,
        }))

        let actuallyInserted: typeof eligible = []
        let alreadyNotified = 0

        if (toInsert.length > 0) {
          // Insert with onConflict DO NOTHING; only inserted rows get emails
          const { data: inserted } = await supabase
            .from('tester_notifications')
            .upsert(toInsert, { onConflict: 'app_id,version,token_id', ignoreDuplicates: true })
            .select('token_id')

          const insertedIds = new Set((inserted || []).map(r => r.token_id))
          actuallyInserted = eligible.filter(e => insertedIds.has(e.tokenId))
          alreadyNotified = eligible.length - actuallyInserted.length
        }

        // 4. Send emails via Resend batch
        let sent = 0
        let failed = 0
        const resendKey = Deno.env.get('RESEND_API_KEY')

        // The notification rows are written BEFORE sending so a double-click
        // cannot double-send. The cost is that a failed send leaves a row
        // claiming the tester was notified, which would block every retry.
        // So any chunk that fails to send has its rows removed again.
        const rollback = async (tokenIds: string[]) => {
          if (tokenIds.length === 0) return
          const { error } = await supabase.from('tester_notifications')
            .delete().eq('app_id', appId).eq('version', version).in('token_id', tokenIds)
          if (error) console.error('rollback failed — these testers cannot be re-notified:', tokenIds, error)
        }

        if (!resendKey && actuallyInserted.length > 0) {
          await rollback(actuallyInserted.map(r => r.tokenId))
          return json(500, { error: 'RESEND_API_KEY is not configured — nothing was sent' }, cors)
        }

        if (resendKey && actuallyInserted.length > 0) {
          const appName = escapeHtml(app.name)
          const appNameAr = escapeHtml(app.name_ar || app.name)
          const ver = escapeHtml(version)
          const emojiStr = app.emoji || '🧪'

          // Render changelog lines
          const lines = changelog.split('\n').filter((l: string) => l.trim())
          const changelogHtmlEn = lines.length > 0
            ? '<ul style="margin:8px 0 16px;padding-left:20px">' + lines.map((l: string) => `<li style="margin-bottom:4px">${escapeHtml(l.replace(/^[-•*]\s*/, ''))}</li>`).join('') + '</ul>'
            : '<p style="color:#C3D9EC;font-style:italic">No release notes provided.</p>'
          const changelogHtmlAr = lines.length > 0
            ? '<ul dir="rtl" style="margin:8px 0 16px;padding-right:20px;text-align:right">' + lines.map((l: string) => `<li style="margin-bottom:4px">${escapeHtml(l.replace(/^[-•*]\s*/, ''))}</li>`).join('') + '</ul>'
            : '<p dir="rtl" style="color:#C3D9EC;font-style:italic;text-align:right">لا توجد ملاحظات إصدار.</p>'

          // Build batch (max 100 per call)
          const chunks: typeof actuallyInserted[] = []
          for (let i = 0; i < actuallyInserted.length; i += 100) {
            chunks.push(actuallyInserted.slice(i, i + 100))
          }

          for (const chunk of chunks) {
            const emails = chunk.map(recipient => {
              const nameEn = escapeHtml(recipient.name || 'Tester')
              const nameAr = escapeHtml(recipient.name || 'المختبر')
              return {
                from: 'MomenCrafts <hello@momencrafts.com>',
                to: [recipient.email],
                subject: `${emojiStr} New build — ${app.name} ${version}`,
                html: `<div style="background:#0E4372;padding:32px 24px;font-family:'Inter',Helvetica,Arial,sans-serif">
  <div style="max-width:540px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:2rem">${emojiStr}</span>
    </div>

    <!-- ENGLISH -->
    <h1 style="color:#E2B96B;font-size:20px;margin:0 0 8px">New Build Available</h1>
    <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0 0 4px">
      Hey ${nameEn},
    </p>
    <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0 0 16px">
      A new build of <strong style="color:#E2B96B">${appName}</strong> (${ver}) is ready for testing!
    </p>
    <h2 style="color:#E2B96B;font-size:14px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.1em">What's new</h2>
    ${changelogHtmlEn}
    <div style="text-align:center;margin:24px 0">
      <a href="https://www.momencrafts.com/tester" style="display:inline-block;background:#E2B96B;color:#0E4372;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Open Tester Portal →</a>
    </div>
    <p style="color:#C3D9EC;font-size:12px;line-height:1.5;margin:16px 0 0">
      Test builds are confidential. Please do not redistribute the files or share screenshots publicly.
    </p>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:24px 0" />

    <!-- ARABIC -->
    <div dir="rtl" style="text-align:right">
      <h1 style="color:#E2B96B;font-size:20px;margin:0 0 8px">نسخة جديدة متاحة</h1>
      <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0 0 4px">
        أهلاً ${nameAr}،
      </p>
      <p style="color:#FFFFFF;font-size:15px;line-height:1.6;margin:0 0 16px">
        نسخة جديدة من <strong style="color:#E2B96B">${appNameAr}</strong> (${ver}) جاهزة للاختبار!
      </p>
      <h2 style="color:#E2B96B;font-size:14px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.1em">الجديد في هذه النسخة</h2>
      ${changelogHtmlAr}
      <div style="text-align:center;margin:24px 0">
        <a href="https://www.momencrafts.com/tester" style="display:inline-block;background:#E2B96B;color:#0E4372;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">بوابة المختبرين ←</a>
      </div>
      <p style="color:#C3D9EC;font-size:12px;line-height:1.5;margin:16px 0 0">
        نسخ الاختبار سرية. نرجو عدم إعادة توزيع الملفات أو نشر لقطات الشاشة علناً.
      </p>
    </div>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:24px 0" />
    <p style="color:#93B4D0;font-size:11px;text-align:center;margin:0">
      Reply STOP to stop receiving build emails.
    </p>
  </div>
</div>`,
              }
            })

            try {
              const res = await fetch('https://api.resend.com/emails/batch', {
                method: 'POST',
                headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(emails),
              })
              if (res.ok) {
                sent += chunk.length
              } else {
                const text = await res.text()
                console.error('Resend batch error:', text)
                failed += chunk.length
                await rollback(chunk.map(r => r.tokenId))
              }
            } catch (e) {
              console.error('Resend batch fetch error:', e)
              failed += chunk.length
              await rollback(chunk.map(r => r.tokenId))
            }
          }
        }

        // 5. Mark the release announced only if something actually went out.
        //    Setting it unconditionally would show "Notified <date>" in the
        //    panel after a total send failure.
        if (sent > 0) {
          await supabase.from('co_releases')
            .update({ notified_at: new Date().toISOString() })
            .eq('app_id', appId).eq('version', version)
        }

        return json(200, { sent, skippedNoEmail, alreadyNotified, failed }, cors)
      }

      default:
        return json(400, { error: `Unknown action: ${action}` }, cors)
    }
  } catch (err) {
    console.error('admin-manage-testers error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

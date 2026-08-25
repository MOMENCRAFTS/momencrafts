import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@/styles/admin-testers.css'

/* ═══════════════════════════════════════════════════════════
   AdminTesterPanel — Admin → Testers

   Three jobs:
     1. Pending join requests, approved or denied in one click.
     2. Per-tester grid: which apps each TESTER token can download.
     3. Per-app settings: in testing? open to join? build uploaded?

   Access is explicit — a tester downloads only what is ticked here.
   ═══════════════════════════════════════════════════════════ */

type Api = (fn: string, body?: object) => Promise<any>

interface AppRow {
  appId: string; name: string; version: string; status: string; emoji?: string
  testerVisible: boolean; openEnrolment: boolean; hasBuild: boolean
  apkPath?: string | null; guideUrl?: string | null
  buildDate?: string | null; minAndroid?: string | null; testStage?: string | null
}
interface TesterRow {
  tokenId: string; token: string; label: string; email?: string
  expiresAt?: string | null; revoked: boolean; createdAt?: string; appIds: string[]
}
interface RequestRow {
  id: string; tokenId: string; testerName: string; appId: string
  status: 'pending' | 'approved' | 'denied'; message?: string | null; createdAt: string
}

function relTime(iso?: string) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function AdminTesterPanel({ api }: { api: Api }) {
  const [apps, setApps]         = useState<AppRow[]>([])
  const [testers, setTesters]   = useState<TesterRow[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState<string | null>(null)
  const [err, setErr]           = useState('')
  const [uploading, setUploading] = useState<Record<string, number>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const r = await api('admin-manage-testers', { action: 'list' })
    if (r?.error) setErr(r.error)
    setApps(r?.apps || [])
    setTesters(r?.testers || [])
    setRequests(r?.requests || [])
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  const testerApps = useMemo(() => apps.filter(a => a.testerVisible), [apps])
  const pending    = useMemo(() => requests.filter(r => r.status === 'pending'), [requests])
  const appName    = useCallback((id: string) => apps.find(a => a.appId === id)?.name ?? id, [apps])

  /* ── Optimistic toggle: the grid is the whole point of this panel,
        so it must feel instant. Reverts if the call fails. ── */
  const toggle = async (tokenId: string, appId: string, has: boolean) => {
    const key = `${tokenId}:${appId}`
    setBusy(key)
    setTesters(ts => ts.map(t => t.tokenId !== tokenId ? t : {
      ...t, appIds: has ? t.appIds.filter(a => a !== appId) : [...t.appIds, appId],
    }))
    const r = await api('admin-manage-testers', { action: has ? 'unassign' : 'assign', tokenId, appId })
    if (r?.error) {
      setErr(r.error)
      setTesters(ts => ts.map(t => t.tokenId !== tokenId ? t : {
        ...t, appIds: has ? [...t.appIds, appId] : t.appIds.filter(a => a !== appId),
      }))
    }
    setBusy(null)
  }

  const decide = async (requestId: string, action: 'approve' | 'deny') => {
    setBusy(requestId)
    const r = await api('admin-manage-testers', { action, requestId })
    if (r?.error) setErr(r.error)
    await load()
    setBusy(null)
  }

  const setApp = async (appId: string, patch: Record<string, unknown>) => {
    setBusy(appId)
    setApps(as => as.map(a => a.appId === appId ? { ...a, ...patch } as AppRow : a))
    const r = await api('admin-manage-testers', { action: 'setApp', appId, ...patch })
    if (r?.error) { setErr(r.error); await load() }
    setBusy(null)
  }

  /* ── APK upload: get signed URL, PUT via XHR for progress, then setApp ── */
  const uploadApk = async (appId: string, file: File) => {
    setUploading(u => ({ ...u, [appId]: 0 }))
    setErr('')
    try {
      // 1. Get signed upload URL
      const urlRes = await api('admin-manage-testers', {
        action: 'uploadUrl', appId, fileName: file.name,
      })
      if (urlRes?.error) { setErr(urlRes.error); setUploading(u => { const n = { ...u }; delete n[appId]; return n }); return }

      // 2. Upload via XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploading(u => ({ ...u, [appId]: Math.round((e.loaded / e.total) * 100) }))
        }
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', urlRes.signedUrl)
        xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive')
        xhr.send(file)
      })

      // 3. Update DB with storage path
      await setApp(appId, { apkPath: urlRes.storagePath })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(u => { const n = { ...u }; delete n[appId]; return n })
    }
  }

  const removeApk = async (appId: string) => {
    setBusy(appId)
    const r = await api('admin-manage-testers', { action: 'deleteApk', appId })
    if (r?.error) setErr(r.error)
    await load()
    setBusy(null)
  }

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🧪 Testers</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>

      {err && <div className="a-error">{err}</div>}

      {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> : (
        <>
          {/* ── 1 · Pending join requests ── */}
          <section className="at-section">
            <h3 className="at-heading">
              Join requests
              {pending.length > 0 && <span className="at-count">{pending.length}</span>}
            </h3>

            {pending.length === 0 ? (
              <div className="admin-empty">No pending requests.</div>
            ) : (
              <div className="a-inbox">
                {pending.map(r => (
                  <div className="a-inbox-item at-request" key={r.id}>
                    <div className="a-inbox-text">
                      <div className="a-inbox-from">{r.testerName}</div>
                      <div className="a-inbox-type">
                        wants to test <strong>{appName(r.appId)}</strong>
                      </div>
                      {r.message && <div className="a-inbox-meta">“{r.message}”</div>}
                      <div className="a-inbox-time">{relTime(r.createdAt)}</div>
                    </div>
                    <div className="at-request-actions">
                      <button className="a-btn a-btn--gold a-btn--sm"
                              disabled={busy === r.id}
                              onClick={() => decide(r.id, 'approve')}>Approve</button>
                      <button className="a-btn a-btn--ghost a-btn--sm"
                              disabled={busy === r.id}
                              onClick={() => decide(r.id, 'deny')}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 2 · Who can download what ── */}
          <section className="at-section">
            <h3 className="at-heading">Assignments</h3>
            <p className="at-hint">
              A tester downloads only what is ticked. Nothing is granted implicitly.
            </p>

            {testers.length === 0 ? (
              <div className="admin-empty">
                No TESTER tokens yet — create one in the Tokens tab.
              </div>
            ) : testerApps.length === 0 ? (
              <div className="admin-empty">
                No apps are marked as in testing yet — use the table below.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table at-matrix">
                  <thead>
                    <tr>
                      <th>Tester</th>
                      {testerApps.map(a => (
                        <th key={a.appId} className="at-col">
                          <span className="at-col-emoji">{a.emoji || '📱'}</span>
                          <span className="at-col-name">{a.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {testers.map(t => (
                      <tr key={t.tokenId} className={t.revoked ? 'at-revoked' : ''}>
                        <td>
                          <div className="at-tester-name">{t.label || '—'}</div>
                          <div className="at-tester-meta mono">{t.token}</div>
                          {t.revoked && <span className="a-badge a-badge--revoked">revoked</span>}
                        </td>
                        {testerApps.map(a => {
                          const has = t.appIds.includes(a.appId)
                          const key = `${t.tokenId}:${a.appId}`
                          return (
                            <td key={a.appId} className="at-cell">
                              <button
                                className={`at-tick${has ? ' at-tick--on' : ''}`}
                                disabled={busy === key || t.revoked}
                                aria-pressed={has}
                                aria-label={`${has ? 'Remove' : 'Grant'} ${a.name} for ${t.label}`}
                                title={`${has ? 'Remove' : 'Grant'} ${a.name}`}
                                onClick={() => toggle(t.tokenId, a.appId, has)}
                              >{has ? '✓' : ''}</button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 3 · Per-app testing settings ── */}
          <section className="at-section">
            <h3 className="at-heading">Programmes</h3>
            <p className="at-hint">
              <strong>In testing</strong> puts an app in the portal. <strong>Open to join</strong> also
              advertises it to every tester, who can then request access — you still approve each one.
            </p>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>App</th><th>Version</th><th>Stage</th>
                    <th>In testing</th><th>Open to join</th><th>Build</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(a => (
                    <tr key={a.appId}>
                      <td>
                        <span className="at-col-emoji">{a.emoji || '📱'}</span>{' '}
                        <strong>{a.name}</strong>
                        <div className="at-tester-meta mono">{a.appId}</div>
                      </td>
                      <td className="mono">{a.version}</td>
                      <td>{a.testStage ? <span className="a-tag">{a.testStage}</span> : '—'}</td>
                      <td>
                        <button
                          className={`at-tick${a.testerVisible ? ' at-tick--on' : ''}`}
                          disabled={busy === a.appId}
                          aria-pressed={a.testerVisible}
                          onClick={() => setApp(a.appId, { testerVisible: !a.testerVisible })}
                        >{a.testerVisible ? '✓' : ''}</button>
                      </td>
                      <td>
                        <button
                          className={`at-tick${a.openEnrolment ? ' at-tick--on' : ''}`}
                          disabled={busy === a.appId || !a.testerVisible}
                          aria-pressed={a.openEnrolment}
                          title={a.testerVisible ? '' : 'Mark it as in testing first'}
                          onClick={() => setApp(a.appId, { openEnrolment: !a.openEnrolment })}
                        >{a.openEnrolment ? '✓' : ''}</button>
                      </td>
                      <td className="at-build-cell">
                        <input
                          ref={el => { fileRefs.current[a.appId] = el }}
                          type="file"
                          accept=".apk"
                          className="at-file-input"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) uploadApk(a.appId, f)
                            e.target.value = ''
                          }}
                        />
                        {uploading[a.appId] != null ? (
                          <div className="at-upload-progress">
                            <div className="at-upload-bar" style={{ width: `${uploading[a.appId]}%` }} />
                            <span className="at-upload-pct">{uploading[a.appId]}%</span>
                          </div>
                        ) : a.hasBuild ? (
                          <div className="at-build-info">
                            <span className="a-badge a-badge--active">uploaded</span>
                            <div className="at-build-actions">
                              <button
                                className="at-btn at-btn--sm"
                                disabled={busy === a.appId}
                                onClick={() => fileRefs.current[a.appId]?.click()}
                              >Replace</button>
                              <button
                                className="at-btn at-btn--sm at-btn--danger"
                                disabled={busy === a.appId}
                                onClick={() => removeApk(a.appId)}
                              >✕</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="at-btn at-btn--upload"
                            disabled={busy === a.appId}
                            onClick={() => fileRefs.current[a.appId]?.click()}
                          >Upload APK</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default AdminTesterPanel

/* ═══════════════════════════════════════════════════════════
   AdminXhbPanels.tsx — XHB oversight for the MomenCrafts admin
   Save as: src/components/AdminXhbPanels.tsx

   Three panels: Progress · Activity · Users.
   They call `xhb-manage-access` and `xhb-reminder`, which are xhb-* functions
   touching xhb.* only. Nothing here goes near admin-get-analytics (P10).

   SECURITY — deliberate, please don't "simplify" it:
   • These functions authenticate with XHB_ADMIN_KEY, which is a DIFFERENT
     secret from the portal's ADMIN_SECRET_KEY. Keeping them separate means
     the portal admin key cannot disable a founder or read the XHB log.
   • The XHB key is held in React state ONLY. It is never written to
     sessionStorage or localStorage, so a refresh re-prompts. That is the
     intended cost.

   FRAMING — also deliberate:
   • These panels show ROUND PROGRESS, not surveillance of a person.
     "Last active" is a DATE, never a session-by-session login history.
   • No people-scoring language anywhere. State names describe the card.
   • The Progress panel is built to be reusable inside XHB for Mulham with a
     founder session instead of an admin key — pass a different fetcher.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react'

const FN_BASE = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'

/* ── shared fetcher, key never persisted ─────────────────────────────── */
export function makeXhbApi(xhbKey: string) {
  return async (fn: 'xhb-manage-access' | 'xhb-reminder', body: object) => {
    const res = await fetch(`${FN_BASE}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': xhbKey },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({ error: 'Bad response' }))
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
    return data
  }
}

/* ── one-time key prompt ─────────────────────────────────────────────── */
export function XhbKeyGate({ onKey }: { onKey: (k: string) => void }) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const check = async () => {
    if (!val.trim()) return
    setBusy(true); setErr('')
    try {
      await makeXhbApi(val.trim())('xhb-manage-access', { action: 'list_users' })
      onKey(val.trim())
    } catch (e: any) {
      setErr(e.message === 'Unauthorized' ? 'That key was rejected' : e.message)
    }
    setBusy(false)
  }

  return (
    <div className="a-card" style={{ maxWidth: 460 }}>
      <div className="a-card-label">🔐 XHB admin key</div>
      <p style={{ fontSize: '.8rem', lineHeight: 1.6, color: 'var(--a-cream-40)', margin: '0 0 1rem' }}>
        Separate from the portal admin key, and held in memory only — a refresh will ask again.
        This is what keeps the portal key from being able to disable a founder.
      </p>
      <input
        className="a-input" type="password" autoFocus placeholder="XHB_ADMIN_KEY"
        value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
      />
      {err && <div className="a-error" style={{ marginTop: '.6rem' }}>{err}</div>}
      <button className="a-btn a-btn--gold" style={{ marginTop: '.9rem' }} onClick={check} disabled={busy}>
        {busy ? 'Checking…' : 'Unlock →'}
      </button>
    </div>
  )
}

/* ── labels ──────────────────────────────────────────────────────────── */
const STATE_LABEL: Record<string, string> = {
  awaiting_design_answer: 'Awaiting design answer',
  awaiting_review:        'Awaiting review',
  contested:              'Contested',
  settled:                'Settled',
}
const STATE_CLASS: Record<string, string> = {
  awaiting_design_answer: 'a-badge',
  awaiting_review:        'a-badge',
  contested:              'a-badge a-badge--expired',
  settled:                'a-badge a-badge--active',
}
const ACTION_LABEL: Record<string, string> = {
  sso_session_minted:       'Entered the HQ',
  admin_sso_session_minted: 'Entered via admin path',
  token_login:              'Token login',
  sso_denied:               'Entry denied',
  admin_sso_denied:         'Admin entry denied',
  gate_denied:              'Gate denied',
  enrol_redeemed:           'Enrolment redeemed',
  enrol_denied:             'Enrolment denied',
  token_issued:             'Token issued',
  token_revoked:            'Token revoked',
  user_enabled:             'User enabled',
  user_disabled:            'User disabled',
  force_unlock:             'Round force-closed',
  reminder_sent:            'Reminder emailed',
  progress_sent:            'Progress summary emailed',
}
const DENIED = new Set(['sso_denied', 'admin_sso_denied', 'gate_denied', 'enrol_denied'])

/* ══════════════════════════════════════════════════════════════════════
   1 · XHB PROGRESS
   ══════════════════════════════════════════════════════════════════════ */
export function XhbProgressPanel({ api }: { api: ReturnType<typeof makeXhbApi> }) {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setD(await api('xhb-manage-access', { action: 'round_progress' })) }
    catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  // Always preview before sending. Nothing reaches a co-founder unseen.
  const doPreview = async (mode: 'pending' | 'progress') => {
    setBusy(mode); setPreview(null); setErr('')
    try { setPreview(await api('xhb-reminder', { mode, dryRun: true })) }
    catch (e: any) { setErr(e.message) }
    setBusy('')
  }
  const doSend = async (mode: 'pending' | 'progress') => {
    setBusy('send')
    try {
      const r = await api('xhb-reminder', { mode, force: mode === 'progress' })
      setPreview({ sentResult: r })
    } catch (e: any) { setErr(e.message) }
    setBusy('')
  }

  if (loading) return <div className="admin-loading"><div className="a-spinner" /> Loading round…</div>
  if (err && !d) return <div className="a-error">{err}</div>

  const s = d?.summary || {}
  const pct = s.total ? Math.round((s.settled / s.total) * 100) : 0

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">◈ Round {d?.round} progress</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>

      {/* headline */}
      <div className="a-card" style={{ marginBottom: '1.25rem' }}>
        <div className="a-card-label">Settled</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '.6rem' }}>
          <span className="a-card-value">{s.settled}</span>
          <span style={{ color: 'var(--a-cream-40)' }}>of {s.total}</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.10)', borderRadius: 99, overflow: 'hidden', marginTop: '.9rem' }}>
          <div style={{ height: 8, width: `${pct}%`, background: 'var(--a-gold)' }} />
        </div>
      </div>

      {/* who holds the ball — BOTH sides, always */}
      <div className="a-grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="a-card a-kpi">
          <div className="a-kpi-value">{s.waiting_on_author}</div>
          <div className="a-kpi-label">With Mulham</div>
          <div className="a-kpi-sub">Awaiting design answer</div>
        </div>
        <div className="a-card a-kpi">
          <div className="a-kpi-value">{s.waiting_on_builder}</div>
          <div className="a-kpi-label">With Momen</div>
          <div className="a-kpi-sub">Awaiting review</div>
        </div>
        <div className="a-card a-kpi">
          <div className="a-kpi-value">{s.contested}</div>
          <div className="a-kpi-label">Contested</div>
          <div className="a-kpi-sub">Back for another pass</div>
        </div>
      </div>

      {/* last active — a DATE, not a login history */}
      <div className="a-card" style={{ marginBottom: '1.25rem' }}>
        <div className="a-card-label">Last active</div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {(d?.founders || []).map((f: any) => (
            <div key={f.email}>
              <div style={{ fontWeight: 600, color: 'var(--a-cream)' }}>{f.name || f.email}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--a-cream-40)' }}>
                {f.last_active || 'no recorded entry'} · {f.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* oldest open — the actionable number */}
      {d?.oldest_open?.length > 0 && (
        <div className="a-card" style={{ marginBottom: '1.25rem' }}>
          <div className="a-card-label">Sitting longest</div>
          {d.oldest_open.map((o: any) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <span>{o.title}</span>
              <span style={{ color: 'var(--a-cream-40)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                {o.days_in_state == null ? 'not started' : `${o.days_in_state}d`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* items */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>#</th><th>Card</th><th>State</th><th>With</th><th>Days</th><th>Revisions</th></tr></thead>
          <tbody>
            {(d?.items || []).map((it: any) => (
              <tr key={it.id}>
                <td style={{ color: 'var(--a-cream-40)' }}>{it.position}</td>
                <td style={{ color: 'var(--a-cream)' }}>{it.title}</td>
                <td><span className={STATE_CLASS[it.state]}>{STATE_LABEL[it.state]}</span></td>
                <td>{it.ball === 'author' ? 'Mulham' : it.ball === 'builder' ? 'Momen' : '—'}</td>
                <td>{it.days_in_state == null ? '—' : `${it.days_in_state}d`}</td>
                <td>{it.revisions || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* email actions — preview first, always */}
      <div className="a-card" style={{ marginTop: '1.25rem' }}>
        <div className="a-card-label">Email</div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button className="a-btn a-btn--ghost" onClick={() => doPreview('pending')} disabled={!!busy}>
            {busy === 'pending' ? 'Building…' : 'Preview nudge'}
          </button>
          <button className="a-btn a-btn--ghost" onClick={() => doPreview('progress')} disabled={!!busy}>
            {busy === 'progress' ? 'Building…' : 'Preview progress summary'}
          </button>
        </div>
        <p style={{ fontSize: '.75rem', color: 'var(--a-cream-40)', margin: '.8rem 0 0', lineHeight: 1.6 }}>
          Preview runs a dry run and shows exactly who would receive what. Nothing is sent until you
          confirm below. Nudges are capped at one per person every 5 days.
        </p>

        {preview && !preview.sentResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,.04)', borderRadius: 8 }}>
            <div style={{ fontSize: '.75rem', color: 'var(--a-cream-40)', marginBottom: '.6rem' }}>
              WOULD SEND — {preview.would_send?.length || 0} message(s)
            </div>
            {(preview.would_send || []).map((w: any, i: number) => (
              <div key={i} style={{ fontSize: '.8rem', padding: '.35rem 0' }}>
                <strong style={{ color: 'var(--a-cream)' }}>{w.to}</strong>
                <span style={{ color: 'var(--a-cream-40)' }}> — {w.subject}</span>
              </div>
            ))}
            {(preview.would_send?.length ?? 0) === 0
              ? <div style={{ fontSize: '.8rem', color: 'var(--a-cream-40)' }}>
                  Nobody is due — either nothing is outstanding, or they were nudged in the last 5 days.
                </div>
              : <button className="a-btn a-btn--gold" style={{ marginTop: '.9rem' }}
                  onClick={() => doSend(preview.mode)} disabled={busy === 'send'}>
                  {busy === 'send' ? 'Sending…' : `Send ${preview.would_send.length} email(s)`}
                </button>}
          </div>
        )}

        {preview?.sentResult && (
          <div className="a-card-sub" style={{ marginTop: '1rem' }}>
            Sent to {preview.sentResult.sent?.join(', ') || 'nobody'}
            {preview.sentResult.failed?.length ? ` · ${preview.sentResult.failed.length} failed` : ''}
          </div>
        )}
        {err && <div className="a-error" style={{ marginTop: '.8rem' }}>{err}</div>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2 · XHB ACTIVITY  (the access log, in human words)
   ══════════════════════════════════════════════════════════════════════ */
export function XhbActivityPanel({ api }: { api: ReturnType<typeof makeXhbApi> }) {
  const [log, setLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [who, setWho] = useState('')
  const [onlyDenied, setOnlyDenied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await api('xhb-manage-access', { action: 'access_log', limit: 300 })
      setLog(r.log || [])
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  const rows = log.filter(r =>
    (!who || (r.actor || '').toLowerCase().includes(who.toLowerCase())) &&
    (!onlyDenied || DENIED.has(r.action)),
  )

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🧾 XHB activity</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="a-input" style={{ maxWidth: 260 }} placeholder="Filter by person…"
          value={who} onChange={e => setWho(e.target.value)} />
        <label style={{ fontSize: '.8rem', color: 'var(--a-cream-40)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <input type="checkbox" checked={onlyDenied} onChange={e => setOnlyDenied(e.target.checked)} />
          Denied events only
        </label>
      </div>

      {err && <div className="a-error">{err}</div>}
      {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> :
       rows.length === 0 ? <div className="admin-empty">Nothing recorded for this filter.</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Subject</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || i} style={DENIED.has(r.action) ? { background: 'rgba(200,60,60,.10)' } : undefined}>
                  <td style={{ fontSize: '.75rem', color: 'var(--a-cream-40)', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })}
                  </td>
                  <td style={{ color: 'var(--a-cream)' }}>{r.actor}</td>
                  <td>{ACTION_LABEL[r.action] || r.action}</td>
                  <td style={{ fontSize: '.75rem', color: 'var(--a-cream-40)' }}>{r.subject || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-footer-info">{rows.length} events · times in Riyadh</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   3 · XHB USERS
   ══════════════════════════════════════════════════════════════════════ */
export function XhbUsersPanel({ api }: { api: ReturnType<typeof makeXhbApi> }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await api('xhb-manage-access', { action: 'list_users' })
      setUsers(r.users || r.data || [])
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  const toggle = async (email: string, disable: boolean) => {
    setErr('')
    try {
      await api('xhb-manage-access', { action: disable ? 'disable_user' : 'enable_user', email })
      setConfirm(null); load()
    } catch (e: any) { setErr(e.message) }
  }

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">👤 XHB users</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>
      {err && <div className="a-error">{err}</div>}
      {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Added</th><th /></tr></thead>
            <tbody>
              {users.map((u: any) => {
                const off = !!u.disabled_at
                return (
                  <tr key={u.email}>
                    <td style={{ color: 'var(--a-cream)', fontWeight: 600 }}>{u.display_name || '—'}</td>
                    <td style={{ fontSize: '.8rem' }}>{u.email}</td>
                    <td>
                      {u.is_superadmin && <span className="a-tag">superadmin</span>}{' '}
                      {u.is_builder ? <span className="a-tag">builder</span> : <span className="a-tag">author</span>}
                    </td>
                    <td>{off
                      ? <span className="a-badge a-badge--revoked">Disabled</span>
                      : <span className="a-badge a-badge--active">Active</span>}</td>
                    <td style={{ fontSize: '.75rem', color: 'var(--a-cream-40)' }}>
                      {u.added_at ? u.added_at.slice(0, 10) : '—'}
                    </td>
                    <td>
                      {confirm === u.email ? (
                        <span style={{ display: 'flex', gap: '.4rem' }}>
                          <button className="a-btn a-btn--sm a-btn--danger" onClick={() => toggle(u.email, !off)}>Confirm</button>
                          <button className="a-btn a-btn--sm a-btn--ghost" onClick={() => setConfirm(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button className="a-btn a-btn--sm a-btn--ghost" onClick={() => setConfirm(u.email)}>
                          {off ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-footer-info">Enable and disable are both written to the access log.</div>
    </div>
  )
}

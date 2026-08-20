import { useState, useEffect, useCallback, useRef } from 'react'
import '@/styles/admin.css'
import { XhbKeyGate, makeXhbApi, XhbProgressPanel, XhbActivityPanel, XhbUsersPanel } from '@/components/AdminXhbPanels'

// Admin password removed — validation should be server-side
// For the SPA admin screen, password is validated via edge function
const SUPABASE_URL = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'
const COFOUNDER_TYPES = new Set(['PERMANENT', 'STRATEGIC', 'COFOUNDER'])

/* ── API helper (top-level so all panels can use it) ── */
function makeApi(adminKey: string) {
  return async (fn: string, body?: object) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (adminKey) headers['X-Admin-Key'] = adminKey
    const res = await fetch(`${SUPABASE_URL}/${fn}`, {
      method: 'POST', headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  }
}

/* ── Relative time helper ── */
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.floor(h / 24)} day ago`
}

/* ── Token status helper ── */
function tokenStatus(t: any): 'active' | 'revoked' | 'expired' {
  if (t.revoked_at) return 'revoked'
  if (t.expires_at && new Date(t.expires_at) < new Date()) return 'expired'
  return 'active'
}

/* ══════════════════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════════════════ */
function AdminLogin({ onLogin }: { onLogin: (key: string) => void }) {
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState('')
  const submit = async () => {
    if (!pass.trim()) { setErr('Enter a password'); setTimeout(() => setErr(''), 2000); return }
    try {
      const res = await fetch(`${SUPABASE_URL}/admin-manage-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': pass },
        body: JSON.stringify({ action: 'list' }),
      })
      if (res.ok) { sessionStorage.setItem('mcr_admin_auth', '1'); onLogin(pass) }
      else { setErr('Invalid admin key'); setTimeout(() => setErr(''), 2000) }
    } catch { setErr('Network error'); setTimeout(() => setErr(''), 2000) }
  }
  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <div className="admin-login-mark">✦</div>
        <h1 className="admin-login-title">MomenCrafts Admin</h1>
        <p className="admin-login-sub">Admin access only · Riyadh, KSA</p>
        <input type="password" className="admin-login-input" placeholder="Password"
          value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
        {err && <div className="admin-login-err">{err}</div>}
        <button className="admin-login-btn" onClick={submit}>Enter →</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   DASHBOARD PANEL
   ══════════════════════════════════════════════════════ */
function DashboardPanel({ api }: { api: ReturnType<typeof makeApi> }) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api('admin-get-analytics', { period: '7d' })
      setData(r)
    } catch { /* silent */ }
    setLoading(false)
  }, [api])

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 60000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  const investors    = data?.investors    || []
  const events       = data?.recentEvents || []
  const sectionDwell = data?.sectionDwell || []
  const cardExpands  = data?.cardExpands  || []
  const maxDwell     = Math.max(...sectionDwell.map((s: any) => s.total_seconds || 0), 1)
  const maxExpand    = Math.max(...cardExpands.map((c: any) => c.expand_count || 0), 1)
  const coFounders   = investors.filter((i: any) => COFOUNDER_TYPES.has(i.token_type))

  const EVENT_STYLE: Record<string, { dot: string; label: string }> = {
    nda_accepted:    { dot: 'a-feed-dot--gold',    label: 'NDA accepted' },
    room_enter:      { dot: 'a-feed-dot--active',  label: 'Entered room' },
    doc_download:    { dot: 'a-feed-dot--neutral', label: 'Doc download' },
    card_expand:     { dot: 'a-feed-dot--neutral', label: 'Card expand' },
    session_expired: { dot: 'a-feed-dot--red',     label: 'Session expired' },
  }

  if (loading) return <div className="admin-loading"><div className="a-spinner" /> Loading dashboard…</div>

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">📊 Dashboard</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>

      {/* KPI row */}
      <div className="a-grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="a-card a-kpi a-kpi--gold">
          <div className="a-kpi-icon">🔑</div>
          <div className="a-kpi-value">{investors.length}</div>
          <div className="a-kpi-label">Total Tokens</div>
          <div className="a-kpi-sub">All access keys</div>
        </div>
        <div className="a-card a-kpi a-kpi--gold">
          <div className="a-kpi-icon">✦</div>
          <div className="a-kpi-value">{coFounders.length}</div>
          <div className="a-kpi-label">Co-Founders</div>
          <div className="a-kpi-sub">PERMANENT tokens</div>
        </div>
        <div className="a-card a-kpi a-kpi--green">
          <div className="a-kpi-icon">👁</div>
          <div className="a-kpi-value">{data?.sessionsToday?.length ?? 0}</div>
          <div className="a-kpi-label">Sessions Today</div>
          <div className="a-kpi-sub">Active right now</div>
        </div>
        <div className="a-card a-kpi a-kpi--red">
          <div className="a-kpi-icon">⚠</div>
          <div className="a-kpi-value">{data?.failedAttempts24h ?? 0}</div>
          <div className="a-kpi-label">Failed (24h)</div>
          <div className="a-kpi-sub">Bad token attempts</div>
        </div>
      </div>

      {/* Signal feed + Section dwell */}
      <div className="a-grid-auto" style={{ marginBottom: '1.5rem' }}>
        {/* Signal feed */}
        <div className="a-card">
          <div className="a-feed-header">
            <div className="a-card-label" style={{ margin: 0 }}>Signal Feed</div>
            <div className="a-feed-live"><div className="a-feed-live-dot" />LIVE</div>
          </div>
          <div className="a-feed">
            {events.slice(0, 12).map((e: any, i: number) => {
              const style = EVENT_STYLE[e.event_type] ?? { dot: 'a-feed-dot--neutral', label: e.event_type }
              const name = e.investor_sessions?.investor_tokens?.label ?? 'Unknown'
              return (
                <div className="a-feed-item" key={i}>
                  <div className={`a-feed-dot ${style.dot}`} />
                  <div>
                    <span className="a-feed-name">{name}</span>
                    <span className="a-feed-event">{style.label}</span>
                  </div>
                  <span className="a-feed-time">{relTime(e.created_at)}</span>
                </div>
              )
            })}
            {events.length === 0 && <div className="cfp-empty" style={{ padding: '1rem 0' }}>No events yet</div>}
          </div>
        </div>

        {/* Section dwell */}
        <div className="a-card">
          <div className="a-card-label">Section Dwell Time</div>
          <div className="a-chart" style={{ marginBottom: '1.5rem' }}>
            {sectionDwell.slice(0, 7).map((s: any, i: number) => (
              <div className="a-chart-row" key={i}>
                <div className="a-chart-label">{s.section_id ?? `Section ${i+1}`}</div>
                <div className="a-chart-track">
                  <div className="a-chart-bar" style={{ width: `${(s.total_seconds / maxDwell) * 100}%` }} />
                </div>
                <div className="a-chart-val">{Math.round(s.total_seconds)}s</div>
              </div>
            ))}
            {sectionDwell.length === 0 && <div className="cfp-empty" style={{ padding: '.5rem 0' }}>No dwell data yet</div>}
          </div>

          <div className="a-card-label" style={{ marginTop: '.5rem' }}>Product Interest (Card Expands)</div>
          <div className="a-chart">
            {cardExpands.slice(0, 5).map((c: any, i: number) => (
              <div className="a-chart-row" key={i}>
                <div className="a-chart-label">{c.product_id ?? `Product ${i+1}`}</div>
                <div className="a-chart-track">
                  <div className="a-chart-bar" style={{ width: `${(c.expand_count / maxExpand) * 100}%` }} />
                </div>
                <div className="a-chart-val">{c.expand_count}</div>
              </div>
            ))}
            {cardExpands.length === 0 && <div className="cfp-empty" style={{ padding: '.5rem 0' }}>No expand data yet</div>}
          </div>
        </div>
      </div>

      {/* Doc downloads strip */}
      <div className="a-card" style={{ padding: '.85rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontFamily: 'var(--a-font-mono)', fontSize: '.65rem', letterSpacing: '.14em', color: 'var(--a-cream-40)' }}>TOTAL DOC DOWNLOADS</span>
          <span style={{ fontFamily: 'var(--a-font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--a-gold)' }}>{data?.docDownloads ?? 0}</span>
          <span style={{ fontFamily: 'var(--a-font-mono)', fontSize: '.65rem', letterSpacing: '.1em', color: 'var(--a-cream-40)' }}>· Auto-refreshes every 60s</span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TOKENS PANEL
   ══════════════════════════════════════════════════════ */
function TokensPanel({ api }: { api: ReturnType<typeof makeApi> }) {
  const [tokens,   setTokens]  = useState<any[]>([])
  const [loading,  setLoading] = useState(true)
  const [filter,   setFilter]  = useState('')
  const [copied,   setCopied]  = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: '', email: '', notes: '', token_type: 'MONTH' })
  const [creating, setCreating] = useState(false)
  const [formErr,  setFormErr]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api('admin-manage-token', { action: 'list' })
    setTokens(r?.data || [])
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const create = async () => {
    if (!form.label.trim()) { setFormErr('Name is required'); return }
    setCreating(true); setFormErr('')
    const r = await api('admin-manage-token', {
      action: 'create', label: form.label, email: form.email || undefined,
      notes: form.notes || undefined, token_type: form.token_type,
    })
    if (r.error) { setFormErr(r.error); setCreating(false); return }
    setForm({ label: '', email: '', notes: '', token_type: 'MONTH' })
    setShowForm(false); load(); setCreating(false)
  }

  const revoke = async (tokenId: string) => {
    if (!confirm('Revoke this token? This cannot be undone.')) return
    await api('admin-manage-token', { action: 'revoke', tokenId, reason: 'Admin revocation' })
    load()
  }

  const filtered = tokens.filter(t =>
    !filter || t.label?.toLowerCase().includes(filter.toLowerCase()) ||
    t.token?.includes(filter.toUpperCase()) || t.token_type?.includes(filter.toUpperCase())
  )

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🔑 Tokens</h2>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button className="a-btn a-btn--ghost a-btn--sm" onClick={load}>🔄 Refresh</button>
          <button className="a-btn a-btn--gold a-btn--sm" onClick={() => setShowForm(f => !f)}>
            {showForm ? '✕ Cancel' : '＋ New Token'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="a-card" style={{ marginBottom: '1.25rem' }}>
          <div className="a-card-label">New Access Token</div>
          <div className="a-grid-2">
            <div className="a-field">
              <label className="a-label">Full Name *</label>
              <input className="a-input" placeholder="Ahmed Al-Rashidi" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="a-field">
              <label className="a-label">Email</label>
              <input className="a-input" type="email" placeholder="ahmed@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="a-field">
              <label className="a-label">Token Type</label>
              <select className="a-input a-select" value={form.token_type} onChange={e => setForm(f => ({ ...f, token_type: e.target.value }))}>
                <option value="HOUR">HOUR — 1 hour</option>
                <option value="WEEK">WEEK — 7 days</option>
                <option value="MONTH">MONTH — 30 days</option>
              </select>
            </div>
            <div className="a-field">
              <label className="a-label">Notes</label>
              <input className="a-input" placeholder="Met at LEAP 2026" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {formErr && <div className="a-error">{formErr}</div>}
          <button className="a-btn a-btn--gold" onClick={create} disabled={creating}>
            {creating ? '⏳ Creating…' : '＋ Create Token'}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input className="a-input" placeholder="🔍 Search by name, token, or type…"
          value={filter} onChange={e => setFilter(e.target.value)}
          style={{ maxWidth: '360px' }} />
      </div>

      {loading ? (
        <div className="admin-loading"><div className="a-spinner" /> Loading tokens…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No tokens found.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th><th>Token</th><th>Type</th><th>Status</th>
                <th>Expires</th><th>Sessions</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => {
                const status = tokenStatus(t)
                return (
                  <tr key={t.token_id || t.id} className={COFOUNDER_TYPES.has(t.token_type) ? 'admin-row-cofound' : ''}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--a-cream)' }}>{t.label}</div>
                      {t.email && <div style={{ fontSize: '.72rem', color: 'var(--a-cream-40)' }}>{t.email}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{t.token}</span>
                    </td>
                    <td>
                      {COFOUNDER_TYPES.has(t.token_type)
                        ? <span className="admin-cofound-badge">✦ {t.token_type}</span>
                        : <span className="a-tag">{t.token_type}</span>}
                    </td>
                    <td>
                      <span className={`a-badge a-badge--${status}`}>
                        {status === 'active' ? '● Active' : status === 'revoked' ? '⊗ Revoked' : '⚡ Expired'}
                      </span>
                    </td>
                    <td style={{ fontSize: '.75rem', color: 'var(--a-cream-40)' }}>
                      {t.expires_at ? new Date(t.expires_at).toLocaleDateString('en-GB') : '∞ Never'}
                    </td>
                    <td style={{ fontFamily: 'var(--a-font-mono)', fontSize: '.78rem', color: 'var(--a-cream-60)' }}>
                      {t.session_count ?? 0}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                        <button className="a-btn a-btn--ghost a-btn--sm"
                          onClick={() => copy(t.token, t.token)}>
                          {copied === t.token ? '✅' : '📋'}
                        </button>

                        {status === 'active' && !t.revoked_at && (
                          <button className="a-btn a-btn--danger a-btn--sm"
                            onClick={() => revoke(t.token_id || t.id)}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-footer-info">{filtered.length} tokens · Sorted by newest</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SESSIONS PANEL
   ══════════════════════════════════════════════════════ */
function SessionsPanel({ api }: { api: ReturnType<typeof makeApi> }) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api('admin-get-analytics', { period: '1d' })
    setSessions(r?.sessionsToday || [])
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🧾 Sessions</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>
      {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> :
        sessions.length === 0 ? <div className="admin-empty">No sessions today yet.</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Token Type</th><th>Started</th><th>NDA</th><th>Session Key</th></tr></thead>
            <tbody>
              {sessions.map((s: any, i: number) => (
                <tr key={s.id || i}>
                  <td style={{ fontWeight: 600, color: 'var(--a-cream)' }}>{s.label || '—'}</td>
                  <td>{COFOUNDER_TYPES.has(s.token_type)
                    ? <span className="admin-cofound-badge">✦ {s.token_type}</span>
                    : <span className="a-tag">{s.token_type}</span>}</td>
                  <td style={{ fontSize: '.75rem', color: 'var(--a-cream-40)' }}>
                    {s.started_at ? relTime(s.started_at) : '—'}
                  </td>
                  <td>{s.nda_accepted ? <span className="a-badge a-badge--active">✓ Yes</span> : <span className="a-badge a-badge--expired">Pending</span>}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.7rem', color: 'var(--a-cream-40)' }}>{s.session_key || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-footer-info">{sessions.length} sessions today</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CO-FOUNDER PANEL
   ══════════════════════════════════════════════════════ */
function CoFounderPanel({ api }: { api: ReturnType<typeof makeApi> }) {
  const [form, setForm]      = useState({ label: '', email: '', notes: '', token_type: 'PERMANENT' })
  const [result, setResult]  = useState<any>(null)
  const [generating, setGen] = useState(false)
  const [err, setErr]        = useState('')
  const [tokens, setTokens]  = useState<any[]>([])
  const [loadingList, setLL] = useState(true)
  const [copied, setCopied]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLL(true)
    const r = await api('admin-manage-token', { action: 'list' })
    setTokens((r?.data || []).filter((t: any) => COFOUNDER_TYPES.has(t.token_type)))
    setLL(false)
  }, [api])

  useEffect(() => { load() }, [load, result])

  const generate = async () => {
    if (!form.label.trim()) { setErr('Name is required'); return }
    setGen(true); setErr(''); setResult(null)
    const res = await api('admin-manage-token', {
      action: 'create', label: form.label.trim(),
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      token_type: form.token_type,
    })
    if (res.error) { setErr(res.error); setGen(false); return }
    setResult(res)
    setForm(f => ({ ...f, label: '', email: '', notes: '' }))
    setGen(false)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="cfp-shell">
      <div className="cfp-header">
        <div className="cfp-header-left">
          <span className="cfp-mark">✦</span>
          <div>
            <h2 className="cfp-title">Co-Founder Token Generator</h2>
            <p className="cfp-sub">Generate permanent access tokens for co-founders. Triggers the Win-Win welcome screen after NDA acceptance.</p>
          </div>
        </div>
        <div className="cfp-stat-pill">✦ {tokens.length} co-founders</div>
      </div>

      <div className="cfp-grid">
        <div className="cfp-card">
          <div className="cfp-card-label">⚡ Generate New Token</div>
          {[
            { label: 'Full Name *', key: 'label', type: 'text', ph: 'Ahmed Al-Rashidi' },
            { label: 'Email',       key: 'email', type: 'email', ph: 'ahmed@example.com' },
            { label: 'Notes',       key: 'notes', type: 'text', ph: 'Met at LEAP 2026 · Strategic intro' },
          ].map(f => (
            <div className="cfp-field" key={f.key}>
              <label className="cfp-label">{f.label}</label>
              <input className="cfp-input" type={f.type} placeholder={f.ph}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="cfp-field">
            <label className="cfp-label">Token Type</label>
            <select className="cfp-input cfp-select" value={form.token_type}
              onChange={e => setForm(f => ({ ...f, token_type: e.target.value }))}>
              <option value="PERMANENT">PERMANENT — Co-Founder (no expiry)</option>
              <option value="STRATEGIC">STRATEGIC — Strategic Partner</option>
              <option value="COFOUNDER">COFOUNDER — Explicit Co-Founder</option>
            </select>
          </div>
          {err && <div className="cfp-err">{err}</div>}
          <button className="cfp-btn" onClick={generate} disabled={generating}>
            {generating ? '⏳ Generating…' : '✦ Generate Co-Founder Token'}
          </button>
        </div>

        {result && (
          <div className="cfp-card cfp-result-card">
            <div className="cfp-card-label">🎉 Token Ready — Share with Co-Founder</div>
            <div className="cfp-result-token">
              <span className="cfp-result-token-val">{result.token}</span>
              <button className="cfp-copy-btn" onClick={() => copy(result.token, 'token')}>
                {copied === 'token' ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="cfp-result-row">
              <span className="cfp-result-label">Portal Link</span>
              <span className="cfp-result-val cfp-result-link">{result.portalLink}</span>
              <button className="cfp-copy-btn cfp-copy-btn--sm" onClick={() => copy(result.portalLink, 'portal')}>
                {copied === 'portal' ? '✅' : '📋'}
              </button>
            </div>
            <div className="cfp-result-row">
              <span className="cfp-result-label">Expires</span>
              <span className="cfp-result-val">{result.expiresAt ?? '∞ Never (Permanent)'}</span>
            </div>
            <div className="cfp-share-block">
              <div className="cfp-share-label">📱 WhatsApp / Message</div>
              <div className="cfp-share-text">
                {`مرحباً،\nدعوة للوصول إلى منصة MomenCrafts:\n\nافتح ${result.portalLink}\nثم أدخل هذا الرمز:\n\n${result.token}\n\nالرمز خاص بك — لا تعِد إرساله.`}
              </div>
              <button className="cfp-copy-btn" onClick={() => copy(
                `مرحباً،\nدعوة للوصول إلى منصة MomenCrafts:\n\nافتح ${result.portalLink}\nثم أدخل هذا الرمز:\n\n${result.token}\n\nالرمز خاص بك — لا تعِد إرساله.`,
                'wa'
              )}>{copied === 'wa' ? '✅ Copied' : '📋 Copy WA Message'}</button>
            </div>
          </div>
        )}
      </div>

      <div className="cfp-list-section">
        <div className="cfp-card-label" style={{ marginBottom: '.75rem' }}>🏅 Active Co-Founders ({tokens.length})</div>
        {loadingList ? <div className="cfp-loading"><div className="a-spinner" /></div> :
          tokens.length === 0 ? <div className="cfp-empty">No co-founder tokens yet — generate the first one above.</div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Token</th><th>Type</th><th>Email</th><th>Notes</th><th>Created</th><th>Status</th></tr></thead>
              <tbody>
                {tokens.map((t: any) => (
                  <tr key={t.id} className="admin-row-cofound">
                    <td style={{ fontWeight: 600, color: 'var(--a-cream)' }}>{t.label}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{t.token}</span>
                      <button className="cfp-copy-btn cfp-copy-btn--sm" style={{ marginLeft: '.4rem' }}
                        onClick={() => copy(t.token, t.id)}>
                        {copied === t.id ? '✅' : '📋'}
                      </button>
                    </td>
                    <td><span className="admin-cofound-badge">✦ {t.token_type}</span></td>
                    <td style={{ fontSize: '.76rem', color: 'var(--a-cream-60)' }}>{t.email ?? <span className="admin-null">—</span>}</td>
                    <td style={{ fontSize: '.76rem', color: 'var(--a-cream-60)' }}>{t.notes ?? <span className="admin-null">—</span>}</td>
                    <td style={{ fontSize: '.72rem', color: 'var(--a-cream-40)' }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                    <td>{t.revoked_at ? <span className="a-badge a-badge--revoked">⊗ Revoked</span> : <span className="a-badge a-badge--active">● Active</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   GENERIC TABLE PANEL (Journal, Downloads, Traction, Board, Registry, Feedback)
   ══════════════════════════════════════════════════════ */
const TABLE_MAP: Record<string, string> = {
  journal: 'co_journal', downloads: 'co_downloads', traction: 'co_traction',
  board: 'co_board', registry: 'co_registry', feedback: 'co_feedback',
}
function GenericPanel({ api, tabKey, title, icon }: { api: ReturnType<typeof makeApi>; tabKey: string; title: string; icon: string }) {
  const [data,    setData]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api('admin-manage-co', { action: 'list', table: TABLE_MAP[tabKey] })
    setData(r?.data || [])
    setLoading(false)
  }, [api, tabKey])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="admin-content-header">
        <h2 className="admin-content-title">{icon} {title}</h2>
        <button className="admin-refresh-btn" onClick={load} disabled={loading}>
          {loading ? <span className="a-spinner" /> : '🔄'} Refresh
        </button>
      </div>
      {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> :
        data.length === 0 ? <div className="admin-empty">No {title.toLowerCase()} data found.</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr>{Object.keys(data[0] || {}).slice(0, 8).map(k => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={row.id || i}>
                  {Object.values(row).slice(0, 8).map((v: any, j: number) => (
                    <td key={j}>
                      {v === null ? <span className="admin-null">—</span> :
                       v === true ? '✅' : v === false ? '❌' :
                       typeof v === 'object' ? JSON.stringify(v).slice(0, 60) :
                       String(v).slice(0, 80)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-footer-info">{data.length} rows · {title}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   TOP STATS BAR
   ══════════════════════════════════════════════════════ */
function TopStatsBar({ api }: { api: ReturnType<typeof makeApi> }) {
  const [stats, setStats] = useState<any>(null)

  const load = useCallback(async () => {
    const r = await api('admin-get-analytics', { period: '7d' })
    setStats(r)
  }, [api])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  const coFounders = (stats?.investors || []).filter((i: any) => COFOUNDER_TYPES.has(i.token_type))

  return (
    <div className="admin-stats-bar">
      <div className="admin-stat-item">
        <span className="admin-stat-icon">✦</span>
        <span className="admin-stat-num">{coFounders.length}</span>
        <span className="admin-stat-lbl">Co-Founders</span>
      </div>
      <div className="admin-stat-item">
        <span className="admin-stat-icon">🔑</span>
        <span className="admin-stat-num">{stats?.investors?.length ?? '—'}</span>
        <span className="admin-stat-lbl">Tokens</span>
      </div>
      <div className="admin-stat-item">
        <span className="admin-stat-icon">👁</span>
        <span className="admin-stat-num">{stats?.sessionsToday?.length ?? '—'}</span>
        <span className="admin-stat-lbl">Today</span>
      </div>
      <div className="admin-stat-item">
        <span className="admin-stat-icon">⚠</span>
        <span className="admin-stat-num" style={{ color: stats?.failedAttempts24h > 5 ? 'var(--a-red)' : 'var(--a-gold)' }}>
          {stats?.failedAttempts24h ?? '—'}
        </span>
        <span className="admin-stat-lbl">Failed 24h</span>
      </div>
      <div className="admin-stat-item">
        <span className="admin-stat-icon">📥</span>
        <span className="admin-stat-num">{stats?.docDownloads ?? '—'}</span>
        <span className="admin-stat-lbl">Downloads</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN SHELL
   ══════════════════════════════════════════════════════ */
type Tab = 'dashboard' | 'cofounders' | 'tokens' | 'sessions'
         | 'xhbprogress' | 'xhbactivity' | 'xhbusers'
         | 'journal' | 'downloads' | 'traction' | 'board' | 'registry' | 'feedback'

const TABS: { key: Tab; label: string; icon: string; section?: string }[] = [
  { key: 'dashboard',  label: 'Dashboard',   icon: '📊', section: 'OVERVIEW' },
  { key: 'cofounders', label: 'Co-Founders', icon: '✦',  section: 'CO-BUILDERS' },
  { key: 'tokens',     label: 'Tokens',      icon: '🔑' },
  { key: 'sessions',   label: 'Sessions',    icon: '🧾' },
  { key: 'xhbprogress', label: 'XHB Progress', icon: '◈', section: 'XHB' },
  { key: 'xhbactivity', label: 'XHB Activity', icon: '🧾' },
  { key: 'xhbusers',    label: 'XHB Users',    icon: '👤' },
  { key: 'journal',    label: 'Journal',     icon: '📓', section: 'DATA' },
  { key: 'traction',   label: 'Traction',    icon: '📈' },
  { key: 'feedback',   label: 'Feedback',    icon: '💬' },
  { key: 'downloads',  label: 'Downloads',   icon: '📥' },
  { key: 'board',      label: 'Board',       icon: '💡' },
  { key: 'registry',   label: 'Registry',    icon: '🏅' },
]

export default function AdminScreen() {
  const [authed,       setAuthed]       = useState(() => sessionStorage.getItem('mcr_admin_auth') === '1')
  const [tab,          setTab]          = useState<Tab>('dashboard')
  const [adminKey,     setAdminKey]     = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [xhbKey,       setXhbKey]       = useState('')          // never persisted — refresh re-prompts

  const api = useCallback(makeApi(adminKey), [adminKey])

  const logout = () => { sessionStorage.removeItem('mcr_admin_auth'); setAuthed(false); setAdminKey('') }

  if (!authed) return <AdminLogin onLogin={(key: string) => { setAdminKey(key); setAuthed(true) }} />

  const renderPanel = () => {
    switch (tab) {
      case 'dashboard':  return <DashboardPanel api={api} />
      case 'cofounders': return <CoFounderPanel api={api} />
      case 'tokens':     return <TokensPanel api={api} />
      case 'sessions':   return <SessionsPanel api={api} />
      case 'xhbprogress':
      case 'xhbactivity':
      case 'xhbusers': {
        if (!xhbKey) return <XhbKeyGate onKey={setXhbKey} />
        const x = makeXhbApi(xhbKey)
        if (tab === 'xhbprogress') return <XhbProgressPanel api={x} />
        if (tab === 'xhbactivity') return <XhbActivityPanel api={x} />
        return <XhbUsersPanel api={x} />
      }
      case 'journal':    return <GenericPanel api={api} tabKey="journal"   title="Journal"   icon="📓" />
      case 'downloads':  return <GenericPanel api={api} tabKey="downloads" title="Downloads" icon="📥" />
      case 'traction':   return <GenericPanel api={api} tabKey="traction"  title="Traction"  icon="📈" />
      case 'board':      return <GenericPanel api={api} tabKey="board"     title="Board"     icon="💡" />
      case 'registry':   return <GenericPanel api={api} tabKey="registry"  title="Registry"  icon="🏅" />
      case 'feedback':   return <GenericPanel api={api} tabKey="feedback"  title="Feedback"  icon="💬" />
    }
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span className="admin-sidebar-logo-mark">✦</span>
          <span className="admin-sidebar-logo-text">MomenCrafts Admin</span>
        </div>
        {TABS.map((t, i) => (
          <>
            {t.section && <div className="admin-sidebar-section" key={`sec-${i}`}>{t.section}</div>}
            <button key={t.key} className={`admin-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              <span className="admin-tab-icon">{t.icon}</span>
              <span className="admin-tab-label">{t.label}</span>
            </button>
          </>
        ))}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-version">MomenCrafts · v2.0</div>
        </div>
      </aside>

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-mark">✦</span>
          <span className="admin-title">MomenCrafts Admin</span>
        </div>
        <TopStatsBar api={api} />
        <div className="admin-header-right">
          {showKeyModal && (
            <div className="admin-key-modal">
              <input type="password" placeholder="New ADMIN_SECRET_KEY"
                className="admin-login-input" defaultValue={adminKey}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setAdminKey((e.target as HTMLInputElement).value)
                    setShowKeyModal(false)
                  }
                }} />
            </div>
          )}
          <button className="admin-key-btn" onClick={() => setShowKeyModal(k => !k)} title="Change API Key">🔑 Key</button>
          <button className="admin-logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Content */}
      <main className="admin-content" key={tab}>
        {renderPanel()}
      </main>
    </div>
  )
}

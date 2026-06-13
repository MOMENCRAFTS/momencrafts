import { useState, useEffect, useCallback } from 'react'
import '@/styles/admin.css'

const ADMIN_PASS = 'Talal202'
const SUPABASE_URL = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'

function getAdminKey() {
  return sessionStorage.getItem('mcr_admin_key') || ''
}

/* ── Admin Login Gate ── */
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem('mcr_admin_auth', '1')
      onLogin()
    } else {
      setErr('Wrong password')
      setTimeout(() => setErr(''), 2000)
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <div className="admin-login-mark">✦</div>
        <h1 className="admin-login-title">& Co Command Center</h1>
        <p className="admin-login-sub">Admin access only</p>
        <input
          type="password"
          className="admin-login-input"
          placeholder="Password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        {err && <div className="admin-login-err">{err}</div>}
        <button className="admin-login-btn" onClick={submit}>Enter →</button>
      </div>
    </div>
  )
}

/* ── Tab types ── */
type Tab = 'tokens' | 'analytics' | 'journal' | 'downloads' | 'traction' | 'board' | 'registry' | 'feedback'

/* ── Main Admin Panel ── */
export default function AdminScreen() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('mcr_admin_auth') === '1')
  const [tab, setTab] = useState<Tab>('tokens')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [adminKey, setAdminKey] = useState(() => getAdminKey())
  const [showKeyModal, setShowKeyModal] = useState(false)

  const logout = () => {
    sessionStorage.removeItem('mcr_admin_auth')
    setAuthed(false)
  }

  // API helper
  const api = useCallback(async (fn: string, body?: object) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (adminKey) headers['X-Admin-Key'] = adminKey
    const res = await fetch(`${SUPABASE_URL}/${fn}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  }, [adminKey])

  // Load tab data
  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true)
    try {
      let result: any
      if (t === 'tokens') {
        result = await api('admin-manage-token', { action: 'list' })
      } else if (t === 'analytics') {
        result = await api('admin-get-analytics', { period: '7d' })
      } else {
        const tableMap: Record<string, string> = {
          journal: 'co_journal', downloads: 'co_downloads', traction: 'co_traction',
          board: 'co_board', registry: 'co_registry', feedback: 'co_feedback',
        }
        result = await api('admin-manage-co', { action: 'list', table: tableMap[t] })
      }
      setData(result?.data || result?.tokens || [])
    } catch (e) {
      console.error('Load error:', e)
      setData([])
    }
    setLoading(false)
  }, [api])

  useEffect(() => {
    if (authed && adminKey) loadTab(tab)
  }, [authed, tab, adminKey, loadTab])

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />

  // If no admin key is set yet
  if (!adminKey) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">
          <div className="admin-login-mark">🔑</div>
          <h1 className="admin-login-title">Supabase Admin Key</h1>
          <p className="admin-login-sub">Enter your ADMIN_SECRET_KEY to connect to Supabase</p>
          <input
            type="password"
            className="admin-login-input"
            placeholder="ADMIN_SECRET_KEY"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value
                sessionStorage.setItem('mcr_admin_key', val)
                setAdminKey(val)
              }
            }}
            autoFocus
          />
          <button className="admin-login-btn" onClick={() => {
            const el = document.querySelector<HTMLInputElement>('.admin-login-input')
            if (el?.value) {
              sessionStorage.setItem('mcr_admin_key', el.value)
              setAdminKey(el.value)
            }
          }}>Connect →</button>
        </div>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'tokens', label: 'Tokens', icon: '🔑' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'journal', label: 'Journal', icon: '📓' },
    { key: 'downloads', label: 'Downloads', icon: '📥' },
    { key: 'traction', label: 'Traction', icon: '📈' },
    { key: 'board', label: 'Board', icon: '💡' },
    { key: 'registry', label: 'Registry', icon: '🏅' },
    { key: 'feedback', label: 'Feedback', icon: '💬' },
  ]

  return (
    <div className="admin-shell">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-mark">✦</span>
          <span className="admin-title">& Co Command Center</span>
        </div>
        <div className="admin-header-right">
          <button className="admin-key-btn" onClick={() => setShowKeyModal(!showKeyModal)} title="Change API Key">🔑</button>
          <button className="admin-logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Key change modal */}
      {showKeyModal && (
        <div className="admin-key-modal">
          <input
            type="password"
            placeholder="New ADMIN_SECRET_KEY"
            className="admin-login-input"
            defaultValue={adminKey}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                sessionStorage.setItem('mcr_admin_key', (e.target as HTMLInputElement).value)
                setAdminKey((e.target as HTMLInputElement).value)
                setShowKeyModal(false)
              }
            }}
          />
        </div>
      )}

      {/* Sidebar */}
      <div className="admin-body">
        <nav className="admin-sidebar">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`admin-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="admin-tab-icon">{t.icon}</span>
              <span className="admin-tab-label">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="admin-content">
          <div className="admin-content-header">
            <h2 className="admin-content-title">{TABS.find(t => t.key === tab)?.icon} {TABS.find(t => t.key === tab)?.label}</h2>
            <button className="admin-refresh-btn" onClick={() => loadTab(tab)} disabled={loading}>
              {loading ? '⏳' : '🔄'} Refresh
            </button>
          </div>

          {loading ? (
            <div className="admin-loading">Loading…</div>
          ) : data.length === 0 ? (
            <div className="admin-empty">No data found. Make sure your ADMIN_SECRET_KEY is correct.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {Object.keys(data[0] || {}).slice(0, 8).map(k => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row: any, i: number) => (
                    <tr key={row.id || i}>
                      {Object.values(row).slice(0, 8).map((v: any, j: number) => (
                        <td key={j}>
                          {v === null ? <span className="admin-null">null</span> :
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

          <div className="admin-footer-info">
            {data.length} rows · Tab: {tab} · Connected to Supabase
          </div>
        </main>
      </div>
    </div>
  )
}

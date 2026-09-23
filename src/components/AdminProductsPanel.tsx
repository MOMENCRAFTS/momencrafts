/**
 * AdminProductsPanel — the Fresh Start Console (Phase 4)
 * Plan: docs/plan/2026-09-23-fresh-start-console.md §5 Phase 4
 *
 * One card per product with its live counts. "Fresh start" walks the owner through the same five
 * steps the cleaner does by hand: look → say what goes and what stays → confirm (type the app id and
 * the code) → delete → show the after-counts. Every step is decided and recorded server-side
 * (admin-products → the app's own admin-fresh-start); this screen only shows and asks.
 */
import { useCallback, useEffect, useState } from 'react'

type Api = (fn: string, body?: object) => Promise<any>

interface Card {
  id: string
  name: string
  package?: string
  status: 'ok' | 'refused' | 'unreachable' | 'not_configured' | 'error'
  counts?: Record<string, unknown>
  guard?: { refused: boolean; reasons: string[] }
  error?: string
}

interface Preview {
  counts: Record<string, unknown>
  keep: Record<string, unknown>
  guard: { refused: boolean; reasons: string[] }
  confirm_code: string | null
  expires_at: string | null
}

interface Result {
  run_id?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  check_row?: Record<string, string>
  storage_deleted?: Record<string, number>
  storage_errors?: string[]
}

/** Count keys that describe what STAYS (shown with a "stays" badge in the preview). */
const STAY_KEYS = new Set([
  'logins_operators', 'logins_admins', 'operators', 'users_admin', 'feature_flags', 'barakah_content',
  'lounge_tracks_global', 'audit_logs', 'exercises', 'food_items', 'supplement_items', 'plan_templates',
])

const ERROR_TEXT: Record<string, string> = {
  code_required: 'Enter the confirmation code.',
  code_invalid: 'That code is not valid. Preview again to get a fresh one.',
  code_used: 'That code was already used. Preview again.',
  code_expired: 'The code expired (10 minutes). Preview again.',
  data_changed: 'The data changed since the preview. Preview again and check the numbers.',
  refused: 'Refused: this database looks like it holds real users. The button will not do this; use the script path.',
  rate_limited: 'A fresh start ran less than 10 minutes ago. Wait, then preview again.',
  wipe_failed: 'The wipe failed inside the database and was rolled back. Nothing changed.',
  typed_name_mismatch: 'Type the product id exactly as shown.',
  owner_role_required: 'Only an owner can run a fresh start.',
  not_configured: 'The secret for this product is not set on the hub yet.',
  unreachable: 'The product did not answer.',
  timeout: 'The product took too long to answer.',
}

const fmt = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—'))
const label = (k: string) => k.replace(/_/g, ' ')

export function AdminProductsPanel({ api, canExecute = true, only }: { api: Api; canExecute?: boolean; only?: string }) {
  const [cards, setCards]       = useState<Card[]>([])
  const [loading, setLoading]   = useState(true)
  const [history, setHistory]   = useState<any[]>([])
  const [selected, setSelected] = useState<Card | null>(null)
  const [preview, setPreview]   = useState<Preview | null>(null)
  const [typed, setTyped]       = useState('')
  const [code, setCode]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')
  const [result, setResult]     = useState<Result | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [l, h] = await Promise.all([
      api('admin-products', { action: 'list' }),
      api('admin-products', { action: 'history' }),
    ])
    const apps: Card[] = Array.isArray(l?.apps) ? l.apps : []
    setCards(only ? apps.filter(a => a.id === only) : apps)
    const rows: any[] = Array.isArray(h?.rows) ? h.rows : []
    setHistory((only ? rows.filter(r => r.app_id === only) : rows).filter(r => String(r.action).includes('fresh_start')))
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  const reset = () => { setSelected(null); setPreview(null); setTyped(''); setCode(''); setErr(''); setResult(null) }

  const startPreview = async (card: Card) => {
    reset(); setSelected(card); setBusy(true)
    const r = await api('admin-products', { action: 'call', product: card.id, std: 'fresh_start.preview' })
    setBusy(false)
    if (!r?.ok) { setErr(ERROR_TEXT[r?.error] ?? r?.error ?? 'Preview failed'); return }
    setPreview(r as Preview)
  }

  const execute = async () => {
    if (!selected || !preview) return
    if (typed.trim() !== selected.id) { setErr(ERROR_TEXT.typed_name_mismatch); return }
    if (code.trim().toUpperCase() !== (preview.confirm_code ?? '')) { setErr('The code does not match the one shown above.'); return }
    if (!confirm(`Fresh start on ${selected.name}. This cannot be undone. Continue?`)) return
    setBusy(true); setErr('')
    const r = await api('admin-products', {
      action: 'call', product: selected.id, std: 'fresh_start.execute',
      payload: { confirm_code: code.trim().toUpperCase(), typed_name: typed.trim() },
    })
    setBusy(false)
    if (!r?.ok) {
      const reasons = Array.isArray(r?.guard?.reasons) ? ` (${r.guard.reasons.join('; ')})` : ''
      setErr((ERROR_TEXT[r?.error] ?? r?.error ?? 'Execute failed') + reasons)
      return
    }
    setResult(r as Result)
    load()
  }

  if (loading) return <div className="admin-loading"><div className="a-spinner" /> Loading products…</div>

  const pill = (c: Card) => {
    const map: Record<Card['status'], [string, string]> = {
      ok: ['fs-pill--ok', 'ready'],
      refused: ['fs-pill--refused', 'refuses: looks like real users'],
      unreachable: ['fs-pill--down', 'unreachable'],
      not_configured: ['fs-pill--down', 'secret not set'],
      error: ['fs-pill--down', c.error || 'error'],
    }
    const [cls, text] = map[c.status] ?? map.error
    return <span className={`fs-pill ${cls}`}>{text}</span>
  }

  const countKeys = (o?: Record<string, unknown>) => Object.keys(o ?? {}).filter(k => k !== 'storage_files')

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🧹 Fresh Start</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>
      <p className="fs-intro">
        Each card is a product with its live test-account counts. A fresh start deletes the test accounts and
        everything they own, inside that product's own database, and keeps staff accounts, content and settings.
        Two steps, always: preview, then confirm with the code. Every run is recorded in History.
      </p>

      {/* Cards */}
      <div className="fs-cards">
        {cards.map(c => (
          <div key={c.id} className={`a-card fs-card${selected?.id === c.id ? ' fs-card--selected' : ''}`}>
            <div className="fs-card-head">
              <div>
                <div className="a-card-title">{c.name}</div>
                <div className="a-card-sub fs-mono">{c.id}</div>
              </div>
              {pill(c)}
            </div>
            {c.counts ? (
              <div className="fs-card-counts">
                <div className="fs-big">{fmt(c.counts.logins_to_delete)}</div>
                <div className="a-kpi-label">test logins</div>
                <div className="a-kpi-sub">
                  {fmt(c.counts.logins_operators ?? c.counts.logins_admins ?? 0)} staff login(s) kept
                  {'users' in c.counts ? ` · ${fmt(c.counts.users)} profiles` : ''}
                  {'family_groups' in c.counts ? ` · ${fmt(c.counts.family_groups)} families` : ''}
                  {'users_coach' in c.counts ? ` · ${fmt(c.counts.users_coach)} coaches · ${fmt(c.counts.users_client)} clients` : ''}
                </div>
              </div>
            ) : (
              <div className="a-kpi-sub">{ERROR_TEXT[c.error ?? ''] ?? c.error ?? 'No data'}</div>
            )}
            {c.guard?.refused && <div className="a-error fs-reasons">{c.guard.reasons.join(' · ')}</div>}
            {canExecute && (
              <button className="a-btn a-btn--danger" disabled={busy || c.status !== 'ok'} onClick={() => startPreview(c)}>
                Fresh start…
              </button>
            )}
          </div>
        ))}
        {cards.length === 0 && <div className="admin-empty">No products registered.</div>}
      </div>

      {/* Step 1: preview */}
      {selected && preview && !result && (
        <div className="a-card fs-panel">
          <div className="fs-panel-head">
            <h3 className="fs-panel-title">Step 1 · What a fresh start on {selected.name} would do</h3>
            <button className="a-btn a-btn--ghost a-btn--sm" onClick={reset}>Cancel</button>
          </div>
          <div className="fs-columns">
            <div>
              <div className="a-label">Counts now</div>
              <table className="admin-table fs-table">
                <tbody>
                  {countKeys(preview.counts).map(k => (
                    <tr key={k}>
                      <td>{label(k)}</td>
                      <td className="fs-mono">{fmt(preview.counts[k])}</td>
                      <td>{STAY_KEYS.has(k) ? <span className="fs-stays">stays</span> : <span className="fs-goes">deleted</span>}</td>
                    </tr>
                  ))}
                  {'storage_files' in preview.counts && (
                    <tr><td>files per bucket</td><td className="fs-mono" colSpan={2}>{fmt(preview.counts.storage_files)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <div className="a-label">Kept, whatever happens</div>
              <table className="admin-table fs-table">
                <tbody>
                  {Object.entries(preview.keep).map(([k, v]) => (
                    <tr key={k}><td>{label(k)}</td><td className="fs-mono">{fmt(v)}</td></tr>
                  ))}
                </tbody>
              </table>
              {preview.guard?.refused && (
                <div className="a-error" style={{ marginTop: '1rem' }}>
                  Refused: {preview.guard.reasons.join('; ')}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: confirm */}
          {preview.confirm_code && (
            <div className="fs-confirm">
              <h3 className="fs-panel-title">Step 2 · Confirm</h3>
              <p className="fs-hint">
                Code <span className="fs-code">{preview.confirm_code}</span> — valid for 10 minutes, once.
                Type the product id and the code to run the fresh start. It cannot be undone.
              </p>
              <div className="fs-confirm-row">
                <input className="a-input" placeholder={`type: ${selected.id}`} value={typed} onChange={e => setTyped(e.target.value)} />
                <input className="a-input fs-mono" placeholder="code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8} />
                <button className="a-btn a-btn--danger" disabled={busy || typed.trim() !== selected.id || code.trim().length !== 8} onClick={execute}>
                  {busy ? 'Running…' : `Run fresh start on ${selected.name}`}
                </button>
              </div>
            </div>
          )}
          {err && <div className="a-error" style={{ marginTop: '1rem' }}>{err}</div>}
        </div>
      )}
      {selected && !preview && (busy || err) && (
        <div className="a-card fs-panel">
          {busy ? <div className="admin-loading"><div className="a-spinner" /> Asking {selected.name}…</div> : <div className="a-error">{err}</div>}
          {!busy && <button className="a-btn a-btn--ghost a-btn--sm" style={{ marginTop: '.75rem' }} onClick={reset}>Close</button>}
        </div>
      )}

      {/* Step 3: result */}
      {selected && result && (
        <div className="a-card fs-panel">
          <div className="fs-panel-head">
            <h3 className="fs-panel-title">Done · {selected.name} is at a fresh start</h3>
            <button className="a-btn a-btn--ghost a-btn--sm" onClick={reset}>Close</button>
          </div>
          <table className="admin-table fs-table">
            <thead><tr><th>what</th><th>before</th><th>after</th></tr></thead>
            <tbody>
              {countKeys(result.before).map(k => (
                <tr key={k}>
                  <td>{label(k)}</td>
                  <td className="fs-mono">{fmt(result.before?.[k])}</td>
                  <td className="fs-mono">{fmt(result.after?.[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.check_row && (
            <div className="fs-hint" style={{ marginTop: '.75rem' }}>
              {Object.entries(result.check_row).map(([k, v]) => <div key={k}><b>{label(k)}:</b> <span className="fs-mono">{v}</span></div>)}
            </div>
          )}
          <div className="fs-hint">
            Files removed: <span className="fs-mono">{fmt(result.storage_deleted ?? {})}</span>
            {result.storage_errors && result.storage_errors.length > 0 && (
              <div className="a-error">Storage errors: {result.storage_errors.join('; ')}</div>
            )}
          </div>
          {selected.package && (
            <div className="fs-hint">
              Test phone still signed in? Clear the app: <span className="fs-code">adb shell pm clear {selected.package}</span>
            </div>
          )}
          <div className="fs-hint">Record saved: run <span className="fs-mono">{result.run_id}</span> in the product, plus the History row below.</div>
        </div>
      )}

      {/* History */}
      <div className="a-card fs-panel">
        <h3 className="fs-panel-title">History</h3>
        {history.length === 0 ? <div className="admin-empty">No fresh-start activity yet.</div> : (
          <div className="admin-table-wrap">
            <table className="admin-table fs-table">
              <thead><tr><th>when</th><th>who</th><th>action</th><th>product</th><th>outcome</th></tr></thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id}>
                    <td className="fs-mono">{new Date(h.at).toLocaleString()}</td>
                    <td>{h.actor_email ?? '—'}</td>
                    <td className="fs-mono">{String(h.action).replace('admin-products.', '')}</td>
                    <td>{h.app_id ?? '—'}</td>
                    <td><span className={`fs-pill ${h.outcome === 'ok' ? 'fs-pill--ok' : h.outcome === 'denied' ? 'fs-pill--refused' : 'fs-pill--down'}`}>{h.outcome}{h.details?.status ? ` · ${h.details.status}` : ''}</span></td>
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

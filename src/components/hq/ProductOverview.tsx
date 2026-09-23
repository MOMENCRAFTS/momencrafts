/**
 * ProductOverview — one product's health in detail: every count, the guard, the door to its console.
 */
import { useCallback, useEffect, useState } from 'react'
import { type Api, type Product, type HistoryRow, hqCall, hqHistory, fmt, label, errText, STAY_KEYS } from './hqApi'
import { StatusPill, OutcomePill } from './HqDashboard'

export function ProductOverview({ api, product, onOpen }: { api: Api; product: Product; onOpen: (screen: string) => void }) {
  const [status, setStatus]   = useState<any>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const [s, h] = await Promise.all([hqCall(api, product.id, 'status'), hqHistory(api, product.id)])
    if (!s?.ok) setErr(errText(s, 'Status unavailable'))
    setStatus(s?.ok ? s : null)
    setHistory(Array.isArray(h?.rows) ? h.rows.slice(0, 10) : [])
    setLoading(false)
  }, [api, product.id])

  useEffect(() => { load() }, [load])

  const counts: Record<string, unknown> = status?.counts ?? {}
  const keys = Object.keys(counts).filter(k => k !== 'storage_files')
  const pill = status ? (status.guard?.refused ? 'refused' : 'ok') : 'error'

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">{product.icon} {product.name}</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>

      <div className="hq-toolbar">
        <StatusPill status={pill as any} error={err} />
        {product.capabilities.includes('users') && <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => onOpen('accounts')}>Accounts</button>}
        {product.capabilities.includes('flags') && <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => onOpen('flags')}>Flags</button>}
        {product.capabilities.includes('fresh_start') && <button className="a-btn a-btn--danger a-btn--sm" onClick={() => onOpen('fresh_start')}>Fresh start…</button>}
        {product.consoleUrl
          ? <a className="a-btn a-btn--gold a-btn--sm" href={product.consoleUrl} target="_blank" rel="noreferrer">Open console ↗</a>
          : <span className="fs-hint">No console site yet for this product.</span>}
      </div>
      {product.note && <p className="fs-hint">{product.note}</p>}

      {loading ? <div className="admin-loading"><div className="a-spinner" /> Asking {product.name}…</div> : (
        <div className="fs-columns">
          <div className="a-card fs-panel">
            <h3 className="fs-panel-title">Live counts</h3>
            {err && <div className="a-error">{err}</div>}
            {keys.length > 0 && (
              <table className="admin-table fs-table">
                <tbody>
                  {keys.map(k => (
                    <tr key={k}>
                      <td>{label(k)}</td>
                      <td className="fs-mono">{fmt(counts[k])}</td>
                      <td>{STAY_KEYS.has(k) ? <span className="fs-stays">kept on fresh start</span> : null}</td>
                    </tr>
                  ))}
                  {'storage_files' in counts && (
                    <tr><td>files per bucket</td><td className="fs-mono" colSpan={2}>{fmt(counts.storage_files)}</td></tr>
                  )}
                </tbody>
              </table>
            )}
            {status?.guard?.refused && <div className="a-error" style={{ marginTop: '.75rem' }}>Guard: {status.guard.reasons.join('; ')}</div>}
          </div>
          <div className="a-card fs-panel">
            <h3 className="fs-panel-title">Recent HQ activity on {product.name}</h3>
            {history.length === 0 ? <div className="admin-empty">Nothing yet.</div> : (
              <table className="admin-table fs-table">
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td className="fs-mono">{new Date(r.at).toLocaleString()}</td>
                      <td className="fs-mono">{r.action.replace('admin-products.', '')}</td>
                      <td><OutcomePill outcome={r.outcome} status={r.details?.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

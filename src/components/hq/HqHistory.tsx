/**
 * HqHistory — everything HQ did, from admin_audit_log, filterable by product.
 */
import { useCallback, useEffect, useState } from 'react'
import { type Api, type Product, type HistoryRow, hqHistory, fmt } from './hqApi'
import { OutcomePill } from './HqDashboard'

export function HqHistory({ api, products }: { api: Api; products: Product[] }) {
  const [rows, setRows]       = useState<HistoryRow[]>([])
  const [filter, setFilter]   = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await hqHistory(api, filter || undefined)
    setRows(Array.isArray(r?.rows) ? r.rows : [])
    setLoading(false)
  }, [api, filter])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🧾 HQ History</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>
      <div className="hq-toolbar">
        <select className="a-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="a-card fs-panel">
        {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> : rows.length === 0 ? <div className="admin-empty">Nothing yet.</div> : (
          <div className="admin-table-wrap">
            <table className="admin-table fs-table">
              <thead><tr><th>when</th><th>who</th><th>action</th><th>product</th><th>outcome</th><th></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <>
                    <tr key={r.id}>
                      <td className="fs-mono">{new Date(r.at).toLocaleString()}</td>
                      <td>{r.actor_email ?? '—'}</td>
                      <td className="fs-mono">{r.action.replace('admin-products.', '')}</td>
                      <td>{r.app_id ?? '—'}</td>
                      <td><OutcomePill outcome={r.outcome} status={r.details?.status} /></td>
                      <td><button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'hide' : 'details'}</button></td>
                    </tr>
                    {open === r.id && (
                      <tr key={`${r.id}-d`}><td colSpan={6}><pre className="hq-pre">{fmt(r.details ?? {})}</pre></td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

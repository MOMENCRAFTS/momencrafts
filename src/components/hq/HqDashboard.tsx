/**
 * HqDashboard — one health card per product, plus the latest HQ activity.
 * Plan: docs/plan/2026-09-23-momencrafts-hq.md §5 Phase A
 */
import { useCallback, useEffect, useState } from 'react'
import { type Api, type HealthCard, type HistoryRow, hqList, hqHistory, fmt, ERROR_TEXT } from './hqApi'

export function StatusPill({ status, error }: { status: HealthCard['status']; error?: string }) {
  const map: Record<HealthCard['status'], [string, string]> = {
    ok: ['fs-pill--ok', 'healthy'],
    refused: ['fs-pill--refused', 'holds real users'],
    unreachable: ['fs-pill--down', 'unreachable'],
    not_configured: ['fs-pill--down', 'secret not set'],
    error: ['fs-pill--down', ERROR_TEXT[error ?? ''] ?? error ?? 'error'],
  }
  const [cls, text] = map[status] ?? map.error
  return <span className={`fs-pill ${cls}`}>{text}</span>
}

export function OutcomePill({ outcome, status }: { outcome: string; status?: unknown }) {
  const cls = outcome === 'ok' ? 'fs-pill--ok' : outcome === 'denied' ? 'fs-pill--refused' : 'fs-pill--down'
  return <span className={`fs-pill ${cls}`}>{outcome}{status ? ` · ${String(status)}` : ''}</span>
}

export function headline(c: HealthCard): { big: string; small: string } {
  const k = c.counts ?? {}
  const big = fmt(k.logins_to_delete ?? k.logins_total ?? '—')
  const parts: string[] = []
  if (k.logins_operators !== undefined) parts.push(`${fmt(k.logins_operators)} operator login(s) kept`)
  if (k.logins_admins !== undefined) parts.push(`${fmt(k.logins_admins)} admin login(s) kept`)
  if (k.users !== undefined) parts.push(`${fmt(k.users)} profiles`)
  if (k.family_groups !== undefined) parts.push(`${fmt(k.family_groups)} families`)
  if (k.users_coach !== undefined) parts.push(`${fmt(k.users_coach)} coaches · ${fmt(k.users_client)} clients`)
  return { big, small: parts.join(' · ') }
}

export function HqDashboard({ api, onOpenProduct }: { api: Api; onOpenProduct: (id: string, screen: string) => void }) {
  const [cards, setCards]     = useState<HealthCard[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [l, h] = await Promise.all([hqList(api), hqHistory(api)])
    setCards(Array.isArray(l?.apps) ? l.apps : [])
    setHistory(Array.isArray(h?.rows) ? h.rows.slice(0, 8) : [])
    setLoading(false)
  }, [api])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="admin-loading"><div className="a-spinner" /> Checking every product…</div>

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">🏛 MomenCrafts HQ</h2>
        <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>
      </div>
      <p className="fs-intro">
        One door for every product. Each card is a product's live health, read from that product's own
        database a moment ago. Open a product for its accounts, flags and fresh start; anything that
        changes data is two steps and lands in History.
      </p>

      <div className="fs-cards">
        {cards.map(c => {
          const h = headline(c)
          return (
            <div key={c.id} className="a-card fs-card">
              <div className="fs-card-head">
                <div>
                  <div className="a-card-title">{c.icon} {c.name}</div>
                  <div className="a-card-sub fs-mono">{c.id}{c.version ? ` · ${c.version}` : ''}</div>
                </div>
                <StatusPill status={c.status} error={c.error} />
              </div>
              {c.counts ? (
                <div className="fs-card-counts">
                  <div className="fs-big">{h.big}</div>
                  <div className="a-kpi-label">test logins</div>
                  <div className="a-kpi-sub">{h.small}</div>
                </div>
              ) : <div className="a-kpi-sub">{ERROR_TEXT[c.error ?? ''] ?? c.error ?? 'No data'}</div>}
              {c.guard?.refused && <div className="a-error fs-reasons">{c.guard.reasons.join(' · ')}</div>}
              <div className="hq-card-actions">
                <button className="a-btn a-btn--gold a-btn--sm" onClick={() => onOpenProduct(c.id, 'overview')}>Open</button>
                {c.capabilities.includes('fresh_start') && (
                  <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => onOpenProduct(c.id, 'fresh_start')}>Fresh start</button>
                )}
                {c.consoleUrl && (
                  <a className="a-btn a-btn--ghost a-btn--sm" href={c.consoleUrl} target="_blank" rel="noreferrer">Console ↗</a>
                )}
              </div>
            </div>
          )
        })}
        {cards.length === 0 && <div className="admin-empty">No products registered.</div>}
      </div>

      <div className="a-card fs-panel">
        <h3 className="fs-panel-title">Latest activity</h3>
        {history.length === 0 ? <div className="admin-empty">Nothing yet.</div> : (
          <table className="admin-table fs-table">
            <tbody>
              {history.map(r => (
                <tr key={r.id}>
                  <td className="fs-mono">{new Date(r.at).toLocaleString()}</td>
                  <td>{r.actor_email ?? '—'}</td>
                  <td className="fs-mono">{r.action.replace('admin-products.', '')}</td>
                  <td>{r.app_id ?? '—'}</td>
                  <td><OutcomePill outcome={r.outcome} status={r.details?.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

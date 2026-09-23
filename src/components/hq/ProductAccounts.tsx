/**
 * ProductAccounts — look up an account (masked), see what it owns, delete it in two steps.
 * Bound to the standard actions users.list / users.detail / users.delete_preview / users.delete_execute.
 * Shows a plain notice for products whose admin-console does not support them yet.
 */
import { useCallback, useEffect, useState } from 'react'
import { type Api, type Product, hqCall, fmt, label, errText } from './hqApi'

interface UserRow { id: string; masked: string; role?: string; group?: string | null; created_at?: string; last_active?: string | null }

export function ProductAccounts({ api, product, canExecute }: { api: Api; product: Product; canExecute: boolean }) {
  const supported = product.capabilities.includes('users')
  const [q, setQ]             = useState('')
  const [rows, setRows]       = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [sel, setSel]         = useState<UserRow | null>(null)
  const [detail, setDetail]   = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)
  const [typed, setTyped]     = useState('')
  const [code, setCode]       = useState('')
  const [ack, setAck]         = useState<string[]>([])
  const [result, setResult]   = useState<any>(null)
  const [busy, setBusy]       = useState(false)

  const search = useCallback(async () => {
    if (!supported) return
    setLoading(true); setErr('')
    const r = await hqCall(api, product.id, 'users.list', { q, limit: 50 })
    if (!r?.ok) setErr(errText(r, 'Search failed'))
    setRows(Array.isArray(r?.users) ? r.users : [])
    setLoading(false)
  }, [api, product.id, q, supported])

  useEffect(() => { search() }, [search])

  const open = async (u: UserRow) => {
    setSel(u); setDetail(null); setPreview(null); setResult(null); setTyped(''); setCode(''); setAck([]); setErr('')
    const r = await hqCall(api, product.id, 'users.detail', { id: u.id })
    if (!r?.ok) { setErr(errText(r, 'Detail failed')); return }
    setDetail(r)
  }

  const startDelete = async () => {
    if (!sel) return
    setBusy(true); setErr('')
    const r = await hqCall(api, product.id, 'users.delete_preview', { id: sel.id })
    setBusy(false)
    if (!r?.ok) { setErr(errText(r, 'Preview failed')); return }
    setPreview(r)
  }

  const execute = async () => {
    if (!sel || !preview) return
    if (typed.trim() !== product.id) { setErr('Type the product id exactly as shown.'); return }
    if (!confirm(`Delete this account from ${product.name}. This cannot be undone. Continue?`)) return
    setBusy(true); setErr('')
    const r = await hqCall(api, product.id, 'users.delete_execute', {
      id: sel.id, confirm_code: code.trim().toUpperCase(), typed_name: typed.trim(), acknowledge: ack,
    })
    setBusy(false)
    if (!r?.ok) { setErr(errText(r, 'Delete failed')); return }
    setResult(r); search()
  }

  if (!supported) {
    return (
      <div style={{ animation: 'a-fade-in .3s ease' }}>
        <div className="admin-content-header"><h2 className="admin-content-title">{product.icon} {product.name} · Accounts</h2></div>
        <div className="a-card fs-panel">
          <p className="fs-hint">
            {product.name} does not expose accounts to HQ yet. That arrives with its standard admin API
            (plan: MomenCrafts HQ, Phase B). Until then, use its own console.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">{product.icon} {product.name} · Accounts</h2>
        <button className="admin-refresh-btn" onClick={search}>🔄 Refresh</button>
      </div>
      <div className="hq-toolbar">
        <input className="a-input" placeholder="Search: last digits of a phone, part of a name…" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <button className="a-btn a-btn--gold a-btn--sm" onClick={search}>Search</button>
      </div>
      {err && <div className="a-error" style={{ marginBottom: '1rem' }}>{err}</div>}

      <div className="fs-columns">
        <div className="a-card fs-panel">
          <h3 className="fs-panel-title">Accounts {loading ? '…' : `(${rows.length})`}</h3>
          {rows.length === 0 && !loading ? <div className="admin-empty">No accounts match.</div> : (
            <div className="admin-table-wrap">
              <table className="admin-table fs-table">
                <thead><tr><th>account</th><th>role</th><th>group</th><th>created</th><th>last active</th></tr></thead>
                <tbody>
                  {rows.map(u => (
                    <tr key={u.id} className={sel?.id === u.id ? 'hq-row--selected' : ''} onClick={() => open(u)} style={{ cursor: 'pointer' }}>
                      <td className="fs-mono">{u.masked}</td>
                      <td>{u.role ?? '—'}</td>
                      <td>{u.group ?? '—'}</td>
                      <td className="fs-mono">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td className="fs-mono">{u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="a-card fs-panel">
          {!sel ? <div className="admin-empty">Pick an account to see what it owns.</div> : (
            <>
              <h3 className="fs-panel-title">{sel.masked}</h3>
              {!detail ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> : (
                <>
                  <table className="admin-table fs-table">
                    <tbody>
                      {Object.entries(detail.owned ?? {}).map(([k, v]) => (
                        <tr key={k}><td>{label(k)}</td><td className="fs-mono">{fmt(v)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  {Array.isArray(detail.warnings) && detail.warnings.length > 0 && (
                    <div className="a-error" style={{ marginTop: '.75rem' }}>{detail.warnings.join(' · ')}</div>
                  )}
                  {canExecute && !preview && !result && (
                    <button className="a-btn a-btn--danger" style={{ marginTop: '1rem' }} disabled={busy} onClick={startDelete}>Delete this account…</button>
                  )}
                  {preview && !result && (
                    <div className="fs-confirm">
                      <h3 className="fs-panel-title">Confirm the delete</h3>
                      {Array.isArray(preview.warnings) && preview.warnings.length > 0 && (
                        <div className="fs-hint">
                          The product warns:
                          {preview.warnings.map((w: string) => (
                            <label key={w} style={{ display: 'block' }}>
                              <input type="checkbox" checked={ack.includes(w)} onChange={e => setAck(a => e.target.checked ? [...a, w] : a.filter(x => x !== w))} /> {w} — I understand
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="fs-hint">
                        Code <span className="fs-code">{preview.confirm_code}</span> — valid 10 minutes, once. Type the product id and the code.
                      </p>
                      <div className="fs-confirm-row">
                        <input className="a-input" placeholder={`type: ${product.id}`} value={typed} onChange={e => setTyped(e.target.value)} />
                        <input className="a-input fs-mono" placeholder="code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={12} />
                        <button className="a-btn a-btn--danger" disabled={busy || typed.trim() !== product.id || !code.trim()} onClick={execute}>
                          {busy ? 'Deleting…' : 'Delete permanently'}
                        </button>
                      </div>
                    </div>
                  )}
                  {result && (
                    <div className="fs-hint" style={{ marginTop: '1rem' }}>
                      <b>Deleted.</b> {fmt(result.deleted ?? {})}
                      {result.storage_deleted && <div>Files removed: <span className="fs-mono">{fmt(result.storage_deleted)}</span></div>}
                      {result.run_id && <div>Run <span className="fs-mono">{result.run_id}</span> recorded in the product and in History.</div>}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

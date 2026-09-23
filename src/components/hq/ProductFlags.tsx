/**
 * ProductFlags — a product's feature flags / settings, read and set through the standard API.
 */
import { useCallback, useEffect, useState } from 'react'
import { type Api, type Product, hqCall, fmt, errText } from './hqApi'

interface Flag { key: string; value: unknown; description?: string | null; updated_at?: string | null }

export function ProductFlags({ api, product, canExecute }: { api: Api; product: Product; canExecute: boolean }) {
  const supported = product.capabilities.includes('flags')
  const [flags, setFlags]     = useState<Flag[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [busy, setBusy]       = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supported) return
    setLoading(true); setErr('')
    const r = await hqCall(api, product.id, 'flags.list')
    if (!r?.ok) setErr(errText(r, 'Could not load flags'))
    setFlags(Array.isArray(r?.flags) ? r.flags : [])
    setLoading(false)
  }, [api, product.id, supported])

  useEffect(() => { load() }, [load])

  const set = async (f: Flag, value: unknown) => {
    if (!confirm(`Set "${f.key}" to ${fmt(value)} on ${product.name}?`)) return
    setBusy(f.key); setErr('')
    const r = await hqCall(api, product.id, 'flags.set', { key: f.key, value })
    setBusy(null)
    if (!r?.ok) { setErr(errText(r, 'Could not set the flag')); return }
    load()
  }

  return (
    <div style={{ animation: 'a-fade-in .3s ease' }}>
      <div className="admin-content-header">
        <h2 className="admin-content-title">{product.icon} {product.name} · Flags</h2>
        {supported && <button className="admin-refresh-btn" onClick={load}>🔄 Refresh</button>}
      </div>
      {!supported ? (
        <div className="a-card fs-panel">
          <p className="fs-hint">{product.name} does not expose its flags to HQ yet (plan: MomenCrafts HQ, Phase B).</p>
        </div>
      ) : (
        <div className="a-card fs-panel">
          {err && <div className="a-error" style={{ marginBottom: '.75rem' }}>{err}</div>}
          {loading ? <div className="admin-loading"><div className="a-spinner" /> Loading…</div> : flags.length === 0 ? <div className="admin-empty">No flags.</div> : (
            <table className="admin-table fs-table">
              <thead><tr><th>flag</th><th>value</th><th>updated</th><th></th></tr></thead>
              <tbody>
                {flags.map(f => (
                  <tr key={f.key}>
                    <td><span className="fs-mono">{f.key}</span>{f.description && <div className="a-kpi-sub">{f.description}</div>}</td>
                    <td className="fs-mono">{fmt(f.value)}</td>
                    <td className="fs-mono">{f.updated_at ? new Date(f.updated_at).toLocaleString() : '—'}</td>
                    <td>
                      {canExecute && typeof f.value === 'boolean' && (
                        <button className="a-btn a-btn--ghost a-btn--sm" disabled={busy === f.key} onClick={() => set(f, !f.value)}>
                          {f.value ? 'Turn off' : 'Turn on'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

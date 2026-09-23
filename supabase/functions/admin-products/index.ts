// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS HQ — admin-products: the hub
// Plan: docs/plan/2026-09-23-momencrafts-hq.md §3 Layer 1, §6 (grew out of the Fresh Start Console)
//
// The admin asks; each product decides and acts inside its own project. This hub only:
//   1. identifies the admin (Google + authenticator session on the allowlist — _shared/adminAuth.ts),
//   2. checks the role (owner for anything that changes something) and the product's capabilities,
//   3. forwards to the product's own function with that product's key (one Supabase secret per
//      product; the browser never sees any key),
//   4. writes the audit row with the real outcome (withAudit).
//
//   { action: 'whoami' }                                   → { email, role }
//   { action: 'registry' }                                 → the product registry (no secrets)
//   { action: 'list' }                                     → health card per product (status, 5 s each)
//   { action: 'history', product? }                        → HQ audit rows for the console screens
//   { action: 'call', product, action: <std>, payload? }   → forwarded to the product's admin-console
//
// Standard actions (see _shared/products.ts): status · fresh_start.status/preview/execute ·
// users.list/detail/delete_preview/delete_execute · flags.list/set · releases.list · sso.link.
// Executes need the owner role and, for the destructive ones, payload.typed_name === product id.
// Deploy: supabase functions deploy admin-products   (config.toml: verify_jwt = false)
// ═══════════════════════════════════════════════════════════

import { getCorsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin, isRefusal, withAudit, ADMIN_ALLOW_HEADERS } from '../_shared/adminAuth.ts'
import {
  PRODUCTS, findProduct, READ_ACTIONS, TYPED_CONFIRM_ACTIONS, capabilityOf, translateForV1, type Product,
} from '../_shared/products.ts'

const STATUS_TIMEOUT_MS = 5_000
const ACTION_TIMEOUT_MS = 55_000

interface ProductReply { status: number; data: Record<string, unknown> }

/** Call a product's function with its key. Never throws; network trouble becomes a reply. */
async function callProduct(p: Product, body: Record<string, unknown>, timeoutMs: number): Promise<ProductReply> {
  const key = Deno.env.get(p.secretEnv) ?? ''
  if (!key) return { status: 503, data: { error: 'not_configured' } }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(p.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Fresh-Start-Key': key, 'X-Console-Key': key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => ({ error: `bad_response_${res.status}` })) as Record<string, unknown>
    return { status: res.status, data }
  } catch (e) {
    return { status: 0, data: { error: (e as Error).name === 'AbortError' ? 'timeout' : 'unreachable' } }
  } finally {
    clearTimeout(timer)
  }
}

/** The registry as the UI may see it: no secret names, no internal URLs. */
function publicRegistry() {
  return PRODUCTS.map(p => ({
    id: p.id, name: p.name, icon: p.icon, api: p.api, capabilities: p.capabilities,
    consoleUrl: p.consoleUrl, package: p.package ?? null, note: p.note ?? null,
  }))
}

Deno.serve(withAudit('admin-products', async (req, ctx) => {
  const cors = { ...getCorsHeaders(req), 'Access-Control-Allow-Headers': ADMIN_ALLOW_HEADERS }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' }, cors)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const hubAction = typeof body.action === 'string' ? body.action : null
  const productId = typeof body.product === 'string' ? body.product : null
  // For 'call', the audit row carries the product action itself (e.g. fresh_start.execute) + app_id.
  const stdAction = hubAction === 'call' && typeof body.std === 'string' ? body.std : null
  ctx.action = hubAction === 'call' ? (stdAction ?? 'call:?') : hubAction
  ctx.appId = productId

  // Owner for anything that changes something; any enabled admin for the rest.
  const needsOwner = hubAction === 'call' && stdAction !== null && !READ_ACTIONS.has(stdAction)
  const admin = await requireAdmin(req, ctx.sb, needsOwner ? { role: 'owner' } : {})
  if (isRefusal(admin)) return json(admin.status, { ok: false, error: admin.error }, cors)
  ctx.actor = admin

  switch (hubAction) {
    case 'whoami':
      return json(200, { ok: true, email: admin.email, role: admin.role, method: admin.method }, cors)

    case 'registry':
      return json(200, { ok: true, products: publicRegistry() }, cors)

    // ── Health card per product, in parallel, each with a short timeout ──
    case 'list': {
      const apps = await Promise.all(PRODUCTS.map(async (p) => {
        const r = await callProduct(p, { action: p.api === 'v1' ? 'status' : 'status', requested_by: admin.email }, STATUS_TIMEOUT_MS)
        const guard = r.data.guard as { refused?: boolean; reasons?: string[] } | undefined
        const status =
          r.status === 200 ? (guard?.refused ? 'refused' : 'ok')
          : r.data.error === 'not_configured' ? 'not_configured'
          : r.status === 0 ? 'unreachable'
          : 'error'
        return {
          id: p.id, name: p.name, icon: p.icon, package: p.package ?? null, consoleUrl: p.consoleUrl,
          capabilities: p.capabilities, status,
          counts: r.status === 200 ? r.data.counts : undefined,
          guard: r.status === 200 ? guard : undefined,
          version: r.status === 200 ? (r.data.version ?? null) : null,
          error: r.status === 200 ? undefined : String(r.data.error ?? `http_${r.status}`),
        }
      }))
      return json(200, { ok: true, apps }, cors)
    }

    // ── HQ audit rows for the History screens ──
    case 'history': {
      let q = ctx.sb
        .from('admin_audit_log')
        .select('id, at, actor_email, action, app_id, outcome, details')
        .like('action', 'admin-products.%')
        .not('action', 'in', '("admin-products.list","admin-products.history","admin-products.whoami","admin-products.registry")')
        .order('at', { ascending: false })
        .limit(100)
      if (productId) q = q.eq('app_id', productId)
      const { data, error } = await q
      if (error) return json(500, { ok: false, error: 'history_failed' }, cors)
      return json(200, { ok: true, rows: data ?? [] }, cors)
    }

    // ── The gateway: forward a standard action to a product ──
    case 'call': {
      const p = findProduct(productId)
      if (!p) return json(400, { ok: false, error: 'unknown_product' }, cors)
      if (!stdAction) return json(400, { ok: false, error: 'std_required' }, cors)
      const cap = capabilityOf(stdAction)
      if (!cap || !p.capabilities.includes(cap)) return json(400, { ok: false, error: 'unsupported', action: stdAction }, cors)

      const payload = (typeof body.payload === 'object' && body.payload !== null ? body.payload : {}) as Record<string, unknown>
      if (TYPED_CONFIRM_ACTIONS.has(stdAction) && payload.typed_name !== p.id) {
        return json(400, { ok: false, error: 'typed_name_mismatch' }, cors)
      }
      // ids worth keeping in the audit row (codes and tokens are scrubbed by audit())
      for (const k of ['id', 'key', 'typed_name'] as const) if (payload[k] !== undefined) ctx.details[k] = payload[k]

      let productAction: string | null = stdAction
      if (p.api === 'v1') {
        productAction = translateForV1(stdAction)
        if (!productAction) return json(400, { ok: false, error: 'unsupported', action: stdAction }, cors)
      }
      const { typed_name: _typed, ...forward } = payload
      const r = await callProduct(
        p,
        { ...forward, action: productAction, requested_by: admin.email },
        stdAction === 'status' || stdAction === 'fresh_start.status' ? STATUS_TIMEOUT_MS : ACTION_TIMEOUT_MS,
      )
      ctx.details.status = r.status
      if (r.data.run_id) ctx.details.run_id = r.data.run_id
      if (r.data.before) ctx.details.before = r.data.before
      if (r.data.after) ctx.details.after = r.data.after
      if (r.data.error) ctx.details.product_error = r.data.error
      const status = r.status === 0 ? 502 : r.status
      return json(status, { ...r.data, ok: r.status === 200, product: p.id }, cors)
    }

    default:
      return json(400, { ok: false, error: `Unknown action: ${hubAction ?? '?'}` }, cors)
  }
}, { readActions: ['whoami', 'registry', 'list', 'history', ...READ_ACTIONS] }))

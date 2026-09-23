// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-products: the Fresh Start Console hub (Phase 4)
// Plan: docs/plan/2026-09-23-fresh-start-console.md §5 Phase 4, §6
//
// The admin asks; each product decides and deletes inside its own project. This hub only:
//   1. identifies the admin (Google + authenticator session on the allowlist — _shared/adminAuth.ts),
//   2. forwards to the product's own admin-fresh-start function with that product's key
//      (one Supabase secret per product; the browser never sees any key),
//   3. writes the audit row with the real outcome (withAudit).
//
//   { action: 'list' }                                  any admin  — cards: status + counts per product
//   { action: 'preview', app }                          any admin  — the product mints a 10-minute code
//   { action: 'execute', app, confirm_code, typed_name } owner only — typed_name must equal the app id
//   { action: 'history' }                               any admin  — fresh-start rows from admin_audit_log
//
// Adding a product = one line in APPS + its secret on this project + its own admin-fresh-start function.
// Deploy: supabase functions deploy admin-products   (config.toml: verify_jwt = false)
// ═══════════════════════════════════════════════════════════

import { getCorsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin, isRefusal, withAudit, ADMIN_ALLOW_HEADERS } from '../_shared/adminAuth.ts'

interface AppEntry {
  id: string
  name: string
  functionUrl: string
  secretEnv: string
  /** Android package, for the "clear the test phone" hint after a run. */
  package?: string
}

const APPS: AppEntry[] = [
  {
    id: 'ummi-wallet',
    name: 'Ummi Wallet',
    functionUrl: 'https://opkowdluhkocvfevjdoh.supabase.co/functions/v1/admin-fresh-start',
    secretEnv: 'FRESH_START_KEY_UMMI',
    package: 'com.momencrafts.ummiwallet',
  },
  {
    id: 'muscle-hustle',
    name: 'Muscle Hustle',
    functionUrl: 'https://prguqyjtuueiriasmbyj.supabase.co/functions/v1/admin-fresh-start',
    secretEnv: 'FRESH_START_KEY_MH',
    package: 'com.musclehustle.app',
  },
]

const STATUS_TIMEOUT_MS = 5_000
const ACTION_TIMEOUT_MS = 55_000

interface AppReply { status: number; data: Record<string, unknown> }

/** Call a product's admin-fresh-start with its key. Never throws; network trouble becomes a reply. */
async function callApp(app: AppEntry, body: Record<string, unknown>, timeoutMs: number): Promise<AppReply> {
  const key = Deno.env.get(app.secretEnv) ?? ''
  if (!key) return { status: 503, data: { error: 'not_configured' } }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(app.functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Fresh-Start-Key': key },
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

Deno.serve(withAudit('admin-products', async (req, ctx) => {
  const cors = { ...getCorsHeaders(req), 'Access-Control-Allow-Headers': ADMIN_ALLOW_HEADERS }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'POST only' }, cors)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const action = typeof body.action === 'string' ? body.action : null
  const appId = typeof body.app === 'string' ? body.app : null
  ctx.action = action
  ctx.appId = appId
  if (typeof body.typed_name === 'string') ctx.details.typed_name = body.typed_name

  // Who is asking? Execute needs an owner; everything else any enabled admin.
  const admin = await requireAdmin(req, ctx.sb, action === 'execute' ? { role: 'owner' } : {})
  if (isRefusal(admin)) return json(admin.status, { ok: false, error: admin.error }, cors)
  ctx.actor = admin

  switch (action) {
    // ── Cards: status of every product, in parallel, each with a short timeout ──
    case 'list': {
      const apps = await Promise.all(APPS.map(async (app) => {
        const r = await callApp(app, { action: 'status', requested_by: admin.email }, STATUS_TIMEOUT_MS)
        const guard = r.data.guard as { refused?: boolean; reasons?: string[] } | undefined
        const status =
          r.status === 200 ? (guard?.refused ? 'refused' : 'ok')
          : r.data.error === 'not_configured' ? 'not_configured'
          : r.status === 0 ? 'unreachable'
          : 'error'
        return {
          id: app.id, name: app.name, package: app.package, status,
          counts: r.status === 200 ? r.data.counts : undefined,
          guard: r.status === 200 ? guard : undefined,
          error: r.status === 200 ? undefined : String(r.data.error ?? `http_${r.status}`),
        }
      }))
      return json(200, { ok: true, apps }, cors)
    }

    // ── Step 1: the product mints the code and records a preview run ──
    case 'preview': {
      const app = APPS.find(a => a.id === appId)
      if (!app) return json(400, { ok: false, error: 'unknown_app' }, cors)
      const r = await callApp(app, { action: 'preview', requested_by: admin.email }, ACTION_TIMEOUT_MS)
      ctx.details.status = r.status
      const status = r.status === 0 ? 502 : r.status
      // the code goes to the browser; it never goes to the audit log (scrub drops confirm_code)
      return json(status, { ...r.data, ok: r.status === 200, app: app.id }, cors)
    }

    // ── Step 2: execute — owner, typed app id, the product checks the code and the guard ──
    case 'execute': {
      const app = APPS.find(a => a.id === appId)
      if (!app) return json(400, { ok: false, error: 'unknown_app' }, cors)
      if (body.typed_name !== app.id) return json(400, { ok: false, error: 'typed_name_mismatch' }, cors)
      const code = typeof body.confirm_code === 'string' ? body.confirm_code.trim().toUpperCase() : ''
      if (!code) return json(400, { ok: false, error: 'code_required' }, cors)

      const r = await callApp(app, { action: 'execute', confirm_code: code, requested_by: admin.email }, ACTION_TIMEOUT_MS)
      ctx.details.status = r.status
      if (r.data.run_id) ctx.details.run_id = r.data.run_id
      if (r.data.before) ctx.details.before = r.data.before
      if (r.data.after) ctx.details.after = r.data.after
      if (r.data.error) ctx.details.app_error = r.data.error
      const status = r.status === 0 ? 502 : r.status
      return json(status, { ...r.data, ok: r.status === 200, app: app.id }, cors)
    }

    // ── History: this hub's own audit rows for the console ──
    case 'history': {
      const { data, error } = await ctx.sb
        .from('admin_audit_log')
        .select('id, at, actor_email, action, app_id, outcome, details')
        .like('action', 'admin-products.%')
        .not('action', 'in', '("admin-products.list","admin-products.history")')
        .order('at', { ascending: false })
        .limit(50)
      if (error) return json(500, { ok: false, error: 'history_failed' }, cors)
      return json(200, { ok: true, rows: data ?? [] }, cors)
    }

    default:
      return json(400, { ok: false, error: `Unknown action: ${action ?? '?'}` }, cors)
  }
}, { readActions: ['list', 'history'] }))

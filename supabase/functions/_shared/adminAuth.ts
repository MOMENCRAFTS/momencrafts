// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — Shared admin identity for the admin edge functions
// Plan: docs/plan/2026-09-23-fresh-start-console.md, Phase 1 (decisions D1, D2, D3)
//
// Who gets in:
//   1. A Supabase session (Authorization: Bearer <jwt>) that is GENUINE (auth.getUser verifies it),
//      carries aal = "aal2" (authenticator code entered — D3), and whose email is an enabled row in
//      public.admin_users (D1). Role comes from that row.
//   2. TRANSITION ONLY (D2): the old shared X-Admin-Key. Accepted until the secret
//      ADMIN_LEGACY_KEY_ENABLED is set to "false". Then the shared password is dead.
//
// Every function calls requireAdmin() first and audit() for anything that changes data.
// ═══════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type AdminRole = 'owner' | 'viewer'

export interface AdminIdentity {
  email: string
  role: AdminRole
  method: 'jwt' | 'legacy'
}

export interface AdminRefusal {
  status: number
  error: string
}

export interface RequireAdminOptions {
  /** Minimum role. Default: any enabled admin (viewer or owner). */
  role?: AdminRole
  /** Env var holding the legacy shared key for this function. Default: ADMIN_SECRET_KEY. */
  legacySecretEnv?: string
  /**
   * Env var holding a MACHINE key (a cron job, not a person). Accepted with owner role even after
   * the legacy transition ends, because a scheduler cannot sign in with Google. Use sparingly.
   */
  machineKeyEnv?: string
}

/** Header list the admin functions must allow in CORS (Authorization is new). */
export const ADMIN_ALLOW_HEADERS = 'Content-Type, X-Admin-Key, Authorization'

export function isRefusal(x: AdminIdentity | AdminRefusal): x is AdminRefusal {
  return (x as AdminRefusal).status !== undefined
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split('.')[1] || ''
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

/** Constant-time string compare so a wrong key does not leak its length or prefix. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const n = Math.max(ab.length, bb.length)
  for (let i = 0; i < n; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  return diff === 0
}

/**
 * Identify the caller. Returns the identity, or a refusal { status, error } to send back.
 * Never throws.
 */
export async function requireAdmin(
  req: Request,
  sb: SupabaseClient,
  opts: RequireAdminOptions = {},
): Promise<AdminIdentity | AdminRefusal> {
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (jwt) {
    // 1. Genuine session?
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )
    const { data, error } = await userClient.auth.getUser(jwt)
    const email = data?.user?.email?.toLowerCase()
    if (error || !email) return { status: 401, error: 'invalid_session' }

    // 2. Second factor entered? (D3)
    const claims = decodeJwtPayload(jwt)
    if (claims?.aal !== 'aal2') return { status: 401, error: 'second_factor_required' }

    // 3. On the allowlist and not disabled? (D1)
    const { data: row, error: rowErr } = await sb
      .from('admin_users')
      .select('email, role, disabled_at')
      .eq('email', email)
      .maybeSingle()
    if (rowErr) {
      console.error('[adminAuth] admin_users lookup failed:', rowErr.message)
      return { status: 500, error: 'admin_lookup_failed' }
    }
    if (!row || row.disabled_at) return { status: 403, error: 'not_an_admin' }
    if (opts.role === 'owner' && row.role !== 'owner') return { status: 403, error: 'owner_role_required' }

    return { email, role: row.role as AdminRole, method: 'jwt' }
  }

  // Machine key (cron) — not part of the transition; stays valid.
  if (opts.machineKeyEnv) {
    const secret = Deno.env.get(opts.machineKeyEnv) || ''
    const given = req.headers.get('X-Admin-Key') || ''
    if (secret && given && safeEqual(given, secret)) {
      return { email: `machine-key:${opts.machineKeyEnv}`, role: 'owner', method: 'legacy' }
    }
  }

  // Legacy shared key — transition only (D2). Set ADMIN_LEGACY_KEY_ENABLED=false to switch it off.
  if (Deno.env.get('ADMIN_LEGACY_KEY_ENABLED') !== 'false') {
    const secret = Deno.env.get(opts.legacySecretEnv || 'ADMIN_SECRET_KEY') || ''
    const given = req.headers.get('X-Admin-Key') || ''
    if (secret && given && safeEqual(given, secret)) {
      return { email: 'legacy-shared-key', role: 'owner', method: 'legacy' }
    }
  }

  return { status: 401, error: 'Unauthorized' }
}

/** Keys that must never reach the audit log, whatever the caller sent. */
const SCRUB_KEYS = new Set([
  'confirm_code', 'code', 'token', 'plaintoken', 'key', 'secret', 'password',
  'x-admin-key', 'authorization', 'access_token', 'refresh_token',
])

export function scrub(details: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(details)) {
    if (SCRUB_KEYS.has(k.toLowerCase())) continue
    out[k] = typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v
  }
  return out
}

export interface AuditEntry {
  actor: AdminIdentity | null
  /** '<function>.<action>' */
  action: string
  appId?: string | null
  details?: Record<string, unknown>
  outcome: 'ok' | 'denied' | 'failed'
  req?: Request
}

/**
 * Per-request context the handler fills in as it learns things:
 *   ctx.actor   — set right after requireAdmin() succeeds
 *   ctx.action  — the body's action, set as soon as the body is parsed
 *   ctx.details — ids worth keeping (never codes or keys; scrub() runs anyway)
 */
export interface AuditCtx {
  sb: SupabaseClient
  actor: AdminIdentity | null
  action: string | null
  appId?: string | null
  details: Record<string, unknown>
}

export interface WithAuditOptions {
  /** Actions that only read — not logged unless refused. */
  readActions?: string[]
}

/**
 * Wrap a function handler so every non-read call leaves an audit row with its real outcome:
 * 2xx → ok · 401/403 → denied · anything else or a throw → failed.
 * Refused calls are logged even for read actions (someone knocked with a bad key).
 */
export function withAudit(
  fnName: string,
  handler: (req: Request, ctx: AuditCtx) => Promise<Response>,
  opts: WithAuditOptions = {},
): (req: Request) => Promise<Response> {
  const readActions = new Set(opts.readActions ?? [])
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return handler(req, { sb: null as unknown as SupabaseClient, actor: null, action: null, details: {} })
    const ctx: AuditCtx = { sb: serviceClient(), actor: null, action: null, details: {} }
    let res: Response
    try {
      res = await handler(req, ctx)
    } catch (e) {
      await audit(ctx.sb, {
        actor: ctx.actor, action: `${fnName}.${ctx.action ?? '?'}`, appId: ctx.appId,
        details: { ...ctx.details, error: String(e).slice(0, 300) }, outcome: 'failed', req,
      })
      throw e
    }
    const denied = res.status === 401 || res.status === 403
    const isRead = ctx.action !== null && readActions.has(ctx.action)
    if (denied || !isRead) {
      await audit(ctx.sb, {
        actor: ctx.actor, action: `${fnName}.${ctx.action ?? '?'}`, appId: ctx.appId,
        details: { ...ctx.details, status: res.status },
        outcome: res.status < 400 ? 'ok' : denied ? 'denied' : 'failed', req,
      })
    }
    return res
  }
}

/** Write one audit row. Never throws — an audit failure is logged, not surfaced. */
export async function audit(sb: SupabaseClient, entry: AuditEntry): Promise<void> {
  try {
    const ip = entry.req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const { error } = await sb.from('admin_audit_log').insert({
      actor_email: entry.actor?.email ?? null,
      action: entry.action,
      app_id: entry.appId ?? null,
      details: scrub(entry.details ?? {}),
      outcome: entry.outcome,
      ip,
    })
    if (error) console.error('[audit] insert failed:', error.message)
  } catch (e) {
    console.error('[audit] failed:', e)
  }
}

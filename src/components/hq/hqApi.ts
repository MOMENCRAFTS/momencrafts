/**
 * hqApi.ts — the browser side of the HQ hub (admin-products)
 * Plan: docs/plan/2026-09-23-momencrafts-hq.md §6
 */

export type Api = (fn: string, body?: object) => Promise<any>

export type Capability = 'status' | 'fresh_start' | 'users' | 'flags' | 'releases' | 'sso'

export interface Product {
  id: string
  name: string
  icon: string
  api: 'v1' | 'v2'
  capabilities: Capability[]
  consoleUrl: string | null
  package: string | null
  note: string | null
}

export interface WhoAmI { email: string; role: 'owner' | 'viewer'; method: 'jwt' | 'legacy' }

export interface HealthCard {
  id: string
  name: string
  icon: string
  package: string | null
  consoleUrl: string | null
  capabilities: Capability[]
  status: 'ok' | 'refused' | 'unreachable' | 'not_configured' | 'error'
  counts?: Record<string, unknown>
  guard?: { refused: boolean; reasons: string[] }
  version?: string | null
  error?: string
}

export interface HistoryRow {
  id: string
  at: string
  actor_email: string | null
  action: string
  app_id: string | null
  outcome: 'ok' | 'denied' | 'failed'
  details?: Record<string, unknown>
}

export const ERROR_TEXT: Record<string, string> = {
  code_required: 'Enter the confirmation code.',
  code_invalid: 'That code is not valid. Preview again to get a fresh one.',
  code_used: 'That code was already used. Preview again.',
  code_expired: 'The code expired (10 minutes). Preview again.',
  data_changed: 'The data changed since the preview. Preview again and check the numbers.',
  refused: 'Refused: this looks like real users or real money. The button will not do this; use the script path.',
  rate_limited: 'This ran less than 10 minutes ago. Wait, then preview again.',
  wipe_failed: 'It failed inside the database and was rolled back. Nothing changed.',
  typed_name_mismatch: 'Type the product id exactly as shown.',
  owner_role_required: 'Only an owner can do this.',
  not_an_admin: 'This account is not an admin.',
  not_configured: 'The secret for this product is not set on HQ yet.',
  unreachable: 'The product did not answer.',
  timeout: 'The product took too long to answer.',
  unsupported: 'This product does not support that action yet.',
  unknown_product: 'Unknown product.',
  not_staff: 'Your account is not a staff account in that product.',
}

export const fmt = (v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—'))
export const label = (k: string) => k.replace(/_/g, ' ')
export const errText = (r: any, fallback = 'Something went wrong') =>
  (ERROR_TEXT[r?.error] ?? (typeof r?.error === 'string' ? r.error : fallback)) +
  (Array.isArray(r?.guard?.reasons) && r.guard.reasons.length ? ` (${r.guard.reasons.join('; ')})` : '')

/** Forward a standard action to one product through the hub. */
export function hqCall(api: Api, product: string, std: string, payload: object = {}) {
  return api('admin-products', { action: 'call', product, std, payload })
}

export const hqWhoAmI   = (api: Api) => api('admin-products', { action: 'whoami' })
export const hqRegistry = (api: Api) => api('admin-products', { action: 'registry' })
export const hqList     = (api: Api) => api('admin-products', { action: 'list' })
export const hqHistory  = (api: Api, product?: string) => api('admin-products', { action: 'history', ...(product ? { product } : {}) })

/** Count keys that describe what STAYS in a fresh start (shown with a "stays" badge). */
export const STAY_KEYS = new Set([
  'logins_operators', 'logins_admins', 'operators', 'users_admin', 'feature_flags', 'barakah_content',
  'lounge_tracks_global', 'audit_logs', 'exercises', 'food_items', 'supplement_items', 'plan_templates',
])

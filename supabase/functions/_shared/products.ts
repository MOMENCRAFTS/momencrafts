// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS HQ — product registry (single source of truth)
// Plan: docs/plan/2026-09-23-momencrafts-hq.md §5 Phase A, §6
//
// One entry per product. The hub (admin-products) reads it to route calls and check capabilities;
// the UI reads it through the hub's `registry` action to build the sidebar and the screens.
// Adding a product = one entry here + its secret on this project + its own admin-console function.
// ═══════════════════════════════════════════════════════════

/** Standard action families a product's admin-console can support. */
export type Capability = 'status' | 'fresh_start' | 'users' | 'flags' | 'releases' | 'sso'

export interface Product {
  id: string
  name: string
  icon: string
  /** The product's admin-console (or, for api 'v1', its admin-fresh-start) function URL. */
  apiUrl: string
  /** Name of the Supabase secret on THIS project that holds the product's key. */
  secretEnv: string
  /**
   * v1 = the Phase 2/3 admin-fresh-start contract (actions status / preview / execute).
   * v2 = the standard admin-console contract (fresh_start.*, users.*, flags.*, sso.link, …).
   */
  api: 'v1' | 'v2'
  capabilities: Capability[]
  /** The product's own console, opened in its own tab (decision D-HQ-2). null = none yet. */
  consoleUrl: string | null
  /** Android package, for the "clear the test phone" hint after a fresh start. */
  package?: string
  note?: string
}

export const PRODUCTS: Product[] = [
  {
    id: 'ummi-wallet',
    name: 'Ummi Wallet',
    icon: '👜',
    apiUrl: 'https://opkowdluhkocvfevjdoh.supabase.co/functions/v1/admin-console',
    secretEnv: 'FRESH_START_KEY_UMMI',
    api: 'v2',
    capabilities: ['status', 'fresh_start', 'users', 'flags', 'sso'],
    consoleUrl: 'https://ummi-admin.vercel.app',
    package: 'com.momencrafts.ummiwallet',
    note: 'Operator console deployed 2026-09-23 (Vercel project ummi-admin). Its own operator login + authenticator apply.',
  },
  {
    id: 'muscle-hustle',
    name: 'Muscle Hustle',
    icon: '🏋️',
    apiUrl: 'https://prguqyjtuueiriasmbyj.supabase.co/functions/v1/admin-fresh-start',
    secretEnv: 'FRESH_START_KEY_MH',
    api: 'v1',
    capabilities: ['status', 'fresh_start'],
    consoleUrl: null,
    package: 'com.musclehustle.app',
    note: 'admin-app exists; not deployed as a site yet (Phase C).',
  },
]

export function findProduct(id: unknown): Product | undefined {
  return typeof id === 'string' ? PRODUCTS.find(p => p.id === id) : undefined
}

/** Actions that read. Anything else changes something and needs the owner role + an audit row. */
export const READ_ACTIONS = new Set([
  'status', 'fresh_start.status', 'fresh_start.preview',
  'users.list', 'users.detail', 'users.delete_preview',
  'flags.list', 'releases.list',
])

/** Actions that destroy or grant, and therefore need the typed product id as a second confirmation. */
export const TYPED_CONFIRM_ACTIONS = new Set(['fresh_start.execute', 'users.delete_execute'])

/** Which capability an action belongs to. */
export function capabilityOf(action: string): Capability | null {
  if (action === 'status') return 'status'
  const family = action.split('.')[0]
  return (['fresh_start', 'users', 'flags', 'releases', 'sso'] as Capability[]).includes(family as Capability)
    ? (family as Capability)
    : null
}

/** v1 products only know the fresh-start names. */
export function translateForV1(action: string): string | null {
  switch (action) {
    case 'status':
    case 'fresh_start.status': return 'status'
    case 'fresh_start.preview': return 'preview'
    case 'fresh_start.execute': return 'execute'
    default: return null
  }
}

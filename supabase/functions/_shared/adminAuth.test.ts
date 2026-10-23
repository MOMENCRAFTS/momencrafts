// deno test --allow-env supabase/functions/_shared/adminAuth.test.ts
// Admin audit of 23 Oct 2026, hole 3: the old shared X-Admin-Key opened HQ as owner (Google + authenticator
// skipped) unless ADMIN_LEGACY_KEY_ENABLED was set to exactly "false", so an unset secret left it open.
// Now the key is refused unless ADMIN_LEGACY_KEY_ENABLED is exactly "true". The cron's machine key is not
// part of the transition and keeps working.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { isRefusal, requireAdmin } from './adminAuth.ts'

const LEGACY = 'legacy-shared-key-for-tests'
const MACHINE = 'machine-key-for-tests'
const noDb = null as unknown as SupabaseClient // the key paths never reach the database

function eq(actual: unknown, expected: unknown, what: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function withKey(key: string): Request {
  return new Request('http://localhost/functions/v1/admin-products', { method: 'POST', headers: { 'X-Admin-Key': key } })
}

async function legacyOutcome(flag: string | null): Promise<string> {
  Deno.env.set('ADMIN_SECRET_KEY', LEGACY)
  if (flag === null) Deno.env.delete('ADMIN_LEGACY_KEY_ENABLED')
  else Deno.env.set('ADMIN_LEGACY_KEY_ENABLED', flag)
  const who = await requireAdmin(withKey(LEGACY), noDb, { role: 'owner' })
  return isRefusal(who) ? `refused ${who.status}` : `${who.role} via ${who.method}`
}

Deno.test('the legacy key is refused when ADMIN_LEGACY_KEY_ENABLED is unset', async () => {
  eq(await legacyOutcome(null), 'refused 401', 'unset')
})

Deno.test('the legacy key is refused for "false", "", "1", "yes", "TRUE"', async () => {
  for (const flag of ['false', '', '1', 'yes', 'TRUE']) eq(await legacyOutcome(flag), 'refused 401', `flag ${JSON.stringify(flag)}`)
})

Deno.test('the legacy key opens only when ADMIN_LEGACY_KEY_ENABLED is exactly "true"', async () => {
  eq(await legacyOutcome('true'), 'owner via legacy', 'true')
})

Deno.test('a wrong legacy key is refused even when the flag is "true"', async () => {
  Deno.env.set('ADMIN_LEGACY_KEY_ENABLED', 'true')
  const who = await requireAdmin(withKey('not-the-key'), noDb)
  eq(isRefusal(who) ? who.status : 'let in', 401, 'wrong key')
})

Deno.test('the cron machine key still works with the legacy key off', async () => {
  Deno.env.delete('ADMIN_LEGACY_KEY_ENABLED')
  Deno.env.set('XHB_ADMIN_KEY', MACHINE)
  const who = await requireAdmin(withKey(MACHINE), noDb, { role: 'owner', machineKeyEnv: 'XHB_ADMIN_KEY' })
  eq(isRefusal(who) ? `refused ${who.status}` : who.role, 'owner', 'machine key')
})

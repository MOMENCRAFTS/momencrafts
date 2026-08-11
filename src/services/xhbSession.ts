// ═══════════════════════════════════════════════════════════
// Shared Supabase client for the MomenCrafts portal.
//
// This client uses the SAME project ref and anon key as /xhb/.
// When the portal calls setSession(), the session is persisted
// to the default localStorage key for this project. Because
// /xhb/ is on the same origin and uses the same project, it
// can pick up the session with getSession() on load.
//
// The default storageKey for @supabase/supabase-js@2 is:
//   sb-{ref}-auth-token
// Both the portal and /xhb/ must use this same key.
// ═══════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://isciigqmdfcozrtojqcm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzY2lpZ3FtZGZjb3pydG9qcWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk4ODYsImV4cCI6MjA5NjU4NTg4Nn0.OUV0dUWUt0UBU9bdJpwWiXI2PgclddNO0t1cA4ZLF_8'
const XHB_GATE_URL = `${SUPABASE_URL}/functions/v1/xhb-gate-request`

let _client: SupabaseClient | null = null

/**
 * Returns the shared Supabase client (singleton).
 * Same project ref + anon key as /xhb/index.html.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return _client
}

/**
 * SSO handoff for XHB: calls the edge function with the MCR token,
 * receives session tokens, and sets the session on the shared client.
 *
 * After this resolves, localStorage contains the session under
 * sb-isciigqmdfcozrtojqcm-auth-token — which /xhb/ will pick up
 * on its next boot via sb.auth.getSession().
 *
 * @returns The resolved email on success, or throws on failure.
 */
export async function mintXhbSession(mcrToken: string): Promise<string> {
  const res = await fetch(XHB_GATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sso', mcr_token: mcrToken }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `SSO failed (${res.status})`)
  }

  const data = await res.json()
  if (!data.access_token || !data.refresh_token) {
    throw new Error('SSO response missing session tokens')
  }

  // Set the session on the shared client → persists to localStorage
  const sb = getSupabaseClient()
  const { error } = await sb.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })

  if (error) {
    throw new Error('Failed to set session: ' + error.message)
  }

  return data.user?.email || ''
}

/**
 * Admin SSO fallback: mints an XHB session using the admin email
 * directly (no mcr_token needed). The edge function verifies the
 * email is a superadmin in xhb.allowed_users.
 *
 * Use when the portal session is valid but mcr_token has expired.
 */
export async function mintAdminXhbSession(email: string): Promise<string> {
  const res = await fetch(XHB_GATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'admin_sso', email }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `Admin SSO failed (${res.status})`)
  }

  const data = await res.json()
  if (!data.access_token || !data.refresh_token) {
    throw new Error('Admin SSO response missing session tokens')
  }

  const sb = getSupabaseClient()
  const { error } = await sb.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })

  if (error) {
    throw new Error('Failed to set session: ' + error.message)
  }

  return data.user?.email || ''
}

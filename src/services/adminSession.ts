/**
 * adminSession.ts — browser side of the admin sign-in
 * Plan: docs/plan/2026-09-23-fresh-start-console.md, Phase 1 (decisions D1, D3)
 *
 * Google sign-in through Supabase Auth, then a second factor (authenticator app, TOTP).
 * The server (supabase/functions/_shared/adminAuth.ts) only accepts sessions at level "aal2"
 * whose email is on the admin_users allowlist, so nothing here is a security decision —
 * it is the UI for the flow the server enforces.
 *
 * Own client + own storage key so the admin session never collides with an XHB session
 * in the same browser (localhost dev shares one origin).
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/services/xhbSession'

let _client: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'mcr-admin-auth',
      },
    })
  }
  return _client
}

export type AdminAuthStep =
  | 'signed_out'
  | 'need_mfa_enrol'   // signed in with Google, no authenticator yet → show QR
  | 'need_mfa_code'    // signed in with Google, authenticator exists → ask for the 6 digits
  | 'ready'            // aal2 session → the panel may load

export interface AdminStepResult {
  step: AdminAuthStep
  session: Session | null
  factorId?: string
}

export async function signInWithGoogle(): Promise<void> {
  const sb = getAdminClient()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await getAdminClient().auth.signOut()
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getAdminClient().auth.getSession()
  return data.session?.access_token ?? null
}

export function onAuthChange(cb: () => void): () => void {
  const { data } = getAdminClient().auth.onAuthStateChange(() => cb())
  return () => data.subscription.unsubscribe()
}

/** Where are we in the sign-in? Decides which screen AdminLogin shows. */
export async function resolveStep(): Promise<AdminStepResult> {
  const sb = getAdminClient()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return { step: 'signed_out', session: null }

  const { data: aal, error: aalErr } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalErr) throw aalErr
  if (aal.currentLevel === 'aal2') return { step: 'ready', session }

  const { data: factors, error: fErr } = await sb.auth.mfa.listFactors()
  if (fErr) throw fErr
  const verified = factors.totp.find(f => f.status === 'verified')
  if (verified) return { step: 'need_mfa_code', session, factorId: verified.id }
  return { step: 'need_mfa_enrol', session }
}

export interface TotpEnrolment {
  factorId: string
  qrCodeSvg: string   // data: URI, ready for <img src>
  secret: string      // manual entry fallback
}

/** Start authenticator enrolment. Removes a half-finished (unverified) factor first. */
export async function enrolTotp(): Promise<TotpEnrolment> {
  const sb = getAdminClient()
  const { data: factors } = await sb.auth.mfa.listFactors()
  for (const f of factors?.all ?? []) {
    if (f.status === 'unverified') await sb.auth.mfa.unenroll({ factorId: f.id })
  }
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'MomenCrafts Admin',
  })
  if (error) throw error
  return { factorId: data.id, qrCodeSvg: data.totp.qr_code, secret: data.totp.secret }
}

/** Enter the 6-digit code. Works for both the first enrolment and every later sign-in. */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const sb = getAdminClient()
  const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId })
  if (chErr) throw chErr
  const { error } = await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() })
  if (error) throw error
}

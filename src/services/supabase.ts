const VERIFY_URL =
  'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/verify-token'

export interface TokenResult {
  valid: boolean
  name?: string
  label?: string
  type?: string
  expires?: string | null
  session?: string
  error?: string
  projectAccess?: string[]
}

export async function verifyToken(token: string): Promise<TokenResult> {
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const raw = await res.json()

    if (!res.ok || !raw.valid) {
      return { valid: false, error: raw.error ?? 'Invalid or expired access key' }
    }

    // Map edge function field names → TokenResult shape
    return {
      valid: true,
      type:    raw.tokenType   ?? raw.type,
      name:    raw.investorLabel?.replace(/[^\x00-\x7F]/g, '').trim() ?? raw.name ?? raw.label,
      label:   raw.investorLabel?.replace(/[^\x00-\x7F]/g, '').trim() ?? raw.label,
      expires: raw.expiresAt   ?? raw.expires ?? null,
      session: raw.sessionKey  ?? raw.session,
      projectAccess: raw.projectAccess ?? [],
    }
  } catch {
    return { valid: false, error: 'Network error — check your connection.' }
  }
}


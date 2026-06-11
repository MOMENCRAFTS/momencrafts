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
}

export async function verifyToken(token: string): Promise<TokenResult> {
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    return data
  } catch {
    return { valid: false, error: 'Network error — check your connection.' }
  }
}

const FN_BASE = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'
const VERIFY_URL = `${FN_BASE}/verify-token`

export interface TokenResult {
  valid: boolean
  name?: string
  label?: string
  type?: string
  expires?: string | null
  session?: string
  error?: string
  projectAccess?: string[]
  email?: string
  /** Needed by sign-nda / testing terms. */
  tokenId?: string
  /** True when this token has not yet accepted its agreement. */
  ndaRequired?: boolean
  ndaSignedAt?: string | null
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
      name:    (raw.investorLabel ?? raw.name ?? raw.label ?? '').trim(),
      label:   (raw.investorLabel ?? raw.label ?? '').trim(),
      expires: raw.expiresAt   ?? raw.expires ?? null,
      session: raw.sessionKey  ?? raw.session,
      projectAccess: raw.projectAccess ?? [],
      email:   raw.investorEmail ?? raw.email ?? '',
      tokenId: raw.tokenId,
      ndaRequired: raw.ndaRequired ?? !raw.ndaSignedAt,
      ndaSignedAt: raw.ndaSignedAt ?? null,
    }
  } catch {
    return { valid: false, error: 'Network error — check your connection.' }
  }
}

/* ═══════════════════════════════════════════════════════════
   Tester portal
   ═══════════════════════════════════════════════════════════ */

export interface TesterApp {
  appId: string
  name: string
  nameAr: string
  version: string
  status: 'live' | 'beta' | 'dev' | 'disabled'
  stage?: 'alpha' | 'beta' | 'rc' | 'stable' | null
  emoji?: string
  size?: string
  description?: string
  guideUrl?: string | null
  buildDate?: string | null
  minAndroid?: string | null
  /** False when no build has been uploaded yet — show "coming soon". */
  hasBuild: boolean
  /** Only present on open programmes: this tester's latest request. */
  requestStatus?: 'pending' | 'approved' | 'denied' | null
}

export interface TesterCatalogue {
  testerName?: string
  /** Apps assigned to this tester — downloadable. */
  assigned: TesterApp[]
  /** Open-enrolment programmes they do not have — joinable on request. */
  open: TesterApp[]
}

/** What this token may test, and what it may ask to join. Gated server-side. */
export async function listTesterApps(
  token: string,
): Promise<{ ok: true; data: TesterCatalogue } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${FN_BASE}/tester-apk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const raw = await res.json()
    if (!res.ok) return { ok: false, error: raw.error ?? 'Could not load your apps' }
    return {
      ok: true,
      data: { testerName: raw.testerName, assigned: raw.assigned ?? [], open: raw.open ?? [] },
    }
  } catch {
    return { ok: false, error: 'Network error — check your connection.' }
  }
}

/**
 * Mint a short-lived signed download URL for one APK.
 * The URL expires in ~5 minutes, so request it at click time — never cache it.
 */
export async function requestApkUrl(
  token: string,
  appId: string,
): Promise<{ ok: true; url: string; fileName?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${FN_BASE}/tester-apk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appId }),
    })
    const raw = await res.json()
    if (!res.ok || !raw.url) return { ok: false, error: raw.error ?? 'Download unavailable' }
    return { ok: true, url: raw.url, fileName: raw.fileName }
  } catch {
    return { ok: false, error: 'Network error — check your connection.' }
  }
}

/** Ask to join an open-enrolment programme. Needs the founder's approval. */
export async function requestJoinProgramme(
  token: string,
  appId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${FN_BASE}/tester-apk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appId, action: 'request' }),
    })
    const raw = await res.json()
    if (!res.ok) return { ok: false, error: raw.error ?? 'Could not send your request' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error — check your connection.' }
  }
}

/* ═══════════════════════════════════════════════════════════
   Agreements — NDA (investors) and testing terms (testers)
   Both land in investor_nda_signatures, separated by doc_type.
   ═══════════════════════════════════════════════════════════ */

export async function acceptAgreement(opts: {
  tokenId: string
  signerName: string
  signerEmail?: string
  docType: 'NDA' | 'TESTING_TERMS'
}): Promise<boolean> {
  try {
    const res = await fetch(`${FN_BASE}/sign-nda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: opts.tokenId,
        signerName: opts.signerName,
        signerEmail: opts.signerEmail,
        signatureType: 'typed',
        docType: opts.docType,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

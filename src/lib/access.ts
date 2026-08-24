/* ═══════════════════════════════════════════════════════════
   Access-tier rules — ONE source of truth.

   Both route guards and the gate read from here, so a new token type
   can never land somewhere half of the app disagrees with.
   ═══════════════════════════════════════════════════════════ */

/** Full studio access — sees the & Co hub and co-founder sections. */
export const COFOUNDER_TYPES = new Set(['PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])

/** App testers — the tester portal only, never the investor room. */
export const TESTER_TYPES = new Set(['TESTER'])

export type Landing = '/home' | '/tester'

export function isTester(type?: string | null): boolean {
  return !!type && TESTER_TYPES.has(type)
}

export function isCoFounder(type?: string | null): boolean {
  return !!type && COFOUNDER_TYPES.has(type)
}

/** Where a token of this type belongs after the gate. */
export function landingFor(type?: string | null): Landing {
  return isTester(type) ? '/tester' : '/home'
}

/**
 * Which agreement this token sees before entering.
 *  - testers get short testing terms (confidentiality + no redistribution)
 *  - everyone else gets the co-builder NDA
 */
export function agreementFor(type?: string | null): 'TESTING_TERMS' | 'NDA' {
  return isTester(type) ? 'TESTING_TERMS' : 'NDA'
}

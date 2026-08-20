// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — Shared CORS helper
// Single source of truth for allowed origins across all edge functions
// ═══════════════════════════════════════════════════════════

export const ALLOWED_ORIGINS = [
  'https://www.momencrafts.com',
  'https://momencrafts.com',
  'https://momencrafts-iota.vercel.app',
]

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

export function json(status: number, body: object, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Simple HTML escaper for user-supplied values injected into email HTML */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

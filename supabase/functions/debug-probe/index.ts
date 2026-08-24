// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — debug-probe  (TEMPORARY — DELETE AFTER USE)
//
// Isolates why the redeployed functions return 500. Every step is
// wrapped so the probe ALWAYS returns 200 with a readable report
// instead of vanishing into a runtime error.
//
// Reveals only booleans and a row count — no secrets, no data.
// Delete it as soon as the cause is known:
//   supabase functions delete debug-probe
// ═══════════════════════════════════════════════════════════

const out: Record<string, unknown> = {}

// Stage 1 — does the module even load? If the import is the problem,
// this throws before Deno.serve is reached and the probe returns the
// platform's own boot error rather than this JSON.
let createClient: unknown
try {
  const mod = await import('npm:@supabase/supabase-js@2')
  createClient = mod.createClient
  out.importOk = true
  out.createClientType = typeof mod.createClient
} catch (e) {
  out.importOk = false
  out.importError = String((e as Error)?.stack ?? e)
}

Deno.serve(async () => {
  const report: Record<string, unknown> = { ...out }

  try {
    report.denoVersion = (Deno as unknown as { version?: { deno?: string } }).version?.deno ?? 'unknown'

    // Stage 2 — are the env vars the functions rely on actually present?
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    report.env = {
      SUPABASE_URL: Boolean(url),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(key),
      RESEND_API_KEY: Boolean(Deno.env.get('RESEND_API_KEY')),
      ADMIN_SECRET_KEY: Boolean(Deno.env.get('ADMIN_SECRET_KEY')),
    }

    if (typeof createClient !== 'function') {
      report.stoppedAt = 'import — createClient is not callable'
      return json(report)
    }
    if (!url || !key) {
      report.stoppedAt = 'env — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing'
      return json(report)
    }

    // Stage 3 — can a client be constructed?
    const sb = (createClient as (u: string, k: string) => {
      from: (t: string) => {
        select: (c: string, o: { count: 'exact'; head: boolean }) =>
          Promise<{ error: { code?: string; message: string } | null; count: number | null }>
      }
    })(url, key)
    report.clientConstructed = true

    // Stage 4 — can it actually reach the database?
    const probe = await sb.from('investor_tokens').select('id', { count: 'exact', head: true })
    report.query = probe.error
      ? { ok: false, error: `${probe.error.code ?? '?'}: ${probe.error.message}` }
      : { ok: true, investorTokenRows: probe.count }

    // Stage 5 — do the new tester tables exist and answer?
    const t = await sb.from('tester_assignments').select('id', { count: 'exact', head: true })
    report.testerAssignments = t.error ? `${t.error.code ?? '?'}: ${t.error.message}` : t.count

    report.stoppedAt = null
  } catch (e) {
    report.threw = String((e as Error)?.stack ?? e)
  }

  return json(report)
})

function json(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

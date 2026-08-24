// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-get-analytics Edge Function
// Returns aggregated analytics for the admin dashboard
// Deploy: supabase functions deploy admin-get-analytics --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://www.momencrafts.com',
  'https://momencrafts.com',
  'https://momencrafts-iota.vercel.app',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Verify admin key
    const ADMIN_KEY = Deno.env.get('ADMIN_SECRET_KEY')
    const clientKey = req.headers.get('X-Admin-Key')
    if (!ADMIN_KEY || !clientKey || clientKey !== ADMIN_KEY) {
      return json(401, { error: 'Unauthorized' }, corsHeaders)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Investor overview
    const { data: investors } = await supabase
      .from('investor_overview')
      .select('*')
      .order('token_created', { ascending: false })

    // 2. Today's sessions
    const { data: sessionsToday } = await supabase
      .from('sessions_today')
      .select('*')

    // 3. Section dwell
    const { data: sectionDwell } = await supabase
      .from('section_dwell')
      .select('*')

    // 4. Card expands
    const { data: cardExpands } = await supabase
      .from('card_expand_counts')
      .select('*')

    // 5. Recent events (last 100 for signal feed)
    const { data: recentEvents } = await supabase
      .from('investor_events')
      .select(`
        id, event_type, metadata, created_at,
        investor_sessions!inner (
          investor_tokens!inner ( label, email )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    // 6. Doc downloads count
    const { count: docCount } = await supabase
      .from('investor_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'doc_download')

    // 7. Failed attempts (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: failedCount } = await supabase
      .from('investor_failed_attempts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday)

    return json(200, {
      investors:     investors || [],
      sessionsToday: sessionsToday || [],
      sectionDwell:  sectionDwell || [],
      cardExpands:   cardExpands || [],
      recentEvents:  recentEvents || [],
      docDownloads:  docCount || 0,
      failedAttempts24h: failedCount || 0,
    }, corsHeaders)
  } catch (err) {
    console.error('admin-get-analytics error:', err)
    return json(500, { error: 'Internal error' }, corsHeaders)
  }
})

function json(status: number, body: object, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — co-data Edge Function
// Public read API for & Co sections (journal, downloads, traction, board, registry)
// Deploy: supabase functions deploy co-data --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://www.momencrafts.com',
  'https://momencrafts.com',
  'https://admin.momencrafts.com',
  'https://momencrafts-iota.vercel.app',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

function json(status: number, body: object, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const resource = url.searchParams.get('r') || url.pathname.split('/').pop()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    switch (resource) {
      // ── Journal ──
      case 'journal': {
        const { data, error } = await supabase
          .from('co_journal')
          .select('*')
          .eq('published', true)
          .order('pinned', { ascending: false })
          .order('publish_date', { ascending: false })
          .limit(20)
        if (error) throw error
        return json(200, { data }, corsHeaders)
      }

      // ── Downloads ──
      case 'downloads': {
        const { data, error } = await supabase
          .from('co_downloads')
          .select('*')
          .eq('visible', true)
          .order('sort_order', { ascending: true })
        if (error) throw error
        return json(200, { data }, corsHeaders)
      }

      // ── Traction KPIs ──
      case 'traction': {
        const [kpis, progress, impact] = await Promise.all([
          supabase.from('co_traction').select('*').eq('visible', true).order('sort_order'),
          supabase.from('co_product_progress').select('*').order('sort_order'),
          supabase.from('co_impact_summary').select('*').single(),
        ])
        if (kpis.error) throw kpis.error
        return json(200, {
          kpis: kpis.data,
          progress: progress.data || [],
          impact: impact.data || { bugs_reported: 0, suggestions: 0, ideas_shipped: 0, co_builders: 0 },
        }, corsHeaders)
      }

      // ── Board (public) ──
      case 'board': {
        const { data, error } = await supabase
          .from('co_board_public')
          .select('*')
          .limit(50)
        if (error) throw error
        return json(200, { data }, corsHeaders)
      }

      // ── Registry (public) ──
      case 'registry': {
        const { data, error } = await supabase
          .from('co_registry_public')
          .select('*')
          .limit(100)
        if (error) throw error
        return json(200, { data }, corsHeaders)
      }

      // ── All (combined payload for initial load) ──
      case 'all': {
        const [journal, downloads, kpis, progress, impact, board, registry] = await Promise.all([
          supabase.from('co_journal').select('*').eq('published', true).order('pinned', { ascending: false }).order('publish_date', { ascending: false }).limit(20),
          supabase.from('co_downloads').select('*').eq('visible', true).order('sort_order'),
          supabase.from('co_traction').select('*').eq('visible', true).order('sort_order'),
          supabase.from('co_product_progress').select('*').order('sort_order'),
          supabase.from('co_impact_summary').select('*').single(),
          supabase.from('co_board_public').select('*').limit(50),
          supabase.from('co_registry_public').select('*').limit(100),
        ])
        return json(200, {
          journal: journal.data || [],
          downloads: downloads.data || [],
          kpis: kpis.data || [],
          progress: progress.data || [],
          impact: impact.data || { bugs_reported: 0, suggestions: 0, ideas_shipped: 0, co_builders: 0 },
          board: board.data || [],
          registry: registry.data || [],
        }, corsHeaders)
      }

      default:
        return json(400, { error: `Unknown resource: ${resource}. Use: journal, downloads, traction, board, registry, all` }, corsHeaders)
    }
  } catch (err) {
    console.error('co-data error:', err)
    return json(500, { error: 'Internal server error' }, corsHeaders)
  }
})

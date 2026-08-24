// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-manage-co Edge Function
// Admin CRUD for & Co tables (journal, downloads, traction, board, registry, chat)
// Deploy: supabase functions deploy admin-manage-co --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const ALLOWED_ORIGINS = [
  'https://www.momencrafts.com',
  'https://momencrafts.com',
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

function json(status: number, body: object, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Valid tables for admin operations
const VALID_TABLES = ['co_journal', 'co_downloads', 'co_traction', 'co_product_progress', 'co_board', 'co_feedback', 'co_registry', 'co_chat'] as const

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'POST only' }, corsHeaders)
  }

  try {
    // Verify admin key
    const ADMIN_KEY = Deno.env.get('ADMIN_SECRET_KEY')
    const clientKey = req.headers.get('X-Admin-Key')
    if (!ADMIN_KEY || !clientKey || clientKey !== ADMIN_KEY) {
      return json(403, { error: 'Unauthorized' }, corsHeaders)
    }

    const body = await req.json()
    const { action, table, data, id } = body

    // Validate table
    if (!table || !VALID_TABLES.includes(table)) {
      return json(400, { error: `Invalid table. Valid: ${VALID_TABLES.join(', ')}` }, corsHeaders)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    switch (action) {
      // ── LIST ──
      case 'list': {
        const orderCol = ['co_traction', 'co_product_progress'].includes(table) ? 'sort_order' : 'created_at'
        const { data: rows, error } = await supabase
          .from(table)
          .select('*')
          .order(orderCol, { ascending: ['co_traction', 'co_product_progress'].includes(table) })
          .limit(100)
        if (error) throw error
        return json(200, { data: rows }, corsHeaders)
      }

      // ── CREATE ──
      case 'create': {
        if (!data) return json(400, { error: 'Missing data' }, corsHeaders)
        const { data: row, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single()
        if (error) throw error
        return json(201, { data: row }, corsHeaders)
      }

      // ── UPDATE ──
      case 'update': {
        if (!id || !data) return json(400, { error: 'Missing id or data' }, corsHeaders)
        data.updated_at = new Date().toISOString()
        const { data: row, error } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return json(200, { data: row }, corsHeaders)
      }

      // ── DELETE ──
      case 'delete': {
        if (!id) return json(400, { error: 'Missing id' }, corsHeaders)
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id)
        if (error) throw error
        return json(200, { deleted: id }, corsHeaders)
      }

      // ── TOGGLE VISIBILITY ──
      case 'toggle_visible': {
        if (!id) return json(400, { error: 'Missing id' }, corsHeaders)
        // Get current visibility
        const { data: current, error: fetchErr } = await supabase
          .from(table)
          .select('visible')
          .eq('id', id)
          .single()
        if (fetchErr) throw fetchErr
        const newVal = !(current as any).visible
        const { data: row, error } = await supabase
          .from(table)
          .update({ visible: newVal, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return json(200, { data: row }, corsHeaders)
      }

      // ── TOGGLE PIN ──
      case 'toggle_pin': {
        if (!id) return json(400, { error: 'Missing id' }, corsHeaders)
        const { data: current, error: fetchErr } = await supabase
          .from(table)
          .select('pinned')
          .eq('id', id)
          .single()
        if (fetchErr) throw fetchErr
        const newVal = !(current as any).pinned
        const { data: row, error } = await supabase
          .from(table)
          .update({ pinned: newVal, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return json(200, { data: row }, corsHeaders)
      }

      // ── UPDATE STATUS (for board items) ──
      case 'update_status': {
        if (!id || !data?.status) return json(400, { error: 'Missing id or status' }, corsHeaders)
        const { data: row, error } = await supabase
          .from(table)
          .update({ status: data.status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return json(200, { data: row }, corsHeaders)
      }

      default:
        return json(400, { error: `Unknown action: ${action}. Use: list, create, update, delete, toggle_visible, toggle_pin, update_status` }, corsHeaders)
    }
  } catch (err) {
    console.error('admin-manage-co error:', err)
    return json(500, { error: (err as Error).message || 'Internal server error' }, corsHeaders)
  }
})

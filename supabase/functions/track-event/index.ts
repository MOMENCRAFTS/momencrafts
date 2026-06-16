// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — track-event Edge Function
// Logs investor analytics events
// Accepts both { sessionKey, event_type } and { sessionId, event } formats
// Deploy: supabase functions deploy track-event --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Accept both field name variants from SPA and admin
    const sessionKey = body.sessionKey ?? body.sessionId
    const event_type = body.event_type ?? body.event
    const token      = body.token
    const metadata   = body.metadata ?? {}

    if (!event_type) {
      return json(400, { error: 'event_type required' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Resolve session by sessionKey OR by token (fallback)
    let session: { id: string; token_id: string } | null = null

    if (sessionKey) {
      const { data } = await supabase
        .from('investor_sessions')
        .select('id, token_id')
        .eq('session_key', sessionKey)
        .maybeSingle()
      session = data
    }

    // Fallback: resolve by token (less precise — picks latest session)
    if (!session && token) {
      const { data: tok } = await supabase
        .from('investor_tokens')
        .select('id')
        .eq('token', token.toUpperCase().trim())
        .maybeSingle()

      if (tok) {
        const { data } = await supabase
          .from('investor_sessions')
          .select('id, token_id')
          .eq('token_id', tok.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        session = data
      }
    }

    if (!session) {
      // Don't block — just log and return ok (analytics is fire-and-forget)
      console.warn('track-event: session not found for', { sessionKey, token })
      return json(200, { ok: true, warn: 'session not found' })
    }

    // Handle NDA accepted — update session + write nda_signed_at to token
    if (event_type === 'nda_accepted') {
      await supabase
        .from('investor_sessions')
        .update({ nda_accepted: true, nda_accepted_at: new Date().toISOString() })
        .eq('id', session.id)

      // Write nda_signed_at to investor_tokens (first time only)
      await supabase
        .from('investor_tokens')
        .update({ nda_signed_at: new Date().toISOString() })
        .eq('id', session.token_id)
        .is('nda_signed_at', null)
    }

    // Handle room exit
    if (event_type === 'room_exit') {
      await supabase
        .from('investor_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', session.id)
    }

    // Insert event
    const { error } = await supabase.from('investor_events').insert({
      session_id: session.id,
      token_id:   session.token_id,
      event_type,
      metadata,
    })

    if (error) {
      console.error('Event insert error:', error)
      return json(500, { error: 'Failed to log event' })
    }

    return json(200, { ok: true })
  } catch (err) {
    console.error('track-event error:', err)
    return json(500, { error: 'Internal error' })
  }
})

function json(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

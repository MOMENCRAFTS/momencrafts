// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — track-event Edge Function
// Logs investor analytics events
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
    const { sessionKey, event_type, metadata = {} } = await req.json()

    if (!sessionKey || !event_type) {
      return json(400, { error: 'sessionKey and event_type required' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up session
    const { data: session } = await supabase
      .from('investor_sessions')
      .select('id, token_id')
      .eq('session_key', sessionKey)
      .maybeSingle()

    if (!session) {
      return json(401, { error: 'Invalid session' })
    }

    // Handle NDA accepted
    if (event_type === 'nda_accepted') {
      await supabase
        .from('investor_sessions')
        .update({ nda_accepted: true, nda_accepted_at: new Date().toISOString() })
        .eq('id', session.id)
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

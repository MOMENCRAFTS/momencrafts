// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-manage-token Edge Function
// Create, revoke, extend tokens (admin only)
// Deploy: supabase functions deploy admin-manage-token --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://www.momencrafts.com',
  'https://momencrafts.com',
  'https://momencrafts-iota.vercel.app',
  'https://admin.momencrafts.com',
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

// Duration map
const DURATIONS: Record<string, number> = {
  HOUR:   60 * 60 * 1000,
  WEEK:   7 * 24 * 60 * 60 * 1000,
  MONTH:  30 * 24 * 60 * 60 * 1000,
  '3MONTH': 90 * 24 * 60 * 60 * 1000,
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
    // Verify admin key
    const ADMIN_KEY = Deno.env.get('ADMIN_SECRET_KEY')
    const clientKey = req.headers.get('X-Admin-Key')
    if (!ADMIN_KEY || !clientKey || clientKey !== ADMIN_KEY) {
      return json(401, { error: 'Unauthorized' }, corsHeaders)
    }

    const body = await req.json()
    const { action } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    switch (action) {
      case 'create': {
        const { label, email, notes, tokenType } = body
        if (!label || !tokenType) {
          return json(400, { error: 'label and tokenType are required' }, corsHeaders)
        }

        // Generate MCR-XXXXXXXX
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let suffix = ''
        for (let i = 0; i < 8; i++) {
          suffix += chars[Math.floor(Math.random() * chars.length)]
        }
        const token = 'MCR-' + suffix

        const expiresAt = tokenType === 'PERMANENT'
          ? null
          : new Date(Date.now() + DURATIONS[tokenType]).toISOString()

        const { data, error } = await supabase.from('investor_tokens').insert({
          token,
          label,
          email: email || null,
          notes: notes || null,
          token_type: tokenType,
          expires_at: expiresAt,
        }).select('id, token, expires_at').single()

        if (error) {
          console.error('Create token error:', error)
          return json(500, { error: 'Failed to create token' }, corsHeaders)
        }

        return json(200, {
          token: data.token,
          tokenId: data.id,
          expiresAt: data.expires_at,
        }, corsHeaders)
      }

      case 'revoke': {
        const { tokenId, reason } = body
        if (!tokenId) return json(400, { error: 'tokenId required' }, corsHeaders)

        const { error } = await supabase.from('investor_tokens').update({
          revoked_at: new Date().toISOString(),
          revoke_reason: reason || null,
        }).eq('id', tokenId)

        if (error) {
          console.error('Revoke error:', error)
          return json(500, { error: 'Failed to revoke' }, corsHeaders)
        }
        return json(200, { ok: true }, corsHeaders)
      }

      case 'extend': {
        const { tokenId, extendBy } = body
        if (!tokenId || !extendBy) return json(400, { error: 'tokenId and extendBy required' }, corsHeaders)

        if (extendBy === 'PERMANENT') {
          await supabase.from('investor_tokens')
            .update({ expires_at: null, token_type: 'PERMANENT' })
            .eq('id', tokenId)
        } else {
          // Get current expiry
          const { data: tok } = await supabase.from('investor_tokens')
            .select('expires_at')
            .eq('id', tokenId)
            .single()

          const base = tok?.expires_at ? new Date(tok.expires_at) : new Date()
          const newExpiry = new Date(base.getTime() + DURATIONS[extendBy]).toISOString()

          await supabase.from('investor_tokens')
            .update({ expires_at: newExpiry })
            .eq('id', tokenId)
        }

        return json(200, { ok: true }, corsHeaders)
      }

      default:
        return json(400, { error: `Unknown action: ${action}` }, corsHeaders)
    }
  } catch (err) {
    console.error('admin-manage-token error:', err)
    return json(500, { error: 'Internal error' }, corsHeaders)
  }
})

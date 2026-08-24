// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — admin-manage-token Edge Function
// Create, revoke, extend tokens (admin only)
// Deploy: supabase functions deploy admin-manage-token --no-verify-jwt
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

// Duration map — co-founder types have null expiry
const COFOUNDER_TYPES = new Set(['PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])
const DURATIONS: Record<string, number> = {
  HALF_HOUR: 30 * 60 * 1000,
  HOUR:   60 * 60 * 1000,
  WEEK:   7 * 24 * 60 * 60 * 1000,
  MONTH:  30 * 24 * 60 * 60 * 1000,
  '3MONTH': 90 * 24 * 60 * 60 * 1000,
  // Testers get a generous window — testing cycles outlive investor reviews.
  TESTER: 90 * 24 * 60 * 60 * 1000,
}

// Known types. An unknown type silently falls back to MONTH below, which is
// why this list exists: add new types here and to DURATIONS together.
const KNOWN_TYPES = new Set([...Object.keys(DURATIONS), 'PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])

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
      case 'list': {
        const { data: rows, error } = await supabase
          .from('investor_tokens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        if (error) {
          console.error('List tokens error:', error)
          return json(500, { error: 'Failed to list tokens' }, corsHeaders)
        }
        return json(200, { data: rows }, corsHeaders)
      }

      case 'create': {
        const { label, email, notes, token_type: tt, project_access } = body
        const tokenType = tt || body.tokenType
        if (!label || !tokenType) {
          return json(400, { error: 'label and token_type are required' }, corsHeaders)
        }
        // Reject unknown types rather than silently issuing a 30-day token.
        if (!KNOWN_TYPES.has(tokenType)) {
          return json(400, { error: `Unknown token_type: ${tokenType}` }, corsHeaders)
        }

        // Generate MCR-XXXXXXXXXXXXXXXX (16 chars, ~82 bits, crypto-secure)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        const token = 'MCR-' + Array.from(bytes, b => chars[b % chars.length]).join('')

        const expiresAt = COFOUNDER_TYPES.has(tokenType)
          ? null
          : new Date(Date.now() + (DURATIONS[tokenType] ?? DURATIONS.MONTH)).toISOString()

        const { data, error } = await supabase.from('investor_tokens').insert({
          token,
          label,
          email: email || null,
          notes: notes || null,
          token_type: tokenType,
          expires_at: expiresAt,
          project_access: Array.isArray(project_access) ? project_access : (project_access ? [project_access] : []),
        }).select('id, token, expires_at').single()

        if (error) {
          console.error('Create token error:', error)
          return json(500, { error: 'Failed to create token' }, corsHeaders)
        }

        const ndaLink = `https://www.momencrafts.com/admin/nda?t=${data.id}`
        const portalLink = 'https://www.momencrafts.com'

        return json(200, {
          token: data.token,
          tokenId: data.id,
          expiresAt: data.expires_at,
          ndaLink,
          portalLink,
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

        if (extendBy === 'PERMANENT' || COFOUNDER_TYPES.has(extendBy)) {
          await supabase.from('investor_tokens')
            .update({ expires_at: null, token_type: extendBy === 'PERMANENT' ? 'PERMANENT' : extendBy })
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

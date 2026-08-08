// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — submit-feedback Edge Function
// Accepts tiered investor feedback per product
// SECURITY: Locked CORS, validated token
// Deploy: supabase functions deploy submit-feedback --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, json } from '../_shared/cors.ts'

const COFOUNDER_TYPES = new Set(['PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const { token, productId, feedbackType = 'composite', payload = {} } = await req.json()

    if (!token || !productId) {
      return json(400, { error: 'token and productId required' }, cors)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up token record
    const { data: tok, error: tokErr } = await supabase
      .from('investor_tokens')
      .select('id, token_type, label, revoked_at, expires_at')
      .eq('token', token.toUpperCase().trim())
      .maybeSingle()

    if (tokErr || !tok) {
      return json(401, { error: 'Invalid token' }, cors)
    }

    if (tok.revoked_at) {
      return json(403, { error: 'Token revoked' }, cors)
    }

    if (tok.expires_at && new Date(tok.expires_at) < new Date()) {
      return json(403, { error: 'Token expired' }, cors)
    }

    const tokenTier = COFOUNDER_TYPES.has(tok.token_type) ? 'cofounder' : 'visitor'

    // For visitor tier, strip co-founder-only fields
    const cleanPayload = { ...payload }
    if (tokenTier === 'visitor') {
      delete cleanPayload.stars
      delete cleanPayload.useCase
      delete cleanPayload.idea
      delete cleanPayload.intro
      delete cleanPayload.privateNote
      delete cleanPayload.voiceDuration
    }
    // Private notes only for PERMANENT/FOUNDER
    if (!['PERMANENT', 'FOUNDER'].includes(tok.token_type)) {
      delete cleanPayload.privateNote
    }

    // Insert feedback
    const { error: insErr } = await supabase.from('investor_feedback').insert({
      token_id:      tok.id,
      product_id:    productId,
      feedback_type: feedbackType,
      token_tier:    tokenTier,
      payload:       cleanPayload,
    })

    if (insErr) {
      console.error('Feedback insert error:', insErr)
      return json(500, { error: 'Failed to save feedback' }, cors)
    }

    // If intro submitted — fire WhatsApp notification via edge (fire-and-forget)
    if (cleanPayload.intro?.name) {
      const waText = encodeURIComponent(
        `🤝 Intro from ${tok.label} (${tok.token_type}):\n` +
        `Product: ${productId.toUpperCase()}\n` +
        `Contact: ${cleanPayload.intro.name}\n` +
        `${cleanPayload.intro.context ? 'Context: ' + cleanPayload.intro.context : ''}`
      )
      // Fire-and-forget — don't await
      fetch(`https://api.whatsapp.com/send/?phone=966535271122&text=${waText}`).catch(() => {})
    }

    return json(200, {
      ok: true,
      tier: tokenTier,
      message: tokenTier === 'cofounder'
        ? 'Contribution logged to & Co Registry'
        : 'Feedback received — thank you',
    }, cors)
  } catch (err) {
    console.error('submit-feedback error:', err)
    return json(500, { error: 'Internal error' }, cors)
  }
})

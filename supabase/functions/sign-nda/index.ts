// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — sign-nda Edge Function
// Public endpoint: Investor signs NDA with their name/signature
// Deploy: supabase functions deploy sign-nda --no-verify-jwt
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
    'Access-Control-Allow-Origin': allowed ? origin : '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  if (req.method !== 'POST') {
    return json(405, { error: 'POST only' }, corsHeaders)
  }

  try {
    const body = await req.json()
    const { tokenId, signerName, signerEmail, signatureData, signatureType, docType } = body
    const doc = docType === 'TESTING_TERMS' ? 'TESTING_TERMS' : 'NDA'

    if (!tokenId || !signerName) {
      return json(400, { error: 'tokenId and signerName are required' }, corsHeaders)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Verify token exists and is valid
    const { data: token, error: tokenErr } = await supabase
      .from('investor_tokens')
      .select('id, label, email, revoked_at, expires_at, nda_signed_at')
      .eq('id', tokenId)
      .maybeSingle()

    if (tokenErr || !token) {
      return json(404, { error: 'Token not found' }, corsHeaders)
    }
    if (token.revoked_at) {
      return json(403, { error: 'Token has been revoked' }, corsHeaders)
    }
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      return json(403, { error: 'Token has expired' }, corsHeaders)
    }

    // SECURITY: Validate signerEmail matches token email (prevent IDOR)
    if (signerEmail && token.email && signerEmail.toLowerCase().trim() !== token.email.toLowerCase().trim()) {
      return json(403, { error: 'Email mismatch' }, corsHeaders)
    }

    // 2. Check if already signed
    if (token.nda_signed_at) {
      return json(200, {
        alreadySigned: true,
        signedAt: token.nda_signed_at,
        message: 'NDA was already signed',
      }, corsHeaders)
    }

    // 3. Store signature
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || 'unknown'

    const { error: sigErr } = await supabase
      .from('investor_nda_signatures')
      .insert({
        token_id: tokenId,
        signer_name: signerName,
        signer_email: signerEmail || null,
        signature_data: signatureData || null,
        signature_type: signatureType || 'typed',
        doc_type: doc,
        ip_address: ip,
        user_agent: ua,
      })

    if (sigErr) {
      console.error('NDA signature insert error:', sigErr)
      return json(500, { error: 'Failed to save signature' }, corsHeaders)
    }

    // 4. Update token with nda_signed_at
    const now = new Date().toISOString()
    await supabase
      .from('investor_tokens')
      .update({ nda_signed_at: now })
      .eq('id', tokenId)

    return json(200, {
      signed: true,
      signedAt: now,
      message: 'NDA signed successfully',
    }, corsHeaders)

  } catch (err) {
    console.error('sign-nda error:', err)
    return json(500, { error: (err as Error).message || 'Internal error' }, corsHeaders)
  }
})

// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — verify-token Edge Function
// Validates investor token, creates session, returns data
// SECURITY: Rate-limited per IP (10 attempts/15min) and per token (5/15min)
// Deploy: supabase functions deploy verify-token --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { getCorsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return json(400, { valid: false, error: 'Token is required' }, cors)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const ip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown'

    // ── Rate limit: max 10 attempts per IP per 15 minutes ──
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count: ipAttempts } = await supabase
      .from('investor_failed_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', fifteenMinAgo)

    if ((ipAttempts ?? 0) >= 10) {
      return json(429, { valid: false, error: 'Too many attempts. Please wait 15 minutes.' }, cors)
    }

    // ── Rate limit: max 5 attempts per token string per 15 minutes ──
    const normalizedToken = token.toUpperCase().trim().slice(0, 24) // cap length
    const { count: tokenAttempts } = await supabase
      .from('investor_failed_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('attempted_token', normalizedToken.slice(0, 12))
      .gte('created_at', fifteenMinAgo)

    if ((tokenAttempts ?? 0) >= 5) {
      return json(429, { valid: false, error: 'Too many attempts for this key. Please wait.' }, cors)
    }

    // 1. Look up token
    const { data: row, error } = await supabase
      .from('investor_tokens')
      .select('id, label, email, token_type, expires_at, revoked_at, nda_signed_at, project_access')
      .eq('token', normalizedToken)
      .maybeSingle()

    if (error || !row) {
      // Log failed attempt
      await supabase.from('investor_failed_attempts').insert({
        attempted_token: normalizedToken.slice(0, 12),
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown',
      })
      return json(401, { valid: false, error: 'Invalid access key' }, cors)
    }

    // 2. Check revoked
    if (row.revoked_at) {
      return json(403, { valid: false, error: 'Access has been revoked' }, cors)
    }

    // 3. Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return json(403, { valid: false, error: 'Access key has expired' }, cors)
    }

    // 4. Create session
    const sessionKey = crypto.randomUUID()
    const { error: sessErr } = await supabase.from('investor_sessions').insert({
      token_id: row.id,
      session_key: sessionKey,
      user_agent: req.headers.get('user-agent') || 'unknown',
      ip_address: ip,
    })

    if (sessErr) {
      console.error('Session create error:', sessErr)
      return json(500, { valid: false, error: 'Internal error' }, cors)
    }

    // 5. Notify founder via email (fire-and-forget)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const ua = req.headers.get('user-agent') || 'unknown'
      const device = ua.includes('iPhone') ? '📱 iPhone' 
        : ua.includes('Android') ? '📱 Android'
        : ua.includes('Mac') ? '💻 Mac' 
        : ua.includes('Windows') ? '💻 Windows' : '🌐 Browser'
      const now = new Date().toLocaleString('en-GB', { 
        timeZone: 'Asia/Riyadh', 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      })
      const typeLabel = ({
        PERMANENT: 'Superadmin', STRATEGIC: 'Strategic Partner',
        COFOUNDER: 'Co-Founder', FOUNDER: 'Founder',
        HALF_HOUR: '30-Min Access', HOUR: '1-Hour Access',
        WEEK: '7-Day Access', MONTH: '30-Day Access',
        '3MONTH': '90-Day Access', TESTER: '🧪 App Tester',
      } as Record<string, string>)[row.token_type] ?? row.token_type

      const projects = (row.project_access || []).join(', ') || 'All'

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MomenCrafts <onboarding@resend.dev>',
          to: ['momen@momencrafts.com'],
          subject: `✦ ${row.label || normalizedToken} just entered MomenCrafts`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0d0d0d;color:#f0ebe3;border-radius:12px;">
              <div style="text-align:center;color:#c8a96e;font-size:24px;margin-bottom:8px;">✦</div>
              <div style="text-align:center;font-size:11px;letter-spacing:3px;color:#c8a96e;margin-bottom:16px;">MOMENCRAFTS ACCESS REPORT</div>
              <hr style="border:none;border-top:1px solid #2a2520;margin:16px 0;">
              <table style="width:100%;font-size:14px;color:#f0ebe3;">
                <tr><td style="padding:6px 0;color:#c8a96e;">Visitor</td><td style="padding:6px 0;text-align:right;">${row.label || 'Unknown'}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">Email</td><td style="padding:6px 0;text-align:right;">${row.email || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">Token</td><td style="padding:6px 0;text-align:right;font-family:monospace;">${normalizedToken}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">Type</td><td style="padding:6px 0;text-align:right;">${typeLabel}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">Projects</td><td style="padding:6px 0;text-align:right;">${projects}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">Device</td><td style="padding:6px 0;text-align:right;">${device}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">IP</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;">${ip}</td></tr>
                <tr><td style="padding:6px 0;color:#c8a96e;">Time (KSA)</td><td style="padding:6px 0;text-align:right;">${now}</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #2a2520;margin:16px 0;">
              <div style="text-align:center;font-size:10px;color:#666;">Session: ${sessionKey}</div>
            </div>
          `,
        }),
      }).catch((e) => console.error('Resend notification error:', e))
    }

    // 6. Return success
    return json(200, {
      valid: true,
      sessionKey,
      tokenId: row.id,
      tokenType: row.token_type,
      expiresAt: row.expires_at,
      investorLabel: row.label,
      investorEmail: row.email,
      ndaSignedAt: row.nda_signed_at,
      ndaRequired: !row.nda_signed_at,
      projectAccess: row.project_access || [],
    }, cors)
  } catch (err) {
    console.error('verify-token error:', err)
    return json(500, { valid: false, error: 'Internal error' }, cors)
  }
})

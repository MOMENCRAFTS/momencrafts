import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { verifyToken } from '@/services/supabase'

/* ── Bilingual strings ─────────────────────────────────── */
const INSIGHTS_EN = [
  '"The most powerful technology disappears — it becomes so natural the user forgets they\'re interacting with a machine." — Momen Pharaon',
  '10 products. 5 industries. One vision: building the intelligent infrastructure of the MENA economy.',
  'Every product built from idea to launch by a single pair of hands — founder writes the code, designs the UX, and hits Deploy.',
  'cliniq.one — a full-stack telemedicine suite. 5 apps. Arabic-first AI intake. MOH compliant.',
  'UMMI · أمي — a private family finance OS designed with warmth and dignity for Saudi families. 28 modules.',
  'ROGER·AI — your AI Chief of Staff. Persistent memory, proactive briefings, bilingual AR/EN.',
  'RelayBot — a zero-install hardware device that types AI-enhanced text into any locked system.',
  '2 patents pending at USPTO. Products in beta. Founder ready for the right partnership.',
]
const INSIGHTS_AR = [
  'أقوى التقنيات هي تلك التي تختفي — تصبح طبيعية لدرجة أن المستخدم ينسى أنه يتفاعل مع آلة.',
  '١٠ منتجات. ٥ مجالات. رؤية واحدة: بناء البنية الذكية لاقتصاد المنطقة.',
  'كل منتج بُني من الفكرة إلى الإطلاق بيد واحدة — المؤسس نفسه يكتب الكود، يصمم التجربة، ويضغط Deploy.',
  'cliniq.one — منصة طب عن بُعد متكاملة، ٥ تطبيقات، ذكاء اصطناعي عربي أولاً.',
  'أمي — نظام مالي عائلي ذكي صمم بدفء وكرامة للعائلة السعودية. ٢٨ وحدة.',
  'رجر AI — مساعدك التنفيذي الصوتي. ذاكرة مستمرة. تقارير استباقية. عربي وإنجليزي.',
  'RelayBot — جهاز يربط أي لوحة مفاتيح بأي نظام. بلا تثبيت. بلا قيود.',
  'براءتا اختراع مقدمتان لدى USPTO. المنتجات في مرحلة التجريب. المؤسس جاهز للشراكة الصحيحة.',
]

const TYPE_LABELS: Record<string, string> = {
  HOUR: '1-Hour Access', WEEK: '7-Day Access', MONTH: '30-Day Access',
  STRATEGIC: 'Strategic Partner', PERMANENT: 'Permanent Access',
}

/* ── Particle canvas hook ──────────────────────────────── */
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const isMobile = window.innerWidth < 640
    const count = isMobile ? 18 : 55

    let W = 0, H = 0
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * 2000, y: Math.random() * 1200,
      r: Math.random() * 1.8 + 0.3,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.5 + 0.15, gold: Math.random() > 0.7,
    }))

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let raf: number
    let paused = false
    const draw = () => {
      if (paused) return
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.gold ? `rgba(200,169,110,${p.a})` : `rgba(240,235,227,${p.a * 0.4})`
        ctx.fill()
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x += W
        if (p.y < 0) p.y += H
      })
      raf = requestAnimationFrame(draw)
    }
    draw()

    const onVis = () => { paused = document.hidden; if (!paused) draw() }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [canvasRef])
}

/* ── NDA Overlay component ─────────────────────────────── */
interface NDAProps {
  token: string
  investorData: { name?: string; type: string; expires?: string | null; session: string }
  lang: 'ar' | 'en'
  onAccept: () => void
  onDecline: () => void
}
function NDAOverlay({ token, investorData, lang, onAccept, onDecline }: NDAProps) {
  const typeLabel = TYPE_LABELS[investorData.type] ?? investorData.type
  const expiryStr = investorData.expires
    ? new Date(investorData.expires).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Open'
  const masked = token.slice(0, 7) + '••••'
  const timestamp = new Date().toLocaleString('en-SA', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="nda-overlay visible" role="dialog" aria-modal="true">
      <div className="nda-card">
        <div className="nda-mark">✦</div>
        <div className="nda-title">CONFIDENTIALITY NOTICE · إشعار السرية</div>

        {investorData.name && (
          <div className="nda-prepared-for">
            <span className="nda-pf-label">PREPARED FOR · مُعدّ لـ</span>
            <span className="nda-pf-name">{investorData.name}</span>
            <span className="nda-pf-type">{typeLabel} · Expires {expiryStr}</span>
          </div>
        )}
        {investorData.type === 'HOUR' && (
          <div className="nda-hour-warning">
            ⚠️ This is a 1-hour timed session. Your access will expire automatically.
          </div>
        )}

        <p className="nda-body">
          The information you are about to access is proprietary and confidential to MomenCrafts
          and its founder. By proceeding, you agree not to disclose, reproduce, or distribute
          any part of this content without prior written consent.
        </p>
        <p className="nda-body-ar">
          المعلومات التي ستطّلع عليها ملكية خاصة وسرية لمؤمن كرافتس ومؤسسها.
          بالمتابعة، توافق على عدم الإفصاح أو النسخ أو التوزيع دون إذن كتابي مسبق.
        </p>

        <div className="nda-meta">
          <span className="nda-meta-key">Access key</span>
          <span className="nda-meta-val">{masked}</span>
          <span className="nda-meta-key">Access type</span>
          <span className="nda-meta-val">{typeLabel}</span>
          <span className="nda-meta-key">Expires</span>
          <span className="nda-meta-val">{expiryStr}</span>
          <span className="nda-meta-key">Date &amp; time</span>
          <span className="nda-meta-val">{timestamp}</span>
          <span className="nda-meta-key">Session</span>
          <span className="nda-meta-val">{investorData.session}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', color: 'var(--cream-mute)', textAlign: 'center', marginBottom: '1.25rem', letterSpacing: '.05em' }}>
          This acceptance is logged. · هذا القبول مسجّل.
        </p>

        <button className="nda-accept" onClick={onAccept}>
          {lang === 'ar' ? 'أوافق على الشروط — تابع ←' : 'I agree — Continue →'}
        </button>
        <button className="nda-decline" onClick={onDecline}>
          {lang === 'ar' ? 'رفض · العودة للبوابة' : 'Decline · Return to gate'}
        </button>
      </div>
    </div>
  )
}

/* ── Gate Screen ───────────────────────────────────────── */
export default function GateScreen() {
  const navigate = useNavigate()
  const { lang, toggleLang, setToken } = useAppStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticleCanvas(canvasRef)

  const [tokenVal, setTokenVal]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [inputState, setInputState] = useState<'default' | 'error' | 'success'>('default')
  const [insightIdx, setInsightIdx] = useState(0)
  const [showNDA, setShowNDA]       = useState(false)
  const [vaultOpen, setVaultOpen]   = useState(false)
  const [pendingData, setPendingData] = useState<{ token: string; name?: string; type: string; expires?: string | null; session: string } | null>(null)

  const insights = lang === 'ar' ? INSIGHTS_AR : INSIGHTS_EN

  // Insight rotator
  useEffect(() => {
    const t = setInterval(() => setInsightIdx(i => i + 1), 5000)
    return () => clearInterval(t)
  }, [])

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => document.getElementById('tokenInput')?.focus(), 300)
    return () => clearTimeout(t)
  }, [])

  // Update html dir on lang change
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const formatToken = useCallback((raw: string) => {
    let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (v.startsWith('MCR')) v = v.slice(3)
    if (v.length > 8) v = v.slice(0, 8)
    setTokenVal(v.length ? 'MCR-' + v : '')
    setInputState('default')
    setError('')
  }, [])

  const handleSubmit = async () => {
    if (!/^MCR-[A-Z0-9]{8}$/.test(tokenVal)) {
      setInputState('error')
      setError(lang === 'ar' ? 'صيغة غير صحيحة — MCR-XXXXXXXX' : 'Invalid format — MCR-XXXXXXXX')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await verifyToken(tokenVal)
      if (!data.valid) throw new Error(data.error ?? 'invalid')

      const session = Math.random().toString(36).slice(2, 10).toUpperCase()
      const tokenType = data.type ?? 'MONTH'
      const investorName = data.name ?? data.label ?? ''

      // Write mcr_* keys
      sessionStorage.setItem('mcr_session', session)
      sessionStorage.setItem('mcr_token',   tokenVal)
      sessionStorage.setItem('mcr_name',    investorName)
      sessionStorage.setItem('mcr_type',    tokenType)
      sessionStorage.setItem('mcr_expires', data.expires ?? '')

      setPendingData({ token: tokenVal, name: investorName, type: tokenType, expires: data.expires ?? null, session })
      setInputState('success')
      setShowNDA(true)
    } catch (e: unknown) {
      setInputState('error')
      setError(lang === 'ar' ? 'رمز وصول غير صحيح أو منتهي الصلاحية' : 'Invalid or expired access key')
    } finally {
      setLoading(false)
    }
  }

  const acceptNDA = async () => {
    if (!pendingData) return
    setShowNDA(false)
    setVaultOpen(true)
    // Finalise session
    sessionStorage.setItem('mcr_investor', '1')
    sessionStorage.setItem('mcr_ts', new Date().toISOString())
    setToken(pendingData.token, {
      name: pendingData.name ?? '',
      label: pendingData.name ?? '',
      type: pendingData.type,
      expires: pendingData.expires ?? null,
      session: pendingData.session,
      valid: true,
    })
    // Track NDA acceptance (fire-and-forget)
    fetch('https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/track-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pendingData.token, event: 'nda_accepted', sessionId: pendingData.session }),
    }).catch(() => {})
    setTimeout(() => navigate('/home'), 500)
  }

  const declineNDA = () => {
    setShowNDA(false)
    setInputState('default')
    setTokenVal('')
    setPendingData(null)
    ;['mcr_session','mcr_token','mcr_name','mcr_type','mcr_expires'].forEach(k => sessionStorage.removeItem(k))
  }

  const inputClass = `token-input${inputState === 'error' ? ' error' : inputState === 'success' ? ' success' : ''}`

  return (
    <>
      <canvas id="gate-canvas" ref={canvasRef} style={{ position:'fixed',inset:0,pointerEvents:'none',opacity:.22,zIndex:0 }} />

      <div className="gate-layout">
        {/* ── LEFT — Branding ── */}
        <div className="gate-brand">
          <div className="gate-brand-top">
            <div className="gate-logo-mark">✦</div>
            <div className="gate-logo-text">
              <span className="gate-logo-primary">MOMENCRAFTS</span>
              <span className="gate-logo-sub">{lang === 'ar' ? 'استوديو أفكار' : 'Idea Studio'}</span>
            </div>
          </div>

          <div className="gate-headline-block">
            <h1 className="gate-heading">
              {lang === 'ar' ? (
                <><em>أفكار</em><br/>تُصاغ لتصبح<br/>واقعًا.</>
              ) : (
                <>Ideas,<br/><em>Intelligently</em><br/>Crafted.</>
              )}
            </h1>
            <p className="gate-sub">
              {lang === 'ar'
                ? 'استوديو أفكار مؤسَّس بقيادة مومن فرعون · الرياض، المملكة العربية السعودية'
                : 'Founder-led idea studio · Riyadh, Kingdom of Saudi Arabia'}
            </p>
          </div>

          {/* Insights rotator */}
          <div className="gate-insight-box" aria-live="polite">
            <div className="gate-insight-label">{lang === 'ar' ? '— رؤية' : '— Insight'}</div>
            <p className="gate-insight-text" style={{ transition: 'opacity .3s' }}>
              {insights[insightIdx % insights.length]}
            </p>
            <div className="gate-insight-dots">
              {insights.map((_, i) => (
                <span key={i}
                  className={`insight-dot${i === insightIdx % insights.length ? ' active' : ''}`}
                  onClick={() => setInsightIdx(i)} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="gate-stats">
            {[
              { num: '10', ar: 'منتجات', en: 'PRODUCTS' },
              { num: '5',  ar: 'مجالات', en: 'INDUSTRIES' },
              { num: '2',  ar: 'براءة اختراع', en: 'PATENTS' },
              { num: '2026', ar: 'تأسست', en: 'FOUNDED' },
            ].map(s => (
              <div className="gate-stat" key={s.en}>
                <span className="gate-stat-num">{s.num}</span>
                <span className="gate-stat-label">{lang === 'ar' ? s.ar : s.en}</span>
              </div>
            ))}
          </div>

          <div className="gate-brand-footer">
            <span className="gate-location">Riyadh · Kingdom of Saudi Arabia</span>
            <span className="gate-year">© 2026 MomenCrafts</span>
          </div>
        </div>

        {/* ── RIGHT — Token Entry ── */}
        <div className="gate-entry" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          <button className="lang-toggle" onClick={toggleLang} aria-label="Toggle language">
            <span>{lang === 'ar' ? '🇬🇧 EN' : '🇸🇦 AR'}</span>
          </button>

          <div className="token-card">
            <div className="token-card-badge">
              <span>{lang === 'ar' ? 'وصول محدود' : 'RESTRICTED ACCESS'}</span>
            </div>

            <h2 className="token-card-title">
              {lang === 'ar' ? <><span>رمز</span><br/><em>الوصول</em></> : <><span>Access</span><br/><em>Key</em></>}
            </h2>

            <p className="token-card-sub">
              {lang === 'ar'
                ? 'أدخل رمز الوصول الخاص بك (MCR-XXXXXXXX) للاطلاع على المحفظة الكاملة وفرص الشراكة.'
                : 'Enter your access key (MCR-XXXXXXXX) to explore the full portfolio and partnership opportunities.'}
            </p>

            <label className="token-field-label" htmlFor="tokenInput">
              {lang === 'ar' ? 'رمز الوصول' : 'ACCESS KEY'}
            </label>

            <div className="token-input-wrap">
              <input
                id="tokenInput"
                type="text"
                className={inputClass}
                placeholder="MCR-XXXXXXXX"
                maxLength={12}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={tokenVal}
                onChange={e => formatToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                aria-label="Access token"
                inputMode="text"
              />
            </div>

            <div className="token-error" role="alert">{error}</div>

            <button
              className={`token-submit${loading ? ' loading' : ''}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              <div className="btn-spinner" />
              <span className="btn-text">{lang === 'ar' ? 'دخول ←' : 'Enter →'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* NDA Overlay */}
      {showNDA && pendingData && (
        <NDAOverlay
          token={pendingData.token}
          investorData={pendingData}
          lang={lang}
          onAccept={acceptNDA}
          onDecline={declineNDA}
        />
      )}

      {/* Vault transition overlay */}
      {vaultOpen && <div className="vault-overlay open open-2" aria-hidden="true" />}
    </>
  )
}

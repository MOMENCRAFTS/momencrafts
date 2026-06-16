import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { verifyToken } from '@/services/supabase'
import { CoFounderWelcome } from '@/components/CoFounderWelcome'
import '@/styles/gate.css'

/* Co-founder token types → celebration screen */
const COFOUNDER_TYPES = new Set(['PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])

/* ── Bilingual strings ─────────────────────────────────── */
const INSIGHTS_EN = [
  'MomenCrafts & Co — the "Co" is earned. When your contribution ships, your name joins the registry.',
  '"The most powerful technology disappears — it becomes so natural the user forgets they are interacting with a machine." — Momen Pharaon',
  '10 products. 5 industries. One founder-led studio building practical intelligence for the region — with the right co-builders.',
  'Every product started as a founder-built system — code, UX, architecture, hardware concepts, and deployment shaped by one vision.',
  'cliniq.one — a full-stack telemedicine suite with 5 apps, Arabic-first intake, and Saudi healthcare workflows in mind.',
  'UMMI · أمي — a private family finance OS designed with warmth, dignity, and control for Saudi families.',
  'ROGER·AI — an AI Chief of Staff concept for memory, proactive briefings, and bilingual executive workflows.',
  'RelayBot — a zero-install hardware bridge that brings AI-enhanced text into locked or restricted systems.',
  'Every useful bug report, feature request, intro, or idea can become shipped value — and credited contribution.',
  '2 patent filings. Products in early beta and prototype stages. Founder ready for the right co-builders.',
]
const INSIGHTS_AR = [
  'مومن كرافتس اند كو — كلمة "Co" تُكتسب. عندما تتحول مساهمتك إلى منتج، يُضاف اسمك إلى السجل.',
  '«أقوى التقنيات هي التي تختفي — تصبح طبيعية لدرجة أن المستخدم ينسى أنه يتفاعل مع آلة.» — مومن فرعون',
  '١٠ منتجات. ٥ مجالات. استوديو واحد يقوده المؤسس لبناء ذكاء عملي للمنطقة — مع الشركاء الصحيحين.',
  'كل منتج بدأ كنظام بناه المؤسس — كود، تجربة مستخدم، بنية تقنية، أفكار عتادية، ونشر تقوده رؤية واحدة.',
  'cliniq.one — منصة طب عن بُعد متكاملة تضم ٥ تطبيقات، إدخال طبي عربي أولاً، وتجربة مصممة لسير العمل الصحي في السعودية.',
  'أمي — نظام مالي عائلي خاص صُمم بدفء وكرامة وتحكم للعائلة السعودية.',
  'ROGER·AI — مفهوم مساعد تنفيذي ذكي للذاكرة المستمرة، التقارير الاستباقية، وسير العمل بالعربية والإنجليزية.',
  'RelayBot — جسر عتادي بلا تثبيت ينقل النصوص المحسّنة بالذكاء الاصطناعي إلى الأنظمة المقيدة أو المغلقة.',
  'كل بلاغ مفيد، طلب ميزة، تعريف بجهة، أو فكرة يمكن أن تتحول إلى قيمة منشورة — ومساهمة موثقة.',
  'ملفّا براءة اختراع قيد التسجيل. منتجات في مراحل التجريب والنماذج الأولية. والمؤسس جاهز للشركاء الصحيحين.',
]

const TYPE_LABELS: Record<string, string> = {
  HALF_HOUR: '30-Minute Access',
  HOUR: '1-Hour Access', WEEK: '7-Day Access', MONTH: '30-Day Access',
  '3MONTH': '90-Day Access',
  STRATEGIC: 'Strategic Partner', COFOUNDER: 'Co-Founder',
  PERMANENT: 'Permanent Access', FOUNDER: 'Founder',
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
        <div className="nda-title">CO-BUILDER AGREEMENT · اتفاقية البناء المشترك</div>

        {investorData.name && (
          <div className="nda-prepared-for">
            <span className="nda-pf-label">PREPARED FOR · مُعدّ لـ</span>
            <span className="nda-pf-name">{investorData.name}</span>
            <span className="nda-pf-type">{typeLabel} · Expires {expiryStr}</span>
          </div>
        )}
        {investorData.type === 'HOUR' && (
          <div className="nda-hour-warning">
            {lang === 'ar' ? '⚠️ هذه جلسة محددة بساعة واحدة. سينتهي الوصول تلقائياً.' : '⚠️ This is a timed 1-hour session. Access expires automatically.'}
          </div>
        )}

        <p className="nda-body">
          You are about to access proprietary and confidential MomenCrafts
          & Co material. By continuing, you agree not to disclose, copy, reproduce, or distribute
          any part of this content without prior written consent. In return, your feedback, ideas,
          introductions, and suggestions may shape our products. If a contribution is approved and shipped,
          you may earn recognition in the & Co Registry. Legal, commercial, or equity rights require a separate written agreement.
        </p>
        <p className="nda-body-ar">
          ستطّلع على مواد خاصة وسرية تابعة لمومن كرافتس اند كو.
          بالمتابعة، توافق على عدم الإفصاح أو النسخ أو إعادة النشر أو التوزيع دون موافقة خطية مسبقة.
          في المقابل، قد تُسهم ملاحظاتك وأفكارك وتعريفاتك واقتراحاتك في تشكيل منتجاتنا. وإذا اعتُمدت مساهمة
          وتحولت إلى منتج منشور، فقد تحصل على توثيق في سجل اند كو. أي حقوق قانونية أو تجارية أو ملكية تتطلب اتفاقية خطية منفصلة.
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
          {lang === 'ar' ? 'تم تسجيل هذا القبول.' : 'This acceptance is logged.'}
        </p>

        <button className="nda-accept" onClick={onAccept}>
          {lang === 'ar' ? 'أوافق — تابع ←' : 'I agree — Continue →'}
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
  const [showNDA,        setShowNDA]        = useState(false)
  const [vaultOpen,      setVaultOpen]      = useState(false)
  const [showCoFounder,  setShowCoFounder]  = useState(false)
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

  // Auto-fill token from URL param (?token=MCR-XXXXXXXX) — from Request Access flow
  const autoSubmitRef = useRef(false)
  useEffect(() => {
    if (autoSubmitRef.current) return
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken && /^MCR-[A-Z0-9]{8}$/.test(urlToken.toUpperCase())) {
      autoSubmitRef.current = true
      setTokenVal(urlToken.toUpperCase())
      setInputState('default')
      // Clean URL without reload
      window.history.replaceState({}, '', '/')
      // Auto-submit after brief delay so user sees the token filled in
      setTimeout(() => {
        document.getElementById('tokenInput')?.focus()
        // Trigger submit programmatically
        const submitBtn = document.querySelector('.token-submit') as HTMLButtonElement
        submitBtn?.click()
      }, 600)
    }
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

    // Track NDA acceptance (fire-and-forget)
    fetch('https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/track-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pendingData.token, event: 'nda_accepted', sessionId: pendingData.session }),
    }).catch(() => {})

    // Co-founder celebration screen — DON'T setToken yet or GateGuard will navigate away immediately
    if (COFOUNDER_TYPES.has(pendingData.type)) {
      setShowCoFounder(true)
    } else {
      // Regular investors → finalise session then vault flash
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
      setVaultOpen(true)
      setTimeout(() => navigate('/home'), 500)
    }
  }

  const handleCoFounderEnter = () => {
    setShowCoFounder(false)
    // NOW finalise session — setToken triggers GateGuard to navigate to /home
    if (pendingData) {
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
    }
    setVaultOpen(true)
    setTimeout(() => navigate('/home'), 800)
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
              <span className="gate-logo-co">{lang === 'ar' ? 'اند كو' : '& Co'}</span>
            </div>
          </div>

          <div className="gate-headline-block">
            <h1 className="gate-heading">
              {lang === 'ar' ? (
                <>ابنِ<br/><em>معنا.</em></>
              ) : (
                <>Build<br/><em>With Us.</em></>
              )}
            </h1>
            <p className="gate-sub">
              {lang === 'ar'
                ? 'استوديو بناء مشترك يقوده المؤسس · الرياض، المملكة العربية السعودية'
                : 'A founder-led co-builder studio · Riyadh, Saudi Arabia'}
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
              { num: '2',  ar: 'ملفات براءة', en: 'PATENT FILINGS' },
              { num: '2026', ar: 'التأسيس', en: 'FOUNDED' },
            ].map(s => (
              <div className="gate-stat" key={s.en}>
                <span className="gate-stat-num">{s.num}</span>
                <span className="gate-stat-label">{lang === 'ar' ? s.ar : s.en}</span>
              </div>
            ))}
          </div>

          <div className="gate-brand-footer">
            <span className="gate-location">Riyadh · Kingdom of Saudi Arabia</span>
            <span className="gate-year">© 2026 MomenCrafts & Co</span>
          </div>
        </div>

        {/* ── RIGHT — Token Entry ── */}
        <div className="gate-entry" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          <button className="lang-toggle" onClick={toggleLang} aria-label="Toggle language">
            <span>{lang === 'ar' ? '🇬🇧 EN' : '🇸🇦 AR'}</span>
          </button>

          <div className="token-card">
            <div className="token-card-badge">
              <span>{lang === 'ar' ? 'دخول الشركاء البنّائين' : 'CO-BUILDER ACCESS'}</span>
            </div>

            <h2 className="token-card-title">
              {lang === 'ar' ? <><span>رمز</span><br/><em>الوصول</em></> : <><span>Access</span><br/><em>Key</em></>}
            </h2>

            <p className="token-card-sub">
              {lang === 'ar'
                ? 'أدخل رمز الوصول للدخول إلى الاستوديو. قد تشكّل رؤيتك ما نبنيه بعد ذلك.'
                : 'Enter your access key to enter the studio. Your perspective may shape what we build next.'}
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

      {/* Co-Founder Welcome Overlay — PERMANENT / STRATEGIC tokens only */}
      {showCoFounder && pendingData && (
        <CoFounderWelcome
          name={pendingData.name}
          lang={lang}
          onEnter={handleCoFounderEnter}
        />
      )}

      {/* Vault transition overlay */}
      {vaultOpen && <div className="vault-overlay open open-2" aria-hidden="true" />}
    </>
  )
}

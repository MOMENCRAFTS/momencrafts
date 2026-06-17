import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import '@/styles/home.css'

// ── WhatsApp track messages ──
const TRACKS: Record<string, string> = {
  affiliation: 'مرحباً، أنا مهتم بالتابعية مع MomenCrafts — لدي شبكة وصول وأريد معرفة المزيد.',
  adoption:    'مرحباً، أريد تبني أحد منتجات MomenCrafts في مؤسستي — يسعدني نقاش التفاصيل.',
  teamup:      'مرحباً، أريد التعاون مع MomenCrafts كشريك استراتيجي / تقني — لدي ما أقدمه.'
}
function prefillWhatsApp(track: string) {
  const msg = encodeURIComponent(TRACKS[track] || '')
  window.open('https://wa.me/966535271122?text=' + msg, '_blank')
}

// ── Analytics helper ──
function trackInv(event: string, data?: Record<string, unknown>) {
  const token = sessionStorage.getItem('mcr_token')
  const sid   = sessionStorage.getItem('mcr_session')
  fetch('https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, event, sessionId: sid, ...data })
  }).catch(() => {})
}

// badge display labels
const BADGE_LABELS: Record<string, string> = {
  'inv-badge-live': 'LIVE', 'inv-badge-beta': 'BETA',
  'inv-badge-dev': 'IN DEV', 'inv-badge-prototype': 'PROTOTYPE', 'inv-badge-patent': 'PATENT'
}

// ── Investor accordion card ──
function InvCard({ id, name, tagline, cat, badge, desc, details, demoLink, demoLabel }: {
  id: string; name: string; tagline: string; cat: string;
  badge: string; desc: string;
  details: { label: string; value: string }[];
  demoLink?: string; demoLabel?: string;
}) {
  const [open, setOpen] = useState(false)
  const toggle = () => {
    setOpen(o => !o)
    trackInv('card_expand', { product_id: id, section: 'portfolio', action: open ? 'collapse' : 'expand' })
  }
  return (
    <div className="inv-product-card" id={`inv-card-${id}`}>
      <div className="inv-product-card-header" onClick={toggle}>
        <div className="inv-ph-left">
          <div>
            <div className="inv-product-name">{name}</div>
            <div className="inv-product-tagline">{tagline}</div>
          </div>
        </div>
        <div className="inv-ph-badges">
          <span className="inv-card-cat">{cat}</span>
          <span className={`inv-badge ${badge}`}>{BADGE_LABELS[badge] ?? badge}</span>
          <span className="inv-toggle-icon" id={`inv-icon-${id}`} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(.2,0,0,1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
      </div>
      <div className={`inv-product-card-body${open ? ' open' : ''}`} id={`inv-body-${id}`}>
        <div className="inv-product-card-body-inner">
          <p className="inv-body-desc">{desc}</p>
          <div className="inv-detail-grid">
            {details.map(d => (
              <div className="inv-detail-item" key={d.label}>
                <div className="inv-detail-label">{d.label}</div>
                <div className="inv-detail-value">{d.value}</div>
              </div>
            ))}
          </div>
          {demoLink && (
            <a href={demoLink} target="_blank" rel="noopener noreferrer"
               className="inv-demo-link"
               onClick={() => trackInv('demo_click', { product: id })}>
              {demoLabel}
            </a>
          )}
          {/* ── Premium Feedback Panel ── */}
          <FeedbackPanel productId={id} productName={name} />
        </div>
      </div>
    </div>
  )
}

// ── Co-Founder Exclusive Section ──────────────────────────
const BALLOT_PRODUCTS = [
  { id: 'cliniq',   label: 'CLINIQ.ONE' },
  { id: 'ummi',     label: 'UMMI · أمي' },
  { id: 'roger',    label: 'ROGER·AI' },
  { id: 'qadaa',    label: 'QADAA · قضاء' },
  { id: 'muscle',   label: 'MUSCLE HUSTLE' },
  { id: 'aqar',     label: 'AQAR · عقار' },
  { id: 'relay',    label: 'RELAYBOT' },
  { id: 'sabha',    label: 'SABHA · سبحة' },
  { id: 'tdc',      label: 'TURBO DRONE CIRCUIT' },
  { id: 'edgetack', label: 'EDGE TACK' },
]
const SUPABASE_FN = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'

function CoFounderExclusive({ type, name, token }: { type: string; name: string; token: string }) {
  const [ballot, setBallot]         = useState<string[]>([])
  const [ballotDone, setBallotDone] = useState(false)
  const [ballotLoading, setBallotLoading] = useState(false)

  const toggleBallot = (id: string) => {
    setBallot(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const submitBallot = async () => {
    if (ballot.length < 3) return
    setBallotLoading(true)
    try {
      await fetch(`${SUPABASE_FN}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          productId: '_ballot',
          feedbackType: 'ballot',
          payload: { ranking: ballot },
        }),
      })
      setBallotDone(true)
    } catch { /* silent */ }
    setBallotLoading(false)
  }

  const registeredSince = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  return (
    <section id="inv-cofounder" data-section="cofounder" className="inv-cofounder-section">
      <div className="inv-cf-inner">
        {/* Header */}
        <div className="inv-cf-header">
          <span className="inv-cf-star">✦</span>
          <div>
            <div className="inv-cf-label">CO-FOUNDER ACCESS · المؤسسون المشاركون</div>
            <h2 className="inv-cf-title">& Co Registry</h2>
          </div>
          <span className="inv-cf-type-badge">{type}</span>
        </div>

        {/* Cards grid */}
        <div className="inv-cf-grid">

          {/* Registry card */}
          <div className="inv-cf-card">
            <div className="inv-cf-card-header">
              <span className="inv-cf-card-ico">📋</span>
              <span className="inv-cf-card-title">Your Registry Entry</span>
            </div>
            <div className="inv-cf-registry-name">{name}</div>
            <div className="inv-cf-registry-meta">
              <div className="inv-cf-registry-row">
                <span>Status</span>
                <span><span className="inv-cf-status-dot"/>Active</span>
              </div>
              <div className="inv-cf-registry-row">
                <span>Access Tier</span>
                <span>{type}</span>
              </div>
              <div className="inv-cf-registry-row">
                <span>Registered</span>
                <span>{registeredSince}</span>
              </div>
              <div className="inv-cf-registry-row">
                <span>Token</span>
                <span style={{ fontFamily: 'monospace', fontSize: '.65rem', color: '#6a5c3e' }}>
                  MCR-••••{token.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Roadmap card */}
          <div className="inv-cf-card">
            <div className="inv-cf-card-header">
              <span className="inv-cf-card-ico">🗺</span>
              <span className="inv-cf-card-title">Co-Builder Roadmap</span>
            </div>
            <div className="inv-cf-roadmap-steps">
              <div className="inv-cf-step">
                <div className="inv-cf-step-dot done"/>
                <div className="inv-cf-step-text">
                  <strong>Portal Access Granted</strong>
                  Full investor view + feedback tools
                </div>
              </div>
              <div className="inv-cf-step">
                <div className="inv-cf-step-dot next"/>
                <div className="inv-cf-step-text">
                  <strong>Shape the Roadmap</strong>
                  Ballot + product feedback below each card
                </div>
              </div>
              <div className="inv-cf-step">
                <div className="inv-cf-step-dot future"/>
                <div className="inv-cf-step-text">
                  <strong>Contribution Review</strong>
                  Ideas and intros reviewed quarterly
                </div>
              </div>
              <div className="inv-cf-step">
                <div className="inv-cf-step-dot future"/>
                <div className="inv-cf-step-text">
                  <strong>& Co Credit</strong>
                  Validated contributions logged publicly
                </div>
              </div>
            </div>
          </div>

          {/* Direct contact card */}
          <div className="inv-cf-card">
            <div className="inv-cf-card-header">
              <span className="inv-cf-card-ico">📡</span>
              <span className="inv-cf-card-title">Direct Line · خط مباشر</span>
            </div>
            <div className="inv-cf-contact-name">Momen Pharaon</div>
            <div className="inv-cf-contact-role">مومن فرعون · Founder & Engineer · MomenCrafts</div>
            <div className="inv-cf-contact-btns">
              <a
                href={`https://wa.me/966535271122?text=${encodeURIComponent(`مرحباً مومن — أنا ${name} (${type}). أريد التحدث عن المشاريع.`)}`}
                target="_blank" rel="noopener"
                className="inv-cf-btn inv-cf-btn--wa"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp Momen directly
              </a>
              <a
                href="mailto:momen@momencrafts.com"
                className="inv-cf-btn inv-cf-btn--email"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                momen@momencrafts.com
              </a>
            </div>
          </div>
        </div>

        {/* Priority Ballot */}
        <div className="inv-cf-ballot">
          <div className="inv-cf-ballot-header">
            <span style={{ fontSize: '1.1rem' }}>🗳</span>
            <span className="inv-cf-ballot-title">Priority Ballot · ما الذي نبنيه أولاً؟</span>
            <span className="inv-cf-ballot-sub">Click to rank — first click = top priority</span>
          </div>
          {ballotDone ? (
            <div className="inv-cf-ballot-success">
              ✓ Ballot submitted — your product priorities have been logged. Thank you.
            </div>
          ) : (
            <>
              <div className="inv-cf-ballot-grid">
                {BALLOT_PRODUCTS.map(p => {
                  const rank = ballot.indexOf(p.id)
                  const isRanked = rank >= 0
                  return (
                    <button
                      key={p.id}
                      className={`inv-cf-ballot-chip${isRanked ? ' ranked' : ''}`}
                      onClick={() => toggleBallot(p.id)}
                      id={`ballot-${p.id}`}
                    >
                      {isRanked && <span className="inv-cf-ballot-rank">{rank + 1}</span>}
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  className="inv-cf-ballot-submit"
                  onClick={submitBallot}
                  disabled={ballot.length < 3 || ballotLoading}
                  id="ballot-submit-btn"
                >
                  {ballotLoading ? 'Submitting...' : `Submit Priorities (${ballot.length}/10 selected)`}
                </button>
                {ballot.length > 0 && ballot.length < 3 && (
                  <span style={{ fontFamily: 'monospace', fontSize: '.65rem', color: '#6a5c3e' }}>
                    Select at least 3 to submit
                  </span>
                )}
                {ballot.length > 0 && (
                  <button
                    onClick={() => setBallot([])}
                    style={{ background: 'none', border: 'none', color: '#6a5c3e', cursor: 'pointer', fontFamily: 'monospace', fontSize: '.65rem' }}
                  >Clear</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Particle canvas hook ──
function useParticleCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const mobile = window.innerWidth < 640
    const COUNT  = mobile ? 15 : 50
    const pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * 2000, y: Math.random() * 1200,
      r: Math.random() * 1.5 + .4,
      vx: (Math.random() - .5) * .15,
      vy: (Math.random() - .5) * .15,
      a: Math.random() * .45 + .1
    }))
    let W = 0, H = 0, raf = 0
    const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const draw = () => {
      if ((window as any).__particlePaused) { raf = requestAnimationFrame(draw); return }
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,169,110,${p.a})`; ctx.fill()
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x += W; if (p.y < 0) p.y += H
      })
      raf = requestAnimationFrame(draw)
    }; draw()
    const onVis = () => { (window as any).__particlePaused = document.hidden; if (!document.hidden) draw() }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis) }
  }, [ref])
}

// ── Reveal on scroll hook ──
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }), { threshold: .08 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ── Animated count-up on scroll ──
function CountUp({ end, duration = 1600, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - t, 4) // easeOutQuart
          setCount(Math.round(ease * end))
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [end, duration])
  return <span ref={ref}>{count}{suffix}</span>
}

// ── Watermark canvas ──
function useWatermark(name: string, token: string) {
  useEffect(() => {
    const canvas = document.getElementById('inv-watermark') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight
      ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(-Math.PI / 6)
      ctx.font = '13px JetBrains Mono, monospace'; ctx.fillStyle = 'rgba(200,169,110,0.038)'
      const text = `${name}  ·  ${token}  ·  ${new Date().toLocaleDateString('en-GB')}`
      for (let y = -canvas.height; y < canvas.height * 2; y += 80)
        for (let x = -canvas.width * 1.5; x < canvas.width * 2; x += 320)
          ctx.fillText(text, x, y)
      ctx.restore()
    }
    draw(); window.addEventListener('resize', draw)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        canvas.style.opacity = '.05'; setTimeout(() => { canvas.style.opacity = '0' }, 300)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('resize', draw); document.removeEventListener('keydown', onKey) }
  }, [name, token])
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { investorData, clearSession } = useAppStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const token   = sessionStorage.getItem('mcr_token')   || ''
  const name    = sessionStorage.getItem('mcr_name')    || 'Partner'
  const type    = sessionStorage.getItem('mcr_type')    || 'MONTH'
  const expires = sessionStorage.getItem('mcr_expires') || ''
  const raw     = token; const masked = raw.length > 4 ? 'MCR-••••' + raw.slice(-4) : raw

  const TYPE_LABELS: Record<string, string> = {
    HOUR: '1-Hour Access', WEEK: '7-Day Access', MONTH: '30-Day Access',
    '3MONTH': '90-Day Access',
    STRATEGIC: 'Strategic Partner', COFOUNDER: 'Co-Founder',
    PERMANENT: 'Permanent Access', FOUNDER: 'Founder',
  }
  let typeLabel = TYPE_LABELS[type] || type
  if (expires) {
    const d = new Date(expires)
    if (!isNaN(d.getTime())) typeLabel += ' · Exp ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const [countdown, setCountdown]   = useState('')
  const [expired, setExpired]       = useState(false)
  const [navOpen, setNavOpen]       = useState(false)
  const [scrollPct, setScrollPct]   = useState(0)
  const [barVisible, setBarVisible] = useState(true)
  const barHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── & Co live data ──
  const [coData, setCoData] = useState<{
    journal: any[]; downloads: any[]; kpis: any[]; progress: any[];
    impact: { bugs_reported: number; suggestions: number; ideas_shipped: number; co_builders: number };
    board: any[]; registry: any[];
  } | null>(null)

  useEffect(() => {
    if (!investorData) return
    fetch('https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/co-data?r=all')
      .then(r => r.json())
      .then(d => setCoData(d))
      .catch(() => {})
  }, [investorData])

  useParticleCanvas(canvasRef)
  useReveal()
  useWatermark(name, token)

  // Countdown timer
  useEffect(() => {
    if (!expires || type !== 'HOUR') return
    const expDate = new Date(expires)
    const tick = () => {
      const msLeft = expDate.getTime() - Date.now()
      if (msLeft <= 0) { setExpired(true); trackInv('session_expired', {}); return }
      const m = Math.floor(msLeft / 60000)
      const s = Math.floor((msLeft % 60000) / 1000)
      setCountdown(`${m}:${String(s).padStart(2, '0')}`)
      setTimeout(tick, 1000)
    }; tick()
  }, [expires, type])

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const scrolled = document.documentElement.scrollTop
      const total    = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(total > 0 ? scrolled / total * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-hide investor bar after 4 s; reappear on hover/touch near top
  useEffect(() => {
    const scheduleHide = () => {
      if (barHideTimer.current) clearTimeout(barHideTimer.current)
      barHideTimer.current = setTimeout(() => setBarVisible(false), 4000)
    }
    scheduleHide()
    const peekZone = 60 // px from top that triggers re-show
    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY < peekZone) {
        setBarVisible(true)
        scheduleHide()
      }
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientY < peekZone) {
        setBarVisible(true)
        scheduleHide()
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    return () => {
      if (barHideTimer.current) clearTimeout(barHideTimer.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchstart', onTouchStart)
    }
  }, [])

  // Section view tracking + active nav
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const sec = (e.target as HTMLElement).dataset.section
        if (e.isIntersecting && sec) trackInv('section_view', { section: sec })
      })
    }, { threshold: .2 })
    document.querySelectorAll('[data-section]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const handleExit = () => {
    const keys = ['mcr_investor','mcr_token','mcr_session','mcr_name','mcr_type','mcr_expires','mcr_email','mcr_ts']
    keys.forEach(k => sessionStorage.removeItem(k))
    trackInv('exit_clicked', {})
    clearSession()
    navigate('/')
  }

  const footerExpiry = expires ? (() => {
    const d = new Date(expires)
    return isNaN(d.getTime()) ? '' : 'Access expires: ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  })() : ''

  return (
    <div className="home-root" dir="rtl" lang="ar" id="home-root">
      {/* ── Particle canvas ── */}
      <canvas ref={canvasRef} id="hero-canvas" aria-hidden="true"
        style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:.35, zIndex:0 }} />

      {/* ── Investor Bar ── */}
      <div
        id="investor-bar"
        className={`visible${barVisible ? '' : ' inv-bar-hidden'}`}
        onMouseEnter={() => { setBarVisible(true); if (barHideTimer.current) clearTimeout(barHideTimer.current) }}
        onMouseLeave={() => { barHideTimer.current = setTimeout(() => setBarVisible(false), 2000) }}
      >
        <div className="inv-bar-left">
          <span className="inv-bar-lock">🔒</span>
          <span id="inv-name-display">{name}</span>
          <span className="inv-sep">|</span>
          <span id="inv-token-display" className="inv-bar-token">{masked}</span>
          <span className="inv-sep">|</span>
          <span id="inv-type-display">{typeLabel}</span>
          <span className="inv-sep">|</span>
          {/* Co-founder badge vs NDA tick */}
          {['PERMANENT','STRATEGIC','COFOUNDER','FOUNDER'].includes(type) ? (
            <span className="inv-bar-cofound-badge">✦ &amp; Co</span>
          ) : (
            <span className="inv-bar-nda">✓ &amp; Co</span>
          )}
          {countdown && type === 'HOUR' && (
            <span id="inv-expiry-badge" className="inv-expiry-badge" style={{ animation: countdown < '10:00' ? 'pulse 1.2s infinite' : 'none' }}>
              ⏱ <span id="inv-countdown">{countdown}</span>
            </span>
          )}
        </div>
        <nav id="inv-section-nav" style={{ display:'flex', gap:'1.2rem', fontSize:'.66rem' }}>
          {[['#inv-traction','Our Story'],['#inv-portfolio','Portfolio'],
            ...(['PERMANENT','STRATEGIC','COFOUNDER','FOUNDER'].includes(type) ? [['#inv-cofounder','& Co Hub']] : []),
            ['#inv-vision','Vision'],['#inv-downloads','Test & Shape'],['#inv-journal','Journal'],['#inv-traction-live','Progress'],['#inv-cobuilder','Board'],
            ...(!['PERMANENT','STRATEGIC','COFOUNDER','FOUNDER'].includes(type) ? [['#inv-letsbuild','Become & Co →']] : []),
          ].map(([href, label]) => (
            <a key={href} href={href} style={{ color: label.includes('→') || label.includes('Hub') ? '#C8A96E' : '#a09070', textDecoration:'none', fontWeight: label.includes('→') || label.includes('Hub') ? 700 : 400 }}>{label}</a>
          ))}
        </nav>
        <div className="inv-bar-actions">
          <button onClick={handleExit} className="inv-bar-exit">Exit</button>
          {!['PERMANENT','STRATEGIC','COFOUNDER','FOUNDER'].includes(type) && (
            <a href="#inv-letsbuild" className="inv-bar-cta">Become &amp; Co →</a>
          )}
        </div>
      </div>

      {/* ── Scroll progress bar ── */}
      <div id="inv-scroll-bar" style={{ display:'block' }}>
        <div id="inv-scroll-fill" style={{ width: `${scrollPct}%` }} />
      </div>

      {/* ── NAV ── */}
      <nav id="nav" className={navOpen ? 'nav-open' : ''} style={{ top: barVisible ? '52px' : '0', transition: 'top .38s cubic-bezier(.4,0,.2,1)' }}>
        <div className="nav-inner">
          <a href="#hero" className="nav-logo" id="nav-logo-ar">
            <img src="/logo.png" alt="مؤمن كرافتس" className="nav-logo-img" />
            <span className="logo-text">مومن كرافتس</span>
          </a>
          <ul className="nav-links" id="nav-links" role="list">
            <li><a href="#contact" className="nav-cta">تواصل معنا</a></li>
            <li><a href="#about">عن الاستوديو</a></li>
            <li><a href="#products">المنتجات</a></li>
          </ul>
          <button className="nav-hamburger" id="nav-hamburger" aria-label="القائمة"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ══════════════════════════
          HERO
      ══════════════════════════ */}
      <section id="hero" className="hero" style={{ paddingTop: barVisible ? '104px' : '52px', transition: 'padding-top .38s cubic-bezier(.4,0,.2,1)' }}>
        <div className="hero-ember" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-eyebrow reveal">
            <span className="eyebrow-dot" />
            مومن كرافتس اند كو · الرياض، السعودية
          </div>
          <h1 className="hero-heading reveal delay-100">
            بعناية<br/><em>مصممة معكم</em>
          </h1>
          <p className="hero-byline reveal delay-200">MomenCrafts & Co</p>
          <p className="hero-sub reveal delay-300">
            ١٠ منتجات. ٥ مجالات.<br/>استوديو واحد يحوّل الأفكار إلى أنظمة ومنتجات قابلة للتجربة.
          </p>
          <div className="hero-actions reveal delay-400">
            <a href="#products" className="btn btn-primary">تصفح أعمالنا <span className="btn-arrow">←</span></a>
            <a href="#about" className="btn btn-ghost">عن الاستوديو</a>
          </div>
          <div className="hero-stats reveal delay-500">
            <div className="stat"><span className="stat-num">١٠</span><span className="stat-label">منتجات</span></div>
            <div className="stat-divider">·</div>
            <div className="stat"><span className="stat-num">٥</span><span className="stat-label">مجالات</span></div>
            <div className="stat-divider">·</div>
            <div className="stat"><span className="stat-num">١</span><span className="stat-label">رؤية واحدة</span></div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          PRODUCTS (10 cards)
      ══════════════════════════ */}
      <section id="products" className="products">
        <div className="container">
          <div className="section-label reveal">أعمالنا</div>
          <h2 className="section-title reveal delay-100">المحفظة</h2>
          <p className="section-sub reveal delay-200">١٠ منتجات صُممت بعناية — من الفكرة إلى النموذج، ومن النموذج إلى منتج قابل للتجربة.</p>
          <div className="products-grid">

            {/* ROGER·AI — Neo-retro military NASA Mission Control card */}
            <article className="product-card product-card--roger featured reveal delay-100" id="card-roger-ar" data-accent="roger">

              {/* ── Gunmetal splash bg texture ── */}
              <div className="roger-bg" aria-hidden="true" />

              {/* ── CRT scanlines + sci-fi corner brackets ── */}
              <svg className="roger-hud-svg" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Scanlines */}
                {[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,144,148,152,156,160,164,168,172,176,180,184,188,192,196,200,204,208,212,216,220].map(y => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
                ))}
                {/* Top-left corner bracket */}
                <path d="M8 24 L8 8 L28 8" stroke="#d4a044" strokeWidth="1.2" opacity="0.5"/>
                {/* Top-right corner bracket */}
                <path d="M252 8 L272 8 L272 24" stroke="#d4a044" strokeWidth="1.2" opacity="0.5"/>
                {/* Bottom-left corner bracket */}
                <path d="M8 196 L8 212 L28 212" stroke="#d4a044" strokeWidth="1.2" opacity="0.5"/>
                {/* Bottom-right corner bracket */}
                <path d="M252 212 L272 212 L272 196" stroke="#d4a044" strokeWidth="1.2" opacity="0.5"/>
                {/* Amber ember sparks */}
                <circle cx="12"  cy="180" r="1.2" fill="#d4a044" opacity="0.6"/>
                <circle cx="18"  cy="195" r="0.8" fill="#a84832" opacity="0.5"/>
                <circle cx="268" cy="185" r="1"   fill="#d4a044" opacity="0.4"/>
                <circle cx="8"   cy="60"  r="0.9" fill="#d4a044" opacity="0.35"/>
                {/* LED strip hints — mascot colors */}
                <rect x="80" y="215" width="50" height="2" rx="1" fill="#00cfff" opacity="0.25"/>
                <rect x="135" y="215" width="50" height="2" rx="1" fill="#a855f7" opacity="0.2"/>
              </svg>

              {/* ── Amber command accent bar ── */}
              <div className="roger-card-accent-bar" />

              {/* ── Testing badge ── */}
              <div className="roger-card-test-badge">🧪 TESTING</div>

              {/* ── Featured badge ── */}
              <div className="roger-card-featured">★ رائد</div>

              <div className="card-header">
                {/* Walkie-talkie/mic icon with LED dot — gunmetal box */}
                <div className="roger-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4a044" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <circle cx="19" cy="5" r="1.5" fill="#5a9c69" stroke="none"/>
                  </svg>
                </div>
                <span className="roger-card-status">◉ قيد الاختبار</span>
              </div>

              <h3 className="roger-card-title">ROGER·AI</h3>
              <p className="roger-card-tagline">مساعد تنفيذي ذكي</p>
              <p className="roger-card-desc">مساعد تنفيذي صوتي للمدراء — ذاكرة مستمرة، تقارير استباقية، وتجربة عمل بالعربية والإنجليزية.</p>

              <div className="roger-card-tags">
                <span className="roger-tag roger-tag--amber">صوتية أولاً</span>
                <span className="roger-tag roger-tag--green">iOS · Android</span>
                <span className="roger-tag roger-tag--olive">ثنائي اللغة</span>
              </div>

              <a href="/rogerai" target="_blank" rel="noopener" className="roger-card-link">
                اعرف أكثر <span className="roger-card-link-arrow">←</span>
              </a>
            </article>

            {/* CLINIQ.ONE — Medical dark space themed card */}
            <article className="product-card product-card--cliniq featured reveal delay-200" id="card-cliniq-ar" data-accent="cliniq">

              {/* ── Deep space bg + teal nebula glow ── */}
              <svg className="cliniq-bg-svg" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Teal nebula orbs */}
                <circle cx="240" cy="25"  r="55" fill="url(#cq1)" fillOpacity="0.18"/>
                <circle cx="20"  cy="190" r="40" fill="url(#cq2)" fillOpacity="0.12"/>
                <circle cx="130" cy="110" r="30" fill="url(#cq1)" fillOpacity="0.07"/>
                {/* EKG / heartbeat trace across card */}
                <path d="M0 110 L40 110 L55 75 L68 145 L82 90 L94 110 L280 110"
                      stroke="#1A8A9E" strokeWidth="0.9" opacity="0.22" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Star field */}
                <circle cx="60"  cy="30"  r="0.7" fill="white" opacity="0.35"/>
                <circle cx="180" cy="55"  r="0.5" fill="white" opacity="0.25"/>
                <circle cx="100" cy="180" r="0.6" fill="white" opacity="0.3"/>
                <circle cx="250" cy="140" r="0.8" fill="white" opacity="0.2"/>
                <circle cx="30"  cy="90"  r="0.5" fill="white" opacity="0.3"/>
                <circle cx="210" cy="200" r="0.6" fill="#0ECFCF" opacity="0.4"/>
                <defs>
                  <radialGradient id="cq1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0ECFCF"/>
                    <stop offset="100%" stopColor="#0ECFCF" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="cq2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1A8A9E"/>
                    <stop offset="100%" stopColor="#1A8A9E" stopOpacity="0"/>
                  </radialGradient>
                </defs>
              </svg>

              {/* ── Medical teal shimmer accent bar ── */}
              <div className="cliniq-card-accent-bar" />

              {/* ── LIVE badge (amber, matching app's beta banner) ── */}
              <div className="cliniq-card-live-badge">🟢 LIVE</div>

              {/* ── Featured star badge ── */}
              <div className="cliniq-card-featured">★ رائد</div>

              <div className="card-header">
                {/* Medical EKG icon — the exact Cliniq.one identity */}
                <div className="cliniq-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12 L6 12 L8.5 5 L11.5 19 L14 10 L16 12 L22 12"
                          stroke="#0ECFCF" strokeWidth="1.8"/>
                  </svg>
                </div>
                <span className="cliniq-card-status">● مرحلة تجريبية</span>
              </div>

              <h3 className="cliniq-card-title">CLINIQ.ONE</h3>
              <p className="cliniq-card-tagline">طب عن بُعد مصمم للمنطقة</p>
              <p className="cliniq-card-desc">منصة طب عن بُعد متكاملة تضم ٥ تطبيقات لربط المرضى والأطباء ضمن تجربة صحية عربية وسلسة.</p>

              <div className="cliniq-card-tags">
                <span className="cliniq-tag cliniq-tag--teal">رعاية صحية</span>
                <span className="cliniq-tag cliniq-tag--cyan">MENA</span>
                <span className="cliniq-tag cliniq-tag--amber">٥ تطبيقات</span>
              </div>

              <a href="https://www.cliniq.one" target="_blank" rel="noopener" className="cliniq-card-link">
                زيارة cliniq.one <span className="cliniq-card-link-arrow">←</span>
              </a>
            </article>

            {/* QADAA — Legal Prestige Dark card */}
            <article className="product-card product-card--qadaa reveal delay-300" id="card-qadaa-ar" data-accent="qadaa">

              {/* ── Midnight navy base + golden halo behind scales ── */}
              <svg className="qadaa-bg-svg" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <radialGradient id="qg1" cx="50%" cy="45%" r="50%">
                    <stop offset="0%" stopColor="#C8A24A" stopOpacity="0.18"/>
                    <stop offset="100%" stopColor="#C8A24A" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="qg2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#9E7A20" stopOpacity="0.12"/>
                    <stop offset="100%" stopColor="#9E7A20" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                {/* Gold halo behind the scales icon area */}
                <ellipse cx="140" cy="70" rx="90" ry="60" fill="url(#qg1)"/>
                <ellipse cx="140" cy="80" rx="60" ry="40" fill="url(#qg2)"/>
                {/* Scales of justice SVG — the actual Qadaa icon */}
                <g transform="translate(105, 20) scale(0.5)" opacity="0.55">
                  <line x1="70" y1="10" x2="70" y2="110" stroke="#C8A24A" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="20" y1="35" x2="120" y2="35" stroke="#C8A24A" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="25" y1="35" x2="25" y2="70" stroke="#C8A24A" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3"/>
                  <line x1="115" y1="35" x2="115" y2="70" stroke="#C8A24A" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3"/>
                  <path d="M8 70 Q25 80 42 70" stroke="#C8A24A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  <path d="M98 70 Q115 80 132 70" stroke="#C8A24A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  <line x1="55" y1="110" x2="85" y2="110" stroke="#C8A24A" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="20" cy="35" r="4" fill="#C8A24A"/>
                  <circle cx="120" cy="35" r="4" fill="#C8A24A"/>
                  <circle cx="70" cy="12" r="5" fill="#C8A24A"/>
                </g>
                {/* Ambient dust particles */}
                <circle cx="45"  cy="160" r="0.9" fill="#C8A24A" opacity="0.35"/>
                <circle cx="235" cy="40"  r="0.7" fill="#C8A24A" opacity="0.3"/>
                <circle cx="260" cy="170" r="0.8" fill="#D4B76E" opacity="0.25"/>
                <circle cx="20"  cy="50"  r="0.6" fill="#C8A24A" opacity="0.2"/>
                {/* Horizontal divider line with gold fade */}
                <line x1="30" y1="140" x2="250" y2="140" stroke="url(#qg2)" strokeWidth="0.5"/>
              </svg>

              {/* ── Gold shimmer accent bar ── */}
              <div className="qadaa-card-accent-bar"/>

              {/* ── Dev badge ── */}
              <div className="qadaa-card-dev-badge">◌ قيد التطوير</div>

              <div className="card-header">
                {/* Scales of justice icon — gold on dark glass */}
                <div className="qadaa-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8A24A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v18M5 7h14M8 7v6a4 4 0 0 1-8 0V7M16 7v6a4 4 0 0 0 8 0V7M9 21h6"/>
                  </svg>
                </div>
                <span className="qadaa-card-status">⚖ تقنية قانونية</span>
              </div>

              <h3 className="qadaa-card-title">QADAA · قضاء</h3>
              <p className="qadaa-card-tagline">قانون. مُعاد تصوره.</p>
              <p className="qadaa-card-desc">منصة تربط العملاء بالمحامين وتدعم تحليل القضايا والمستندات بتجربة عربية واضحة وراقية.</p>

              <div className="qadaa-card-tags">
                <span className="qadaa-tag qadaa-tag--gold">تقنية قانونية</span>
                <span className="qadaa-tag qadaa-tag--mahogany">السعودية · الإمارات</span>
              </div>

              <a href="/qadaa" className="qadaa-card-link">
                اكتشف المنصة <span className="qadaa-card-link-arrow">←</span>
              </a>
            </article>

            {/* MUSCLE HUSTLE */}
            <article className="product-card reveal delay-400" id="card-muscle-ar" data-accent="crimson">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon crimson-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 6.5h11M6.5 17.5h11M4 12h16"/></svg>
                </div>
                <span className="card-status dev">◌ قيد التطوير</span>
              </div>
              <h3 className="card-title">MUSCLE HUSTLE</h3>
              <p className="card-tagline">سوق المدربين الشخصيين</p>
              <p className="card-desc">منصة لياقة تربط المدربين بالعملاء مع تدريب ذكي وتجربة تفاعلية محفزة.</p>
              <div className="card-tags"><span className="tag">لياقة بدنية</span><span className="tag">سوق إلكتروني</span></div>
              <a href="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20Muscle%20Hustle%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" target="_blank" rel="noopener" className="card-link">تحدث مع المؤسس ←</a>
            </article>

            {/* AQAR */}
            <article className="product-card reveal delay-500" id="card-aqar-ar" data-accent="gold">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon gold-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span className="card-status dev">◌ قيد التطوير</span>
              </div>
              <h3 className="card-title">AQAR · عقار</h3>
              <p className="card-tagline">عقار أذكى للسوق السعودي</p>
              <p className="card-desc">منصة عقارية تساعد على تحليل السوق، مطابقة الاحتياج، وتبسيط قرارات الشراء والاستثمار.</p>
              <div className="card-tags"><span className="tag">تقنية عقارية</span><span className="tag">رؤية 2030</span></div>
              <a href="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20AQAR%20%C2%B7%20%D8%B9%D9%82%D8%A7%D8%B1%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" target="_blank" rel="noopener" className="card-link">تحدث مع المؤسس ←</a>
            </article>

            {/* UMMI · أمي — Botanical Retro-Care card */}
            <article className="product-card product-card--ummi featured reveal delay-600" id="card-ummi-ar" data-accent="ummi">

              {/* ── Ivory warm background base ── */}
              <div className="ummi-bg" aria-hidden="true" />

              {/* ── Floating teardrop petals (FloatingPetals pattern) ── */}
              <svg className="ummi-petals" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Pink petals */}
                <path d="M248 18 Q254 24 254 30 Q254 36 248 42 Q242 36 242 30 Q242 24 248 18Z" fill="#F2C6D0" opacity="0.45"/>
                <path d="M18 160 Q24 166 24 172 Q24 178 18 184 Q12 178 12 172 Q12 166 18 160Z" fill="#F2C6D0" opacity="0.35"/>
                <path d="M140 6 Q145 11 145 16 Q145 21 140 26 Q135 21 135 16 Q135 11 140 6Z" fill="#FADAC8" opacity="0.4"/>
                {/* Sage petals */}
                <path d="M268 90 Q273 96 273 102 Q273 108 268 114 Q263 108 263 102 Q263 96 268 90Z" fill="#A8C8B0" opacity="0.3"/>
                <path d="M8 60 Q13 66 13 72 Q13 78 8 84 Q3 78 3 72 Q3 66 8 60Z" fill="#A8C8B0" opacity="0.25"/>
                <path d="M200 195 Q204 200 204 205 Q204 210 200 215 Q196 210 196 205 Q196 200 200 195Z" fill="#F6B89E" opacity="0.35"/>
                {/* Vine divider hint */}
                <path d="M0 200 Q35 196 70 200 Q105 204 140 200 Q175 196 210 200 L280 200" stroke="#A8C8B0" strokeWidth="0.8" opacity="0.3"/>
                <path d="M48 198 Q46 194 48 190 Q50 194 48 198Z" fill="#A8C8B0" opacity="0.25"/>
                <path d="M140 204 Q138 208 140 212 Q142 208 140 204Z" fill="#A8C8B0" opacity="0.22"/>
                {/* Corner flourish top-right */}
                <path d="M260 2 Q250 2 242 8 Q234 14 228 24" stroke="#A8C8B0" strokeWidth="0.9" opacity="0.35"/>
                <path d="M258 4 Q252 7 250 12 Q250 9 253 7Z" fill="#A8C8B0" opacity="0.22"/>
              </svg>

              {/* ── Peach → mint botanical accent bar ── */}
              <div className="ummi-card-accent-bar" />

              {/* ── DEMO LIVE badge ── */}
              <div className="ummi-card-demo-badge">🟢 DEMO LIVE</div>

              <div className="card-header">
                {/* WalletRoseIcon — exact app logo SVG */}
                <div className="ummi-card-icon">
                  <svg width="34" height="34" viewBox="0 0 64 64">
                    <defs>
                      <linearGradient id="wg" x1="16" y1="30" x2="48" y2="52" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#FADAC8"/>
                        <stop offset="1" stopColor="#F6B89E"/>
                      </linearGradient>
                      <linearGradient id="rg" x1="32" y1="4" x2="32" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#F6B89E"/>
                        <stop offset="1" stopColor="#E8957A"/>
                      </linearGradient>
                    </defs>
                    {/* Wallet body */}
                    <rect x="14" y="32" rx="6" ry="6" width="36" height="24" fill="url(#wg)" stroke="#E8957A" strokeWidth="1.5"/>
                    <rect x="40" y="38" rx="4" ry="4" width="10" height="10" fill="#FFFCF2" stroke="#E8957A" strokeWidth="1"/>
                    <circle cx="45" cy="43" r="2" fill="#E8957A" opacity="0.5"/>
                    {/* Heart petal on wallet */}
                    <path d="M27 42 Q27 38 31 38 Q35 38 35 42 Q35 46 31 50 Q27 46 27 42Z" fill="#F2C6D0"/>
                    {/* Stem */}
                    <path d="M32 32 L32 18" stroke="#6BB89A" strokeWidth="2" strokeLinecap="round"/>
                    {/* Leaves */}
                    <path d="M32 26 Q26 22 24 26 Q26 30 32 26" fill="#8FCFB3"/>
                    <path d="M32 22 Q38 18 40 22 Q38 26 32 22" fill="#B5E0CC"/>
                    {/* Rose bloom */}
                    <path d="M24 14 Q22 6 32 4 Q42 6 40 14 Q40 20 32 22 Q24 20 24 14Z" fill="url(#rg)"/>
                    <path d="M28 12 Q28 8 32 6 Q36 8 36 12 Q36 18 32 20 Q28 18 28 12Z" fill="#F6B89E" opacity="0.6"/>
                    <circle cx="37" cy="10" r="2" fill="white" opacity="0.7"/>
                  </svg>
                </div>
                <span className="ummi-card-badge">🌸 عرض تفاعلي</span>
              </div>

              <h3 className="ummi-card-title">UMMI · أمي</h3>
              <p className="ummi-card-tagline">محفظة العائلة ورعاية الأم</p>
              <p className="ummi-card-desc">نظام مالي عائلي خاص — ميزانية ذكية، جيوب مخصصة، راتب تلقائي للأم، ونظام طوارئ. ٢٨ وحدة، ٤ أدوار، عربي/إنجليزي.</p>

              <div className="ummi-card-tags">
                <span className="ummi-tag ummi-tag--mint">تقنية مالية</span>
                <span className="ummi-tag ummi-tag--peach">عائلي · ٤ أدوار</span>
                <span className="ummi-tag ummi-tag--sage">٢٨ وحدة</span>
              </div>

              <a href="/ummiwallet/" className="ummi-card-link">
                شاهد العرض التفاعلي <span className="ummi-card-link-arrow">←</span>
              </a>
            </article>

            {/* RELAYBOT — Neo-Brutalist themed card */}
            <article className="product-card product-card--relay reveal delay-100" id="card-relay-ar" data-accent="relay">

              {/* ── Teal scanlines + BLE ripple waves ── */}
              <svg className="relay-bg-svg" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Horizontal scanlines */}
                {[20,36,52,68,84,100,116,132,148,164,180,196,212].map((y) => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="#AED4D3" strokeWidth="0.5"/>
                ))}
                {/* BLE ripple rings — top right */}
                <circle cx="245" cy="35" r="18" stroke="#AED4D3" strokeWidth="1" fill="none" opacity="0.6"/>
                <circle cx="245" cy="35" r="30" stroke="#AED4D3" strokeWidth="0.7" fill="none" opacity="0.4"/>
                <circle cx="245" cy="35" r="44" stroke="#AED4D3" strokeWidth="0.5" fill="none" opacity="0.25"/>
                {/* Small BLE device dot */}
                <circle cx="245" cy="35" r="4" fill="#AED4D3" opacity="0.7"/>
                {/* Red accent corner */}
                <rect x="0" y="0" width="6" height="220" fill="#E6492D" opacity="0.12"/>
              </svg>

              {/* ── Solid red-orange accent bar ── */}
              <div className="relay-card-accent-bar" />

              {/* ── Blinking terminal DEV badge ── */}
              <div className="relay-card-dev-badge">◌ UNDER DEV</div>

              <div className="card-header">
                {/* Cream icon box — RelayBot device icon */}
                <div className="relay-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16324F" strokeWidth="2" strokeLinecap="round">
                    {/* PCB/relay board shape */}
                    <rect x="4" y="5" width="16" height="11" rx="1.5"/>
                    {/* Pins */}
                    <line x1="7" y1="16" x2="7" y2="19"/>
                    <line x1="12" y1="16" x2="12" y2="19"/>
                    <line x1="17" y1="16" x2="17" y2="19"/>
                    {/* BLE signal dots */}
                    <circle cx="19" cy="5.5" r="1" fill="#E6492D" stroke="none"/>
                  </svg>
                </div>
                <span className="relay-card-status">◌ قيد التطوير</span>
              </div>

              <h3 className="relay-card-title">RELAYBOT</h3>
              <p className="relay-card-tagline">جسر نص ذكي للأنظمة المقيدة</p>
              <p className="relay-card-desc">جهاز يربط بين لوحة المفاتيح والحاسوب ليُدخل النصوص المحسّنة بالذكاء الاصطناعي إلى أي نظام دون تثبيت.</p>

              <div className="relay-card-tags">
                <span className="relay-tag relay-tag--green">BLE</span>
                <span className="relay-tag relay-tag--teal">بلا تثبيت</span>
                <span className="relay-tag relay-tag--cream">أجهزة</span>
                <span className="relay-tag relay-tag--red">ESP32</span>
              </div>

              <a href="https://github.com/momencrafts/relaybot" target="_blank" rel="noopener" className="relay-card-link">
                GitHub <span className="relay-card-link-arrow">→</span>
              </a>
            </article>

            {/* SABHA */}
            <article className="product-card reveal delay-200" id="card-sabha-ar" data-accent="pearl">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon pearl-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="3" r="1.5"/><circle cx="20.5" cy="7.5" r="1.5"/></svg>
                </div>
                <span className="card-status prototype">◈ نموذج أولي</span>
              </div>
              <h3 className="card-title">SABHA · سبحة</h3>
              <p className="card-tagline">سبحة ذكية فاخرة</p>
              <p className="card-desc">سبحة ذكية تمزج روح الذكر التقليدي مع تقنيات حديثة ومواد فاخرة.</p>
              <div className="card-tags"><span className="tag">قابل للارتداء</span><span className="tag">فاخر</span></div>
              <a href="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%AA%D8%AC%20SABHA%20%C2%B7%20%D8%B3%D8%A8%D8%AD%D8%A9%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" target="_blank" rel="noopener" className="card-link">تحدث مع المؤسس ←</a>
            </article>

            {/* ─── TDC — COMIC FPV REMASTER ─── */}
            <article className="product-card product-card--tdc reveal delay-300" id="card-tdc-ar" data-accent="tdc">
              {/* Speed-line burst background */}
              <div className="tdc2-bg" aria-hidden="true">
                <svg className="tdc2-speedlines" viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* Radial speed lines from top-right */}
                  <line x1="300" y1="0" x2="180" y2="110" stroke="#00E5FF" strokeWidth="0.7" strokeOpacity="0.13"/>
                  <line x1="300" y1="0" x2="160" y2="130" stroke="#00E5FF" strokeWidth="0.5" strokeOpacity="0.09"/>
                  <line x1="300" y1="0" x2="140" y2="100" stroke="#00E5FF" strokeWidth="0.6" strokeOpacity="0.11"/>
                  <line x1="300" y1="0" x2="200" y2="90" stroke="#FF2D9B" strokeWidth="0.5" strokeOpacity="0.1"/>
                  <line x1="300" y1="0" x2="220" y2="130" stroke="#FF2D9B" strokeWidth="0.4" strokeOpacity="0.08"/>
                  <line x1="300" y1="0" x2="150" y2="80" stroke="#E6492D" strokeWidth="0.6" strokeOpacity="0.12"/>
                  <line x1="300" y1="0" x2="130" y2="60" stroke="#E6492D" strokeWidth="0.5" strokeOpacity="0.09"/>
                  {/* Halftone dot cluster — bottom left */}
                  <circle cx="20" cy="180" r="2" fill="#00E5FF" fillOpacity="0.18"/>
                  <circle cx="36" cy="192" r="1.5" fill="#00E5FF" fillOpacity="0.13"/>
                  <circle cx="28" cy="200" r="1" fill="#00E5FF" fillOpacity="0.1"/>
                  <circle cx="50" cy="178" r="2" fill="#FF2D9B" fillOpacity="0.15"/>
                  <circle cx="10" cy="165" r="1.5" fill="#FF2D9B" fillOpacity="0.12"/>
                  <circle cx="42" cy="165" r="1" fill="#E6492D" fillOpacity="0.14"/>
                  {/* Circuit nodes */}
                  <circle cx="120" cy="195" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" strokeOpacity="0.18"/>
                  <circle cx="120" cy="195" r="1" fill="#00E5FF" fillOpacity="0.25"/>
                  <path d="M120 195 L80 195 L80 175" stroke="#00E5FF" strokeWidth="0.6" strokeOpacity="0.15"/>
                </svg>
                {/* Halftone texture overlay */}
                <div className="tdc2-halftone" aria-hidden="true" />
              </div>

              {/* Top ink accent bar */}
              <div className="tdc2-ink-bar" />

              {/* Panel corner stamp */}
              <div className="tdc2-corner-stamp" aria-hidden="true">TDC</div>

              <div className="tdc2-content">
                {/* Header row */}
                <div className="tdc2-header">
                  <div className="tdc2-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#00E5FF" className="tdc2-bolt">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <div className="tdc2-badge">⚡ TURBO MODE</div>
                </div>

                {/* Comic title block */}
                <div className="tdc2-title-block">
                  <div className="tdc2-action-text">TURBO</div>
                  <div className="tdc2-title">DRONE CIRCUIT</div>
                  <p className="tdc2-tagline">إدارة طاقة طائرات FPV</p>
                </div>

                <p className="tdc2-desc">دائرة 25×25mm تضيف الجهد من المكثف الفائق على التوالي — +15% فولت فوري. 150 أمبير. بدون برمجيات.</p>

                <div className="tdc2-tags">
                  <span className="tdc2-tag tdc2-tag--cyan">براءة اختراع</span>
                  <span className="tdc2-tag tdc2-tag--magenta">FPV · UAV</span>
                  <span className="tdc2-tag tdc2-tag--dim">150A · 19.3V</span>
                </div>

                {/* Stat bar */}
                <div className="tdc2-stat-bar">
                  <div className="tdc2-stat">
                    <span className="tdc2-stat-val">+15%</span>
                    <span className="tdc2-stat-label">فولت</span>
                  </div>
                  <div className="tdc2-stat-divider" />
                  <div className="tdc2-stat">
                    <span className="tdc2-stat-val">150A</span>
                    <span className="tdc2-stat-label">تيار</span>
                  </div>
                  <div className="tdc2-stat-divider" />
                  <div className="tdc2-stat">
                    <span className="tdc2-stat-val">25mm</span>
                    <span className="tdc2-stat-label">حجم</span>
                  </div>
                </div>

                <a href="/tdc" className="tdc2-link">عرض المشروع <span className="tdc2-link-arrow">←</span></a>
              </div>
            </article>

            {/* ─── DART — COMIC COMBAT FPV REMASTER ─── */}
            <article className="product-card product-card--dart2 reveal delay-400" id="card-dart-ar" data-accent="dart">
              {/* War-comic hatching + targeting overlay */}
              <div className="dart2-bg" aria-hidden="true">
                <svg className="dart2-overlay" viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* Targeting reticle — top right */}
                  <circle cx="248" cy="46" r="28" stroke="#FF4438" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3"/>
                  <circle cx="248" cy="46" r="16" stroke="#FF4438" strokeWidth="0.8" strokeOpacity="0.35"/>
                  <circle cx="248" cy="46" r="5" fill="#FF4438" fillOpacity="0.35"/>
                  <circle cx="248" cy="46" r="2.5" fill="#FF4438" fillOpacity="0.6"/>
                  {/* Crosshair lines */}
                  <line x1="248" y1="18" x2="248" y2="30" stroke="#FF4438" strokeWidth="1.2" strokeOpacity="0.5"/>
                  <line x1="248" y1="62" x2="248" y2="74" stroke="#FF4438" strokeWidth="1.2" strokeOpacity="0.5"/>
                  <line x1="220" y1="46" x2="232" y2="46" stroke="#FF4438" strokeWidth="1.2" strokeOpacity="0.5"/>
                  <line x1="264" y1="46" x2="276" y2="46" stroke="#FF4438" strokeWidth="1.2" strokeOpacity="0.5"/>
                  {/* RF sweep */}
                  <line x1="248" y1="46" x2="280" y2="14" stroke="#FF8A3D" strokeWidth="1" strokeOpacity="0.28"/>
                  {/* Hatching lines — bottom left */}
                  <line x1="0" y1="160" x2="60" y2="220" stroke="#FF4438" strokeWidth="0.5" strokeOpacity="0.08"/>
                  <line x1="15" y1="160" x2="75" y2="220" stroke="#FF4438" strokeWidth="0.5" strokeOpacity="0.07"/>
                  <line x1="30" y1="160" x2="90" y2="220" stroke="#FF4438" strokeWidth="0.5" strokeOpacity="0.06"/>
                  <line x1="45" y1="160" x2="105" y2="220" stroke="#FF8A3D" strokeWidth="0.4" strokeOpacity="0.07"/>
                  {/* Circuit trace */}
                  <path d="M0 140 L40 140 L40 110 L90 110 L90 90" stroke="#FF8A3D" strokeWidth="0.7" strokeOpacity="0.15"/>
                  <circle cx="40" cy="140" r="2.5" fill="none" stroke="#FF8A3D" strokeWidth="0.8" strokeOpacity="0.3"/>
                  <circle cx="40" cy="140" r="1" fill="#FF8A3D" fillOpacity="0.35"/>
                </svg>
                <div className="dart2-halftone" aria-hidden="true" />
              </div>

              {/* Combat accent bar */}
              <div className="dart2-ink-bar" />

              {/* Panel corner stamp */}
              <div className="dart2-corner-stamp" aria-hidden="true">DART</div>

              <div className="dart2-content">
                {/* Header row */}
                <div className="dart2-header">
                  <div className="dart2-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4438" strokeWidth="1.8" strokeLinecap="round" className="dart2-reticle">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="4"/>
                      <line x1="12" y1="2" x2="12" y2="6"/>
                      <line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="2" y1="12" x2="6" y2="12"/>
                      <line x1="18" y1="12" x2="22" y2="12"/>
                    </svg>
                  </div>
                  <div className="dart2-badge">◈ نموذج أولي</div>
                </div>

                {/* Comic title block */}
                <div className="dart2-title-block">
                  <div className="dart2-action-text">LOCK.</div>
                  <div className="dart2-title">DART</div>
                  <p className="dart2-tagline">إشارة راديوية للمعركة الجوية</p>
                </div>

                <p className="dart2-desc">طبقة قتالية معيارية لطائرات FPV — تأمين اتجاهي بالراديو، كشف ضربات بالأشعة الإجلاء، وردود فعل لمسية للطيار.</p>

                <div className="dart2-tags">
                  <span className="dart2-tag dart2-tag--orange">FPV · UAV</span>
                  <span className="dart2-tag dart2-tag--red">RF تأمين</span>
                  <span className="dart2-tag dart2-tag--dim">ESP32</span>
                </div>

                {/* Stat bar */}
                <div className="dart2-stat-bar">
                  <div className="dart2-stat">
                    <span className="dart2-stat-val">2.4G</span>
                    <span className="dart2-stat-label">RF</span>
                  </div>
                  <div className="dart2-stat-divider" />
                  <div className="dart2-stat">
                    <span className="dart2-stat-val">940nm</span>
                    <span className="dart2-stat-label">IR</span>
                  </div>
                  <div className="dart2-stat-divider" />
                  <div className="dart2-stat">
                    <span className="dart2-stat-val">&lt;2ms</span>
                    <span className="dart2-stat-label">تأخر</span>
                  </div>
                </div>

                <a href="/dart/" className="dart2-link">عرض البطولة <span className="dart2-link-arrow">←</span></a>
              </div>
            </article>



            <article className="product-card reveal delay-400" id="card-edgetack-ar" data-accent="blue">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon blue-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 8h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2"/></svg>
                </div>
                <span className="card-status prototype">◈ براءة قيد التسجيل</span>
              </div>
              <h3 className="card-title">EDGE TACK</h3>
              <p className="card-tagline">واقي شاشة بأزرار ألعاب</p>
              <p className="card-desc">ملحق ألعاب جوال يجمع واقي الشاشة مع أزرار هوائية قابلة للطي لتجربة لعب أدق.</p>
              <div className="card-tags"><span className="tag">ألعاب الجوال</span><span className="tag">براءة اختراع</span></div>
              <a href="/edgetack" className="card-link">اعرف أكثر ←</a>
            </article>

          </div>
        </div>
      </section>

      {/* ══════════════════════════
          ABOUT
      ══════════════════════════ */}
      <section id="about" className="about">
        <div className="container about-inner">
          <div className="about-text">
            <div className="section-label reveal">الاستوديو</div>
            <h2 className="section-title reveal delay-100">مصممة بعناية،<br/>مو تجميع</h2>
            <p className="about-body reveal delay-200">مومن كرافتس استوديو اختراع ومنتجات في الرياض يطوّر أنظمة ذكية في الصحة، القانون، اللياقة، العقار، التمويل العائلي، والأجهزة.</p>
            <p className="about-body reveal delay-300">أسسه <strong>مومن فرعون</strong> — مؤسس ومهندس يبني الفكرة من أول رسم إلى أول تجربة قابلة للاستخدام.</p>
            <div className="about-details reveal delay-400">
              <div className="detail-row"><span className="detail-label">التأسيس</span><span className="detail-value">2026</span></div>
              <div className="detail-row"><span className="detail-label">المقر</span><span className="detail-value">الرياض، السعودية</span></div>
              <div className="detail-row"><span className="detail-label">التواصل</span><span className="detail-value">momen@momencrafts.com</span></div>
            </div>
          </div>
          <div className="about-quote reveal delay-200">
            <blockquote>
              <p>«أقوى التقنيات هي التي تختفي — تصبح طبيعية لدرجة أن المستخدم ينسى أنه يتفاعل مع آلة.»</p>
              <footer>— مومن فرعون، المؤسس · مومن كرافتس</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          CONTACT
      ══════════════════════════ */}
      <section id="contact" className="contact">
        <div className="container contact-inner">
          <div className="section-label reveal">تواصل معنا</div>
          <h2 className="section-title reveal delay-100">خلّنا<br/><em>نبني سوا</em></h2>
          <p className="section-sub reveal delay-200">يسعدنا تواصلك — لفكرة، شراكة، تبنّي منتج، أو استفسار مباشر.</p>
          <form className="contact-form reveal delay-300" action="https://formsubmit.co/momen@momencrafts.com" method="POST">
            <input type="hidden" name="_subject" value="استفسار جديد من momencrafts.com" />
            <input type="hidden" name="_next" value="https://momencrafts.com/?sent=1" />
            <input type="hidden" name="_captcha" value="false" />
            <div className="form-row">
              <input type="text" name="name" placeholder="الاسم" required />
              <input type="email" name="email" placeholder="البريد الإلكتروني" required />
            </div>
            <textarea name="message" placeholder="أخبرنا عن مشروعك..." rows={5} required />
            <button type="submit" className="btn btn-primary">إرسال الرسالة <span className="btn-arrow">←</span></button>
          </form>
          <div className="contact-links reveal delay-400">
            <a href="mailto:momen@momencrafts.com" className="contact-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              momen@momencrafts.com
            </a>
            <a href="tel:+966535271122" className="contact-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.16 6.16l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              +966 53 527 1122
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          FOOTER
      ══════════════════════════ */}
      <footer className="footer">
        <div className="container footer-inner">
          <div><span className="footer-logo">✦ مومن كرافتس</span><p>استوديو اختراع ومنتجات</p><p>الرياض، المملكة العربية السعودية</p></div>
          <div className="footer-links"><a href="#products">المنتجات</a><a href="#about">عن الاستوديو</a><a href="#contact">تواصل</a></div>
          <div style={{ textAlign:'left' }}><p>momen@momencrafts.com</p><p>الرياض · السعودية · 2026</p></div>
        </div>
        <div className="container"><div className="footer-rule" /><div className="footer-copy"><span>© 2026 مومن كرافتس</span><span className="crafted">صُنع بواسطة مومن فرعون ✦</span></div></div>
      </footer>

      {/* ══════════════════════════
          WhatsApp Float Button
      ══════════════════════════ */}
      <a id="wa-btn" href="https://wa.me/966535271122?text=مرحباً مومن كرافتس، أود معرفة المزيد." target="_blank" rel="noopener" aria-label="واتساب">
        <span id="wa-tooltip">تواصل عبر واتساب</span>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {/* ══════════════════════════
          INVESTOR LAYER
      ══════════════════════════ */}
      <div id="investor-layer">

        {/* 01 TRACTION */}
        <section id="inv-traction" data-section="traction" style={{ background:'#0C0A09', padding:'5rem 1.5rem', borderTop:'2px solid #C8A96E33' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>01 · OUR STORY</div>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1.8rem,4vw,3rem)', color:'#f0ebe3', margin:'0 0 2.5rem', fontWeight:700 }}>
              ما نبنيه — مع الشركاء الصحيحين <span style={{ fontSize:'.55em', color:'#C8A96E', fontStyle:'italic' }}>· What We're Building — With the Right Co-Builders</span>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1.5rem', marginBottom:'3rem' }}>
              {[{n:10,label:'منتجات مبنية · Products'},{n:2,label:'طلبات براءات · Patent Filings'},{n:5,label:'قطاعات · Industries'},{n:1,label:'مؤسس · Solo Founder'}].map((item,i) => (
                <div key={item.n} style={{ background:'rgba(26,22,20,0.6)', backdropFilter:'blur(8px)', border:'1px solid rgba(200,169,110,0.15)', borderRadius:'14px', padding:'1.75rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', bottom:0, left:'10%', right:'10%', height:'2px', background:'linear-gradient(to right, transparent, rgba(200,169,110,0.3), transparent)' }} />
                  <div style={{ fontSize:'3rem', fontWeight:900, color: i===3 ? '#9B1B30' : '#C8A96E', fontFamily:'Georgia,serif', lineHeight:1 }}><CountUp end={item.n} duration={1200} /></div>
                  <div style={{ color:'#a09070', fontSize:'.8rem', marginTop:'.5rem', lineHeight:1.4 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', position:'relative', paddingTop:'1.5rem' }}>
              <div style={{ position:'absolute', top:'2rem', left:'5%', right:'5%', height:'2px', background:'linear-gradient(to right,transparent 0%,rgba(200,169,110,0.25) 15%,rgba(200,169,110,0.4) 50%,rgba(155,27,48,0.3) 85%,transparent 100%)' }} />
              {[['2024','First Concepts'],['2025 Q1','Cliniq.one Beta'],['2025 Q2','Patent Filings'],['2025 Q4','Ummi Wallet Beta'],['2026 →','Early Initiation']].map(([year,label],i) => (
                <div key={year} style={{ textAlign:'center', flex:1, minWidth:'100px' }}>
                  <div style={{
                    width: i===4 ? '16px' : '12px', height: i===4 ? '16px' : '12px',
                    borderRadius:'50%', background: i===4 ? '#9B1B30' : '#C8A96E',
                    margin:'0 auto .6rem', position:'relative', zIndex:1,
                    boxShadow: i===4 ? '0 0 12px rgba(155,27,48,0.6), 0 0 24px rgba(155,27,48,0.3)' : '0 0 6px rgba(200,169,110,0.3)',
                    animation: i===4 ? 'pulse 2s ease-in-out infinite' : 'none'
                  }} />
                  <div style={{ fontSize:'.7rem', color: i===4 ? '#9B1B30' : '#C8A96E', fontFamily:'monospace', fontWeight:700, letterSpacing:'.05em' }}>{year}</div>
                  <div style={{ fontSize:'.72rem', color:'#a09070', marginTop:'.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02 PORTFOLIO */}
        <section id="inv-portfolio" data-section="portfolio" style={{ background:'#1A1614', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>02 · PORTFOLIO</div>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1.8rem,4vw,3rem)', color:'#f0ebe3', margin:'0 0 .75rem', fontWeight:700 }}>
              المحفظة الكاملة <span style={{ fontSize:'.55em', color:'#C8A96E', fontStyle:'italic' }}>· Full Portfolio</span>
            </h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2.5rem', lineHeight:1.7 }}>10 products across 5 industries — each designed, built, and tested by the founder. Click any card to expand.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }} id="invPortfolioGrid">
              <InvCard id="roger" name="ROGER·AI" tagline="مساعد تنفيذي ذكي · Executive Voice Intelligence" cat="Voice AI" badge="inv-badge-beta"
                desc="Voice-first executive assistant with persistent memory, proactive reports, and full Arabic/English bilingual support. Built for C-level users who need intelligent, always-on operational support across iOS and Android."
                details={[{label:'SECTOR',value:'Enterprise SaaS · Productivity'},{label:'REVENUE MODEL',value:'Monthly subscription · Enterprise licensing'},{label:'PLATFORM',value:'iOS · Android · Web'},{label:'STATUS',value:'Private beta — invite-only'}]}
                demoLink="/rogerai" demoLabel="🤖 View ROGER·AI →" />
              <InvCard id="cliniq" name="CLINIQ.ONE" tagline="منصة طب عن بُعد · Full-Stack Telemedicine" cat="HealthTech" badge="inv-badge-live"
                desc="5-app telemedicine ecosystem — patient, doctor, admin, intake bot, and pharmacy module — purpose-built for MOH compliance in Saudi Arabia and the wider MENA region. Live with real users."
                details={[{label:'SECTOR',value:'Digital Health · MENA'},{label:'REVENUE MODEL',value:'Clinic SaaS · Per-consultation'},{label:'COMPLIANCE',value:'MOH Saudi Arabia'},{label:'MARKET SIZE',value:'$21.8B Digital Health (MENA) by 2028'}]}
                demoLink="https://www.cliniq.one" demoLabel="🌐 Visit cliniq.one →" />
              <InvCard id="ummi" name="UMMI · أمي" tagline="محفظة العائلة ورعاية الأم · Family Finance & Mother Care" cat="FinTech" badge="inv-badge-beta"
                desc="Private family financial system built with dignity for Saudi families. Dedicated budgeting, smart pockets, automatic mother's salary, emergency fund system — 28 features, 3 family roles, fully bilingual Arabic/English. IoT-connected piggy bank for children."
                details={[{label:'SECTOR',value:'Islamic FinTech · Family'},{label:'REVENUE MODEL',value:'Family subscription · Hardware sales'},{label:'UNIQUE FEATURE',value:"IoT piggy bank + Mother's salary module"},{label:'MARKET SIZE',value:'$128B Islamic Fintech (Global)'}]}
                demoLink="/ummiwallet/" demoLabel="🎯 Live Demo →" />
              <InvCard id="qadaa" name="QADAA · قضاء" tagline="منصة قانونية ذكية · Legal Intelligence Platform" cat="LegalTech" badge="inv-badge-dev"
                desc="Connects clients to lawyers with AI-powered case analysis and full Arabic language support. Addresses the severe underserving of legal tech in Saudi Arabia and the UAE — most citizens lack affordable, accessible legal guidance."
                details={[{label:'SECTOR',value:'LegalTech · Saudi Arabia · UAE'},{label:'REVENUE MODEL',value:'Per-session · Lawyer SaaS subscription'},{label:'STATUS',value:'Architecture phase — market validated'},{label:'LANGUAGE',value:'Arabic-first · RTL native'}]}
                demoLink="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20QADAA%20%C2%B7%20%D9%82%D8%B6%D8%A7%D8%A1%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" demoLabel="💬 تحدث مع المؤسس" />
              <InvCard id="muscle" name="MUSCLE HUSTLE" tagline="سوق المدربين الشخصيين · Fitness Trainer Marketplace" cat="FitTech" badge="inv-badge-dev"
                desc="Two-sided marketplace connecting certified personal trainers with clients. Smart workout coaching, progress tracking, and premium interactive experience. Targets the high-growth KSA fitness market energized by Vision 2030 lifestyle initiatives."
                details={[{label:'SECTOR',value:'Fitness · Consumer'},{label:'REVENUE MODEL',value:'Marketplace commission · Trainer subscriptions'},{label:'STATUS',value:'Product design phase'},{label:'TARGET',value:'KSA · Vision 2030 lifestyle'}]}
                demoLink="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20Muscle%20Hustle%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" demoLabel="💬 تحدث مع المؤسس" />
              <InvCard id="aqar" name="AQAR · عقار" tagline="منصة عقارية ذكية · Intelligent Real Estate" cat="PropTech" badge="inv-badge-dev"
                desc="AI-powered real estate platform built to support Vision 2030 — advanced market analysis, intelligent buyer-property matching, and full compliance with RERA regulations. Targets the booming Saudi real estate market."
                details={[{label:'SECTOR',value:'PropTech · Vision 2030'},{label:'REVENUE MODEL',value:'Listing SaaS · Transaction commission'},{label:'COMPLIANCE',value:'RERA · Saudi NLRP'},{label:'MARKET',value:'SAR 1.2T Vision 2030 Digital Economy'}]}
                demoLink="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20AQAR%20%C2%B7%20%D8%B9%D9%82%D8%A7%D8%B1%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" demoLabel="💬 تحدث مع المؤسس" />
              <InvCard id="relay" name="RELAYBOT" tagline="جسر نص ذكي · Intelligent Text Bridge for Locked Systems" cat="Hardware · IoT" badge="inv-badge-dev"
                desc="Physical bridge device (ESP32-S3) that sits between a keyboard and any computer. AI enhances text on-device and injects it into any locked system — hospitals, government terminals, air-gapped machines — with zero software installation required."
                details={[{label:'SECTOR',value:'Hardware · Enterprise · Gov'},{label:'REVENUE MODEL',value:'Device sales · Enterprise SaaS'},{label:'TECH',value:'ESP32-S3 · BLE · OTA'},{label:'IP',value:'Proprietary protocol — open-source core'}]}
                demoLink="https://github.com/momencrafts/relaybot" demoLabel="📁 GitHub →" />
              <InvCard id="sabha" name="SABHA · سبحة" tagline="سبحة ذكية فاخرة · Luxury Smart Prayer Beads" cat="Wearable · Islamic" badge="inv-badge-prototype"
                desc="Premium smart prayer beads combining traditional Islamic dhikr practice with embedded electronics — haptic feedback, count tracking, companion app, and luxurious handcrafted materials. Targets affluent Muslim users globally."
                details={[{label:'SECTOR',value:'Islamic Wearables · Luxury'},{label:'REVENUE MODEL',value:'Premium hardware · App subscription'},{label:'STATUS',value:'Hardware prototype — seeking manufacturing partner'},{label:'MARKET',value:'2B+ Muslims globally · Luxury segment'}]}
                demoLink="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%AA%D8%AC%20SABHA%20%C2%B7%20%D8%B3%D8%A8%D8%AD%D8%A9%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" demoLabel="💬 تحدث مع المؤسس" />
              <InvCard id="tdc" name="TURBO DRONE CIRCUIT" tagline="نظام إدارة طاقة طائرات FPV · FPV Drone Power Management" cat="Hardware · Patent" badge="inv-badge-patent"
                desc="Patented intelligent circuit that detects and actively compensates for voltage sag in FPV drone batteries — maintaining consistent motor power and extending flight performance. USPTO patent filed covering the core compensation algorithm."
                details={[{label:'SECTOR',value:'UAV · FPV · Hardware IP'},{label:'REVENUE MODEL',value:'Licensing · OEM integration'},{label:'IP STATUS',value:'USPTO Patent Filed'},{label:'OPPORTUNITY',value:'License to drone manufacturers globally'}]}
                demoLink="/tdc" demoLabel="→ View TDC Circuit" />
              <InvCard id="edgetack" name="EDGE TACK" tagline="واقي شاشة مع أزرار ألعاب · Gaming Screen Protector" cat="Mobile Gaming · Patent" badge="inv-badge-patent"
                desc="Patented mobile gaming accessory combining screen protection with collapsible pneumatic trigger buttons — providing console-grade gaming control with zero bulk when folded flat. Designed for the massive mobile gaming market in Saudi Arabia and MENA."
                details={[{label:'SECTOR',value:'Mobile Gaming · Consumer Hardware'},{label:'REVENUE MODEL',value:'Retail · Licensing to case manufacturers'},{label:'IP STATUS',value:'USPTO Patent Filed'},{label:'MARKET',value:'KSA #1 mobile gaming market per capita'}]}
                demoLink="/edgetack" demoLabel="→ View EdgeTack" />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            CO-FOUNDER EXCLUSIVE SECTION
            Visible only to STRATEGIC / COFOUNDER / PERMANENT / FOUNDER
        ════════════════════════════════════════ */}
        {['STRATEGIC','COFOUNDER','PERMANENT','FOUNDER'].includes(type) && (
          <CoFounderExclusive type={type} name={name} token={token} />
        )}

        {/* 03 VISION */}
        <section id="inv-vision" data-section="vision" style={{ background:'#0C0A09', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3rem', alignItems:'center' }}>
            <div>
              <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>03 · SHARED VISION</div>
              <blockquote style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1rem,2.2vw,1.5rem)', color:'#f0ebe3', lineHeight:1.7, borderLeft:'3px solid #9B1B30', paddingLeft:'1.5rem', margin:'1rem 0 2rem', fontStyle:'italic' }}>
                "The most powerful technology disappears — it becomes so natural the user forgets they are interacting with a machine."
              </blockquote>
              <p style={{ color:'#a09070', lineHeight:1.7, fontSize:'.88rem' }}>MomenCrafts & Co builds the missing tech layer for the Arab world — starting with healthcare, fintech, and IoT. This vision isn’t ours alone. Every co-builder who shapes a product shares in this mission.</p>
            </div>
            <div style={{ background:'#0C0A09', border:'1px solid #C8A96E22', borderRadius:'16px', padding:'2rem' }}>
              <div style={{ fontFamily:'monospace', fontSize:'.68rem', color:'#C8A96E', marginBottom:'1rem', letterSpacing:'.15em' }}>MARKET SIGNALS</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'.9rem' }}>
                {[['Digital Health','Arabic-first care workflows remain underserved','#C8A96E'],['Family Finance','Private dignity-first household finance — clear gap','#C8A96E'],['LegalTech','Arabic case intake needs better tools','#C8A96E'],['Smart Devices','Hardware bridges unlock restricted workflows','#9B1B30']].map(([label,val,color],i) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom: i<3 ? '.75rem' : 0, borderBottom: i<3 ? '1px solid #ffffff11' : 'none' }}>
                    <span style={{ color:'#a09070', fontSize:'.82rem' }}>{label}</span>
                    <span style={{ color, fontFamily:'monospace', fontWeight:700 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 04 FOUNDER */}
        <section id="inv-founder" data-section="founder" style={{ background:'#1A1614', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns:'auto 1fr', gap:'3rem', alignItems:'start' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:'120px', height:'120px', borderRadius:'50%', background:'linear-gradient(135deg,#9B1B30,#1A1614)', border:'2px solid #C8A96E', margin:'0 auto 1rem', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', color:'#C8A96E' }}>م</div>
              <div style={{ fontFamily:'monospace', fontSize:'.65rem', color:'#C8A96E', letterSpacing:'.15em' }}>FOUNDER</div>
            </div>
            <div>
              <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>04 · FOUNDER</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.8rem', color:'#f0ebe3', margin:'0 0 .25rem' }}>Momen Pharaon</h3>
              <div style={{ color:'#C8A96E', fontFamily:'monospace', fontSize:'.8rem', marginBottom:'1.5rem' }}>مومن فرعون · Founder &amp; Engineer · Riyadh, KSA</div>
              <p style={{ color:'#a09070', lineHeight:1.8, fontSize:'.88rem', marginBottom:'1.5rem' }}>Built all 10 products — from PCB hardware design to iOS/Android apps, cloud infrastructure, AI systems, and patent filings. Founder and engineer from concept to first usable experience.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem' }}>
                {['USPTO Patent Filer','MOH Compliance','10 Products Built','Riyadh · KSA'].map(tag => (
                  <span key={tag} style={{ background:'#1A1614', border:'1px solid #C8A96E33', color:'#C8A96E', padding:'.3rem .8rem', borderRadius:'20px', fontSize:'.7rem', fontFamily:'monospace' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 05 PARTNERSHIP */}
        <section id="inv-partnership" data-section="partnership" style={{ background:'#0C0A09', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>05 · JOIN THE CO</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'#f0ebe3', margin:'0 0 .75rem' }}>كيف تصبح & Co · How You Earn Your Seat</h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2.5rem', lineHeight:1.7 }}>There are many ways to become & Co. Choose the path that fits — every validated contribution earns your seat.</p>
            <div className="inv-track-grid">
              <div className="inv-track-card" style={{ border:'1px solid #C8A96E33', borderTop:'3px solid #C8A96E' }}>
                <div className="inv-track-icon">🌐</div>
                <h4 className="inv-track-title">Affiliation · التابعية</h4>
                <p className="inv-track-desc">You have a network — hospitals, clinics, law firms, real estate devs, or enterprise procurement channels. Bring MomenCrafts into your ecosystem as a reseller or referral partner.</p>
                <button className="inv-track-btn" style={{ background:'#C8A96E', color:'#0C0A09' }} onClick={() => prefillWhatsApp('affiliation')}>💬 مهتم بالتابعية →</button>
              </div>
              <div className="inv-track-card" style={{ border:'1px solid #9B1B3033', borderTop:'3px solid #9B1B30' }}>
                <div className="inv-track-icon">📦</div>
                <h4 className="inv-track-title">Adoption · تبني المنتج</h4>
                <p className="inv-track-desc">You want to deploy one of our 10 products inside your organization — a hospital system using Cliniq, a family office using Ummi Wallet, or an enterprise using RogerAI.</p>
                <button className="inv-track-btn" style={{ background:'#9B1B30', color:'#fff' }} onClick={() => prefillWhatsApp('adoption')}>💬 أريد تبني منتج →</button>
              </div>
              <div className="inv-track-card" style={{ border:'1px solid #0e749033', borderTop:'3px solid #0e7490' }}>
                <div className="inv-track-icon">⚡</div>
                <h4 className="inv-track-title">Team-Up · شراكة بناء</h4>
                <p className="inv-track-desc">You're an engineer, designer, domain expert, or strategic co-founder. You want to co-build, invest capital, or bring domain expertise to accelerate one or more products.</p>
                <button className="inv-track-btn" style={{ background:'#0e7490', color:'#fff' }} onClick={() => prefillWhatsApp('teamup')}>💬 أريد التعاون →</button>
              </div>
            </div>
          </div>
        </section>

        {/* 06 WHAT YOU BRING */}
        <section id="inv-youbring" data-section="youbring" style={{ background:'#1A1614', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>06 · YOUR SUPERPOWER</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'#f0ebe3', margin:'0 0 .75rem' }}>كل شريك يحمل قدرة فريدة · What Makes You & Co</h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2rem', lineHeight:1.7 }}>You don’t need everything. One strong signal is enough to earn your seat.</p>
            <div className="inv-bring-grid">
              {[
                ['🌐','Network & Access · شبكة وصول','Relationships with hospitals, clinics, law firms, real estate developers, government bodies, or enterprise procurement channels that can open doors our products need.'],
                ['🧠','Domain Expertise · خبرة قطاعية','Deep knowledge of healthcare, legal, fintech, real estate, or government regulations in Saudi Arabia or MENA — helping us build compliant, market-ready products faster.'],
                ['⚙️','Execution Capacity · قدرة تنفيذية','Engineers, product managers, or designers who can accelerate the roadmap. We have the architecture — we need the hands that can execute at scale alongside us.'],
                ['📋','Regulatory Pull · مسار تنظيمي','Connections to MOH, SAMA, REGA, or other licensing bodies in KSA. Fast-tracked approvals are often the difference between 6 months and 3 years to market.'],
                ['🏛️','Market Presence · حضور سوقي','An established brand, user base, or distribution channel in Saudi Arabia or the GCC that our products can integrate with or be offered through.'],
                ['🤝','Belief · إيمان بالرؤية','You understand what it means to build for the Arab world with care, precision, and ambition. You see the gap — and you want to be part of filling it.'],
              ].map(([icon,title,desc]) => (
                <div key={title} className="inv-bring-card">
                  <div className="inv-bring-icon">{icon}</div>
                  <div className="inv-bring-title">{title}</div>
                  <div className="inv-bring-desc">{desc}</div>
                </div>
              ))}
            </div>
            <p style={{ color:'#a09070', fontSize:'.78rem', textAlign:'center', marginTop:'.5rem', fontStyle:'italic' }}>
              You don't need all six. One strong signal is enough to start a conversation. · لا تحتاج لكل القدرات الستة. إشارة واحدة قوية تكفي لبدء محادثة.
            </p>
          </div>
        </section>

        {/* 08 TEST & SHAPE */}
        <section id="inv-downloads" data-section="downloads" className="co-section co-section-dark">
          <div className="co-container">
            <div className="co-eyebrow">08 · TEST & SHAPE</div>
            <h2 className="co-title">جرّب وشكّل <span className="co-title-en">· Download. Test. Shape What Ships.</span></h2>
            <p className="co-sub">Every install is a vote. Every bug report earns credit. Download our apps and help shape the next release.</p>
            <div className="co-downloads-grid">
              {(coData?.downloads || [
                { app_id:'cliniq-patient', name:'Cliniq Patient', name_ar:'كلينيك المريض', version:'v2.4.1', status:'live', emoji:'🏥', size:'63 MB', description:'Patient-facing telemedicine app with AI intake' },
                { app_id:'cliniq-doctor', name:'Cliniq Doctor', name_ar:'كلينيك الطبيب', version:'v2.3.0', status:'live', emoji:'⚕️', size:'58 MB', description:'Doctor dashboard with AI-assisted consultations' },
                { app_id:'rogerai', name:'Roger·AI', name_ar:'رجر AI', version:'v1.2.0', status:'beta', emoji:'🎙️', size:'45 MB', description:'Voice-first executive assistant' },
                { app_id:'ummi', name:'Ummi Wallet', name_ar:'محفظة أمي', version:'v3.1.0', status:'beta', emoji:'💚', size:'52 MB', description:'Family finance OS with mother care' },
                { app_id:'relaybot', name:'RelayBot', name_ar:'ريلي بوت', version:'v1.8.3', status:'dev', emoji:'⌨️', size:'12 MB', description:'Companion app for RelayBot device' },
              ]).map((app: any) => (
                <div key={app.app_id || app.id} className="co-download-card">
                  <div className="co-dl-header">
                    <span className="co-dl-emoji">{app.emoji}</span>
                    <span className={`co-dl-status co-dl-${app.status}`}>
                      {app.status === 'live' ? '🟢 LIVE' : app.status === 'beta' ? '🧪 BETA' : '🔧 DEV'}
                    </span>
                  </div>
                  <h4 className="co-dl-name">{app.name}</h4>
                  <p className="co-dl-name-ar">{app.name_ar || app.nameAr}</p>
                  <p className="co-dl-desc">{app.description || app.desc}</p>
                  <div className="co-dl-meta">
                    <span>{app.version}</span>
                    <span>{app.size}</span>
                  </div>
                  <div className="co-dl-actions">
                    <button className="co-dl-btn co-dl-btn-android" onClick={() => window.open(`https://wa.me/966535271122?text=I'd like the APK for ${app.name}`, '_blank')}>
                      📱 Android APK
                    </button>
                    {(app.status === 'live' || app.status === 'beta') && (
                      <button className="co-dl-btn co-dl-btn-feedback" onClick={() => {
                        const section = document.getElementById('inv-cobuilder')
                        if (section) section.scrollIntoView({ behavior: 'smooth' })
                      }}>
                        🐛 Report / Suggest
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="co-dl-footer-note">
              ⚡ APK links are sent via WhatsApp for security. iOS TestFlight invites available on request.
            </p>
          </div>
        </section>

        {/* 09 STUDIO JOURNAL */}
        <section id="inv-journal" data-section="journal" className="co-section co-section-warm">
          <div className="co-container">
            <div className="co-eyebrow">09 · STUDIO JOURNAL</div>
            <h2 className="co-title">يوميات الاستوديو <span className="co-title-en">· What's Happening Inside</span></h2>
            <p className="co-sub">Real-time updates from the studio. Launches, patents, milestones, and co-builder credits.</p>
            <div className="co-journal-feed">
              {(coData?.journal || [
                { category: 'launch', publish_date: 'Jun 12, 2026', title: 'Cliniq.one Landing Page — Live', body: 'The public-facing landing page for Cliniq.one is now deployed. Patients can learn about the platform and doctors can request onboarding.', product: 'Cliniq', credit: null, pinned: true },
                { category: 'update', publish_date: 'Jun 10, 2026', title: 'MomenCrafts & Co — Brand Alignment Complete', body: 'The entire investor portal has been rebranded to reflect the & Co philosophy. Every section now speaks the co-builder language.', product: null, credit: null, pinned: true },
                { category: 'patent', publish_date: 'May 2025', title: 'USPTO: Turbo Drone Circuit Patent Filed', body: 'Intelligent voltage sag compensation circuit for FPV drones. Patent covers the core detection and active compensation algorithm.', product: 'TDC', credit: null, pinned: false },
                { category: 'patent', publish_date: 'May 2025', title: 'USPTO: Edge Tack Patent Filed', body: 'Collapsible pneumatic trigger buttons integrated into a screen protector for mobile gaming. Patent covers the mechanical design.', product: 'EdgeTack', credit: null, pinned: false },
                { category: 'milestone', publish_date: 'Apr 2025', title: 'Ummi Wallet — 28 Modules Complete', body: 'All 28 financial modules are coded and functional: smart budgeting, pocket system, mother\'s salary, emergency fund, IoT piggy bank, and more.', product: 'Ummi', credit: null, pinned: false },
                { category: 'community', publish_date: 'Coming soon', title: 'First & Co Registry Entry', body: 'The first investor to have their suggestion implemented will be the inaugural entry in the & Co registry. Your name. Your contribution. Permanently recorded.', product: null, credit: '— waiting for you', pinned: false },
              ]).map((entry: any, i: number) => (
                <article key={i} className={`co-journal-entry${entry.pinned ? ' co-journal-pinned' : ''}`}>
                  <div className="co-journal-meta">
                    <span className={`co-journal-cat co-cat-${entry.category || entry.cat}`}>
                      {(entry.category || entry.cat) === 'launch' ? '🚀 Launch' : (entry.category || entry.cat) === 'patent' ? '📜 Patent' : (entry.category || entry.cat) === 'update' ? '🔄 Update' : (entry.category || entry.cat) === 'milestone' ? '🏆 Milestone' : '🏛 Community'}
                    </span>
                    {entry.product && <span className="co-journal-product">{entry.product}</span>}
                    <span className="co-journal-date">{entry.publish_date || entry.date}</span>
                    {entry.pinned && <span className="co-journal-pin">📌</span>}
                  </div>
                  <h4 className="co-journal-title">{entry.title}</h4>
                  <p className="co-journal-body">{entry.body}</p>
                  {entry.credit && <p className="co-journal-credit">& Co Credit: {entry.credit}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 10 OUR PROGRESS */}
        <section id="inv-traction-live" data-section="traction-live" className="co-section co-section-dark">
          <div className="co-container">
            <div className="co-eyebrow">10 · OUR PROGRESS</div>
            <h2 className="co-title">تقدمنا الآن <span className="co-title-en">· Live Traction Dashboard</span></h2>
            <p className="co-sub">Real numbers. No vanity metrics. Updated by the founder.</p>

            {/* Global KPIs */}
            <div className="co-kpi-grid">
              {(coData?.kpis || [
                { label: 'Products Built', value: '10', icon: '📦' },
                { label: 'Patents Filed', value: '2', icon: '📜' },
                { label: 'Apps in Beta', value: '4', icon: '🧪' },
                { label: 'Industries', value: '5', icon: '🏢' },
                { label: 'Lines of Code', value: '280K+', icon: '💻' },
                { label: 'Solo Founder', value: '1', icon: '👤' },
              ]).map((kpi: any) => (
                <div key={kpi.label} className="co-kpi-card">
                  <span className="co-kpi-icon">{kpi.icon}</span>
                  <span className="co-kpi-value">{kpi.value}</span>
                  <span className="co-kpi-label">{kpi.label}</span>
                </div>
              ))}
            </div>

            {/* Product Progress Bars */}
            <div className="co-progress-section">
              <h4 className="co-progress-heading">Product Readiness</h4>
              {(coData?.progress || [
                { product_name: 'Cliniq.one', pct: 85, status: 'Live with users', color: '#0e7490' },
                { product_name: 'Ummi Wallet', pct: 75, status: 'Beta — 28 modules', color: '#22c55e' },
                { product_name: 'Roger·AI', pct: 60, status: 'Private beta', color: '#C8A96E' },
                { product_name: 'RelayBot', pct: 45, status: 'Hardware prototype', color: '#a855f7' },
                { product_name: 'Qadaa', pct: 20, status: 'Architecture phase', color: '#3b82f6' },
              ]).map((p: any) => (
                <div key={p.product_name || p.name} className="co-progress-row">
                  <div className="co-progress-label">
                    <span>{p.product_name || p.name}</span>
                    <span className="co-progress-status">{p.status}</span>
                  </div>
                  <div className="co-progress-bar">
                    <div className="co-progress-fill" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                  <span className="co-progress-pct">{p.pct}%</span>
                </div>
              ))}
            </div>

            {/* Co Impact */}
            <div className="co-impact-box">
              <h4 className="co-impact-heading">& Co Impact</h4>
              <div className="co-impact-grid">
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.bugs_reported ?? 0}</span><span className="co-impact-label">Bugs Reported</span></div>
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.suggestions ?? 0}</span><span className="co-impact-label">Suggestions</span></div>
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.ideas_shipped ?? 0}</span><span className="co-impact-label">Ideas Shipped</span></div>
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.co_builders ?? 0}</span><span className="co-impact-label">Co-Builders</span></div>
              </div>
              <p className="co-impact-note">These numbers update as co-builders contribute. Be the first.</p>
            </div>
          </div>
        </section>

        {/* 12 CO-BUILDER BOARD + REGISTRY */}
        <section id="inv-cobuilder" data-section="cobuilder" className="co-section co-section-warm">
          <div className="co-container">
            <div className="co-eyebrow">12 · CO-BUILDER BOARD</div>
            <h2 className="co-title">لوحة اند كو <span className="co-title-en">· Ideas. Feedback. Your Name in the Registry.</span></h2>
            <p className="co-sub">Share ideas, report bugs, suggest features. If it ships — you're & Co.</p>

            {/* Submit Card */}
            <div className="co-submit-card">
              <h4 className="co-submit-title">💡 Submit Your Idea</h4>
              <p className="co-submit-desc">Have a feature request, bug report, or product idea? Share it here. If we build it, your name goes on the & Co registry.</p>
              <div className="co-submit-actions">
                <a href="https://wa.me/966535271122?text=💡 Co-Builder Idea:%0A%0AProduct:%0AIdea:" target="_blank" rel="noopener" className="co-submit-btn">
                  💬 Submit via WhatsApp
                </a>
                <a href="mailto:momen@momencrafts.com?subject=Co-Builder Idea&body=Product:%0AIdea:%0AType (bug/feature/suggestion):" className="co-submit-btn co-submit-btn-email">
                  ✉️ Submit via Email
                </a>
              </div>
            </div>

            {/* Sample Board Posts */}
            <div className="co-board-posts">
              <h4 className="co-board-heading">Recent Ideas & Status</h4>
              {(coData?.board || [
                { title: 'Body location picker for AI intake', product: 'Cliniq', status: 'reviewing', author_name: '—', votes: 0 },
                { title: 'Dark mode for doctor dashboard', product: 'Cliniq', status: 'new', author_name: '—', votes: 0 },
                { title: 'Offline mode for RelayBot companion', product: 'RelayBot', status: 'new', author_name: '—', votes: 0 },
                { title: 'SAMA integration for Ummi Wallet', product: 'Ummi', status: 'new', author_name: '—', votes: 0 },
              ]).map((post: any, i: number) => (
                <div key={i} className="co-board-post">
                  <div className="co-board-post-main">
                    <span className={`co-board-status co-board-${post.status}`}>
                      {post.status === 'new' ? '🆕 New' : post.status === 'reviewing' ? '🔍 Reviewing' : post.status === 'approved' ? '✅ Approved' : post.status === 'implemented' ? '🏛 Shipped' : post.status}
                    </span>
                    <h5 className="co-board-post-title">{post.title}</h5>
                    <span className="co-board-product">{post.product}</span>
                  </div>
                  <div className="co-board-post-meta">
                    <span className="co-board-author">By: {post.author_name || post.author || '—'}</span>
                    <span className="co-board-votes">▲ {post.votes}</span>
                  </div>
                </div>
              ))}
              <p className="co-board-empty-note">🏛 No implemented ideas yet — be the first to earn your & Co credit.</p>
            </div>

            {/* & Co Registry Wall */}
            <div className="co-registry-wall">
              <div className="co-registry-header">
                <span className="co-registry-icon">🏛</span>
                <h4 className="co-registry-title">The & Co Registry</h4>
                <p className="co-registry-sub">Names permanently recorded. Contributions that shipped.</p>
              </div>
              <div className="co-registry-empty">
                <div className="co-registry-placeholder">
                  <span className="co-registry-question">?</span>
                  <p>Your name here</p>
                  <p className="co-registry-prompt">Submit an idea that ships → become & Co</p>
                </div>
                <div className="co-registry-placeholder">
                  <span className="co-registry-question">?</span>
                  <p>Your name here</p>
                  <p className="co-registry-prompt">Report a bug that gets fixed → earn credit</p>
                </div>
                <div className="co-registry-placeholder">
                  <span className="co-registry-question">?</span>
                  <p>Your name here</p>
                  <p className="co-registry-prompt">Test an app & give feedback → join the Co</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 07 LET'S BUILD */}
        <section id="inv-letsbuild" data-section="letsbuild" className="letsb-section">
          {/* Background decoration */}
          <div className="letsb-bg-deco" aria-hidden="true" />

          <div className="letsb-inner">

            {/* Eyebrow */}
            <div className="letsb-eyebrow">
              <span className="letsb-eyebrow-dot" />
              <span>07 · BECOME & CO</span>
            </div>

            {/* Main headline */}
            <h2 className="letsb-heading">
              إن رأيت الفرصة —<br/>
              <em>صِر اند كو</em>
            </h2>
            <p className="letsb-sub">
              No pitches. No decks.<br/>
              Your input becomes code.<br/>
              Your name joins the registry.
            </p>

            {/* Three partnership tracks */}
            <div className="letsb-tracks">
              <button onClick={() => prefillWhatsApp('affiliation')} className="letsb-track-btn letsb-track-affiliate">
                <span className="letsb-track-icon">🌐</span>
                <span className="letsb-track-label">مهتم بالتابعية</span>
                <span className="letsb-track-sub">Affiliate · Distribute · Grow</span>
              </button>
              <button onClick={() => prefillWhatsApp('adoption')} className="letsb-track-btn letsb-track-adopt">
                <span className="letsb-track-icon">📦</span>
                <span className="letsb-track-label">أريد تبني منتج</span>
                <span className="letsb-track-sub">License · Deploy · Scale</span>
              </button>
              <button onClick={() => prefillWhatsApp('teamup')} className="letsb-track-btn letsb-track-team">
                <span className="letsb-track-icon">⚡</span>
                <span className="letsb-track-label">أريد التعاون</span>
                <span className="letsb-track-sub">Partner · Invest · Build</span>
              </button>
            </div>

            {/* Primary CTAs */}
            <div className="letsb-ctas">
              <a href="https://wa.me/966535271122" target="_blank" rel="noopener" className="letsb-cta-wa">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp Direct
              </a>
              <a href="mailto:momen@momencrafts.com?subject=Partnership Inquiry — MomenCrafts" className="letsb-cta-email">
                ✉️ momen@momencrafts.com
              </a>
            </div>

            {/* Trust footer */}
            <div className="letsb-trust">
              <span>🔒 NDA Signed · Confidential</span>
              <span>📍 Riyadh, Saudi Arabia</span>
              <span>⚡ Respond within 24h</span>
              {footerExpiry && <span id="inv-footer-expiry">{footerExpiry}</span>}
            </div>

          </div>
        </section>

        {/* Invisible watermark canvas */}
        <canvas id="inv-watermark" style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9998, opacity:0, width:'100%', height:'100%' }} aria-hidden="true" />

        {/* Session expired overlay */}
        {expired && (
          <div id="inv-expired-overlay" className="visible" style={{ display:'flex' }}>
            <div style={{ textAlign:'center', maxWidth:'420px', padding:'3rem' }}>
              <div style={{ fontSize:'3.5rem', marginBottom:'1rem', animation:'pulse 2s infinite' }}>⏰</div>
              <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", color:'#f0ebe3', marginBottom:'.75rem', fontSize:'1.8rem' }}>انتهت الجلسة · Session Ended</h2>
              <p style={{ color:'#a09070', marginBottom:'.5rem', lineHeight:1.7 }}>Your timed access has expired. Thank you for reviewing MomenCrafts.</p>
              <p style={{ color:'#a09070', fontSize:'.8rem', marginBottom:'2.5rem', fontFamily:'monospace' }}>If you'd like extended access, reach out directly.</p>
              <a href="mailto:momen@momencrafts.com?subject=Access Renewal Request" style={{ display:'inline-block', background:'#C8A96E', color:'#0C0A09', padding:'.9rem 2.2rem', borderRadius:'10px', textDecoration:'none', fontFamily:'monospace', fontWeight:700, fontSize:'.9rem' }}>Request Extended Access →</a>
            </div>
          </div>
        )}

      </div>{/* /investor-layer */}
    </div>
  )
}

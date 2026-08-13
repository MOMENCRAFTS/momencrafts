import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { mintXhbSession, mintAdminXhbSession } from '@/services/xhbSession'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import '@/styles/home.css'
import '@/styles/blueprint.css'

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
  { id: 'xhb',      label: 'XHB · مشروع مُتبنّى' },
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

/* ── Blueprint background layers (Step 4.1) ── */
const RegMark = ({ pos }: { pos: 'tl'|'tr'|'bl'|'br' }) => (
  <div className={`reg reg--${pos}`} aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M9 0v18M0 9h18" stroke="currentColor" strokeWidth=".7" />
    </svg>
  </div>
)

/* ── Blueprint SVG components (Step 4.2) ── */
type Stage = 'live' | 'beta' | 'dev'
const CUBE = 'M20 6 L34 14 L34 26 L20 34 L6 26 L6 14 Z'
const CUBE_LINES = 'M20 6 v28 M6 14 L34 26 M34 14 L6 26'

function StageGlyph({ stage, size = 30 }: { stage: Stage; size?: number }) {
  if (stage === 'live') return (
    <svg className="art" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path className="fill--solid" d={CUBE} opacity=".22" />
      <g className="stroke stroke--built"><path d={CUBE} /><path d={CUBE_LINES} /></g>
    </svg>
  )
  if (stage === 'beta') return (
    <svg className="art" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path className="fill--ghost" d={CUBE} />
      <g className="stroke stroke--built"><path d={CUBE} /><path d="M20 6 v28" /></g>
      <g className="stroke stroke--sketch"><path d="M6 14 L34 26 M34 14 L6 26" /></g>
    </svg>
  )
  return (
    <svg className="art" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g className="stroke stroke--sketch"><path d={CUBE} /><path d={CUBE_LINES} /></g>
    </svg>
  )
}

const GEAR12 = 'M 111.6 53.2 L 111.6 66.8 L 98.6 70.4 L 97.0 75.3 L 108.0 79.9 L 101.3 91.7 L 88.3 88.3 L 84.4 91.7 L 91.7 101.3 L 79.9 108.0 L 70.4 98.6 L 65.2 99.7 L 66.8 111.6 L 53.2 111.6 L 49.6 98.6 L 44.7 97.0 L 40.1 108.0 L 28.3 101.3 L 31.7 88.3 L 28.3 84.4 L 18.7 91.7 L 12.0 79.9 L 21.4 70.4 L 20.3 65.2 L 8.4 66.8 L 8.4 53.2 L 21.4 49.6 L 23.0 44.7 L 12.0 40.1 L 18.7 28.3 L 31.7 31.7 L 35.6 28.3 L 28.3 18.7 L 40.1 12.0 L 49.6 21.4 L 54.8 20.3 L 53.2 8.4 L 66.8 8.4 L 70.4 21.4 L 75.3 23.0 L 79.9 12.0 L 91.7 18.7 L 88.3 31.7 L 91.7 35.6 L 101.3 28.3 L 108.0 40.1 L 98.6 49.6 L 99.7 54.8 Z'
const PCB_VIEW = { width: 300, height: 275, viewBox: '4 34 112 78' }
const PcbBody = ({ variant }: { variant: 1 | 2 | 3 }) => {
  const s = variant === 1 ? 'stroke stroke--sketch' : 'stroke stroke--built'
  return (
    <>
      {variant === 2 && <rect className="fill--ghost" x="8" y="8" width="104" height="134" rx="5" />}
      {variant === 3 && <rect className="fill--solid" x="8" y="8" width="104" height="134" rx="5" opacity=".2" />}
      <rect className={s} x="8" y="8" width="104" height="134" rx="5" />
      <circle className={s} cx="18" cy="18" r="3" /><circle className={s} cx="102" cy="18" r="3" />
      <circle className={s} cx="18" cy="132" r="3" /><circle className={s} cx="102" cy="132" r="3" />
      {variant === 3 && <rect className="fill--solid" x="40" y="44" width="40" height="32" rx="2" opacity=".45" />}
      <rect className={s} x="40" y="44" width="40" height="32" rx="2" />
      <path className={s} d="M36 50h4M36 58h4M36 66h4M80 50h4M80 58h4M80 66h4" />
      <path className={s} d="M36 50h-8l-6-6h-8M36 66h-10l-6 6v14M84 58h10l6-6h6M84 66h6l8 8v10" />
      <path className={s} d="M60 76v14M60 90h-22M60 90h24" />
      {variant !== 1 && <>
        <circle className="fill--solid" cx="14" cy="44" r={variant === 3 ? 2.2 : 1.8} />
        <circle className="fill--solid" cx="20" cy="86" r={variant === 3 ? 2.2 : 1.8} />
        <circle className="fill--solid" cx="106" cy="52" r={variant === 3 ? 2.2 : 1.8} />
        <circle className="fill--solid" cx="106" cy="84" r={variant === 3 ? 2.2 : 1.8} />
      </>}
      {variant === 3
        ? <><rect className="fill--solid" x="22" y="98" width="14" height="7" rx="1" />
            <rect className="fill--solid" x="86" y="98" width="14" height="7" rx="1" /></>
        : <><rect className={s} x="22" y="98" width="14" height="7" rx="1" />
            <rect className={s} x="86" y="98" width="14" height="7" rx="1" /></>}
      <circle className={s} cx="60" cy="104" r="7" />
      {variant === 3
        ? [30,42,54,66,78].map(x => <rect key={x} className="fill--solid" x={x} y="133" width="6" height="7" />)
        : <path className="stroke stroke--tick" d="M30 136h6M42 136h6M54 136h6M66 136h6M78 136h6" />}
    </>
  )
}

function Terminal() {
  return (
    <div className="term" aria-hidden="true">
      <div className="term__line"><span className="term__prompt">$</span> mc trace --layer 2</div>
      <div className="term__line">  routing 1,284 nets …</div>
      <div className="term__line"><span className="term__prompt">$</span> mc assemble --verify</div>
      <div className="term__line"><span className="term__ok">  ✓</span> 96 components placed</div>
      <div className="term__line"><span className="term__prompt">$</span> mc deliver --sign MC-001</div>
      <div className="term__line"><span className="term__ok">  ✓</span> released<span className="term__cursor" /></div>
    </div>
  )
}

function SheetLayers() {
  return (
    <>
      <div className="fx fx-tone"     aria-hidden="true" />
      <div className="fx fx-mottle"   aria-hidden="true" />
      <div className="fx fx-folds"    aria-hidden="true" />
      <div className="fx fx-leak"     aria-hidden="true" />
      <div className="fx fx-dust"     aria-hidden="true" />
      <div className="fx fx-vignette" aria-hidden="true" />
      <div className="grid-bg"        aria-hidden="true" />
      <RegMark pos="tl" /><RegMark pos="tr" /><RegMark pos="bl" /><RegMark pos="br" />
      <div className="fx fx-grain" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg">
          <filter id="mc-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={4} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#mc-grain)" />
        </svg>
      </div>
      <Terminal />
      <div className="atelier" aria-hidden="true">
        <div className="art art--1"><svg width="230" height="230" viewBox="0 0 120 120"><path className="stroke stroke--built" d={GEAR12} /><circle className="stroke stroke--built" cx="60" cy="60" r="22" /><circle className="stroke stroke--sketch" cx="60" cy="60" r="10" /></svg></div>
        <div className="art art--3"><svg width="180" height="180" viewBox="0 0 100 100"><path className="stroke stroke--built" d="M50 14 L82 32 L50 50 L18 32 Z" /><path className="stroke stroke--sketch" d="M18 40 L50 58 L50 92 L18 74 Z" /><path className="stroke stroke--sketch" d="M82 40 L50 58 L50 92 L82 74 Z" /></svg></div>
        <div className="art art--2"><svg width="250" height="115" viewBox="0 0 130 60"><path className="stroke stroke--built" d="M4 12 h122 M4 48 h122" /><path className="stroke stroke--built" d="M4 12 L22 48 L40 12 L58 48 L76 12 L94 48 L112 12 L126 48" /></svg></div>
        <div className="art art--5"><svg width="170" height="170" viewBox="0 0 100 100"><circle className="stroke stroke--built" cx="50" cy="50" r="42" /><ellipse className="stroke stroke--sketch" cx="50" cy="50" rx="16" ry="42" /><ellipse className="stroke stroke--sketch" cx="50" cy="50" rx="32" ry="42" /><ellipse className="stroke stroke--built" cx="50" cy="50" rx="42" ry="15" /></svg></div>
        <div className="art art--6"><svg width="140" height="180" viewBox="0 0 80 100"><path className="stroke stroke--built" d="M40 8 L16 88 M40 8 L64 88" /><circle className="fill--solid" cx="40" cy="8" r="3.4" /><path className="stroke stroke--sketch" d="M22 66 q18 10 36 0" /></svg></div>
      </div>
      <div className="thesis art" aria-hidden="true">
        {[1, 2, 3].map(v => (
          <svg key={v} className={`thesis__layer thesis__layer--${v}`} {...PCB_VIEW}>
            <PcbBody variant={v as 1 | 2 | 3} />
          </svg>
        ))}
      </div>
    </>
  )
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
    <div className="bp-root" dir="rtl" lang="ar">
      <SheetLayers />
      <div className="home-root" id="home-root">
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

      {/* ── BLUEPRINT NAV (Step 4.2) ── */}
      <nav className="nav" id="bp-nav">
        <span className="nav__mark">MOMENCRAFTS</span>
        <div className="nav__links">
          <a href="#products">المنتجات</a>
          <a href="#about">عن الاستوديو</a>
          <a href="#contact">تواصل</a>
        </div>
        <span className="nav__chip mono">{masked}</span>
      </nav>

      {/* ══════════════════════════
          BLUEPRINT HERO (Step 4.2)
      ══════════════════════════ */}
      <section id="hero" className="hero page">
        <span className="kicker reveal">IDEA STUDIO · RIYADH, KSA</span>
        <h1 className="hero__title reveal">
          <em>بعناية</em><br />مصممة معكم
        </h1>
        <div className="dim reveal">
          <div className="dim__bar" />
          <span className="dim__val mono">SHEET 01 — INDEX</span>
          <div className="dim__bar" />
        </div>
        <p className="hero__statement reveal">
          ١٢ منتج. ٥ مجالات. استوديو واحد يحوّل الأفكار إلى أنظمة ومنتجات قابلة للتجربة.
        </p>
        <p className="hero__sub reveal">MomenCrafts &amp; Co</p>
        <a href="#products" className="btn btn--gold reveal">
          تصفح أعمالنا <span style={{ display:'inline-block', transform:'scaleX(-1)' }}>→</span>
        </a>

        {/* stage legend */}
        <div className="stages reveal">
          <div className="stage">
            <StageGlyph stage="dev" size={28} />
            <span className="stage__label mono">DRAWN</span>
            <span className="stage__ar">مرسوم</span>
          </div>
          <span className="stages__arrow">→</span>
          <div className="stage">
            <StageGlyph stage="beta" size={28} />
            <span className="stage__label mono">ASSEMBLED</span>
            <span className="stage__ar">مُجمّع</span>
          </div>
          <span className="stages__arrow">→</span>
          <div className="stage">
            <StageGlyph stage="live" size={28} />
            <span className="stage__label mono">DELIVERED</span>
            <span className="stage__ar">مُسلّم</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SHEET 02 — PRODUCT CARDS (Step 4.3)
          C2: all 11 products + XHB from live inventory.
      ═══════════════════════════════════════════════════ */}
      <div className="cutline page"><span>SHEET 02 — PRODUCTS</span></div>
      <section id="products" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">02</span>
            <h2>المحفظة</h2>
          </div>
          <span className="section__meta">١٢ منتج · ٥ مجالات</span>
        </div>
        <div className="grid">

          {/* 01 ROGER·AI */}
          <article className="card reveal" id="card-roger" style={{'--accent':'var(--gold)'} as React.CSSProperties}>
            <span className="card__no mono">01</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="live" /></div>
              <span className="card__name">ROGER·AI</span>
              <span className="pill pill--live mono">LIVE</span>
            </div>
            <p className="card__tagline">مساعد ذكي يبني لك الأنظمة من الصفر — بدون كود</p>
            <div className="tags"><span>ذكاء اصطناعي</span><span>بناء أنظمة</span></div>
            <a href="/rogerai" target="_blank" rel="noopener" className="card__more">عرض المشروع ←</a>
          </article>

          {/* 02 CLINIQ.ONE */}
          <article className="card reveal" id="card-cliniq" style={{'--accent':'var(--live)'} as React.CSSProperties}>
            <span className="card__no mono">02</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="live" /></div>
              <span className="card__name">CLINIQ.ONE</span>
              <span className="pill pill--live mono">LIVE</span>
            </div>
            <p className="card__tagline">أول عيادة ذكاء اصطناعي في الخليج — فحص أولي بالذكاء، ملف مريض، حجز</p>
            <div className="tags"><span>صحة رقمية</span><span>ذكاء اصطناعي</span></div>
            <a href="/cliniq.one" className="card__more">زيارة cliniq.one ←</a>
          </article>

          {/* 03 UMMI */}
          <article className="card reveal" id="card-ummi" style={{'--accent':'var(--live)'} as React.CSSProperties}>
            <span className="card__no mono">03</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="live" /></div>
              <span className="card__name">UMMI · أمي</span>
              <span className="pill pill--live mono">LIVE</span>
            </div>
            <p className="card__tagline">محفظة رقمية لأمك — أرسل لها فلوس وتابع مصروفها بلطف</p>
            <div className="tags"><span>فينتك</span><span>عائلة</span></div>
            <a href="/ummiwallet/" className="card__more">عرض المشروع ←</a>
          </article>

          {/* 04 RELAYBOT */}
          <article className="card reveal" id="card-relay" style={{'--accent':'var(--beta)'} as React.CSSProperties}>
            <span className="card__no mono">04</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="beta" /></div>
              <span className="card__name">RELAYBOT</span>
              <span className="pill pill--beta mono">BETA</span>
            </div>
            <p className="card__tagline">طابعة حرارية ذكية — جهاز ESP32 يتصل عبر BLE ويطبع الرسائل فوراً</p>
            <div className="tags"><span>أجهزة ذكية</span><span>BLE · ESP32</span></div>
            <a href="https://github.com/momencrafts/relaybot" target="_blank" rel="noopener" className="card__more">GitHub ←</a>
          </article>

          {/* 05 QADAA */}
          <article className="card reveal" id="card-qadaa" style={{'--accent':'var(--beta)'} as React.CSSProperties}>
            <span className="card__no mono">05</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="beta" /></div>
              <span className="card__name">QADAA · قضاء</span>
              <span className="pill pill--beta mono">BETA</span>
            </div>
            <p className="card__tagline">منصة قانونية ذكية — بحث أحكام، استشارات AI، ملفات قضايا</p>
            <div className="tags"><span>تقنية قانونية</span><span>ذكاء اصطناعي</span></div>
            <a href="/qadaa" className="card__more">عرض المنصة ←</a>
          </article>

          {/* 06 TDC */}
          <article className="card reveal" id="card-tdc" style={{'--accent':'var(--dev)'} as React.CSSProperties}>
            <span className="card__no mono">06</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="dev" /></div>
              <span className="card__name">TURBO DRONE CIRCUIT</span>
              <span className="pill pill--dev mono">DEV</span>
            </div>
            <p className="card__tagline">دائرة 25×25mm تضيف الجهد من المكثف الفائق على التوالي — +15% فولت فوري</p>
            <div className="tags"><span>براءة اختراع</span><span>FPV · UAV</span><span className="mono">150A · 19.3V</span></div>
            <a href="/tdc" className="card__more">عرض المشروع ←</a>
          </article>

          {/* 07 DART */}
          <article className="card reveal" id="card-dart" style={{'--accent':'var(--dev)'} as React.CSSProperties}>
            <span className="card__no mono">07</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="dev" /></div>
              <span className="card__name">DART</span>
              <span className="pill pill--dev mono">DEV</span>
            </div>
            <p className="card__tagline">طائرة FPV قتالية مصممة للمناورة في البيئات الحضرية</p>
            <div className="tags"><span>طيران</span><span>FPV</span></div>
            <a href="/dart/" className="card__more">عرض المشروع ←</a>
          </article>

          {/* 08 EDGE TACK */}
          <article className="card reveal" id="card-edgetack" style={{'--accent':'var(--dev)'} as React.CSSProperties}>
            <span className="card__no mono">08</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="dev" /></div>
              <span className="card__name">EDGE TACK</span>
              <span className="pill pill--dev mono">DEV</span>
            </div>
            <p className="card__tagline">واقي شاشة بأزرار ألعاب — ملحق يجمع واقي الشاشة مع أزرار هوائية قابلة للطي</p>
            <div className="tags"><span>ألعاب الجوال</span><span>براءة اختراع</span></div>
            <a href="/edgetack" className="card__more">اعرف أكثر ←</a>
          </article>

          {/* 09 MUSCLE HUSTLE */}
          <article className="card reveal" id="card-muscle">
            <span className="card__no mono">09</span>
            <div className="card__row"><span className="card__name">MUSCLE HUSTLE</span></div>
            <p className="card__tagline">منصة لياقة وصالات بنموذج اشتراك مرن</p>
            <div className="tags"><span>لياقة</span><span>اشتراكات</span></div>
            <a href={'https://wa.me/966535271122?text=' + encodeURIComponent('أهتم بمنصة Muscle Hustle')} target="_blank" rel="noopener" className="card__more">واتساب ←</a>
          </article>

          {/* 10 AQAR */}
          <article className="card reveal" id="card-aqar">
            <span className="card__no mono">10</span>
            <div className="card__row"><span className="card__name">AQAR · عقار</span></div>
            <p className="card__tagline">منصة عقارية ذكية — بحث وتحليل وإدارة عقارات</p>
            <div className="tags"><span>عقارات</span><span>ذكاء اصطناعي</span></div>
            <a href={'https://wa.me/966535271122?text=' + encodeURIComponent('أهتم بمنصة AQAR')} target="_blank" rel="noopener" className="card__more">واتساب ←</a>
          </article>

          {/* 11 SABHA */}
          <article className="card reveal" id="card-sabha">
            <span className="card__no mono">11</span>
            <div className="card__row"><span className="card__name">SABHA · سبحة</span></div>
            <p className="card__tagline">سبحة إلكترونية — عدّاد ذكر مع إحصائيات وتذكيرات</p>
            <div className="tags"><span>منتجات إسلامية</span><span>أجهزة ذكية</span></div>
            <a href={'https://wa.me/966535271122?text=' + encodeURIComponent('أهتم بمنتج SABHA')} target="_blank" rel="noopener" className="card__more">واتساب ←</a>
          </article>

          {/* 12 XHB — ADOPTED PROJECT (B1: SSO handler verbatim) */}
          <article className="card card--xhb reveal" id="card-xhb" style={{'--accent':'var(--live)'} as React.CSSProperties}>
            <span className="card__no mono">12</span>
            <div className="card__row">
              <div className="card__glyph"><StageGlyph stage="live" /></div>
              <span className="card__name">XHB · مقر</span>
              <span className="pill pill--adopted mono">ADOPTED</span>
            </div>
            <p className="card__tagline">مقر XHB — منصة إدارة ذكية لمؤسسة خالد حسن البلوي</p>
            <div className="tags">
              <span>تأسيس شراكة</span><span>وصول محدود</span>
            </div>
            <button
              className="card__more"
              onClick={async (e) => {
                e.preventDefault()
                const btn = e.currentTarget
                const origText = btn.textContent
                btn.textContent = 'جاري الدخول…'
                btn.setAttribute('disabled', 'true')
                try {
                  const token = sessionStorage.getItem('mcr_token') || ''
                  if (token) {
                    await mintXhbSession(token)
                  } else {
                    const email = sessionStorage.getItem('mcr_email') || ''
                    if (email) {
                      await mintAdminXhbSession(email)
                    }
                  }
                  window.location.href = '/xhb/'
                } catch (err) {
                  console.error('XHB SSO failed:', err)
                  window.location.href = '/xhb/'
                } finally {
                  btn.textContent = origText
                  btn.removeAttribute('disabled')
                }
              }}
            >دخول مقر XHB ←</button>
          </article>

        </div>{/* /grid */}
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
        <section id="inv-traction" data-section="traction" className="inv-sec inv-sec--dark inv-sec--border">
          <div className="inv-sec__inner">
            <div className="inv-eyebrow">01 · OUR STORY</div>
            <h2 className="inv-heading">
              ما نبنيه — مع الشركاء الصحيحين <span className="inv-heading__ar-sub">· What We're Building — With the Right Co-Builders</span>
            </h2>
            <div className="inv-stat-grid">
              {[{n:10,label:'منتجات مبنية · Products'},{n:2,label:'طلبات براءات · Patent Filings'},{n:5,label:'قطاعات · Industries'},{n:1,label:'مؤسس · Solo Founder'}].map((item,i) => (
                <div key={item.n} className="inv-stat-card">
                  <div className="inv-stat-card__glow" />
                  <div className={`inv-stat-card__value${i===3 ? ' inv-stat-card__value--crimson' : ''}`}><CountUp end={item.n} duration={1200} /></div>
                  <div className="inv-stat-card__label">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="inv-timeline">
              <div className="inv-timeline__line" />
              {[['2024','First Concepts'],['2025 Q1','Cliniq.one Beta'],['2025 Q2','Patent Filings'],['2025 Q4','Ummi Wallet Beta'],['2026 →','Early Initiation']].map(([year,label],i) => (
                <div key={year} className="inv-timeline__point">
                  <div className={`inv-timeline__dot${i===4 ? ' inv-timeline__dot--active' : ''}`} />
                  <div className={`inv-timeline__year${i===4 ? ' inv-timeline__year--active' : ''}`}>{year}</div>
                  <div className="inv-timeline__label">{label}</div>
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
                demoLink="/cliniq.one" demoLabel="🌐 Visit cliniq.one →" />
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
        <section id="inv-vision" data-section="vision" className="inv-sec inv-sec--dark">
          <div className="inv-sec__inner inv-vision-grid">
            <div>
              <div className="inv-eyebrow">03 · SHARED VISION</div>
              <blockquote className="inv-quote">
                "The most powerful technology disappears — it becomes so natural the user forgets they are interacting with a machine."
              </blockquote>
              <p className="inv-body">MomenCrafts & Co builds the missing tech layer for the Arab world — starting with healthcare, fintech, and IoT. This vision isn't ours alone. Every co-builder who shapes a product shares in this mission.</p>
            </div>
            <div className="inv-signals">
              <div className="inv-signals__heading">MARKET SIGNALS</div>
              <div className="inv-signals__list">
                {[['Digital Health','Arabic-first care workflows remain underserved','#C8A96E'],['Family Finance','Private dignity-first household finance — clear gap','#C8A96E'],['LegalTech','Arabic case intake needs better tools','#C8A96E'],['Smart Devices','Hardware bridges unlock restricted workflows','#9B1B30']].map(([label,val,color]) => (
                  <div key={label} className="inv-signals__row">
                    <span className="inv-signals__label">{label}</span>
                    <span className="inv-signals__value" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 04 FOUNDER */}
        <section id="inv-founder" data-section="founder" className="inv-sec inv-sec--warm">
          <div className="inv-sec__inner--narrow inv-founder-grid">
            <div style={{ textAlign:'center' }}>
              <div className="inv-founder-avatar">م</div>
              <div className="inv-founder-label">FOUNDER</div>
            </div>
            <div>
              <div className="inv-eyebrow">04 · FOUNDER</div>
              <h3 className="inv-founder-name">Momen Pharaon</h3>
              <div className="inv-founder-subtitle">مومن فرعون · Founder &amp; Engineer · Riyadh, KSA</div>
              <p className="inv-body inv-body--spaced">Built all 10 products — from PCB hardware design to iOS/Android apps, cloud infrastructure, AI systems, and patent filings. Founder and engineer from concept to first usable experience.</p>
              <div className="inv-tag-list">
                {['USPTO Patent Filer','MOH Compliance','10 Products Built','Riyadh · KSA'].map(tag => (
                  <span key={tag} className="inv-tag">{tag}</span>
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

        {/* 07 TEST & SHAPE */}
        <section id="inv-downloads" data-section="downloads" className="co-section co-section-dark">
          <div className="co-container">
            <div className="co-eyebrow">07 · TEST & SHAPE</div>
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

        {/* 08 STUDIO JOURNAL */}
        <section id="inv-journal" data-section="journal" className="co-section co-section-warm">
          <div className="co-container">
            <div className="co-eyebrow">08 · STUDIO JOURNAL</div>
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

        {/* 09 OUR PROGRESS */}
        <section id="inv-traction-live" data-section="traction-live" className="co-section co-section-dark">
          <div className="co-container">
            <div className="co-eyebrow">09 · OUR PROGRESS</div>
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

        {/* 10 CO-BUILDER BOARD + REGISTRY */}
        <section id="inv-cobuilder" data-section="cobuilder" className="co-section co-section-warm">
          <div className="co-container">
            <div className="co-eyebrow">10 · CO-BUILDER BOARD</div>
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

        {/* 11 LET'S BUILD (Final CTA) */}
        <section id="inv-letsbuild" data-section="letsbuild" className="letsb-section">
          {/* Background decoration */}
          <div className="letsb-bg-deco" aria-hidden="true" />

          <div className="letsb-inner">

            {/* Eyebrow */}
            <div className="letsb-eyebrow">
              <span className="letsb-eyebrow-dot" />
              <span>11 · BECOME & CO</span>
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
    </div>{/* /home-root */}
    </div>{/* /bp-root */}
  )
}

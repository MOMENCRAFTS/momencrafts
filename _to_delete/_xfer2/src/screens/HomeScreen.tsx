import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { useT, type Dict } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import { mintXhbSession, mintAdminXhbSession } from '@/services/xhbSession'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import '@/styles/home.css'
import '@/styles/blueprint.css'

const WA_NUMBER = '966535271122'

// ── WhatsApp helpers ──
function openWhatsApp(message: string) {
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank')
}
function waHref(message: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}

// ── Direction-aware arrow ──
const Arrow = () => <span className="dir-arrow">→</span>

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

// ── Investor accordion card ──
function InvCard({ id, name, tagline, cat, badge, badgeLabel, desc, details, demoLink, demoLabel }: {
  id: string; name: string; tagline: string; cat: string;
  badge: string; badgeLabel: string; desc: string;
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
          <span className={`inv-badge ${badge}`}>{badgeLabel}</span>
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
const SUPABASE_FN = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'

function CoFounderExclusive({ type, name, token }: { type: string; name: string; token: string }) {
  const { t, isAr } = useT()
  const c = t.home.cofounder
  const cards = t.home.cards

  const BALLOT_PRODUCTS = [
    { id: 'cliniq',   label: cards.cliniq.name },
    { id: 'ummi',     label: cards.ummi.name },
    { id: 'roger',    label: cards.roger.name },
    { id: 'qadaa',    label: cards.qadaa.name },
    { id: 'muscle',   label: cards.muscle.name },
    { id: 'aqar',     label: cards.aqar.name },
    { id: 'relay',    label: cards.relay.name },
    { id: 'sabha',    label: cards.sabha.name },
    { id: 'tdc',      label: cards.tdc.name },
    { id: 'edgetack', label: cards.edgetack.name },
    { id: 'xhb',      label: cards.xhb.name },
  ]

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

  const registeredSince = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { month: 'short', year: 'numeric' })

  return (
    <section id="inv-cofounder" data-section="cofounder" className="inv-cofounder-section">
      <div className="inv-cf-inner">
        {/* Header */}
        <div className="inv-cf-header">
          <span className="inv-cf-star">✦</span>
          <div>
            <div className="inv-cf-label">{c.label}</div>
            <h2 className="inv-cf-title">{c.title}</h2>
          </div>
          <span className="inv-cf-type-badge">{type}</span>
        </div>

        {/* Cards grid */}
        <div className="inv-cf-grid">

          {/* Registry card */}
          <div className="inv-cf-card">
            <div className="inv-cf-card-header">
              <span className="inv-cf-card-ico">📋</span>
              <span className="inv-cf-card-title">{c.registryCard}</span>
            </div>
            <div className="inv-cf-registry-name">{name}</div>
            <div className="inv-cf-registry-meta">
              <div className="inv-cf-registry-row">
                <span>{c.status}</span>
                <span><span className="inv-cf-status-dot"/>{c.active}</span>
              </div>
              <div className="inv-cf-registry-row">
                <span>{c.tier}</span>
                <span>{type}</span>
              </div>
              <div className="inv-cf-registry-row">
                <span>{c.registered}</span>
                <span>{registeredSince}</span>
              </div>
              <div className="inv-cf-registry-row">
                <span>{c.tokenLabel}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '.65rem', color: '#6a5c3e' }} dir="ltr">
                  MCR-••••{token.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Roadmap card */}
          <div className="inv-cf-card">
            <div className="inv-cf-card-header">
              <span className="inv-cf-card-ico">🗺</span>
              <span className="inv-cf-card-title">{c.roadmapCard}</span>
            </div>
            <div className="inv-cf-roadmap-steps">
              {c.roadmap.map((step, i) => (
                <div className="inv-cf-step" key={step.title}>
                  <div className={`inv-cf-step-dot ${i === 0 ? 'done' : i === 1 ? 'next' : 'future'}`}/>
                  <div className="inv-cf-step-text">
                    <strong>{step.title}</strong>
                    {step.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direct contact card */}
          <div className="inv-cf-card">
            <div className="inv-cf-card-header">
              <span className="inv-cf-card-ico">📡</span>
              <span className="inv-cf-card-title">{c.directLine}</span>
            </div>
            <div className="inv-cf-contact-name">{t.home.founder.name}</div>
            <div className="inv-cf-contact-role">{c.founderRole}</div>
            <div className="inv-cf-contact-btns">
              <a
                href={waHref(t.home.tracks.coFounder(name, type))}
                target="_blank" rel="noopener"
                className="inv-cf-btn inv-cf-btn--wa"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                {c.waBtn}
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
            <span className="inv-cf-ballot-title">{c.ballotTitle}</span>
            <span className="inv-cf-ballot-sub">{c.ballotSub}</span>
          </div>
          {ballotDone ? (
            <div className="inv-cf-ballot-success">
              {c.ballotSuccess}
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
                  {ballotLoading ? c.ballotSubmitting : c.ballotSubmit(ballot.length)}
                </button>
                {ballot.length > 0 && ballot.length < 3 && (
                  <span style={{ fontFamily: 'monospace', fontSize: '.65rem', color: '#6a5c3e' }}>
                    {c.ballotMin}
                  </span>
                )}
                {ballot.length > 0 && (
                  <button
                    onClick={() => setBallot([])}
                    style={{ background: 'none', border: 'none', color: '#6a5c3e', cursor: 'pointer', fontFamily: 'monospace', fontSize: '.65rem' }}
                  >{c.ballotClear}</button>
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
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); e.target.classList.add('is-visible') } }), { threshold: .08 })
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
    <div className="term" aria-hidden="true" dir="ltr">
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

/* ── Public product grid config — language-independent metadata ── */
type CardKey = keyof Dict['home']['cards']
const PUBLIC_CARDS: {
  key: CardKey; no: string; id: string; accent?: string; stage?: Stage; pill?: string; pillClass?: string;
  href?: string; external?: boolean; wa?: boolean; xhb?: boolean;
}[] = [
  { key: 'roger',    no: '01', id: 'card-roger',    accent: 'var(--gold)', stage: 'live', pill: 'LIVE',    pillClass: 'pill--live',    href: '/rogerai', external: true },
  { key: 'cliniq',   no: '02', id: 'card-cliniq',   accent: 'var(--live)', stage: 'live', pill: 'LIVE',    pillClass: 'pill--live',    href: '/cliniq.one' },
  { key: 'ummi',     no: '03', id: 'card-ummi',     accent: 'var(--live)', stage: 'live', pill: 'LIVE',    pillClass: 'pill--live',    href: '/ummiwallet/' },
  { key: 'relay',    no: '04', id: 'card-relay',    accent: 'var(--beta)', stage: 'beta', pill: 'BETA',    pillClass: 'pill--beta',    href: 'https://github.com/momencrafts/relaybot', external: true },
  { key: 'qadaa',    no: '05', id: 'card-qadaa',    accent: 'var(--beta)', stage: 'beta', pill: 'BETA',    pillClass: 'pill--beta',    href: '/qadaa' },
  { key: 'tdc',      no: '06', id: 'card-tdc',      accent: 'var(--dev)',  stage: 'dev',  pill: 'DEV',     pillClass: 'pill--dev',     href: '/tdc' },
  { key: 'dart',     no: '07', id: 'card-dart',     accent: 'var(--dev)',  stage: 'dev',  pill: 'DEV',     pillClass: 'pill--dev',     href: '/dart/' },
  { key: 'edgetack', no: '08', id: 'card-edgetack', accent: 'var(--dev)',  stage: 'dev',  pill: 'DEV',     pillClass: 'pill--dev',     href: '/edgetack' },
  { key: 'muscle',   no: '09', id: 'card-muscle',   wa: true },
  { key: 'aqar',     no: '10', id: 'card-aqar',     wa: true },
  { key: 'sabha',    no: '11', id: 'card-sabha',    wa: true },
  { key: 'xhb',      no: '12', id: 'card-xhb',      accent: 'var(--live)', stage: 'live', pill: 'ADOPTED', pillClass: 'pill--adopted', xhb: true },
]

/* ── Investor portfolio config — language-independent metadata ── */
const INV_CARDS: {
  id: string; name: string; cat: string; badge: keyof Dict['home']['portfolio']['badges'];
  badgeClass: string; keys: (keyof Dict['home']['portfolio']['detailLabels'])[];
  demoLink?: string; waProduct?: string;
}[] = [
  { id: 'roger',    name: 'ROGER·AI',            cat: 'Voice AI',              badge: 'beta',      badgeClass: 'inv-badge-beta',      keys: ['sector','revenue','platform','status'],       demoLink: '/rogerai' },
  { id: 'cliniq',   name: 'CLINIQ.ONE',          cat: 'HealthTech',            badge: 'live',      badgeClass: 'inv-badge-live',      keys: ['sector','revenue','compliance','marketSize'], demoLink: '/cliniq.one' },
  { id: 'ummi',     name: 'UMMI',                cat: 'FinTech',               badge: 'beta',      badgeClass: 'inv-badge-beta',      keys: ['sector','revenue','unique','marketSize'],     demoLink: '/ummiwallet/' },
  { id: 'qadaa',    name: 'QADAA',               cat: 'LegalTech',             badge: 'dev',       badgeClass: 'inv-badge-dev',       keys: ['sector','revenue','status','language'],       waProduct: 'QADAA' },
  { id: 'muscle',   name: 'MUSCLE HUSTLE',       cat: 'FitTech',               badge: 'dev',       badgeClass: 'inv-badge-dev',       keys: ['sector','revenue','status','target'],         waProduct: 'Muscle Hustle' },
  { id: 'aqar',     name: 'AQAR',                cat: 'PropTech',              badge: 'dev',       badgeClass: 'inv-badge-dev',       keys: ['sector','revenue','compliance','market'],     waProduct: 'AQAR' },
  { id: 'relay',    name: 'RELAYBOT',            cat: 'Hardware · IoT',        badge: 'dev',       badgeClass: 'inv-badge-dev',       keys: ['sector','revenue','tech','ip'],               demoLink: 'https://github.com/momencrafts/relaybot' },
  { id: 'sabha',    name: 'SABHA',               cat: 'Wearable · Islamic',    badge: 'prototype', badgeClass: 'inv-badge-prototype', keys: ['sector','revenue','status','market'],         waProduct: 'SABHA' },
  { id: 'tdc',      name: 'TURBO DRONE CIRCUIT', cat: 'Hardware · Patent',     badge: 'patent',    badgeClass: 'inv-badge-patent',    keys: ['sector','revenue','ipStatus','opportunity'],  demoLink: '/tdc' },
  { id: 'edgetack', name: 'EDGE TACK',           cat: 'Mobile Gaming · Patent', badge: 'patent',   badgeClass: 'inv-badge-patent',    keys: ['sector','revenue','ipStatus','market'],       demoLink: '/edgetack' },
]

const DOWNLOAD_META = [
  { app_id: 'cliniq-patient', key: 'cliniqPatient', version: 'v2.4.1', status: 'live', emoji: '🏥', size: '63 MB' },
  { app_id: 'cliniq-doctor',  key: 'cliniqDoctor',  version: 'v2.3.0', status: 'live', emoji: '⚕️', size: '58 MB' },
  { app_id: 'rogerai',        key: 'rogerai',       version: 'v1.2.0', status: 'beta', emoji: '🎙️', size: '45 MB' },
  { app_id: 'ummi',           key: 'ummi',          version: 'v3.1.0', status: 'beta', emoji: '💚', size: '52 MB' },
  { app_id: 'relaybot',       key: 'relaybot',      version: 'v1.8.3', status: 'dev',  emoji: '⌨️', size: '12 MB' },
] as const

const JOURNAL_META = [
  { category: 'launch',    product: 'Cliniq',   pinned: true },
  { category: 'update',    product: null,       pinned: true },
  { category: 'patent',    product: 'TDC',      pinned: false },
  { category: 'patent',    product: 'EdgeTack', pinned: false },
  { category: 'milestone', product: 'Ummi',     pinned: false },
  { category: 'community', product: null,       pinned: false },
] as const

const PROGRESS_META = [
  { name: 'Cliniq.one',  pct: 85, statusKey: 'liveWithUsers',     color: '#0e7490' },
  { name: 'Ummi Wallet', pct: 75, statusKey: 'betaModules',       color: '#22c55e' },
  { name: 'Roger·AI',    pct: 60, statusKey: 'privateBeta',       color: '#C8A96E' },
  { name: 'RelayBot',    pct: 45, statusKey: 'hardwarePrototype', color: '#a855f7' },
  { name: 'Qadaa',       pct: 20, statusKey: 'architecture',      color: '#3b82f6' },
] as const

const YOUBRING_ICONS = ['🌐', '🧠', '⚙️', '📋', '🏛️', '🤝']
const SIGNAL_COLORS  = ['#C8A96E', '#C8A96E', '#C8A96E', '#9B1B30']

const CO_TYPES = ['PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER']

export default function HomeScreen() {
  const navigate = useNavigate()
  const { investorData, clearSession } = useAppStore()
  const { t, lang, isAr, dir } = useT()
  const h = t.home
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const token   = sessionStorage.getItem('mcr_token')   || ''
  const name    = sessionStorage.getItem('mcr_name')    || 'Partner'
  const type    = sessionStorage.getItem('mcr_type')    || 'MONTH'
  const expires = sessionStorage.getItem('mcr_expires') || ''
  const raw     = token; const masked = raw.length > 4 ? 'MCR-••••' + raw.slice(-4) : raw
  const isCo    = CO_TYPES.includes(type)
  const dateLocale = isAr ? 'ar-EG' : 'en-GB'

  let typeLabel = (h.accessTypes as unknown as Record<string, string>)[type] || type
  if (expires) {
    const d = new Date(expires)
    if (!isNaN(d.getTime())) {
      typeLabel += ` · ${h.accessTypes.expiresPrefix} ` + d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
    }
  }

  const [countdown, setCountdown]   = useState('')
  const [expired, setExpired]       = useState(false)
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
    return isNaN(d.getTime()) ? '' : `${h.accessTypes.accessExpires} ` + d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
  })() : ''

  const barNav: [string, string, boolean][] = [
    ['#inv-traction',      h.bar.nav.story,     false],
    ['#inv-portfolio',     h.bar.nav.portfolio, false],
    ...(isCo ? [['#inv-cofounder', h.bar.nav.coHub, true] as [string, string, boolean]] : []),
    ['#inv-vision',        h.bar.nav.vision,    false],
    ['#inv-downloads',     h.bar.nav.testShape, false],
    ['#inv-journal',       h.bar.nav.journal,   false],
    ['#inv-traction-live', h.bar.nav.progress,  false],
    ['#inv-cobuilder',     h.bar.nav.board,     false],
    ...(!isCo ? [['#inv-letsbuild', h.bar.nav.becomeCo, true] as [string, string, boolean]] : []),
  ]

  return (
    <div className="bp-root" dir={dir} lang={lang}>
      <LangToggle />
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
          <span id="inv-token-display" className="inv-bar-token" dir="ltr">{masked}</span>
          <span className="inv-sep">|</span>
          <span id="inv-type-display">{typeLabel}</span>
          <span className="inv-sep">|</span>
          {/* Co-founder badge vs NDA tick */}
          {isCo ? (
            <span className="inv-bar-cofound-badge">✦ &amp; Co</span>
          ) : (
            <span className="inv-bar-nda">✓ &amp; Co</span>
          )}
          {countdown && type === 'HOUR' && (
            <span id="inv-expiry-badge" className="inv-expiry-badge" style={{ animation: countdown < '10:00' ? 'pulse 1.2s infinite' : 'none' }}>
              ⏱ <span id="inv-countdown" dir="ltr">{countdown}</span>
            </span>
          )}
        </div>
        <nav id="inv-section-nav" style={{ display:'flex', gap:'1.2rem', fontSize:'.66rem' }}>
          {barNav.map(([href, label, strong]) => (
            <a key={href} href={href} style={{ color: strong ? '#C8A96E' : '#a09070', textDecoration:'none', fontWeight: strong ? 700 : 400 }}>{label}</a>
          ))}
        </nav>
        <div className="inv-bar-actions">
          <button onClick={handleExit} className="inv-bar-exit">{h.bar.exit}</button>
          {!isCo && (
            <a href="#inv-letsbuild" className="inv-bar-cta">{h.bar.becomeCo} <Arrow /></a>
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
          <a href="#products">{h.nav.products}</a>
          <a href="#about">{h.nav.about}</a>
          <a href="#contact">{h.nav.contact}</a>
        </div>
        <span className="nav__chip mono" dir="ltr">{masked}</span>
      </nav>

      {/* ══════════════════════════
          BLUEPRINT HERO (Step 4.2)
      ══════════════════════════ */}
      <section id="hero" className="hero page">
        <span className="kicker reveal">{h.hero.kicker}</span>
        <h1 className="hero__title reveal">
          <em>{h.hero.titleEm}</em><br />{h.hero.titleRest}
        </h1>
        <div className="dim reveal">
          <div className="dim__bar" />
          <span className="dim__val mono">{h.hero.sheet}</span>
          <div className="dim__bar" />
        </div>
        <p className="hero__statement reveal">
          {h.hero.statement}
        </p>
        <p className="hero__sub reveal">{h.hero.sub}</p>
        <a href="#products" className="btn btn--gold reveal">
          {h.hero.cta} <Arrow />
        </a>

        {/* stage legend */}
        <div className="stages reveal">
          <div className="stage">
            <StageGlyph stage="dev" size={28} />
            <span className="stage__label mono">{h.stages.drawn.label}</span>
            <span className="stage__ar">{h.stages.drawn.sub}</span>
          </div>
          <span className="stages__arrow dir-arrow">→</span>
          <div className="stage">
            <StageGlyph stage="beta" size={28} />
            <span className="stage__label mono">{h.stages.assembled.label}</span>
            <span className="stage__ar">{h.stages.assembled.sub}</span>
          </div>
          <span className="stages__arrow dir-arrow">→</span>
          <div className="stage">
            <StageGlyph stage="live" size={28} />
            <span className="stage__label mono">{h.stages.delivered.label}</span>
            <span className="stage__ar">{h.stages.delivered.sub}</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SHEET 02 — PRODUCT CARDS
      ═══════════════════════════════════════════════════ */}
      <div className="cutline page"><span>{h.sheets.products}</span></div>
      <section id="products" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">02</span>
            <h2>{h.productsSection.title}</h2>
          </div>
          <span className="section__meta">{h.productsSection.meta}</span>
        </div>
        <div className="grid">

          {PUBLIC_CARDS.map(c => {
            const card = h.cards[c.key]
            return (
              <article
                key={c.key}
                className={`card${c.xhb ? ' card--xhb' : ''} reveal`}
                id={c.id}
                style={c.accent ? ({ '--accent': c.accent } as React.CSSProperties) : undefined}
              >
                <span className="card__no mono">{c.no}</span>
                <div className="card__row">
                  {c.stage && <div className="card__glyph"><StageGlyph stage={c.stage} /></div>}
                  <span className="card__name">{card.name}</span>
                  {c.pill && <span className={`pill ${c.pillClass} mono`}>{c.pill}</span>}
                </div>
                <p className="card__tagline">{card.tagline}</p>
                <div className="tags">{card.tags.map(tag => <span key={tag}>{tag}</span>)}</div>

                {c.xhb ? (
                  <button
                    className="card__more"
                    onClick={async (e) => {
                      e.preventDefault()
                      const btn = e.currentTarget
                      const origText = btn.textContent
                      btn.textContent = h.cards.xhb.loading
                      btn.setAttribute('disabled', 'true')
                      try {
                        const tk = sessionStorage.getItem('mcr_token') || ''
                        if (tk) {
                          await mintXhbSession(tk)
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
                  >{card.link} {isAr ? '←' : '→'}</button>
                ) : c.wa ? (
                  <a
                    href={waHref(h.tracks.interestIn(card.name))}
                    target="_blank" rel="noopener" className="card__more"
                  >{card.link} <Arrow /></a>
                ) : (
                  <a
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noopener' } : {})}
                    className="card__more"
                  >{card.link} <Arrow /></a>
                )}
              </article>
            )
          })}

        </div>{/* /grid */}
      </section>

      {/* ══════ SHEET 03 — ABOUT ══════ */}
      <div className="cutline page"><span>{h.sheets.about}</span></div>
      <section id="about" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">03</span>
            <h2>{h.about.heading}</h2>
          </div>
        </div>
        <div className="about-grid">
          <div className="about__text">
            <h3 className="about__title reveal">{h.about.title}<br/>{h.about.titleLine2}</h3>
            <p className="about__body reveal">{h.about.body1}</p>
            <p className="about__body reveal">{h.about.body2Pre}<strong>{h.about.body2Name}</strong>{h.about.body2Post}</p>
            <div className="about__details reveal">
              <div className="detail"><span className="detail__k mono">{h.about.estLabel}</span><span className="detail__v">2026</span></div>
              <div className="detail"><span className="detail__k mono">{h.about.hqLabel}</span><span className="detail__v">{h.about.hqValue}</span></div>
              <div className="detail"><span className="detail__k mono">{h.about.mailLabel}</span><span className="detail__v" dir="ltr">momen@momencrafts.com</span></div>
            </div>
          </div>
          <blockquote className="about__quote reveal">
            <p>{h.about.quote}</p>
            <cite>{h.about.cite}</cite>
          </blockquote>
        </div>
      </section>

      {/* ══════ SHEET 04 — CONTACT ══════ */}
      <div className="cutline page"><span>{h.sheets.contact}</span></div>
      <section id="contact" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">04</span>
            <h2>{h.contact.heading} <em>{h.contact.headingEm}</em></h2>
          </div>
        </div>
        <p className="contact__sub reveal">{h.contact.sub}</p>
        <form className="contact-form reveal" action="https://formsubmit.co/momen@momencrafts.com" method="POST">
          <input type="hidden" name="_subject" value={h.contact.emailSubject} />
          <input type="hidden" name="_next" value="https://momencrafts.com/?sent=1" />
          <input type="hidden" name="_captcha" value="false" />
          <div className="form-row">
            <input type="text" name="name" placeholder={h.contact.namePlaceholder} required />
            <input type="email" name="email" placeholder={h.contact.emailPlaceholder} required dir="ltr" />
          </div>
          <textarea name="message" placeholder={h.contact.messagePlaceholder} rows={5} required />
          <button type="submit" className="btn btn--gold">{h.contact.submit} <Arrow /></button>
        </form>
        <div className="contact__links reveal">
          <a href="mailto:momen@momencrafts.com" className="contact__link mono" dir="ltr">momen@momencrafts.com</a>
          <a href="tel:+966535271122" className="contact__link mono" dir="ltr">+966 53 527 1122</a>
          <a href="https://wa.me/966535271122" target="_blank" rel="noopener" className="contact__link mono">WhatsApp</a>
        </div>
      </section>

      {/* ══════ TITLE BLOCK + FOOTER ══════ */}
      <footer className="title-block">
        <div className="tb">
          <div className="tb__cell"><span className="tb__k mono">{h.titleBlock.studio}</span><span className="tb__v">{h.titleBlock.studioValue}</span></div>
          <div className="tb__cell"><span className="tb__k mono">{h.titleBlock.founder}</span><span className="tb__v">{h.titleBlock.founderValue}</span></div>
          <div className="tb__cell"><span className="tb__k mono">{h.titleBlock.location}</span><span className="tb__v">{h.titleBlock.locationValue}</span></div>
          <div className="tb__cell"><span className="tb__k mono">{h.titleBlock.rev}</span><span className="tb__v" dir="ltr">MC-2026.08</span></div>
        </div>
        <div className="tb__copy mono">{h.titleBlock.copy}</div>
      </footer>

      {/* ══════════════════════════
          WhatsApp Float Button
      ══════════════════════════ */}
      <a id="wa-btn" href={waHref(h.whatsapp.message)} target="_blank" rel="noopener" aria-label={h.whatsapp.aria}>
        <span id="wa-tooltip">{h.whatsapp.tooltip}</span>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>

      {/* ══════════════════════════
          INVESTOR LAYER
      ══════════════════════════ */}
      <div id="investor-layer">

        {/* 01 TRACTION */}
        <section id="inv-traction" data-section="traction" className="inv-sec inv-sec--dark inv-sec--border">
          <div className="inv-sec__inner">
            <div className="inv-eyebrow">{h.traction.eyebrow}</div>
            <h2 className="inv-heading">{h.traction.heading}</h2>
            <div className="inv-stat-grid">
              {[
                { n: 10, label: h.traction.stats.products },
                { n: 2,  label: h.traction.stats.patents },
                { n: 5,  label: h.traction.stats.industries },
                { n: 1,  label: h.traction.stats.founder },
              ].map((item,i) => (
                <div key={item.label} className="inv-stat-card">
                  <div className="inv-stat-card__glow" />
                  <div className={`inv-stat-card__value${i===3 ? ' inv-stat-card__value--crimson' : ''}`}><CountUp end={item.n} duration={1200} /></div>
                  <div className="inv-stat-card__label">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="inv-timeline">
              <div className="inv-timeline__line" />
              {[
                ['2024',    h.traction.timeline.concepts],
                ['2025 Q1', h.traction.timeline.cliniqBeta],
                ['2025 Q2', h.traction.timeline.patents],
                ['2025 Q4', h.traction.timeline.ummiBeta],
                ['2026 →',  h.traction.timeline.initiation],
              ].map(([year,label],i) => (
                <div key={year} className="inv-timeline__point">
                  <div className={`inv-timeline__dot${i===4 ? ' inv-timeline__dot--active' : ''}`} />
                  <div className={`inv-timeline__year${i===4 ? ' inv-timeline__year--active' : ''}`} dir="ltr">{year}</div>
                  <div className="inv-timeline__label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 02 PORTFOLIO */}
        <section id="inv-portfolio" data-section="portfolio" style={{ background:'#1A1614', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>{h.portfolio.eyebrow}</div>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1.8rem,4vw,3rem)', color:'#f0ebe3', margin:'0 0 .75rem', fontWeight:700 }}>
              {h.portfolio.title}
            </h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2.5rem', lineHeight:1.7 }}>{h.portfolio.sub}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }} id="invPortfolioGrid">
              {INV_CARDS.map(c => {
                const items = h.portfolio.items as unknown as Record<string, Record<string, string>>
                const item = items[c.id]
                return (
                  <InvCard
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    tagline={item.tagline}
                    cat={c.cat}
                    badge={c.badgeClass}
                    badgeLabel={h.portfolio.badges[c.badge]}
                    desc={item.desc}
                    details={c.keys.map(k => ({ label: h.portfolio.detailLabels[k], value: item[k] }))}
                    demoLink={c.demoLink ?? (c.waProduct ? waHref(h.tracks.interestIn(c.waProduct)) : undefined)}
                    demoLabel={item.demoLabel}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            CO-FOUNDER EXCLUSIVE SECTION
        ════════════════════════════════════════ */}
        {isCo && <CoFounderExclusive type={type} name={name} token={token} />}

        {/* 03 VISION */}
        <section id="inv-vision" data-section="vision" className="inv-sec inv-sec--dark">
          <div className="inv-sec__inner inv-vision-grid">
            <div>
              <div className="inv-eyebrow">{h.vision.eyebrow}</div>
              <blockquote className="inv-quote">{h.vision.quote}</blockquote>
              <p className="inv-body">{h.vision.body}</p>
            </div>
            <div className="inv-signals">
              <div className="inv-signals__heading">{h.vision.signalsHeading}</div>
              <div className="inv-signals__list">
                {h.vision.signals.map((s, i) => (
                  <div key={s.label} className="inv-signals__row">
                    <span className="inv-signals__label">{s.label}</span>
                    <span className="inv-signals__value" style={{ color: SIGNAL_COLORS[i] }}>{s.value}</span>
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
              <div className="inv-founder-avatar">{h.founder.avatar}</div>
              <div className="inv-founder-label">{h.founder.label}</div>
            </div>
            <div>
              <div className="inv-eyebrow">{h.founder.eyebrow}</div>
              <h3 className="inv-founder-name">{h.founder.name}</h3>
              <div className="inv-founder-subtitle">{h.founder.subtitle}</div>
              <p className="inv-body inv-body--spaced">{h.founder.body}</p>
              <div className="inv-tag-list">
                {h.founder.tags.map(tag => (
                  <span key={tag} className="inv-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 05 PARTNERSHIP */}
        <section id="inv-partnership" data-section="partnership" style={{ background:'#0C0A09', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>{h.partnership.eyebrow}</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'#f0ebe3', margin:'0 0 .75rem' }}>{h.partnership.title}</h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2.5rem', lineHeight:1.7 }}>{h.partnership.sub}</p>
            <div className="inv-track-grid">
              <div className="inv-track-card" style={{ border:'1px solid #C8A96E33', borderTop:'3px solid #C8A96E' }}>
                <div className="inv-track-icon">🌐</div>
                <h4 className="inv-track-title">{h.partnership.affiliation.title}</h4>
                <p className="inv-track-desc">{h.partnership.affiliation.desc}</p>
                <button className="inv-track-btn" style={{ background:'#C8A96E', color:'#0C0A09' }} onClick={() => openWhatsApp(h.tracks.affiliation)}>💬 {h.partnership.affiliation.btn} <Arrow /></button>
              </div>
              <div className="inv-track-card" style={{ border:'1px solid #9B1B3033', borderTop:'3px solid #9B1B30' }}>
                <div className="inv-track-icon">📦</div>
                <h4 className="inv-track-title">{h.partnership.adoption.title}</h4>
                <p className="inv-track-desc">{h.partnership.adoption.desc}</p>
                <button className="inv-track-btn" style={{ background:'#9B1B30', color:'#fff' }} onClick={() => openWhatsApp(h.tracks.adoption)}>💬 {h.partnership.adoption.btn} <Arrow /></button>
              </div>
              <div className="inv-track-card" style={{ border:'1px solid #0e749033', borderTop:'3px solid #0e7490' }}>
                <div className="inv-track-icon">⚡</div>
                <h4 className="inv-track-title">{h.partnership.teamup.title}</h4>
                <p className="inv-track-desc">{h.partnership.teamup.desc}</p>
                <button className="inv-track-btn" style={{ background:'#0e7490', color:'#fff' }} onClick={() => openWhatsApp(h.tracks.teamup)}>💬 {h.partnership.teamup.btn} <Arrow /></button>
              </div>
            </div>
          </div>
        </section>

        {/* 06 WHAT YOU BRING */}
        <section id="inv-youbring" data-section="youbring" style={{ background:'#1A1614', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>{h.youBring.eyebrow}</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'#f0ebe3', margin:'0 0 .75rem' }}>{h.youBring.title}</h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2rem', lineHeight:1.7 }}>{h.youBring.sub}</p>
            <div className="inv-bring-grid">
              {h.youBring.items.map((item, i) => (
                <div key={item.title} className="inv-bring-card">
                  <div className="inv-bring-icon">{YOUBRING_ICONS[i]}</div>
                  <div className="inv-bring-title">{item.title}</div>
                  <div className="inv-bring-desc">{item.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ color:'#a09070', fontSize:'.78rem', textAlign:'center', marginTop:'.5rem', fontStyle:'italic' }}>
              {h.youBring.footnote}
            </p>
          </div>
        </section>

        {/* 07 TEST & SHAPE */}
        <section id="inv-downloads" data-section="downloads" className="co-section co-section-dark">
          <div className="co-container">
            <div className="co-eyebrow">{h.downloads.eyebrow}</div>
            <h2 className="co-title">{h.downloads.title}</h2>
            <p className="co-sub">{h.downloads.sub}</p>
            <div className="co-downloads-grid">
              {(coData?.downloads?.length
                ? coData.downloads
                : DOWNLOAD_META.map(m => ({
                    ...m,
                    name: h.downloads.apps[m.key].name,
                    description: h.downloads.apps[m.key].desc,
                  }))
              ).map((app: any) => (
                <div key={app.app_id || app.id} className="co-download-card">
                  <div className="co-dl-header">
                    <span className="co-dl-emoji">{app.emoji}</span>
                    <span className={`co-dl-status co-dl-${app.status}`}>
                      {app.status === 'live' ? `🟢 ${h.portfolio.badges.live}` : app.status === 'beta' ? `🧪 ${h.portfolio.badges.beta}` : `🔧 ${h.portfolio.badges.dev}`}
                    </span>
                  </div>
                  <h4 className="co-dl-name">{app.name}</h4>
                  {(app.name_ar || app.nameAr) && isAr && <p className="co-dl-name-ar">{app.name_ar || app.nameAr}</p>}
                  <p className="co-dl-desc">{app.description || app.desc}</p>
                  <div className="co-dl-meta">
                    <span dir="ltr">{app.version}</span>
                    <span dir="ltr">{app.size}</span>
                  </div>
                  <div className="co-dl-actions">
                    <button className="co-dl-btn co-dl-btn-android" onClick={() => openWhatsApp(h.downloads.apkRequest(app.name))}>
                      📱 {h.downloads.android}
                    </button>
                    {(app.status === 'live' || app.status === 'beta') && (
                      <button className="co-dl-btn co-dl-btn-feedback" onClick={() => {
                        const section = document.getElementById('inv-cobuilder')
                        if (section) section.scrollIntoView({ behavior: 'smooth' })
                      }}>
                        🐛 {h.downloads.report}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="co-dl-footer-note">
              {h.downloads.footerNote}
            </p>
          </div>
        </section>

        {/* 08 STUDIO JOURNAL */}
        <section id="inv-journal" data-section="journal" className="co-section co-section-warm">
          <div className="co-container">
            <div className="co-eyebrow">{h.journal.eyebrow}</div>
            <h2 className="co-title">{h.journal.title}</h2>
            <p className="co-sub">{h.journal.sub}</p>
            <div className="co-journal-feed">
              {(coData?.journal?.length
                ? coData.journal
                : h.journal.fallback.map((entry, i) => ({
                    ...JOURNAL_META[i],
                    publish_date: entry.date,
                    title: entry.title,
                    body: entry.body,
                    credit: entry.credit,
                  }))
              ).map((entry: any, i: number) => {
                const cat = entry.category || entry.cat
                const catLabel = cat === 'launch' ? `🚀 ${h.journal.categories.launch}`
                  : cat === 'patent' ? `📜 ${h.journal.categories.patent}`
                  : cat === 'update' ? `🔄 ${h.journal.categories.update}`
                  : cat === 'milestone' ? `🏆 ${h.journal.categories.milestone}`
                  : `🏛 ${h.journal.categories.community}`
                return (
                  <article key={i} className={`co-journal-entry${entry.pinned ? ' co-journal-pinned' : ''}`}>
                    <div className="co-journal-meta">
                      <span className={`co-journal-cat co-cat-${cat}`}>{catLabel}</span>
                      {entry.product && <span className="co-journal-product">{entry.product}</span>}
                      <span className="co-journal-date">{entry.publish_date || entry.date}</span>
                      {entry.pinned && <span className="co-journal-pin">📌</span>}
                    </div>
                    <h4 className="co-journal-title">{entry.title}</h4>
                    <p className="co-journal-body">{entry.body}</p>
                    {entry.credit && <p className="co-journal-credit">{h.journal.creditPrefix} {entry.credit}</p>}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* 09 OUR PROGRESS */}
        <section id="inv-traction-live" data-section="traction-live" className="co-section co-section-dark">
          <div className="co-container">
            <div className="co-eyebrow">{h.progress.eyebrow}</div>
            <h2 className="co-title">{h.progress.title}</h2>
            <p className="co-sub">{h.progress.sub}</p>

            {/* Global KPIs */}
            <div className="co-kpi-grid">
              {(coData?.kpis?.length ? coData.kpis : [
                { label: h.progress.kpis.products,   value: '10',    icon: '📦' },
                { label: h.progress.kpis.patents,    value: '2',     icon: '📜' },
                { label: h.progress.kpis.beta,       value: '4',     icon: '🧪' },
                { label: h.progress.kpis.industries, value: '5',     icon: '🏢' },
                { label: h.progress.kpis.loc,        value: '280K+', icon: '💻' },
                { label: h.progress.kpis.founder,    value: '1',     icon: '👤' },
              ]).map((kpi: any) => (
                <div key={kpi.label} className="co-kpi-card">
                  <span className="co-kpi-icon">{kpi.icon}</span>
                  <span className="co-kpi-value" dir="ltr">{kpi.value}</span>
                  <span className="co-kpi-label">{kpi.label}</span>
                </div>
              ))}
            </div>

            {/* Product Progress Bars */}
            <div className="co-progress-section">
              <h4 className="co-progress-heading">{h.progress.readiness}</h4>
              {(coData?.progress?.length ? coData.progress : PROGRESS_META.map(p => ({
                product_name: p.name, pct: p.pct, color: p.color,
                status: h.progress.statuses[p.statusKey],
              }))).map((p: any) => (
                <div key={p.product_name || p.name} className="co-progress-row">
                  <div className="co-progress-label">
                    <span>{p.product_name || p.name}</span>
                    <span className="co-progress-status">{p.status}</span>
                  </div>
                  <div className="co-progress-bar">
                    <div className="co-progress-fill" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                  <span className="co-progress-pct" dir="ltr">{p.pct}%</span>
                </div>
              ))}
            </div>

            {/* Co Impact */}
            <div className="co-impact-box">
              <h4 className="co-impact-heading">{h.progress.impactHeading}</h4>
              <div className="co-impact-grid">
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.bugs_reported ?? 0}</span><span className="co-impact-label">{h.progress.impact.bugs}</span></div>
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.suggestions ?? 0}</span><span className="co-impact-label">{h.progress.impact.suggestions}</span></div>
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.ideas_shipped ?? 0}</span><span className="co-impact-label">{h.progress.impact.shipped}</span></div>
                <div className="co-impact-stat"><span className="co-impact-num">{coData?.impact?.co_builders ?? 0}</span><span className="co-impact-label">{h.progress.impact.builders}</span></div>
              </div>
              <p className="co-impact-note">{h.progress.impactNote}</p>
            </div>
          </div>
        </section>

        {/* 10 CO-BUILDER BOARD + REGISTRY */}
        <section id="inv-cobuilder" data-section="cobuilder" className="co-section co-section-warm">
          <div className="co-container">
            <div className="co-eyebrow">{h.board.eyebrow}</div>
            <h2 className="co-title">{h.board.title}</h2>
            <p className="co-sub">{h.board.sub}</p>

            {/* Submit Card */}
            <div className="co-submit-card">
              <h4 className="co-submit-title">💡 {h.board.submitTitle}</h4>
              <p className="co-submit-desc">{h.board.submitDesc}</p>
              <div className="co-submit-actions">
                <a href="https://wa.me/966535271122?text=%F0%9F%92%A1%20Co-Builder%20Idea%3A%0A%0AProduct%3A%0AIdea%3A" target="_blank" rel="noopener" className="co-submit-btn">
                  💬 {h.board.submitWa}
                </a>
                <a href="mailto:momen@momencrafts.com?subject=Co-Builder Idea&body=Product:%0AIdea:%0AType (bug/feature/suggestion):" className="co-submit-btn co-submit-btn-email">
                  ✉️ {h.board.submitEmail}
                </a>
              </div>
            </div>

            {/* Board Posts */}
            <div className="co-board-posts">
              <h4 className="co-board-heading">{h.board.recentHeading}</h4>
              {(coData?.board?.length ? coData.board : h.board.fallbackPosts.map(p => ({
                title: p.title, product: p.product, status: 'new', author_name: '—', votes: 0,
              }))).map((post: any, i: number) => (
                <div key={i} className="co-board-post">
                  <div className="co-board-post-main">
                    <span className={`co-board-status co-board-${post.status}`}>
                      {post.status === 'new' ? `🆕 ${h.board.statuses.new}`
                        : post.status === 'reviewing' ? `🔍 ${h.board.statuses.reviewing}`
                        : post.status === 'approved' ? `✅ ${h.board.statuses.approved}`
                        : post.status === 'implemented' ? `🏛 ${h.board.statuses.implemented}`
                        : post.status}
                    </span>
                    <h5 className="co-board-post-title">{post.title}</h5>
                    <span className="co-board-product">{post.product}</span>
                  </div>
                  <div className="co-board-post-meta">
                    <span className="co-board-author">{h.board.by} {post.author_name || post.author || '—'}</span>
                    <span className="co-board-votes">▲ {post.votes}</span>
                  </div>
                </div>
              ))}
              <p className="co-board-empty-note">{h.board.emptyNote}</p>
            </div>

            {/* & Co Registry Wall */}
            <div className="co-registry-wall">
              <div className="co-registry-header">
                <span className="co-registry-icon">🏛</span>
                <h4 className="co-registry-title">{h.board.registryTitle}</h4>
                <p className="co-registry-sub">{h.board.registrySub}</p>
              </div>
              <div className="co-registry-empty">
                {h.board.prompts.map(prompt => (
                  <div className="co-registry-placeholder" key={prompt}>
                    <span className="co-registry-question">?</span>
                    <p>{h.board.yourNameHere}</p>
                    <p className="co-registry-prompt">{prompt}</p>
                  </div>
                ))}
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
              <span>{h.letsBuild.eyebrow}</span>
            </div>

            {/* Main headline */}
            <h2 className="letsb-heading">
              {h.letsBuild.headingLine1}<br/>
              <em>{h.letsBuild.headingEm}</em>
            </h2>
            <p className="letsb-sub">
              {h.letsBuild.sub.map((line, i) => (
                <span key={i}>{line}{i < h.letsBuild.sub.length - 1 && <br/>}</span>
              ))}
            </p>

            {/* Three partnership tracks */}
            <div className="letsb-tracks">
              <button onClick={() => openWhatsApp(h.tracks.affiliation)} className="letsb-track-btn letsb-track-affiliate">
                <span className="letsb-track-icon">🌐</span>
                <span className="letsb-track-label">{h.letsBuild.tracks.affiliate.label}</span>
                <span className="letsb-track-sub">{h.letsBuild.tracks.affiliate.sub}</span>
              </button>
              <button onClick={() => openWhatsApp(h.tracks.adoption)} className="letsb-track-btn letsb-track-adopt">
                <span className="letsb-track-icon">📦</span>
                <span className="letsb-track-label">{h.letsBuild.tracks.adopt.label}</span>
                <span className="letsb-track-sub">{h.letsBuild.tracks.adopt.sub}</span>
              </button>
              <button onClick={() => openWhatsApp(h.tracks.teamup)} className="letsb-track-btn letsb-track-team">
                <span className="letsb-track-icon">⚡</span>
                <span className="letsb-track-label">{h.letsBuild.tracks.team.label}</span>
                <span className="letsb-track-sub">{h.letsBuild.tracks.team.sub}</span>
              </button>
            </div>

            {/* Primary CTAs */}
            <div className="letsb-ctas">
              <a href="https://wa.me/966535271122" target="_blank" rel="noopener" className="letsb-cta-wa">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {h.letsBuild.waCta}
              </a>
              <a href={`mailto:momen@momencrafts.com?subject=${encodeURIComponent(h.letsBuild.emailSubject)}`} className="letsb-cta-email">
                ✉️ momen@momencrafts.com
              </a>
            </div>

            {/* Trust footer */}
            <div className="letsb-trust">
              {h.letsBuild.trust.map(item => <span key={item}>{item}</span>)}
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
              <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", color:'#f0ebe3', marginBottom:'.75rem', fontSize:'1.8rem' }}>{h.expired.title}</h2>
              <p style={{ color:'#a09070', marginBottom:'.5rem', lineHeight:1.7 }}>{h.expired.body}</p>
              <p style={{ color:'#a09070', fontSize:'.8rem', marginBottom:'2.5rem', fontFamily:'monospace' }}>{h.expired.note}</p>
              <a href={`mailto:momen@momencrafts.com?subject=${encodeURIComponent(h.expired.emailSubject)}`} style={{ display:'inline-block', background:'#C8A96E', color:'#0C0A09', padding:'.9rem 2.2rem', borderRadius:'10px', textDecoration:'none', fontFamily:'monospace', fontWeight:700, fontSize:'.9rem' }}>{h.expired.cta} <Arrow /></a>
            </div>
          </div>
        )}

      </div>
      </div>
    </div>
  )
}

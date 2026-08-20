import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'

/* ═══════════════════════════════════════════════════════
   CoFounderWelcome — Premium celebration overlay
   Fires after NDA acceptance for PERMANENT / STRATEGIC tokens.
   Design system: gate.css tokens (--g-gold, --g-ink, etc.)
   ═══════════════════════════════════════════════════════ */

interface CoFounderWelcomeProps {
  name?: string
  onEnter: () => void
  projectAccess?: string[]
  tokenType?: string
}

/* ── Confetti canvas ────────────────────────────────── */
function useConfettiCanvas(ref: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let W = canvas.width  = canvas.offsetWidth
    let H = canvas.height = canvas.offsetHeight

    const particles = Array.from({ length: 48 }, (_, i) => {
      const angle  = (i / 48) * Math.PI * 2
      const speed  = 1.8 + Math.random() * 2.8
      const isGold = Math.random() > 0.35
      return {
        x: W / 2, y: H / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        r:  Math.random() * 3.5 + 1.2,
        a:  1,
        gold: isGold,
        decay: 0.006 + Math.random() * 0.008,
        gravity: 0.04 + Math.random() * 0.03,
      }
    })

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      let alive = false
      particles.forEach(p => {
        if (p.a <= 0) return
        alive = true
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.gold
          ? `rgba(200,169,110,${p.a})`
          : `rgba(240,235,227,${p.a * 0.5})`
        ctx.fill()
        p.x  += p.vx
        p.y  += p.vy
        p.vy += p.gravity
        p.a  -= p.decay
      })
      if (alive) raf = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [ref, active])
}

/* ── Main component ─────────────────────────────────── */
export function CoFounderWelcome({ name, onEnter, projectAccess = [], tokenType = '' }: CoFounderWelcomeProps) {
  const { t, isAr } = useT()
  const w = t.gate.welcome
  const isXhbFounder = tokenType === 'COFOUNDER' && projectAccess.includes('xhb')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible,   setVisible]   = useState(false)
  const [sealIn,    setSealIn]    = useState(false)
  const [contentIn, setContentIn] = useState(false)
  const [countdown, setCountdown] = useState(14)

  useConfettiCanvas(canvasRef, sealIn)

  // Staggered entrance
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true),    40)
    const t2 = setTimeout(() => setSealIn(true),    300)
    const t3 = setTimeout(() => setContentIn(true), 700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Auto-dismiss countdown
  useEffect(() => {
    if (!contentIn) return
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onEnter(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [contentIn, onEnter])

  return (
    <div
      className={`cofound-overlay${visible ? ' cofound-overlay--in' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={w.ariaLabel}
    >
      {/* Confetti canvas — full overlay */}
      <canvas
        ref={canvasRef}
        className="cofound-confetti-canvas"
        aria-hidden="true"
      />

      {/* Ambient radial glow */}
      <div className="cofound-glow" aria-hidden="true" />

      {/* Card */}
      <div className={`cofound-card${sealIn ? ' cofound-card--in' : ''}`}>

        {/* ── Seal ── */}
        <div className={`cofound-seal${sealIn ? ' cofound-seal--in' : ''}`}>
          <div className="cofound-seal-ring cofound-seal-ring--1" />
          <div className="cofound-seal-ring cofound-seal-ring--2" />
          <span className="cofound-seal-mark">✦</span>
        </div>

        {/* ── Registry label ── */}
        <div className={`cofound-registry-label${contentIn ? ' cofound-content--in' : ''}`}>
          {isXhbFounder ? w.registryXhb : w.registry}
        </div>

        {/* ── Name plate ── */}
        {name && (
          <div className={`cofound-name-plate${contentIn ? ' cofound-content--in cofound-content--delay-1' : ''}`}>
            <span className="cofound-name-label">
              {w.registeredTo}
            </span>
            <span className="cofound-name-value">{name}</span>
          </div>
        )}

        {/* ── Headline ── */}
        <h1 className={`cofound-headline${contentIn ? ' cofound-content--in cofound-content--delay-2' : ''}`}>
          {isXhbFounder ? (
            <>
              <span className="cofound-headline-line">{w.headlineXhb1}</span>
              <em className="cofound-headline-gold">{w.headlineXhb2}</em>
            </>
          ) : (
            <>
              <span className="cofound-headline-line">{w.headline1}</span>
              <em className="cofound-headline-gold">{w.headline2}</em>
            </>
          )}
        </h1>

        {/* ── Win-Win body ── */}
        <div className={`cofound-body-wrap${contentIn ? ' cofound-content--in cofound-content--delay-3' : ''}`}>
          {isXhbFounder ? (
            <p className={`cofound-body${isAr ? ' cofound-body--ar' : ''}`}>
              {w.bodyXhbPre}<strong>{w.bodyXhbName}</strong>{w.bodyXhbPost}
            </p>
          ) : (
            <p className={`cofound-body${isAr ? ' cofound-body--ar' : ''}`}>
              {w.bodyPre}<strong>{w.bodyCo}</strong>{w.bodyPost}
              <strong className="cofound-winwin">{w.winWin}</strong>
            </p>
          )}
        </div>

        {/* ── & Co Registry badge ── */}
        <div className={`cofound-badge${contentIn ? ' cofound-content--in cofound-content--delay-4' : ''}`}>
          <span className="cofound-badge-dot" />
          {w.badge}
        </div>

        {/* ── CTA ── */}
        <button
          className={`cofound-cta${contentIn ? ' cofound-content--in cofound-content--delay-5' : ''}`}
          onClick={onEnter}
        >
          {w.cta} <span className="dir-arrow">→</span> ({countdown})
        </button>

        {/* ── Divider ── */}
        <div className="cofound-divider" />

        {/* ── Footer ── */}
        <p className="cofound-footer">
          {w.footer}
        </p>
      </div>
    </div>
  )
}

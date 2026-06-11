import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
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
          <span className="inv-toggle-icon" id={`inv-icon-${id}`}>{open ? '−' : '+'}</span>
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
        </div>
      </div>
    </div>
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
    STRATEGIC: 'Strategic Partner', PERMANENT: 'Permanent Access', FOUNDER: 'Founder Access',
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
          <span className="inv-bar-nda">✓ NDA Signed</span>
          {countdown && type === 'HOUR' && (
            <span id="inv-expiry-badge" className="inv-expiry-badge" style={{ animation: countdown < '10:00' ? 'pulse 1.2s infinite' : 'none' }}>
              ⏱ <span id="inv-countdown">{countdown}</span>
            </span>
          )}
        </div>
        <nav id="inv-section-nav" style={{ display:'flex', gap:'1.2rem', fontSize:'.66rem' }}>
          {[['#inv-traction','Traction'],['#inv-portfolio','Portfolio'],['#inv-vision','Vision'],['#inv-founder','Founder'],['#inv-youbring','What You Bring'],['#inv-letsbuild',"Let's Build →"]].map(([href, label]) => (
            <a key={href} href={href} style={{ color: label.includes('→') ? '#C8A96E' : '#a09070', textDecoration:'none', fontWeight: label.includes('→') ? 700 : 400 }}>{label}</a>
          ))}
        </nav>
        <div className="inv-bar-actions">
          <button onClick={handleExit} className="inv-bar-exit">Exit</button>
          <a href="#inv-letsbuild" className="inv-bar-cta">Let's Build →</a>
        </div>
      </div>

      {/* ── Scroll progress bar ── */}
      <div id="inv-scroll-bar" style={{ display:'block' }}>
        <div id="inv-scroll-fill" style={{ width: `${scrollPct}%` }} />
      </div>

      {/* ── NAV ── */}
      <nav id="nav" className={navOpen ? 'nav-open' : ''} style={{ top: '52px' }}>
        <div className="nav-inner">
          <a href="#hero" className="nav-logo" id="nav-logo-ar">
            <img src="/logo.png" alt="مؤمن كرافتس" className="nav-logo-img" />
            <span className="logo-text">مؤمن كرافتس</span>
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
      <section id="hero" className="hero" style={{ paddingTop:'52px' }}>
        <div className="hero-ember" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-eyebrow reveal">
            <span className="eyebrow-dot" />
            استوديو برمجيات الذكاء الاصطناعي · الرياض، السعودية
          </div>
          <h1 className="hero-heading reveal delay-100">
            بذكاء<br/><em>مصممة بعناية</em>
          </h1>
          <p className="hero-byline reveal delay-200">من MomenCrafts</p>
          <p className="hero-sub reveal delay-300">
            10 منتجات. 5 مجالات.<br/>استوديو واحد — يبني البنية الذكية لاقتصاد المنطقة.
          </p>
          <div className="hero-actions reveal delay-400">
            <a href="#products" className="btn btn-primary">تصفح أعمالنا <span className="btn-arrow">←</span></a>
            <a href="#about" className="btn btn-ghost">عن الاستوديو</a>
          </div>
          <div className="hero-stats reveal delay-500">
            <div className="stat"><span className="stat-num">10</span><span className="stat-label">منتجات</span></div>
            <div className="stat-divider">·</div>
            <div className="stat"><span className="stat-num">5</span><span className="stat-label">مجالات</span></div>
            <div className="stat-divider">·</div>
            <div className="stat"><span className="stat-num">1</span><span className="stat-label">رؤية</span></div>
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
          <p className="section-sub reveal delay-200">10 منتجات مصممة بعناية — كل واحدة بُنيت يدوياً من الفكرة للإطلاق.</p>
          <div className="products-grid">

            {/* ROGER·AI */}
            <article className="product-card featured reveal delay-100" id="card-roger-ar" data-accent="amber">
              <div className="card-accent-bar" />
              <div className="card-featured-badge">★ رائد</div>
              <div className="card-header">
                <div className="card-icon amber-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                </div>
                <span className="card-status testing">🧪 قيد الاختبار</span>
              </div>
              <h3 className="card-title">ROGER·AI</h3>
              <p className="card-tagline">مساعدك التنفيذي الذكي</p>
              <p className="card-desc">منصة ذكاء صوتية للمدراء التنفيذيين — ذاكرة مستمرة، تقارير استباقية، ودعم كامل للعربي والإنجليزي.</p>
              <div className="card-tags"><span className="tag">صوتية أولاً</span><span className="tag">iOS · Android</span><span className="tag">ثنائي اللغة</span></div>
              <a href="/rogerai" target="_blank" rel="noopener" className="card-link">اعرف أكثر ←</a>
            </article>

            {/* CLINIQ.ONE */}
            <article className="product-card featured reveal delay-200" id="card-cliniq-ar" data-accent="teal">
              <div className="card-accent-bar" />
              <div className="card-featured-badge">★ رائد</div>
              <div className="card-header">
                <div className="card-icon teal-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <span className="card-status testing">● مرحلة تجريبية</span>
              </div>
              <h3 className="card-title">CLINIQ.ONE</h3>
              <p className="card-tagline">منصة طب عن بُعد بالذكاء الاصطناعي</p>
              <p className="card-desc">منصة طب عن بُعد متكاملة — 5 تطبيقات لربط المرضى بالأطباء مصممة لقطاع الصحة في المنطقة.</p>
              <div className="card-tags"><span className="tag">رعاية صحية</span><span className="tag">MENA</span><span className="tag">5 تطبيقات</span></div>
              <span className="card-live-badge">🟢 LIVE</span>
              <a href="https://www.cliniq.one" target="_blank" rel="noopener" className="card-link">زيارة cliniq.one ←</a>
            </article>

            {/* QADAA */}
            <article className="product-card reveal delay-300" id="card-qadaa-ar" data-accent="blue">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon blue-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span className="card-status dev">◌ قيد التطوير</span>
              </div>
              <h3 className="card-title">QADAA · قضاء</h3>
              <p className="card-tagline">منصة قانونية بالذكاء الاصطناعي</p>
              <p className="card-desc">تربط العملاء بالمحامين مع أدوات ذكاء اصطناعي لتحليل القضايا ودعم كامل للعربية.</p>
              <div className="card-tags"><span className="tag">تقنية قانونية</span><span className="tag">السعودية · الإمارات</span></div>
              <a href="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20QADAA%20%C2%B7%20%D9%82%D8%B6%D8%A7%D8%A1%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" target="_blank" rel="noopener" className="card-link">تحدث مع المؤسس ←</a>
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
              <p className="card-desc">منصة لياقة بدنية تربط المدربين بالعملاء مع تدريب ذكي وتجربة تفاعلية متميزة.</p>
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
              <p className="card-tagline">منصة عقارات بالذكاء الاصطناعي</p>
              <p className="card-desc">منصة عقارية ذكية مصممة لدعم رؤية 2030 — تحليل سوق وأنظمة مطابقة متقدمة.</p>
              <div className="card-tags"><span className="tag">تقنية عقارية</span><span className="tag">رؤية 2030</span></div>
              <a href="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%B5%D8%A9%20AQAR%20%C2%B7%20%D8%B9%D9%82%D8%A7%D8%B1%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" target="_blank" rel="noopener" className="card-link">تحدث مع المؤسس ←</a>
            </article>

            {/* UMMI */}
            <article className="product-card featured reveal delay-600" id="card-ummi-ar" data-accent="mint">
              <div className="card-accent-bar" />
              <div className="card-featured-badge">★ عرض تفاعلي</div>
              <div className="card-header">
                <div className="card-icon mint-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <span className="card-status testing">● مرحلة تجريبية</span>
              </div>
              <h3 className="card-title">UMMI · أمي</h3>
              <p className="card-tagline">محفظة العائلة ورعاية الأم</p>
              <p className="card-desc">نظام مالي عائلي خاص لرعاية الأم — ميزانية ذكية، جيوب مخصصة، راتب تلقائي للأم، ونظام طوارئ — مصمم بدفء وكرامة للعائلات السعودية. ٢٨ وحدة، ٣ أدوار، ثنائي اللغة عربي/إنجليزي.</p>
              <div className="card-tags"><span className="tag">تقنية مالية</span><span className="tag">عائلي</span><span className="tag">عربي أولاً</span><span className="tag">٢٨ وحدة</span><span className="tag">IoT</span></div>
              <span className="card-live-badge">🟢 DEMO</span>
              <a href="/ummiwallet/" className="card-link">شاهد العرض التفاعلي ←</a>
            </article>

            {/* RELAYBOT */}
            <article className="product-card reveal delay-100" id="card-relay-ar" data-accent="green">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon green-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="8" rx="1"/><path d="M12 11v4"/><path d="M8 19h8"/></svg>
                </div>
                <span className="card-status dev">◌ قيد التطوير</span>
              </div>
              <h3 className="card-title">RELAYBOT</h3>
              <p className="card-tagline">نقل النص الذكي للأنظمة المقيدة</p>
              <p className="card-desc">جهاز يربط بين لوحة المفاتيح والحاسوب — الذكاء الاصطناعي يحسّن النص ويرجعه لأي نظام بدون قيود.</p>
              <div className="card-tags"><span className="tag">أجهزة</span><span className="tag">بلا تثبيت</span></div>
              <a href="https://github.com/momencrafts/relaybot" target="_blank" className="card-link">رابط المشروع على GitHub ←</a>
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
              <p className="card-desc">سبحة ذكية تجمع بين الذكر التقليدي وتقنيات حديثة — مصنوعة من مواد فاخرة.</p>
              <div className="card-tags"><span className="tag">قابل للارتداء</span><span className="tag">فاخر</span></div>
              <a href="https://wa.me/966535271122?text=%D8%A3%D9%87%D8%AA%D9%85%20%D8%A8%D9%85%D9%86%D8%AA%D8%AC%20SABHA%20%C2%B7%20%D8%B3%D8%A8%D8%AD%D8%A9%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AB%D8%B1" target="_blank" rel="noopener" className="card-link">تحدث مع المؤسس ←</a>
            </article>

            {/* TURBO DRONE CIRCUIT */}
            <article className="product-card reveal delay-300" id="card-tdc-ar" data-accent="crimson">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon crimson-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <span className="card-status prototype">◈ براءة اختراع</span>
              </div>
              <h3 className="card-title">TURBO DRONE CIRCUIT</h3>
              <p className="card-tagline">إدارة طاقة طائرات FPV</p>
              <p className="card-desc">نظام ذكي يعالج انخفاض الجهد في بطاريات الطائرات بدون طيار ويعوضها تلقائياً.</p>
              <div className="card-tags"><span className="tag">براءة اختراع</span><span className="tag">FPV · UAV</span></div>
              <a href="/tdc" className="card-link">عرض المشروع ←</a>
            </article>

            {/* EDGE TACK */}
            <article className="product-card reveal delay-400" id="card-edgetack-ar" data-accent="blue">
              <div className="card-accent-bar" />
              <div className="card-header">
                <div className="card-icon blue-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 8h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2"/></svg>
                </div>
                <span className="card-status prototype">◈ براءة اختراع</span>
              </div>
              <h3 className="card-title">EDGE TACK</h3>
              <p className="card-tagline">واقي شاشة مع أزرار ألعاب</p>
              <p className="card-desc">ملحق ألعاب جوال — واقي شاشة مع أزرار هوائية قابلة للطي لتجربة ألعاب احترافية.</p>
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
            <p className="about-body reveal delay-200">مؤمن كرافتس استوديو تقني في الرياض يطوّر منصات ذكية في الصحة، القانون، اللياقة، العقار، والأجهزة.</p>
            <p className="about-body reveal delay-300">أسسه <strong>مومن فرعون</strong> — مهندس برمجيات متكامل يصمم الأنظمة من الفكرة إلى الإطلاق.</p>
            <div className="about-details reveal delay-400">
              <div className="detail-row"><span className="detail-label">تأسست</span><span className="detail-value">2026</span></div>
              <div className="detail-row"><span className="detail-label">المقر</span><span className="detail-value">الرياض، السعودية</span></div>
              <div className="detail-row"><span className="detail-label">التواصل</span><span className="detail-value">momen@momencrafts.com</span></div>
            </div>
          </div>
          <div className="about-quote reveal delay-200">
            <blockquote>
              <p>«أقوى التقنيات هي تلك التي تختفي — تصبح طبيعية لدرجة أن المستخدم ينسى أنه يتفاعل مع آلة.»</p>
              <footer>— مومن فرعون، المؤسس · مؤمن كرافتس</footer>
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
          <p className="section-sub reveal delay-200">يسعدنا تواصلك — سواء مشروع، شراكة، أو استفسار.</p>
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
          <div><span className="footer-logo">✦ مؤمن كرافتس</span><p>استوديو برمجيات الذكاء الاصطناعي</p><p>الرياض، المملكة العربية السعودية</p></div>
          <div className="footer-links"><a href="#products">المنتجات</a><a href="#about">عن الاستوديو</a><a href="#contact">تواصل</a></div>
          <div style={{ textAlign:'left' }}><p>momen@momencrafts.com</p><p>الرياض · السعودية · 2026</p></div>
        </div>
        <div className="container"><div className="footer-rule" /><div className="footer-copy"><span>© 2026 مؤمن كرافتس</span><span className="crafted">صُنع بواسطة مومن فرعون ✦</span></div></div>
      </footer>

      {/* ══════════════════════════
          WhatsApp Float Button
      ══════════════════════════ */}
      <a id="wa-btn" href="https://wa.me/966535271122?text=مرحبا مؤمن كرافتس" target="_blank" rel="noopener" aria-label="واتساب">
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
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>01 · TRACTION</div>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1.8rem,4vw,3rem)', color:'#f0ebe3', margin:'0 0 2.5rem', fontWeight:700 }}>
              القصة حتى الآن <span style={{ fontSize:'.55em', color:'#C8A96E', fontStyle:'italic' }}>· The Story So Far</span>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1.5rem', marginBottom:'3rem' }}>
              {[['10','منتجات مبنية · Products'],['2','براءات اختراع · Patents'],['5','قطاعات · Industries'],['1','مؤسس · Solo Founder']].map(([num,label],i) => (
                <div key={num} style={{ background:'#1A1614', border:'1px solid #C8A96E33', borderRadius:'12px', padding:'1.5rem', textAlign:'center' }}>
                  <div style={{ fontSize:'2.8rem', fontWeight:900, color: i===3 ? '#9B1B30' : '#C8A96E', fontFamily:'Georgia,serif' }}>{num}</div>
                  <div style={{ color:'#a09070', fontSize:'.8rem', marginTop:'.3rem' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', position:'relative', paddingTop:'1rem' }}>
              <div style={{ position:'absolute', top:'1.6rem', left:0, right:0, height:'1px', background:'linear-gradient(to right,transparent,#C8A96E44,transparent)' }} />
              {[['2024','First Concept'],['2025 Q1','Cliniq.one Beta'],['2025 Q2','2 Patents Filed'],['2025 Q4','Ummi Wallet Beta'],['2026 →','Seeking Partners']].map(([year,label],i) => (
                <div key={year} style={{ textAlign:'center', flex:1, minWidth:'100px' }}>
                  <div style={{ width: i===4 ? '14px' : '10px', height: i===4 ? '14px' : '10px', borderRadius:'50%', background: i===4 ? '#9B1B30' : '#C8A96E', margin:'0 auto .6rem', position:'relative', zIndex:1, boxShadow: i===4 ? '0 0 10px #9B1B3088' : 'none' }} />
                  <div style={{ fontSize:'.65rem', color: i===4 ? '#9B1B30' : '#C8A96E', fontFamily:'monospace' }}>{year}</div>
                  <div style={{ fontSize:'.72rem', color:'#a09070', marginTop:'.2rem' }}>{label}</div>
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
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2.5rem', lineHeight:1.7 }}>10 products across 5 industries — each hand-built, solo, from concept to launch. Click any card to expand.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }} id="invPortfolioGrid">
              <InvCard id="roger" name="ROGER·AI" tagline="مساعدك التنفيذي الذكي · Executive Voice Intelligence" cat="Voice AI" badge="inv-badge-beta"
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
              <InvCard id="relay" name="RELAYBOT" tagline="نقل النص الذكي · Intelligent Text Bridge for Locked Systems" cat="Hardware · IoT" badge="inv-badge-dev"
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

        {/* 03 VISION */}
        <section id="inv-vision" data-section="vision" style={{ background:'#0C0A09', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3rem', alignItems:'center' }}>
            <div>
              <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>02 · VISION</div>
              <blockquote style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'clamp(1rem,2.2vw,1.5rem)', color:'#f0ebe3', lineHeight:1.7, borderLeft:'3px solid #9B1B30', paddingLeft:'1.5rem', margin:'1rem 0 2rem', fontStyle:'italic' }}>
                "The most powerful technology disappears — it becomes so natural the user forgets they're interacting with a machine."
              </blockquote>
              <p style={{ color:'#a09070', lineHeight:1.7, fontSize:'.88rem' }}>MomenCrafts builds the missing tech layer for the Arab world — starting with healthcare, fintech, and IoT. Every product targets a structural gap in MENA markets, not a feature request.</p>
            </div>
            <div style={{ background:'#0C0A09', border:'1px solid #C8A96E22', borderRadius:'16px', padding:'2rem' }}>
              <div style={{ fontFamily:'monospace', fontSize:'.68rem', color:'#C8A96E', marginBottom:'1rem', letterSpacing:'.15em' }}>MARKET OPPORTUNITY</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'.9rem' }}>
                {[['Digital Health (MENA)','$21.8B by 2028','#C8A96E'],['Islamic Fintech (Global)','$128B by 2025','#C8A96E'],['Vision 2030 Digital','SAR 1.2T','#C8A96E'],['Arabic-First AI Apps','UNDERSERVED ↑','#9B1B30']].map(([label,val,color],i) => (
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
              <div style={{ color:'#C8A96E', fontFamily:'monospace', fontSize:'.8rem', marginBottom:'1.5rem' }}>مؤمن فرعون · Founder &amp; Solo Engineer · Riyadh, KSA</div>
              <p style={{ color:'#a09070', lineHeight:1.8, fontSize:'.88rem', marginBottom:'1.5rem' }}>Built all 10 products solo — from PCB hardware design to iOS/Android apps, cloud infrastructure, AI systems, and patent filings. Former medical student turned full-stack engineer.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem' }}>
                {['USPTO Patent Filer','MOH Compliance','10 Products Solo','Riyadh · KSA'].map(tag => (
                  <span key={tag} style={{ background:'#1A1614', border:'1px solid #C8A96E33', color:'#C8A96E', padding:'.3rem .8rem', borderRadius:'20px', fontSize:'.7rem', fontFamily:'monospace' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 05 PARTNERSHIP */}
        <section id="inv-partnership" data-section="partnership" style={{ background:'#0C0A09', padding:'5rem 1.5rem' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>05 · PARTNERSHIP</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'#f0ebe3', margin:'0 0 .75rem' }}>مسارات الشراكة · Partnership Tracks</h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2.5rem', lineHeight:1.7 }}>Choose the track that fits your position. Each button opens a pre-filled WhatsApp message — direct line to the founder.</p>
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
            <div style={{ fontFamily:'monospace', fontSize:'.7rem', letterSpacing:'.2em', color:'#C8A96E', marginBottom:'.5rem' }}>06 · WHAT YOU BRING</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'#f0ebe3', margin:'0 0 .75rem' }}>الشريك المناسب يحمل أكثر من موارد</h2>
            <p style={{ color:'#a09070', fontSize:'.85rem', margin:'0 0 2rem', lineHeight:1.7 }}>The right partner brings more than resources. One strong signal is enough to start a conversation.</p>
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

        {/* 07 LET'S BUILD */}
        <section id="inv-letsbuild" data-section="letsbuild" className="letsb-section">
          {/* Background decoration */}
          <div className="letsb-bg-deco" aria-hidden="true" />

          <div className="letsb-inner">

            {/* Eyebrow */}
            <div className="letsb-eyebrow">
              <span className="letsb-eyebrow-dot" />
              <span>07 · LET'S BUILD TOGETHER</span>
            </div>

            {/* Main headline */}
            <h2 className="letsb-heading">
              إن رأيت الفرصة —<br/>
              <em>فلنبنِها معاً</em>
            </h2>
            <p className="letsb-sub">
              No pitches. No decks.<br/>
              A direct conversation with the founder.<br/>
              All discussions are confidential under the NDA you have signed.
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

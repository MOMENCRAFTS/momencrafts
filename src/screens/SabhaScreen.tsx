import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import heroImg from '@/assets/sabha/hero.jpg'
import explodedImg from '@/assets/sabha/exploded.jpg'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import '@/styles/sabha.css'

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) }
    }), { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* Non-textual assets — all copy lives in the dictionary. */
const DRAWING_FILES = [
  'SHELL.pdf',
  'middle.pdf',
  'inner up.pdf',
  'inner down.pdf',
  'base.pdf',
]

const LAYER_ICONS = ['🔩', '⚙️', '🧲', '🧠', '💡', '🔋', '📡']

const MECHANICAL_ICONS = ['🔩', '⚙️', '◎']

export default function SabhaScreen() {
  useReveal()

  const { t, lang, dir } = useT()
  const s = t.sabha

  const waHref = `https://wa.me/966535271122?text=${encodeURIComponent(s.cta.whatsappMsg)}`

  return (
    <div className="sabha" dir={dir} lang={lang}>
      <LangToggle />

      {/* ═══ NAV ═══ */}
      <nav className="sb-nav">
        <Link to="/home" className="sb-brand"><b>{s.nav.brandBold}</b>{s.nav.brandRest}</Link>
        <div className="sb-nav-links">
          <a href="#philosophy">{s.nav.philosophy}</a>
          <a href="#architecture">{s.nav.architecture}</a>
          <a href="#specs">{s.nav.specs}</a>
          <a href="#drawings">{s.nav.drawings}</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="sb-hero">
        <div className="sb-hero-glow" />
        <span className="sb-mono sb-hero-label">{s.hero.label}</span>
        <h1 className="sb-hero-title">
          {s.hero.title}<br /><span className="sb-accent">{s.hero.titleAccent}</span>
        </h1>
        <p className="sb-hero-arabic">{s.hero.tagline}</p>
        <p className="sb-hero-sub">
          {s.hero.sub}
        </p>
        <div className="sb-hero-stats">
          {s.hero.stats.map(({ val, unit, label }) => (
            <div key={label} className="sb-stat">
              <div className="sb-stat-val">{val}<span className="sb-stat-unit">{unit}</span></div>
              <div className="sb-mono sb-stat-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="sb-hero-cta">
          <a href="#drawings" className="sb-btn sb-btn-primary">{s.hero.ctaDrawings}</a>
          <a href="#specs" className="sb-btn sb-btn-ghost">{s.hero.ctaSpecs}</a>
        </div>
      </section>

      {/* ═══ HERO IMAGE ═══ */}
      <div className="sb-hero-showcase">
        <img src={heroImg} alt={s.hero.imgAlt} className="reveal" />
      </div>

      {/* ═══ PHILOSOPHY ═══ */}
      <section id="philosophy" className="sb-section sb-section-border">
        <div className="sb-section-head reveal">
          <h3 className="sb-mono sb-h3">{s.philosophy.kicker}</h3>
          <h2 className="sb-h2">{s.philosophy.title}</h2>
        </div>
        <div className="sb-quote reveal">
          <p>
            {s.philosophy.quote}
          </p>
        </div>
        <p className="reveal" style={{ color: 'var(--sb-text-2)', lineHeight: 1.8, marginTop: '1.5rem' }}>
          {s.philosophy.bodyLead}<strong style={{ color: 'var(--sb-text)' }}>{s.philosophy.cat1}</strong>{s.philosophy.cat1Note}
          <strong style={{ color: 'var(--sb-text)' }}>{s.philosophy.cat2}</strong>{s.philosophy.cat2Note}
          <strong style={{ color: 'var(--sb-text)' }}>{s.philosophy.cat3}</strong>{s.philosophy.cat3Note}
          {s.philosophy.cat4Pre}<strong style={{ color: 'var(--sb-text)' }}>{s.philosophy.cat4}</strong>{s.philosophy.cat4Note}
          {s.philosophy.bodyTail}
        </p>
      </section>

      {/* ═══ INTERACTION ═══ */}
      <section className="sb-section sb-section-border">
        <div className="sb-section-head reveal">
          <h3 className="sb-mono sb-h3">{s.interaction.kicker}</h3>
          <h2 className="sb-h2">{s.interaction.title}</h2>
          <p>
            {s.interaction.desc}
          </p>
        </div>
        <div className="sb-flow reveal">
          {s.interaction.flowSteps.map((step, i) => (
            <span key={i}>
              <span className="sb-flow-step">{step}</span>
              {i < s.interaction.flowSteps.length - 1 && <span className="sb-flow-arrow dir-arrow"> → </span>}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ ARCHITECTURE ═══ */}
      <section id="architecture" className="sb-section sb-section-border">
        <div className="sb-section-head reveal">
          <h3 className="sb-mono sb-h3">{s.architecture.kicker}</h3>
          <h2 className="sb-h2">{s.architecture.title}</h2>
          <p>{s.architecture.desc}</p>
        </div>
        <div className="sb-layers reveal">
          {s.architecture.layers.map((layer, i) => (
            <div key={layer.name} className="sb-layer">
              <span className="sb-layer-icon">{LAYER_ICONS[i]}</span>
              <span className="sb-layer-name">{layer.name}</span>
              <span className="sb-layer-desc">{layer.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ EXPLODED VIEW ═══ */}
      <div className="sb-hero-showcase">
        <img src={explodedImg} alt={s.architecture.explodedAlt} className="reveal" />
      </div>

      {/* ═══ MECHANICAL ═══ */}
      <section className="sb-section sb-section-border">
        <div className="sb-section-head reveal">
          <h3 className="sb-mono sb-h3">{s.mechanical.kicker}</h3>
          <h2 className="sb-h2">{s.mechanical.title}</h2>
          <p>
            {s.mechanical.desc}
          </p>
        </div>
        <div className="sb-layers reveal">
          {s.mechanical.items.map((item, i) => (
            <div key={item.name} className="sb-layer">
              <span className="sb-layer-icon">{MECHANICAL_ICONS[i]}</span>
              <span className="sb-layer-name">{item.name}</span>
              <span className="sb-layer-desc">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SPECS ═══ */}
      <section id="specs" className="sb-section sb-section-border">
        <div className="sb-section-head reveal">
          <h3 className="sb-mono sb-h3">{s.specs.kicker}</h3>
          <h2 className="sb-h2">{s.specs.title}</h2>
        </div>
        <div className="sb-specs reveal">
          {s.specs.rows.map(row => (
            <div key={row.key} className="sb-spec-row">
              <span className="sb-spec-key">{row.key}</span>
              <span className="sb-spec-val">{row.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ DRAWINGS ═══ */}
      <section id="drawings" className="sb-section sb-section-border">
        <div className="sb-section-head reveal">
          <h3 className="sb-mono sb-h3">{s.drawings.kicker}</h3>
          <h2 className="sb-h2">{s.drawings.title}</h2>
          <p>{s.drawings.desc}</p>
        </div>
        <div className="sb-drawings reveal">
          {DRAWING_FILES.map((file, i) => (
            <a key={file} href={`/sabha/cad/${file}`} target="_blank" rel="noopener" className="sb-drawing-card">
              <span className="sb-drawing-icon">📐</span>
              <span className="sb-drawing-name">{s.drawings.names[i]}</span>
              <span className="sb-drawing-dl">{s.drawings.viewPdf}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="sb-cta sb-section-border">
        <h3 className="sb-mono sb-h3">{s.cta.kicker}</h3>
        <h2 className="sb-h2">{s.cta.title}</h2>
        <p>{s.cta.desc}</p>
        <div className="sb-cta-actions">
          <a href={waHref} target="_blank" rel="noopener" className="sb-btn sb-btn-primary">{s.cta.whatsapp} <span className="dir-arrow">→</span></a>
          <Link to="/home" className="sb-btn sb-btn-ghost"><span className="dir-arrow">←</span> {s.cta.investorRoom}</Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="sb-footer">
        <span>{s.footer.copy}</span>
        <span>{s.footer.tagline}</span>
      </footer>
    </div>
  )
}

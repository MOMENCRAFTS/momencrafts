import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import boardRender from '@/assets/tdc/board_render.png'
import topologyDiagram from '@/assets/tdc/topology_diagram.png'
import powerFlow from '@/assets/tdc/power_flow.png'
import droneApp from '@/assets/tdc/drone_application.png'
import sizeCompare from '@/assets/tdc/size_comparison.png'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import '@/styles/tdc.css'

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) }
    }), { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* Layout-only metadata. Copy lives in t.tdc.*, matched to these by index. */
const BENTO_WIDE = [false, false, false, true, false]

const STACKUP_STYLE: Array<[string, number]> = [
  ['var(--tdc-red)', 28],
  ['#333',           12],
  ['#ff6666',        20],
  ['#333',           36],
  ['#aaa',           20],
  ['#333',           12],
  ['#aa66ff',        28],
]

const GALLERY_IMAGES = [boardRender, topologyDiagram, powerFlow, droneApp, sizeCompare]

export default function TDCScreen() {
  const { t } = useT()
  const d = t.tdc

  useReveal()

  return (
    <div className="tdc">
      <LangToggle />

      {/* ═══ NAV ═══ */}
      <nav className="tdc-nav">
        <Link to="/home" className="tdc-brand"><b>{d.nav.brandBold}</b>{d.nav.brandRest}</Link>
        <div className="tdc-nav-links">
          <a href="#how">{d.nav.how}</a>
          <a href="#specs">{d.nav.specs}</a>
          <a href="#sequence">{d.nav.sequence}</a>
          <a href="#bom">{d.nav.bom}</a>
          <a href="https://github.com/MOMENCRAFTS/turbo-drone-circuit" target="_blank" rel="noopener">{d.nav.github}</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="tdc-hero">
        <div className="tdc-hero-glow" />
        <span className="tdc-mono tdc-hero-label">{d.hero.label}</span>
        <h1 className="tdc-hero-title">
          {d.hero.titleTop}<br /><span className="tdc-accent">{d.hero.titleAccent}</span>
        </h1>
        <p className="tdc-hero-sub">
          {d.hero.sub}
        </p>
        <div className="tdc-hero-stats">
          {d.hero.stats.map(({ val, unit, label }) => (
            <div key={label} className="tdc-stat">
              <div className="tdc-stat-val">{val}<span className="tdc-stat-unit">{unit}</span></div>
              <div className="tdc-mono tdc-stat-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="tdc-hero-cta">
          <a href="#specs" className="tdc-btn tdc-btn-primary">{d.hero.ctaSpecs}</a>
          <a href="https://github.com/MOMENCRAFTS/turbo-drone-circuit" target="_blank" rel="noopener" className="tdc-btn tdc-btn-ghost">{d.hero.ctaGithub}</a>
        </div>
      </section>

      {/* ═══ BOARD IMAGE ═══ */}
      <div className="tdc-board-showcase">
        <img src={boardRender} alt={d.board.alt} className="tdc-board-img" />
      </div>

      {/* ═══ FEATURES ═══ */}
      <section className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.features.h3}</h3>
          <h2 className="tdc-h2">{d.features.h2}</h2>
          <p>{d.features.lead}</p>
        </div>
        <div className="tdc-bento">
          {d.features.cards.map(({ icon, title, desc }, i) => (
            <div key={i} className={`tdc-bento-card reveal ${BENTO_WIDE[i] ? 'tdc-bento-wide' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="tdc-bento-icon">{icon}</div>
              <div className="tdc-bento-title">{title}</div>
              <div className="tdc-bento-desc">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.how.h3}</h3>
          <h2 className="tdc-h2">{d.how.h2}</h2>
          <p>{d.how.lead}</p>
        </div>
        <div className="tdc-modes">
          <div className="tdc-mode-card reveal">
            <span className="tdc-mode-badge tdc-badge-normal">{d.how.normal.badge}</span>
            <div className="tdc-mode-voltage">{d.how.normal.voltage}<span className="tdc-stat-unit">{d.how.normal.unit}</span></div>
            <p className="tdc-mode-desc">{d.how.normal.desc}</p>
            <div className="tdc-mode-path">{d.how.normal.path}</div>
          </div>
          <div className="tdc-mode-card tdc-mode-active reveal">
            <span className="tdc-mode-badge tdc-badge-turbo">{d.how.turbo.badge}</span>
            <div className="tdc-mode-voltage">{d.how.turbo.voltage}<span className="tdc-stat-unit">{d.how.turbo.unit}</span> <span className="tdc-boost-tag">{d.how.turbo.boostTag}</span></div>
            <p className="tdc-mode-desc">{d.how.turbo.desc}</p>
            <div className="tdc-mode-path">{d.how.turbo.path}</div>
          </div>
        </div>
      </section>

      {/* ═══ SEQUENCE ═══ */}
      <section id="sequence" className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.sequence.h3}</h3>
          <h2 className="tdc-h2">{d.sequence.h2}</h2>
          <p>{d.sequence.lead}</p>
        </div>
        <div className="tdc-timeline reveal">
          {d.sequence.steps.map((step, i) => (
            <div key={i} className="tdc-tl-step">
              <div className="tdc-mono tdc-tl-time">{step.time} — {step.label}</div>
              <div className="tdc-tl-title">{step.title}</div>
              <div className="tdc-tl-desc">{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SPECS ═══ */}
      <section id="specs" className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.specs.h3}</h3>
          <h2 className="tdc-h2">{d.specs.h2}</h2>
        </div>
        <div className="tdc-specs reveal">
          {d.specs.rows.map(([key, val]) => (
            <div key={key} className="tdc-spec-row">
              <span className="tdc-spec-key">{key}</span>
              <span className="tdc-spec-val">{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BOM ═══ */}
      <section id="bom" className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.bom.h3}</h3>
          <h2 className="tdc-h2">{d.bom.h2}</h2>
        </div>
        <div className="tdc-bom reveal">
          <table>
            <thead>
              <tr><th>{d.bom.headers.group}</th><th>{d.bom.headers.qty}</th><th>{d.bom.headers.part}</th><th>{d.bom.headers.pkg}</th></tr>
            </thead>
            <tbody>
              {d.bom.rows.map(([group, qty, part, pkg]) => (
                <tr key={group}><td>{group}</td><td className="tdc-qty">{qty}</td><td>{part}</td><td>{pkg}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ GALLERY ═══ */}
      <section className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.gallery.h3}</h3>
          <h2 className="tdc-h2">{d.gallery.h2}</h2>
        </div>
        <div className="tdc-gallery reveal">
          {GALLERY_IMAGES.map((src, i) => (
            <img key={i} src={src} alt={d.gallery.alt(i + 1)} />
          ))}
        </div>
      </section>

      {/* ═══ STACKUP ═══ */}
      <section className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">{d.stackup.h3}</h3>
          <h2 className="tdc-h2">{d.stackup.h2}</h2>
        </div>
        <div className="tdc-stackup reveal">
          {d.stackup.layers.map(({ label, desc }, i) => {
            const [color, h] = STACKUP_STYLE[i]
            return (
              <div key={i} className="tdc-layer" style={{ borderColor: color, height: h }}>
                <span style={{ color }}>{label}</span>
                {desc && <span className="tdc-layer-desc">{desc}</span>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="tdc-cta tdc-section-border">
        <h3 className="tdc-mono tdc-h3">{d.cta.h3}</h3>
        <h2 className="tdc-h2">{d.cta.h2}</h2>
        <p>{d.cta.lead}</p>
        <div className="tdc-cta-actions">
          <a href="https://github.com/MOMENCRAFTS/turbo-drone-circuit" target="_blank" rel="noopener" className="tdc-btn tdc-btn-primary">{d.cta.github}</a>
          <Link to="/home" className="tdc-btn tdc-btn-ghost">{d.cta.back}</Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="tdc-footer">
        <span>{d.footer.copy}</span>
        <span>{d.footer.tagline}</span>
      </footer>
    </div>
  )
}

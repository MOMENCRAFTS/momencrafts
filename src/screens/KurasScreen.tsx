import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import heroImg from '@/assets/kuras/hero.png'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import '@/styles/kuras.css'

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible')
    }), { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function useHamburger() {
  useEffect(() => {
    const btn   = document.getElementById('nav-hamburger')
    const links = document.getElementById('nav-links')
    if (!btn || !links) return
    const toggle = () => {
      const open = links.classList.toggle('open')
      btn.setAttribute('aria-expanded', String(open))
    }
    btn.addEventListener('click', toggle)
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open')
      btn.setAttribute('aria-expanded', 'false')
    }))
    return () => btn.removeEventListener('click', toggle)
  }, [])
}

export default function KurasScreen() {
  const { t } = useT()
  const k = t.kuras

  useReveal()
  useHamburger()
  return (
    <div className="kuras-page">
      <LangToggle />

      <nav id="nav">
        <Link to="/" className="nav-brand">{k.nav.brand}</Link>
        <ul className="nav-links" id="nav-links">
          <li><a href="#how">{k.nav.how}</a></li>
          <li><a href="#why">{k.nav.why}</a></li>
          <li><a href="#cta" className="nav-cta">{k.nav.cta}</a></li>
        </ul>
        <Link to="/home" className="nav-back">{k.nav.back}</Link>
        <button className="nav-hamburger" id="nav-hamburger" aria-label={k.nav.menuAria} aria-expanded="false">
          <span/><span/><span/>
        </button>
      </nav>

      <section className="hero kuras-hero">
        <div className="hero-inner container">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot"/>
              {k.hero.eyebrow}
            </div>
            <h1 className="hero-title">
              {k.hero.titleName}<br/><em>{k.hero.titleEm}</em><br/>{k.hero.titleRest}
            </h1>
            <p className="hero-sub">
              {k.hero.sub}
            </p>
            <div className="hero-badges">
              <span className="badge badge-amber">{k.hero.badges.stage}</span>
              <span className="badge badge-cyan">{k.hero.badges.edu}</span>
              <span className="badge badge-green">{k.hero.badges.safety}</span>
            </div>
            <div className="hero-actions">
              <a href="#cta" className="btn btn-amber">{k.hero.ctaPrimary}</a>
              <a href="#how" className="btn btn-ghost">{k.hero.ctaSecondary}</a>
            </div>
          </div>
          <div className="hero-device reveal">
            <img src={heroImg} alt={k.hero.deviceAlt} className="device-img" width="800" height="800"/>
          </div>
        </div>
      </section>

      <section className="kuras-facts" aria-label="KURAS in numbers">
        {k.facts.map(f => (
          <div className="stat reveal" key={f.label}>
            <span className="stat-num">{f.num}</span>
            <span className="stat-label">{f.label}</span>
          </div>
        ))}
      </section>

      <section id="how" className="capabilities">
        <div className="container">
          <div className="section-label">{k.how.label}</div>
          <h2 className="section-title">{k.how.title}</h2>
          <p className="section-sub">{k.how.sub}</p>
          <div className="cap-grid">
            {k.how.steps.map((s, i) => (
              <div className="cap-card reveal" key={s.title}>
                <div className="kuras-step-no">0{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="capabilities kuras-why">
        <div className="container">
          <div className="section-label">{k.why.label}</div>
          <h2 className="section-title">{k.why.title}</h2>
          <p className="section-sub">{k.why.sub}</p>
          <div className="cap-grid">
            {k.why.items.map(item => (
              <div className="cap-card reveal" key={item.title}>
                <div className="cap-icon" aria-hidden="true">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="cta-section">
        <div className="container">
          <div className="cta-overline">{k.cta.overline}</div>
          <h2 className="cta-title">{k.cta.titlePre}<em>{k.cta.titleEm}</em></h2>
          <p className="cta-sub">{k.cta.sub}</p>
          <div className="cta-actions">
            <a href="mailto:momen@momencrafts.com" className="btn btn-amber">{k.cta.primary}</a>
            <Link to="/home" className="btn btn-ghost">{k.cta.back}</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <span className="footer-brand">{k.footer.brand}</span>
          <span className="footer-copy">{k.footer.copy}</span>
          <Link to="/home" className="footer-back">{k.footer.back}</Link>
        </div>
      </footer>
    </div>
  )
}

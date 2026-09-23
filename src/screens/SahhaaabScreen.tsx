import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import heroImg from '@/assets/sahhaaab/hero.png'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import '@/styles/product-nav.css'
import '@/styles/sahhaaab.css'

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

export default function SahhaaabScreen() {
  const { t } = useT()
  const s = t.sahhaaab

  useReveal()
  useHamburger()
  return (
    <div className="sahhaaab-page product-page">
      <LangToggle />

      <nav id="nav">
        <Link to="/" className="nav-brand">{s.nav.brand}</Link>
        <ul className="nav-links" id="nav-links">
          <li><a href="#how">{s.nav.how}</a></li>
          <li><a href="#why">{s.nav.why}</a></li>
          <li><a href="#cta" className="nav-cta">{s.nav.cta}</a></li>
        </ul>
        <Link to="/home" className="nav-back">{s.nav.back}</Link>
        <button className="nav-hamburger" id="nav-hamburger" aria-label={s.nav.menuAria} aria-expanded="false">
          <span/><span/><span/>
        </button>
      </nav>

      <section className="hero sahhaaab-hero">
        <div className="hero-inner container">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot"/>
              {s.hero.eyebrow}
            </div>
            <h1 className="hero-title">
              {s.hero.titleName}<br/><em>{s.hero.titleEm}</em><br/>{s.hero.titleRest}
            </h1>
            <p className="hero-sub">
              {s.hero.sub}
            </p>
            <div className="hero-badges">
              <span className="badge badge-amber">{s.hero.badges.stage}</span>
              <span className="badge badge-cyan">{s.hero.badges.edu}</span>
              <span className="badge badge-green">{s.hero.badges.safety}</span>
            </div>
            <div className="hero-actions">
              <a href="#cta" className="btn btn-amber">{s.hero.ctaPrimary}</a>
              <a href="#how" className="btn btn-ghost">{s.hero.ctaSecondary}</a>
            </div>
          </div>
          <div className="hero-device reveal">
            <img src={heroImg} alt={s.hero.deviceAlt} className="device-img" width="1024" height="1536"/>
          </div>
        </div>
      </section>

      <section className="sahhaaab-facts" aria-label="Sahhaaab in numbers">
        {s.facts.map(f => (
          <div className="stat reveal" key={f.label}>
            <span className="stat-num">{f.num}</span>
            <span className="stat-label">{f.label}</span>
          </div>
        ))}
      </section>

      <section id="how" className="capabilities">
        <div className="container">
          <div className="section-label">{s.how.label}</div>
          <h2 className="section-title">{s.how.title}</h2>
          <p className="section-sub">{s.how.sub}</p>
          <div className="cap-grid">
            {s.how.steps.map((step, i) => (
              <div className="cap-card reveal" key={step.title}>
                <div className="sahhaaab-step-no">0{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="capabilities sahhaaab-why">
        <div className="container">
          <div className="section-label">{s.why.label}</div>
          <h2 className="section-title">{s.why.title}</h2>
          <p className="section-sub">{s.why.sub}</p>
          <div className="cap-grid">
            {s.why.items.map(item => (
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
          <div className="cta-overline">{s.cta.overline}</div>
          <h2 className="cta-title">{s.cta.titlePre}<em>{s.cta.titleEm}</em></h2>
          <p className="cta-sub">{s.cta.sub}</p>
          <div className="cta-actions">
            <a href="mailto:momen@momencrafts.com" className="btn btn-amber">{s.cta.primary}</a>
            <Link to="/home" className="btn btn-ghost">{s.cta.back}</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <span className="footer-brand">{s.footer.brand}</span>
          <span className="footer-copy">{s.footer.copy}</span>
          <Link to="/home" className="footer-back">{s.footer.back}</Link>
        </div>
      </footer>
    </div>
  )
}

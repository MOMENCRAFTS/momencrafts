import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import deviceHero from '@/assets/edgetacktic/hero.png'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'

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

export default function EdgeTackScreen() {
  const { t } = useT()
  const e = t.edgetack

  useReveal()
  useHamburger()
  return (
    <>
      <LangToggle />

      <nav id="nav">
        <Link to="/" className="nav-brand">{e.nav.brand}</Link>
        <ul className="nav-links" id="nav-links">
          <li><a href="#features">{e.nav.features}</a></li>
          <li><a href="#patent">{e.nav.patent}</a></li>
          <li><a href="#cta" className="nav-cta">{e.nav.cta}</a></li>
        </ul>
        <Link to="/home" className="nav-back">{e.nav.back}</Link>
        <button className="nav-hamburger" id="nav-hamburger" aria-label={e.nav.menuAria} aria-expanded="false">
          <span/><span/><span/>
        </button>
      </nav>

      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot"/>
              {e.hero.eyebrow}
            </div>
            <h1 className="hero-title">
              {e.hero.titleName}<br/><em>{e.hero.titleEm}</em><br/>{e.hero.titleRest}
            </h1>
            <p className="hero-sub">
              {e.hero.sub}
            </p>
            <div className="hero-badges">
              <span className="badge badge-amber">{e.hero.badges.patent}</span>
              <span className="badge badge-cyan">{e.hero.badges.hardware}</span>
              <span className="badge badge-green">{e.hero.badges.concept}</span>
            </div>
            <div className="hero-actions">
              <a href="#cta" className="btn btn-amber">{e.hero.ctaPrimary}</a>
              <a href="#features" className="btn btn-ghost">{e.hero.ctaSecondary}</a>
            </div>
          </div>
          <div className="hero-device reveal">
            <img src={deviceHero} alt={e.hero.deviceAlt} className="device-img"/>
          </div>
        </div>
      </section>

      <section id="cta" className="cta-section">
        <div className="container">
          <div className="cta-overline">{e.cta.overline}</div>
          <h2 className="cta-title">{e.cta.titlePre}<em>{e.cta.titleEm}</em></h2>
          <p className="cta-sub">{e.cta.sub}</p>
          <div className="cta-actions">
            <a href="mailto:momen@momencrafts.com" className="btn btn-amber">{e.cta.primary}</a>
            <Link to="/home" className="btn btn-ghost">{e.cta.back}</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <span className="footer-brand">{e.footer.brand}</span>
          <span className="footer-copy">{e.footer.copy}</span>
          <Link to="/home" className="footer-back">{e.footer.back}</Link>
        </div>
      </footer>
    </>
  )
}

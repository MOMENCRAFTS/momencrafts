import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import deviceHero from '@/assets/edgetacktic/hero.png'

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
  useReveal()
  useHamburger()
  return (
    <>
      <nav id="nav">
        <Link to="/" className="nav-brand">✦ MOMENCRAFTS</Link>
        <ul className="nav-links" id="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#patent">Patent</a></li>
          <li><a href="#cta" className="nav-cta">Get Early Access →</a></li>
        </ul>
        <Link to="/home" className="nav-back">← Investor Room</Link>
        <button className="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">
          <span/><span/><span/>
        </button>
      </nav>

      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot"/>
              MOMENCRAFTS · HARDWARE DIVISION
            </div>
            <h1 className="hero-title">
              EdgeTack<br/><em>Console Control,</em><br/>Zero Bulk.
            </h1>
            <p className="hero-sub">
              A patent-pending compact control unit designed for professionals — functional
              controller expansions without the bulk, built for precision and portability.
            </p>
            <div className="hero-badges">
              <span className="badge badge-amber">📋 PATENT PENDING</span>
              <span className="badge badge-cyan">HARDWARE</span>
              <span className="badge badge-green">CONCEPT PHASE</span>
            </div>
            <div className="hero-actions">
              <a href="#cta" className="btn btn-amber">Get Early Access →</a>
              <a href="#features" className="btn btn-ghost">Explore Features ↓</a>
            </div>
          </div>
          <div className="hero-device reveal">
            <img src={deviceHero} alt="EdgeTack Device" className="device-img"/>
          </div>
        </div>
      </section>

      <section id="cta" className="cta-section">
        <div className="container">
          <div className="cta-overline">EARLY ACCESS</div>
          <h2 className="cta-title">Be first to <em>get EdgeTack</em></h2>
          <p className="cta-sub">Patent-pending. Limited early access program — contact the founder directly.</p>
          <div className="cta-actions">
            <a href="mailto:momen@momencrafts.com" className="btn btn-amber">Contact Founder →</a>
            <Link to="/home" className="btn btn-ghost">← Investor Room</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <span className="footer-brand">✦ MOMENCRAFTS</span>
          <span className="footer-copy">© 2026 MomenCrafts · All rights reserved</span>
          <Link to="/home" className="footer-back">← Investor Room</Link>
        </div>
      </footer>
    </>
  )
}

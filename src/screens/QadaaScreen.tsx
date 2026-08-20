import { useEffect } from 'react';
import { useT } from '@/i18n';
import { LangToggle } from '@/components/LangToggle';
import '../styles/qadaa.css';

/* ════════════════════════════════════════════════════════
   QadaaScreen — قضاء · QADAA
   Legal Prestige Platform Page
   Design DNA: lawfirm.one / apps/landing
     • Midnight navy  #0B1423 / #0D1B2E
     • Gold palette   #9E7A20 → #C8A24A → #D4B76E → #EAD49E
     • Mahogany       #2A1E16 → #3D2E22
     • Leather        #9B6E4A
     • Warm parchment #E2D5C5 (for light surfaces)
     • Font           Playfair Display (serif) + Inter
   ════════════════════════════════════════════════════════ */

/* Non-textual per-app styling — copy lives in the dictionary. */
const APP_VISUALS = [
  { icon: '👤', color: '#C8A24A' },
  { icon: '⚖️', color: '#B8922E' },
  { icon: '🏢', color: '#9E7A20' },
  { icon: '⚙️', color: '#7B5E4D' },
  { icon: '🤖', color: '#D4B76E' },
];

const WHY_ICONS = ['🌐', '⚡', '🔒', '📍'];

export function QadaaScreen() {
  const { t, lang, dir } = useT();
  const q = t.qadaa;

  const waHref = `https://wa.me/966535271122?text=${encodeURIComponent(q.whatsappMsg)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.title = q.meta.title;
  }, [q]);

  return (
    <div className="qadaa-page" dir={dir} lang={lang} style={{ direction: dir }}>
      <LangToggle />

      {/* ── Hero ───────────────────────────────── */}
      <section className="qadaa-hero">
        {/* Riyadh skyline golden-hour bg */}
        <div className="qadaa-hero-bg" aria-hidden="true">
          <img
            src="/qadaa-splash.jpg"
            alt={q.hero.imgAlt}
            className="qadaa-hero-img"
          />
          <div className="qadaa-hero-overlay" />
        </div>

        {/* Gold ambient glow particles */}
        {[0,1,2,3,4,5].map(i => (
          <div
            key={i}
            className="qadaa-ambient-orb"
            style={{
              width:  `${80 + i*40}px`,
              height: `${80 + i*40}px`,
              top:    `${15 + i*12}%`,
              left:   `${8 + i*16}%`,
              animationDelay: `${i*0.8}s`,
              animationDuration: `${4 + i*0.5}s`,
            }}
          />
        ))}

        <div className="qadaa-hero-content">
          {/* Badge */}
          <div className="qadaa-hero-badge">
            <span className="qadaa-hero-badge-dot" />
            {q.hero.badge}
          </div>

          {/* Headline */}
          <h1 className="qadaa-hero-headline">
            <span className="qadaa-hero-headline-white">{q.hero.headlineTop}</span>
            <br />
            <span className="qadaa-hero-headline-gold">{q.hero.headlineBottom}</span>
          </h1>

          <p className="qadaa-hero-sub">
            {q.hero.sub}
          </p>

          {/* CTAs */}
          <div className="qadaa-hero-ctas">
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="qadaa-btn-gold"
            >
              {q.hero.ctaPrimary}
            </a>
            <a href="#platform" className="qadaa-btn-outline">
              {q.hero.ctaSecondary}
            </a>
          </div>

          {/* Trust chips */}
          <div className="qadaa-trust-chips">
            {q.hero.chips.map(chip => (
              <span key={chip} className="qadaa-trust-chip">{chip}</span>
            ))}
          </div>
        </div>

        {/* Floating stat card */}
        <div className="qadaa-hero-float-card">
          <p className="qadaa-float-gold">{q.hero.floatValue}</p>
          <p className="qadaa-float-label">{q.hero.floatLabel}</p>
        </div>

        {/* Scroll indicator */}
        <div className="qadaa-scroll-hint">
          <span className="qadaa-scroll-text">{q.hero.scroll}</span>
          <div className="qadaa-scroll-line" />
        </div>
      </section>

      {/* ── Platform Overview ──────────────────── */}
      <section id="platform" className="qadaa-section">
        <div className="qadaa-container">
          <div className="qadaa-section-label">{q.platform.label}</div>
          <h2 className="qadaa-section-title">{q.platform.title}</h2>
          <p className="qadaa-section-sub">
            {q.platform.sub}
          </p>

          <div className="qadaa-apps-grid">
            {q.platform.apps.map((app, i) => {
              const visual = APP_VISUALS[i];
              return (
                <div key={i} className="qadaa-app-card" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="qadaa-app-icon" style={{ borderColor: `${visual.color}30`, boxShadow: `0 0 16px ${visual.color}18` }}>
                    <span style={{ fontSize: '1.4rem' }}>{visual.icon}</span>
                  </div>
                  <h3 className="qadaa-app-name" style={{ color: visual.color }}>{app.name}</h3>
                  <p className="qadaa-app-desc">{app.desc}</p>
                  <div className="qadaa-app-tags">
                    {app.tags.map(tag => (
                      <span key={tag} className="qadaa-app-tag" style={{ borderColor: `${visual.color}30`, color: visual.color }}>{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why Qadaa ─────────────────────────── */}
      <section className="qadaa-section qadaa-section--dark">
        <div className="qadaa-container">
          <div className="qadaa-section-label qadaa-section-label--light">{q.why.label}</div>
          <h2 className="qadaa-section-title qadaa-section-title--light">{q.why.title}</h2>

          <div className="qadaa-why-grid">
            {q.why.items.map((item, i) => (
              <div key={i} className="qadaa-why-card">
                <div className="qadaa-why-icon">{WHY_ICONS[i]}</div>
                <h3 className="qadaa-why-title">{item.title}</h3>
                <p className="qadaa-why-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Early Access CTA ──────────────────── */}
      <section className="qadaa-section qadaa-cta-section">
        <div className="qadaa-container qadaa-cta-inner">
          {/* Gold scales illustration */}
          <div className="qadaa-cta-scales" aria-hidden="true">
            <svg viewBox="0 0 140 130" width="120" height="120" fill="none">
              <line x1="70" y1="10" x2="70" y2="110" stroke="#C8A24A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="20" y1="35" x2="120" y2="35" stroke="#C8A24A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="25" y1="35" x2="25" y2="70" stroke="#C8A24A" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3"/>
              <line x1="115" y1="35" x2="115" y2="70" stroke="#C8A24A" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3"/>
              <path d="M8 70 Q25 80 42 70" stroke="#C8A24A" strokeWidth="2.5" fill="rgba(200,162,74,0.1)" strokeLinecap="round"/>
              <path d="M98 70 Q115 80 132 70" stroke="#C8A24A" strokeWidth="2.5" fill="rgba(200,162,74,0.1)" strokeLinecap="round"/>
              <line x1="55" y1="110" x2="85" y2="110" stroke="#C8A24A" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="20" cy="35" r="4" fill="#C8A24A" opacity="0.8"/>
              <circle cx="120" cy="35" r="4" fill="#C8A24A" opacity="0.8"/>
              <circle cx="70" cy="12" r="5" fill="#C8A24A"/>
            </svg>
          </div>

          <div className="qadaa-section-label">{q.cta.label}</div>
          <h2 className="qadaa-cta-title">
            {q.cta.titleTop}
            <br />
            <span className="qadaa-cta-title-gold">{q.cta.titleBottom}</span>
          </h2>
          <p className="qadaa-cta-sub">
            {q.cta.sub}
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="qadaa-btn-gold qadaa-cta-btn"
          >
            {q.cta.button} <span className="dir-arrow">→</span>
          </a>

          <div className="qadaa-cta-trust">
            <span>⚖</span>
            <span>{q.cta.trust}</span>
          </div>
        </div>
      </section>

      {/* ── Back to home ──────────────────────── */}
      <div className="qadaa-back-bar">
        <a href="/" className="qadaa-back-link"><span className="dir-arrow">←</span> {q.back.link}</a>
        <span className="qadaa-back-brand">{q.back.brand}</span>
      </div>
    </div>
  );
}

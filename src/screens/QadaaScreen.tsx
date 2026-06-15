import { useEffect } from 'react';
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

export function QadaaScreen() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'QADAA · قضاء — Legal. Reimagined.';
  }, []);

  return (
    <div className="qadaa-page">

      {/* ── Hero ───────────────────────────────── */}
      <section className="qadaa-hero">
        {/* Riyadh skyline golden-hour bg */}
        <div className="qadaa-hero-bg" aria-hidden="true">
          <img
            src="/qadaa-splash.jpg"
            alt="Riyadh skyline golden hour"
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
            منصة قانونية متكاملة
          </div>

          {/* Headline */}
          <h1 className="qadaa-hero-headline">
            <span className="qadaa-hero-headline-white">قانون.</span>
            <br />
            <span className="qadaa-hero-headline-gold">مُعاد تصوره.</span>
          </h1>

          <p className="qadaa-hero-sub">
            qadaa.law — منصة تربط العملاء بالمحامين وتدعم تحليل القضايا والمستندات بتجربة عربية واضحة وراقية في المملكة العربية السعودية والإمارات.
          </p>

          {/* CTAs */}
          <div className="qadaa-hero-ctas">
            <a
              href="https://wa.me/966535271122?text=أهتم بمنصة QADAA · قضاء — أريد أعرف أكثر"
              target="_blank"
              rel="noopener"
              className="qadaa-btn-gold"
            >
              تحدث مع المؤسس
            </a>
            <a href="#platform" className="qadaa-btn-outline">
              استعرض المنصة
            </a>
          </div>

          {/* Trust chips */}
          <div className="qadaa-trust-chips">
            {['⚖ نزاعات مدنية', '🏢 شركات & استثمار', '🔒 سرية تامة', '🌐 السعودية · الإمارات'].map(chip => (
              <span key={chip} className="qadaa-trust-chip">{chip}</span>
            ))}
          </div>
        </div>

        {/* Floating stat card */}
        <div className="qadaa-hero-float-card">
          <p className="qadaa-float-gold">٥ تطبيقات</p>
          <p className="qadaa-float-label">منظومة قانونية متكاملة</p>
        </div>

        {/* Scroll indicator */}
        <div className="qadaa-scroll-hint">
          <span className="qadaa-scroll-text">اكتشف</span>
          <div className="qadaa-scroll-line" />
        </div>
      </section>

      {/* ── Platform Overview ──────────────────── */}
      <section id="platform" className="qadaa-section">
        <div className="qadaa-container">
          <div className="qadaa-section-label">المنصة</div>
          <h2 className="qadaa-section-title">منظومة من ٥ تطبيقات</h2>
          <p className="qadaa-section-sub">
            كل تطبيق صُمم بعناية لدور محدد — معاً يشكّلون تجربة قانونية لا مثيل لها في المنطقة.
          </p>

          <div className="qadaa-apps-grid">
            {[
              {
                icon: '👤',
                name: 'تطبيق العميل',
                desc: 'تواصل مع محامين معتمدين، تتبع قضاياك، وأرسل مستنداتك بأمان من هاتفك.',
                tags: ['iOS', 'Android'],
                color: '#C8A24A',
              },
              {
                icon: '⚖️',
                name: 'تطبيق المحامي',
                desc: 'إدارة القضايا، مواعيد الجلسات، وتحليل العقود بمساعدة الذكاء الاصطناعي.',
                tags: ['iOS', 'Android'],
                color: '#B8922E',
              },
              {
                icon: '🏢',
                name: 'لوحة مكتب المحاماة',
                desc: 'إدارة الفريق، الفواتير، والتقارير من لوحة ويب متكاملة.',
                tags: ['Web'],
                color: '#9E7A20',
              },
              {
                icon: '⚙️',
                name: 'لوحة الإدارة',
                desc: 'مراقبة المنصة، الموافقة على المحامين، والتقارير التشغيلية الشاملة.',
                tags: ['Web'],
                color: '#7B5E4D',
              },
              {
                icon: '🤖',
                name: 'وكيل الذكاء الاصطناعي',
                desc: 'تحليل العقود، استخراج المخاطر، وصياغة المستندات القانونية آلياً.',
                tags: ['AI', 'API'],
                color: '#D4B76E',
              },
            ].map((app, i) => (
              <div key={i} className="qadaa-app-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="qadaa-app-icon" style={{ borderColor: `${app.color}30`, boxShadow: `0 0 16px ${app.color}18` }}>
                  <span style={{ fontSize: '1.4rem' }}>{app.icon}</span>
                </div>
                <h3 className="qadaa-app-name" style={{ color: app.color }}>{app.name}</h3>
                <p className="qadaa-app-desc">{app.desc}</p>
                <div className="qadaa-app-tags">
                  {app.tags.map(t => (
                    <span key={t} className="qadaa-app-tag" style={{ borderColor: `${app.color}30`, color: app.color }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Qadaa ─────────────────────────── */}
      <section className="qadaa-section qadaa-section--dark">
        <div className="qadaa-container">
          <div className="qadaa-section-label qadaa-section-label--light">لماذا قضاء؟</div>
          <h2 className="qadaa-section-title qadaa-section-title--light">مصمم للمنطقة. من الألف إلى الياء.</h2>

          <div className="qadaa-why-grid">
            {[
              { icon: '🌐', title: 'عربي أولاً', desc: 'واجهات RTL، نصوص قانونية معيارية بالعربية، ودعم ثنائي اللغة.' },
              { icon: '⚡', title: 'ذكاء اصطناعي قانوني', desc: 'تحليل عقود، استخراج مخاطر، وصياغة مستندات في ثوانٍ.' },
              { icon: '🔒', title: 'سرية وأمان', desc: 'تشفير كامل، مصادقة متعددة، وبنية تحتية متوافقة مع أنظمة البيانات.' },
              { icon: '📍', title: 'مملكة والإمارات', desc: 'مُكيَّف مع النظام السعودي والإماراتي من أول يوم.' },
            ].map((item, i) => (
              <div key={i} className="qadaa-why-card">
                <div className="qadaa-why-icon">{item.icon}</div>
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

          <div className="qadaa-section-label">وصول مبكر</div>
          <h2 className="qadaa-cta-title">
            كن من أوائل مكاتب المحاماة
            <br />
            <span className="qadaa-cta-title-gold">التي تشكّل المستقبل القانوني.</span>
          </h2>
          <p className="qadaa-cta-sub">
            نحن نبني qadaa.law بالتعاون مع مكاتب المحاماة الرائدة في المنطقة. تحدث مع المؤسس مباشرةً.
          </p>
          <a
            href="https://wa.me/966535271122?text=أهتم بمنصة QADAA · قضاء — أريد أعرف أكثر"
            target="_blank"
            rel="noopener"
            className="qadaa-btn-gold qadaa-cta-btn"
          >
            ابدأ المحادثة على واتساب ←
          </a>

          <div className="qadaa-cta-trust">
            <span>⚖</span>
            <span>منصة متكاملة · ٥ تطبيقات · عربي أولاً · ذكاء اصطناعي قانوني</span>
          </div>
        </div>
      </section>

      {/* ── Back to home ──────────────────────── */}
      <div className="qadaa-back-bar">
        <a href="/" className="qadaa-back-link">← العودة إلى المحفظة</a>
        <span className="qadaa-back-brand">qadaa.law — Legal. Reimagined.</span>
      </div>
    </div>
  );
}

import { useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'

// Home screen is large — split into sections lazily loaded
// For now: full port inline. We'll extract sections if needed.
export default function HomeScreen() {
  const { lang, toggleLang, investorData, clearSession } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const handleExit = () => {
    clearSession()
    navigate('/')
  }

  // The full home.html content is large — we embed it via dangerouslySetInnerHTML
  // of the <main> portion only, then progressively componentize.
  // For launch: render the existing home.html content via iframe-free embedding.

  return (
    <div id="home-root" className="home-wrapper">
      {/* ── Minimal investor bar ── */}
      <div id="investor-bar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
        background: 'rgba(7,9,14,0.95)', borderBottom: '1px solid rgba(0,108,53,0.2)',
        padding: '.5rem 1.5rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        fontFamily: 'var(--ff-mono)', fontSize: '.65rem', letterSpacing: '.08em',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.75rem', color:'var(--text-2)' }}>
          <span style={{ color:'var(--green-bright)' }}>✦ MOMENCRAFTS</span>
          {investorData?.name && <span>· {investorData.name}</span>}
          {investorData?.type && <span className="inv-badge" style={{
            background:'rgba(0,108,53,.12)', border:'1px solid rgba(0,108,53,.25)',
            color:'var(--green-bright)', padding:'.15rem .5rem', borderRadius:'4px'
          }}>{investorData.type}</span>}
        </div>
        <div style={{ display:'flex', gap:'.75rem', alignItems:'center' }}>
          <button onClick={toggleLang} className="lang-toggle" style={{ position:'static' }}>
            {lang === 'ar' ? '🇬🇧 EN' : '🇸🇦 AR'}
          </button>
          <button onClick={handleExit} style={{
            background:'transparent', border:'1px solid rgba(181,0,15,.3)',
            color:'rgba(181,0,15,.8)', borderRadius:'5px', padding:'.3rem .7rem',
            fontFamily:'var(--ff-mono)', fontSize:'.6rem', cursor:'pointer',
            letterSpacing:'.08em'
          }}>EXIT</button>
        </div>
      </div>

      {/* ── Home content via script-tag portal ── */}
      {/* The full home content is loaded via the HomeContent component below */}
      <HomeContent lang={lang} investorData={investorData} />
    </div>
  )
}

/* HomeContent renders the full static home.html body content as JSX.
   For the initial migration, we use the pre-built HTML and progressively
   componentize. The full JSX port lives in HomeContent.tsx */
function HomeContent({ lang, investorData }: { lang: string; investorData: ReturnType<typeof useAppStore.getState>['investorData'] }) {
  useEffect(() => {
    // Re-run reveal animations after React mounts
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Product card data
  const products = [
    { id: 'roger',   accent: 'amber', icon: '🎙️', status: 'testing', statusLabel: lang==='ar'?'🧪 قيد الاختبار':'🧪 Testing',    title: 'ROGER·AI',    tagline: lang==='ar'?'مساعدك التنفيذي الذكي':'Your AI Executive Assistant', desc: lang==='ar'?'منصة ذكاء صوتية للمدراء التنفيذيين — ذاكرة مستمرة، تقارير استباقية، ودعم كامل للعربي والإنجليزي.':'Voice AI for executives — persistent memory, proactive briefings, full Arabic/English support.', tags: lang==='ar'?['صوتية أولاً','iOS · Android','ثنائي اللغة']:['Voice-First','iOS · Android','Bilingual'], link: '/rogerai', linkLabel: lang==='ar'?'اعرف أكثر ←':'Learn More →', featured: true },
    { id: 'cliniq',  accent: 'teal',  icon: '🏥', status: 'live',    statusLabel: lang==='ar'?'🟢 مباشر':'🟢 Live',               title: 'cliniq.one', tagline: lang==='ar'?'طب عن بُعد عربي أولاً':'Arabic-First Telemedicine',  desc: lang==='ar'?'منصة طب عن بُعد متكاملة مع ٥ تطبيقات وذكاء اصطناعي عربي أولاً وامتثال لوزارة الصحة.':'Full-stack telemedicine with 5 apps, Arabic-first AI intake, and MOH compliance.', tags: lang==='ar'?['عربي أولاً','٥ تطبيقات','MOH']:['Arabic-First','5 Apps','MOH'], link: 'https://cliniq.one', linkLabel: lang==='ar'?'زيارة الموقع ←':'Visit Site →', featured: true },
    { id: 'ummi',    accent: 'green', icon: '💚', status: 'beta',    statusLabel: lang==='ar'?'🔵 بيتا':'🔵 Beta',                 title: 'UMMI · أمي', tagline: lang==='ar'?'محفظة العائلة':'Family Finance OS',           desc: lang==='ar'?'نظام مالي عائلي خاص لرعاية الأم — ميزانية ذكية، جيوب مخصصة، راتب تلقائي، نظام طوارئ.':'Private family finance OS for mother care — smart budget, pockets, auto salary, emergency system.', tags: lang==='ar'?['عائلي','٢٨ وحدة','IoT']:['Family','28 Modules','IoT'], link: 'https://ummi-wallet-demo.vercel.app', linkLabel: lang==='ar'?'شاهد العرض ←':'View Demo →', featured: false },
    { id: 'relay',   accent: 'blue',  icon: '⌨️', status: 'patent',  statusLabel: lang==='ar'?'📋 براءة اختراع':'📋 Patent',       title: 'RelayBot',   tagline: lang==='ar'?'ذكاء بدون تثبيت':'Zero-Install AI Typing',         desc: lang==='ar'?'جهاز يربط أي لوحة مفاتيح بأي نظام — يكتب نصًا محسّنًا بالذكاء الاصطناعي بدون تثبيت.':'Hardware device that types AI-enhanced text into any locked system — zero install.', tags: lang==='ar'?['جهاز مادي','براءة اختراع','BLE']:['Hardware','Patent','BLE'], link: '#contact', linkLabel: lang==='ar'?'اعرف أكثر ←':'Learn More →', featured: false },
    { id: 'edge',    accent: 'orange',icon: '🎮', status: 'concept', statusLabel: lang==='ar'?'💡 فكرة':'💡 Concept',             title: 'EdgeTack',   tagline: lang==='ar'?'تحكم تكتيكي':'Console Control, Zero Bulk',         desc: lang==='ar'?'وحدة تحكم مدمجة للمهنيين — توسعات وحدة التحكم الوظيفية بلا تعقيد.':'Compact control unit for professionals — functional controller expansions without bulk.', tags: lang==='ar'?['أجهزة','براءة اختراع','هاردوير']:['Hardware','Patent','Pending'], link: '/edgetack', linkLabel: lang==='ar'?'اعرف أكثر ←':'Learn More →', featured: false },
  ]

  return (
    <main style={{ paddingTop: '3.5rem' }}>
      {/* ── HERO ── */}
      <section className="hero" id="hero">
        <div className="container hero-inner">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot" />
              {lang === 'ar' ? 'مؤمن كرافتس · الرياض' : 'MOMENCRAFTS · RIYADH'}
            </div>
            <h1 className="hero-title">
              {lang === 'ar'
                ? <><em>أفكار</em> تُصاغ<br/>لتصبح واقعًا.</>
                : <>Ideas,<br/><em>Intelligently</em><br/>Crafted.</>}
            </h1>
            <p className="hero-sub">
              {lang === 'ar'
                ? 'استوديو أفكار مؤسَّس بقيادة مومن فرعون من الرياض — نبني منتجات رقمية ذكية للسوق السعودي والمنطقة.'
                : 'Founder-led idea studio by Momen Pharaon from Riyadh — building intelligent digital products for the Saudi market and MENA.'}
            </p>
            <div className="hero-badges">
              <span className="hero-badge badge-green">🟢 {lang==='ar'?'منتجات حية':'Live Products'}</span>
              <span className="hero-badge badge-amber">🧪 {lang==='ar'?'قيد التطوير':'In Development'}</span>
              <span className="hero-badge badge-blue">📋 {lang==='ar'?'براءتا اختراع':'2 Patents'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section className="products" id="products">
        <div className="container">
          <div className="section-label reveal">{lang==='ar'?'المنتجات':'PRODUCTS'}</div>
          <h2 className="section-title reveal">{lang==='ar'?'المحفظة الكاملة':'Full Portfolio'}</h2>
          <div className="products-grid">
            {products.map(p => (
              <article key={p.id} className={`product-card${p.featured?' featured':''} reveal`} data-accent={p.accent} id={`card-${p.id}`}>
                <div className="card-accent-bar" />
                {p.featured && <div className="card-featured-badge">★ {lang==='ar'?'رائد':'Featured'}</div>}
                <div className="card-header">
                  <div className={`card-icon ${p.accent}-icon`}>{p.icon}</div>
                  <span className={`card-status ${p.status}`}>{p.statusLabel}</span>
                </div>
                <h3 className="card-title">{p.title}</h3>
                <p className="card-tagline">{p.tagline}</p>
                <p className="card-desc">{p.desc}</p>
                <div className="card-tags">
                  {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
                <a href={p.link}
                   className="card-link"
                   target={p.link.startsWith('http') ? '_blank' : '_self'}
                   rel={p.link.startsWith('http') ? 'noopener noreferrer' : undefined}>
                  {p.linkLabel}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── LET'S BUILD ── */}
      <section className="lets-build-section reveal" id="contact">
        <div className="container">
          <div className="lets-build-inner">
            <div className="lb-eyebrow">{lang==='ar'?'— دعوة للتعاون':'— Collaboration Invite'}</div>
            <h2 className="lb-title">
              {lang==='ar'
                ? <><em>إن رأيت الفرصة</em> — فلنبنِها معاً</>
                : <>If you see the opportunity —<br/><em>let's build it together</em></>}
            </h2>
            <p className="lb-body">
              {lang==='ar'
                ? 'مؤمن كرافتس استوديو مؤسَّس يبحث عن شركاء استراتيجيين لا مجرد ممولين — شركاء يفهمون قيمة الفكرة ويؤمنون بالبناء الذكي.'
                : 'MomenCrafts is a founder-led studio looking for strategic partners — not just investors. Partners who understand idea value and believe in intelligent building.'}
            </p>
            <a href="mailto:momen@momencrafts.com" className="lb-cta">
              {lang==='ar' ? 'تواصل مع المؤسس ←' : 'Contact the Founder →'}
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <span className="footer-brand">✦ MOMENCRAFTS</span>
          <span className="footer-copy">{lang==='ar'?'جميع الحقوق محفوظة · ٢٠٢٦':'All rights reserved · 2026'}</span>
        </div>
      </footer>
    </main>
  )
}

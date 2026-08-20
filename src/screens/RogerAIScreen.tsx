import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import deviceImg from '@/assets/device.png'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'

/* Language-independent hardware data. Human-readable names live in
   t.roger.hardware.blockNames, matched to these entries by index. */
const HW_BLOCKS = [
  { num:'01', icon:'⚡', chip:'BQ25895 + BQ29700 + AP2112K + MT3608', nets:['VBAT','VSYS_3V3','VDIG_3V3','VANA_3V3','V5_BOOST','CHG_SDA','CHG_SCL'] },
  { num:'02', icon:'🧠', chip:'ESP32-S3-WROOM-1-N16R8 · 240MHz · 16MB Flash · 8MB PSRAM', nets:['GPIO0-48','USB_D+','USB_D-','BOOT','EN','TXD0','RXD0'] },
  { num:'03', icon:'🔊', chip:'ES8388 + MAX98357A · Hi-fi ADC/DAC · I²S · 3W mono', nets:['I2S_BCLK','I2S_WS','I2S_DOUT','I2S_DIN','AMP_SD','AUDIO_SDA','AUDIO_SCL'] },
  { num:'04', icon:'📺', chip:'ST7789 TFT · 240×240 · SPI · 60fps', nets:['TFT_CS','TFT_DC','TFT_RST','TFT_MOSI','TFT_SCLK','TFT_BL'] },
  { num:'05', icon:'🎛️', chip:'PTT Button + EC11 Encoder + Power Switch + WS2812B×8', nets:['PTT_BTN','ENC_A','ENC_B','ENC_SW','LED_DATA','NEOPIXEL_EN'] },
  { num:'06', icon:'📡', chip:'DS3231M RTC + BQ25895 I²C telemetry + DRV2605L + ATECC608B', nets:['RTC_SDA','RTC_SCL','HAPTIC_SDA','CRYPTO_SDA','CRYPTO_SCL'] },
  { num:'07', icon:'📻', chip:'RADIO_PTT out · RADIO_COR in · UART1 serial (prototype)', nets:['RADIO_PTT','RADIO_COR','RADIO_TX','RADIO_RX','RADIO_GND'] },
]

/* Icons only — labels come from t.roger.flow.nodes, matched by index. */
const FLOW_ICONS = ['🎙️','🎧','⚡','☁️','🧠','🔊']

/* CSS classes only — state/label come from t.roger.led.modes, matched by index. */
const LED_CLASSES = ['led-listen','led-think','led-ready','led-mute','led-idle']

const MODE_ICONS = ['🎙️','💬','🧠','⚙️']

const BADGE_CLASSES = ['badge-amber','badge-cyan','badge-violet','badge-green']

function useParticle(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const mobile = window.innerWidth < 640
    const pts = Array.from({length: mobile?15:50}, () => ({
      x:Math.random()*2000, y:Math.random()*1200,
      r:Math.random()*1.5+.3, vx:(Math.random()-.5)*.12, vy:(Math.random()-.5)*.12,
      a:Math.random()*.4+.1
    }))
    let W=0,H=0, raf=0, paused=false
    const resize = () => { W=c.width=window.innerWidth; H=c.height=window.innerHeight }
    resize(); window.addEventListener('resize',resize)
    const draw = () => {
      if(paused) return
      ctx.clearRect(0,0,W,H)
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x%W,p.y%H,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(245,158,11,${p.a})`; ctx.fill()
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x+=W; if(p.y<0)p.y+=H
      })
      raf=requestAnimationFrame(draw)
    }; draw()
    const onVis = () => { paused=document.hidden; if(!paused)draw() }
    document.addEventListener('visibilitychange',onVis)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); document.removeEventListener('visibilitychange',onVis) }
  },[ref])
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible') }), {threshold:.08})
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
    // Close on link click
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open')
      btn.setAttribute('aria-expanded', 'false')
    }))
    return () => btn.removeEventListener('click', toggle)
  }, [])
}

export default function RogerAIScreen() {
  const { t } = useT()
  const r = t.roger

  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticle(canvasRef)
  useReveal()
  useHamburger()

  const badges = [r.hero.badges.prototype, r.hero.badges.mcu, r.hero.badges.wireless, r.hero.badges.pcb]

  return (
    <>
      <LangToggle />

      <canvas ref={canvasRef} id="r-canvas" style={{position:'fixed',inset:0,pointerEvents:'none',opacity:.25,zIndex:0}} />

      <nav id="nav">
        <Link to="/" className="nav-brand">{r.nav.brand}</Link>
        <ul className="nav-links" id="nav-links">
          <li><a href="#modes">{r.nav.modes}</a></li>
          <li><a href="#hardware">{r.nav.hardware}</a></li>
          <li><a href="#flow">{r.nav.flow}</a></li>
          <li><a href="#roadmap">{r.nav.roadmap}</a></li>
          <li><a href="#cta" className="nav-cta">{r.nav.cta}</a></li>
        </ul>
        <Link to="/home" className="nav-back">{r.nav.back}</Link>
        <button className="nav-hamburger" id="nav-hamburger" aria-label={r.nav.menuAria} aria-expanded="false">
          <span/><span/><span/>
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot" />
              {r.hero.eyebrow}
            </div>
            <h1 className="hero-title">
              {r.hero.titleName} <em>{r.hero.titleEm}</em>
              <span className="ar">{r.hero.titleAccent}</span>
            </h1>
            <p className="hero-sub">
              {r.hero.sub}
            </p>
            <div className="hero-badges">
              {badges.map((b,i)=>(
                <span key={i} className={`badge ${BADGE_CLASSES[i]}`}>{b}</span>
              ))}
            </div>
            <div className="hero-actions">
              <a href="#cta" className="btn btn-amber">{r.hero.ctaPrimary}</a>
              <a href="#hardware" className="btn btn-ghost">{r.hero.ctaSecondary}</a>
            </div>
          </div>
          <div className="hero-device reveal">
            <div>
              <img src={deviceImg} alt={r.hero.deviceAlt} className="device-img"/>
              <div className="device-specs-strip">
                {r.hero.specTags.map(s=>(
                  <span key={s} className="device-spec-tag">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 MODES ── */}
      <section id="modes" className="modes">
        <div className="container">
          <div className="section-label reveal">{r.modes.label}</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            {r.modes.title}
          </h2>
          <div className="modes-grid">
            {r.modes.items.map((m,i)=>(
              <div key={i} className="mode-card reveal">
                <span className="mode-icon">{MODE_ICONS[i]}</span>
                <div className="mode-name">{m.name}</div>
                <div className="mode-title">{m.title}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HARDWARE ── */}
      <section id="hardware" className="hw-specs">
        <div className="container">
          <div className="section-label reveal">{r.hardware.label}</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            {r.hardware.title}
          </h2>
          <div className="hw-grid">
            {HW_BLOCKS.map((b,i)=><HWBlock key={b.num} {...b} name={r.hardware.blockNames[i]}/>)}
          </div>
        </div>
      </section>

      {/* ── AI FLOW ── */}
      <section id="flow" className="ai-flow">
        <div className="container">
          <div className="section-label reveal">{r.flow.label}</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            {r.flow.title}
          </h2>
          <div className="flow-diagram">
            {r.flow.nodes.map((label,i)=>(
              <>
                <div key={label} className="flow-node">
                  <div className="flow-icon"><span>{FLOW_ICONS[i]}</span></div>
                  <div className="flow-label">{label.split('\n').map((l,j)=><span key={j}>{l}<br/></span>)}</div>
                </div>
                {i < r.flow.nodes.length-1 && (
                  <div key={`arr${i}`} className="flow-arrow">
                    <div className="flow-line"/>
                    <div className="flow-tip"/>
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── LED RING ── */}
      <section className="led-section">
        <div className="container">
          <div className="section-label reveal">{r.led.label}</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            {r.led.title}
          </h2>
          <div className="led-demo">
            {r.led.modes.map((m,idx)=>(
              <div key={m.state} className="led-mode">
                <div className={`led-strip ${LED_CLASSES[idx]}`}>
                  {Array.from({length:8}).map((_,i)=><div key={i} className="led-dot"/>)}
                </div>
                <div className="led-state">{m.state}</div>
                <div className="led-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="cta-section">
        <div className="container">
          <div className="cta-overline">{r.cta.overline}</div>
          <h2 className="cta-title">{r.cta.titlePre}<em>{r.cta.titleEm}</em>{r.cta.titlePost}</h2>
          <p className="cta-sub">{r.cta.sub}</p>
          <div className="cta-actions">
            <a href="mailto:momen@momencrafts.com" className="btn btn-amber">{r.cta.primary}</a>
            <Link to="/home" className="btn btn-ghost">{r.cta.back}</Link>
          </div>
          <p className="cta-note">{r.cta.note}</p>
        </div>
      </section>

      <footer>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <span className="footer-brand">{r.footer.brand}</span>
          <span className="footer-copy">{r.footer.copy}</span>
          <Link to="/home" className="footer-back">{r.footer.back}</Link>
        </div>
      </footer>
    </>
  )
}

function HWBlock({num,icon,name,chip,nets}:{num:string;icon:string;name:string;chip:string;nets:string[]}) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`hw-block${expanded?' open':''}`}>
      <div className="hw-block-head" onClick={()=>setExpanded(x=>!x)}>
        <span className="hw-block-num">{num}</span>
        <span className="hw-block-icon">{icon}</span>
        <div className="hw-block-info">
          <div className="hw-block-name">{name}</div>
          <div className="hw-block-chip">{chip}</div>
        </div>
        <span className="hw-block-toggle">+</span>
      </div>
      <div className="hw-block-body">
        <div className="hw-block-inner">
          <div className="hw-nets">
            <span>{t.roger.hardware.netsLabel}</span>{nets.join(' · ')}
          </div>
        </div>
      </div>
    </div>
  )
}

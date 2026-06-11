import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import deviceImg from '@/assets/device.png'

const HW_BLOCKS = [
  { num:'01', icon:'⚡', name:'Power System', chip:'BQ25895 + BQ29700 + AP2112K + MT3608', nets:['VBAT','VSYS_3V3','VDIG_3V3','VANA_3V3','V5_BOOST','CHG_SDA','CHG_SCL'] },
  { num:'02', icon:'🧠', name:'MCU Core',     chip:'ESP32-S3-WROOM-1-N16R8 · 240MHz · 16MB Flash · 8MB PSRAM', nets:['GPIO0-48','USB_D+','USB_D-','BOOT','EN','TXD0','RXD0'] },
  { num:'03', icon:'🔊', name:'Audio System', chip:'ES8388 + MAX98357A · Hi-fi ADC/DAC · I²S · 3W mono', nets:['I2S_BCLK','I2S_WS','I2S_DOUT','I2S_DIN','AMP_SD','AUDIO_SDA','AUDIO_SCL'] },
  { num:'04', icon:'📺', name:'Display',       chip:'ST7789 TFT · 240×240 · SPI · 60fps', nets:['TFT_CS','TFT_DC','TFT_RST','TFT_MOSI','TFT_SCLK','TFT_BL'] },
  { num:'05', icon:'🎛️', name:'Controls',      chip:'PTT Button + EC11 Encoder + Power Switch + WS2812B×8', nets:['PTT_BTN','ENC_A','ENC_B','ENC_SW','LED_DATA','NEOPIXEL_EN'] },
  { num:'06', icon:'📡', name:'Sensors',       chip:'DS3231M RTC + BQ25895 I²C telemetry + DRV2605L + ATECC608B', nets:['RTC_SDA','RTC_SCL','HAPTIC_SDA','CRYPTO_SDA','CRYPTO_SCL'] },
  { num:'07', icon:'📻', name:'Radio Expansion',chip:'RADIO_PTT out · RADIO_COR in · UART1 serial (prototype)', nets:['RADIO_PTT','RADIO_COR','RADIO_TX','RADIO_RX','RADIO_GND'] },
]

const FLOW_NODES = [
  { icon:'🎙️', label:'PTT Press\nVoice Capture' },
  { icon:'🎧', label:'ES8388 Codec\nADC 24-bit' },
  { icon:'⚡', label:'ESP32-S3\n240MHz' },
  { icon:'☁️', label:'Gemini API\nCloud AI' },
  { icon:'🧠', label:'Supabase\nMemory' },
  { icon:'🔊', label:'MAX98357A\nAudio Out' },
]

const LED_MODES = [
  { cls:'led-listen', state:'Listening',  label:'PTT held — capturing voice' },
  { cls:'led-think',  state:'Thinking',   label:'AI processing request' },
  { cls:'led-ready',  state:'Ready',      label:'Response complete' },
  { cls:'led-mute',   state:'Muted',      label:'Microphone off' },
  { cls:'led-idle',   state:'Idle',       label:'Standby mode' },
]

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

export default function RogerAIScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticle(canvasRef)
  useReveal()

  return (
    <>
      <canvas ref={canvasRef} id="r-canvas" style={{position:'fixed',inset:0,pointerEvents:'none',opacity:.25,zIndex:0}} />

      <nav id="nav">
        <Link to="/" className="nav-brand">✦ MOMENCRAFTS</Link>
        <ul className="nav-links" id="nav-links">
          <li><a href="#modes">Modes</a></li>
          <li><a href="#hardware">Hardware</a></li>
          <li><a href="#flow">How It Works</a></li>
          <li><a href="#roadmap">Roadmap</a></li>
          <li><a href="#cta" className="nav-cta">Request Access →</a></li>
        </ul>
        <Link to="/home" className="nav-back">← Investor Room</Link>
        <button className="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">
          <span/><span/><span/>
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-text reveal">
            <div className="hero-eyebrow">
              <span className="hero-dot" />
              MOMENCRAFTS · HARDWARE DIVISION · RIYADH, KSA
            </div>
            <h1 className="hero-title">
              ROGER·AI <em>Voice of Intelligence</em>
              <span className="ar">صوت الذكاء</span>
            </h1>
            <p className="hero-sub">
              A purpose-built handheld AI assistant — combining hardware engineering, voice AI,
              and radio integration into a single device designed for executives, field operators,
              and bilingual Arabic/English power users.
            </p>
            <div className="hero-badges">
              <span className="badge badge-amber">🧪 PROTOTYPE · SPIN 1</span>
              <span className="badge badge-cyan">ESP32-S3 · 240MHz</span>
              <span className="badge badge-violet">WiFi + BLE 5.0</span>
              <span className="badge badge-green">✓ PCB DESIGNED</span>
            </div>
            <div className="hero-actions">
              <a href="#cta" className="btn btn-amber">Request Access →</a>
              <a href="#hardware" className="btn btn-ghost">View Hardware ↓</a>
            </div>
          </div>
          <div className="hero-device reveal">
            <div>
              <img src={deviceImg} alt="RogerAI Device" className="device-img"/>
              <div className="device-specs-strip">
                {['TFT Display','PTT Button','EC11 Encoder','WS2812B × 8','USB-C','3W Speaker'].map(s=>(
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
          <div className="section-label reveal">02 · OPERATING MODES</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            Four Modes. One Device.
          </h2>
          <div className="modes-grid">
            {[
              {icon:'🎙️',num:'01',title:'Voice',desc:'Press PTT, speak, release. Roger processes your command in real time over WiFi — executive briefings, reminders, decisions.'},
              {icon:'💬',num:'02',title:'Chat',desc:'Persistent conversation thread on the TFT display. Navigate with the rotary encoder. Full Arabic/English bilingual.'},
              {icon:'🧠',num:'03',title:'AI Mode',desc:'Autonomous intelligence layer — proactive reports, calendar awareness, decision support. Roger surfaces what you need before you ask.'},
              {icon:'⚙️',num:'04',title:'Settings',desc:'Configure WiFi, language, voice speed, LED brightness, radio PTT mode, and cloud sync from the device screen.'},
            ].map(m=>(
              <div key={m.num} className="mode-card reveal">
                <span className="mode-icon">{m.icon}</span>
                <div className="mode-name">MODE {m.num}</div>
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
          <div className="section-label reveal">03 · HARDWARE ARCHITECTURE</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            7-Block PCB Design
          </h2>
          <div className="hw-grid">
            {HW_BLOCKS.map(b=><HWBlock key={b.num} {...b}/>)}
          </div>
        </div>
      </section>

      {/* ── AI FLOW ── */}
      <section id="flow" className="ai-flow">
        <div className="container">
          <div className="section-label reveal">04 · AI PROCESSING PIPELINE</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            From Voice to Intelligence
          </h2>
          <div className="flow-diagram">
            {FLOW_NODES.map((n,i)=>(
              <>
                <div key={n.label} className="flow-node">
                  <div className="flow-icon"><span>{n.icon}</span></div>
                  <div className="flow-label">{n.label.split('\n').map((l,j)=><span key={j}>{l}<br/></span>)}</div>
                </div>
                {i < FLOW_NODES.length-1 && (
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
          <div className="section-label reveal">07 · LED STATUS RING</div>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(1.8rem,3vw,2.8rem)',fontWeight:700,color:'var(--cream)',margin:'.5rem 0 .75rem'}} className="reveal">
            WS2812B × 8 — Live Demo
          </h2>
          <div className="led-demo">
            {LED_MODES.map(m=>(
              <div key={m.state} className="led-mode">
                <div className={`led-strip ${m.cls}`}>
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
          <div className="cta-overline">REQUEST ACCESS</div>
          <h2 className="cta-title">Ready to meet <em>ROGER·AI</em>?</h2>
          <p className="cta-sub">Join the private beta. Limited to 12 strategic partners and field operators.</p>
          <div className="cta-actions">
            <a href="mailto:momen@momencrafts.com" className="btn btn-amber">Request Access →</a>
            <Link to="/home" className="btn btn-ghost">← Investor Room</Link>
          </div>
          <p className="cta-note">Hardware prototype · Riyadh, KSA · 2026</p>
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

function HWBlock({num,icon,name,chip,nets}:{num:string;icon:string;name:string;chip:string;nets:string[]}) {
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
            <span>NETS: </span>{nets.join(' · ')}
          </div>
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import boardRender from '@/assets/tdc/board_render.png'
import topologyDiagram from '@/assets/tdc/topology_diagram.png'
import powerFlow from '@/assets/tdc/power_flow.png'
import droneApp from '@/assets/tdc/drone_application.png'
import sizeCompare from '@/assets/tdc/size_comparison.png'
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

const specs = [
  ['BOARD SIZE', '25 × 25 mm'],
  ['LAYERS', '4 (4oz / 1oz / 1oz / 4oz)'],
  ['V1 INPUT', '4S LiPo: 14.8–16.8V'],
  ['V2 SUPERCAP', '≤ 2.5V'],
  ['VL NORMAL', '14.8–16.8V'],
  ['VL INJECTION', '17.3–19.3V (+15%)'],
  ['BURST CURRENT', '150A (3× parallel per bank)'],
  ['PATH RESISTANCE', '20.4mΩ (injection)'],
  ['BYPASS RESISTANCE', '2.7mΩ (normal)'],
  ['MOSFET', 'IRLR7843PbF × 19'],
  ['GATE DRIVE', 'TPS61041 boost → 30V'],
  ['GATE VGS', '11–15V all banks'],
  ['CHARGING', 'USB-C 5V → ~150mA'],
  ['CHARGE TIME (10F)', '~2.8 min'],
  ['TRIGGER', 'FC servo (50Hz PWM)'],
  ['ISOLATION', 'Galvanic (opto + DC-DC)'],
  ['PROTECTION', 'TVS + Zener + snubber'],
  ['FABRICATION', 'JLCPCB 4-layer'],
]

const bom = [
  ['Power MOSFETs', '19', 'IRLR7843PbF', 'SO-8'],
  ['Gate Switch N-ch', '4', '2N7002', 'SOT-23'],
  ['Gate Switch P-ch', '3', 'BSS84', 'SOT-23'],
  ['Boost Converter', '1', 'TPS61041DBV', 'SOT-23-5'],
  ['Buck Regulator', '1', 'AP63205WU', 'SOT-23-6'],
  ['Isolated DC-DC', '1', 'B0505S-2WR3', 'SIP-4'],
  ['Voltage Reg', '1', 'LM317', 'SOT-223'],
  ['Comparator', '1', 'LM393', 'SO-8'],
  ['Schmitt Triggers', '5', 'TC7S14F', 'SOT-353'],
  ['Optocoupler', '1', 'EL357N-G', 'SOP-4'],
  ['TVS Diode', '1', 'SMCJ24CA', 'SMC'],
  ['Zener Clamps', '10', 'BZT52C15S', 'SOD-323'],
  ['Bulk Caps', '4', '47µF/25V MLCC', '1210'],
  ['Connectors', '1', 'USB-C', 'SMD'],
  ['Edge Pads', '8', 'Castellated', '4mm/2mm'],
]

const timeline = [
  { time: 'T+0MS', label: 'TRIGGER', title: 'INJ_EN Goes High', desc: 'FC servo signal → optocoupler → RC filter → Schmitt trigger → clean digital edge.' },
  { time: 'T+0MS', label: 'PRECHARGE', title: 'Inrush Protection (~3ms)', desc: 'Differentiator fires a 3ms pulse through 8.2Ω (2A peak). Auto-off — no firmware.' },
  { time: 'T+5MS', label: 'LOWER', title: 'V1+ Connected to V2−', desc: '82kΩ delay → BSS84 P-ch ON → VG_RAIL (30V) drives lower bank. 6 MOSFETs engage.' },
  { time: 'T+7MS', label: 'UPPER', title: 'V2+ Connected to VL+', desc: '115kΩ delay → upper bank ON. Current flows V1+ → Cap → VL+. Series path complete.' },
  { time: 'T+9MS', label: 'BYPASS OFF', title: 'Direct Path Disconnected', desc: '150kΩ delay → 2N7002 pulls bypass gates. Opens last, after series is conducting.' },
]

export default function TDCScreen() {
  useReveal()

  return (
    <div className="tdc">
      {/* ═══ NAV ═══ */}
      <nav className="tdc-nav">
        <Link to="/home" className="tdc-brand"><b>MOMEN</b>CRAFTS</Link>
        <div className="tdc-nav-links">
          <a href="#how">HOW IT WORKS</a>
          <a href="#specs">SPECS</a>
          <a href="#sequence">SEQUENCE</a>
          <a href="#bom">BOM</a>
          <a href="https://github.com/MOMENCRAFTS/turbo-drone-circuit" target="_blank" rel="noopener">GITHUB ↗</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="tdc-hero">
        <div className="tdc-hero-glow" />
        <span className="tdc-mono tdc-hero-label">HARDWARE DIVISION · REV 1.1</span>
        <h1 className="tdc-hero-title">
          Turbo Drone<br /><span className="tdc-accent">Circuit</span>
        </h1>
        <p className="tdc-hero-sub">
          A 25×25mm supercapacitor series injection board that boosts your FPV drone's voltage by 15% on-demand. One switch. 150 amps. Instant power.
        </p>
        <div className="tdc-hero-stats">
          {[
            ['25', 'mm', 'BOARD SIZE'],
            ['150', 'A', 'BURST CURRENT'],
            ['19.3', 'V', 'PEAK OUTPUT'],
            ['4', 'oz', 'COPPER WEIGHT'],
          ].map(([val, unit, label]) => (
            <div key={label} className="tdc-stat">
              <div className="tdc-stat-val">{val}<span className="tdc-stat-unit">{unit}</span></div>
              <div className="tdc-mono tdc-stat-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="tdc-hero-cta">
          <a href="#specs" className="tdc-btn tdc-btn-primary">VIEW SPECS</a>
          <a href="https://github.com/MOMENCRAFTS/turbo-drone-circuit" target="_blank" rel="noopener" className="tdc-btn tdc-btn-ghost">GITHUB</a>
        </div>
      </section>

      {/* ═══ BOARD IMAGE ═══ */}
      <div className="tdc-board-showcase">
        <img src={boardRender} alt="TDC Rev 1.1 PCB" className="tdc-board-img" />
      </div>

      {/* ═══ FEATURES ═══ */}
      <section className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">WHAT IS IT</h3>
          <h2 className="tdc-h2">Raw Power in a Quarter's Footprint</h2>
          <p>The TDC sits between your battery and ESC. Flip a switch — it adds a supercapacitor in series, instantly boosting voltage.</p>
        </div>
        <div className="tdc-bento">
          {[
            ['⚡', '4-Switch Series Injection', 'True series topology. V1 + V2 stacks to 19.3V. Not a parallel boost — actual voltage addition.'],
            ['🔒', 'Galvanic Isolation', 'FC trigger is optocoupled. Charger uses isolated DC-DC. Your flight controller never sees noise.'],
            ['🔋', 'USB-C Charged', 'Any USB-C cable. B0505S-2WR3 isolated converter + LM317 charges to 2.50V in under 3 minutes.'],
            ['🏎️', '150A Through 19 MOSFETs', 'Each bank: 3× IRLR7843 in parallel, back-to-back. Total path: 21mΩ. Bypass adds only 2.7mΩ.', true],
            ['🎯', 'Analog Sequencing', 'No MCU. RC delays + Schmitt triggers sequence everything. Zero firmware risk.'],
          ].map(([icon, title, desc, wide], i) => (
            <div key={i} className={`tdc-bento-card reveal ${wide ? 'tdc-bento-wide' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
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
          <h3 className="tdc-mono tdc-h3">HOW IT WORKS</h3>
          <h2 className="tdc-h2">Two Modes, One Switch</h2>
          <p>FC servo channel controls everything. Low = normal. High = turbo.</p>
        </div>
        <div className="tdc-modes">
          <div className="tdc-mode-card reveal">
            <span className="tdc-mode-badge tdc-badge-normal">NORMAL MODE</span>
            <div className="tdc-mode-voltage">16.8<span className="tdc-stat-unit">V</span></div>
            <p className="tdc-mode-desc">Battery → bypass bank → ESC. Supercap floating. Only 2.7mΩ added.</p>
            <div className="tdc-mode-path">V1+ → [BYPASS: 6× IRLR7843] → VL+</div>
          </div>
          <div className="tdc-mode-card tdc-mode-active reveal">
            <span className="tdc-mode-badge tdc-badge-turbo">TURBO MODE</span>
            <div className="tdc-mode-voltage">19.3<span className="tdc-stat-unit">V</span> <span className="tdc-boost-tag">+15%</span></div>
            <p className="tdc-mode-desc">Bypass opens. Battery flows through supercap in series. More RPM. More thrust.</p>
            <div className="tdc-mode-path">V1+ → [LOWER: 6×] → V2− → CAP → V2+ → [UPPER: 6×] → VL+</div>
          </div>
        </div>
      </section>

      {/* ═══ SEQUENCE ═══ */}
      <section id="sequence" className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">INJECTION SEQUENCE</h3>
          <h2 className="tdc-h2">9 Milliseconds to Turbo</h2>
          <p>Cascaded RC delays ensure each stage engages in order — no shoot-through, no voltage gaps.</p>
        </div>
        <div className="tdc-timeline reveal">
          {timeline.map((step, i) => (
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
          <h3 className="tdc-mono tdc-h3">SPECIFICATIONS</h3>
          <h2 className="tdc-h2">Engineering Details</h2>
        </div>
        <div className="tdc-specs reveal">
          {specs.map(([key, val]) => (
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
          <h3 className="tdc-mono tdc-h3">BILL OF MATERIALS</h3>
          <h2 className="tdc-h2">~95 Components, All LCSC</h2>
        </div>
        <div className="tdc-bom reveal">
          <table>
            <thead>
              <tr><th>GROUP</th><th>QTY</th><th>PART</th><th>PKG</th></tr>
            </thead>
            <tbody>
              {bom.map(([group, qty, part, pkg]) => (
                <tr key={group}><td>{group}</td><td className="tdc-qty">{qty}</td><td>{part}</td><td>{pkg}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ GALLERY ═══ */}
      <section className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">VISUALS</h3>
          <h2 className="tdc-h2">Design Gallery</h2>
        </div>
        <div className="tdc-gallery reveal">
          {[boardRender, topologyDiagram, powerFlow, droneApp, sizeCompare].map((src, i) => (
            <img key={i} src={src} alt={`TDC visual ${i + 1}`} />
          ))}
        </div>
      </section>

      {/* ═══ STACKUP ═══ */}
      <section className="tdc-section tdc-section-border">
        <div className="tdc-section-head reveal">
          <h3 className="tdc-mono tdc-h3">PCB STACKUP</h3>
          <h2 className="tdc-h2">4 Layers of Engineered Copper</h2>
        </div>
        <div className="tdc-stackup reveal">
          {[
            ['L1 · F.Cu · 4oz (140µm)', 'POWER MOSFETs', 'var(--tdc-red)', 28],
            ['Prepreg · 0.2mm', '', '#333', 12],
            ['L2 · In1.Cu · 1oz (35µm)', 'V1+ POWER PLANE', '#ff6666', 20],
            ['Core · 0.8mm · FR4', '', '#333', 36],
            ['L3 · In2.Cu · 1oz (35µm)', 'GND PLANE (V1−)', '#aaa', 20],
            ['Prepreg · 0.2mm', '', '#333', 12],
            ['L4 · B.Cu · 4oz (140µm)', 'CHARGER + CONTROL', '#aa66ff', 28],
          ].map(([label, desc, color, h], i) => (
            <div key={i} className="tdc-layer" style={{ borderColor: color as string, height: h as number }}>
              <span style={{ color: color as string }}>{label}</span>
              {desc && <span className="tdc-layer-desc">{desc as string}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="tdc-cta tdc-section-border">
        <h3 className="tdc-mono tdc-h3">OPEN SOURCE HARDWARE</h3>
        <h2 className="tdc-h2">Build Your Own</h2>
        <p>KiCad source, BOM, design notes — everything for JLCPCB.</p>
        <div className="tdc-cta-actions">
          <a href="https://github.com/MOMENCRAFTS/turbo-drone-circuit" target="_blank" rel="noopener" className="tdc-btn tdc-btn-primary">VIEW ON GITHUB</a>
          <Link to="/home" className="tdc-btn tdc-btn-ghost">← INVESTOR ROOM</Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="tdc-footer">
        <span>© 2026 MOMENCRAFTS · RIYADH</span>
        <span>TDC — TURBO DRONE CIRCUIT · REV 1.1 · DESIGNED IN SAUDI ARABIA</span>
      </footer>
    </div>
  )
}

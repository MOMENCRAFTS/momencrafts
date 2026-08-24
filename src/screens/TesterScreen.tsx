import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import { BlueprintSheet, StageGlyph, type Stage } from '@/components/BlueprintSheet'
import {
  listTesterApps, requestApkUrl, requestJoinProgramme,
  type TesterApp, type TesterCatalogue,
} from '@/services/supabase'
import '@/styles/blueprint.css'
import '@/styles/tester.css'

/* ═══════════════════════════════════════════════════════════
   TesterScreen — /tester

   Same drawing sheet as the landing page, read as four sheets:
     01 your builds        — assigned to this tester, downloadable
     02 open programmes    — advertised, joinable on request
     03 installation
     04 reporting

   Access is explicit: a build is downloadable only if the founder has
   assigned it. Everything else is either invisible (private) or
   listed as joinable, never silently available.
   ═══════════════════════════════════════════════════════════ */

const WA_NUMBER = '966535271122'
const waHref = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`

/* status → accent, pill and glyph stage, kept in lockstep so a card
   never shows a "built" cube next to a DEV pill. */
const STATUS_MAP: Record<string, { accent: string; pill: string; stage: Stage }> = {
  live:     { accent: 'var(--live)', pill: 'pill--live', stage: 'live' },
  beta:     { accent: 'var(--beta)', pill: 'pill--beta', stage: 'beta' },
  dev:      { accent: 'var(--dev)',  pill: 'pill--dev',  stage: 'dev'  },
  disabled: { accent: 'var(--dev)',  pill: 'pill--dev',  stage: 'dev'  },
}

const Arrow = () => <span className="dir-arrow">→</span>

/* ── A build this tester has ─────────────────────────────── */
function AssignedCard({ app, index, token }: { app: TesterApp; index: number; token: string }) {
  const { t, isAr } = useT()
  const s = t.tester
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const tone = STATUS_MAP[app.status] ?? STATUS_MAP.dev
  const stageLabel = app.stage ? s.stages[app.stage] : null
  const displayName = isAr && app.nameAr ? app.nameAr : app.name

  const download = useCallback(async () => {
    setBusy(true); setErr('')
    // Minted at click time, valid ~5 minutes — never cached in state.
    const res = await requestApkUrl(token, app.appId)
    if (res.ok) window.location.href = res.url
    else setErr(res.error)
    setBusy(false)
  }, [token, app.appId])

  return (
    <article
      className="card reveal ts-card"
      id={`ts-card-${app.appId}`}
      style={{ '--accent': tone.accent } as React.CSSProperties}
    >
      <span className="card__no mono">{String(index + 1).padStart(2, '0')}</span>

      <div className="card__row">
        <div className="card__glyph"><StageGlyph stage={tone.stage} size={30} /></div>
        <span className="card__name">{displayName}</span>
        {stageLabel && <span className={`pill ${tone.pill} mono`}>{stageLabel}</span>}
      </div>

      {app.description && <p className="card__tagline">{app.description}</p>}

      <div className="tags">
        <span className="mono">{app.version}</span>
        {app.size && <span className="mono">{app.size}</span>}
        {app.minAndroid && <span className="mono">{app.minAndroid}</span>}
        {app.buildDate && <span className="mono">{app.buildDate}</span>}
      </div>

      <div className="ts-actions">
        {app.hasBuild ? (
          <button className="btn btn--gold ts-btn" onClick={download} disabled={busy}>
            {busy ? s.downloading : `⬇ ${s.download}`}
          </button>
        ) : (
          <span className="ts-btn ts-btn--void mono" aria-disabled="true" title={s.noBuildNote}>
            {s.noBuild}
          </span>
        )}

        {app.guideUrl && (
          <a className="card__more" href={app.guideUrl} target="_blank" rel="noopener">
            {s.guide} <Arrow />
          </a>
        )}
        <a
          className="card__more"
          href={waHref(s.bug.message(app.name, app.version))}
          target="_blank" rel="noopener"
        >
          {s.reportBug} <Arrow />
        </a>
      </div>

      {app.hasBuild && <p className="ts-note mono">{s.downloadNote}</p>}
      {err && <p className="ts-error" role="alert">{err}</p>}
    </article>
  )
}

/* ── A programme this tester could join ──────────────────── */
function OpenCard({ app, index, token }: { app: TesterApp; index: number; token: string }) {
  const { t, isAr } = useT()
  const s = t.tester
  const [status, setStatus] = useState(app.requestStatus ?? null)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const tone = STATUS_MAP[app.status] ?? STATUS_MAP.dev
  const stageLabel = app.stage ? s.stages[app.stage] : null
  const displayName = isAr && app.nameAr ? app.nameAr : app.name

  const join = useCallback(async () => {
    setBusy(true); setErr('')
    const res = await requestJoinProgramme(token, app.appId)
    if (res.ok) setStatus('pending')
    else setErr(res.error)
    setBusy(false)
  }, [token, app.appId])

  return (
    <article
      className="card reveal ts-card ts-card--open"
      id={`ts-open-${app.appId}`}
      style={{ '--accent': tone.accent } as React.CSSProperties}
    >
      <span className="card__no mono">{String(index + 1).padStart(2, '0')}</span>

      <div className="card__row">
        <div className="card__glyph"><StageGlyph stage="dev" size={30} /></div>
        <span className="card__name">{displayName}</span>
        {stageLabel && <span className={`pill ${tone.pill} mono`}>{stageLabel}</span>}
      </div>

      {app.description && <p className="card__tagline">{app.description}</p>}

      <div className="tags">
        <span className="mono">{app.version}</span>
        {app.minAndroid && <span className="mono">{app.minAndroid}</span>}
      </div>

      <div className="ts-actions">
        {status === 'pending' ? (
          <span className="ts-btn ts-btn--pending mono" aria-live="polite">◷ {s.open.pending}</span>
        ) : status === 'denied' ? (
          <span className="ts-btn ts-btn--void mono">{s.open.denied}</span>
        ) : (
          <button className="btn btn--gold ts-btn" onClick={join} disabled={busy}>
            {busy ? s.open.requesting : `＋ ${s.open.request}`}
          </button>
        )}
      </div>

      {status === 'pending' && <p className="ts-note mono">{s.open.requestedNote}</p>}
      {err && <p className="ts-error" role="alert">{err}</p>}
    </article>
  )
}

export default function TesterScreen() {
  const navigate = useNavigate()
  const clearSession = useAppStore(st => st.clearSession)
  const { t, dir, lang } = useT()
  const s = t.tester

  const token = sessionStorage.getItem('mcr_token') || ''
  const storedName = sessionStorage.getItem('mcr_name') || ''
  const masked = token.length > 4 ? 'MCR-••••' + token.slice(-4) : token

  const [cat, setCat]          = useState<TesterCatalogue | null>(null)
  const [name, setName]        = useState(storedName)
  const [error, setError]      = useState('')
  const [reloadKey, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!token) { setError(s.error.heading); return }
    setCat(null); setError('')
    listTesterApps(token).then(res => {
      if (cancelled) return
      if (res.ok) {
        setCat(res.data)
        if (res.data.testerName) setName(res.data.testerName)
      } else {
        setError(res.error)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reloadKey])

  useEffect(() => { document.title = 'MomenCrafts — Tester Portal' }, [])

  // Reveal-on-scroll, matching the landing page's behaviour
  useEffect(() => {
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible', 'is-visible') }),
      { threshold: .08 },
    )
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [cat])

  const handleExit = () => {
    ;['mcr_investor','mcr_token','mcr_session','mcr_name','mcr_type','mcr_expires','mcr_email','mcr_ts','mcr_projects']
      .forEach(k => sessionStorage.removeItem(k))
    clearSession()
    navigate('/')
  }

  const assigned = cat?.assigned ?? []
  const open     = cat?.open ?? []

  return (
    <div className="bp-root ts-root" dir={dir} lang={lang}>
      <BlueprintSheet />
      <LangToggle />

      {/* ── Sheet nav ── */}
      <nav className="nav">
        <span className="nav__mark">MOMENCRAFTS</span>
        <div className="nav__links">
          <a href="#builds">{s.appsHeading}</a>
          <a href="#open">{s.open.heading}</a>
          <a href="#install">{s.install.heading}</a>
          <a href="#report">{s.bug.heading}</a>
        </div>
        <div className="ts-nav-right">
          <span className="nav__chip mono">{masked}</span>
          <button className="ts-exit mono" onClick={handleExit}>{s.exit}</button>
        </div>
      </nav>

      {/* ── Header block ── */}
      <header className="page ts-head">
        <span className="kicker">{s.badge}</span>
        <h1 className="ts-title">{name ? s.greeting(name) : s.greetingAnon}</h1>
        <div className="dim">
          <div className="dim__bar" />
          <span className="dim__val mono">SHEET 01 — TEST BUILDS</span>
          <div className="dim__bar" />
        </div>
        <p className="ts-sub">{s.sub}</p>
      </header>

      {/* ── 01 · Your builds ── */}
      <div className="cutline page"><span>SHEET 01 — TEST BUILDS</span></div>
      <section id="builds" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">01</span>
            <h2>{s.appsHeading}</h2>
          </div>
          {assigned.length > 0 && <span className="section__meta">{s.appsCount(assigned.length)}</span>}
        </div>

        {error ? (
          <div className="ts-state">
            <h3 className="ts-state-title">{s.error.heading}</h3>
            <p className="ts-state-body">{error}</p>
            <button className="btn btn--gold ts-btn" onClick={() => setReload(k => k + 1)}>
              {s.error.retry}
            </button>
          </div>
        ) : cat === null ? (
          <div className="grid" aria-busy="true">
            {[0, 1, 2].map(i => <div className="ts-skeleton" key={i} />)}
          </div>
        ) : assigned.length === 0 ? (
          <div className="ts-state">
            <h3 className="ts-state-title">{s.empty.heading}</h3>
            <p className="ts-state-body">{s.empty.body}</p>
            <a className="btn btn--gold ts-btn" href={waHref(s.empty.message)} target="_blank" rel="noopener">
              {s.empty.cta} <Arrow />
            </a>
          </div>
        ) : (
          <div className="grid">
            {assigned.map((app, i) => <AssignedCard key={app.appId} app={app} index={i} token={token} />)}
          </div>
        )}
      </section>

      {/* ── 02 · Open programmes ── */}
      <div className="cutline page"><span>SHEET 02 — OPEN PROGRAMMES</span></div>
      <section id="open" className="section section--band page">
        <div className="section__head">
          <div>
            <span className="section__index mono">02</span>
            <h2>{s.open.heading}</h2>
          </div>
          {open.length > 0 && <span className="section__meta">{s.open.count(open.length)}</span>}
        </div>
        <p className="ts-lead">{s.open.intro}</p>

        {cat === null ? (
          <div className="grid" aria-busy="true">
            {[0, 1].map(i => <div className="ts-skeleton" key={i} />)}
          </div>
        ) : open.length === 0 ? (
          <p className="ts-muted">{s.open.none}</p>
        ) : (
          <div className="grid">
            {open.map((app, i) => <OpenCard key={app.appId} app={app} index={i} token={token} />)}
          </div>
        )}
      </section>

      {/* ── 03 · Installation ── */}
      <div className="cutline page"><span>SHEET 03 — INSTALLATION</span></div>
      <section id="install" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">03</span>
            <h2>{s.install.heading}</h2>
          </div>
        </div>
        <ol className="ts-steps">
          {s.install.steps.map((step, i) => (
            <li key={i}>
              <span className="ts-step-no mono">{String(i + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 04 · Reporting ── */}
      <div className="cutline page"><span>SHEET 04 — REPORTING</span></div>
      <section id="report" className="section page">
        <div className="section__head">
          <div>
            <span className="section__index mono">04</span>
            <h2>{s.bug.heading}</h2>
          </div>
        </div>
        <div className="ts-report">
          <p className="ts-report-body">{s.bug.body}</p>
          <a className="btn btn--gold ts-btn" href={waHref(s.bug.generic)} target="_blank" rel="noopener">
            💬 {s.bug.cta} <Arrow />
          </a>
        </div>
      </section>

      {/* ── Title block ── */}
      <footer className="page ts-foot">
        <div className="titleblock">
          <div className="titleblock__cell">
            <div className="titleblock__k">STUDIO</div>
            <div className="titleblock__v">MomenCrafts</div>
          </div>
          <div className="titleblock__cell">
            <div className="titleblock__k">{s.badge}</div>
            <div className="titleblock__v titleblock__v--gold" dir="ltr">{masked}</div>
          </div>
          <div className="titleblock__cell">
            <div className="titleblock__k">SHEETS</div>
            <div className="titleblock__v">04</div>
          </div>
          <div className="titleblock__cell">
            <div className="titleblock__k">REV</div>
            <div className="titleblock__v" dir="ltr">MC-2026.08</div>
          </div>
        </div>
        <div className="ts-footer-row">
          <span>{s.footer}</span>
          <span className="mono">© 2026 MomenCrafts</span>
        </div>
      </footer>
    </div>
  )
}

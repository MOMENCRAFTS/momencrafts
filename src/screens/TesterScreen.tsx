import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import { listTesterApps, requestApkUrl, type TesterApp } from '@/services/supabase'
import '@/styles/tester.css'

/* ═══════════════════════════════════════════════════════════
   TesterScreen — /tester

   Deliberately narrow: builds, guides, and a way to report bugs.
   No investor copy, no financials, no & Co content — a tester who
   lands here should not be able to tell the investor room exists.
   ═══════════════════════════════════════════════════════════ */

const WA_NUMBER = '966535271122'
const waHref = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`

const STATUS_TONE: Record<string, string> = {
  live: 'ts-tone-live', beta: 'ts-tone-beta', dev: 'ts-tone-dev', disabled: 'ts-tone-dev',
}

function AppCard({ app, token }: { app: TesterApp; token: string }) {
  const { t, isAr } = useT()
  const s = t.tester
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const stageLabel = app.stage ? s.stages[app.stage] : null
  const displayName = isAr && app.nameAr ? app.nameAr : app.name

  const download = useCallback(async () => {
    setBusy(true); setErr('')
    // The signed URL is minted at click time and lives ~5 minutes, so it is
    // never stored in component state or reused.
    const res = await requestApkUrl(token, app.appId)
    if (res.ok) {
      window.location.href = res.url
    } else {
      setErr(res.error)
    }
    setBusy(false)
  }, [token, app.appId])

  return (
    <article className="ts-card" id={`ts-card-${app.appId}`}>
      <div className="ts-card-head">
        <span className="ts-card-emoji" aria-hidden="true">{app.emoji || '📱'}</span>
        <div className="ts-card-title">
          <h3 className="ts-card-name">{displayName}</h3>
          {app.description && <p className="ts-card-desc">{app.description}</p>}
        </div>
        {stageLabel && (
          <span className={`ts-stage ${STATUS_TONE[app.status] || 'ts-tone-dev'}`}>{stageLabel}</span>
        )}
      </div>

      <dl className="ts-meta">
        <div className="ts-meta-item">
          <dt>{s.meta.version}</dt>
          <dd dir="ltr">{app.version}</dd>
        </div>
        {app.buildDate && (
          <div className="ts-meta-item">
            <dt>{s.meta.build}</dt>
            <dd dir="ltr">{app.buildDate}</dd>
          </div>
        )}
        {app.size && (
          <div className="ts-meta-item">
            <dt>{s.meta.size}</dt>
            <dd dir="ltr">{app.size}</dd>
          </div>
        )}
        {app.minAndroid && (
          <div className="ts-meta-item">
            <dt>{s.meta.requires}</dt>
            <dd dir="ltr">{app.minAndroid}</dd>
          </div>
        )}
      </dl>

      <div className="ts-card-actions">
        {app.hasBuild ? (
          <button className="ts-btn ts-btn--primary" onClick={download} disabled={busy}>
            {busy ? s.downloading : `⬇ ${s.download}`}
          </button>
        ) : (
          <span className="ts-btn ts-btn--disabled" aria-disabled="true" title={s.noBuildNote}>
            {s.noBuild}
          </span>
        )}

        {app.guideUrl && (
          <a className="ts-btn ts-btn--ghost" href={app.guideUrl} target="_blank" rel="noopener">
            📖 {s.guide}
          </a>
        )}

        <a
          className="ts-btn ts-btn--ghost"
          href={waHref(s.bug.message(app.name, app.version))}
          target="_blank" rel="noopener"
        >
          🐛 {s.reportBug}
        </a>
      </div>

      {app.hasBuild && <p className="ts-card-note">{s.downloadNote}</p>}
      {err && <p className="ts-card-error" role="alert">{err}</p>}
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

  const [apps, setApps]       = useState<TesterApp[] | null>(null)
  const [name, setName]       = useState(storedName)
  const [error, setError]     = useState('')
  const [reloadKey, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!token) { setError(s.error.heading); return }
    setApps(null); setError('')
    listTesterApps(token).then(res => {
      if (cancelled) return
      if (res.ok) {
        setApps(res.apps)
        if (res.testerName) setName(res.testerName)
      } else {
        setError(res.error)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reloadKey])

  useEffect(() => {
    document.title = 'MomenCrafts — Tester Portal'
  }, [])

  const handleExit = () => {
    ;['mcr_investor','mcr_token','mcr_session','mcr_name','mcr_type','mcr_expires','mcr_email','mcr_ts','mcr_projects']
      .forEach(k => sessionStorage.removeItem(k))
    clearSession()
    navigate('/')
  }

  return (
    <div className="ts-root" dir={dir} lang={lang}>
      <LangToggle />

      <header className="ts-header">
        <div className="ts-header-inner">
          <div className="ts-brand">
            <span className="ts-brand-mark">✦</span>
            <span className="ts-brand-name">MOMENCRAFTS</span>
            <span className="ts-badge">{s.badge}</span>
          </div>
          <button className="ts-exit" onClick={handleExit}>{s.exit}</button>
        </div>
      </header>

      <main className="ts-main">
        <section className="ts-intro">
          <h1 className="ts-greeting">{name ? s.greeting(name) : s.greetingAnon}</h1>
          <p className="ts-sub">{s.sub}</p>
        </section>

        {/* ── Apps ── */}
        <section className="ts-section">
          <div className="ts-section-head">
            <h2 className="ts-section-title">{s.appsHeading}</h2>
            {apps && apps.length > 0 && <span className="ts-section-meta">{s.appsCount(apps.length)}</span>}
          </div>

          {error ? (
            <div className="ts-state">
              <h3 className="ts-state-title">{s.error.heading}</h3>
              <p className="ts-state-body">{error}</p>
              <button className="ts-btn ts-btn--primary" onClick={() => setReload(k => k + 1)}>
                {s.error.retry}
              </button>
            </div>
          ) : apps === null ? (
            <div className="ts-skeletons" aria-busy="true">
              {[0, 1, 2].map(i => <div className="ts-skeleton" key={i} />)}
            </div>
          ) : apps.length === 0 ? (
            <div className="ts-state">
              <h3 className="ts-state-title">{s.empty.heading}</h3>
              <p className="ts-state-body">{s.empty.body}</p>
              <a className="ts-btn ts-btn--primary" href={waHref(s.empty.message)} target="_blank" rel="noopener">
                {s.empty.cta}
              </a>
            </div>
          ) : (
            <div className="ts-grid">
              {apps.map(app => <AppCard key={app.appId} app={app} token={token} />)}
            </div>
          )}
        </section>

        {/* ── Install help ── */}
        <section className="ts-section ts-panel">
          <h2 className="ts-panel-title">{s.install.heading}</h2>
          <ol className="ts-steps">
            {s.install.steps.map((step, i) => (
              <li key={i}><span className="ts-step-no">{i + 1}</span><span>{step}</span></li>
            ))}
          </ol>
        </section>

        {/* ── Bug reporting ── */}
        <section className="ts-section ts-panel ts-panel--accent">
          <h2 className="ts-panel-title">{s.bug.heading}</h2>
          <p className="ts-panel-body">{s.bug.body}</p>
          <a className="ts-btn ts-btn--primary" href={waHref(s.bug.generic)} target="_blank" rel="noopener">
            💬 {s.bug.cta}
          </a>
        </section>
      </main>

      <footer className="ts-footer">
        <p>{s.footer}</p>
        <p className="ts-footer-mark">© 2026 MomenCrafts</p>
      </footer>
    </div>
  )
}

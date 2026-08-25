import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { useT } from '@/i18n'
import { LangToggle } from '@/components/LangToggle'
import { verifyToken, acceptAgreement } from '@/services/supabase'
import { landingFor, isTester, COFOUNDER_TYPES } from '@/lib/access'
import '@/styles/tester.css'
import { CoFounderWelcome } from '@/components/CoFounderWelcome'
import { RequestAccessForm } from '@/components/RequestAccessForm'
import '@/styles/gate.css'

/* ── NDA Overlay component ─────────────────────────────── */
interface NDAProps {
  token: string
  investorData: { name?: string; type: string; expires?: string | null; session: string }
  onAccept: () => void
  onDecline: () => void
}
function NDAOverlay({ token, investorData, onAccept, onDecline }: NDAProps) {
  const { t, isAr } = useT()
  const g = t.gate.nda
  const locale = isAr ? 'ar-EG' : 'en-GB'

  const typeLabel = (t.home.accessTypes as unknown as Record<string, string>)[investorData.type] ?? investorData.type
  const expiryStr = investorData.expires
    ? new Date(investorData.expires).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : g.open
  const masked = token.slice(0, 7) + '••••'
  const timestamp = new Date().toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="nda-overlay visible" role="dialog" aria-modal="true">
      <div className="nda-card">
        <div className="nda-mark">✦</div>
        <div className="nda-title">{g.title}</div>

        {investorData.name && (
          <div className="nda-prepared-for">
            <span className="nda-pf-label">{g.preparedFor}</span>
            <span className="nda-pf-name">{investorData.name}</span>
            <span className="nda-pf-type">{typeLabel} · {g.expires} {expiryStr}</span>
          </div>
        )}
        {investorData.type === 'HOUR' && (
          <div className="nda-hour-warning">{g.hourWarning}</div>
        )}

        <p className="nda-body">{g.body}</p>

        <div className="nda-meta">
          <span className="nda-meta-key">{g.metaAccessKey}</span>
          <span className="nda-meta-val" dir="ltr">{masked}</span>
          <span className="nda-meta-key">{g.metaAccessType}</span>
          <span className="nda-meta-val">{typeLabel}</span>
          <span className="nda-meta-key">{g.metaExpires}</span>
          <span className="nda-meta-val">{expiryStr}</span>
          <span className="nda-meta-key">{g.metaDateTime}</span>
          <span className="nda-meta-val">{timestamp}</span>
          <span className="nda-meta-key">{g.metaSession}</span>
          <span className="nda-meta-val" dir="ltr">{investorData.session}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', color: 'var(--cream-mute)', textAlign: 'center', marginBottom: '1.25rem', letterSpacing: '.05em' }}>
          {g.logged}
        </p>

        <button className="nda-accept" onClick={onAccept}>
          {g.accept} <span className="dir-arrow">→</span>
        </button>
        <button className="nda-decline" onClick={onDecline}>
          {g.decline}
        </button>
      </div>
    </div>
  )
}

/* ── Testing Terms overlay — the tester's lighter agreement ──
   Same shell as the NDA so it feels part of the same gate, but the
   copy is about builds and confidentiality, not investment material. */
function TestingTermsOverlay({ name, onAccept, onDecline }: {
  name?: string; onAccept: () => void; onDecline: () => void
}) {
  const { t } = useT()
  const c = t.tester.terms

  return (
    <div className="nda-overlay visible" role="dialog" aria-modal="true">
      <div className="nda-card">
        <div className="nda-mark">🧪</div>
        <div className="nda-title">{c.title}</div>

        {name && (
          <div className="nda-prepared-for">
            <span className="nda-pf-label">{c.preparedFor}</span>
            <span className="nda-pf-name">{name}</span>
          </div>
        )}

        <p className="nda-body">{c.intro}</p>

        <ul className="ts-terms-points">
          {c.points.map((point, i) => <li key={i}>{point}</li>)}
        </ul>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', color: 'var(--cream-mute)', textAlign: 'center', marginBottom: '1.25rem', letterSpacing: '.05em' }}>
          {c.logged}
        </p>

        <button className="nda-accept" onClick={onAccept}>
          {c.accept} <span className="dir-arrow">→</span>
        </button>
        <button className="nda-decline" onClick={onDecline}>
          {c.decline}
        </button>
      </div>
    </div>
  )
}

/* ── Gate Screen ───────────────────────────────────────── */
export default function GateScreen() {
  const navigate = useNavigate()
  const { lang, setToken } = useAppStore()
  const { t } = useT()
  const g = t.gate

  const [tokenVal, setTokenVal]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [inputState, setInputState] = useState<'default' | 'error' | 'success'>('default')
  const [showRequest, setShowRequest] = useState(false)
  const [insightIdx, setInsightIdx] = useState(0)
  const [showNDA,        setShowNDA]        = useState(false)
  const [vaultOpen,      setVaultOpen]      = useState(false)
  const [showCoFounder,  setShowCoFounder]  = useState(false)
  const [showTerms,      setShowTerms]      = useState(false)
  const [pendingData, setPendingData] = useState<{ token: string; tokenId?: string; name?: string; type: string; expires?: string | null; session: string; projectAccess?: string[] } | null>(null)

  const insights = g.insights

  // Insight rotator
  useEffect(() => {
    const t = setInterval(() => setInsightIdx(i => i + 1), 5000)
    return () => clearInterval(t)
  }, [])

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => document.getElementById('tokenInput')?.focus(), 300)
    return () => clearTimeout(t)
  }, [])

  const formatToken = useCallback((raw: string) => {
    let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (v.startsWith('MCR')) v = v.slice(3)
    if (v.length > 8) v = v.slice(0, 8)
    setTokenVal(v.length ? 'MCR-' + v : '')
    setInputState('default')
    setError('')
  }, [])

  const handleSubmit = async () => {
    if (!/^MCR-[A-Z0-9]{8}$/.test(tokenVal)) {
      setInputState('error')
      setError(g.errors.format)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await verifyToken(tokenVal)
      if (!data.valid) throw new Error(data.error ?? 'invalid')

      const session = Math.random().toString(36).slice(2, 10).toUpperCase()
      const tokenType = data.type ?? 'MONTH'
      const investorName = data.name ?? data.label ?? ''

      // Write mcr_* keys
      sessionStorage.setItem('mcr_session', session)
      sessionStorage.setItem('mcr_token',   tokenVal)
      sessionStorage.setItem('mcr_name',    investorName)
      sessionStorage.setItem('mcr_type',    tokenType)
      sessionStorage.setItem('mcr_expires', data.expires ?? '')
      sessionStorage.setItem('mcr_projects', JSON.stringify(data.projectAccess ?? []))
      sessionStorage.setItem('mcr_email',   data.email ?? '')

      setPendingData({ token: tokenVal, tokenId: data.tokenId, name: investorName, type: tokenType, expires: data.expires ?? null, session, projectAccess: data.projectAccess ?? [] })
      setInputState('success')
      // Testers get short testing terms instead of the co-builder NDA.
      if (isTester(tokenType)) setShowTerms(true)
      else setShowNDA(true)
    } catch {
      setInputState('error')
      setError(g.errors.invalid)
    } finally {
      setLoading(false)
    }
  }

  const acceptNDA = async () => {
    if (!pendingData) return
    setShowNDA(false)

    // Track NDA acceptance (fire-and-forget)
    fetch('https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/track-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pendingData.token, event: 'nda_accepted', sessionId: pendingData.session }),
    }).catch(() => {})

    // Co-founder celebration screen — DON'T setToken yet or GateGuard will navigate away immediately
    if (COFOUNDER_TYPES.has(pendingData.type)) {
      setShowCoFounder(true)
    } else {
      // Regular investors → finalise session then vault flash
      sessionStorage.setItem('mcr_investor', '1')
      sessionStorage.setItem('mcr_ts', new Date().toISOString())
      setToken(pendingData.token, {
        name: pendingData.name ?? '',
        label: pendingData.name ?? '',
        type: pendingData.type,
        expires: pendingData.expires ?? null,
        session: pendingData.session,
        valid: true,
      })
      setVaultOpen(true)
      setTimeout(() => navigate(landingFor(pendingData.type)), 500)
    }
  }

  const handleCoFounderEnter = () => {
    setShowCoFounder(false)
    // NOW finalise session — setToken triggers GateGuard to navigate to /home
    if (pendingData) {
      sessionStorage.setItem('mcr_investor', '1')
      sessionStorage.setItem('mcr_ts', new Date().toISOString())
      setToken(pendingData.token, {
        name: pendingData.name ?? '',
        label: pendingData.name ?? '',
        type: pendingData.type,
        expires: pendingData.expires ?? null,
        session: pendingData.session,
        valid: true,
      })
    }
    setVaultOpen(true)
    setTimeout(() => navigate(landingFor(pendingData?.type)), 800)
  }

  const declineNDA = () => {
    setShowNDA(false)
    setShowTerms(false)
    setInputState('default')
    setTokenVal('')
    setPendingData(null)
    ;['mcr_session','mcr_token','mcr_name','mcr_type','mcr_expires','mcr_email','mcr_projects'].forEach(k => sessionStorage.removeItem(k))
  }

  const acceptTerms = () => {
    if (!pendingData) return
    setShowTerms(false)

    // Log the acceptance against the token (fire-and-forget — a failed log
    // must not block a tester who already agreed on screen).
    if (pendingData.tokenId) {
      acceptAgreement({
        tokenId: pendingData.tokenId,
        signerName: pendingData.name || pendingData.token,
        docType: 'TESTING_TERMS',
      }).catch(() => {})
    }
    fetch('https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/track-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pendingData.token, event: 'testing_terms_accepted', sessionId: pendingData.session }),
    }).catch(() => {})

    sessionStorage.setItem('mcr_investor', '1')
    sessionStorage.setItem('mcr_ts', new Date().toISOString())
    setToken(pendingData.token, {
      name: pendingData.name ?? '',
      label: pendingData.name ?? '',
      type: pendingData.type,
      expires: pendingData.expires ?? null,
      session: pendingData.session,
      valid: true,
    })
    setVaultOpen(true)
    setTimeout(() => navigate('/tester'), 500)
  }

  const inputClass = `token-input${inputState === 'error' ? ' error' : inputState === 'success' ? ' success' : ''}`

  return (
    <>
      <div className="gate-layout">
        {/* ── LEFT — Branding ── */}
        <div className="gate-brand">
          <div className="gate-brand-top">
            <div className="gate-logo-mark">✦</div>
            <div className="gate-logo-text">
              <span className="gate-logo-primary">MOMENCRAFTS</span>
              <span className="gate-logo-co">{g.brandCo}</span>
            </div>
          </div>

          <div className="gate-headline-block">
            <h1 className="gate-heading">
              {g.headingLine1}<br/><em>{g.headingEm}</em>
            </h1>
            <p className="gate-sub">{g.sub}</p>
          </div>

          {/* Insights rotator */}
          <div className="gate-insight-box" aria-live="polite">
            <div className="gate-insight-label">{g.insightLabel}</div>
            <p className="gate-insight-text" style={{ transition: 'opacity .3s' }}>
              {insights[insightIdx % insights.length]}
            </p>
            <div className="gate-insight-dots">
              {insights.map((_, i) => (
                <span key={i}
                  className={`insight-dot${i === insightIdx % insights.length ? ' active' : ''}`}
                  onClick={() => setInsightIdx(i)} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="gate-stats">
            {[
              { num: '10',   label: g.stats.products },
              { num: '5',    label: g.stats.industries },
              { num: '2',    label: g.stats.patents },
              { num: '2026', label: g.stats.founded },
            ].map(s => (
              <div className="gate-stat" key={s.label}>
                <span className="gate-stat-num" dir="ltr">{s.num}</span>
                <span className="gate-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="gate-brand-footer">
            <span className="gate-location">{g.location}</span>
            <span className="gate-year">© 2026 MomenCrafts & Co</span>
          </div>
        </div>

        {/* ── RIGHT — Token Entry ── */}
        <div className="gate-entry" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          <LangToggle variant="inline" />

          <div className="token-card">
            <div className="token-card-badge">
              <span>{g.card.badge}</span>
            </div>

            <h2 className="token-card-title">
              <span>{g.card.titleLine1}</span><br/><em>{g.card.titleEm}</em>
            </h2>

            <p className="token-card-sub">{g.card.sub}</p>

            <label className="token-field-label" htmlFor="tokenInput">
              {g.card.fieldLabel}
            </label>

            <div className="token-input-wrap">
              <input
                id="tokenInput"
                type="text"
                className={inputClass}
                placeholder="MCR-XXXXXXXX"
                maxLength={12}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={tokenVal}
                onChange={e => formatToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                aria-label={g.card.fieldLabel}
                inputMode="text"
                dir="ltr"
              />
            </div>

            <div className="token-error" role="alert">{error}</div>

            <button
              className={`token-submit${loading ? ' loading' : ''}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              <div className="btn-spinner" />
              <span className="btn-text">{g.card.submit} <span className="dir-arrow">→</span></span>
            </button>

            {/* Role hint — clarifies the single input handles all access types */}
            <div className="gate-role-hint">
              <div className="gate-role-icons">
                {(g.card as any).roles?.map((r: { icon: string; label: string }, i: number) => (
                  <span key={i} className="gate-role-chip">
                    <span className="gate-role-icon">{r.icon}</span>
                    <span className="gate-role-label">{r.label}</span>
                  </span>
                ))}
              </div>
              <p className="gate-role-text">{(g.card as any).roleHint}</p>
            </div>
          </div>

          {/* ── Request Access ── */}
          <div className="gate-request-wrap">
            <button
              className="gate-request-toggle"
              onClick={() => setShowRequest(s => !s)}
              aria-expanded={showRequest}
            >
              <span>{g.requestToggle}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ transform: showRequest ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <div className={`gate-request-panel${showRequest ? ' open' : ''}`}>
              <RequestAccessForm
                lang={lang}
                onTokenGranted={(token) => {
                  setShowRequest(false)
                  setTokenVal(token)
                  setInputState('default')
                  setTimeout(() => {
                    const btn = document.querySelector('.token-submit') as HTMLButtonElement
                    btn?.click()
                  }, 300)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NDA Overlay */}
      {showNDA && pendingData && (
        <NDAOverlay
          token={pendingData.token}
          investorData={pendingData}
          onAccept={acceptNDA}
          onDecline={declineNDA}
        />
      )}

      {/* Testing Terms — TESTER tokens only */}
      {showTerms && pendingData && (
        <TestingTermsOverlay
          name={pendingData.name}
          onAccept={acceptTerms}
          onDecline={declineNDA}
        />
      )}

      {/* Co-Founder Welcome Overlay — PERMANENT / STRATEGIC tokens only */}
      {showCoFounder && pendingData && (
        <CoFounderWelcome
          name={pendingData.name}
          onEnter={handleCoFounderEnter}
          projectAccess={pendingData.projectAccess}
          tokenType={pendingData.type}
        />
      )}

      {/* Vault transition overlay */}
      {vaultOpen && <div className="vault-overlay open open-2" aria-hidden="true" />}
    </>
  )
}

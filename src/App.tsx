import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { verifyToken } from '@/services/supabase'
import { useDocumentLang } from '@/i18n'
import { landingFor } from '@/lib/access'
import '@/styles/lang.css'
import '@/styles/chrome.css'

const Gate     = lazy(() => import('@/screens/GateScreen'))
const Home     = lazy(() => import('@/screens/HomeScreen'))
const RogerAI  = lazy(() => import('@/screens/RogerAIScreen'))
const EdgeTack = lazy(() => import('@/screens/EdgeTackScreen'))
const TDC      = lazy(() => import('@/screens/TDCScreen'))
const Qadaa    = lazy(() => import('@/screens/QadaaScreen').then(m => ({ default: m.QadaaScreen })))
const Admin    = lazy(() => import('@/screens/AdminScreen'))
const Tester   = lazy(() => import('@/screens/TesterScreen'))

/* ── Subdomain detection ─────────────────────────────── */
const IS_ADMIN_SUBDOMAIN = window.location.hostname === 'admin.momencrafts.com'

/* ── Check if the stored token has expired ─────────────── */
function isTokenExpired(): boolean {
  const { investorData } = useAppStore.getState()
  if (!investorData?.expires) return false
  return new Date(investorData.expires) < new Date()
}

/* ── AuthGuard — checks existence + expiry + re-validates ─
   `area` keeps the two portals apart: a TESTER token can never render an
   investor route, and an investor token never lands in the tester portal.
   Both read the destination from landingFor() so there is one rule. */
function AuthGuard({ children, area = 'investor' }: { children: React.ReactNode; area?: 'investor' | 'tester' }) {
  const token        = useAppStore((s) => s.token)
  const investorData = useAppStore((s) => s.investorData)
  const clearSession = useAppStore((s) => s.clearSession)
  const validated    = useRef(false)

  // Periodic re-validation against Supabase (once per mount)
  useEffect(() => {
    if (!token || validated.current) return
    validated.current = true

    // Client-side expiry check (instant)
    if (isTokenExpired()) {
      clearSession()
      return
    }

    // Server-side re-validation (async, non-blocking)
    verifyToken(token).then((result) => {
      if (!result.valid) {
        clearSession()
      }
    }).catch(() => {
      // Network error — don't kick out, just log
      console.warn('[AuthGuard] Token re-validation failed (network)')
    })
  }, [token, clearSession])

  // No token → gate
  if (!token) return <Navigate to="/" replace />

  // Wrong portal for this token type → send it to the right one
  const landing = landingFor(investorData?.type)
  if (area === 'investor' && landing === '/tester') return <Navigate to="/tester" replace />
  if (area === 'tester'   && landing !== '/tester') return <Navigate to={landing} replace />

  // Expired → clear and gate
  if (investorData?.expires && new Date(investorData.expires) < new Date()) {
    // Can't call clearSession in render, use effect above — but still redirect
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/* ── GateGuard — also validates expiry before auto-redirect ─ */
function GateGuard({ children }: { children: React.ReactNode }) {
  const token        = useAppStore((s) => s.token)
  const investorData = useAppStore((s) => s.investorData)

  // If token exists but expired, treat as no token (show gate)
  if (token && investorData?.expires && new Date(investorData.expires) < new Date()) {
    // Clear stale session
    useAppStore.getState().clearSession()
    return <>{children}</>
  }

  return token ? <Navigate to={landingFor(investorData?.type)} replace /> : <>{children}</>
}

/* ── Blueprint splash — the drawing sheet, drawn on every route ──
   Shown while a lazy route loads and while /admin redirects, so the
   first paint is the studio's sheet rather than a black flash. */
const CUBE = 'M20 6 L34 14 L34 26 L20 34 L6 26 L6 14 Z'
const CUBE_LINES = 'M20 6 v28 M6 14 L34 26 M34 14 L6 26'

function BlueprintSplash({ label }: { label: string }) {
  return (
    <div className="bp-splash" role="status" aria-live="polite">
      <div className="bp-splash__inner">
        <svg className="bp-splash__cube" width="52" height="52" viewBox="0 0 40 40" aria-hidden="true">
          <path d={CUBE} />
          <path d={CUBE_LINES} />
        </svg>
        <div className="bp-splash__label">
          <span className="bp-splash__bar" />
          <span>{label}</span>
          <span className="bp-splash__bar" />
        </div>
      </div>
    </div>
  )
}

/* ── Redirect helper — sends /admin visitors to the subdomain ── */
function AdminRedirect() {
  useEffect(() => {
    window.location.href = 'https://admin.momencrafts.com'
  }, [])
  return <BlueprintSplash label="Redirecting to admin" />
}

const Loader = () => <BlueprintSplash label="Loading" />

export default function App() {
  /* Keeps <html lang>/<html dir> aligned with the active language.
     Defaults to English (ltr); flips to Arabic (rtl) via the LangToggle. */
  useDocumentLang()

  /* ── admin.momencrafts.com → render Admin at root ── */
  if (IS_ADMIN_SUBDOMAIN) {
    return (
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="*" element={<Admin />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    )
  }

  /* ── Main site (momencrafts.com) ── */
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<GateGuard><Gate /></GateGuard>} />
          <Route path="/home"     element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/tester"   element={<AuthGuard area="tester"><Tester /></AuthGuard>} />
          <Route path="/rogerai"  element={<AuthGuard><RogerAI /></AuthGuard>} />
          <Route path="/edgetack" element={<AuthGuard><EdgeTack /></AuthGuard>} />
          <Route path="/tdc"      element={<AuthGuard><TDC /></AuthGuard>} />
          <Route path="/qadaa"    element={<AuthGuard><Qadaa /></AuthGuard>} />
          {/* /admin on main site → redirect to admin subdomain */}
          <Route path="/admin"    element={<AdminRedirect />} />
          {/* Legacy redirects */}
          <Route path="/gate" element={<Navigate to="/" replace />} />
          <Route path="/room" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

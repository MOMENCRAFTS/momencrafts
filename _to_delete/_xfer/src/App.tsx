import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { verifyToken } from '@/services/supabase'
import { useDocumentLang } from '@/i18n'
import '@/styles/lang.css'

const Gate     = lazy(() => import('@/screens/GateScreen'))
const Home     = lazy(() => import('@/screens/HomeScreen'))
const RogerAI  = lazy(() => import('@/screens/RogerAIScreen'))
const EdgeTack = lazy(() => import('@/screens/EdgeTackScreen'))
const TDC      = lazy(() => import('@/screens/TDCScreen'))
const Qadaa    = lazy(() => import('@/screens/QadaaScreen').then(m => ({ default: m.QadaaScreen })))
const Admin    = lazy(() => import('@/screens/AdminScreen'))

/* ── Subdomain detection ─────────────────────────────── */
const IS_ADMIN_SUBDOMAIN = window.location.hostname === 'admin.momencrafts.com'

/* ── Check if the stored token has expired ─────────────── */
function isTokenExpired(): boolean {
  const { investorData } = useAppStore.getState()
  if (!investorData?.expires) return false
  return new Date(investorData.expires) < new Date()
}

/* ── AuthGuard — checks existence + expiry + re-validates ─ */
function AuthGuard({ children }: { children: React.ReactNode }) {
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

  return token ? <Navigate to="/home" replace /> : <>{children}</>
}

/* ── Redirect helper — sends /admin visitors to the subdomain ── */
function AdminRedirect() {
  useEffect(() => {
    window.location.href = 'https://admin.momencrafts.com'
  }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#0E4372', color:'#E2B96B',
      fontFamily:'JetBrains Mono, monospace', fontSize:'.75rem', letterSpacing:'.2em' }}>
      REDIRECTING TO ADMIN…
    </div>
  )
}

const Loader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    minHeight:'100vh', background:'#0C0A09', color:'#F59E0B',
    fontFamily:'JetBrains Mono, monospace', fontSize:'.75rem', letterSpacing:'.2em' }}>
    LOADING…
  </div>
)

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

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'

const Gate     = lazy(() => import('@/screens/GateScreen'))
const Home     = lazy(() => import('@/screens/HomeScreen'))
const RogerAI  = lazy(() => import('@/screens/RogerAIScreen'))
const EdgeTack = lazy(() => import('@/screens/EdgeTackScreen'))

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token)
  const hasSession = token && sessionStorage.getItem('mcr_investor') === '1'
  return hasSession ? <>{children}</> : <Navigate to="/" replace />
}

function GateGuard({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token)
  const hasSession = token && sessionStorage.getItem('mcr_investor') === '1'
  return hasSession ? <Navigate to="/home" replace /> : <>{children}</>
}

const Loader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    minHeight:'100vh', background:'#0C0A09', color:'#F59E0B',
    fontFamily:'JetBrains Mono, monospace', fontSize:'.75rem', letterSpacing:'.2em' }}>
    LOADING…
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<GateGuard><Gate /></GateGuard>} />
          <Route path="/home" element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/rogerai" element={<RogerAI />} />
          <Route path="/edgetack" element={<EdgeTack />} />
          {/* Legacy redirects */}
          <Route path="/gate" element={<Navigate to="/" replace />} />
          <Route path="/room" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

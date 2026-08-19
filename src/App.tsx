import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { useProfile } from './hooks/useAppData'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Subjects from './pages/Subjects'
import Rankings from './pages/Rankings'
import Progress from './pages/Progress'
import Settings from './pages/Settings'

// These two pages pull in pdf.js / tesseract.js / xlsx (multiple MB combined) —
// keep them out of the main bundle entirely, not just out of their parser modules.
const ClassSetup = lazy(() => import('./pages/ClassSetup'))
const UploadMarks = lazy(() => import('./pages/UploadMarks'))

export default function App() {
  const profile = useProfile()
  const location = useLocation()

  // Still loading from IndexedDB.
  if (profile === undefined) return null

  const needsOnboarding = !profile && location.pathname !== '/onboarding'
  if (needsOnboarding) return <Navigate to="/onboarding" replace />

  // Note: needsClass already implies profile is truthy, i.e. onboarding is
  // done — so unlike needsOnboarding above, /onboarding is deliberately NOT
  // excluded here. That makes routing self-healing if navigate() from the
  // onboarding form ever fails to stick (e.g. racing a re-render from the
  // same write that created the profile): the very next render sees a
  // profile without an active class and correctly redirects onward, rather
  // than leaving the app stuck showing the onboarding form indefinitely.
  const needsClass = profile && !profile.activeClassId && !['/class-setup', '/settings'].includes(location.pathname)
  if (needsClass) return <Navigate to="/class-setup" replace />

  if (location.pathname === '/onboarding') {
    return (
      <div className="min-h-screen bg-paper px-4 max-w-2xl mx-auto">
        <Onboarding />
      </div>
    )
  }

  return (
    <Layout>
      <Suspense fallback={<p className="text-ink-dim pt-4">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/class-setup" element={<ClassSetup />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/upload" element={<UploadMarks key={location.search} />} />
          <Route path="/rankings" element={<Rankings key={location.search} />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LiveAttendance from './pages/LiveAttendance'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import StudentProfile from './pages/StudentProfile'
import Layout from './components/Layout'
import { Toaster } from './components/ui/toaster'
import { ErrorBoundary } from './components/ErrorBoundary'
import AnimatedPage from './components/AnimatedPage'

function AppRoutes() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <AnimatedPage>
            <LiveAttendance />
          </AnimatedPage>
        } />
        <Route path="/dashboard" element={
          <AnimatedPage>
            <Dashboard />
          </AnimatedPage>
        } />
        <Route path="/upload" element={
          <AnimatedPage>
            <UploadPage />
          </AnimatedPage>
        } />
        <Route path="/student/:studentId" element={
          <AnimatedPage>
            <StudentProfile />
          </AnimatedPage>
        } />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <AppRoutes />
          <Toaster />
        </Layout>
      </Router>
    </ErrorBoundary>
  )
}

export default App


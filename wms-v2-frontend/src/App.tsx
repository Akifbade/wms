import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getToken } from './api/client'
import { Layout } from './components/layout/Layout'

// Lazy load pages
import Dashboard from './pages/Dashboard/Dashboard'
import Shipments from './pages/Shipments/Shipments'
import Racks from './pages/Racks/Racks'
import Scanner from './pages/Scanner/Scanner'
import Materials from './pages/Materials/Materials'
import MovingJobs from './pages/MovingJobs/MovingJobs'
import Finance from './pages/Finance/Finance'
import Companies from './pages/Companies/Companies'
import Invoices from './pages/Invoices/Invoices'
import Expenses from './pages/Expenses/Expenses'
import Settings from './pages/Settings/Settings'
import Admin from './pages/Admin/Admin'
import Backups from './pages/Backups/Backups'

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { authAPI } = await import('./api/client')
      await authAPI.login(email, password)
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white">QGO WMS v2</h1>
          <p className="text-gray-400 text-sm mt-1">Warehouse Management System</p>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Enter your email" required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Enter password" required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AppRoutes() {
  const [token, setToken] = useState(getToken())

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={() => setToken(getToken())} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/shipments" element={<Layout><Shipments /></Layout>} />
        <Route path="/racks" element={<Layout><Racks /></Layout>} />
        <Route path="/scanner" element={<Layout><Scanner /></Layout>} />
        <Route path="/materials" element={<Layout><Materials /></Layout>} />
        <Route path="/moving-jobs" element={<Layout><MovingJobs /></Layout>} />
        <Route path="/finance" element={<Layout><Finance /></Layout>} />
        <Route path="/companies" element={<Layout><Companies /></Layout>} />
        <Route path="/invoices" element={<Layout><Invoices /></Layout>} />
        <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/admin" element={<Layout><Admin /></Layout>} />
        <Route path="/backups" element={<Layout><Backups /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

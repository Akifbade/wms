import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { 
  Package, Ruler, DollarSign, 
  Menu, X,
  Warehouse, Truck, Settings, Users, BarChart3,
  ClipboardList, ScanLine, LogOut, 
} from 'lucide-react'
import { getToken, login } from './api/client'
import Dashboard from './pages/Dashboard'
import Shipments from './pages/Shipments'
import Racks from './pages/Racks'
import Materials from './pages/Materials'
import Finance from './pages/Finance'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'

// Sidebar component
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname.slice(1) || 'dashboard'

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'shipments', label: 'Shipments', icon: Package },
    { id: 'racks', label: 'Racks', icon: Ruler },
    { id: 'materials', label: 'Materials', icon: ClipboardList },
    { id: 'scanner', label: 'Scanner', icon: ScanLine },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'jobs', label: 'Moving Jobs', icon: Truck },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-30 flex flex-col ${
      collapsed ? 'w-16' : 'w-60'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Warehouse className="w-7 h-7 text-indigo-500" />
            <span className="font-bold text-lg">QGO WMS</span>
          </div>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active === item.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <LogOut className="w-3.5 h-3.5" />
            <span>WMS v2.0 • QGO Cargo</span>
          </div>
        )}
      </div>
    </aside>
  )
}

// Login Page
function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
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
          <Warehouse className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
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

// Layout wrapper
function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`transition-all duration-300 min-h-screen ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [isAuth] = useState(!!getToken())

  if (!isAuth) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={
            <LoginPage />
          } />
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
        <Route path="/materials" element={<Layout><Materials /></Layout>} />
        <Route path="/finance" element={<Layout><Finance /></Layout>} />
        <Route path="/customers" element={<Layout><Customers /></Layout>} />
        <Route path="/jobs" element={<Layout><Jobs /></Layout>} />
        <Route path="/scanner" element={<Layout><div className="text-center py-20 text-gray-400">Scanner — Coming Soon</div></Layout>} />
        <Route path="/settings" element={<Layout><div className="text-center py-20 text-gray-400">Settings — Coming Soon</div></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

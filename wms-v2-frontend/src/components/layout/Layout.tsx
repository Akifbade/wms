import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Ruler, ClipboardList, ScanLine,
  DollarSign, Truck, Users, Settings, LogOut, Menu, X,
  Warehouse, Building2, FileText, Receipt, Shield, HardDrive
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'shipments', label: 'Shipments', icon: Package },
  { id: 'racks', label: 'Racks', icon: Ruler },
  { id: 'scanner', label: 'Scanner', icon: ScanLine },
  { id: 'materials', label: 'Materials', icon: ClipboardList },
  { id: 'moving-jobs', label: 'Moving Jobs', icon: Truck },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'expenses', label: 'Expenses', icon: FileText },
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'backups', label: 'Backups', icon: HardDrive },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const active = location.pathname.slice(1) || 'dashboard'

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
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800 space-y-2">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        {!collapsed && (
          <div className="text-xs text-gray-600 px-3 text-center">WMS v2.0 • QGO Cargo</div>
        )}
      </div>
    </aside>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="ml-60 min-h-screen transition-all duration-300">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

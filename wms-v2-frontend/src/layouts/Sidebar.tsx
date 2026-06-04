import { type ReactNode } from 'react'
import { Warehouse } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { id: '/', label: 'Dashboard', icon: 'BarChart3' },
  { id: '/shipments', label: 'Shipments', icon: 'Package' },
  { id: '/racks', label: 'Racks', icon: 'Ruler' },
  { id: '/materials', label: 'Materials', icon: 'ClipboardList' },
  { id: '/scanner', label: 'Scanner', icon: 'ScanLine' },
  { id: '/finance', label: 'Finance', icon: 'DollarSign' },
  { id: '/jobs', label: 'Moving Jobs', icon: 'Truck' },
  { id: '/customers', label: 'Customers', icon: 'Users' },
  { id: '/settings', label: 'Settings', icon: 'Settings' },
]

const ICON_MAP: Record<string, ReactNode> = {
  BarChart3: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 17V9"/><path d="M12 17V7"/><path d="M17 17v-4"/></svg>,
  Package: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12v5.5"/><path d="M19 12v5.5"/><path d="M3 11l9-5 9 5"/><path d="M3 11v5.5"/><path d="M5 17.5L12 22l7-4.5"/></svg>,
  Ruler: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17a1 1 0 01-1-1v-3"/><path d="M13 16a1 1 0 001-1v-3"/><path d="M9 10v-2"/><circle cx="12" cy="5" r="0.5"/><path d="M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6"/></svg>,
  ClipboardList: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
  ScanLine: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><path d="M7 12h10"/></svg>,
  DollarSign: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Truck: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18a2 2 0 100-4 2 2 0 000 4z"/><path d="M19 18a2 2 0 100-4 2 2 0 000 4z"/><path d="M5 14V6h10l5 5v3h-4"/><path d="M9 8v4"/></svg>,
  Users: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Settings: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c-1.1 0-2-.9-2-2v-1.5c0-.4-.2-.8-.5-1l-1.3-.8c-.4-.2-.9-.2-1.3 0l-1.1.6c-.9.5-2.1.2-2.6-.7l-.6-1c-.5-.9-.2-2.1.7-2.6l1.1-.6c.4-.3.6-.7.6-1.2v-1.4c0-.5-.2-1-.6-1.2l-1.1-.6c-.9-.5-1.2-1.7-.7-2.6l.6-1c.5-.9 1.7-1.2 2.6-.7l1.1.6c.4.2.9.2 1.3 0l1.3-.8c.3-.2.5-.6.5-1V4c0-1.1.9-2 2-2s2 .9 2 2v1.5c0 .4.2.8.5 1l1.3.8c.4.2.9.2 1.3 0l1.1-.6c.9-.5 2.1-.2 2.6.7l.6 1c.5.9.2 2.1-.7 2.6l-1.1.6c-.4.2-.6.7-.6 1.2v1.4c0 .5.2 1 .6 1.2l1.1.6c.9.5 1.2 1.7.7 2.6l-.6 1c-.5.9-1.7 1.2-2.6.7l-1.1-.6c-.4-.2-.9-.2-1.3 0l-1.3.8c-.3.2-.5.6-.5 1V20c0 1.1-.9 2-2 2z"/><circle cx="12" cy="12" r="3"/></svg>,
}

function Icon({ name }: { name: string }) {
  return <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{ICON_MAP[name]}</span>
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()
  const activePath = location.pathname

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-30 flex flex-col ${
      collapsed ? 'w-16' : 'w-60'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800 min-h-[60px]">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-indigo-400" />
            <span className="font-bold text-lg">QGO WMS</span>
          </Link>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></> : <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>}
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = activePath === item.id
          return (
            <Link
              key={item.id}
              to={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon name={item.icon} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        {!collapsed && (
          <div className="text-xs text-gray-500 text-center">
            WMS v2.0 • QGO Cargo
          </div>
        )}
      </div>
    </aside>
  )
}

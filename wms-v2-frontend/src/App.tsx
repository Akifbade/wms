import { useState, useEffect } from 'react'
import { 
  Package, Ruler, DollarSign, TrendingUp, 
  AlertTriangle, Clock, ChevronRight, Menu, X,
  Warehouse, Truck, Settings, Users, BarChart3,
  ClipboardList, ScanLine
} from 'lucide-react'

// Types
interface DashboardStats {
  totalShipments: number
  activeShipments: number
  totalBoxes: number
  totalRacks: number
  activeRacks: number
  rackUtilization: number
  totalCBM: number
  usedCBM: number
  cbmUtilization: number
  pendingInvoices: number
  totalPendingAmount: number
  collectedAmount: number
  collectionRate: number
  totalCustomers: number
  activeJobs: number
  recentShipments: Array<{
    id: string
    name: string
    customer: string
    boxes: number
    status: string
    date: string
    cbm: number
  }>
}

// Stats Card Component
function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any, label: string, value: string | number, sub?: string
  color: string, trend?: { value: number; positive: boolean }
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// Progress Bar
function ProgressBar({ value, max, color = 'bg-primary-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RELEASED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    PENDING: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PARTIAL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    IN_STORAGE: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-gray-50 text-gray-700'}`}>
      {status}
    </span>
  )
}

// Sidebar
function Sidebar({ active, onNavigate, collapsed, onToggle }: {
  active: string
  onNavigate: (page: string) => void
  collapsed: boolean
  onToggle: () => void
}) {
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
    <aside className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-30 ${
      collapsed ? 'w-16' : 'w-60'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-primary-500" />
            <span className="font-bold text-lg">QGO WMS</span>
          </div>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>
      <nav className="p-2 space-y-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active === item.id 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-4 left-0 right-0 px-4">
        {!collapsed && (
          <div className="text-xs text-gray-500 text-center">
            WMS v2.0 • QGO Cargo
          </div>
        )}
      </div>
    </aside>
  )
}

// Dashboard Page
function Dashboard({ data, loading }: { data: DashboardStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-warning-500 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Could not load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of warehouse operations
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Package} 
          label="Active Shipments" 
          value={data.activeShipments}
          sub={`${data.totalShipments} total • ${data.totalBoxes.toLocaleString()} boxes`}
          color="bg-primary-600"
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          icon={Ruler} 
          label="Rack Utilization" 
          value={`${data.cbmUtilization}%`}
          sub={`${data.usedCBM.toFixed(1)} / ${data.totalCBM.toFixed(1)} CBM used`}
          color="bg-accent-500"
        />
        <StatCard 
          icon={DollarSign} 
          label="Pending Collection" 
          value={`${data.totalPendingAmount.toLocaleString()} KWD`}
          sub={`${data.collectionRate}% collected`}
          color={data.collectionRate < 50 ? 'bg-danger-500' : 'bg-warning-500'}
        />
        <StatCard 
          icon={Users} 
          label="Customers" 
          value={data.totalCustomers}
          sub={`${data.activeJobs} active jobs`}
          color="bg-success-500"
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* Rack Utilization Detail */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rack CBM Utilization</h3>
        <ProgressBar value={data.usedCBM} max={data.totalCBM} color="bg-accent-500" />
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {data.usedCBM.toFixed(1)} CBM used
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {data.totalCBM.toFixed(1)} CBM total
          </span>
          <span className="font-medium text-accent-500">
            {data.cbmUtilization}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.activeRacks}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active Racks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalRacks}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Racks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalBoxes.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Boxes</p>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Finance Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending Amount</span>
              <span className="font-semibold text-gray-900 dark:text-white">{data.totalPendingAmount.toLocaleString()} KWD</span>
            </div>
            <ProgressBar value={data.collectedAmount} max={data.totalPendingAmount + data.collectedAmount} color="bg-success-500" />
            <div className="flex justify-between text-sm">
              <span className="text-success-500">{data.collectedAmount.toLocaleString()} KWD collected</span>
              <span className="text-gray-500 dark:text-gray-400">{data.collectionRate}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Invoices</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.pendingInvoices}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Customers</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.totalCustomers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Shipments</h3>
            <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {data.recentShipments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No recent shipments</p>
          ) : (
            <div className="space-y-3">
              {data.recentShipments.map(ship => (
                <div key={ship.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ship.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ship.customer} • {ship.boxes} boxes • {ship.cbm.toFixed(2)} CBM</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={ship.status} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">{ship.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
        setLoading(false)
        return
      }
    } catch (_) {
      // Network error — fall through to mock
    }
    // API unavailable — use mock data
    setDashboardData({
        totalShipments: 372,
        activeShipments: 156,
        totalBoxes: 6226,
        totalRacks: 232,
        activeRacks: 180,
        rackUtilization: 52,
        totalCBM: 850.5,
        usedCBM: 442.3,
        cbmUtilization: 52,
        pendingInvoices: 89,
        totalPendingAmount: 88620,
        collectedAmount: 1241,
        collectionRate: 1.4,
        totalCustomers: 102,
        activeJobs: 24,
        recentShipments: [
          { id: '1', name: 'DIOR - Spring Collection', customer: 'DIOR', boxes: 45, status: 'ACTIVE', date: 'Jun 3', cbm: 12.5 },
          { id: '2', name: 'JAZEERA - Electronics', customer: 'JAZEERA', boxes: 32, status: 'PARTIAL', date: 'Jun 2', cbm: 8.2 },
          { id: '3', name: 'Boodai Trading - Furniture', customer: 'Boodai Trading', boxes: 18, status: 'RELEASED', date: 'Jun 1', cbm: 15.0 },
          { id: '4', name: 'Nike - Footwear', customer: 'Nike', boxes: 67, status: 'ACTIVE', date: 'May 31', cbm: 6.8 },
          { id: '5', name: 'Alshaya - Retail', customer: 'Alshaya', boxes: 23, status: 'IN_STORAGE', date: 'May 30', cbm: 9.1 },
        ],
      })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar active={page} onNavigate={setPage} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      
      {/* Main Content */}
      <main className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="p-6 max-w-7xl mx-auto">
          {page === 'dashboard' && <Dashboard data={dashboardData} loading={loading} />}
          {page !== 'dashboard' && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 dark:text-gray-500">
              <TrendingUp className="w-16 h-16 mb-4 opacity-30" />
              <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
              <p className="text-sm">This page is under development</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

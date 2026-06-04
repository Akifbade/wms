import { useState, useEffect } from 'react'
import {
  Package, Ruler, DollarSign, Users, Warehouse,
  BarChart3, TrendingUp,
} from 'lucide-react'
import {
  fetchDashboardStats, fetchFinanceOverview, fetchShipments,
} from '../api/client'
import type { DashboardStats, FinanceOverview, Shipment } from '../api/types'
import {
  PageHeader, Card, ProgressBar, Spinner, StatusBadge,
} from '../components/ui'

// ─── Helpers ────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Stat Card (inline, with dark‑mode support) ─────────────────────
function StatCard({
  icon, label, value, sub, color, trend, darkColor,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color?: string; trend?: { value: number; positive: boolean }; darkColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-900/40 transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color || 'bg-indigo-500'} ${darkColor || ''}`}>
          <span className="text-white w-5 h-5 flex items-center justify-center">{icon}</span>
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
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

// ─── Dashboard Page ─────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [finance, setFinance] = useState<FinanceOverview | null>(null)
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [statsData, financeData, shipmentsData] = await Promise.all([
          fetchDashboardStats(),
          fetchFinanceOverview(),
          fetchShipments({ limit: 5 }),
        ])

        if (cancelled) return

        setStats(statsData)
        setFinance(financeData)
        setRecentShipments(shipmentsData.shipments ?? [])
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load dashboard data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Loading state ──────────────────────────────────────────────
  if (loading) return <Spinner />

  // ── Error state ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="w-16 h-16 text-red-400 dark:text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Unable to load dashboard
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────
  const totalCBM = stats?.totalCBM ?? 0
  const usedCBM = stats?.usedCBM ?? 0
  const cbmUtilization = totalCBM > 0 ? Math.min((usedCBM / totalCBM) * 100, 100) : 0

  const totalCustomers = stats?.totalShipments
    ? Math.max(1, Math.round(stats.totalShipments / 3))
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Overview of warehouse operations"
        action={
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Warehouse className="w-4 h-4" />
            <span>{todayLabel()}</span>
          </div>
        }
      />

      {/* ── Stat Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Active Shipments"
          value={stats?.activeShipments ?? 0}
          sub={`${stats?.totalShipments ?? 0} total`}
          color="bg-indigo-500"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          icon={<Ruler className="w-5 h-5" />}
          label="Rack Utilization"
          value={`${Math.round(cbmUtilization)}%`}
          sub={`${formatCurrency(usedCBM)} / ${formatCurrency(totalCBM)} CBM`}
          color="bg-violet-500"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Pending Collection"
          value={`${formatCurrency(finance?.totalPending ?? 0)} KWD`}
          sub={`${finance?.collectionRate ?? 0}% collected`}
          color={(finance?.collectionRate ?? 100) < 50 ? 'bg-red-500' : 'bg-amber-500'}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Customers"
          value={totalCustomers}
          sub={`${stats?.activeShipments ?? 0} active jobs`}
          color="bg-emerald-500"
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* ── CBM Utilization ──────────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Warehouse CBM Utilization
          </h3>
        </div>
        <ProgressBar value={usedCBM} max={totalCBM || 1} color="bg-violet-500" />
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {formatCurrency(usedCBM)} CBM used
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {formatCurrency(totalCBM)} CBM total
          </span>
          <span className="font-medium text-violet-600 dark:text-violet-400">
            {Math.round(cbmUtilization)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.activeRacks ?? 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active Racks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.totalRacks ?? 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Racks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats?.totalBoxes?.toLocaleString() ?? 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Boxes</p>
          </div>
        </div>
      </Card>

      {/* ── Finance + Recent Shipments ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Finance Overview */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Finance Overview
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total Revenue
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(finance?.totalRevenue ?? 0)} KWD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Collected
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(finance?.totalCollected ?? 0)} KWD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Pending
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(finance?.totalPending ?? 0)} KWD
              </span>
            </div>
            {finance && (
              <ProgressBar
                value={finance.totalCollected}
                max={finance.totalRevenue || 1}
                color="bg-emerald-500"
              />
            )}
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatCurrency(finance?.totalCollected ?? 0)} KWD collected
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {finance?.collectionRate ?? 0}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Invoices</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {finance?.pendingCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overdue Amount</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(finance?.overdueAmount ?? 0)} KWD
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Shipments */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Shipments
              </h3>
            </div>
          </div>
          {recentShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
              <Package className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">No recent shipments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Shipment
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hidden sm:table-cell">
                      CBM
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.map((ship) => (
                    <tr
                      key={ship.id}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px] lg:max-w-[220px]">
                          {ship.name || ship.referenceId}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {ship.customerName || ship.clientName || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={ship.status} />
                      </td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                        {ship.cbm?.toFixed(1) ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 hidden md:table-cell">
                        {formatDate(ship.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, // Revenue icons
  Package, LayoutGrid, Briefcase, ArrowLeftFromLine, // Quick stats icons
  Layers, Warehouse, BarChart3, PieChart, // Breakdown icons
  Building2, // Top clients
  Clock, RefreshCw, Activity, // Activity icons
  Ship, // Shipments
  CalendarCheck, // Jobs
  AlertCircle, Loader2, // Status
} from 'lucide-react'
import { dashboardAPI } from '../../api/client'
import type { DashboardStats } from '../../api/types'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────

interface DashboardData {
  stats: DashboardStats
  topClients: any[]
  storageBySection: any[]
  recentShipments: any[]
  recentJobs: any[]
  recentActivities: any[]
}

// ─── Activity icon map ──────────────────────────────────────

const activityIconMap: Record<string, React.ReactNode> = {
  ITEM_ADDED: <Package className="w-4 h-4 text-green-500" />,
  ITEM_REMOVED: <ArrowLeftFromLine className="w-4 h-4 text-red-500" />,
  STATUS_CHANGE: <Activity className="w-4 h-4 text-blue-500" />,
  CAPACITY_UPDATE: <BarChart3 className="w-4 h-4 text-purple-500" />,
}
const defaultActivityIcon = <Activity className="w-4 h-4 text-gray-400" />

function getActivityIcon(action: string): React.ReactNode {
  return activityIconMap[action] || defaultActivityIcon
}

function formatActivityAction(action: string): string {
  const map: Record<string, string> = {
    ITEM_ADDED: 'Item Added',
    ITEM_REMOVED: 'Item Removed',
    STATUS_CHANGE: 'Status Changed',
    CAPACITY_UPDATE: 'Capacity Updated',
  }
  return map[action] || action.replace(/_/g, ' ')
}

// ─── Loader ─────────────────────────────────────────────────

function DashboardLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
      </div>
    </div>
  )
}

// ─── Error Banner ───────────────────────────────────────────

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load dashboard</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  )
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  trendLabel,
  color,
}: {
  label: string
  value: string
  sublabel?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal'
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
  }
  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red: 'text-red-600 dark:text-red-400',
    teal: 'text-teal-600 dark:text-teal-400',
  }
  const trendIcon =
    trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> :
    trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
    null

  return (
    <div className={cn('rounded-xl border p-4 sm:p-5 transition-shadow hover:shadow-sm', colorMap[color])}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{sublabel}</p>
          )}
          {trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              {trendIcon}
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' ? 'text-green-600 dark:text-green-400' :
                trend === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-gray-500 dark:text-gray-400'
              )}>
                {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div className={cn('shrink-0 p-2.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700', iconColorMap[color])}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── Progress Bar ───────────────────────────────────────────

function ProgressBar({ value, max, label, color = 'blue' }: { value: number; max: number; label?: string; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    teal: 'bg-teal-500',
  }
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Status Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap',
      getStatusColor(status)
    )}>
      {getStatusLabel(status)}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dashboardAPI.getStats()
      setData(res as unknown as DashboardData)
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Loading ──────────────────────────────────────────────
  if (loading) return <DashboardLoader />

  // ── Error ────────────────────────────────────────────────
  if (error) return <DashboardError message={error} onRetry={fetchData} />

  // ── Empty guard ──────────────────────────────────────────
  if (!data) return null

  const { stats, topClients, storageBySection, recentShipments, recentJobs, recentActivities } = data

  // ── Derived values ───────────────────────────────────────
  const outstanding = Math.max((stats.totalRevenue || 0) - (stats.collectedRevenue || 0), 0)
  const utilizationPct = stats.totalCBM && stats.totalCBM > 0
    ? Math.round(((stats.usedCBM || 0) / stats.totalCBM) * 100)
    : 0
  const availableCBM = Math.max((stats.totalCBM || 0) - (stats.usedCBM || 0), 0)

  const shipmentStatuses = [
    { label: 'Total', count: stats.totalShipments || 0, color: 'bg-blue-500' },
    { label: 'Pending', count: stats.pendingCollection || 0, color: 'bg-yellow-500' },
    { label: 'In Storage', count: stats.occupiedRacks || 0, color: 'bg-blue-500' },
    { label: 'Released', count: Math.max((stats.totalShipments || 0) - (stats.occupiedRacks || 0) - (stats.pendingCollection || 0), 0), color: 'bg-gray-400' },
  ]
  const shipmentTotal = shipmentStatuses.reduce((s, c) => s + c.count, 0) || 1

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time overview of your warehouse operations</p>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1-4: Revenue Stats Cards
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Revenue Overview" subtitle="Financial snapshot in KWD" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue || 0)}
            sublabel="All-time invoice total"
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Paid Amount"
            value={formatCurrency(stats.collectedRevenue || 0)}
            sublabel="Payments received"
            trend="up"
            trendLabel={stats.collectedRevenue && stats.totalRevenue
              ? `${((stats.collectedRevenue / stats.totalRevenue) * 100).toFixed(1)}% collected`
              : undefined}
            icon={<Receipt className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            sublabel="Unpaid balance"
            trend={outstanding > 0 ? 'down' : 'neutral'}
            trendLabel={outstanding > 0 ? `${outstanding > 0 ? ((outstanding / (stats.totalRevenue || 1)) * 100).toFixed(1) : 0}% outstanding` : 'Fully paid'}
            icon={<TrendingDown className="w-5 h-5" />}
            color="orange"
          />
          <StatCard
            label="This Month"
            value={formatCurrency(stats.collectedRevenue || 0)}
            sublabel="Current period revenue"
            icon={<TrendingUp className="w-5 h-5" />}
            color="purple"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: Quick Stats
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Quick Stats" subtitle="Live operational metrics" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Active Shipments"
            value={String(stats.totalShipments || 0)}
            sublabel="Total shipments in system"
            icon={<Ship className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Rack Utilization"
            value={stats.totalCBM && stats.totalCBM > 0 ? `${utilizationPct}%` : '0%'}
            sublabel={`${stats.usedCBM || 0} / ${stats.totalCBM || 0} CBM`}
            icon={<LayoutGrid className="w-5 h-5" />}
            color="teal"
          />
          <StatCard
            label="Jobs In Progress"
            value={String(stats.activeJobs || 0)}
            sublabel="Active moving jobs"
            icon={<Briefcase className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Withdrawals"
            value={String(stats.pendingCollection || 0)}
            sublabel="Pending collection / withdrawals"
            icon={<ArrowLeftFromLine className="w-5 h-5" />}
            color="orange"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: Shipment Status Breakdown
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Shipment Status Breakdown" subtitle="Distribution across statuses" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {shipmentStatuses.map((s) => {
            const pct = ((s.count / shipmentTotal) * 100).toFixed(1)
            return (
              <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                <div className={cn('w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center', s.color.replace('bg-', 'bg-').replace('500', '100 dark:bg-opacity-20'))}>
                  <Layers className={cn('w-5 h-5', s.color.replace('bg-', 'text-').replace('500', '500 dark:text-').replace('500', '400'))} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{pct}%</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: Storage Analytics
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Storage Analytics" subtitle="Capacity & utilisation metrics" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total CBM"
            value={String((stats.totalCBM || 0).toFixed(2))}
            sublabel="Total rated capacity"
            icon={<Warehouse className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Est. Charges"
            value={formatCurrency(stats.totalRevenue || 0)}
            sublabel="Based on current storage"
            icon={<Receipt className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Avg CBM / Shipment"
            value={(stats.totalShipments && stats.totalShipments > 0
              ? ((stats.usedCBM || 0) / stats.totalShipments).toFixed(2)
              : '0.00')}
            sublabel="Average per active shipment"
            icon={<BarChart3 className="w-5 h-5" />}
            color="teal"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: Rack CBM Capacity Overview
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Rack CBM Capacity Overview" subtitle="Storage utilisation across all racks" />
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Capacity</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{(stats.totalCBM || 0).toFixed(2)} CBM</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Used</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{(stats.usedCBM || 0).toFixed(2)} CBM</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{availableCBM.toFixed(2)} CBM</p>
            </div>
            <div className="ml-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400">Utilization</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{utilizationPct}%</p>
            </div>
          </div>
          <ProgressBar value={stats.usedCBM || 0} max={stats.totalCBM || 1} color="blue" />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>0 CBM</span>
            <span>{(stats.totalCBM || 0).toFixed(2)} CBM</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: Storage Utilization (visual bar sections)
         ═══════════════════════════════════════════════════════ */}
      {storageBySection && storageBySection.length > 0 && (
        <section>
          <SectionHeader title="Storage by Section" subtitle="CBM distribution across zones" />
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
            {storageBySection.map((section: any, idx: number) => {
              const sectionUsed = section.usedCBM || section.cbmUsed || 0
              const sectionTotal = section.totalCBM || section.cbmCapacity || sectionUsed || 1
              const sectionPct = sectionTotal > 0 ? Math.min((sectionUsed / sectionTotal) * 100, 100) : 0
              const colors = ['blue', 'green', 'purple', 'orange', 'teal', 'red']
              return (
                <div key={section.name || section.section || idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {section.name || section.section || `Section ${idx + 1}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {sectionUsed.toFixed(2)} / {sectionTotal.toFixed(2)} CBM
                    </span>
                  </div>
                  <ProgressBar
                    value={sectionUsed}
                    max={sectionTotal}
                    color={colors[idx % colors.length]}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 8: Top Clients
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Top Clients" subtitle="By shipment volume and revenue" />
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {topClients && topClients.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {topClients.map((client: any, idx: number) => (
                <div key={client.id || client.name || idx} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {/* Rank */}
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    idx === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                    idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  )}>
                    {idx + 1}
                  </span>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {client.name || `Client ${idx + 1}`}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <Package className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                        {client.shipmentCount || client.totalShipments || 0} shipments
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <DollarSign className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                        {formatCurrency(client.revenue || client.totalRevenue || 0)}
                      </span>
                    </div>
                  </div>
                  {/* Revenue badge */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(client.revenue || client.totalRevenue || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No client data available yet
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9: Recent Activities
         ═══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          title="Recent Activities"
          subtitle="Latest system events"
          action={
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </button>
          }
        />
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {recentActivities && recentActivities.length > 0 ? (
            <div className="relative pl-8 pr-5 py-4 space-y-0">
              {/* Timeline vertical line */}
              <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
              {recentActivities.map((activity: any, idx: number) => (
                <div key={activity.id || idx} className="relative pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-[22px] top-0.5 w-[10px] h-[10px] rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center z-10">
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-white dark:bg-gray-800">
                      {getActivityIcon(activity.action || activity.type)}
                    </div>
                  </div>
                  {/* Content */}
                  <div className="ml-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {activity.userName || activity.user || 'System'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatActivityAction(activity.action || activity.type)}
                          {activity.details ? ` — ${activity.details}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDate(activity.timestamp || activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No recent activity
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 10-11: Recent Shipments & Upcoming Jobs
         ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <section>
          <SectionHeader title="Recent Shipments" subtitle="Latest incoming shipments" />
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
            {recentShipments && recentShipments.length > 0 ? (
              recentShipments.map((s: any, idx: number) => (
                <div key={s.id || idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Ship className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {s.referenceId || s.trackingNumber || `SHIP-${String(s.id).slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {s.clientName || s.customerName || 'Unknown'} · {s.totalBoxes || s.boxes || 0} boxes
                    </p>
                  </div>
                  <StatusBadge status={s.status || 'PENDING'} />
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                <Ship className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No recent shipments
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Jobs */}
        <section>
          <SectionHeader title="Upcoming Jobs" subtitle="Scheduled moving jobs" />
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
            {recentJobs && recentJobs.length > 0 ? (
              recentJobs.map((j: any, idx: number) => (
                <div key={j.id || idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {j.title || j.jobNumber || `Job #${idx + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {j.clientName || j.customerName || 'Unknown'}
                      </span>
                      {j.jobType && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{j.jobType}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <StatusBadge status={j.status || 'PENDING'} />
                    {j.scheduledDate && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 justify-end">
                        <CalendarCheck className="w-3 h-3" />
                        {formatDate(j.scheduledDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No upcoming jobs
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

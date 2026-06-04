import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign,
  Receipt,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import type { Invoice, FinanceOverview } from '../api/types'
import { fetchFinanceOverview, fetchInvoices } from '../api/client'

// ===== CONSTANTS =====

const ITEMS_PER_PAGE = 10

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-400',
}

// ===== HELPERS =====

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} KWD`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.PENDING
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
}

// ===== OVERVIEW CARDS =====

function OverviewCard({
  icon,
  label,
  value,
  sub,
  accentClass,
  iconBgClass,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accentClass?: string
  iconBgClass?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className={`p-2.5 rounded-lg ${iconBgClass || 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}
        >
          {icon}
        </div>
      </div>
      <p className={`mt-3 text-2xl font-bold text-gray-900 dark:text-white ${accentClass || ''}`}>{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ===== COLLECTION RATE COMPONENT =====

function CollectionRateBar({ rate }: { rate: number }) {
  const pct = Math.min(Math.max(rate, 0), 100)
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collection Rate</p>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {pct >= 80 ? 'Healthy collection rate' : pct >= 50 ? 'Needs improvement' : 'Critical — take action'}
      </p>
    </div>
  )
}

// ===== INVOICES TABLE =====

function InvoicesTable({
  invoices,
  loading,
}: {
  invoices: Invoice[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {['Invoice#', 'Client', 'Date', 'Due Date', 'Amount', 'Status', 'Balance'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <Receipt className="w-16 h-16 mb-4 opacity-30" />
        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-1">No invoices found</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Invoice#
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Client
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Date
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Due Date
            </th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Amount
            </th>
            <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Status
            </th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {inv.invoiceNumber}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inv.clientName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                {formatDate(inv.invoiceDate)}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                {formatDate(inv.dueDate)}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(inv.totalAmount)}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <StatusBadge status={inv.paymentStatus} />
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                {inv.balanceDue > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">{formatCurrency(inv.balanceDue)}</span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== PAGINATION =====

function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing page {page} of {totalPages} ({total} total)
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-400"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 text-gray-400 dark:text-gray-500 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 text-xs font-medium rounded-lg transition-colors ${
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-400"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ===== MAIN PAGE =====

export default function Finance() {
  // Overview state
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [invoicesError, setInvoicesError] = useState('')
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 0 })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // ===== FETCH OVERVIEW =====
  useEffect(() => {
    let cancelled = false
    setOverviewLoading(true)
    setOverviewError('')

    fetchFinanceOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data)
          setOverviewLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setOverviewError(err.message || 'Failed to load finance overview')
          setOverviewLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ===== FETCH INVOICES =====
  useEffect(() => {
    let cancelled = false
    setInvoicesLoading(true)
    setInvoicesError('')

    fetchInvoices({ page, limit: ITEMS_PER_PAGE, status: statusFilter || undefined })
      .then((data) => {
        if (!cancelled) {
          setInvoices(data.invoices)
          setPagination(data.pagination)
          setInvoicesLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setInvoicesError(err.message || 'Failed to load invoices')
          setInvoicesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, statusFilter])

  // ===== CLIENT-SIDE SEARCH =====
  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices
    const q = search.toLowerCase()
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q)
    )
  }, [search, invoices])

  // ===== HANDLERS =====
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearchClear = () => {
    setSearch('')
  }

  // ===== RENDER =====

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invoices, payments and financial overview
          </p>
        </div>
      </div>

      {/* ===== OVERVIEW CARDS ===== */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 p-5"
            >
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-7 w-28 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : overviewError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {overviewError}
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <OverviewCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Total Revenue"
              value={formatCurrency(overview.totalRevenue)}
              sub={`${overview.invoiceCount} invoices`}
              iconBgClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            />
            <OverviewCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Collected"
              value={formatCurrency(overview.totalCollected)}
              sub={`${overview.paidCount} paid invoices`}
              iconBgClass="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <OverviewCard
              icon={<CreditCard className="w-5 h-5" />}
              label="Pending"
              value={formatCurrency(overview.totalPending)}
              sub={`${overview.pendingCount} pending invoices`}
              iconBgClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            />
            <OverviewCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Overdue"
              value={formatCurrency(overview.overdueAmount)}
              sub={`${overview.overdueCount} overdue invoices`}
              iconBgClass="bg-red-500/10 text-red-600 dark:text-red-400"
            />
          </div>

          {/* Collection Rate */}
          <CollectionRateBar rate={overview.collectionRate} />
        </>
      ) : null}

      {/* ===== INVOICES SECTION ===== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-auto sm:min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by invoice # or client name..."
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
              {search && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-400 dark:text-gray-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PARTIAL">Partial</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none rotate-90" />
            </div>

            {/* Clear Filters */}
            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setPage(1)
                }}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {invoicesError && (
          <div className="p-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {invoicesError}
            </div>
          </div>
        )}

        {/* Invoices table */}
        {!invoicesError && <InvoicesTable invoices={filteredInvoices} loading={invoicesLoading} />}

        {/* Pagination */}
        {!invoicesError && !invoicesLoading && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Receipt, AlertCircle, Loader2, RefreshCw,
  TrendingUp, TrendingDown, FileText, Plus, X, Download, Printer,
  CreditCard, Trash2, Edit3, Eye, BarChart3, Filter, CheckCircle2,
  Calendar, Hash, Archive, Wallet, PiggyBank, AlertTriangle,
  ChevronLeft, ChevronRight, Search, Clock
} from 'lucide-react'
import { billingAPI, expensesAPI } from '../../api/client'
import type { Invoice, Expense, Payment, InvoiceLineItem } from '../../api/types'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, cn } from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FinanceOverview {
  totalRevenue: number
  collectedRevenue: number
  pendingRevenue: number
  overdueRevenue: number
  collectionRate: number
  monthlyRevenue: { month: string; revenue: number }[]
  recentInvoices: Invoice[]
}

interface ExpenseStats {
  totalByCategory: { category: string; total: number; count: number }[]
  totalAmount: number
  expenseCount: number
}

type InvoiceStatus = 'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIAL'

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      </div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load</h3>
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

function StatCard({
  label, value, sublabel, icon, trend, trendLabel, color,
}: {
  label: string; value: string; sublabel?: string; icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string
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
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
          {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{sublabel}</p>}
          {trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              {trendIcon}
              <span className={cn('text-xs font-medium', trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}>
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

function ProgressBar({ value, max, label, color = 'blue' }: { value: number; max: number; label?: string; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500',
    purple: 'bg-purple-500', red: 'bg-red-500', teal: 'bg-teal-500',
  }
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500 ease-out', colorMap[color])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
  return (
    <span className={cn('inline-flex items-center font-medium rounded-full whitespace-nowrap', sizeClass, getStatusColor(status))}>
      {getStatusLabel(status)}
    </span>
  )
}

function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizeMap: Record<string, string> = {
    sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl',
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden', sizeMap[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        {...props}
      />
    </div>
  )
}

function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <select
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <textarea
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
        rows={3}
        {...props}
      />
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
      <div className="flex justify-center mb-2 opacity-40">{icon}</div>
      {text}
    </div>
  )
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE STATUS FILTER
// ═══════════════════════════════════════════════════════════════════════════════

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PARTIAL', label: 'Partial' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES (common)
// ═══════════════════════════════════════════════════════════════════════════════

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Transport', 'Office Supplies',
  'Maintenance', 'Insurance', 'Marketing', 'Travel', 'Software',
  'Equipment', 'Other',
]

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'KNET', 'Mobile Wallet']

// ═══════════════════════════════════════════════════════════════════════════════
// PARTIAL STATUS helper — not in utils, add locally
// ═══════════════════════════════════════════════════════════════════════════════

function getPartialStatusColor(status: string): string {
  if (status === 'PARTIAL') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  return getStatusColor(status)
}
function getPartialStatusLabel(status: string): string {
  if (status === 'PARTIAL') return 'Partial'
  return getStatusLabel(status)
}
function PartialStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap', getPartialStatusColor(status))}>
      {getPartialStatusLabel(status)}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinancePage() {
  // ── Tab state ────────────────────────────────────────────
  const [tab, setTab] = useState<'overview' | 'invoices' | 'expenses'>('overview')

  // ── Overview state ───────────────────────────────────────
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  // ── Invoices state ───────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus>('ALL')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoicePage, setInvoicePage] = useState(1)
  const [invoicePagination, setInvoicePagination] = useState<any>(null)

  // ── Invoice modals state ─────────────────────────────────
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false)
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [showRecordPayment, setShowRecordPayment] = useState(false)

  // ── Create Invoice form ──────────────────────────────────
  const [ciClient, setCiClient] = useState('')
  const [ciNotes, setCiNotes] = useState('')
  const [ciLineItems, setCiLineItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])
  const [ciCreating, setCiCreating] = useState(false)

  // ── Record Payment form ──────────────────────────────────
  const [rpAmount, setRpAmount] = useState('')
  const [rpMethod, setRpMethod] = useState('Bank Transfer')
  const [rpRef, setRpRef] = useState('')
  const [rpNotes, setRpNotes] = useState('')
  const [rpLoading, setRpLoading] = useState(false)

  // ── Invoice detail state (expanded) ──────────────────────
  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([])

  // ── Expenses state ───────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [expensesError, setExpensesError] = useState<string | null>(null)
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('ALL')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL')
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null)

  // ── Expense modals state ─────────────────────────────────
  const [showCreateExpense, setShowCreateExpense] = useState(false)
  const [showEditExpense, setShowEditExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Expense form state ───────────────────────────────────
  const [exCategory, setExCategory] = useState('Other')
  const [exDescription, setExDescription] = useState('')
  const [exAmount, setExAmount] = useState('')
  const [exCurrency, setExCurrency] = useState('KWD')
  const [exDate, setExDate] = useState(new Date().toISOString().split('T')[0])
  const [exStatus, setExStatus] = useState('PENDING')
  const [exFormLoading, setExFormLoading] = useState(false)

  // ══════════════════════════════════════════════════════════
  // DATA FETCHING
  // ══════════════════════════════════════════════════════════

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      const res = await billingAPI.getFinanceOverview()
      setOverview(res as unknown as FinanceOverview)
    } catch (err: any) {
      setOverviewError(err?.message || 'Failed to load finance overview')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true)
    setInvoicesError(null)
    try {
      const params: any = { page: invoicePage, limit: 20 }
      if (invoiceStatusFilter !== 'ALL') params.status = invoiceStatusFilter
      if (invoiceSearch) params.search = invoiceSearch
      const res = await billingAPI.getInvoices(params)
      setInvoices(res.invoices || [])
      setInvoicePagination(res.pagination || null)
    } catch (err: any) {
      setInvoicesError(err?.message || 'Failed to load invoices')
    } finally {
      setInvoicesLoading(false)
    }
  }, [invoicePage, invoiceStatusFilter, invoiceSearch])

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true)
    setExpensesError(null)
    try {
      const params: any = {}
      if (expenseStatusFilter !== 'ALL') params.status = expenseStatusFilter
      if (expenseCategoryFilter !== 'ALL') params.category = expenseCategoryFilter
      const res = await expensesAPI.getAll(params)
      setExpenses(res.expenses || [])
    } catch (err: any) {
      setExpensesError(err?.message || 'Failed to load expenses')
    } finally {
      setExpensesLoading(false)
    }
  }, [expenseStatusFilter, expenseCategoryFilter])

  const fetchExpenseStats = useCallback(async () => {
    try {
      const res = await expensesAPI.getStats()
      setExpenseStats(res.stats as unknown as ExpenseStats)
    } catch {
      // stats are non-critical
    }
  }, [])

  const fetchInvoiceDetail = useCallback(async (id: string) => {
    try {
      const res = await billingAPI.getInvoice(id)
      if (res.invoice) {
        setSelectedInvoice(res.invoice)
        setInvoicePayments((res.invoice as any).payments || [])
      }
    } catch {
      // keep existing
    }
  }, [])

  // ── Initial fetches ──────────────────────────────────────
  useEffect(() => { fetchOverview() }, [fetchOverview])
  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchExpenseStats() }, [fetchExpenseStats])

  // ══════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════

  // ── Create Invoice ───────────────────────────────────────
  const handleCreateInvoice = async () => {
    if (!ciClient.trim()) return
    setCiCreating(true)
    try {
      const validItems = ciLineItems.filter(i => i.description.trim() && i.unitPrice > 0)
      if (validItems.length === 0) return
      const items = validItems.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.quantity * i.unitPrice,
      }))
      await billingAPI.createInvoice({
        clientName: ciClient.trim(),
        lineItems: items,
        notes: ciNotes.trim() || undefined,
      })
      setShowCreateInvoice(false)
      resetCreateInvoiceForm()
      fetchInvoices()
      fetchOverview()
    } catch (err: any) {
      alert(err?.message || 'Failed to create invoice')
    } finally {
      setCiCreating(false)
    }
  }

  const resetCreateInvoiceForm = () => {
    setCiClient('')
    setCiNotes('')
    setCiLineItems([{ description: '', quantity: 1, unitPrice: 0 }])
  }

  const addLineItem = () => {
    setCiLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeLineItem = (idx: number) => {
    setCiLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateLineItem = (idx: number, field: string, value: string | number) => {
    setCiLineItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'description' ? value : Number(value) || 0 } : item
    ))
  }

  const invoiceTotal = ciLineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  // ── Record Payment ───────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!selectedInvoice || !rpAmount) return
    setRpLoading(true)
    try {
      await billingAPI.recordPayment(selectedInvoice.id, {
        amount: parseFloat(rpAmount),
        method: rpMethod,
        transactionRef: rpRef.trim() || undefined,
        notes: rpNotes.trim() || undefined,
      })
      setShowRecordPayment(false)
      resetPaymentForm()
      fetchInvoices()
      fetchOverview()
      if (selectedInvoice) fetchInvoiceDetail(selectedInvoice.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment')
    } finally {
      setRpLoading(false)
    }
  }

  const resetPaymentForm = () => {
    setRpAmount('')
    setRpMethod('Bank Transfer')
    setRpRef('')
    setRpNotes('')
  }

  // ── Invoice Detail ───────────────────────────────────────
  const openInvoiceDetail = (inv: Invoice) => {
    setSelectedInvoice(inv)
    setInvoicePayments((inv as any).payments || [])
    setShowInvoiceDetail(true)
    if (!(inv as any).payments) {
      fetchInvoiceDetail(inv.id)
    }
  }

  const openRecordPayment = (inv: Invoice) => {
    setSelectedInvoice(inv)
    setRpAmount('')
    setRpMethod('Bank Transfer')
    setRpRef('')
    setRpNotes('')
    setShowRecordPayment(true)
  }

  // ── Create Expense ───────────────────────────────────────
  const resetExpenseForm = () => {
    setExCategory('Other')
    setExDescription('')
    setExAmount('')
    setExCurrency('KWD')
    setExDate(new Date().toISOString().split('T')[0])
    setExStatus('PENDING')
  }

  const handleCreateExpense = async () => {
    if (!exAmount || parseFloat(exAmount) <= 0) return
    setExFormLoading(true)
    try {
      await expensesAPI.create({
        category: exCategory,
        description: exDescription.trim() || undefined,
        amount: parseFloat(exAmount),
        currency: exCurrency,
        date: exDate,
        status: exStatus,
      })
      setShowCreateExpense(false)
      resetExpenseForm()
      fetchExpenses()
      fetchExpenseStats()
    } catch (err: any) {
      alert(err?.message || 'Failed to create expense')
    } finally {
      setExFormLoading(false)
    }
  }

  // ── Edit Expense ─────────────────────────────────────────
  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp)
    setExCategory(exp.category || 'Other')
    setExDescription(exp.description || '')
    setExAmount(String(exp.amount))
    setExCurrency(exp.currency || 'KWD')
    setExDate(exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0])
    setExStatus(exp.status || 'PENDING')
    setShowEditExpense(true)
  }

  const handleEditExpense = async () => {
    if (!editingExpense || !exAmount || parseFloat(exAmount) <= 0) return
    setExFormLoading(true)
    try {
      await expensesAPI.update(editingExpense.id, {
        category: exCategory,
        description: exDescription.trim() || undefined,
        amount: parseFloat(exAmount),
        currency: exCurrency,
        date: exDate,
        status: exStatus,
      })
      setShowEditExpense(false)
      setEditingExpense(null)
      resetExpenseForm()
      fetchExpenses()
      fetchExpenseStats()
    } catch (err: any) {
      alert(err?.message || 'Failed to update expense')
    } finally {
      setExFormLoading(false)
    }
  }

  // ── Delete Expense ───────────────────────────────────────
  const confirmDeleteExpense = (exp: Expense) => {
    setDeletingExpense(exp)
    setShowDeleteConfirm(true)
  }

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return
    setDeleteLoading(true)
    try {
      await expensesAPI.delete(deletingExpense.id)
      setShowDeleteConfirm(false)
      setDeletingExpense(null)
      fetchExpenses()
      fetchExpenseStats()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete expense')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════════
  // DERIVED VALUES
  // ══════════════════════════════════════════════════════════

  const collectionRate = overview && overview.totalRevenue > 0
    ? ((overview.collectedRevenue ?? 0) / overview.totalRevenue) * 100 : 0

  const uniqueExpenseCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))]
  const expenseStatuses = [...new Set(expenses.map(e => e.status).filter(Boolean))]

  // ══════════════════════════════════════════════════════════
  // RENDER: TAB NAVIGATION
  // ══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Billing overview, invoices, and expense management</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 -mb-px">
          {(['overview', 'invoices', 'expenses'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {t === 'overview' ? 'Finance Overview' : t === 'invoices' ? 'Invoices' : 'Expenses'}
            </button>
          ))}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: FINANCE OVERVIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {overviewLoading ? (
            <Loader text="Loading finance overview..." />
          ) : overviewError ? (
            <ErrorBanner message={overviewError} onRetry={fetchOverview} />
          ) : !overview ? null : (
            <>
              {/* ── Summary Cards ──────────────────────────────── */}
              <section>
                <SectionHeader title="Financial Summary" subtitle="Revenue overview" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Revenue"
                    value={formatCurrency(overview.totalRevenue ?? 0)}
                    sublabel="Total invoiced amount"
                    icon={<DollarSign className="w-5 h-5" />}
                    color="blue"
                  />
                  <StatCard
                    label="Collected"
                    value={formatCurrency(overview.collectedRevenue ?? 0)}
                    sublabel="Payments received"
                    trend="up"
                    trendLabel={`${collectionRate.toFixed(1)}% collection rate`}
                    icon={<Receipt className="w-5 h-5" />}
                    color="green"
                  />
                  <StatCard
                    label="Pending"
                    value={formatCurrency(overview.pendingRevenue ?? 0)}
                    sublabel="Awaiting payment"
                    icon={<Clock className="w-5 h-5" />}
                    color="orange"
                  />
                  <StatCard
                    label="Overdue"
                    value={formatCurrency(overview.overdueRevenue ?? 0)}
                    sublabel="Past due invoices"
                    trend={overview.overdueRevenue > 0 ? 'down' : 'neutral'}
                    trendLabel={overview.overdueRevenue > 0 ? 'Action needed' : 'All clear'}
                    icon={<AlertCircle className="w-5 h-5" />}
                    color="red"
                  />
                </div>
              </section>

              {/* ── Collection Rate ────────────────────────────── */}
              <section>
                <SectionHeader title="Collection Rate" subtitle="Overall payment collection performance" />
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <ProgressBar
                        value={overview.collectedRevenue ?? 0}
                        max={overview.totalRevenue || 1}
                        color="green"
                      />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{collectionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">collected</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Collected: {formatCurrency(overview.collectedRevenue ?? 0)}</span>
                    <span>Total: {formatCurrency(overview.totalRevenue ?? 0)}</span>
                  </div>
                </div>
              </section>

              {/* ── Revenue Bar Chart ──────────────────────────── */}
              {overview.monthlyRevenue && overview.monthlyRevenue.length > 0 && (
                <section>
                  <SectionHeader title="Monthly Revenue" subtitle="Revenue trend by month" />
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <div className="flex items-end gap-2 sm:gap-3 h-48">
                      {overview.monthlyRevenue.map((m, idx) => {
                        const rev = m.revenue ?? 0
                        const maxRev = Math.max(...overview.monthlyRevenue.map(x => x.revenue ?? 0), 1)
                        const heightPct = (rev / maxRev) * 100
                        return (
                          <div key={m.month || idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                              {formatCurrency(rev)}
                            </span>
                            <div
                              className="w-full max-w-[48px] rounded-t-md bg-blue-500 dark:bg-blue-400 hover:bg-blue-600 dark:hover:bg-blue-300 transition-all cursor-pointer"
                              style={{ height: `${Math.max(heightPct, 2)}%` }}
                              title={`${m.month}: ${formatCurrency(rev)}`}
                            />
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full text-center">
                              {m.month}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* ── Recent Invoices ────────────────────────────── */}
              <section>
                <SectionHeader
                  title="Recent Invoices"
                  subtitle="Latest invoice activity"
                  action={
                    <button
                      onClick={fetchOverview}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
                  }
                />
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                  {overview.recentInvoices && overview.recentInvoices.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {overview.recentInvoices.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {inv.clientName || inv.customerName || 'Unknown'} · {formatDate(inv.createdAt)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(inv.totalAmount)}
                            </p>
                          </div>
                          <PartialStatusBadge status={inv.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<FileText className="w-8 h-8" />} text="No invoices yet" />
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: INVOICES
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'invoices' && (
        <div className="space-y-6">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invoices</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage all billing invoices</p>
            </div>
            <button
              onClick={() => { resetCreateInvoiceForm(); setShowCreateInvoice(true) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>

          {/* ── Filters ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={invoiceSearch}
                onChange={e => { setInvoiceSearch(e.target.value); setInvoicePage(1) }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INVOICE_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setInvoiceStatusFilter(s.value); setInvoicePage(1) }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    invoiceStatusFilter === s.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────── */}
          {invoicesLoading ? (
            <Loader text="Loading invoices..." />
          ) : invoicesError ? (
            <ErrorBanner message={invoicesError} onRetry={fetchInvoices} />
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              {invoices.length === 0 ? (
                <EmptyState icon={<FileText className="w-8 h-8" />} text="No invoices found" />
              ) : (
                <>
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-[60px_1fr_120px_100px_130px_100px_60px] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span>#</span>
                    <span>Client</span>
                    <span className="text-right">Amount</span>
                    <span>Status</span>
                    <span className="text-right">Paid</span>
                    <span>Date</span>
                    <span></span>
                  </div>
                  {/* Rows */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[60px_1fr_120px_100px_130px_100px_60px] gap-2 md:gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center"
                      >
                        {/* # - mobile label via data attribute */}
                        <span className="md:block text-xs font-mono text-gray-500 dark:text-gray-400 before:content-['#_'] md:before:content-none">
                          {inv.invoiceNumber ? inv.invoiceNumber.replace(/^.*-/g, '') : inv.id.slice(0, 6)}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate before:content-['Client:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {inv.clientName || inv.customerName || '-'}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white text-right before:content-['Amount:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                        <span className="before:content-['Status:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          <PartialStatusBadge status={inv.status} />
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white text-right before:content-['Paid:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {inv.paidAmount ? formatCurrency(inv.paidAmount) : '-'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 before:content-['Date:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {formatDate(inv.createdAt)}
                        </span>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openInvoiceDetail(inv)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => openRecordPayment(inv)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                              title="Record payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {invoicePagination && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Page {invoicePagination.page || invoicePage} of {invoicePagination.pages || 1}
                    {' '}({invoicePagination.total || invoices.length} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                      disabled={invoicePage <= 1}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setInvoicePage(p => (invoicePagination.pages ? Math.min(invoicePagination.pages, p + 1) : p + 1))}
                      disabled={invoicePagination.pages && invoicePage >= invoicePagination.pages}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: EXPENSES
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expenses</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track and manage operational expenses</p>
            </div>
            <button
              onClick={() => { resetExpenseForm(); setShowCreateExpense(true) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Expense
            </button>
          </div>

          {/* ── Filters ────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            {/* Category filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {[...new Set([...EXPENSE_CATEGORIES, ...uniqueExpenseCategories])].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {/* Status filter */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'PENDING', 'PAID', 'CANCELLED'].map(s => (
                <button
                  key={s}
                  onClick={() => setExpenseStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    expenseStatusFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {s === 'ALL' ? 'All' : getStatusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Stats by category ──────────────────────────────── */}
          {expenseStats && expenseStats.totalByCategory && expenseStats.totalByCategory.length > 0 && (
            <section>
              <SectionHeader title="Expenses by Category" subtitle="Total spending breakdown" />
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <div className="space-y-3">
                  {expenseStats.totalByCategory.map((cat, idx) => {
                    const maxCat = Math.max(...expenseStats.totalByCategory.map(c => c.total), 1)
                    const pct = (cat.total / maxCat) * 100
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500']
                    return (
                      <div key={cat.category || idx}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{cat.category}</span>
                          <span className="text-xs text-gray-500">
                            {formatCurrency(cat.total)} ({cat.count} items)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', colors[idx % colors.length])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Total Expenses</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(expenseStats.totalAmount)}</span>
                </div>
              </div>
            </section>
          )}

          {/* ── Expense Table ──────────────────────────────────── */}
          {expensesLoading ? (
            <Loader text="Loading expenses..." />
          ) : expensesError ? (
            <ErrorBanner message={expensesError} onRetry={fetchExpenses} />
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              {expenses.length === 0 ? (
                <EmptyState icon={<Archive className="w-8 h-8" />} text="No expenses found" />
              ) : (
                <>
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-[60px_120px_1fr_110px_100px_120px_80px] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span>#</span>
                    <span>Category</span>
                    <span>Description</span>
                    <span className="text-right">Amount</span>
                    <span>Status</span>
                    <span>Date</span>
                    <span></span>
                  </div>
                  {/* Rows */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[60px_120px_1fr_110px_100px_120px_80px] gap-2 md:gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center"
                      >
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 before:content-['#_'] md:before:content-none">
                          {exp.expenseNumber ? exp.expenseNumber.replace(/^.*-/g, '') : exp.id.slice(0, 6)}
                        </span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 before:content-['Category:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {exp.category || '-'}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white truncate before:content-['Desc:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {exp.description || '-'}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white text-right before:content-['Amount:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {formatCurrency(exp.amount, exp.currency)}
                        </span>
                        <span className="before:content-['Status:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          <StatusBadge status={exp.status} />
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 before:content-['Date:_'] before:text-xs before:text-gray-400 before:font-normal md:before:content-none">
                          {formatDate(exp.date || exp.createdAt)}
                        </span>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEditExpense(exp)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                            title="Edit expense"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteExpense(exp)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Invoice Detail Modal ─────────────────────────────── */}
      <Modal open={showInvoiceDetail} onClose={() => setShowInvoiceDetail(false)} title="Invoice Details" size="lg">
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoice Number</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedInvoice.invoiceNumber || `INV-${selectedInvoice.id.slice(0, 8)}`}</p>
              </div>
              <div className="text-right">
                <PartialStatusBadge status={selectedInvoice.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedInvoice.clientName || selectedInvoice.customerName || '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedInvoice.createdAt)}</p>
              </div>
            </div>

            {/* Line items */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Line Items</h4>
              {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[2fr_80px_100px_100px] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {selectedInvoice.lineItems.map((li, idx) => (
                      <div key={li.id || idx} className="grid grid-cols-[2fr_80px_100px_100px] gap-2 px-4 py-2.5 text-sm">
                        <span className="text-gray-900 dark:text-white">{li.description}</span>
                        <span className="text-center text-gray-600 dark:text-gray-400">{li.quantity}</span>
                        <span className="text-right text-gray-600 dark:text-gray-400">{formatCurrency(li.unitPrice)}</span>
                        <span className="text-right font-medium text-gray-900 dark:text-white">{formatCurrency(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Total: {formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">No line items available</p>
              )}
            </div>

            {/* Notes */}
            {selectedInvoice.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Payments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Payments</h4>
              {invoicePayments.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_100px_120px_100px] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <span>Method</span>
                    <span className="text-right">Amount</span>
                    <span>Reference</span>
                    <span className="text-right">Date</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {invoicePayments.map((p, idx) => (
                      <div key={p.id || idx} className="grid grid-cols-[1fr_100px_120px_100px] gap-2 px-4 py-2.5 text-sm">
                        <span className="text-gray-900 dark:text-white">{p.method}</span>
                        <span className="text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(p.amount)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.transactionRef || '-'}</span>
                        <span className="text-right text-xs text-gray-500 dark:text-gray-400">{formatDate(p.paidAt)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      Paid: {formatCurrency(invoicePayments.reduce((s, p) => s + p.amount, 0))}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">No payments recorded yet</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              {selectedInvoice.status !== 'PAID' && (
                <button
                  onClick={() => { setShowInvoiceDetail(false); openRecordPayment(selectedInvoice) }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Invoice Modal ─────────────────────────────── */}
      <Modal open={showCreateInvoice} onClose={() => setShowCreateInvoice(false)} title="Create Invoice" size="lg">
        <div className="space-y-4">
          <Input
            label="Client Name"
            placeholder="Enter client name"
            value={ciClient}
            onChange={e => setCiClient(e.target.value)}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</span>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {ciLineItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 space-y-2">
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateLineItem(idx, 'description', e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                        min={1}
                        className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice || ''}
                        onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)}
                        min={0}
                        step={0.001}
                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[70px] justify-end">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                  {ciLineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(idx)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Total: {formatCurrency(invoiceTotal)}</span>
            </div>
          </div>

          <Textarea
            label="Notes (optional)"
            placeholder="Additional notes..."
            value={ciNotes}
            onChange={e => setCiNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowCreateInvoice(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={ciCreating || !ciClient.trim() || ciLineItems.every(i => !i.description.trim() || i.unitPrice <= 0)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {ciCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Invoice
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Record Payment Modal ────────────────────────────── */}
      <Modal open={showRecordPayment} onClose={() => setShowRecordPayment(false)} title="Record Payment" size="md">
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoice</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedInvoice.invoiceNumber || `INV-${selectedInvoice.id.slice(0, 8)}`}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Due</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0))}
                </p>
              </div>
            </div>

            <Input
              label="Payment Amount"
              type="number"
              placeholder="0.000"
              min={0}
              step={0.001}
              value={rpAmount}
              onChange={e => setRpAmount(e.target.value)}
            />

            <Select label="Payment Method" value={rpMethod} onChange={e => setRpMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>

            <Input
              label="Transaction Reference (optional)"
              placeholder="Reference number"
              value={rpRef}
              onChange={e => setRpRef(e.target.value)}
            />

            <Textarea
              label="Notes (optional)"
              placeholder="Payment notes..."
              value={rpNotes}
              onChange={e => setRpNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowRecordPayment(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={rpLoading || !rpAmount || parseFloat(rpAmount) <= 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {rpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Expense Modal ────────────────────────────── */}
      <Modal open={showCreateExpense} onClose={() => setShowCreateExpense(false)} title="New Expense" size="md">
        <div className="space-y-4">
          <Select label="Category" value={exCategory} onChange={e => setExCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          <Textarea
            label="Description"
            placeholder="Expense description..."
            value={exDescription}
            onChange={e => setExDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              placeholder="0.000"
              min={0}
              step={0.001}
              value={exAmount}
              onChange={e => setExAmount(e.target.value)}
            />
            <Select label="Currency" value={exCurrency} onChange={e => setExCurrency(e.target.value)}>
              <option value="KWD">KWD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </div>

          <Input
            label="Date"
            type="date"
            value={exDate}
            onChange={e => setExDate(e.target.value)}
          />

          <Select label="Status" value={exStatus} onChange={e => setExStatus(e.target.value)}>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowCreateExpense(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateExpense}
              disabled={exFormLoading || !exAmount || parseFloat(exAmount) <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {exFormLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Expense
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Expense Modal ──────────────────────────────── */}
      <Modal open={showEditExpense} onClose={() => { setShowEditExpense(false); setEditingExpense(null) }} title="Edit Expense" size="md">
        {editingExpense && (
          <div className="space-y-4">
            <Select label="Category" value={exCategory} onChange={e => setExCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>

            <Textarea
              label="Description"
              placeholder="Expense description..."
              value={exDescription}
              onChange={e => setExDescription(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount"
                type="number"
                placeholder="0.000"
                min={0}
                step={0.001}
                value={exAmount}
                onChange={e => setExAmount(e.target.value)}
              />
              <Select label="Currency" value={exCurrency} onChange={e => setExCurrency(e.target.value)}>
                <option value="KWD">KWD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </div>

            <Input
              label="Date"
              type="date"
              value={exDate}
              onChange={e => setExDate(e.target.value)}
            />

            <Select label="Status" value={exStatus} onChange={e => setExStatus(e.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowEditExpense(false); setEditingExpense(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditExpense}
                disabled={exFormLoading || !exAmount || parseFloat(exAmount) <= 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {exFormLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Expense Confirmation ─────────────────────── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeletingExpense(null) }}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense${deletingExpense?.description ? `: "${deletingExpense.description}"` : ''}? This action cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  )
}

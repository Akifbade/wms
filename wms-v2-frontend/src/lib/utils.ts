import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'KWD'): string {
  if (amount == null || isNaN(amount)) return `0.000 ${currency}`
  try {
    return `${amount.toLocaleString('en-KW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '-'
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

export function getDaysBetween(start: string, end?: string): number {
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'IN_WAREHOUSE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'IN_STORAGE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'ACTIVE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'PARTIAL': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'RELEASED': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'MAINTENANCE': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'AVAILABLE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'FULL': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'DRAFT': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'PAID': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'UNPAID': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'OVERDUE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    'PENDING': 'Pending',
    'IN_WAREHOUSE': 'In Warehouse',
    'IN_STORAGE': 'In Storage',
    'ACTIVE': 'Active',
    'PARTIAL': 'Partial',
    'RELEASED': 'Released',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'MAINTENANCE': 'Maintenance',
    'AVAILABLE': 'Available',
    'FULL': 'Full',
    'DRAFT': 'Draft',
    'PAID': 'Paid',
    'UNPAID': 'Unpaid',
    'OVERDUE': 'Overdue',
  }
  return map[status] || status.replace(/_/g, ' ')
}

export function truncate(str: string, len = 30): string {
  return str?.length > len ? str.slice(0, len) + '...' : str
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function calcCBM(l: number, w: number, h: number, qty = 1): number {
  return (l * w * h / 1_000_000) * qty
}

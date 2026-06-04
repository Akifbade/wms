// Shared UI Components for WMS v2
import { type ReactNode } from 'react'

// ====== Status Badge ======
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    RELEASED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PARTIAL: 'bg-purple-100 text-purple-700',
    IN_STORAGE: 'bg-cyan-100 text-cyan-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    COMPLETED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    PLANNED: 'bg-gray-100 text-gray-600',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    RESERVED: 'bg-purple-100 text-purple-700',
  }
  const color = colors[status] || 'bg-gray-100 text-gray-600'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{status.replace('_', ' ')}</span>
}

// ====== Stat Card ======
export function StatCard({ icon, label, value, sub, color, trend }: {
  icon: ReactNode; label: string; value: string | number; sub?: string;
  color?: string; trend?: { value: number; positive: boolean }
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${color || 'bg-indigo-500'}`}>
          <span className="text-white w-5 h-5 flex items-center justify-center">{icon}</span>
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ====== Progress Bar ======
export function ProgressBar({ value, max, color = 'bg-indigo-500', height = 2 }: {
  value: number; max: number; color?: string; height?: number
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full" style={{ height: `${height * 4}px` }}>
      <div className={`${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%`, height: `${height * 4}px` }} />
    </div>
  )
}

// ====== Loading Spinner ======
export function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ====== Empty State ======
export function EmptyState({ icon, title, message }: { icon: ReactNode; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="w-16 h-16 mb-4 opacity-30">{icon}</span>
      <h3 className="text-lg font-medium text-gray-500 mb-1">{title}</h3>
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  )
}

// ====== Data Table ======
export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick }: {
  columns: { key: string; label: string; render?: (item: T) => ReactNode; sortable?: boolean }[]
  data: T[]
  onRowClick?: (item: T) => void
}) {
  if (data.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={item.id || i}
              onClick={() => onRowClick?.(item)}
              className={`border-b border-gray-50 hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-gray-700">
                  {col.render ? col.render(item) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ====== Page Header ======
export function PageHeader({ title, description, action }: {
  title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ====== Search Input ======
export function SearchInput({ value, onChange, placeholder = 'Search...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}

// ====== Card ======
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-xs border border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

// ====== Metric Tiles (mini stats row) ======
export function MetricTile({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="text-center p-4">
      {icon && <div className="mb-1 flex justify-center text-gray-400">{icon}</div>}
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ====== Button variants ======
export function Button({ children, variant = 'primary', size = 'md', onClick, className = '', disabled }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg'; onClick?: () => void; className?: string; disabled?: boolean
}) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}

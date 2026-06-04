// ═══════════════════════════════════════════════════════════════
// WMS v2 — Racks Page (Complete)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, Search, X, MoreVertical,
  LayoutGrid, List,
  Ruler, Map, Package, Box, HardDrive, BarChart3, Grid3x3,
  Edit3, Trash2, Eye, Warehouse, Layers, MapPin,
  AlertCircle, Loader2, RefreshCw, ArrowUpDown,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { racksAPI } from '../../api/client'
import type { Rack, RackCategory } from '../../api/types'
import { cn, getStatusColor, getStatusLabel } from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ViewMode = 'grid' | 'table'
type RackStatus = 'available' | 'full' | 'maintenance' | 'partial'

const STATUS_FILTERS = ['All', 'Available', 'Full', 'Partial', 'Maintenance'] as const

const RACK_STATUSES: { value: RackStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'partial', label: 'Partial' },
  { value: 'full', label: 'Full' },
  { value: 'maintenance', label: 'Maintenance' },
]

interface RackFormData {
  code: string
  name: string
  category: string
  zone: string
  location: string
  capacityTotal: number
  cbmCapacity: number
  status: RackStatus
}

const emptyRackForm: RackFormData = {
  code: '',
  name: '',
  category: '',
  zone: '',
  location: '',
  capacityTotal: 0,
  cbmCapacity: 0,
  status: 'available',
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center font-medium rounded-full px-2.5 py-0.5 text-[10px] whitespace-nowrap', getStatusColor(status))}>
      {getStatusLabel(status)}
    </span>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading racks...</p>
      </div>
    </div>
  )
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load racks</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{message}</p>
        <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

function CapacityBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 shrink-0">{used}/{total}</span>
    </div>
  )
}

function StatLine({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{label}</span>
      <span className={cn('text-[10px] font-semibold text-gray-800 dark:text-gray-200 truncate ml-auto', valueClass)}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// RACK CARD (Grid View)
// ═══════════════════════════════════════════════════════════════

function RackCard({
  rack,
  onEdit,
  onDelete,
  onManageDimensions,
}: {
  rack: Rack;
  onEdit: () => void;
  onDelete: () => void;
  onManageDimensions: () => void;
}) {
  const capUsed = rack.capacityUsed ?? 0
  const capTotal = rack.capacityTotal ?? 0
  const cbmUsed = rack.cbmUsed ?? 0
  const cbmCap = rack.cbmCapacity ?? 0
  const cbmPct = cbmCap > 0 ? Math.min((cbmUsed / cbmCap) * 100, 100) : 0
  const capPct = capTotal > 0 ? Math.min((capUsed / capTotal) * 100, 100) : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden">
      {/* Top accent bar */}
      <div className={cn(
        'h-1.5',
        rack.status === 'available' ? 'bg-green-500' :
        rack.status === 'full' ? 'bg-red-500' :
        rack.status === 'maintenance' ? 'bg-purple-500' : 'bg-amber-500'
      )} />

      <div className="p-4 space-y-3">
        {/* Header: code + status + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-500 shrink-0" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rack.code}</h3>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{rack.name || '—'}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onManageDimensions} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Manage Dimensions">
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onEdit} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap gap-1.5">
          {rack.zone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <MapPin className="w-3 h-3" /> {rack.zone}
            </span>
          )}
          {rack.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-3 h-3" /> {rack.category}
            </span>
          )}
          {rack.location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              <Map className="w-3 h-3" /> {rack.location}
            </span>
          )}
        </div>

        {/* Capacity bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Capacity</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{capPct.toFixed(0)}%</span>
          </div>
          <CapacityBar used={capUsed} total={capTotal} />
        </div>

        {/* CBM info */}
        {cbmCap > 0 && (
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Box className="w-3 h-3" /> CBM
            </span>
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
              {cbmUsed.toFixed(1)} / {cbmCap.toFixed(1)} m³
              <span className={cn('ml-1', cbmPct >= 90 ? 'text-red-500' : cbmPct >= 70 ? 'text-amber-500' : 'text-green-500')}>
                ({cbmPct.toFixed(0)}%)
              </span>
            </span>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700">
          <StatusBadge status={rack.status} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">ID: {rack.code}</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// RACK TABLE ROW (Table View)
// ═══════════════════════════════════════════════════════════════

function RackTableRow({
  rack,
  onEdit,
  onDelete,
  onManageDimensions,
}: {
  rack: Rack;
  onEdit: () => void;
  onDelete: () => void;
  onManageDimensions: () => void;
}) {
  const capUsed = rack.capacityUsed ?? 0
  const capTotal = rack.capacityTotal ?? 0
  const cbmUsed = rack.cbmUsed ?? 0
  const cbmCap = rack.cbmCapacity ?? 0
  const capPct = capTotal > 0 ? Math.min((capUsed / capTotal) * 100, 100) : 0
  const capColor = capPct >= 90 ? 'bg-red-500' : capPct >= 70 ? 'bg-amber-500' : capPct >= 50 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Ruler className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rack.code}</p>
            <p className="text-[10px] text-gray-400 truncate">{rack.name || '—'}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{rack.zone || '—'}</td>
      <td className="py-3 px-3 text-xs text-indigo-600 dark:text-indigo-400">{rack.category || '—'}</td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', capColor)} style={{ width: `${capPct}%` }} />
          </div>
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 shrink-0">{capUsed}/{capTotal}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-xs text-gray-700 dark:text-gray-300">
        {cbmCap > 0 ? `${cbmUsed.toFixed(1)} / ${cbmCap.toFixed(1)}` : '—'}
      </td>
      <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{rack.location || '—'}</td>
      <td className="py-3 px-3"><StatusBadge status={rack.status} /></td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <button onClick={onManageDimensions} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Dimensions">
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT RACK MODAL
// ═══════════════════════════════════════════════════════════════

function CreateEditRackModal({
  rack,
  categories,
  onClose,
  onSaved,
}: {
  rack?: Rack | null;
  categories: RackCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!rack
  const [form, setForm] = useState<RackFormData>(() => ({
    code: rack?.code || '',
    name: rack?.name || '',
    category: rack?.category || '',
    zone: rack?.zone || '',
    location: rack?.location || '',
    capacityTotal: rack?.capacityTotal ?? 0,
    cbmCapacity: rack?.cbmCapacity ?? 0,
    status: (rack?.status as RackStatus) || 'available',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await racksAPI.update(rack!.id, form)
      } else {
        await racksAPI.create(form)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save rack')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader
            title={isEdit ? 'Edit Rack' : 'Create Rack'}
            subtitle={isEdit ? `Updating ${rack?.code}` : 'Add a new rack to the warehouse'}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Code */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Code *</label>
                <input type="text" placeholder="e.g. RACK-A01"
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input type="text" placeholder="e.g. Aisle A Section 1"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                <select value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {/* Zone */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Zone</label>
                <input type="text" placeholder="e.g. A, B, C"
                  value={form.zone}
                  onChange={e => setForm(prev => ({ ...prev, zone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
                <input type="text" placeholder="e.g. Warehouse 1, Aisle 3"
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as RackStatus }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                  {RACK_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capacity section */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Capacity</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Capacity (units)</label>
                  <input type="number" min={0}
                    value={form.capacityTotal}
                    onChange={e => setForm(prev => ({ ...prev, capacityTotal: Math.max(0, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CBM Capacity (m³)</label>
                  <input type="number" min={0} step={0.01}
                    value={form.cbmCapacity}
                    onChange={e => setForm(prev => ({ ...prev, cbmCapacity: Math.max(0, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.code.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : isEdit ? 'Update Rack' : 'Create Rack'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// BULK ADD RACK MODAL
// ═══════════════════════════════════════════════════════════════

function BulkAddRackModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: RackCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [prefix, setPrefix] = useState('')
  const [count, setCount] = useState(10)
  const [category, setCategory] = useState('')
  const [zone, setZone] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!prefix.trim()) return
    setSaving(true)
    setError(null)
    setProgress(0)
    try {
      for (let i = 1; i <= count; i++) {
        const code = `${prefix}-${String(i).padStart(2, '0')}`
        await racksAPI.create({
          code,
          name: `${prefix} ${i}`,
          category,
          zone,
          location: zone || '',
          capacityTotal: 0,
          cbmCapacity: 0,
          status: 'available',
        })
        setProgress(i)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create racks')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Bulk Add Racks" subtitle="Create multiple racks at once" onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prefix *</label>
              <input type="text" placeholder="e.g. RACK-A"
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              <p className="text-[10px] text-gray-400 mt-1">Racks will be named: {prefix}-01, {prefix}-02, ...</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Count</label>
              <input type="number" min={1} max={500}
                value={count}
                onChange={e => setCount(Math.min(500, Math.max(1, Number(e.target.value))))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
              <select value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Zone</label>
              <input type="text" placeholder="e.g. A, B, C"
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </div>

            {/* Progress */}
            {saving && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Creating racks...</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{progress}/{count}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(progress / count) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !prefix.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Creating...' : `Create ${count} Racks`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION RACK MANAGER
// ═══════════════════════════════════════════════════════════════

function DimensionRackManager({
  rack,
  onClose,
}: {
  rack: Rack;
  onClose: () => void;
}) {
  const [rackData, setRackData] = useState<Rack | null>(null)
  const [loading, setLoading] = useState(true)
  const [cbmCapacity, setCbmCapacity] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    racksAPI.getById(rack.id)
      .then(res => {
        setRackData(res.rack)
        setCbmCapacity(res.rack.cbmCapacity ?? 0)
      })
      .catch(err => setError(err?.message || 'Failed to load rack'))
      .finally(() => setLoading(false))
  }, [rack.id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await racksAPI.update(rack.id, { cbmCapacity })
      setRackData(prev => prev ? { ...prev, cbmCapacity } : null)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to update dimensions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Manage Dimensions" subtitle={`${rack.code} — ${rack.name || 'Rack'}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>
            ) : (
              <>
                {/* Current stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Used CBM</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{(rackData?.cbmUsed ?? 0).toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400">m³</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{cbmCapacity.toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400">m³</p>
                  </div>
                </div>

                {/* CBM Capacity input */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CBM Capacity (m³)</label>
                  <input type="number" min={0} step={0.01}
                    value={cbmCapacity}
                    onChange={e => setCbmCapacity(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>

                {/* Utilization bar */}
                {cbmCapacity > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Utilization</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {((rackData?.cbmUsed ?? 0) / cbmCapacity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          ((rackData?.cbmUsed ?? 0) / cbmCapacity) >= 0.9 ? 'bg-red-500' :
                          ((rackData?.cbmUsed ?? 0) / cbmCapacity) >= 0.7 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(((rackData?.cbmUsed ?? 0) / cbmCapacity) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || loading}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Dimensions'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// RACK MAP MODAL
// ═══════════════════════════════════════════════════════════════

function RackMapModal({
  racks,
  onClose,
}: {
  racks: Rack[];
  onClose: () => void;
}) {
  // Group racks by zone
  const zones = useMemo(() => {
    const grouped: Record<string, Rack[]> = {}
    racks.forEach(rack => {
      const z = rack.zone || 'Unzoned'
      if (!grouped[z]) grouped[z] = []
      grouped[z].push(rack)
    })
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [racks])

  const statusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600'
      case 'partial': return 'bg-amber-400 hover:bg-amber-500'
      case 'full': return 'bg-red-500 hover:bg-red-600'
      case 'maintenance': return 'bg-purple-500 hover:bg-purple-600'
      default: return 'bg-gray-400 hover:bg-gray-500'
    }
  }

  const legendItems = [
    { color: 'bg-green-500', label: 'Available' },
    { color: 'bg-amber-400', label: 'Partial' },
    { color: 'bg-red-500', label: 'Full' },
    { color: 'bg-purple-500', label: 'Maintenance' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Warehouse Map" subtitle={`${racks.length} racks · Color-coded by status`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Legend:</span>
              {legendItems.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={cn('w-3 h-3 rounded-sm', item.color)} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Warehouse map grid */}
            <div className="space-y-6">
              {zones.length === 0 ? (
                <div className="text-center py-12">
                  <Map className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No racks to display on the map</p>
                </div>
              ) : (
                zones.map(([zone, zoneRacks]: [string, Rack[]]) => (
                  <div key={zone}>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Zone: {zone}</h3>
                      <span className="text-xs text-gray-400">({zoneRacks.length} racks)</span>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                      {zoneRacks.map((rack: Rack) => (
                        <div
                          key={rack.id}
                          className={cn(
                            'aspect-square rounded-md flex items-center justify-center text-[8px] font-bold text-white cursor-pointer transition-all relative group',
                            statusColor(rack.status)
                          )}
                          title={`${rack.code}: ${getStatusLabel(rack.status)} (${rack.capacityUsed ?? 0}/${rack.capacityTotal ?? 0})`}
                        >
                          <span className="leading-tight text-center px-0.5">{rack.code}</span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                            <div className="bg-gray-900 dark:bg-gray-700 text-white text-[9px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                              <p className="font-semibold">{rack.code}</p>
                              <p>{getStatusLabel(rack.status)}</p>
                              <p>Items: {rack.capacityUsed ?? 0}/{rack.capacityTotal ?? 0}</p>
                              {rack.cbmCapacity ? <p>CBM: {(rack.cbmUsed ?? 0).toFixed(1)}/{(rack.cbmCapacity ?? 0).toFixed(1)}</p> : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Close</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

function DeleteConfirmModal({
  rack,
  onClose,
  onDeleted,
}: {
  rack: Rack;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await racksAPI.delete(rack.id)
      onDeleted()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete rack')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Delete Rack</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Are you sure you want to delete this rack?
            </p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mb-4">
              {rack.code} — {rack.name || 'No name'}
            </p>
            {error && (
              <div className="p-2 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            <p className="text-xs text-red-600 dark:text-red-400 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onClose} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN RACKS PAGE
// ═══════════════════════════════════════════════════════════════

export default function RacksPage() {
  const [racks, setRacks] = useState<Rack[]>([])
  const [categories, setCategories] = useState<RackCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [editRack, setEditRack] = useState<Rack | null>(null)
  const [deleteRack, setDeleteRack] = useState<Rack | null>(null)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [dimensionRack, setDimensionRack] = useState<Rack | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [racksRes, catsRes] = await Promise.all([
        racksAPI.getAll(),
        racksAPI.getCategories(),
      ])
      setRacks(racksRes.racks || [])
      setCategories(catsRes.categories || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load racks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter racks
  const filteredRacks = useMemo(() => {
    let result = [...racks]

    // Search filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(r =>
        r.code.toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.zone || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(r => r.status === statusFilter.toLowerCase())
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter(r => r.category === categoryFilter)
    }

    return result
  }, [racks, debouncedSearch, statusFilter, categoryFilter])

  // Unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set(racks.map(r => r.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [racks])

  // Stats
  const stats = useMemo(() => {
    const total = racks.length
    const available = racks.filter(r => r.status === 'available').length
    const full = racks.filter(r => r.status === 'full').length
    const maintenance = racks.filter(r => r.status === 'maintenance').length
    const partial = racks.filter(r => r.status === 'partial').length
    return { total, available, full, maintenance, partial }
  }, [racks])

  // Handlers
  const handleEdit = (rack: Rack) => {
    setEditRack(rack)
    setShowCreate(true)
  }

  const handleDelete = async (rack: Rack) => {
    setDeleteRack(rack)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Racks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage warehouse racking, storage capacity, and dimensions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMap(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Map className="w-4 h-4" /> Map
          </button>
          <button onClick={() => setShowBulkAdd(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Package className="w-4 h-4" /> Bulk Add
          </button>
          <button onClick={() => { setEditRack(null); setShowCreate(true) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Rack
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS ROW
         ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Available</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">{stats.available}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partial</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.partial}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">{stats.full}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-900/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Maint.</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.maintenance}</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SEARCH + FILTERS + VIEW TOGGLE
         ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search by code, name, zone, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer">
          {STATUS_FILTERS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Category filter */}
        {uniqueCategories.length > 0 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer">
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          <button onClick={() => setViewMode('grid')}
            className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('table')}
            className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CONTENT
         ═══════════════════════════════════════════════════════ */}
      {loading ? <PageLoader /> : error ? <PageError message={error} onRetry={fetchData} /> : (
        <>
          {filteredRacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Ruler className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-1">No racks found</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                {debouncedSearch || statusFilter !== 'All' || categoryFilter
                  ? 'Try different search or filter criteria'
                  : 'Create your first rack to get started'}
              </p>
              {!debouncedSearch && statusFilter === 'All' && !categoryFilter && (
                <button onClick={() => { setEditRack(null); setShowCreate(true) }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                  <Plus className="w-4 h-4" /> New Rack
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // ── GRID VIEW ──────────────────────────────────
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRacks.map(rack => (
                <RackCard
                  key={rack.id}
                  rack={rack}
                  onEdit={() => handleEdit(rack)}
                  onDelete={() => setDeleteRack(rack)}
                  onManageDimensions={() => setDimensionRack(rack)}
                />
              ))}
            </div>
          ) : (
            // ── TABLE VIEW ─────────────────────────────────
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="text-left py-3 px-3">Rack</th>
                    <th className="text-left py-3 px-3">Zone</th>
                    <th className="text-left py-3 px-3">Category</th>
                    <th className="text-left py-3 px-3">Capacity</th>
                    <th className="text-left py-3 px-3">CBM</th>
                    <th className="text-left py-3 px-3">Location</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-left py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRacks.map(rack => (
                    <RackTableRow
                      key={rack.id}
                      rack={rack}
                      onEdit={() => handleEdit(rack)}
                      onDelete={() => setDeleteRack(rack)}
                      onManageDimensions={() => setDimensionRack(rack)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════════ */}

      {/* Create / Edit Modal */}
      {showCreate && (
        <CreateEditRackModal
          rack={editRack}
          categories={categories}
          onClose={() => { setShowCreate(false); setEditRack(null) }}
          onSaved={fetchData}
        />
      )}

      {/* Delete Confirmation */}
      {deleteRack && (
        <DeleteConfirmModal
          rack={deleteRack}
          onClose={() => setDeleteRack(null)}
          onDeleted={fetchData}
        />
      )}

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <BulkAddRackModal
          categories={categories}
          onClose={() => setShowBulkAdd(false)}
          onSaved={fetchData}
        />
      )}

      {/* Rack Map Modal */}
      {showMap && (
        <RackMapModal
          racks={racks}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Dimension Manager Modal */}
      {dimensionRack && (
        <DimensionRackManager
          rack={dimensionRack}
          onClose={() => setDimensionRack(null)}
        />
      )}
    </div>
  )
}

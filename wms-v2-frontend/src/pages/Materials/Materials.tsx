// ═══════════════════════════════════════════════════════════════
// WMS v2 — Materials Page (Complete)
// Tabs: Dashboard | Inventory | Purchase Orders | Reports | Approvals
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Search, X, Filter, Clock, AlertTriangle, Package,
  DollarSign, Layers, TrendingUp, TrendingDown, RefreshCw,
  ClipboardList, ShoppingCart, FileText, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Eye, Edit3, Trash2, Loader2,
  AlertCircle, BarChart3, PieChart, Calendar, Box, Truck,
  Building2, Hash, MapPin, Tag, Percent, Activity,
  ArrowUpDown, Download, Ban,
} from 'lucide-react'
import { materialsAPI } from '../../api/client'
import type { Material, PurchaseOrder, MaterialIssue, MaterialReturn, MaterialApproval } from '../../api/types'
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type MaterialTab = 'dashboard' | 'inventory' | 'purchase-orders' | 'reports' | 'approvals'

interface TabDef {
  id: MaterialTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle },
]

interface MaterialFormData {
  name: string
  code: string
  sku: string
  category: string
  unit: string
  quantity: number
  minStock: number
  maxStock: number
  cost: number
  location: string
}

const emptyMaterialForm: MaterialFormData = {
  name: '',
  code: '',
  sku: '',
  category: '',
  unit: 'pcs',
  quantity: 0,
  minStock: 0,
  maxStock: 0,
  cost: 0,
  location: '',
}

interface POFormData {
  supplier: string
  items: { materialId: string; name: string; quantity: number; unitPrice: number }[]
  notes: string
}

const emptyPOForm: POFormData = {
  supplier: '',
  items: [],
  notes: '',
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

function StatCard({ icon, label, value, sub, subClass, valueClass }: { icon: React.ReactNode; label: string; value: string; sub?: string; subClass?: string; valueClass?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={cn('text-xl font-bold text-gray-900 dark:text-white mt-0.5', valueClass)}>{value}</p>
        {sub && <p className={cn('text-[11px] mt-0.5', subClass || 'text-gray-500 dark:text-gray-400')}>{sub}</p>}
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading materials data...</p>
      </div>
    </div>
  )
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load materials</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{message}</p>
        <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT MATERIAL MODAL
// ═══════════════════════════════════════════════════════════════

function CreateEditMaterialModal({
  material,
  onClose,
  onSaved,
}: {
  material?: Material | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!material
  const [form, setForm] = useState<MaterialFormData>(() => ({
    name: material?.name || '',
    code: material?.code || '',
    sku: material?.sku || '',
    category: material?.category || '',
    unit: material?.unit || 'pcs',
    quantity: material?.quantity ?? 0,
    minStock: material?.minStock ?? 0,
    maxStock: material?.maxStock ?? 0,
    cost: material?.cost ?? 0,
    location: material?.location || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await materialsAPI.update(material!.id, form)
      } else {
        await materialsAPI.create(form)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save material')
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
            title={isEdit ? 'Edit Material' : 'Add Material'}
            subtitle={isEdit ? `Updating ${material?.name}` : 'Add a new material to inventory'}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name *</label>
                <input type="text" placeholder="e.g. Steel Rod 12mm"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Code</label>
                <input type="text" placeholder="e.g. MT-001"
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
                <input type="text" placeholder="e.g. SKU-001"
                  value={form.sku}
                  onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                <input type="text" placeholder="e.g. Raw Materials"
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                <select value={form.unit}
                  onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="m">Meters (m)</option>
                  <option value="m²">Square Meters (m²)</option>
                  <option value="m³">Cubic Meters (m³)</option>
                  <option value="L">Liters (L)</option>
                  <option value="box">Box</option>
                  <option value="roll">Roll</option>
                  <option value="sheet">Sheet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
                <input type="text" placeholder="e.g. Warehouse A, Shelf 3"
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
            </div>

            {/* Stock & Cost section */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Stock & Cost</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                  <input type="number" min={0}
                    value={form.quantity}
                    onChange={e => setForm(prev => ({ ...prev, quantity: Math.max(0, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Cost</label>
                  <input type="number" min={0} step={0.01}
                    value={form.cost}
                    onChange={e => setForm(prev => ({ ...prev, cost: Math.max(0, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Stock Level</label>
                  <input type="number" min={0}
                    value={form.minStock}
                    onChange={e => setForm(prev => ({ ...prev, minStock: Math.max(0, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Stock Level</label>
                  <input type="number" min={0}
                    value={form.maxStock}
                    onChange={e => setForm(prev => ({ ...prev, maxStock: Math.max(0, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : isEdit ? 'Update Material' : 'Add Material'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════

function DeleteConfirmModal({
  material,
  onClose,
  onDeleted,
}: {
  material: Material;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await materialsAPI.delete(material.id)
      onDeleted()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete material')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Material</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Are you sure you want to delete <strong className="text-gray-700 dark:text-gray-300">{material.name}</strong>?
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This action cannot be undone.</p>
            {error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
          <div className="px-6 pb-6 flex items-center justify-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE PURCHASE ORDER MODAL
// ═══════════════════════════════════════════════════════════════

function CreatePOModal({
  materials,
  onClose,
  onSaved,
}: {
  materials: Material[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<POFormData>({ ...emptyPOForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { materialId: '', name: '', quantity: 1, unitPrice: 0 }],
    }))
  }

  const removeItem = (idx: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }))
  }

  const updateItem = (idx: number, field: string, value: any) => {
    setForm(prev => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, items }
    })
  }

  const handleSubmit = async () => {
    if (!form.supplier.trim() || form.items.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await materialsAPI.createPurchaseOrder(form)
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create purchase order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Create Purchase Order" subtitle="Order materials from a supplier" onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier *</label>
              <input type="text" placeholder="e.g. ABC Supplies Co."
                value={form.supplier}
                onChange={e => setForm(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Order Items *</label>
                <button onClick={addItem} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              {form.items.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  No items added yet. Click "Add Item" to include materials.
                </p>
              )}
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <select value={item.materialId}
                          onChange={e => {
                            const mat = materials.find(m => m.id === e.target.value)
                            updateItem(idx, 'materialId', e.target.value)
                            updateItem(idx, 'name', mat?.name || '')
                            updateItem(idx, 'unitPrice', mat?.cost || 0)
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                          <option value="">Select material...</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.code || m.sku || '-'})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input type="number" min={1} placeholder="Qty"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                      </div>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} step={0.01} placeholder="Price"
                          value={item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', Math.max(0, Number(e.target.value)))}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                        <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <textarea rows={2} placeholder="Additional notes..."
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none" />
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.supplier.trim() || form.items.length === 0}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════════

function DashboardTab({
  materials,
  history,
  loading,
}: {
  materials: Material[];
  history: any[];
  loading: boolean;
}) {
  const totalMaterials = materials.length
  const lowStockItems = materials.filter(m => (m.quantity ?? 0) < (m.minStock ?? 0))
  const totalValue = materials.reduce((sum, m) => sum + ((m.quantity ?? 0) * (m.cost ?? 0)), 0)
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          label="Total Materials"
          value={String(totalMaterials)}
          sub={`In ${categories.length} categories`}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          label="Low Stock Items"
          value={String(lowStockItems.length)}
          valueClass="text-red-600 dark:text-red-400"
          sub={lowStockItems.length > 0 ? 'Needs immediate attention' : 'All stock levels healthy'}
          subClass={lowStockItems.length > 0 ? 'text-red-500' : 'text-green-500'}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />}
          label="Total Stock Value"
          value={formatCurrency(totalValue)}
        />
        <StatCard
          icon={<Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          label="Categories"
          value={String(categories.length)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Low Stock Alerts</h3>
            </div>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', lowStockItems.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')}>
              {lowStockItems.length} alert{lowStockItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">All materials have adequate stock levels</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[320px] overflow-y-auto">
              {lowStockItems.map(m => (
                <div key={m.id} className="p-3 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">Low</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>Stock: <strong className="text-red-600 dark:text-red-400">{m.quantity}</strong></span>
                      <span>Min: {m.minStock}</span>
                      {m.category && <span>{m.category}</span>}
                    </div>
                  </div>
                  <button className="ml-2 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Issues / Returns Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent material activity</p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto p-3 space-y-0">
              {history.slice(0, 20).map((entry: any, idx: number) => (
                <div key={entry.id || idx} className="flex items-start gap-3 py-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4 ml-2 relative">
                  <div className={cn(
                    "absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800",
                    entry.type === 'issue' ? 'bg-orange-400' :
                    entry.type === 'return' ? 'bg-green-400' : 'bg-blue-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.type === 'issue' ? (
                        <TrendingUp className="w-3 h-3 text-orange-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-green-500" />
                      )}
                      <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {entry.type === 'issue' ? 'Issued' : entry.type === 'return' ? 'Returned' : 'Updated'}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {entry.materialName || entry.materialId}
                      {entry.quantity ? ` — Qty: ${entry.quantity}` : ''}
                      {entry.jobId ? ` (Job: ${entry.jobId})` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Value Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Stock Value by Category</h3>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No categories found</p>
        ) : (
          <div className="space-y-3">
            {categories.map(cat => {
              const catMaterials = materials.filter(m => m.category === cat)
              const catValue = catMaterials.reduce((sum, m) => sum + ((m.quantity ?? 0) * (m.cost ?? 0)), 0)
              const pct = totalValue > 0 ? (catValue / totalValue) * 100 : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-32 truncate shrink-0">{cat}</span>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20 text-right shrink-0">{formatCurrency(catValue)}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10 text-right shrink-0">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: INVENTORY
// ═══════════════════════════════════════════════════════════════

function InventoryTab({
  materials,
  loading,
  onRefresh,
}: {
  materials: Material[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editMaterial, setEditMaterial] = useState<Material | null>(null)
  const [deleteMaterial, setDeleteMaterial] = useState<Material | null>(null)

  const categories = useMemo(() => [...new Set(materials.map(m => m.category).filter(Boolean))], [materials])

  const filtered = useMemo(() => {
    return materials.filter(m => {
      const matchSearch = !search || 
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.code?.toLowerCase().includes(search.toLowerCase()) ||
        m.sku?.toLowerCase().includes(search.toLowerCase())
      const matchCat = !categoryFilter || m.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [materials, search, categoryFilter])

  const getRowStyle = (material: Material) => {
    const qty = material.quantity ?? 0
    const min = material.minStock ?? 0
    if (min > 0 && qty < min) return 'bg-red-50 dark:bg-red-900/10 border-l-2 border-l-red-500'
    if (min > 0 && qty < min * 2) return 'bg-amber-50 dark:bg-amber-900/10 border-l-2 border-l-amber-500'
    return ''
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search by name, code, or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        {categories.length > 0 && (
          <select value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-w-[140px]">
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
        <button onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Material
        </button>
        <button onClick={onRefresh} className="p-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Available</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min Stock</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="text-center py-3 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {search || categoryFilter ? 'No materials match your filters' : 'No materials found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(m => (
                    <tr key={m.id} className={cn('border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm', getRowStyle(m))}>
                      <td className="py-3 px-3">
                        <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">{m.code || m.sku || '-'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{m.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{m.category || '—'}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{m.unit}</td>
                      <td className={cn('py-3 px-3 text-right text-sm font-semibold',
                        (m.minStock && m.quantity < m.minStock) ? 'text-red-600 dark:text-red-400' :
                        (m.minStock && m.quantity < m.minStock * 2) ? 'text-amber-600 dark:text-amber-400' :
                        'text-gray-900 dark:text-white'
                      )}>{m.quantity}</td>
                      <td className="py-3 px-3 text-right text-sm text-gray-700 dark:text-gray-300">{m.availableQuantity ?? m.quantity}</td>
                      <td className="py-3 px-3 text-right text-xs text-gray-500 dark:text-gray-400">{m.minStock ?? 0}</td>
                      <td className="py-3 px-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">{formatCurrency((m.quantity ?? 0) * (m.cost ?? 0))}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{m.location || '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditMaterial(m)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteMaterial(m)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            Showing {filtered.length} of {materials.length} materials
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <CreateEditMaterialModal onClose={() => setShowAddModal(false)} onSaved={onRefresh} />
      )}
      {editMaterial && (
        <CreateEditMaterialModal material={editMaterial} onClose={() => setEditMaterial(null)} onSaved={onRefresh} />
      )}
      {deleteMaterial && (
        <DeleteConfirmModal material={deleteMaterial} onClose={() => setDeleteMaterial(null)} onDeleted={onRefresh} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════

function PurchaseOrdersTab({
  materials,
  loading,
  onRefresh,
}: {
  materials: Material[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const PO_STATUSES = ['All', 'PENDING', 'APPROVED', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED']

  const loadOrders = async () => {
    setOrdersLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (statusFilter && statusFilter !== 'All') params.status = statusFilter
      const res = await materialsAPI.getPurchaseOrders(params)
      setOrders(res.purchaseOrders || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase orders')
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [statusFilter])

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await materialsAPI.update(id, { status: newStatus })
      await loadOrders()
    } catch (err: any) {
      setError(err?.message || 'Failed to update status')
    }
  }

  // Show loading while parent data is loading too
  const isLoading = ordersLoading && loading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {PO_STATUSES.map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s === 'All' ? '' : s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                (s === 'All' && !statusFilter) || statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              {s === 'All' ? 'All' : getStatusLabel(s)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Create Order
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <PageLoader />
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Purchase Orders</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {statusFilter ? `No orders with status "${getStatusLabel(statusFilter)}"` : 'Create your first purchase order'}
          </p>
          {!statusFilter && (
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Plus className="w-3 h-3" /> Create Order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(po => (
            <div key={po.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{po.orderNumber || `PO-${po.id.slice(0, 8)}`}</h4>
                    <StatusBadge status={po.status} />
                    {po.supplier && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {po.supplier}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(po.createdAt)}
                    </span>
                    {po.totalCost !== undefined && (
                      <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                        <DollarSign className="w-3 h-3" /> {formatCurrency(po.totalCost)}
                      </span>
                    )}
                    {po.items && (
                      <span className="flex items-center gap-1">
                        <Box className="w-3 h-3" /> {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {po.notes && (
                      <span className="text-gray-400 dark:text-gray-500 truncate max-w-[200px]">— {po.notes}</span>
                    )}
                  </div>
                </div>
                {/* Quick status actions */}
                {po.status === 'PENDING' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleStatusUpdate(po.id, 'APPROVED')}
                      className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600" title="Approve">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleStatusUpdate(po.id, 'CANCELLED')}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500" title="Cancel">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {po.status === 'APPROVED' && (
                  <button onClick={() => handleStatusUpdate(po.id, 'ORDERED')}
                    className="px-2.5 py-1 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shrink-0">
                    Mark Ordered
                  </button>
                )}
                {po.status === 'ORDERED' && (
                  <button onClick={() => handleStatusUpdate(po.id, 'RECEIVED')}
                    className="px-2.5 py-1 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shrink-0">
                    Mark Received
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePOModal materials={materials} onClose={() => setShowCreateModal(false)} onSaved={() => { loadOrders(); onRefresh() }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: REPORTS
// ═══════════════════════════════════════════════════════════════

function ReportsTab({
  materials,
  history,
  loading,
}: {
  materials: Material[];
  history: any[];
  loading: boolean;
}) {
  const [reportType, setReportType] = useState<'usage' | 'movement' | 'waste'>('usage')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredHistory = useMemo(() => {
    let items = [...history]
    if (startDate) items = items.filter(e => new Date(e.createdAt) >= new Date(startDate))
    if (endDate) items = items.filter(e => new Date(e.createdAt) <= new Date(endDate + 'T23:59:59'))
    return items
  }, [history, startDate, endDate])

  const usageByJob = useMemo(() => {
    const map: Record<string, { count: number; quantity: number }> = {}
    filteredHistory.filter(e => e.type === 'issue').forEach(e => {
      const key = e.jobId || 'Unknown Job'
      if (!map[key]) map[key] = { count: 0, quantity: 0 }
      map[key].count++
      map[key].quantity += e.quantity || 0
    })
    return Object.entries(map).sort((a, b) => b[1].quantity - a[1].quantity)
  }, [filteredHistory])

  const movementByDate = useMemo(() => {
    const map: Record<string, { issued: number; returned: number; net: number }> = {}
    filteredHistory.forEach(e => {
      const date = formatDate(e.createdAt)
      if (!map[date]) map[date] = { issued: 0, returned: 0, net: 0 }
      if (e.type === 'issue') { map[date].issued += e.quantity || 0; map[date].net -= e.quantity || 0 }
      else if (e.type === 'return') { map[date].returned += e.quantity || 0; map[date].net += e.quantity || 0 }
    })
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
  }, [filteredHistory])

  const wasteData = useMemo(() => {
    const items = filteredHistory.filter(e => e.type === 'return' && (e.quantityDamaged || 0) > 0)
    const totalDamaged = items.reduce((sum, e) => sum + (e.quantityDamaged || 0), 0)
    const byMaterial: Record<string, number> = {}
    items.forEach(e => {
      const name = e.materialName || e.materialId || 'Unknown'
      byMaterial[name] = (byMaterial[name] || 0) + (e.quantityDamaged || 0)
    })
    return { totalDamaged, byMaterial: Object.entries(byMaterial).sort((a, b) => b[1] - a[1]) }
  }, [filteredHistory])

  const REPORT_TABS = [
    { id: 'usage' as const, label: 'Material Usage', icon: TrendingUp },
    { id: 'movement' as const, label: 'Stock Movement', icon: ArrowUpDown },
    { id: 'waste' as const, label: 'Waste / Damage', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-4">
      {/* Report Type Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {REPORT_TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5',
              reportType === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <input type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <span className="text-xs text-gray-400">to</span>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <input type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate('') }}
            className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          {reportType === 'usage' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Material Usage by Job
              </h3>
              {usageByJob.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No usage data for the selected period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Job</th>
                        <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Issues</th>
                        <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByJob.map(([job, data]) => (
                        <tr key={job} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-2 px-2 text-xs text-gray-700 dark:text-gray-300 font-medium">{job}</td>
                          <td className="py-2 px-2 text-xs text-gray-500 dark:text-gray-400 text-right">{data.count}</td>
                          <td className="py-2 px-2 text-xs font-semibold text-gray-900 dark:text-white text-right">{data.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {reportType === 'movement' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-green-500" /> Stock Movement Over Time
              </h3>
              {movementByDate.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No movement data for the selected period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Issued</th>
                        <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Returned</th>
                        <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Net Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementByDate.map(([date, data]) => (
                        <tr key={date} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-2 px-2 text-xs text-gray-700 dark:text-gray-300">{date}</td>
                          <td className="py-2 px-2 text-xs text-orange-600 dark:text-orange-400 text-right">{data.issued}</td>
                          <td className="py-2 px-2 text-xs text-green-600 dark:text-green-400 text-right">{data.returned}</td>
                          <td className={cn('py-2 px-2 text-xs font-semibold text-right', data.net < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
                            {data.net > 0 ? '+' : ''}{data.net}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {reportType === 'waste' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Waste & Damage Report
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                  <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">Total Damaged</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{wasteData.totalDamaged}</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
                  <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase">Items with Waste</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">{wasteData.byMaterial.length}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                  <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">Total Returns</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{filteredHistory.filter(e => e.type === 'return').length}</p>
                </div>
              </div>
              {wasteData.byMaterial.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No waste/damage data for the selected period</p>
              ) : (
                <div className="space-y-2">
                  {wasteData.byMaterial.map(([name, qty]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 dark:text-gray-300 w-48 truncate">{name}</span>
                      <div className="flex-1 h-4 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${wasteData.totalDamaged > 0 ? (qty / wasteData.totalDamaged) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 text-right">{qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: APPROVALS
// ═══════════════════════════════════════════════════════════════

function ApprovalsTab({ loading }: { loading: boolean }) {
  const [approvals, setApprovals] = useState<MaterialApproval[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadApprovals = async () => {
    setApprovalsLoading(true)
    setError(null)
    try {
      const res = await materialsAPI.getApprovals({ status: 'PENDING' })
      setApprovals(res.approvals || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load approvals')
    } finally {
      setApprovalsLoading(false)
    }
  }

  useEffect(() => { loadApprovals() }, [])

  const handleAction = async (id: string, action: 'approved' | 'rejected', e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdatingId(id)
    try {
      await materialsAPI.approve(id, { status: action === 'approved' ? 'APPROVED' : 'REJECTED' })
      setApprovals(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} approval`)
    } finally {
      setUpdatingId(null)
    }
  }

  const isLoading = approvalsLoading && loading

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <button onClick={loadApprovals} disabled={approvalsLoading}
        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-1.5">
        <RefreshCw className={cn('w-3 h-3', approvalsLoading && 'animate-spin')} /> Refresh
      </button>

      {isLoading ? (
        <PageLoader />
      ) : approvals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Pending Approvals</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">All approvals have been processed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map(approval => (
            <div key={approval.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{approval.type?.replace(/_/g, ' ') || 'Approval Request'}</h4>
                    <StatusBadge status={approval.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    {approval.requestedBy && (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Requested by: {approval.requestedBy}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(approval.createdAt)}
                    </span>
                    {approval.notes && (
                      <span className="text-gray-400 dark:text-gray-500 truncate max-w-[200px]">— {approval.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleAction(approval.id, 'approved', e)}
                    disabled={updatingId === approval.id}
                    className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    {updatingId === approval.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={(e) => handleAction(approval.id, 'rejected', e)}
                    disabled={updatingId === approval.id}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    {updatingId === approval.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN MATERIALS PAGE
// ═══════════════════════════════════════════════════════════════

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<MaterialTab>('dashboard')
  const [materials, setMaterials] = useState<Material[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const matsRes = await materialsAPI.getAll()
      setMaterials(matsRes.materials || [])
      // Load history for the first material (or any materials)
      try {
        const firstId = matsRes.materials?.[0]?.id
        if (firstId) {
          const histRes = await materialsAPI.getHistory(firstId)
          setHistory(histRes.history || [])
        } else {
          setHistory([])
        }
      } catch {
        setHistory([])
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load materials data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materials</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track inventory, manage purchase orders, and control material stock
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && !loading && (
        <PageError message={error} onRetry={loadData} />
      )}

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'dashboard' && (
          <DashboardTab materials={materials} history={history} loading={loading} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab materials={materials} loading={loading} onRefresh={loadData} />
        )}
        {activeTab === 'purchase-orders' && (
          <PurchaseOrdersTab materials={materials} loading={loading} onRefresh={loadData} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab materials={materials} history={history} loading={loading} />
        )}
        {activeTab === 'approvals' && (
          <ApprovalsTab loading={loading} />
        )}
      </div>
    </div>
  )
}

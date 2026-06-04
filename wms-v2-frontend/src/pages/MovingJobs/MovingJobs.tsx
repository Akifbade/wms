// ═══════════════════════════════════════════════════════════════
// WMS v2 — Moving Jobs Page (Complete)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Search, X, Truck, MapPin, Calendar, User, DollarSign,
  Eye, Edit3, Trash2, FileText, Package, ClipboardList,
  Loader2, AlertCircle, RefreshCw, CheckCircle, Clock,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Upload,
  Download, Paperclip, BarChart3, TrendingUp, Building2,
  Filter, Ban, Check,
} from 'lucide-react'
import { jobsAPI, materialsAPI } from '../../api/client'
import type { MovingJob, JobMaterial } from '../../api/types'
import {
  formatDate, formatCurrency, getStatusColor, getStatusLabel, cn,
} from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

const JOB_STATUSES = ['All', 'ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'ON_HOLD'] as const
type JobStatus = typeof JOB_STATUSES[number]

interface JobFormData {
  jobNumber: string
  title: string
  clientName: string
  origin: string
  destination: string
  startDate: string
  endDate: string
  jobType: string
  assignedTo: string[]
  notes: string
}

const emptyForm: JobFormData = {
  jobNumber: '',
  title: '',
  clientName: '',
  origin: '',
  destination: '',
  startDate: '',
  endDate: '',
  jobType: 'MOVING',
  assignedTo: [],
  notes: '',
}

interface JobFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={cn('inline-flex items-center font-medium rounded-full whitespace-nowrap', sizeClass, getStatusColor(status))}>
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

function InfoItem({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
      <div className="text-gray-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className={cn('text-sm font-medium text-gray-900 dark:text-white truncate', valueClass)}>{value}</p>
      </div>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading jobs...</p>
      </div>
    </div>
  )
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load jobs</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{message}</p>
        <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, loading, danger = true }: {
  message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <AlertCircle className={cn('w-10 h-10 mx-auto mb-3', danger ? 'text-red-500' : 'text-blue-500')} />
        <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className={cn('px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-2',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700',
              loading && 'opacity-50')}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE / EDIT JOB MODAL
// ═══════════════════════════════════════════════════════════════

function JobFormModal({ job, onClose, onSave }: {
  job?: MovingJob | null
  onClose: () => void
  onSave: () => void
}) {
  const isEdit = !!job
  const [form, setForm] = useState<JobFormData>(() => ({
    jobNumber: job?.jobNumber || '',
    title: job?.title || '',
    clientName: job?.clientName || job?.customerName || '',
    origin: job?.origin || '',
    destination: job?.destination || '',
    startDate: job?.startDate ? job.startDate.slice(0, 10) : '',
    endDate: job?.endDate ? job.endDate.slice(0, 10) : '',
    jobType: job?.jobType || 'MOVING',
    assignedTo: job?.assignedTo || [],
    notes: job?.notes || '',
  }))
  const [saving, setSaving] = useState(false)
  const [staffInput, setStaffInput] = useState('')

  const handleChange = (field: keyof JobFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addStaff = () => {
    if (staffInput.trim() && !form.assignedTo.includes(staffInput.trim())) {
      handleChange('assignedTo', [...form.assignedTo, staffInput.trim()])
    }
    setStaffInput('')
  }

  const removeStaff = (idx: number) => {
    handleChange('assignedTo', form.assignedTo.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit && job) {
        await jobsAPI.update(job.id, form)
      } else {
        await jobsAPI.create(form)
      }
      onSave()
      onClose()
    } catch (err: any) {
      alert(err?.message || `Failed to ${isEdit ? 'update' : 'create'} job`)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors'
  const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <ModalHeader title={isEdit ? 'Edit Job' : 'Create New Job'} subtitle={isEdit ? `#${job?.jobNumber}` : undefined} onClose={onClose} />
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Job Number *</label>
              <input type="text" className={inputClass} value={form.jobNumber} onChange={e => handleChange('jobNumber', e.target.value)} required placeholder="e.g. MJ-001" />
            </div>
            <div>
              <label className={labelClass}>Job Type</label>
              <select className={inputClass} value={form.jobType} onChange={e => handleChange('jobType', e.target.value)}>
                <option value="MOVING">Moving</option>
                <option value="PACKING">Packing</option>
                <option value="STORAGE">Storage</option>
                <option value="TRANSPORT">Transport</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" className={inputClass} value={form.title} onChange={e => handleChange('title', e.target.value)} required placeholder="Job title" />
          </div>
          <div>
            <label className={labelClass}>Client Name</label>
            <input type="text" className={inputClass} value={form.clientName} onChange={e => handleChange('clientName', e.target.value)} placeholder="Client or customer name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Origin</label>
              <input type="text" className={inputClass} value={form.origin} onChange={e => handleChange('origin', e.target.value)} placeholder="Pickup location" />
            </div>
            <div>
              <label className={labelClass}>Destination</label>
              <input type="text" className={inputClass} value={form.destination} onChange={e => handleChange('destination', e.target.value)} placeholder="Delivery location" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" className={inputClass} value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" className={inputClass} value={form.endDate} onChange={e => handleChange('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Assigned Staff</label>
            <div className="flex gap-2 mb-2">
              <input type="text" className={inputClass} value={staffInput} onChange={e => setStaffInput(e.target.value)}
                placeholder="Staff name" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStaff())} />
              <button type="button" onClick={addStaff} className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0 transition-colors">Add</button>
            </div>
            {form.assignedTo.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.assignedTo.map((name, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                    <User className="w-3 h-3" />
                    {name}
                    <button type="button" onClick={() => removeStaff(idx)} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={cn(inputClass, 'resize-none')} rows={3} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </form>
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
          <button type="submit" disabled={saving} onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// JOB FILE MANAGER
// ═══════════════════════════════════════════════════════════════

function JobFileManager({ jobId }: { jobId: string }) {
  const [files, setFiles] = useState<JobFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await jobsAPI.getFiles(jobId)
      setFiles((res.files || []).map((f: any) => ({
        id: f.id || f._id,
        name: f.name || f.filename || 'file',
        url: f.url || f.path || '',
        size: f.size || 0,
        type: f.type || f.mimetype || '',
        createdAt: f.createdAt || '',
      })))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await jobsAPI.uploadFile(jobId, formData)
      await fetchFiles()
    } catch (err: any) {
      alert(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (fileId: string) => {
    try {
      // Use jobsAPI if it has a deleteFile method, otherwise use a generic delete
      await fetch(`/api/moving-jobs/${jobId}/files/${fileId}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch {
      alert('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Files ({files.length})</span>
        </div>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : files.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No files uploaded yet</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {file.url && (
                  <a href={file.url} target="_blank" rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-600 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => handleDelete(file.id)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// JOB MATERIALS MANAGER
// ═══════════════════════════════════════════════════════════════

function JobMaterialsManager({ jobId }: { jobId: string }) {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueMaterialId, setIssueMaterialId] = useState('')
  const [issueQty, setIssueQty] = useState(1)
  const [issueNotes, setIssueNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const res = await materialsAPI.getJobMaterials(jobId)
      setMaterials(res.materials || [])
    } catch {
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  const handleIssue = async () => {
    if (!issueMaterialId || issueQty <= 0) return
    setSaving(true)
    try {
      await materialsAPI.issue({
        jobId,
        materialId: issueMaterialId,
        quantity: issueQty,
        notes: issueNotes,
      })
      setShowIssueForm(false)
      setIssueMaterialId('')
      setIssueQty(1)
      setIssueNotes('')
      await fetchMaterials()
    } catch (err: any) {
      alert(err?.message || 'Failed to issue material')
    } finally {
      setSaving(false)
    }
  }

  const handleReturn = async (mat: any) => {
    const qtyUsed = prompt('Quantity used:', String(mat.quantityIssued || 0))
    if (qtyUsed === null) return
    const qtyGood = prompt('Quantity in good condition:', String(mat.quantityIssued || 0))
    if (qtyGood === null) return
    const qtyDamaged = prompt('Quantity damaged:', '0')
    if (qtyDamaged === null) return

    try {
      await materialsAPI.return({
        jobId,
        materialId: mat.materialId,
        issueId: mat.id,
        quantityUsed: Number(qtyUsed),
        quantityGood: Number(qtyGood),
        quantityDamaged: Number(qtyDamaged),
      })
      await fetchMaterials()
    } catch (err: any) {
      alert(err?.message || 'Failed to return material')
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Materials ({materials.length})</span>
        </div>
        <button onClick={() => setShowIssueForm(!showIssueForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Issue Material
        </button>
      </div>

      {showIssueForm && (
        <div className="p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 space-y-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">Issue Material to Job</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Material ID</label>
              <input type="text" className={inputClass} value={issueMaterialId} onChange={e => setIssueMaterialId(e.target.value)} placeholder="Material ID" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Quantity</label>
              <input type="number" min={1} className={inputClass} value={issueQty} onChange={e => setIssueQty(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">Notes</label>
            <input type="text" className={inputClass} value={issueNotes} onChange={e => setIssueNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowIssueForm(false)} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
            <button onClick={handleIssue} disabled={saving || !issueMaterialId}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg inline-flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saving ? 'Issuing...' : 'Issue'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : materials.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No materials issued yet</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {materials.map((mat: any) => (
            <div key={mat.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{mat.materialName || mat.materialId}</p>
                <p className="text-[10px] text-gray-400">Issued: {mat.quantityIssued} {mat.unit || 'units'}{mat.quantityUsed ? ` | Used: ${mat.quantityUsed}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {mat.quantityIssued > 0 && (
                  <button onClick={() => handleReturn(mat)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-green-600 transition-colors"
                    title="Return material">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// APPROVAL MANAGER
// ═══════════════════════════════════════════════════════════════

function ApprovalManager({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await materialsAPI.getApprovals()
      // Filter approvals related to this job - assuming approvals have a jobId or related fields
      const jobApprovals = (res.approvals || []).filter((a: any) => a.jobId === jobId || a.requestedBy === jobId)
      setApprovals(jobApprovals)
    } catch {
      setApprovals([])
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const handleApproval = async (id: string, status: string) => {
    setProcessingId(id)
    try {
      await materialsAPI.approve(id, { status, notes: `Approved via Moving Jobs page` })
      await fetchApprovals()
    } catch (err: any) {
      alert(err?.message || 'Failed to update approval')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <ModalHeader title="Material Approvals" subtitle={`Job: ${jobId.slice(0, 8)}...`} onClose={onClose} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No pending approvals</p>
            </div>
          ) : (
            approvals.map(a => (
              <div key={a.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.type || 'Material Request'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Status: {getStatusLabel(a.status)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {a.status === 'PENDING' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleApproval(a.id, 'APPROVED')} disabled={processingId === a.id}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg inline-flex items-center justify-center gap-1">
                      {processingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Approve
                    </button>
                    <button onClick={() => handleApproval(a.id, 'REJECTED')} disabled={processingId === a.id}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg inline-flex items-center justify-center gap-1">
                      {processingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                      Reject
                    </button>
                  </div>
                )}
                {a.status !== 'PENDING' && (
                  <p className="text-xs text-gray-400 mt-1">Processed: {formatDate(a.updatedAt || a.createdAt)}</p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// JOB REPORTS DASHBOARD
// ═══════════════════════════════════════════════════════════════

function JobReportsDashboard({ job }: { job: MovingJob }) {
  const totalCost = job.totalCost || 0
  const materials = job.materials || []
  const totalMaterialsCost = materials.reduce((sum, m) => sum + (m.quantityIssued || 0) * 0, 0) // cost info not in JobMaterial type
  const totalMaterialQty = materials.reduce((sum, m) => sum + (m.quantityIssued || 0), 0)

  return (
    <div className="space-y-3">
      <SectionDivider label="Cost Summary" />
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium">Total Cost</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalCost)}</p>
        </div>
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium">Job Status</p>
          <div className="mt-1"><StatusBadge status={job.status} /></div>
        </div>
      </div>

      <SectionDivider label="Material Usage Summary" />
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium">Total Materials</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{materials.length}</p>
        </div>
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium">Total Qty Issued</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{totalMaterialQty}</p>
        </div>
      </div>

      {materials.length > 0 && (
        <div className="space-y-1">
          {materials.map((m: JobMaterial) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-700 dark:text-gray-300">{m.materialName || m.materialId}</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">{m.quantityIssued} {m.unit || 'units'}</span>
            </div>
          ))}
        </div>
      )}

      <SectionDivider label="Timeline" />
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Start Date</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatDate(job.startDate || '')}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">End Date</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatDate(job.endDate || '')}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Created</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatDate(job.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY JOBS REPORT
// ═══════════════════════════════════════════════════════════════

function MonthlyJobsReport({ jobs, onClose }: { jobs: MovingJob[]; onClose: () => void }) {
  const months = useMemo(() => {
    const map = new Map<string, { count: number; totalCost: number; completed: number; pending: number; cancelled: number }>()
    jobs.forEach(job => {
      const date = job.createdAt || job.startDate || ''
      if (!date) return
      const key = date.slice(0, 7) // YYYY-MM
      const prev = map.get(key) || { count: 0, totalCost: 0, completed: 0, pending: 0, cancelled: 0 }
      prev.count++
      prev.totalCost += job.totalCost || 0
      if (job.status === 'COMPLETED') prev.completed++
      else if (job.status === 'CANCELLED') prev.cancelled++
      else prev.pending++
      map.set(key, prev)
    })
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [jobs])

  const totalJobs = jobs.length
  const totalRev = jobs.reduce((sum, j) => sum + (j.totalCost || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <ModalHeader title="Monthly Jobs Report" subtitle={`${totalJobs} jobs · ${formatCurrency(totalRev)} total`} onClose={onClose} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalJobs}</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-300 uppercase mt-0.5">Total Jobs</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalRev)}</p>
              <p className="text-[10px] text-green-500 dark:text-green-300 uppercase mt-0.5">Total Revenue</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{jobs.filter(j => j.status === 'COMPLETED').length}</p>
              <p className="text-[10px] text-green-500 dark:text-green-300 uppercase mt-0.5">Completed</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{jobs.filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED').length}</p>
              <p className="text-[10px] text-yellow-500 dark:text-yellow-300 uppercase mt-0.5">Active</p>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <SectionDivider label="Monthly Breakdown" />
          {months.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No data available</p>
          ) : (
            <div className="space-y-2">
              {months.map(([month, data]) => (
                <div key={month} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{month}</span>
                    <span className="text-xs text-gray-500">{data.count} jobs</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> {formatCurrency(data.totalCost)}</span>
                    <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {data.completed}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-500" /> {data.pending}</span>
                    <span className="inline-flex items-center gap-1"><Ban className="w-3 h-3 text-red-500" /> {data.cancelled}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                    {data.completed > 0 && <div className="h-full bg-green-500" style={{ width: `${(data.completed / data.count) * 100}%` }} />}
                    {data.pending > 0 && <div className="h-full bg-yellow-500" style={{ width: `${(data.pending / data.count) * 100}%` }} />}
                    {data.cancelled > 0 && <div className="h-full bg-red-500" style={{ width: `${(data.cancelled / data.count) * 100}%` }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// JOB DETAILS MODAL
// ═══════════════════════════════════════════════════════════════

function JobDetailsModal({ jobId, onClose, onEdit, onDelete }: {
  jobId: string
  onClose: () => void
  onEdit: (job: MovingJob) => void
  onDelete: (job: MovingJob) => void
}) {
  const [job, setJob] = useState<MovingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApprovals, setShowApprovals] = useState(false)
  const [showReports, setShowReports] = useState(false)

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await jobsAPI.getById(jobId)
        setJob(res.job)
      } catch (err: any) {
        setError(err?.message || 'Failed to load job details')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [jobId])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400">{error || 'Job not found'}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg">Close</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title={job.title || 'Job Details'} subtitle={`#${job.jobNumber}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Status & Actions */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <StatusBadge status={job.status} size="md" />
              <div className="flex gap-1.5">
                <button onClick={() => onEdit(job)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(job)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <InfoItem icon={<Building2 className="w-3.5 h-3.5" />} label="Client" value={job.clientName || job.customerName || '-'} />
              <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="Origin" value={job.origin || '-'} />
              <InfoItem icon={<MapPin className="w-3.5 h-3.5" />} label="Destination" value={job.destination || '-'} />
              <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label="Start Date" value={formatDate(job.startDate || '')} />
              <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label="End Date" value={formatDate(job.endDate || '')} />
              <InfoItem icon={<DollarSign className="w-3.5 h-3.5" />} label="Total Cost" value={formatCurrency(job.totalCost || 0)} />
              <InfoItem icon={<User className="w-3.5 h-3.5" />} label="Job Type" value={job.jobType || '-'} />
              <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={formatDate(job.createdAt)} />
              {job.assignedTo && job.assignedTo.length > 0 && (
                <InfoItem icon={<User className="w-3.5 h-3.5" />} label="Staff" value={`${job.assignedTo.length} assigned`} />
              )}
            </div>

            {/* Staff List */}
            {job.assignedTo && job.assignedTo.length > 0 && (
              <div>
                <SectionDivider label="Assigned Staff" />
                <div className="flex flex-wrap gap-1.5">
                  {job.assignedTo.map((name, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      <User className="w-3 h-3" />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <>
                <SectionDivider label="Notes" />
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{job.notes}</p>
              </>
            )}

            {/* Materials */}
            <SectionDivider label="Materials" />
            <JobMaterialsManager jobId={job.id} />

            {/* Files */}
            <SectionDivider label="Files" />
            <JobFileManager jobId={job.id} />

            {/* Actions */}
            <SectionDivider label="Actions" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowApprovals(true)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <ClipboardList className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Approvals</span>
              </button>
              <button onClick={() => setShowReports(true)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showApprovals && <ApprovalManager jobId={job.id} onClose={() => setShowApprovals(false)} />}
      {showReports && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReports(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl pointer-events-auto" onClick={e => e.stopPropagation()}>
            <ModalHeader title="Job Reports" subtitle={`#${job.jobNumber}`} onClose={() => setShowReports(false)} />
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <JobReportsDashboard job={job} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function MovingJobsPage() {
  const [jobs, setJobs] = useState<MovingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editJob, setEditJob] = useState<MovingJob | null>(null)
  const [detailsJobId, setDetailsJobId] = useState<string | null>(null)
  const [deleteJob, setDeleteJob] = useState<MovingJob | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showMonthlyReport, setShowMonthlyReport] = useState(false)

  // ─── Data Fetching ───────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search.trim()) params.search = search.trim()
      const res = await jobsAPI.getAll(params)
      setJobs(res.jobs || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => fetchJobs(), 300)
    return () => clearTimeout(timer)
  }, [fetchJobs])

  // ─── CRUD Operations ─────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteJob) return
    setDeleting(true)
    try {
      await jobsAPI.delete(deleteJob.id)
      setJobs(prev => prev.filter(j => j.id !== deleteJob.id))
      setDeleteJob(null)
      setDetailsJobId(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete job')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = () => {
    fetchJobs()
  }

  // ─── Filtered Jobs ───────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let list = jobs
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(j =>
        j.jobNumber?.toLowerCase().includes(q) ||
        j.title?.toLowerCase().includes(q) ||
        j.clientName?.toLowerCase().includes(q) ||
        j.customerName?.toLowerCase().includes(q) ||
        j.origin?.toLowerCase().includes(q) ||
        j.destination?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'All') {
      list = list.filter(j => j.status === statusFilter)
    }
    return list
  }, [jobs, search, statusFilter])

  const totalRevenue = jobs.reduce((sum, j) => sum + (j.totalCost || 0), 0)
  const activeJobs = jobs.filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED').length
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moving Jobs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {jobs.length} jobs · {activeJobs} active · {completedJobs} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMonthlyReport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <BarChart3 className="w-4 h-4" />
            Monthly Report
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Jobs</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{jobs.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{activeJobs}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{completedJobs}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Revenue</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by job number, title, client, location..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {JOB_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}>
              {s === 'All' ? 'All' : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <PageLoader />
      ) : error ? (
        <PageError message={error} onRetry={fetchJobs} />
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No moving jobs found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {search || statusFilter !== 'All'
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first moving job'}
          </p>
          {!search && statusFilter === 'All' && (
            <button onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Create First Job
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map(job => (
            <div key={job.id}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
              onClick={() => setDetailsJobId(job.id)}>
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500">#{job.jobNumber}</p>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">{job.title}</h3>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                {/* Client */}
                {(job.clientName || job.customerName) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="truncate">{job.clientName || job.customerName}</span>
                  </div>
                )}

                {/* Route */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{job.origin || '?'}</span>
                  <ChevronRight className="w-3 h-3 shrink-0 text-gray-300 dark:text-gray-600" />
                  <span className="truncate">{job.destination || '?'}</span>
                </div>

                {/* Dates & Cost */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(job.startDate || job.createdAt)}</span>
                    {job.endDate && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">→</span>
                        <span>{formatDate(job.endDate)}</span>
                      </>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(job.totalCost || 0)}</span>
                </div>

                {/* Assigned Staff */}
                {job.assignedTo && job.assignedTo.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {job.assignedTo.map((name, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions bar */}
              <div className="flex border-t border-gray-100 dark:border-gray-700 divide-x divide-gray-100 dark:divide-gray-700">
                <button onClick={e => { e.stopPropagation(); setDetailsJobId(job.id) }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={e => { e.stopPropagation(); setEditJob(job) }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={e => { e.stopPropagation(); setDeleteJob(job) }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modals ───────────────────────────────────────── */}
      {showCreateModal && (
        <JobFormModal onClose={() => setShowCreateModal(false)} onSave={handleSave} />
      )}

      {editJob && (
        <JobFormModal job={editJob} onClose={() => setEditJob(null)} onSave={handleSave} />
      )}

      {detailsJobId && (
        <JobDetailsModal
          jobId={detailsJobId}
          onClose={() => setDetailsJobId(null)}
          onEdit={(job) => { setDetailsJobId(null); setEditJob(job) }}
          onDelete={(job) => { setDetailsJobId(null); setDeleteJob(job) }}
        />
      )}

      {deleteJob && (
        <ConfirmDialog
          message={`Are you sure you want to delete job "${deleteJob.title || deleteJob.jobNumber}"? This action cannot be undone.`}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteJob(null)}
        />
      )}

      {showMonthlyReport && (
        <MonthlyJobsReport jobs={jobs} onClose={() => setShowMonthlyReport(false)} />
      )}
    </div>
  )
}

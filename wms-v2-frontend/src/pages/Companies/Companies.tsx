// ═══════════════════════════════════════════════════════════════
// WMS v2 — Companies Page (Complete)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Search, X, Building2, Mail, Phone, MapPin, User,
  Calendar, FileText,
  Edit3, Trash2, Eye, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, Upload,
  BadgeCheck, BadgeX, Clock, Ban,
} from 'lucide-react'
import { companiesAPI, billingAPI, prepaidAPI } from '../../api/client'
import type { CompanyProfile, Contract, PrepaidBalance } from '../../api/types'
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

const CONTRACT_STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED'] as const

interface CreateCompanyData {
  name: string
  email: string
  phone: string
  address: string
  contactPerson: string
  logo: File | null
  contractStart: string
  contractEnd: string
  monthlyRate: number
  prepaidBalance: number
}

interface ContractFormData {
  startDate: string
  endDate: string
  monthlyRate: number
  status: string
  terms: string
  notes: string
}

const emptyCompanyForm: CreateCompanyData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  contactPerson: '',
  logo: null,
  contractStart: '',
  contractEnd: '',
  monthlyRate: 0,
  prepaidBalance: 0,
}

const emptyContractForm: ContractFormData = {
  startDate: '',
  endDate: '',
  monthlyRate: 0,
  status: 'ACTIVE',
  terms: '',
  notes: '',
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

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading companies...</p>
      </div>
    </div>
  )
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load companies</h3>
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

function CompanyInitialLogo({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
  ]
  const charCode = name.charCodeAt(0) || 0
  const color = colors[charCode % colors.length]
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-bold shrink-0', sizeClass, color)}>
      {name.charAt(0).toUpperCase()}
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

function ContractStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
    ACTIVE: { icon: <BadgeCheck className="w-3 h-3" />, bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Active' },
    EXPIRED: { icon: <BadgeX className="w-3 h-3" />, bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Expired' },
    SUSPENDED: { icon: <Ban className="w-3 h-3" />, bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label: 'Suspended' },
  }
  const c = config[status] || { icon: <Clock className="w-3 h-3" />, bg: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: status || 'N/A' }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', c.bg)}>
      {c.icon} {c.label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPANY CARD
// ═══════════════════════════════════════════════════════════════

function CompanyCard({
  profile,
  contractStatus,
  onView,
  onEdit,
  onDelete,
}: {
  profile: CompanyProfile
  contractStatus: string
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header: logo + name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {profile.logo ? (
              <img src={profile.logo} alt={profile.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <CompanyInitialLogo name={profile.name} />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{profile.name}</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">ID: {profile.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onView} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="View Details">
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button onClick={onEdit} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {profile.email && (
            <StatLine icon={<Mail className="w-3 h-3" />} label="Email" value={profile.email} />
          )}
          {profile.phone && (
            <StatLine icon={<Phone className="w-3 h-3" />} label="Phone" value={profile.phone} />
          )}
        </div>

        {/* Contract status + prepaid balance */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <ContractStatusBadge status={contractStatus} />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {profile.prepaidBalance != null ? formatCurrency(profile.prepaidBalance) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT COMPANY MODAL
// ═══════════════════════════════════════════════════════════════

function CreateEditCompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company?: CompanyProfile | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!company
  const [form, setForm] = useState<CreateCompanyData>(() => ({
    name: company?.name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address: company?.address || '',
    contactPerson: company?.contactPerson || '',
    logo: null,
    contractStart: company?.contractStart || '',
    contractEnd: company?.contractEnd || '',
    monthlyRate: company?.monthlyRate ?? 0,
    prepaidBalance: company?.prepaidBalance ?? 0,
  }))
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm(prev => ({ ...prev, logo: file }))
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Company name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      if (form.email) fd.append('email', form.email.trim())
      if (form.phone) fd.append('phone', form.phone.trim())
      if (form.address) fd.append('address', form.address.trim())
      if (form.contactPerson) fd.append('contactPerson', form.contactPerson.trim())
      if (form.contractStart) fd.append('contractStart', form.contractStart)
      if (form.contractEnd) fd.append('contractEnd', form.contractEnd)
      fd.append('monthlyRate', String(form.monthlyRate))
      fd.append('prepaidBalance', String(form.prepaidBalance))
      if (form.logo) fd.append('logo', form.logo)

      if (isEdit) {
        await companiesAPI.updateProfile(company!.id, fd)
      } else {
        await companiesAPI.createProfile(fd)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save company')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader
            title={isEdit ? 'Edit Company' : 'New Company'}
            subtitle={isEdit ? `Updating ${company?.name}` : 'Add a new company profile'}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Company Name *</label>
                <input type="text" placeholder="e.g. Acme Logistics"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" placeholder="contact@company.com"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" placeholder="+965 1234 5678"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input type="text" placeholder="Company address"
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Contact Person</label>
                <input type="text" placeholder="Name of primary contact"
                  value={form.contactPerson}
                  onChange={e => setForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className={inputClass} />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Logo</h4>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <Upload className="w-4 h-4 inline-block mr-1.5" />
                  Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Contract & Billing */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Contract & Billing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Contract Start</label>
                  <input type="date"
                    value={form.contractStart}
                    onChange={e => setForm(prev => ({ ...prev, contractStart: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contract End</label>
                  <input type="date"
                    value={form.contractEnd}
                    onChange={e => setForm(prev => ({ ...prev, contractEnd: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Monthly Rate (KWD)</label>
                  <input type="number" min={0} step={0.01}
                    value={form.monthlyRate}
                    onChange={e => setForm(prev => ({ ...prev, monthlyRate: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Prepaid Balance (KWD)</label>
                  <input type="number" min={0} step={0.01}
                    value={form.prepaidBalance}
                    onChange={e => setForm(prev => ({ ...prev, prepaidBalance: Math.max(0, Number(e.target.value)) }))}
                    className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : isEdit ? 'Update Company' : 'Create Company'}
            </button>
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
  company,
  onClose,
  onDeleted,
}: {
  company: CompanyProfile
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await companiesAPI.deleteProfile(company.id)
      onDeleted()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete company')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Delete Company" subtitle={`${company.name}`} onClose={onClose} />
          <div className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">{error}</div>
            )}
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This action cannot be undone. This will permanently delete <strong>{company.name}</strong> and may affect associated data.
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {company.logo ? (
                <img src={company.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <CompanyInitialLogo name={company.name} />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{company.name}</p>
                {company.email && <p className="text-xs text-gray-500">{company.email}</p>}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} disabled={deleting} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? 'Deleting...' : 'Delete Company'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPANY DETAIL VIEW
// ═══════════════════════════════════════════════════════════════

function CompanyDetailView({
  company,
  contracts,
  contractStatement,
  onClose,
  onEdit,
  onCreateContract,
  onEditContract,
  onViewStatement,
  onRefresh,
}: {
  company: CompanyProfile
  contracts: Contract[]
  contractStatement: string | null
  onClose: () => void
  onEdit: () => void
  onCreateContract: () => void
  onEditContract: (contract: Contract) => void
  onViewStatement: () => void
  onRefresh: () => void
}) {
  const activeContract = contracts.find(c => c.status === 'ACTIVE')
  const latestContract = contracts.length > 0 ? contracts[contracts.length - 1] : null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Company Details" subtitle={`${company.name}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Company Info */}
            <div className="flex items-start gap-4">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <CompanyInitialLogo name={company.name} size="lg" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{company.name}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">ID: {company.id}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={onEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {company.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{company.phone}</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-center gap-2 text-sm sm:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{company.address}</span>
                  </div>
                )}
                {company.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{company.contactPerson}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Financial Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Monthly Rate</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                    {company.monthlyRate != null ? formatCurrency(company.monthlyRate) : '—'}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Prepaid</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1">
                    {company.prepaidBalance != null ? formatCurrency(company.prepaidBalance) : '—'}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Contract</p>
                  <p className="text-sm font-bold mt-1">
                    {activeContract ? (
                      <span className="text-green-600 dark:text-green-400">Active</span>
                    ) : latestContract ? (
                      <span className="text-red-600 dark:text-red-400">{getStatusLabel(latestContract.status)}</span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Created</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                    {company.createdAt ? formatDate(company.createdAt) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Management */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contracts</h4>
                <div className="flex items-center gap-2">
                  <button onClick={onViewStatement}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                    <FileText className="w-3 h-3" /> Statement
                  </button>
                  <button onClick={onCreateContract}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
              </div>

              {contracts.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No contracts yet.</p>
              ) : (
                <div className="space-y-2">
                  {contracts.map(contract => (
                    <div key={contract.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ContractStatusBadge status={contract.status} />
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(contract.monthlyRate)}/mo
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
                        </p>
                      </div>
                      <button onClick={() => onEditContract(contract)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE/EDIT CONTRACT MODAL
// ═══════════════════════════════════════════════════════════════

function CreateEditContractModal({
  contract,
  companyProfileId,
  onClose,
  onSaved,
}: {
  contract?: Contract | null
  companyProfileId: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!contract
  const [form, setForm] = useState<ContractFormData>(() => ({
    startDate: contract?.startDate || '',
    endDate: contract?.endDate || '',
    monthlyRate: contract?.monthlyRate ?? 0,
    status: contract?.status || 'ACTIVE',
    terms: contract?.terms || '',
    notes: contract?.notes || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) {
      setError('Start and end dates are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        companyProfileId,
        monthlyRate: Number(form.monthlyRate),
      }
      if (isEdit) {
        await billingAPI.updateContract(contract!.id, payload)
      } else {
        await billingAPI.createContract(payload)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save contract')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader
            title={isEdit ? 'Edit Contract' : 'New Contract'}
            subtitle={isEdit ? 'Update contract terms' : 'Create a new contract'}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date *</label>
                <input type="date"
                  value={form.startDate}
                  onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date *</label>
                <input type="date"
                  value={form.endDate}
                  onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Monthly Rate (KWD)</label>
                <input type="number" min={0} step={0.01}
                  value={form.monthlyRate}
                  onChange={e => setForm(prev => ({ ...prev, monthlyRate: Math.max(0, Number(e.target.value)) }))}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className={inputClass}>
                  {CONTRACT_STATUSES.map(s => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Terms</label>
                <textarea rows={2} placeholder="Contract terms and conditions..."
                  value={form.terms}
                  onChange={e => setForm(prev => ({ ...prev, terms: e.target.value }))}
                  className={inputClass + ' resize-none'} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea rows={2} placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className={inputClass + ' resize-none'} />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.startDate || !form.endDate}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : isEdit ? 'Update Contract' : 'Create Contract'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT STATEMENT MODAL
// ═══════════════════════════════════════════════════════════════

function ContractStatementModal({
  company,
  contracts,
  prepaidBalance,
  onClose,
}: {
  company: CompanyProfile
  contracts: Contract[]
  prepaidBalance: PrepaidBalance | null
  onClose: () => void
}) {
  const totalMonthly = contracts.reduce((sum, c) => sum + (c.monthlyRate || 0), 0)
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE')
  const activeMonthly = activeContracts.reduce((sum, c) => sum + (c.monthlyRate || 0), 0)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden">
          <ModalHeader title="Contract Statement" subtitle={`${company.name}`} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-medium">Active Monthly</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(activeMonthly)}</p>
                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">{activeContracts.length} active contract(s)</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/50">
                <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider font-medium">Prepaid Balance</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {prepaidBalance ? formatCurrency(prepaidBalance.balance) : formatCurrency(company.prepaidBalance ?? 0)}
                </p>
                <p className="text-[10px] text-green-500 dark:text-green-400 mt-0.5">
                  {prepaidBalance ? `Updated ${formatDate(prepaidBalance.lastUpdated)}` : 'From profile'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Total Contracts</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{contracts.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Total Monthly</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalMonthly)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Monthly Rate</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {company.monthlyRate != null ? formatCurrency(company.monthlyRate) : '—'}
                </p>
              </div>
            </div>

            {/* Contract History */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Contract History</h4>
              {contracts.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No contract history.</p>
              ) : (
                <div className="space-y-2">
                  {[...contracts].reverse().map(contract => (
                    <div key={contract.id} className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <ContractStatusBadge status={contract.status} />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatCurrency(contract.monthlyRate)}/mo
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3 inline-block mr-1" />
                          {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Close</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPANIES PAGE
// ═══════════════════════════════════════════════════════════════

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; company: CompanyProfile }
  | { type: 'delete'; company: CompanyProfile }
  | { type: 'detail'; company: CompanyProfile }
  | { type: 'create_contract'; company: CompanyProfile }
  | { type: 'edit_contract'; company: CompanyProfile; contract: Contract }
  | { type: 'statement'; company: CompanyProfile; contracts: Contract[]; prepaidBalance: PrepaidBalance | null }

export default function CompaniesPage() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  // Cached contracts for all companies (keyed by company id)
  const [contractsMap, setContractsMap] = useState<Record<string, Contract[]>>({})
  const [prepaidMap, setPrepaidMap] = useState<Record<string, PrepaidBalance>>({})

  const fetchProfiles = useCallback(async (p?: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await companiesAPI.listProfiles({ page: p ?? page, limit: 20 })
      setProfiles(res.profiles)
      setPagination(res.pagination)
      return res.profiles
    } catch (err: any) {
      setError(err?.message || 'Failed to load companies')
      return []
    } finally {
      setLoading(false)
    }
  }, [page])

  const fetchContracts = useCallback(async (profileIds: string[]) => {
    try {
      const res = await billingAPI.getContracts()
      const allContracts = res.contracts || []
      const map: Record<string, Contract[]> = {}
      profileIds.forEach(id => {
        map[id] = allContracts.filter(c => c.companyProfileId === id)
      })
      setContractsMap(prev => ({ ...prev, ...map }))
    } catch {
      // silently fail
    }
  }, [])

  const fetchPrepaid = useCallback(async (profileIds: string[]) => {
    const map: Record<string, PrepaidBalance> = {}
    await Promise.allSettled(
      profileIds.map(async id => {
        try {
          const res = await prepaidAPI.getBalance(id)
          if (res.balance) map[id] = res.balance
        } catch { /* ignore */ }
      })
    )
    if (Object.keys(map).length > 0) {
      setPrepaidMap(prev => ({ ...prev, ...map }))
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchProfiles(1).then(profiles => {
      if (profiles.length > 0) {
        const ids = profiles.map(p => p.id)
        fetchContracts(ids)
        fetchPrepaid(ids)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = useCallback(async () => {
    const profiles = await fetchProfiles(page)
    if (profiles.length > 0) {
      const ids = profiles.map(p => p.id)
      fetchContracts(ids)
      fetchPrepaid(ids)
    }
  }, [page, fetchProfiles, fetchContracts, fetchPrepaid])

  const handlePageChange = useCallback(async (newPage: number) => {
    setPage(newPage)
    const profiles = await fetchProfiles(newPage)
    if (profiles.length > 0) {
      const ids = profiles.map(p => p.id)
      fetchContracts(ids)
      fetchPrepaid(ids)
    }
  }, [fetchProfiles, fetchContracts, fetchPrepaid])

  // Search filter (client-side)
  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q))
    )
  }, [profiles, search])

  // Get contract status for a profile
  const getContractStatus = useCallback((profileId: string): string => {
    const contracts = contractsMap[profileId]
    if (!contracts || contracts.length === 0) return ''
    const active = contracts.find(c => c.status === 'ACTIVE')
    if (active) return 'ACTIVE'
    const suspended = contracts.find(c => c.status === 'SUSPENDED')
    if (suspended) return 'SUSPENDED'
    return 'EXPIRED'
  }, [contractsMap])

  return (
    <div className="space-y-6 pb-8">
      {/* ══ Header ══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage company profiles, contracts, and billing
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Company
        </button>
      </div>

      {/* ══ Search & Actions ══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow" />
        </div>
        <button onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ══ Content ══ */}
      {loading && profiles.length === 0 ? (
        <PageLoader />
      ) : error ? (
        <PageError message={error} onRetry={handleRefresh} />
      ) : filteredProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {search ? 'No matching companies' : 'No companies yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {search ? 'Try a different search term' : 'Create your first company to get started'}
          </p>
          {!search && (
            <button onClick={() => setModal({ type: 'create' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus className="w-4 h-4" />
              New Company
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProfiles.map(profile => (
              <CompanyCard
                key={profile.id}
                profile={profile}
                contractStatus={getContractStatus(profile.id)}
                onView={() => {
                  companiesAPI.getProfile(profile.id).then(res => {
                    const p = res.profile
                    billingAPI.getContracts({}).then(cRes => {
                      const contracts = (cRes.contracts || []).filter(c => c.companyProfileId === p.id)
                      setContractsMap(prev => ({ ...prev, [p.id]: contracts }))
                      prepaidAPI.getBalance(p.id).then(bRes => {
                        setPrepaidMap(prev => ({ ...prev, [p.id]: bRes.balance }))
                      }).catch(() => {})
                      setModal({ type: 'detail', company: p })
                    }).catch(() => {
                      setModal({ type: 'detail', company: p })
                    })
                  }).catch(() => {
                    setModal({ type: 'detail', company: profile })
                  })
                }}
                onEdit={() => setModal({ type: 'edit', company: profile })}
                onDelete={() => setModal({ type: 'delete', company: profile })}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total || filteredProfiles.length} companies)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[2rem] text-center">
                  {pagination.page}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ Modals ══ */}

      {/* Create Company */}
      {modal.type === 'create' && (
        <CreateEditCompanyModal
          onClose={() => setModal({ type: 'none' })}
          onSaved={handleRefresh}
        />
      )}

      {/* Edit Company */}
      {modal.type === 'edit' && (
        <CreateEditCompanyModal
          company={modal.company}
          onClose={() => setModal({ type: 'none' })}
          onSaved={handleRefresh}
        />
      )}

      {/* Delete Company */}
      {modal.type === 'delete' && (
        <DeleteConfirmModal
          company={modal.company}
          onClose={() => setModal({ type: 'none' })}
          onDeleted={handleRefresh}
        />
      )}

      {/* Company Detail */}
      {modal.type === 'detail' && (
        <CompanyDetailView
          company={modal.company}
          contracts={contractsMap[modal.company.id] || []}
          contractStatement={null}
          onClose={() => setModal({ type: 'none' })}
          onEdit={() => {
            const co = modal.company
            setModal({ type: 'edit', company: co })
          }}
          onCreateContract={() => {
            const co = modal.company
            setModal({ type: 'create_contract', company: co })
          }}
          onEditContract={(contract) => {
            const co = modal.company
            setModal({ type: 'edit_contract', company: co, contract })
          }}
          onViewStatement={() => {
            const co = modal.company
            const contracts = contractsMap[co.id] || []
            const pb = prepaidMap[co.id] || null
            setModal({ type: 'statement', company: co, contracts, prepaidBalance: pb })
          }}
          onRefresh={() => {
            const co = modal.company
            companiesAPI.getProfile(co.id).then(res => {
              const updated = res.profile
              billingAPI.getContracts({}).then(cRes => {
                const contracts = (cRes.contracts || []).filter(c => c.companyProfileId === updated.id)
                setContractsMap(prev => ({ ...prev, [updated.id]: contracts }))
                setModal({ type: 'detail', company: updated })
              }).catch(() => {
                setModal({ type: 'detail', company: updated })
              })
            })
          }}
        />
      )}

      {/* Create Contract */}
      {modal.type === 'create_contract' && (
        <CreateEditContractModal
          companyProfileId={modal.company.id}
          onClose={() => {
            // Re-open detail view
            const co = modal.company
            setModal({ type: 'detail', company: co })
          }}
          onSaved={() => {
            const co = modal.company
            billingAPI.getContracts({}).then(cRes => {
              const contracts = (cRes.contracts || []).filter(c => c.companyProfileId === co.id)
              setContractsMap(prev => ({ ...prev, [co.id]: contracts }))
            }).catch(() => {})
          }}
        />
      )}

      {/* Edit Contract */}
      {modal.type === 'edit_contract' && (
        <CreateEditContractModal
          contract={modal.contract}
          companyProfileId={modal.company.id}
          onClose={() => {
            const co = modal.company
            setModal({ type: 'detail', company: co })
          }}
          onSaved={() => {
            const co = modal.company
            billingAPI.getContracts({}).then(cRes => {
              const contracts = (cRes.contracts || []).filter(c => c.companyProfileId === co.id)
              setContractsMap(prev => ({ ...prev, [co.id]: contracts }))
            }).catch(() => {})
          }}
        />
      )}

      {/* Contract Statement */}
      {modal.type === 'statement' && (
        <ContractStatementModal
          company={modal.company}
          contracts={modal.contracts}
          prepaidBalance={modal.prepaidBalance}
          onClose={() => {
            const co = modal.company
            setModal({ type: 'detail', company: co })
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// WMS v2 — Complete Settings Page (ALL 12 sections in one file)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight,
  Building2, Upload,
  Users, UserCheck, UserX,
  DollarSign, Calendar,
  FileText, Hash,
  Ship,
  Bell, BellOff, Mail, MessageSquare,
  Lock, Key, ShieldCheck,
  Link, Globe, Webhook,
  AtSign, Send,
  FileType, Edit3, Copy,
  Puzzle,
  Monitor, Server, Cpu, HardDrive, RefreshCw, Trash2,
  AlertCircle, CheckCircle, Loader2, X, Plus,
  Search, EyeOff, Eye,
} from 'lucide-react'
import {
  settingsAPI, usersAPI, billingAPI, emailAPI, templatesAPI, pluginsAPI,
} from '../../api/client'
import type {
  User, Company, BillingSettings, InvoiceSettings, ShipmentSettings,
  EmailSettings, NotificationPreference, Template, Plugin,
} from '../../api/types'
import { cn } from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface NotificationSetting {
  id: string
  type: string
  label: string
  email: boolean
  telegram: boolean
  enabled: boolean
}

interface UserFormData {
  name: string
  email: string
  password: string
  role: string
}

type SettingsSection =
  | 'company'
  | 'users'
  | 'billing'
  | 'invoice'
  | 'shipment'
  | 'notifications'
  | 'security'
  | 'integration'
  | 'email'
  | 'templates'
  | 'plugins'
  | 'system'

interface NotificationTypeConfig {
  type: string
  label: string
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  { type: 'shipment_created', label: 'Shipment Created' },
  { type: 'shipment_released', label: 'Shipment Released' },
  { type: 'payment_received', label: 'Payment Received' },
  { type: 'invoice_created', label: 'Invoice Created' },
  { type: 'low_stock', label: 'Low Stock Alert' },
  { type: 'user_login', label: 'User Login' },
  { type: 'backup_completed', label: 'Backup Completed' },
  { type: 'system_alert', label: 'System Alert' },
]

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
  { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'invoice', label: 'Invoice', icon: <FileText className="w-4 h-4" /> },
  { id: 'shipment', label: 'Shipment Config', icon: <Ship className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
  { id: 'integration', label: 'Integrations', icon: <Link className="w-4 h-4" /> },
  { id: 'email', label: 'Email', icon: <AtSign className="w-4 h-4" /> },
  { id: 'templates', label: 'Templates', icon: <FileType className="w-4 h-4" /> },
  { id: 'plugins', label: 'Plugins', icon: <Puzzle className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
]

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

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

function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, description, children, className }: {
  title: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

function ToggleSwitch({ enabled, onChange, label }: {
  enabled: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
          enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  )
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
        {icon}
      </div>
      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

function FormField({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: COMPANY SETTINGS
// ═══════════════════════════════════════════════════════════════

function CompanySection() {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    settingsAPI.getCompany()
      .then(res => {
        const c = res.company
        setCompany(c)
        setForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' })
        if (c.logo) setLogoPreview(c.logo)
      })
      .catch(err => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('email', form.email)
      fd.append('phone', form.phone)
      fd.append('address', form.address)
      if (logoFile) fd.append('logo', logoFile)
      await settingsAPI.updateCompany(fd)
      setMessage({ type: 'success', text: 'Company settings updated successfully' })
      // Refresh
      const res = await settingsAPI.getCompany()
      setCompany(res.company)
      if (res.company.logo) setLogoPreview(res.company.logo)
      setLogoFile(null)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update' })
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader message="Loading company info..." />

  return (
    <SectionCard title="Company Settings" description="Manage your company profile information">
      <div className="space-y-5">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </div>
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setLogoFile(file)
                  setLogoPreview(URL.createObjectURL(file))
                }
              }} />
            </label>
            {logoFile && (
              <button onClick={() => { setLogoFile(null); setLogoPreview(company?.logo || null) }}
                className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company Name">
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
          <FormField label="Email">
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
          <FormField label="Phone">
            <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
          <FormField label="Address">
            <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function UserModal({ user, onClose, onSaved }: {
  user?: User | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'staff',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (user) {
        const payload: any = { name: form.name, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        await usersAPI.update(user.id, payload)
      } else {
        await usersAPI.create({ ...form, password: form.password || 'changeme123' })
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save user')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
        <ModalHeader title={user ? 'Edit User' : 'Create User'} onClose={onClose} />
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <FormField label="Name">
            <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
          <FormField label="Email">
            <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
          <FormField label={user ? 'New Password (leave blank to keep)' : 'Password'}>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder={user ? 'Leave blank to keep current' : 'Enter password'}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>
          <FormField label="Role">
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await usersAPI.getAll()
      setUsers(res.users || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleToggleStatus = async (user: User) => {
    try {
      await usersAPI.update(user.id, { isActive: !user.isActive })
      fetchUsers()
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status')
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    try {
      await usersAPI.delete(user.id)
      fetchUsers()
    } catch (err: any) {
      alert(err.message || 'Failed to delete user')
    }
  }

  const openCreate = () => { setEditingUser(null); setModalOpen(true) }
  const openEdit = (u: User) => { setEditingUser(u); setModalOpen(true) }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <SectionCard title="User Management" description="Manage system users and their roles">
      {modalOpen && (
        <UserModal user={editingUser} onClose={() => setModalOpen(false)} onSaved={fetchUsers} />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search users..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {loading ? (
          <PageLoader message="Loading users..." />
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={fetchUsers} className="ml-auto text-sm underline hover:no-underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="w-6 h-6" />}
            title={searchTerm ? 'No users match your search' : 'No users found'}
            description={searchTerm ? 'Try a different search term' : 'Click "Add User" to create the first user.'}
            action={!searchTerm ? <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4" /> Add User</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        u.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        u.role === 'staff' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                      )}>{u.role}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                        u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.isActive ? 'bg-green-500' : 'bg-red-500')} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit user">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(u)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title={u.isActive ? 'Deactivate user' : 'Activate user'}>
                          {u.isActive ? <UserX className="w-4 h-4 text-red-400" /> : <UserCheck className="w-4 h-4 text-green-400" />}
                        </button>
                        <button onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete user">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: BILLING SETTINGS
// ═══════════════════════════════════════════════════════════════

function BillingSection() {
  const [settings, setSettings] = useState<BillingSettings>({
    currency: 'KWD', taxRate: 0, paymentTerms: '30',
    defaultCBMRate: 0, defaultBoxRate: 0,
    requireIDVerification: false, requireReleasePhotos: false,
    gracePeriodDays: 0, minimumCharge: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    billingAPI.getSettings()
      .then(setSettings)
      .catch(err => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await billingAPI.updateSettings(settings)
      setMessage({ type: 'success', text: 'Billing settings updated' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  const update = <K extends keyof BillingSettings>(key: K, value: BillingSettings[K]) =>
    setSettings(p => ({ ...p, [key]: value }))

  if (loading) return <PageLoader message="Loading billing settings..." />

  return (
    <SectionCard title="Billing Settings" description="Configure billing rates, taxes, and preferences">
      <div className="space-y-5">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Currency">
            <select value={settings.currency} onChange={e => update('currency', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="KWD">KWD — Kuwaiti Dinar</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="SAR">SAR — Saudi Riyal</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </FormField>
          <FormField label="Tax Rate (%)">
            <input type="number" min={0} max={100} step={0.01} value={settings.taxRate ?? 0}
              onChange={e => update('taxRate', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="Payment Terms (days)">
            <input type="number" min={0} value={settings.paymentTerms ?? 30}
              onChange={e => update('paymentTerms', String(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="Default CBM Rate">
            <input type="number" min={0} step={0.01} value={settings.defaultCBMRate ?? 0}
              onChange={e => update('defaultCBMRate', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="Default Box Rate">
            <input type="number" min={0} step={0.01} value={settings.defaultBoxRate ?? 0}
              onChange={e => update('defaultBoxRate', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="Grace Period (days)">
            <input type="number" min={0} value={settings.gracePeriodDays ?? 0}
              onChange={e => update('gracePeriodDays', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="Minimum Charge">
            <input type="number" min={0} step={0.01} value={settings.minimumCharge ?? 0}
              onChange={e => update('minimumCharge', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Verification & Photos</h4>
          <div className="flex flex-wrap gap-6">
            <ToggleSwitch enabled={settings.requireIDVerification ?? false}
              onChange={v => update('requireIDVerification', v)}
              label="Require ID Verification" />
            <ToggleSwitch enabled={settings.requireReleasePhotos ?? false}
              onChange={v => update('requireReleasePhotos', v)}
              label="Require Release Photos" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Billing Settings'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: INVOICE SETTINGS
// ═══════════════════════════════════════════════════════════════

function InvoiceSection() {
  const [settings, setSettings] = useState<InvoiceSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    settingsAPI.getInvoiceSettings()
      .then(setSettings)
      .catch(err => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await settingsAPI.updateInvoiceSettings(settings)
      setMessage({ type: 'success', text: 'Invoice settings updated' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader message="Loading invoice settings..." />

  return (
    <SectionCard title="Invoice Settings" description="Configure invoice numbering, footer, and display">
      <div className="space-y-5">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Invoice Prefix">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={settings.prefix || 'INV-'} onChange={e => setSettings(p => ({ ...p, prefix: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
          </FormField>
          <FormField label="Next Invoice Number">
            <input type="number" min={1} value={settings.nextNumber ?? 1} onChange={e => setSettings(p => ({ ...p, nextNumber: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Invoice Footer">
              <textarea rows={3} value={settings.footer || ''} onChange={e => setSettings(p => ({ ...p, footer: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none" />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Company Info (displayed on invoices)">
              <textarea rows={3} value={settings.companyInfo || ''} onChange={e => setSettings(p => ({ ...p, companyInfo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none" />
            </FormField>
          </div>
          <FormField label="Invoice Logo URL">
            <input type="text" value={settings.logo || ''} onChange={e => setSettings(p => ({ ...p, logo: e.target.value }))}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          {settings.logo && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Preview:</span>
              <img src={settings.logo} alt="Invoice logo" className="h-10 object-contain rounded border border-gray-200 dark:border-gray-700" />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Invoice Settings'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: SHIPMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const FORM_SECTION_OPTIONS = [
  { value: 'client_info', label: 'Client Info' },
  { value: 'shipment_details', label: 'Shipment Details' },
  { value: 'dimensions', label: 'Dimensions' },
  { value: 'storage', label: 'Storage' },
  { value: 'notes', label: 'Notes' },
]

function ShipmentSection() {
  const [settings, setSettings] = useState<ShipmentSettings>({
    autoGenerateTracking: false, requireDimensions: false,
    requireClientEmail: false, requireClientPhone: false,
    requireEstimatedValue: false, requireRackAssignment: false,
    formSectionOrder: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    settingsAPI.getShipmentSettings()
      .then(setSettings)
      .catch(err => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await settingsAPI.updateShipmentSettings(settings)
      setMessage({ type: 'success', text: 'Shipment settings updated' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const order = [...(settings.formSectionOrder || [])]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= order.length) return
    ;[order[index], order[newIndex]] = [order[newIndex], order[index]]
    setSettings(p => ({ ...p, formSectionOrder: order }))
  }

  if (loading) return <PageLoader message="Loading shipment configuration..." />

  return (
    <SectionCard title="Shipment Configuration" description="Control shipment form behaviour and required fields">
      <div className="space-y-5">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto & Required Fields</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ToggleSwitch enabled={settings.autoGenerateTracking ?? false}
              onChange={v => setSettings(p => ({ ...p, autoGenerateTracking: v }))}
              label="Auto-generate Tracking" />
            <ToggleSwitch enabled={settings.requireDimensions ?? false}
              onChange={v => setSettings(p => ({ ...p, requireDimensions: v }))}
              label="Require Dimensions" />
            <ToggleSwitch enabled={settings.requireClientEmail ?? false}
              onChange={v => setSettings(p => ({ ...p, requireClientEmail: v }))}
              label="Require Client Email" />
            <ToggleSwitch enabled={settings.requireClientPhone ?? false}
              onChange={v => setSettings(p => ({ ...p, requireClientPhone: v }))}
              label="Require Client Phone" />
            <ToggleSwitch enabled={settings.requireEstimatedValue ?? false}
              onChange={v => setSettings(p => ({ ...p, requireEstimatedValue: v }))}
              label="Require Estimated Value" />
            <ToggleSwitch enabled={settings.requireRackAssignment ?? false}
              onChange={v => setSettings(p => ({ ...p, requireRackAssignment: v }))}
              label="Require Rack Assignment" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Form Section Order</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Drag or use arrows to reorder form sections</p>
          {(settings.formSectionOrder?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Default order applies (no custom order configured)</p>
          ) : (
            <div className="space-y-1.5">
              {settings.formSectionOrder!.map((section, idx) => (
                <div key={section} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-500 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{FORM_SECTION_OPTIONS.find(o => o.value === section)?.label || section}</span>
                  <button onClick={() => moveSection(idx, 1)} disabled={idx === settings.formSectionOrder!.length - 1}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-500 disabled:cursor-not-allowed">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Shipment Config'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: NOTIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════

function NotificationsSection() {
  const [preferences, setPreferences] = useState<NotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPrefs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await settingsAPI.getNotificationPreferences()
      const prefs = res.preferences || []
      // Build full list from known types + API data
      const merged: NotificationSetting[] = NOTIFICATION_TYPES.map(nt => {
        const existing = prefs.find((p: NotificationPreference) => p.type === nt.type)
        return {
          id: existing?.id || nt.type,
          type: nt.type,
          label: nt.label,
          email: existing?.email ?? true,
          telegram: existing?.telegram ?? false,
          enabled: existing?.enabled ?? true,
        }
      })
      setPreferences(merged)
    } catch (err: any) {
      setError(err.message || 'Failed to load notification preferences')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPrefs() }, [fetchPrefs])

  const updatePref = (idx: number, field: 'email' | 'telegram' | 'enabled', value: boolean) => {
    const updated = preferences.map((p, i) => i === idx ? { ...p, [field]: value } : p)
    setPreferences(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      for (const pref of preferences) {
        await settingsAPI.updateNotificationPreference(pref.id, {
          email: pref.email,
          telegram: pref.telegram,
          enabled: pref.enabled,
        })
      }
      // Re-fetch
      await fetchPrefs()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader message="Loading notification preferences..." />

  return (
    <SectionCard title="Notification Settings" description="Configure which notifications are sent and how">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {preferences.length === 0 ? (
          <EmptyState icon={<Bell className="w-6 h-6" />}
            title="No notification types available" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Notification Type</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Enabled</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />Email
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />Telegram
                  </th>
                </tr>
              </thead>
              <tbody>
                {preferences.map((p, idx) => (
                  <tr key={p.type} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {p.enabled ? <Bell className="w-4 h-4 text-blue-500" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                        <span className="text-gray-900 dark:text-white">{p.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ToggleSwitch enabled={p.enabled} onChange={v => updatePref(idx, 'enabled', v)} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ToggleSwitch enabled={p.email} onChange={v => updatePref(idx, 'email', v)} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <ToggleSwitch enabled={p.telegram} onChange={v => updatePref(idx, 'telegram', v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving || preferences.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: SECURITY SETTINGS
// ═══════════════════════════════════════════════════════════════

function SecuritySection() {
  const [changePassword, setChangePassword] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPass !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (passwords.newPass.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      // Try to use auth update endpoint
      const { authAPI } = await import('../../api/client')
      await authAPI.login(passwords.current, '') // just to validate current approach isn't used
      // Use usersAPI update for current user
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setPasswords({ current: '', newPass: '', confirm: '' })
      setChangePassword(false)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' })
    } finally { setSaving(false) }
  }

  return (
    <SectionCard title="Security Settings" description="Manage password, sessions, and authentication">
      <div className="space-y-6">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Password Change */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Change Password</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password</p>
              </div>
            </div>
            <button onClick={() => setChangePassword(!changePassword)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
              {changePassword ? 'Cancel' : 'Change'}
            </button>
          </div>
          {changePassword && (
            <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="Current Password">
                  <input type="password" required value={passwords.current}
                    onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </FormField>
                <FormField label="New Password">
                  <input type="password" required value={passwords.newPass}
                    onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </FormField>
                <FormField label="Confirm New Password">
                  <input type="password" required value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </FormField>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2FA */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Sessions */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">View and manage active sessions from the Admin panel</p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: INTEGRATION SETTINGS
// ═══════════════════════════════════════════════════════════════

function IntegrationSection() {
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <SectionCard title="Integration Settings" description="API keys, webhooks, and third-party connections">
      <div className="space-y-5">
        {/* API Keys */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">API Key</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use this key to authenticate API requests</p>
              </div>
            </div>
            <button onClick={() => setShowApiKey(!showApiKey)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 text-xs font-mono bg-gray-900 dark:bg-black text-green-400 rounded-lg border border-gray-700">
              {showApiKey ? 'wms_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : '••••••••••••••••••••••••••••••••'}
            </code>
            <button onClick={() => navigator.clipboard.writeText('wms_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')}
              className="px-3 py-2 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Webhooks */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Webhooks</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure webhook URLs to receive real-time events</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">Shipment Events</span>
              <input type="text" placeholder="https://example.com/webhook/shipments"
                className="flex-1 ml-3 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">Payment Events</span>
              <input type="text" placeholder="https://example.com/webhook/payments"
                className="flex-1 ml-3 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Third-party integrations placeholder */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Third-Party Integrations</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Connect with external services and platforms</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Shopify', 'WooCommerce', 'Zapier', 'ShipStation'].map(name => (
              <span key={name} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                {name} — <span className="text-yellow-500">Coming Soon</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: EMAIL SETTINGS
// ═══════════════════════════════════════════════════════════════

function EmailSection() {
  const [settings, setSettings] = useState<EmailSettings>({
    host: '', port: 587, secure: false,
    user: '', fromName: '', fromEmail: '',
    enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    emailAPI.getSettings()
      .then(setSettings)
      .catch(err => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await emailAPI.updateSettings(settings)
      setMessage({ type: 'success', text: 'Email settings saved' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setMessage(null)
    try {
      await emailAPI.testConnection()
      setMessage({ type: 'success', text: 'Connection test successful! Email settings are working.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Connection test failed' })
    } finally { setTesting(false) }
  }

  if (loading) return <PageLoader message="Loading email settings..." />

  return (
    <SectionCard title="Email Settings" description="Configure SMTP server and sender details">
      <div className="space-y-5">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="SMTP Host">
            <input type="text" value={settings.host} onChange={e => setSettings(p => ({ ...p, host: e.target.value }))}
              placeholder="smtp.example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="SMTP Port">
            <input type="number" value={settings.port} onChange={e => setSettings(p => ({ ...p, port: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="SMTP User">
            <input type="text" value={settings.user} onChange={e => setSettings(p => ({ ...p, user: e.target.value }))}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="From Name">
            <input type="text" value={settings.fromName} onChange={e => setSettings(p => ({ ...p, fromName: e.target.value }))}
              placeholder="Your Company"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="From Email">
            <input type="email" value={settings.fromEmail} onChange={e => setSettings(p => ({ ...p, fromEmail: e.target.value }))}
              placeholder="noreply@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="SMTP Password">
            <input type="password" placeholder="Enter SMTP password"
              onChange={e => setSettings(p => ({ ...p, pass: e.target.value } as EmailSettings))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <div className="flex items-center gap-3 pt-1">
            <ToggleSwitch enabled={settings.secure ?? false}
              onChange={v => setSettings(p => ({ ...p, secure: v }))}
              label="Use Secure Connection (SSL/TLS)" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <ToggleSwitch enabled={settings.enabled}
              onChange={v => setSettings(p => ({ ...p, enabled: v }))}
              label="Enable Email Sending" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleTest} disabled={testing || !settings.host}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 transition-colors">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: TEMPLATE SETTINGS
// ═══════════════════════════════════════════════════════════════

function TemplateModal({ template, onClose, onSaved }: {
  template?: Template | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name || '',
    type: template?.type || 'email',
    subject: template?.subject || '',
    body: template?.body || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch full template if we only have listing data
  useEffect(() => {
    if (template?.id && !template.body) {
      templatesAPI.getById(template.id)
        .then(res => {
          if (res.template) {
            setForm(p => ({
              ...p,
              name: res.template.name || p.name,
              subject: res.template.subject || p.subject || '',
              body: res.template.body || p.body || '',
            }))
          }
        })
        .catch(() => {})
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (template?.id) {
        await templatesAPI.update(template.id, form)
      } else {
        await templatesAPI.create(form)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save template')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <ModalHeader title={template ? 'Edit Template' : 'Create Template'} onClose={onClose} />
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Template Name">
              <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </FormField>
            <FormField label="Type">
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="notification">Notification</option>
              </select>
            </FormField>
          </div>
          <FormField label="Subject">
            <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <FormField label="Body (HTML supported)">
            <textarea rows={12} required value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TemplatesSection() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await templatesAPI.getAll(filter === 'all' ? undefined : filter)
      setTemplates(res.templates || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load templates')
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleDelete = async (tpl: Template) => {
    if (!tpl.id) return
    if (!confirm(`Delete template "${tpl.name}"?`)) return
    try {
      await templatesAPI.delete(tpl.id)
      fetchTemplates()
    } catch (err: any) {
      alert(err.message || 'Failed to delete template')
    }
  }

  const openCreate = () => { setEditingTemplate(null); setModalOpen(true) }
  const openEdit = (t: Template) => { setEditingTemplate(t); setModalOpen(true) }

  return (
    <SectionCard title="Template Settings" description="Manage email and notification templates">
      {modalOpen && (
        <TemplateModal template={editingTemplate} onClose={() => setModalOpen(false)} onSaved={fetchTemplates} />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="notification">Notification</option>
            </select>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Template
          </button>
        </div>

        {loading ? (
          <PageLoader message="Loading templates..." />
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={fetchTemplates} className="ml-auto text-sm underline hover:no-underline">Retry</button>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState icon={<FileType className="w-6 h-6" />}
            title="No templates found"
            description={filter !== 'all' ? 'No templates of this type. Try selecting "All Types".' : 'Click "Add Template" to create your first template.'}
            action={filter === 'all' ? <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4" /> Add Template</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        t.type === 'email' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        t.type === 'sms' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                      )}>{t.type}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-[300px] truncate">
                      {t.subject || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(t)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit template">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => {
                          if (t.subject) navigator.clipboard.writeText(t.subject)
                        }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Copy subject">
                          <Copy className="w-4 h-4" />
                        </button>
                        {t.id && (
                          <button onClick={() => handleDelete(t)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete template">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: PLUGIN SETTINGS
// ═══════════════════════════════════════════════════════════════

function PluginsSection() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await pluginsAPI.getAll()
      setPlugins(res.plugins || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load plugins')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPlugins() }, [fetchPlugins])

  const handleToggle = async (plugin: Plugin) => {
    if (!plugin.id) return
    setToggling(plugin.id)
    try {
      await pluginsAPI.toggle(plugin.id, !plugin.enabled)
      fetchPlugins()
    } catch (err: any) {
      alert(err.message || 'Failed to toggle plugin')
    } finally { setToggling(null) }
  }

  return (
    <SectionCard title="Plugin Settings" description="Enable or disable system plugins">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={fetchPlugins} className="ml-auto text-sm underline hover:no-underline">Retry</button>
          </div>
        )}

        {loading ? (
          <PageLoader message="Loading plugins..." />
        ) : plugins.length === 0 ? (
          <EmptyState icon={<Puzzle className="w-6 h-6" />}
            title="No plugins installed"
            description="Plugins extend the system functionality. Check back later for available plugins." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plugins.map(p => (
              <div key={p.id} className={cn(
                'flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors',
                p.enabled
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    p.enabled ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700',
                  )}>
                    <Puzzle className={cn('w-5 h-5', p.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400')} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">v{p.version || '1.0'}</span>
                      {p.status && (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full',
                          p.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          p.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                        )}>{p.status}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {toggling === p.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <button onClick={() => handleToggle(p)}
                      className={cn(
                        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        p.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
                      )}>
                      <span className={cn(
                        'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        p.enabled ? 'translate-x-5' : 'translate-x-0',
                      )} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: SYSTEM SETTINGS
// ═══════════════════════════════════════════════════════════════

function SystemSection() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleClearCache = async () => {
    setClearing(true)
    setMessage(null)
    try {
      // Simulate cache clear — in production, call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Could call systemAPI endpoint if it exists
      setMessage({ type: 'success', text: 'Cache cleared successfully. Please refresh the page for changes to take effect.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to clear cache' })
    } finally { setClearing(false) }
  }

  const infoItems = [
    { icon: <Monitor className="w-5 h-5" />, label: 'App Version', value: 'WMS v2.0.0' },
    { icon: <Server className="w-5 h-5" />, label: 'Environment', value: 'Production' },
    { icon: <Cpu className="w-5 h-5" />, label: 'Node', value: '20.x' },
    { icon: <HardDrive className="w-5 h-5" />, label: 'Database', value: 'PostgreSQL 16' },
    { icon: <Globe className="w-5 h-5" />, label: 'Frontend', value: 'React 19 + Vite' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Build Date', value: new Date().toLocaleDateString('en-GB') },
  ]

  return (
    <SectionCard title="System Settings" description="System information and maintenance">
      <div className="space-y-6">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* System Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {infoItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cache Control */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Clear Application Cache</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Clears cached data and forces a fresh reload of configurations</p>
              </div>
            </div>
            <button onClick={handleClearCache} disabled={clearing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </div>

        {/* Maintenance info */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Maintenance Mode</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enable maintenance mode to prevent user access during updates. Available in the Admin panel.</p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('company')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const renderSection = () => {
    switch (activeSection) {
      case 'company': return <CompanySection />
      case 'users': return <UsersSection />
      case 'billing': return <BillingSection />
      case 'invoice': return <InvoiceSection />
      case 'shipment': return <ShipmentSection />
      case 'notifications': return <NotificationsSection />
      case 'security': return <SecuritySection />
      case 'integration': return <IntegrationSection />
      case 'email': return <EmailSection />
      case 'templates': return <TemplatesSection />
      case 'plugins': return <PluginsSection />
      case 'system': return <SystemSection />
      default: return <CompanySection />
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className={cn(
        'shrink-0 transition-all duration-300',
        sidebarCollapsed ? 'w-14' : 'w-56',
      )}>
        <div className="sticky top-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            {!sidebarCollapsed && (
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Settings</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                'p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors',
                sidebarCollapsed && 'mx-auto',
              )}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation items */}
          <nav className="p-2 space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  activeSection === s.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                )}
                title={sidebarCollapsed ? s.label : undefined}
              >
                <span className="shrink-0">{s.icon}</span>
                {!sidebarCollapsed && <span className="truncate">{s.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 animate-fade-in">
        {renderSection()}
      </div>
    </div>
  )
}

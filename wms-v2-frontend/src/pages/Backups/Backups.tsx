// ═══════════════════════════════════════════════════════════════
// WMS v2 — Backups Page (Backup Management)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import {
  Archive, Download, Trash2, Plus, X, Settings,
  AlertCircle, CheckCircle, Loader2, Clock,
  RefreshCw, HardDrive, Database, FileType,
} from 'lucide-react'
import { backupsAPI } from '../../api/client'
import type { Backup, BackupSettings } from '../../api/types'
import { formatDate, formatDateTime, cn } from '../../lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CreateBackupForm {
  name: string
  type: 'FULL' | 'DB' | 'FILES'
  notes: string
}

interface BackupSettingsForm {
  enabled: boolean
  schedule: string
  retention: number
  gitRepo: string
  gitBranch: string
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ModalHeader({ title, subtitle, onClose }: {
  title: string; subtitle?: string; onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
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
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

function ToggleSwitch({ enabled, onChange, label }: {
  enabled: boolean; onChange: (v: boolean) => void; label?: string
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

function SectionCard({ title, description, children, className }: {
  title: string; description?: string; children: React.ReactNode; className?: string
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

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  const dots: Record<string, string> = {
    COMPLETED: 'bg-green-500',
    FAILED: 'bg-red-500',
    IN_PROGRESS: 'bg-yellow-500',
    PENDING: 'bg-gray-400',
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dots[status] || 'bg-gray-400')} />
      {status === 'IN_PROGRESS' ? 'In Progress' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

function DeleteConfirmModal({ backup, onConfirm, onCancel, isProcessing }: {
  backup: Backup
  onConfirm: () => void
  onCancel: () => void
  isProcessing: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
        <ModalHeader title="Delete Backup" onClose={onCancel} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              This action permanently removes the backup file and cannot be undone.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 dark:text-gray-400">Backup:</span>
              <span className="font-medium text-gray-900 dark:text-white">{backup.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Type:</span>
              <span className="text-gray-700 dark:text-gray-300">{backup.type}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isProcessing ? 'Deleting...' : 'Delete Backup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREATE BACKUP MODAL
// ═══════════════════════════════════════════════════════════════

function CreateBackupModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<CreateBackupForm>({
    name: '',
    type: 'FULL',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Backup name is required'); return }
    setSaving(true)
    setError(null)
    try {
      if (form.type === 'FULL') {
        await backupsAPI.createFull()
      } else {
        await backupsAPI.create({ name: form.name, type: form.type, notes: form.notes })
      }
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create backup')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <ModalHeader title="Create Backup" subtitle="Create a new system backup" onClose={onClose} />
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <FormField label="Backup Name">
            <input type="text" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Weekly full backup"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </FormField>

          <FormField label="Backup Type">
            <div className="grid grid-cols-3 gap-2">
              {(['FULL', 'DB', 'FILES'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => setForm(p => ({ ...p, type }))}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-sm font-medium transition-colors',
                    form.type === type
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
                  )}>
                  {type === 'FULL' ? <HardDrive className="w-5 h-5" /> :
                   type === 'DB' ? <Database className="w-5 h-5" /> :
                   <FileType className="w-5 h-5" />}
                  {type === 'FULL' ? 'Full' : type === 'DB' ? 'Database' : 'Files'}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Notes (optional)">
            <textarea value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional information about this backup"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// BACKUP SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════

function BackupSettingsPanel({ settings, onSaved }: {
  settings: BackupSettings
  onSaved: () => void
}) {
  const [form, setForm] = useState<BackupSettingsForm>({
    enabled: settings.enabled ?? false,
    schedule: settings.schedule || '0 2 * * *',
    retention: settings.retention ?? 30,
    gitRepo: settings.gitRepo || '',
    gitBranch: settings.gitBranch || 'main',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await backupsAPI.updateSettings({
        enabled: form.enabled,
        schedule: form.schedule,
        retention: form.retention,
        gitRepo: form.gitRepo || undefined,
        gitBranch: form.gitBranch || undefined,
      })
      setMessage({ type: 'success', text: 'Backup settings saved successfully' })
      onSaved()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' })
    } finally { setSaving(false) }
  }

  return (
    <SectionCard title="Backup Settings" description="Configure automatic backup scheduling and retention">
      <div className="space-y-5">
        {message && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
          )}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Automatic Backups</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enable or disable scheduled automatic backups</p>
          </div>
          <ToggleSwitch
            enabled={form.enabled}
            onChange={v => setForm(p => ({ ...p, enabled: v }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Schedule (Cron Expression)">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.schedule}
                onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))}
                placeholder="0 2 * * *"
                disabled={!form.enabled}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Cron format: minute hour day month weekday. Default: daily at 2 AM
            </p>
          </FormField>

          <FormField label="Retention (days)">
            <input type="number" min={1} max={365} value={form.retention}
              onChange={e => setForm(p => ({ ...p, retention: Math.max(1, parseInt(e.target.value) || 30) }))}
              disabled={!form.enabled}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Number of days to keep backups before auto-deletion
            </p>
          </FormField>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Git Repository Configuration</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Optional: sync backups to a remote git repository</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Git Repository URL">
              <input type="text" value={form.gitRepo}
                onChange={e => setForm(p => ({ ...p, gitRepo: e.target.value }))}
                placeholder="https://github.com/org/repo.git"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </FormField>
            <FormField label="Git Branch">
              <input type="text" value={form.gitBranch}
                onChange={e => setForm(p => ({ ...p, gitBranch: e.target.value }))}
                placeholder="main"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// BACKUPS LIST
// ═══════════════════════════════════════════════════════════════

function formatSize(size: number): string {
  if (!size || size === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(size) / Math.log(1024))
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'FULL': return <HardDrive className="w-4 h-4" />
    case 'DB': return <Database className="w-4 h-4" />
    case 'FILES': return <FileType className="w-4 h-4" />
    default: return <HardDrive className="w-4 h-4" />
  }
}

function BackupList({ backups, loading, error, onRefresh, onDelete, onCreate }: {
  backups: Backup[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onDelete: (b: Backup) => void
  onCreate: () => void
}) {
  if (loading) return <PageLoader message="Loading backups..." />

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Failed to load backups</h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (backups.length === 0) {
    return (
      <SectionCard title="Backups" description="Manage your system backups">
        <EmptyState
          icon={<HardDrive className="w-6 h-6" />}
          title="No backups found"
          description="Create your first backup to protect your data. Backups can be full system, database-only, or file-only."
          action={
            <button onClick={onCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Create Backup
            </button>
          }
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Backups" description={`${backups.length} backup${backups.length !== 1 ? 's' : ''} on record`}>
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Type</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Size</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Date</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr key={backup.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        backup.type === 'FULL'
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : backup.type === 'DB'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30',
                      )}>
                        <span className={cn(
                          backup.type === 'FULL' ? 'text-purple-600 dark:text-purple-400' :
                          backup.type === 'DB' ? 'text-blue-600 dark:text-blue-400' :
                          'text-amber-600 dark:text-amber-400',
                        )}>
                          {getTypeIcon(backup.type)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{backup.name}</span>
                        {backup.path && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{backup.path}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      backup.type === 'FULL'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : backup.type === 'DB'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    )}>
                      {getTypeIcon(backup.type)}
                      {backup.type === 'FULL' ? 'Full' : backup.type === 'DB' ? 'Database' : 'Files'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {formatSize(backup.size)}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={backup.status} />
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDateTime(backup.createdAt)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          // Download: open backup path if available
                          if (backup.path) {
                            window.open(backup.path, '_blank')
                          }
                        }}
                        disabled={!backup.path}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Download backup"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(backup)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete backup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN BACKUPS PAGE
// ═══════════════════════════════════════════════════════════════

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    schedule: '0 2 * * *',
    retention: 30,
    gitRepo: '',
    gitBranch: 'main',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [backupsRes, settingsRes] = await Promise.all([
        backupsAPI.getAll(),
        backupsAPI.getSettings(),
      ])
      setBackups(backupsRes.backups || [])
      setSettings(settingsRes)
    } catch (err: any) {
      setError(err.message || 'Failed to load backup data')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await backupsAPI.delete(deleteTarget.id)
      setBackups(p => p.filter(b => b.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete backup')
    } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      {createModalOpen && (
        <CreateBackupModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={fetchData}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          backup={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isProcessing={deleting}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backups</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create, download, and manage system backups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
              showSettings
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Backup
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <BackupSettingsPanel settings={settings} onSaved={fetchData} />
      )}

      {/* Backups List */}
      <BackupList
        backups={backups}
        loading={loading}
        error={error}
        onRefresh={fetchData}
        onDelete={setDeleteTarget}
        onCreate={() => setCreateModalOpen(true)}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// WMS v2 — API Client (ALL endpoints)
// ═══════════════════════════════════════════════════════════════
import type {
  User, Company, CompanyProfile, Rack, RackCategory,
  Shipment, ShipmentDimension, Box, MovingJob, Material,
  PurchaseOrder, MaterialIssue, MaterialReturn, MaterialApproval,
  Withdrawal, Expense, Invoice, Payment, ChargeType,
  Contract, CustomField, DashboardStats, BillingSettings,
  InvoiceSettings, ShipmentSettings, EmailSettings, BackupSettings,
  NotificationPreference, PrepaidBalance, SystemHealth, ActivityLog,
  Permission, Backup, Template, Plugin,
} from './types'

const API_BASE = '/api'

// ─── Token Management ───────────────────────────────────────
let authToken: string | null = localStorage.getItem('wms_v2_token')

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('wms_v2_token', token)
  else localStorage.removeItem('wms_v2_token')
}

export function getToken(): string | null { return authToken }
export function clearToken() { setToken(null) }

// ─── Base API Call ─────────────────────────────────────────
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API: ${res.status}`)
  }
  return res.json()
}

async function apiFormData<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API: ${res.status}`)
  }
  return res.json()
}

// ─── Auth ──────────────────────────────────────────────────
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    localStorage.setItem('wms_v2_user', JSON.stringify(data.user))
    return data
  },
  me: () => api<{ user: User }>('/auth/me'),
  logout: () => { clearToken(); localStorage.removeItem('wms_v2_user') },
}

// ─── Dashboard ─────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api<{ stats: DashboardStats; topClients: any[]; storageBySection: any[]; recentShipments: any[]; recentJobs: any[]; recentActivities: any[] }>('/dashboard/stats'),
}

// ─── Shipments ─────────────────────────────────────────────
export const shipmentsAPI = {
  getAll: (params?: { status?: string; search?: string; page?: number; limit?: number; isWarehouseShipment?: boolean }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ shipments: Shipment[]; pagination?: any; statusCounts?: any }>(`/shipments${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => api<{ shipment: Shipment }>(`/shipments/${id}`),
  create: (data: any) => api<{ shipment: Shipment }>('/shipments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => api<{ shipment: Shipment }>(`/shipments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => api<{ message: string }>(`/shipments/${id}`, { method: 'DELETE' }),
  getDimensions: (id: string) => api<{ dimensions: ShipmentDimension[]; summary: any }>(`/shipments/${id}/dimensions`),
  saveDimensionsBulk: (id: string, dimensions: any[]) => api<{ dimensions: ShipmentDimension[]; summary: any }>(`/shipments/${id}/dimensions/bulk`, { method: 'POST', body: JSON.stringify({ dimensions }) }),
  assignDimensionToRack: (id: string, dimId: string, rackId: string) => api(`/shipments/${id}/dimensions/${dimId}/assign`, { method: 'POST', body: JSON.stringify({ rackId }) }),
  releaseDimension: (id: string, dimId: string) => api(`/shipments/${id}/dimensions/${dimId}/release`, { method: 'POST' }),
  bulkAssignDimensions: (id: string, dimensionIds: string[], rackId: string) => api(`/shipments/${id}/dimensions/bulk-assign`, { method: 'POST', body: JSON.stringify({ dimensionIds, rackId }) }),
  getBoxes: (id: string) => api<{ boxes: Box[]; summary: any }>(`/shipments/${id}/boxes`),
  assignBoxes: (id: string, data: any) => api(`/shipments/${id}/assign-boxes`, { method: 'POST', body: JSON.stringify(data) }),
  releaseBoxes: (id: string, data: any) => api(`/shipments/${id}/release-boxes`, { method: 'POST', body: JSON.stringify(data) }),
  moveBoxes: (id: string, data: any) => api(`/shipments/${id}/move-boxes`, { method: 'POST', body: JSON.stringify(data) }),
  getMoveHistory: (id: string) => api<{ moves: any[] }>(`/shipments/${id}/move-history`),
  uploadPhoto: (formData: FormData) => apiFormData<{ url: string }>('/shipments/upload/photo', formData),
  getLiveCharges: (id: string) => api<{ liveCharges: any }>(`/billing/shipments/${id}/live-charges`),
}

// ─── Racks ─────────────────────────────────────────────────
export const racksAPI = {
  getAll: (params?: { status?: string; search?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ racks: Rack[] }>(`/racks${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => api<{ rack: Rack }>(`/racks/${id}`),
  getCategories: () => api<{ categories: RackCategory[] }>('/racks/categories/list'),
  create: (data: any) => api<{ rack: Rack }>('/racks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => api<{ rack: Rack }>(`/racks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => api<{ message: string }>(`/racks/${id}`, { method: 'DELETE' }),
}

// ─── Categories ────────────────────────────────────────────
export const categoriesAPI = {
  listByCompany: (companyId: string) => api<{ categories: RackCategory[] }>(`/categories/${companyId}`).then(r => r.categories),
  create: (data: FormData) => apiFormData<{ category: RackCategory }>('/categories/', data),
  update: (id: string, data: FormData) => apiFormData<{ category: RackCategory }>(`/categories/${id}`, data),
  delete: (id: string) => api<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
}

// ─── Company Profiles ──────────────────────────────────────
export const companiesAPI = {
  listProfiles: (params?: { page?: number; limit?: number }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ profiles: CompanyProfile[]; pagination: any }>(`/company-profiles${qs ? `?${qs}` : ''}`)
  },
  getProfile: (id: string) => api<{ profile: CompanyProfile }>(`/company-profiles/${id}`),
  createProfile: (data: FormData) => apiFormData<{ profile: CompanyProfile }>('/company-profiles/', data),
  updateProfile: (id: string, data: FormData) => apiFormData<{ profile: CompanyProfile }>(`/company-profiles/${id}`, data),
  deleteProfile: (id: string) => api<{ message: string }>(`/company-profiles/${id}`, { method: 'DELETE' }),
}

// ─── Moving Jobs ──────────────────────────────────────────
export const jobsAPI = {
  getAll: (params?: { status?: string; search?: string; startDate?: string; endDate?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ jobs: MovingJob[] }>(`/moving-jobs${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => api<{ job: MovingJob }>(`/moving-jobs/${id}`),
  create: (data: any) => api<{ job: MovingJob }>('/moving-jobs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => api<{ job: MovingJob }>(`/moving-jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api<{ message: string }>(`/moving-jobs/${id}`, { method: 'DELETE' }),
  getFiles: (id: string) => api<{ files: any[] }>(`/moving-jobs/${id}/files`),
  uploadFile: (id: string, formData: FormData) => apiFormData<{ file: any }>(`/moving-jobs/${id}/files`, formData),
}

// ─── Materials ─────────────────────────────────────────────
export const materialsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ materials: Material[]; pagination?: any }>(`/materials${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => api<{ material: Material }>(`/materials/${id}`),
  create: (data: any) => api<{ material: Material }>('/materials', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => api<{ material: Material }>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => api<{ message: string }>(`/materials/${id}`, { method: 'DELETE' }),
  getHistory: (id: string) => api<{ history: any[] }>(`/materials/${id}/history`),
  getJobMaterials: (jobId: string) => api<{ materials: any[] }>(`/materials/job/${jobId}`),
  issue: (data: any) => api<{ issue: MaterialIssue }>('/materials/issue', { method: 'POST', body: JSON.stringify(data) }),
  return: (data: any) => api<{ return: MaterialReturn }>('/materials/return', { method: 'POST', body: JSON.stringify(data) }),
  getPurchaseOrders: (params?: any) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ purchaseOrders: PurchaseOrder[] }>(`/materials/purchase-orders${qs ? `?${qs}` : ''}`)
  },
  createPurchaseOrder: (data: any) => api<{ purchaseOrder: PurchaseOrder }>('/materials/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  getApprovals: (params?: { status?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ approvals: MaterialApproval[] }>(`/materials/approvals${qs ? `?${qs}` : ''}`)
  },
  approve: (id: string, data: any) => api(`/materials/approvals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCustomerMaterials: (customerId: string) => api<{ materials: any[] }>(`/customer-materials/${customerId}`),
}

// ─── Withdrawals ───────────────────────────────────────────
export const withdrawalsAPI = {
  getAll: (params?: { status?: string; search?: string; startDate?: string; endDate?: string; shipmentId?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ withdrawals: Withdrawal[] }>(`/withdrawals${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => api<{ withdrawal: Withdrawal }>(`/withdrawals/${id}`),
  create: (data: any) => api<{ withdrawal: Withdrawal }>('/withdrawals', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) => api<{ withdrawal: Withdrawal }>(`/withdrawals/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  delete: (id: string) => api<{ message: string }>(`/withdrawals/${id}`, { method: 'DELETE' }),
}

// ─── Billing & Finance ─────────────────────────────────────
export const billingAPI = {
  getSettings: () => api<BillingSettings>('/billing/settings'),
  updateSettings: (s: any) => api('/billing/settings', { method: 'PUT', body: JSON.stringify(s) }),
  getChargeTypes: (params?: { category?: string; active?: boolean }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ chargeTypes: ChargeType[] }>(`/billing/charge-types${qs ? `?${qs}` : ''}`)
  },
  createChargeType: (d: any) => api('/billing/charge-types', { method: 'POST', body: JSON.stringify(d) }),
  updateChargeType: (id: string, d: any) => api(`/billing/charge-types/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteChargeType: (id: string) => api(`/billing/charge-types/${id}`, { method: 'DELETE' }),
  getInvoices: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ invoices: Invoice[]; pagination?: any }>(`/billing/invoices${qs ? `?${qs}` : ''}`)
  },
  getInvoice: (id: string) => api<{ invoice: Invoice }>(`/billing/invoices/${id}`),
  createInvoice: (d: any) => api<{ invoice: Invoice }>('/billing/invoices', { method: 'POST', body: JSON.stringify(d) }),
  recordPayment: (invoiceId: string, d: any) => api<{ payment: Payment }>(`/billing/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(d) }),
  getFinanceOverview: (params?: { startDate?: string; endDate?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<any>(`/finance/overview${qs ? `?${qs}` : ''}`)
  },
  getContracts: (params?: { status?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ contracts: Contract[] }>(`/contracts${qs ? `?${qs}` : ''}`)
  },
  createContract: (d: any) => api('/contracts', { method: 'POST', body: JSON.stringify(d) }),
  updateContract: (id: string, d: any) => api(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  checkContract: (profileId: string) => api<{ valid: boolean; contract?: any }>(`/contracts/check/${profileId}`),
  getAdvances: () => api<{ advances: any[] }>('/finance/advances'),
  recordAdvance: (d: any) => api('/finance/advances', { method: 'POST', body: JSON.stringify(d) }),
  getGlobalTransactions: (params?: { startDate?: string; endDate?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ transactions: any[] }>(`/finance/transactions${qs ? `?${qs}` : ''}`)
  },
}

// ─── Prepaid ────────────────────────────────────────────────
export const prepaidAPI = {
  getBalance: (profileId: string) => api<{ balance: PrepaidBalance }>(`/prepaid/balance/${profileId}`),
  checkValidity: (profileId: string) => api<{ valid: boolean; balance?: number }>(`/prepaid/check-validity/${profileId}`),
  deduct: (d: any) => api('/prepaid/deduct', { method: 'POST', body: JSON.stringify(d) }),
}

// ─── Expenses ──────────────────────────────────────────────
export const expensesAPI = {
  getAll: (params?: { status?: string; category?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ expenses: Expense[]; pagination?: any }>(`/expenses${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => api<{ expense: Expense }>(`/expenses/${id}`),
  create: (d: any) => api<{ expense: Expense }>('/expenses', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: any) => api<{ expense: Expense }>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: string) => api<{ message: string }>(`/expenses/${id}`, { method: 'DELETE' }),
  getStats: () => api<{ stats: any }>('/expenses/stats'),
}

// ─── Users ─────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api<{ users: User[] }>('/users'),
  getById: (id: string) => api<{ user: User }>(`/users/${id}`),
  create: (d: any) => api<{ user: User }>('/users', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: any) => api<{ user: User }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: string) => api<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
  getAuthorized: () => api<{ users: any[] }>('/users/authorized'),
}

// ─── Custom Fields ─────────────────────────────────────────
export const customFieldsAPI = {
  getAll: (section?: string) => {
    const qp = section ? `?section=${section}` : ''
    return api<{ customFields: CustomField[] }>(`/custom-fields${qp}`)
  },
  getValues: (section: string, entityId: string) => api<{ values: any[] }>(`/custom-field-values/${section}/${entityId}`),
  saveValues: (section: string, entityId: string, values: any) => api(`/custom-field-values/${section}/${entityId}`, { method: 'POST', body: JSON.stringify(values) }),
}

// ─── Settings ──────────────────────────────────────────────
export const settingsAPI = {
  getShipmentSettings: () => api<ShipmentSettings>('/shipment-settings'),
  updateShipmentSettings: (d: any) => api('/shipment-settings', { method: 'PUT', body: JSON.stringify(d) }),
  getInvoiceSettings: () => api<InvoiceSettings>('/invoice-settings'),
  updateInvoiceSettings: (d: any) => api('/invoice-settings', { method: 'PUT', body: JSON.stringify(d) }),
  getInventoryConfig: () => api<{ config: any }>('/inventory-config'),
  updateInventoryConfig: (d: any) => api('/inventory-config', { method: 'PUT', body: JSON.stringify(d) }),
  getCompany: () => api<{ company: Company }>('/company'),
  updateCompany: (d: FormData) => apiFormData<{ company: Company }>('/company', d),
  getPermissions: () => api<{ permissions: Permission[] }>('/permissions'),
  getNotificationPreferences: () => api<{ preferences: NotificationPreference[] }>('/notification-preferences'),
  updateNotificationPreference: (id: string, d: any) => api(`/notification-preferences/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
}

// ─── Email ─────────────────────────────────────────────────
export const emailAPI = {
  getSettings: () => api<EmailSettings>('/email'),
  updateSettings: (d: any) => api('/email', { method: 'PUT', body: JSON.stringify(d) }),
  testConnection: () => api<{ success: boolean }>('/email/test', { method: 'POST' }),
  sendCustom: (d: any) => api('/email/send', { method: 'POST', body: JSON.stringify(d) }),
  getStats: () => api<{ stats: any }>('/email/stats'),
}

// ─── Templates ─────────────────────────────────────────────
export const templatesAPI = {
  getAll: (type?: string) => {
    const qp = type ? `?type=${type}` : ''
    return api<{ templates: Template[] }>(`/templates${qp}`)
  },
  getById: (id: string) => api<{ template: Template }>(`/templates/${id}`),
  create: (d: any) => api('/templates', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: any) => api(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: string) => api(`/templates/${id}`, { method: 'DELETE' }),
}

// ─── Plugins ───────────────────────────────────────────────
export const pluginsAPI = {
  getAll: () => api<{ plugins: Plugin[] }>('/plugins'),
  toggle: (id: string, enabled: boolean) => api(`/plugins/${id}/toggle`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
}

// ─── Backups ───────────────────────────────────────────────
export const backupsAPI = {
  getAll: () => api<{ backups: Backup[] }>('/backups'),
  create: (d: any) => api<{ backup: Backup }>('/backups', { method: 'POST', body: JSON.stringify(d) }),
  createFull: () => api<{ backup: Backup }>('/backups/full', { method: 'POST' }),
  delete: (id: string) => api(`/backups/${id}`, { method: 'DELETE' }),
  getSettings: () => api<BackupSettings>('/backups/settings'),
  updateSettings: (d: any) => api('/backups/settings', { method: 'PUT', body: JSON.stringify(d) }),
}

// ─── System ────────────────────────────────────────────────
export const systemAPI = {
  getHealth: () => api<SystemHealth>('/system/health'),
  getActivityLogs: (params?: { limit?: number }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ logs: ActivityLog[] }>(`/system/activity${qs ? `?${qs}` : ''}`)
  },
}

// ─── Upload (generic) ──────────────────────────────────────
export const uploadAPI = {
  upload: (formData: FormData, type: string = 'general') => {
    formData.append('type', type)
    return apiFormData<{ url: string }>('/upload', formData)
  },
}

// ─── Worker Dashboard ─────────────────────────────────────
export const workerAPI = {
  getTasks: () => api<{ tasks: any[] }>('/worker-dashboard/tasks'),
  updateTask: (id: string, data: any) => api(`/worker-dashboard/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ─── Reports ───────────────────────────────────────────────
export const reportsAPI = {
  getShipmentReport: (id: string) => api<{ report: any }>(`/shipments/${id}/report`),
  getDamageReports: (params?: { status?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ reports: any[] }>(`/reports/damages${qs ? `?${qs}` : ''}`)
  },
}

// ─── Analytics ─────────────────────────────────────────────
export const analyticsAPI = {
  getCompanyAnalytics: (companyId: string) => api<{ analytics: any }>(`/analytics/company/${companyId}`),
  getFinancialAnalytics: (params?: { startDate?: string; endDate?: string }) => {
    const qp = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qp.append(k, String(v)))
    const qs = qp.toString()
    return api<{ analytics: any }>(`/analytics/financial${qs ? `?${qs}` : ''}`)
  },
}

// API Client — centralized fetch with auth token
import type { DashboardStats, FinanceOverview, Shipment, Rack, Material, Invoice, Payment } from './types'

const API_BASE = '/api'

let authToken: string | null = localStorage.getItem('wms_v2_token')

// Token management
export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('wms_v2_token', token)
  else localStorage.removeItem('wms_v2_token')
}

export function getToken(): string | null {
  return authToken
}

// Generic API call
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error: ${res.status}`)
  }
  
  return res.json()
}

// Auth
export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

// Dashboard
export const fetchDashboardStats = () => api<DashboardStats>('/dashboard/stats')

// Finance
export const fetchFinanceOverview = (params?: { startDate?: string; endDate?: string }) => {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : ''
  return api<FinanceOverview>(`/finance/overview${qs}`)
}

// Shipments
export const fetchShipments = (params?: { page?: number; limit?: number; status?: string }) => {
  const qs = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_,v]) => v !== undefined)) as any).toString()}` : ''
  return api<{ shipments: Shipment[]; pagination: any }>(`/shipments${qs}`)
}

export const fetchShipment = (id: string) => api<Shipment>(`/shipments/${id}`)

// Racks
export const fetchRacks = (params?: { page?: number; limit?: number; status?: string }) => {
  const qs = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_,v]) => v !== undefined)) as any).toString()}` : ''
  return api<{ racks: Rack[]; pagination?: any }>(`/racks${qs}`)
}

export const fetchRack = (id: string) => api<Rack>(`/racks/${id}`)

// Materials
export const fetchMaterials = (params?: { page?: number; limit?: number }) => {
  const qs = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_,v]) => v !== undefined)) as any).toString()}` : ''
  return api<{ materials: Material[]; pagination?: any }>(`/materials${qs}`)
}

// Invoices
export const fetchInvoices = (params?: { page?: number; limit?: number; status?: string }) => {
  const qs = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_,v]) => v !== undefined)) as any).toString()}` : ''
  return api<{ invoices: Invoice[]; pagination: any }>(`/finance/invoices${qs}`)
}

// Payments
export const fetchPayments = (params?: { page?: number; limit?: number }) => {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : ''
  return api<{ payments: Payment[]; pagination: any }>(`/finance/payments${qs}`)
}

// Company Profiles
export const fetchCustomers = (params?: { page?: number; limit?: number }) => {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : ''
  return api<{ profiles: any[]; pagination: any }>(`/company-profiles${qs}`)
}

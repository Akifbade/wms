import type { DashboardStats, Shipment, Rack, Customer, Invoice, Payment, PackingMaterial, MovingJob, User } from './types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

// ========== DASHBOARD ==========

export async function fetchDashboard(): Promise<DashboardStats> {
  try {
    return await request<DashboardStats>('/dashboard')
  } catch {
    return getMockDashboard()
  }
}

function getMockDashboard(): DashboardStats {
  return {
    totalShipments: 372,
    activeShipments: 156,
    totalBoxes: 6226,
    totalRacks: 232,
    activeRacks: 180,
    rackUtilization: 52,
    totalCBM: 850.5,
    usedCBM: 442.3,
    cbmUtilization: 52,
    pendingInvoices: 89,
    totalPendingAmount: 88620,
    collectedAmount: 1241,
    collectionRate: 1.4,
    totalCustomers: 102,
    activeJobs: 24,
    recentShipments: [
      { id: '1', name: 'DIOR - Spring Collection', customer: 'DIOR', boxes: 45, status: 'ACTIVE', date: 'Jun 3', cbm: 12.5 },
      { id: '2', name: 'JAZEERA - Electronics', customer: 'JAZEERA', boxes: 32, status: 'PARTIAL', date: 'Jun 2', cbm: 8.2 },
      { id: '3', name: 'Boodai Trading - Furniture', customer: 'Boodai Trading', boxes: 18, status: 'RELEASED', date: 'Jun 1', cbm: 15.0 },
      { id: '4', name: 'Nike - Footwear', customer: 'Nike', boxes: 67, status: 'ACTIVE', date: 'May 31', cbm: 6.8 },
      { id: '5', name: 'Alshaya - Retail', customer: 'Alshaya', boxes: 23, status: 'IN_STORAGE', date: 'May 30', cbm: 9.1 },
    ],
  }
}

// ========== SHIPMENTS ==========
export async function fetchShipments(): Promise<Shipment[]> {
  try {
    return await request<Shipment[]>('/shipments')
  } catch {
    return []
  }
}

export async function fetchShipment(id: string): Promise<Shipment> {
  return request<Shipment>(`/shipments/${id}`)
}

export async function createShipment(data: Partial<Shipment>): Promise<Shipment> {
  return request<Shipment>('/shipments', { method: 'POST', body: JSON.stringify(data) })
}

// ========== RACKS ==========
export async function fetchRacks(): Promise<Rack[]> {
  try { return await request<Rack[]>('/racks') }
  catch { return [] }
}

export async function createRack(data: Partial<Rack>): Promise<Rack> {
  return request<Rack>('/racks', { method: 'POST', body: JSON.stringify(data) })
}

// ========== CUSTOMERS ==========
export async function fetchCustomers(): Promise<Customer[]> {
  try { return await request<Customer[]>('/company-profiles') }
  catch { return [] }
}

// ========== INVOICES ==========
export async function fetchInvoices(): Promise<Invoice[]> {
  try { return await request<Invoice[]>('/invoices') }
  catch { return [] }
}

// ========== PAYMENTS ==========
export async function fetchPayments(): Promise<Payment[]> {
  try { return await request<Payment[]>('/payments') }
  catch { return [] }
}

// ========== MATERIALS ==========
export async function fetchMaterials(): Promise<PackingMaterial[]> {
  try { return await request<PackingMaterial[]>('/packing-materials') }
  catch { return [] }
}

// ========== JOBS ==========
export async function fetchJobs(): Promise<MovingJob[]> {
  try { return await request<MovingJob[]>('/moving-jobs') }
  catch { return [] }
}

// ========== USERS ==========
export async function fetchUsers(): Promise<User[]> {
  try { return await request<User[]>('/users') }
  catch { return [] }
}

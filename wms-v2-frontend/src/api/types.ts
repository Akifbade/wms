// API Types for WMS v2
// Based on actual staging backend API responses

// ==================== SHIPMENTS ====================
export interface ShipmentBox {
  id: string
  boxNumber: number
  qrCode?: string
  status: string // PENDING, IN_STORAGE, RELEASED
  rackId?: string
  photos?: string
  rack?: { id: string; code: string; location?: string }
  shipment?: { id: string; boxesPerPallet: number; palletCount: number }
}

export interface CompanyProfile {
  id: string
  name: string
  logo?: string
  contractStatus?: string
  contactPerson?: string
  contactPhone?: string
  description?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface Shipment {
  id: string
  name: string
  referenceId: string
  originalBoxCount: number
  currentBoxCount: number
  type: string
  arrivalDate: string
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  description?: string
  estimatedValue?: number
  notes?: string
  status: string
  category: string
  companyProfileId?: string
  customerName?: string
  awbNumber?: string
  cbm?: number
  weight?: number
  palletCount?: number
  boxesPerPallet?: number
  length?: number
  width?: number
  height?: number
  createdAt: string
  updatedAt: string
  boxes: ShipmentBox[]
  companyProfile?: CompanyProfile
  createdBy?: User
  assignedBy?: User
  totalBoxes?: number
  assignedBoxes?: number
  inStorageBoxes?: number
  releasedBoxes?: number
  rackLocations?: string
}

// ==================== RACKS ====================
export interface Rack {
  id: string
  code: string
  rackType: string
  location?: string
  zone?: string
  zoneDescription?: string
  zoneIcon?: string
  status: string
  // CBM Capacity
  cbmCapacity?: number
  cbmUsed: number
  // Traditional Capacity
  capacityTotal: number
  capacityUsed: number
  // Pallet/Box capacity
  palletCapacity?: number
  boxCapacity?: number
  currentPallets?: number
  currentBoxes?: number
  capacityNotes?: string
  // Dimensions
  length?: number
  width?: number
  height?: number
  // Relations
  companyProfileId?: string
  categoryId?: string
  companyProfile?: CompanyProfile
  boxes: ShipmentBox[]
  utilization: number
}

// ==================== MATERIALS ====================
export interface Material {
  id: string
  sku: string
  name: string
  description?: string
  unit: string
  category: string
  categoryId?: string
  minStockLevel: number
  totalQuantity: number
  unitCost?: number
  sellingPrice?: number
  isActive: boolean
}

export interface Vendor {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  isActive: boolean
}

// ==================== FINANCE ====================
export interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  invoiceDate: string
  dueDate: string
  invoiceType: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paymentStatus: string
  paidAmount: number
  balanceDue: number
  shipmentId?: string
  companyProfileId?: string
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: string
  transactionRef?: string
}

// ==================== DASHBOARD ====================
export interface DashboardStats {
  totalShipments: number
  pendingShipments: number
  inStorageShipments: number
  releasedShipments: number
  activeShipments: number
  totalRacks: number
  activeRacks: number
  totalJobs: number
  scheduledJobs: number
  inProgressJobs: number
  completedJobs: number
  // Additional computed fields
  totalBoxes?: number
  totalCBM?: number
  usedCBM?: number
}

// ==================== FINANCE OVERVIEW ====================
export interface FinanceOverview {
  totalRevenue: number
  totalCollected: number
  totalPending: number
  overdueAmount: number
  invoiceCount: number
  paidCount: number
  pendingCount: number
  overdueCount: number
  collectionRate: number
}

// ==================== USERS/AUTH ====================
export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
    companyId: string
    company: { id: string; name: string; plan: string }
  }
}

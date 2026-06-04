// ========== CORE ENTITY TYPES ==========

export interface Company {
  id: string
  name: string
  email: string
  phone?: string
  logo?: string
  isActive: boolean
  plan: string
  currency: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: 'ADMIN' | 'MANAGER' | 'DRIVER' | 'WORKER' | 'SCANNER' | 'PACKER' | 'LABOR'
  isActive: boolean
  avatar?: string
  companyId: string
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  description?: string
  logo?: string
  contactPerson?: string
  contactPhone?: string
  contractStatus: string
  isActive: boolean
  companyId: string
  billingType: string
  cbmRatePerDay: number
  monthlyContractAmount: number
  freeStorageDays: number
  advanceBalance: number
  statementEmails?: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  logo?: string
  companyId: string
  isActive: boolean
  createdAt: string
}

export interface Rack {
  id: string
  code: string
  qrCode: string
  rackType: string
  categoryId?: string
  companyProfileId?: string
  location?: string
  zone?: string
  zoneDescription?: string
  
  // Dimensions
  length?: number
  width?: number
  height?: number
  dimensionUnit: string
  
  // CBM (primary capacity system)
  cbmCapacity?: number
  cbmUsed: number
  
  // Legacy (kept for migration)
  capacityTotal: number
  capacityUsed: number
  
  // Pallets
  palletCapacity?: number
  boxCapacity?: number
  currentPallets?: number
  currentBoxes?: number
  
  status: string
  lastActivity?: string
  companyId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

// ========== SHIPMENT ==========

export interface ShipmentDimension {
  id: string
  shipmentId: string
  label?: string
  itemType: string
  quantity: number
  length: number
  width: number
  height: number
  cbm: number
  totalCBM: number
  weight?: number
  totalWeight?: number
  rackId?: string
  status: string
  assignedAt?: string
  releasedAt?: string
  notes?: string
}

export interface ShipmentBox {
  id: string
  shipmentId: string
  boxNumber: number
  qrCode: string
  rackId?: string
  status: 'PENDING' | 'IN_STORAGE' | 'RELEASED'
  assignedAt?: string
  releasedAt?: string
  photos?: string
}

export interface ShipmentItem {
  id: string
  shipmentId: string
  itemName: string
  itemDescription?: string
  category: string
  quantity: number
  weight?: number
  value?: number
  barcode?: string
  photos?: string
  boxNumbers?: string
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
  status: string
  category: string
  companyProfileId?: string
  awbNumber?: string
  flightNumber?: string
  origin?: string
  destination?: string
  customerName?: string
  palletCount?: number
  boxesPerPallet?: number
  length?: number
  width?: number
  height?: number
  cbm?: number
  weight?: number
  companyId: string
  createdById?: string
  assignedById?: string
  releasedById?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  
  // Relations
  boxes?: ShipmentBox[]
  dimensions?: ShipmentDimension[]
  items?: ShipmentItem[]
  customer?: Customer
}

// ========== INVENTORY / MATERIALS ==========

export interface PackingMaterial {
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
  companyId: string
}

export interface Vendor {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  rating?: number
  notes?: string
  isActive: boolean
  companyId: string
}

export interface StockBatch {
  id: string
  batchNumber?: string
  materialId: string
  vendorId?: string
  purchaseOrder?: string
  purchaseDate: string
  quantityPurchased: number
  quantityRemaining: number
  unitCost: number
  sellingPrice?: number
  notes?: string
  companyId: string
}

export interface MaterialIssue {
  id: string
  jobId?: string
  issueType: string
  reference?: string
  materialId: string
  stockBatchId?: string
  quantity: number
  unitCost: number
  totalCost: number
  rackId?: string
  issuedById?: string
  issuedAt: string
  notes?: string
  companyId: string
}

// ========== FINANCE ==========

export interface Invoice {
  id: string
  invoiceNumber: string
  companyId: string
  shipmentId?: string
  companyProfileId?: string
  clientName: string
  clientPhone?: string
  invoiceDate: string
  dueDate: string
  invoiceType: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
  paidAmount: number
  balanceDue: number
  notes?: string
  createdAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: string
  transactionRef?: string
  notes?: string
}

// ========== MOVING JOBS ==========

export interface MovingJob {
  id: string
  jobCode: string
  jobTitle: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  jobDate: string
  jobAddress: string
  dropoffAddress?: string
  status: string
  teamLeaderId?: string
  notes?: string
  companyId: string
  createdAt: string
}

export interface JobAssignment {
  id: string
  jobId: string
  userId: string
  role: string
  checkInAt?: string
  checkOutAt?: string
  hourlyRate?: number
  hoursWorked?: number
}

// ========== DASHBOARD ==========

export interface DashboardStats {
  totalShipments: number
  activeShipments: number
  totalBoxes: number
  totalRacks: number
  activeRacks: number
  rackUtilization: number
  totalCBM: number
  usedCBM: number
  cbmUtilization: number
  pendingInvoices: number
  totalPendingAmount: number
  collectedAmount: number
  collectionRate: number
  totalCustomers: number
  activeJobs: number
  recentShipments: ShipmentSummary[]
}

export interface ShipmentSummary {
  id: string
  name: string
  customer: string
  boxes: number
  status: string
  date: string
  cbm: number
}

// ========== ENUMS ==========

export type ShipmentStatus = 'ACTIVE' | 'PARTIAL' | 'RELEASED' | 'IN_STORAGE' | 'PENDING'
export type RackStatus = 'ACTIVE' | 'MAINTENANCE' | 'RESERVED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
export type JobStatus = 'PLANNED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'
export type UserRole = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'WORKER' | 'SCANNER' | 'PACKER' | 'LABOR'

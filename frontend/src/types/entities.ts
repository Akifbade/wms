/**
 * Core entity types for WMS
 * Shared between API layer and components
 */

// ─── Base / Common ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  branding?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Racks ───────────────────────────────────────────────

export interface Rack {
  id: string;
  code: string;
  name: string;
  category?: string;
  categoryId?: string;
  capacityTotal?: number;
  capacityUsed?: number;
  status: 'available' | 'full' | 'maintenance';
  location?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RackCategory {
  id: string;
  name: string;
  description?: string;
}

// ─── Shipments ───────────────────────────────────────────

export interface ShipmentDimension {
  id: string;
  shipmentId: string;
  length: number;
  width: number;
  height: number;
  weight?: number;
  quantity: number;
  cbm: number;
  rackId?: string;
  rackCode?: string;
  status?: string;
  createdAt?: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  status: string;
  shipperName?: string;
  shipperContact?: string;
  consigneeName?: string;
  consigneeContact?: string;
  origin?: string;
  destination?: string;
  totalBoxes: number;
  totalPallets?: number;
  totalWeight?: number;
  totalCBM?: number;
  isWarehouseShipment?: boolean;
  shipmentPhotos?: unknown[];
  companyId?: string;
  dimensions?: ShipmentDimension[];
  boxes?: Box[];
  createdAt: string;
  updatedAt: string;
}

export interface Box {
  id: string;
  shipmentId?: string;
  barcode: string;
  trackingNumber?: string;
  weight?: number;
  status?: string;
  rackId?: string;
}

// ─── Jobs (Moving Jobs) ──────────────────────────────────

export interface MovingJob {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  customerName?: string;
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalCost?: number;
  notes?: string;
  companyId: string;
  materials?: JobMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface JobMaterial {
  id: string;
  jobId: string;
  materialId: string;
  materialName?: string;
  quantityIssued: number;
  quantityUsed?: number;
  quantityGood?: number;
  quantityDamaged?: number;
  unit?: string;
}

// ─── Materials ───────────────────────────────────────────

export interface Material {
  id: string;
  name: string;
  code?: string;
  category?: string;
  unit: string;
  quantity: number;
  availableQuantity?: number;
  minStock?: number;
  cost?: number;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier?: string;
  status: string;
  totalCost?: number;
  items?: unknown[];
  createdAt: string;
}

export interface MaterialIssue {
  id: string;
  jobId: string;
  materialId: string;
  quantity: number;
  issuedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface MaterialReturn {
  id: string;
  issueId?: string;
  jobId: string;
  materialId: string;
  quantityUsed: number;
  quantityGood: number;
  quantityDamaged: number;
  notes?: string;
  createdAt: string;
}

export interface MaterialApproval {
  id: string;
  type: string;
  status: string;
  requestedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Withdrawals ─────────────────────────────────────────

export interface Withdrawal {
  id: string;
  withdrawalNumber: string;
  shipmentId?: string;
  status: string;
  items?: unknown[];
  notes?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Expenses ────────────────────────────────────────────

export interface Expense {
  id: string;
  expenseNumber?: string;
  category: string;
  description?: string;
  amount: number;
  currency?: string;
  status: string;
  date?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Billing / Invoices ─────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  customerName?: string;
  totalAmount: number;
  paidAmount?: number;
  currency?: string;
  dueDate?: string;
  items?: unknown[];
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargeType {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit?: string;
  isActive: boolean;
}

// ─── Settings ────────────────────────────────────────────

export interface BillingSettings {
  currency: string;
  taxRate?: number;
  paymentTerms?: string;
  [key: string]: unknown;
}

export interface InvoiceSettings {
  prefix?: string;
  nextNumber?: number;
  footer?: string;
  [key: string]: unknown;
}

export interface ShipmentSettings {
  autoGenerateTracking?: boolean;
  requireDimensions?: boolean;
  [key: string]: unknown;
}

// ─── Custom Fields ───────────────────────────────────────

export interface CustomField {
  id: string;
  section: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
  companyId?: string;
}

// ─── Dashboard ───────────────────────────────────────────

export interface DashboardStats {
  totalShipments: number;
  activeJobs: number;
  totalRacks: number;
  occupiedRacks: number;
  recentActivity?: unknown[];
  storageAnalytics?: Record<string, unknown>;
}

// ─── API Response Wrappers ───────────────────────────────

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

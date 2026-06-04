// ═══════════════════════════════════════════════════════════════
// WMS v2 — Complete Type Definitions
// ═══════════════════════════════════════════════════════════════

export interface User {
  id: string; email: string; name: string; role: string;
  companyId: string; isActive: boolean; createdAt: string; updatedAt: string;
}
export interface Company {
  id: string; name: string; email: string; phone?: string;
  address?: string; logo?: string; branding?: any; settings?: any;
}

export interface CompanyProfile {
  id: string; name: string; email?: string; phone?: string; address?: string;
  logo?: string; contactPerson?: string; contractStart?: string; contractEnd?: string;
  hasContract?: boolean; monthlyRate?: number; prepaidBalance?: number;
  status?: string; createdAt?: string; updatedAt?: string;
}

export interface Rack {
  id: string; code: string; name: string; category?: string;
  categoryId?: string; section?: string; location?: string; zone?: string;
  capacityTotal?: number; capacityUsed?: number;
  cbmCapacity?: number; cbmUsed?: number;
  status: 'available' | 'full' | 'maintenance' | 'partial';
  companyId: string; createdAt: string; updatedAt: string;
}

export interface RackCategory { id: string; name: string; description?: string; }

export interface ShipmentDimension {
  id: string; shipmentId: string; length: number; width: number; height: number;
  weight?: number; quantity: number; cbm: number; label?: string; itemType?: string;
  rackId?: string; rackCode?: string; status?: string;
}

export interface Shipment {
  id: string; trackingNumber: string; referenceId?: string;
  status: string; clientName?: string; clientPhone?: string; clientEmail?: string;
  shipperName?: string; shipperContact?: string; shipperAddress?: string;
  consigneeName?: string; consigneeContact?: string; consigneeAddress?: string;
  origin?: string; destination?: string;
  totalBoxes: number; currentBoxCount?: number; palletCount?: number;
  totalWeight?: number; totalCBM?: number;
  isWarehouseShipment?: boolean; warehouseNotes?: string;
  shipmentPhotos?: string[]; description?: string; notes?: string;
  estimatedValue?: number; storageType?: string; specialInstructions?: string;
  companyId?: string; companyProfileId?: string; companyProfile?: CompanyProfile;
  dimensions?: ShipmentDimension[]; boxes?: Box[];
  rackId?: string; rackCode?: string; rackLocation?: string;
  receivedDate?: string; arrivalDate?: string;
  createdBy?: string; createdByName?: string;
  createdAt: string; updatedAt: string;
}

export interface Box {
  id: string; shipmentId?: string; barcode: string;
  trackingNumber?: string; weight?: number; status?: string;
  rackId?: string; rackCode?: string; palletNumber?: number;
}

export interface MovingJob {
  id: string; jobNumber: string; title: string; status: string;
  clientName?: string; customerName?: string;
  origin?: string; destination?: string;
  startDate?: string; endDate?: string;
  totalCost?: number; notes?: string; jobType?: string;
  companyId: string; materials?: JobMaterial[];
  assignedTo?: string[]; scheduledDate?: string;
  createdAt: string; updatedAt: string;
}

export interface JobMaterial {
  id: string; jobId: string; materialId: string; materialName?: string;
  quantityIssued: number; quantityUsed?: number;
  quantityGood?: number; quantityDamaged?: number; unit?: string;
}

export interface Material {
  id: string; name: string; code?: string; sku?: string;
  category?: string; unit: string; quantity: number;
  availableQuantity?: number; minStock?: number; maxStock?: number;
  cost?: number; location?: string; companyId?: string;
  createdAt: string; updatedAt: string;
}

export interface PurchaseOrder {
  id: string; orderNumber: string; supplier?: string; status: string;
  totalCost?: number; items?: any[]; notes?: string;
  createdAt: string;
}

export interface MaterialIssue {
  id: string; jobId: string; materialId: string; quantity: number;
  issuedBy?: string; notes?: string; createdAt: string;
}

export interface MaterialReturn {
  id: string; issueId?: string; jobId: string; materialId: string;
  quantityUsed: number; quantityGood: number; quantityDamaged: number;
  notes?: string; createdAt: string;
}

export interface MaterialApproval {
  id: string; type: string; status: string;
  requestedBy?: string; approvedBy?: string; notes?: string;
  createdAt: string; updatedAt: string;
}

export interface Withdrawal {
  id: string; withdrawalNumber: string; shipmentId?: string; status: string;
  withdrawnBoxCount?: number; withdrawnBy?: string;
  driverName?: string; reason?: string; receiptNumber?: string;
  notes?: string; photos?: string[];
  companyId?: string; createdAt: string; updatedAt: string;
}

export interface Expense {
  id: string; expenseNumber?: string; category: string;
  description?: string; amount: number; currency?: string;
  status: string; date?: string; paidDate?: string;
  companyId?: string; createdBy?: string;
  createdAt: string; updatedAt: string;
}

export interface Invoice {
  id: string; invoiceNumber: string; status: string;
  clientName?: string; customerName?: string;
  totalAmount: number; paidAmount?: number; currency?: string;
  dueDate?: string; issueDate?: string; notes?: string;
  lineItems?: InvoiceLineItem[];
  companyId?: string; companyProfileId?: string;
  createdAt: string; updatedAt: string;
}

export interface InvoiceLineItem {
  id?: string; description: string; quantity: number;
  unitPrice: number; amount: number; taxable?: boolean;
}

export interface Payment {
  id: string; invoiceId: string; amount: number;
  method: string; transactionRef?: string; notes?: string;
  receiptNumber?: string; paidAt: string;
}

export interface ChargeType {
  id: string; name: string; category: string;
  rate: number; unit?: string; description?: string;
  calcType?: 'PER_BOX' | 'FLAT' | 'PERCENTAGE' | 'PER_SHIPMENT';
  minAmount?: number; maxAmount?: number;
  isActive: boolean;
}

export interface Contract {
  id: string; companyProfileId: string; startDate: string;
  endDate: string; monthlyRate: number; status: string;
  terms?: string; notes?: string;
}

export interface CustomField {
  id: string; section: string; name: string; label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required?: boolean; options?: string[]; companyId?: string;
}

export interface DashboardStats {
  totalShipments: number; activeJobs: number; totalRacks: number;
  occupiedRacks: number; pendingCollection: number;
  totalRevenue: number; collectedRevenue: number;
  totalCustomers: number; activeRacks: number;
  totalCBM: number; usedCBM: number;
  recentShipments?: any[]; storageAnalytics?: any;
  topClients?: any[]; storageBySection?: any[];
  recentActivities?: any[]; recentJobs?: any[];
}

export interface BillingSettings {
  currency: string; taxRate?: number; paymentTerms?: string;
  defaultCBMRate?: number; defaultBoxRate?: number;
  requireIDVerification?: boolean; requireReleasePhotos?: boolean;
  gracePeriodDays?: number; minimumCharge?: number;
}

export interface InvoiceSettings {
  prefix?: string; nextNumber?: number; footer?: string;
  logo?: string; companyInfo?: string;
}

export interface ShipmentSettings {
  autoGenerateTracking?: boolean; requireDimensions?: boolean;
  requireClientEmail?: boolean; requireClientPhone?: boolean;
  requireEstimatedValue?: boolean; requireRackAssignment?: boolean;
  formSectionOrder?: string[];
}

export interface EmailSettings {
  host: string; port: number; secure: boolean;
  user: string; fromName: string; fromEmail: string;
  enabled: boolean; template?: string;
}

export interface BackupSettings {
  enabled: boolean; schedule: string; retention: number;
  gitRepo?: string; gitBranch?: string;
}

export interface NotificationPreference {
  id: string; type: string; enabled: boolean;
  email: boolean; telegram?: boolean; sms?: boolean;
}

export interface PrepaidBalance {
  balance: number; currency: string; lastUpdated: string;
}

export interface SystemHealth {
  status: string; uptime: number; memory: any; cpu: any;
  disk: any; database: string; lastBackup?: string;
}

export interface ActivityLog {
  id: string; userId: string; userName: string;
  action: string; entityType: string; entityId: string;
  details: string; timestamp: string;
}

export interface Permission {
  id: string; name: string; description: string;
  module: string; actions: string[];
}

export interface Backup {
  id: string; name: string; type: string; size: number;
  status: string; createdAt: string; path?: string;
}

export interface Template {
  id: string; name: string; type: string;
  subject?: string; body: string; variables?: string[];
}

export interface Plugin {
  id: string; name: string; version: string;
  enabled: boolean; config?: any; status?: string;
}

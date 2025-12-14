import { z } from 'zod';

/**
 * Validation schemas for all API endpoints
 * Use these to validate request data before processing
 */

// ==================== SHIPMENT SCHEMAS ====================

export const createShipmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  referenceId: z.string().min(1, 'Reference ID is required').max(100),
  originalBoxCount: z.number().int().positive('Box count must be positive').max(10000),
  type: z.enum(['PERSONAL', 'COMMERCIAL']),
  arrivalDate: z.string().datetime().or(z.date()),
  clientName: z.string().min(1).max(200).optional(),
  clientPhone: z.string().regex(/^\+?[0-9]{8,15}$/, 'Invalid phone number').optional(),
  clientEmail: z.string().email('Invalid email').optional(),
  description: z.string().max(1000).optional(),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  isWarehouseShipment: z.boolean().optional(),
  shipper: z.string().max(200).optional(),
  consignee: z.string().max(200).optional(),
});

export const assignBoxesSchema = z.object({
  boxIds: z.array(z.string().cuid()).min(1, 'At least one box required'),
  rackId: z.string().cuid('Invalid rack ID'),
});

export const releaseBoxesSchema = z.object({
  boxIds: z.array(z.string().cuid()).min(1, 'At least one box required'),
  generateInvoice: z.boolean().optional(),
});

// ==================== MATERIAL SCHEMAS ====================

export const createMaterialSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().max(500).optional(),
  unit: z.string().min(1).max(20).default('PCS'),
  category: z.string().min(1).max(100),
  minStockLevel: z.number().int().min(0).default(0),
  unitCost: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
});

export const issueMaterialSchema = z.object({
  jobId: z.string().cuid('Invalid job ID'),
  materialId: z.string().cuid('Invalid material ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  rackId: z.string().cuid().optional(),
  stockBatchId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
});

export const returnMaterialSchema = z.object({
  jobId: z.string().cuid('Invalid job ID'),
  materialId: z.string().cuid('Invalid material ID'),
  issueId: z.string().cuid().optional(),
  quantityGood: z.number().int().min(0),
  quantityDamaged: z.number().int().min(0),
  rackId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
  damageReason: z.string().max(500).optional(),
}).refine(data => data.quantityGood + data.quantityDamaged > 0, {
  message: 'Total quantity must be greater than 0',
});

export const createStockBatchSchema = z.object({
  materialId: z.string().cuid('Invalid material ID'),
  vendorId: z.string().cuid().optional(),
  vendorName: z.string().max(200).optional(),
  purchaseOrder: z.string().max(100).optional(),
  quantityPurchased: z.number().int().positive('Quantity must be positive'),
  unitCost: z.number().positive('Unit cost must be positive'),
  sellingPrice: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

// ==================== MOVING JOB SCHEMAS ====================

export const createMovingJobSchema = z.object({
  jobTitle: z.string().min(5, 'Job title must be at least 5 characters').max(200),
  clientName: z.string().min(2).max(200),
  clientPhone: z.string().regex(/^\+?[0-9]{8,15}$/, 'Invalid phone number'),
  clientEmail: z.string().email().optional(),
  jobDate: z.string().datetime().or(z.date()),
  jobAddress: z.string().min(5).max(500),
  dropoffAddress: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  teamLeaderId: z.string().cuid().optional(),
  driverName: z.string().max(100).optional(),
  vehicleNumber: z.string().max(50).optional(),
});

export const updateJobStatusSchema = z.object({
  status: z.enum(['PLANNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED']),
});

export const assignWorkerSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  role: z.enum(['TEAM_LEAD', 'LABOR', 'DRIVER', 'HELPER', 'SUPERVISOR']),
  hourlyRate: z.number().positive().optional(),
});

export const recordWorkHoursSchema = z.object({
  assignmentId: z.string().cuid('Invalid assignment ID'),
  checkInAt: z.string().datetime().or(z.date()).optional(),
  checkOutAt: z.string().datetime().or(z.date()).optional(),
  hoursWorked: z.number().positive().optional(),
});

// ==================== RACK SCHEMAS ====================

export const createRackSchema = z.object({
  code: z.string().min(1, 'Rack code is required').max(20),
  rackType: z.enum(['STORAGE', 'MATERIALS', 'EQUIPMENT']).default('STORAGE'),
  location: z.string().max(200).optional(),
  capacityTotal: z.number().positive().default(100),
  minCapacity: z.number().int().min(1).default(2),
});

export const updateRackCapacitySchema = z.object({
  capacityTotal: z.number().positive(),
  minCapacity: z.number().int().min(1),
});

// ==================== USER SCHEMAS ====================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2).max(200),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'WORKER']).default('WORKER'),
  skills: z.array(z.string()).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'WORKER']).optional(),
  skills: z.array(z.string()).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ==================== INVOICE SCHEMAS ====================

export const createInvoiceSchema = z.object({
  shipmentId: z.string().cuid('Invalid shipment ID'),
  clientName: z.string().min(2).max(200),
  clientPhone: z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
  clientAddress: z.string().max(500).optional(),
  dueDate: z.string().datetime().or(z.date()),
  invoiceType: z.enum(['STORAGE', 'PARTIAL', 'PERIODIC']).default('STORAGE'),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().max(1000).optional(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().cuid('Invalid invoice ID'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'KNET']),
  transactionRef: z.string().max(100).optional(),
  receiptNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// ==================== HELPER FUNCTION ====================

/**
 * Validate request body against schema
 * Throws error if validation fails
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export default {
  // Shipments
  createShipmentSchema,
  assignBoxesSchema,
  releaseBoxesSchema,
  
  // Materials
  createMaterialSchema,
  issueMaterialSchema,
  returnMaterialSchema,
  createStockBatchSchema,
  
  // Moving Jobs
  createMovingJobSchema,
  updateJobStatusSchema,
  assignWorkerSchema,
  recordWorkHoursSchema,
  
  // Racks
  createRackSchema,
  updateRackCapacitySchema,
  
  // Users
  createUserSchema,
  updateUserSchema,
  loginSchema,
  
  // Invoices
  createInvoiceSchema,
  recordPaymentSchema,
  
  // Helpers
  validateRequest,
  safeValidate,
};

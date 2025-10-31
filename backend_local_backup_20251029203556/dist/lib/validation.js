"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPaymentSchema = exports.createInvoiceSchema = exports.loginSchema = exports.updateUserSchema = exports.createUserSchema = exports.updateRackCapacitySchema = exports.createRackSchema = exports.recordWorkHoursSchema = exports.assignWorkerSchema = exports.updateJobStatusSchema = exports.createMovingJobSchema = exports.createStockBatchSchema = exports.returnMaterialSchema = exports.issueMaterialSchema = exports.createMaterialSchema = exports.releaseBoxesSchema = exports.assignBoxesSchema = exports.createShipmentSchema = void 0;
exports.validateRequest = validateRequest;
exports.safeValidate = safeValidate;
const zod_1 = require("zod");
/**
 * Validation schemas for all API endpoints
 * Use these to validate request data before processing
 */
// ==================== SHIPMENT SCHEMAS ====================
exports.createShipmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(200),
    referenceId: zod_1.z.string().min(1, 'Reference ID is required').max(100),
    originalBoxCount: zod_1.z.number().int().positive('Box count must be positive').max(10000),
    type: zod_1.z.enum(['PERSONAL', 'COMMERCIAL']),
    arrivalDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    clientName: zod_1.z.string().min(1).max(200).optional(),
    clientPhone: zod_1.z.string().regex(/^\+?[0-9]{8,15}$/, 'Invalid phone number').optional(),
    clientEmail: zod_1.z.string().email('Invalid email').optional(),
    description: zod_1.z.string().max(1000).optional(),
    estimatedValue: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().max(2000).optional(),
    isWarehouseShipment: zod_1.z.boolean().optional(),
    shipper: zod_1.z.string().max(200).optional(),
    consignee: zod_1.z.string().max(200).optional(),
});
exports.assignBoxesSchema = zod_1.z.object({
    boxIds: zod_1.z.array(zod_1.z.string().cuid()).min(1, 'At least one box required'),
    rackId: zod_1.z.string().cuid('Invalid rack ID'),
});
exports.releaseBoxesSchema = zod_1.z.object({
    boxIds: zod_1.z.array(zod_1.z.string().cuid()).min(1, 'At least one box required'),
    generateInvoice: zod_1.z.boolean().optional(),
});
// ==================== MATERIAL SCHEMAS ====================
exports.createMaterialSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1, 'SKU is required').max(50),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(200),
    description: zod_1.z.string().max(500).optional(),
    unit: zod_1.z.string().min(1).max(20).default('PCS'),
    category: zod_1.z.string().min(1).max(100),
    minStockLevel: zod_1.z.number().int().min(0).default(0),
    unitCost: zod_1.z.number().positive().optional(),
    sellingPrice: zod_1.z.number().positive().optional(),
});
exports.issueMaterialSchema = zod_1.z.object({
    jobId: zod_1.z.string().cuid('Invalid job ID'),
    materialId: zod_1.z.string().cuid('Invalid material ID'),
    quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    rackId: zod_1.z.string().cuid().optional(),
    stockBatchId: zod_1.z.string().cuid().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
exports.returnMaterialSchema = zod_1.z.object({
    jobId: zod_1.z.string().cuid('Invalid job ID'),
    materialId: zod_1.z.string().cuid('Invalid material ID'),
    issueId: zod_1.z.string().cuid().optional(),
    quantityGood: zod_1.z.number().int().min(0),
    quantityDamaged: zod_1.z.number().int().min(0),
    rackId: zod_1.z.string().cuid().optional(),
    notes: zod_1.z.string().max(500).optional(),
    damageReason: zod_1.z.string().max(500).optional(),
}).refine(data => data.quantityGood + data.quantityDamaged > 0, {
    message: 'Total quantity must be greater than 0',
});
exports.createStockBatchSchema = zod_1.z.object({
    materialId: zod_1.z.string().cuid('Invalid material ID'),
    vendorId: zod_1.z.string().cuid().optional(),
    vendorName: zod_1.z.string().max(200).optional(),
    purchaseOrder: zod_1.z.string().max(100).optional(),
    quantityPurchased: zod_1.z.number().int().positive('Quantity must be positive'),
    unitCost: zod_1.z.number().positive('Unit cost must be positive'),
    sellingPrice: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
// ==================== MOVING JOB SCHEMAS ====================
exports.createMovingJobSchema = zod_1.z.object({
    jobTitle: zod_1.z.string().min(5, 'Job title must be at least 5 characters').max(200),
    clientName: zod_1.z.string().min(2).max(200),
    clientPhone: zod_1.z.string().regex(/^\+?[0-9]{8,15}$/, 'Invalid phone number'),
    clientEmail: zod_1.z.string().email().optional(),
    jobDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    jobAddress: zod_1.z.string().min(5).max(500),
    dropoffAddress: zod_1.z.string().max(500).optional(),
    notes: zod_1.z.string().max(2000).optional(),
    teamLeaderId: zod_1.z.string().cuid().optional(),
    driverName: zod_1.z.string().max(100).optional(),
    vehicleNumber: zod_1.z.string().max(50).optional(),
});
exports.updateJobStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PLANNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED']),
});
exports.assignWorkerSchema = zod_1.z.object({
    userId: zod_1.z.string().cuid('Invalid user ID'),
    role: zod_1.z.enum(['TEAM_LEAD', 'LABOR', 'DRIVER', 'HELPER', 'SUPERVISOR']),
    hourlyRate: zod_1.z.number().positive().optional(),
});
exports.recordWorkHoursSchema = zod_1.z.object({
    assignmentId: zod_1.z.string().cuid('Invalid assignment ID'),
    checkInAt: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    checkOutAt: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    hoursWorked: zod_1.z.number().positive().optional(),
});
// ==================== RACK SCHEMAS ====================
exports.createRackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Rack code is required').max(20),
    rackType: zod_1.z.enum(['STORAGE', 'MATERIALS', 'EQUIPMENT']).default('STORAGE'),
    location: zod_1.z.string().max(200).optional(),
    capacityTotal: zod_1.z.number().positive().default(100),
    minCapacity: zod_1.z.number().int().min(1).default(2),
});
exports.updateRackCapacitySchema = zod_1.z.object({
    capacityTotal: zod_1.z.number().positive(),
    minCapacity: zod_1.z.number().int().min(1),
});
// ==================== USER SCHEMAS ====================
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(2).max(200),
    phone: zod_1.z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
    role: zod_1.z.enum(['ADMIN', 'MANAGER', 'WORKER']).default('WORKER'),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    position: zod_1.z.string().max(100).optional(),
    department: zod_1.z.string().max(100).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200).optional(),
    phone: zod_1.z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
    role: zod_1.z.enum(['ADMIN', 'MANAGER', 'WORKER']).optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    position: zod_1.z.string().max(100).optional(),
    department: zod_1.z.string().max(100).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ==================== INVOICE SCHEMAS ====================
exports.createInvoiceSchema = zod_1.z.object({
    shipmentId: zod_1.z.string().cuid('Invalid shipment ID'),
    clientName: zod_1.z.string().min(2).max(200),
    clientPhone: zod_1.z.string().regex(/^\+?[0-9]{8,15}$/).optional(),
    clientAddress: zod_1.z.string().max(500).optional(),
    dueDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    invoiceType: zod_1.z.enum(['STORAGE', 'PARTIAL', 'PERIODIC']).default('STORAGE'),
    discountAmount: zod_1.z.number().min(0).default(0),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.recordPaymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string().cuid('Invalid invoice ID'),
    amount: zod_1.z.number().positive('Amount must be positive'),
    paymentMethod: zod_1.z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'KNET']),
    transactionRef: zod_1.z.string().max(100).optional(),
    receiptNumber: zod_1.z.string().max(100).optional(),
    notes: zod_1.z.string().max(500).optional(),
});
// ==================== HELPER FUNCTION ====================
/**
 * Validate request body against schema
 * Throws error if validation fails
 */
function validateRequest(schema, data) {
    return schema.parse(data);
}
/**
 * Safe validation that returns errors instead of throwing
 */
function safeValidate(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
exports.default = {
    // Shipments
    createShipmentSchema: exports.createShipmentSchema,
    assignBoxesSchema: exports.assignBoxesSchema,
    releaseBoxesSchema: exports.releaseBoxesSchema,
    // Materials
    createMaterialSchema: exports.createMaterialSchema,
    issueMaterialSchema: exports.issueMaterialSchema,
    returnMaterialSchema: exports.returnMaterialSchema,
    createStockBatchSchema: exports.createStockBatchSchema,
    // Moving Jobs
    createMovingJobSchema: exports.createMovingJobSchema,
    updateJobStatusSchema: exports.updateJobStatusSchema,
    assignWorkerSchema: exports.assignWorkerSchema,
    recordWorkHoursSchema: exports.recordWorkHoursSchema,
    // Racks
    createRackSchema: exports.createRackSchema,
    updateRackCapacitySchema: exports.updateRackCapacitySchema,
    // Users
    createUserSchema: exports.createUserSchema,
    updateUserSchema: exports.updateUserSchema,
    loginSchema: exports.loginSchema,
    // Invoices
    createInvoiceSchema: exports.createInvoiceSchema,
    recordPaymentSchema: exports.recordPaymentSchema,
    // Helpers
    validateRequest,
    safeValidate,
};

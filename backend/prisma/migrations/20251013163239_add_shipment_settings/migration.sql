-- AlterTable
ALTER TABLE "shipment_boxes" ADD COLUMN "pieceQR" TEXT;
ALTER TABLE "shipment_boxes" ADD COLUMN "pieceWeight" REAL;

-- CreateTable
CREATE TABLE "shipment_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "requireClientEmail" BOOLEAN NOT NULL DEFAULT false,
    "requireClientPhone" BOOLEAN NOT NULL DEFAULT true,
    "requireEstimatedValue" BOOLEAN NOT NULL DEFAULT false,
    "requirePhotos" BOOLEAN NOT NULL DEFAULT false,
    "autoGenerateQR" BOOLEAN NOT NULL DEFAULT true,
    "qrCodePrefix" TEXT NOT NULL DEFAULT 'SHP',
    "defaultStorageType" TEXT NOT NULL DEFAULT 'PERSONAL',
    "allowMultipleRacks" BOOLEAN NOT NULL DEFAULT false,
    "requireRackAssignment" BOOLEAN NOT NULL DEFAULT false,
    "autoAssignRack" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnLowCapacity" BOOLEAN NOT NULL DEFAULT true,
    "lowCapacityThreshold" INTEGER NOT NULL DEFAULT 80,
    "requireReleaseApproval" BOOLEAN NOT NULL DEFAULT false,
    "releaseApproverRole" TEXT NOT NULL DEFAULT 'MANAGER',
    "requireReleasePhotos" BOOLEAN NOT NULL DEFAULT false,
    "requireIDVerification" BOOLEAN NOT NULL DEFAULT true,
    "generateReleaseInvoice" BOOLEAN NOT NULL DEFAULT true,
    "autoSendInvoiceEmail" BOOLEAN NOT NULL DEFAULT false,
    "storageRatePerDay" REAL NOT NULL DEFAULT 2.0,
    "storageRatePerBox" REAL NOT NULL DEFAULT 0.0,
    "chargePartialDay" BOOLEAN NOT NULL DEFAULT true,
    "minimumChargeDays" INTEGER NOT NULL DEFAULT 1,
    "releaseHandlingFee" REAL NOT NULL DEFAULT 0.0,
    "releasePerBoxFee" REAL NOT NULL DEFAULT 0.0,
    "releaseTransportFee" REAL NOT NULL DEFAULT 0.0,
    "notifyClientOnIntake" BOOLEAN NOT NULL DEFAULT true,
    "notifyClientOnRelease" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStorageAlert" BOOLEAN NOT NULL DEFAULT true,
    "storageAlertDays" INTEGER NOT NULL DEFAULT 30,
    "enableCustomFields" BOOLEAN NOT NULL DEFAULT true,
    "requiredCustomFields" TEXT,
    "allowPartialRelease" BOOLEAN NOT NULL DEFAULT true,
    "partialReleaseMinBoxes" INTEGER NOT NULL DEFAULT 1,
    "requirePartialApproval" BOOLEAN NOT NULL DEFAULT false,
    "requireReleaseSignature" BOOLEAN NOT NULL DEFAULT true,
    "requireCollectorID" BOOLEAN NOT NULL DEFAULT true,
    "allowProxyCollection" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shipment_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "invoiceType" TEXT NOT NULL DEFAULT 'STORAGE',
    "isWarehouseInvoice" BOOLEAN NOT NULL DEFAULT false,
    "warehouseData" TEXT,
    "subtotal" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "balanceDue" REAL NOT NULL,
    "paymentDate" DATETIME,
    "paymentMethod" TEXT,
    "transactionRef" TEXT,
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("balanceDue", "clientAddress", "clientName", "clientPhone", "companyId", "createdAt", "discountAmount", "dueDate", "id", "invoiceDate", "invoiceNumber", "invoiceType", "notes", "paidAmount", "paymentDate", "paymentMethod", "paymentStatus", "shipmentId", "subtotal", "taxAmount", "termsAndConditions", "totalAmount", "transactionRef", "updatedAt") SELECT "balanceDue", "clientAddress", "clientName", "clientPhone", "companyId", "createdAt", "discountAmount", "dueDate", "id", "invoiceDate", "invoiceNumber", "invoiceType", "notes", "paidAmount", "paymentDate", "paymentMethod", "paymentStatus", "shipmentId", "subtotal", "taxAmount", "termsAndConditions", "totalAmount", "transactionRef", "updatedAt" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE TABLE "new_shipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "originalBoxCount" INTEGER NOT NULL,
    "currentBoxCount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "arrivalDate" DATETIME NOT NULL,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "description" TEXT,
    "estimatedValue" REAL,
    "notes" TEXT,
    "qrCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rackId" TEXT,
    "assignedAt" DATETIME,
    "releasedAt" DATETIME,
    "storageCharge" REAL,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isWarehouseShipment" BOOLEAN NOT NULL DEFAULT false,
    "warehouseData" TEXT,
    "shipper" TEXT,
    "consignee" TEXT,
    CONSTRAINT "shipments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shipments_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shipments" ("arrivalDate", "assignedAt", "clientEmail", "clientName", "clientPhone", "companyId", "createdAt", "createdBy", "currentBoxCount", "description", "estimatedValue", "id", "name", "notes", "originalBoxCount", "qrCode", "rackId", "referenceId", "releasedAt", "status", "storageCharge", "type", "updatedAt", "updatedBy") SELECT "arrivalDate", "assignedAt", "clientEmail", "clientName", "clientPhone", "companyId", "createdAt", "createdBy", "currentBoxCount", "description", "estimatedValue", "id", "name", "notes", "originalBoxCount", "qrCode", "rackId", "referenceId", "releasedAt", "status", "storageCharge", "type", "updatedAt", "updatedBy" FROM "shipments";
DROP TABLE "shipments";
ALTER TABLE "new_shipments" RENAME TO "shipments";
CREATE UNIQUE INDEX "shipments_qrCode_key" ON "shipments"("qrCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "shipment_settings_companyId_key" ON "shipment_settings"("companyId");

-- CreateTable
CREATE TABLE "material_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "stockBatchId" TEXT,
    "quantityUsed" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "usageType" TEXT NOT NULL DEFAULT 'PACKING',
    "usedById" TEXT,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_usage_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_usage_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_usage_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_usage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "fromRackId" TEXT,
    "toRackId" TEXT,
    "stockBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "transferType" TEXT NOT NULL DEFAULT 'RACK_TO_RACK',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "completedById" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_transfers_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_transfers_fromRackId_fkey" FOREIGN KEY ("fromRackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_transfers_toRackId_fkey" FOREIGN KEY ("toRackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_transfers_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_transfers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'LOW_STOCK',
    "threshold" INTEGER,
    "currentStock" INTEGER,
    "message" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "stock_alerts_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_alerts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATETIME,
    "receivedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_price_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "vendorId" TEXT,
    "unitCost" REAL NOT NULL,
    "sellingPrice" REAL,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_price_history_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_price_history_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_price_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_vendors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "rating" REAL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_vendors" ("companyId", "contact", "createdAt", "email", "id", "name", "notes", "phone", "updatedAt") SELECT "companyId", "contact", "createdAt", "email", "id", "name", "notes", "phone", "updatedAt" FROM "vendors";
DROP TABLE "vendors";
ALTER TABLE "new_vendors" RENAME TO "vendors";
CREATE UNIQUE INDEX "vendors_name_companyId_key" ON "vendors"("name", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "material_usage_materialId_idx" ON "material_usage"("materialId");

-- CreateIndex
CREATE INDEX "material_usage_shipmentId_idx" ON "material_usage"("shipmentId");

-- CreateIndex
CREATE INDEX "material_transfers_materialId_idx" ON "material_transfers"("materialId");

-- CreateIndex
CREATE INDEX "material_transfers_status_idx" ON "material_transfers"("status");

-- CreateIndex
CREATE INDEX "stock_alerts_materialId_idx" ON "stock_alerts"("materialId");

-- CreateIndex
CREATE INDEX "stock_alerts_isResolved_idx" ON "stock_alerts"("isResolved");

-- CreateIndex
CREATE INDEX "purchase_orders_vendorId_idx" ON "purchase_orders"("vendorId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_companyId_key" ON "purchase_orders"("orderNumber", "companyId");

-- CreateIndex
CREATE INDEX "material_price_history_materialId_idx" ON "material_price_history"("materialId");

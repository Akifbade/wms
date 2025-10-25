-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemDescription" TEXT,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" REAL,
    "value" REAL,
    "barcode" TEXT,
    "photos" TEXT,
    "boxNumbers" TEXT,
    "customAttributes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shipment_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipment_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shipment_boxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "boxNumber" INTEGER NOT NULL,
    "qrCode" TEXT NOT NULL,
    "rackId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedAt" DATETIME,
    "releasedAt" DATETIME,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pieceWeight" REAL,
    "pieceQR" TEXT,
    CONSTRAINT "shipment_boxes_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipment_boxes_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shipment_boxes" ("assignedAt", "boxNumber", "companyId", "createdAt", "id", "pieceQR", "pieceWeight", "qrCode", "rackId", "releasedAt", "shipmentId", "status", "updatedAt") SELECT "assignedAt", "boxNumber", "companyId", "createdAt", "id", "pieceQR", "pieceWeight", "qrCode", "rackId", "releasedAt", "shipmentId", "status", "updatedAt" FROM "shipment_boxes";
DROP TABLE "shipment_boxes";
ALTER TABLE "new_shipment_boxes" RENAME TO "shipment_boxes";
CREATE UNIQUE INDEX "shipment_boxes_qrCode_key" ON "shipment_boxes"("qrCode");
CREATE INDEX "shipment_boxes_rackId_idx" ON "shipment_boxes"("rackId");
CREATE INDEX "shipment_boxes_status_idx" ON "shipment_boxes"("status");
CREATE UNIQUE INDEX "shipment_boxes_shipmentId_boxNumber_key" ON "shipment_boxes"("shipmentId", "boxNumber");
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
    "assignedAt" DATETIME,
    "releasedAt" DATETIME,
    "storageCharge" REAL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "assignedById" TEXT,
    "releasedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isWarehouseShipment" BOOLEAN NOT NULL DEFAULT false,
    "warehouseData" TEXT,
    "shipper" TEXT,
    "consignee" TEXT,
    "category" TEXT NOT NULL DEFAULT 'CUSTOMER_STORAGE',
    "awbNumber" TEXT,
    "flightNumber" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "customerName" TEXT,
    CONSTRAINT "shipments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shipments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shipments" ("arrivalDate", "assignedAt", "assignedById", "clientEmail", "clientName", "clientPhone", "companyId", "consignee", "createdAt", "createdById", "currentBoxCount", "description", "estimatedValue", "id", "isWarehouseShipment", "name", "notes", "originalBoxCount", "qrCode", "referenceId", "releasedAt", "releasedById", "shipper", "status", "storageCharge", "type", "updatedAt", "warehouseData") SELECT "arrivalDate", "assignedAt", "assignedById", "clientEmail", "clientName", "clientPhone", "companyId", "consignee", "createdAt", "createdById", "currentBoxCount", "description", "estimatedValue", "id", "isWarehouseShipment", "name", "notes", "originalBoxCount", "qrCode", "referenceId", "releasedAt", "releasedById", "shipper", "status", "storageCharge", "type", "updatedAt", "warehouseData" FROM "shipments";
DROP TABLE "shipments";
ALTER TABLE "new_shipments" RENAME TO "shipments";
CREATE UNIQUE INDEX "shipments_qrCode_key" ON "shipments"("qrCode");
CREATE INDEX "shipments_category_idx" ON "shipments"("category");
CREATE INDEX "shipments_customerName_idx" ON "shipments"("customerName");
CREATE INDEX "shipments_awbNumber_idx" ON "shipments"("awbNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "shipment_items_shipmentId_idx" ON "shipment_items"("shipmentId");

-- CreateIndex
CREATE INDEX "shipment_items_category_idx" ON "shipment_items"("category");

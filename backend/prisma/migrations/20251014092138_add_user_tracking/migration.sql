-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdById" TEXT,
    "assignedById" TEXT,
    "releasedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isWarehouseShipment" BOOLEAN NOT NULL DEFAULT false,
    "warehouseData" TEXT,
    "shipper" TEXT,
    "consignee" TEXT,
    CONSTRAINT "shipments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shipments_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shipments_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shipments" ("arrivalDate", "assignedAt", "assignedById", "clientEmail", "clientName", "clientPhone", "companyId", "consignee", "createdAt", "createdById", "currentBoxCount", "description", "estimatedValue", "id", "isWarehouseShipment", "name", "notes", "originalBoxCount", "qrCode", "rackId", "referenceId", "releasedAt", "releasedById", "shipper", "status", "storageCharge", "type", "updatedAt", "warehouseData") SELECT "arrivalDate", "assignedAt", "assignedById", "clientEmail", "clientName", "clientPhone", "companyId", "consignee", "createdAt", "createdById", "currentBoxCount", "description", "estimatedValue", "id", "isWarehouseShipment", "name", "notes", "originalBoxCount", "qrCode", "rackId", "referenceId", "releasedAt", "releasedById", "shipper", "status", "storageCharge", "type", "updatedAt", "warehouseData" FROM "shipments";
DROP TABLE "shipments";
ALTER TABLE "new_shipments" RENAME TO "shipments";
CREATE UNIQUE INDEX "shipments_qrCode_key" ON "shipments"("qrCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

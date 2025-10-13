-- CreateTable
CREATE TABLE "shipment_boxes" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shipment_boxes_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipment_boxes_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_racks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "rackType" TEXT NOT NULL DEFAULT 'STORAGE',
    "location" TEXT,
    "capacityTotal" REAL NOT NULL DEFAULT 100,
    "capacityUsed" REAL NOT NULL DEFAULT 0,
    "minCapacity" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastActivity" DATETIME,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "racks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_racks" ("capacityTotal", "capacityUsed", "code", "companyId", "createdAt", "id", "lastActivity", "location", "qrCode", "rackType", "status", "updatedAt") SELECT "capacityTotal", "capacityUsed", "code", "companyId", "createdAt", "id", "lastActivity", "location", "qrCode", "rackType", "status", "updatedAt" FROM "racks";
DROP TABLE "racks";
ALTER TABLE "new_racks" RENAME TO "racks";
CREATE UNIQUE INDEX "racks_qrCode_key" ON "racks"("qrCode");
CREATE UNIQUE INDEX "racks_code_companyId_key" ON "racks"("code", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "shipment_boxes_qrCode_key" ON "shipment_boxes"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_boxes_shipmentId_boxNumber_key" ON "shipment_boxes"("shipmentId", "boxNumber");

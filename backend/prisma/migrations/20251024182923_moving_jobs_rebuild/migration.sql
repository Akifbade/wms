/*
  Warnings:

  - You are about to drop the `job_cost_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_materials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_team_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `material_purchases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `material_rack_storage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `materials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plugin_feature_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plugin_features` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `approvedAt` on the `material_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `material_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `approverNotes` on the `material_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `attachments` on the `material_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `material_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `approvalDate` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `approvalNotes` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `damagePhotos` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `damageReason` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `damagedMaterialId` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `quantityReturned` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `returnReason` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `returnedDate` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `returnedMaterialId` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `material_returns` table. All the data in the column will be lost.
  - You are about to drop the column `actualCost` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `actualEndDate` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `actualStartDate` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedCost` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedHours` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `fromAddress` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `gpsEndLocation` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `gpsStartLocation` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `jobNumber` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `jobType` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `photos` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDate` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledTime` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `toAddress` on the `moving_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `totalProfit` on the `moving_jobs` table. All the data in the column will be lost.
  - Added the required column `materialId` to the `material_returns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobAddress` to the `moving_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobCode` to the `moving_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobDate` to the `moving_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobTitle` to the `moving_jobs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "job_cost_reports_jobId_key";

-- DropIndex
DROP INDEX "job_team_members_jobId_userId_role_key";

-- DropIndex
DROP INDEX "material_rack_storage_materialId_rackId_key";

-- DropIndex
DROP INDEX "materials_code_companyId_key";

-- DropIndex
DROP INDEX "plugin_features_pluginName_featureName_companyId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "job_cost_reports";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "job_materials";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "job_team_members";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "material_purchases";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "material_rack_storage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "materials";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "plugin_feature_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "plugin_features";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "job_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "checkInAt" DATETIME,
    "checkOutAt" DATETIME,
    "hourlyRate" REAL,
    "hoursWorked" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "job_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "job_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "packing_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "category" TEXT NOT NULL,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "packing_materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "purchaseOrder" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantityPurchased" INTEGER NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "sellingPrice" REAL,
    "receivedById" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stock_batches_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_batches_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_batches_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_batches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rack_stock_levels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "stockBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "rack_stock_levels_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rack_stock_levels_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rack_stock_levels_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "stock_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "rack_stock_levels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "stockBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "issuedById" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_issues_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_issues_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "material_issues_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "stock_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_issues_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_damages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "photoUrls" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recordedById" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "approvalNotes" TEXT,
    "rejectionReason" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_damages_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "material_damages_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "material_returns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_damages_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_damages_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_damages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_cost_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "materialsCost" REAL NOT NULL DEFAULT 0,
    "laborCost" REAL NOT NULL DEFAULT 0,
    "damageLoss" REAL NOT NULL DEFAULT 0,
    "otherCost" REAL NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "profit" REAL NOT NULL DEFAULT 0,
    "profitMargin" REAL,
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "job_cost_snapshots_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_cost_snapshots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_plugins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'INSTALLED',
    "entryPointUrl" TEXT,
    "checksum" TEXT,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" DATETIME,
    "deactivatedAt" DATETIME,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "system_plugins_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_plugin_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "performedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "system_plugin_logs_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "system_plugins" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "system_plugin_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_material_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionById" TEXT,
    "decidedAt" DATETIME,
    "decisionNotes" TEXT,
    "subjectReturnId" TEXT,
    "subjectDamageId" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_approvals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_approvals_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_approvals_subjectReturnId_fkey" FOREIGN KEY ("subjectReturnId") REFERENCES "material_returns" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_approvals_subjectDamageId_fkey" FOREIGN KEY ("subjectDamageId") REFERENCES "material_damages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_approvals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_material_approvals" ("approvalType", "companyId", "id", "jobId", "requestedAt", "status") SELECT "approvalType", "companyId", "id", "jobId", "requestedAt", "status" FROM "material_approvals";
DROP TABLE "material_approvals";
ALTER TABLE "new_material_approvals" RENAME TO "material_approvals";
CREATE UNIQUE INDEX "material_approvals_subjectReturnId_key" ON "material_approvals"("subjectReturnId");
CREATE UNIQUE INDEX "material_approvals_subjectDamageId_key" ON "material_approvals"("subjectDamageId");
CREATE TABLE "new_material_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "issueId" TEXT,
    "quantityIssued" INTEGER,
    "quantityUsed" INTEGER,
    "quantityGood" INTEGER NOT NULL DEFAULT 0,
    "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "restockedAt" DATETIME,
    "rackId" TEXT,
    "recordedById" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_returns_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_returns_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "material_returns_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "material_issues" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_returns_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_returns_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_returns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_material_returns" ("companyId", "id", "jobId", "notes", "quantityDamaged") SELECT "companyId", "id", "jobId", "notes", "quantityDamaged" FROM "material_returns";
DROP TABLE "material_returns";
ALTER TABLE "new_material_returns" RENAME TO "material_returns";
CREATE TABLE "new_moving_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCode" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "jobDate" DATETIME NOT NULL,
    "jobAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "teamLeaderId" TEXT,
    "driverName" TEXT,
    "vehicleNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "moving_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "moving_jobs_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_moving_jobs" ("clientEmail", "clientName", "clientPhone", "companyId", "createdAt", "id", "notes", "status", "teamLeaderId", "updatedAt") SELECT "clientEmail", "clientName", "clientPhone", "companyId", "createdAt", "id", "notes", "status", "teamLeaderId", "updatedAt" FROM "moving_jobs";
DROP TABLE "moving_jobs";
ALTER TABLE "new_moving_jobs" RENAME TO "moving_jobs";
CREATE UNIQUE INDEX "moving_jobs_jobCode_key" ON "moving_jobs"("jobCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "job_assignments_jobId_userId_role_key" ON "job_assignments"("jobId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "packing_materials_sku_companyId_key" ON "packing_materials"("sku", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_name_companyId_key" ON "vendors"("name", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_stock_levels_materialId_rackId_stockBatchId_key" ON "rack_stock_levels"("materialId", "rackId", "stockBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "system_plugins_name_companyId_key" ON "system_plugins"("name", "companyId");

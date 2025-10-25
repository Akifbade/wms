/*
  Warnings:

  - You are about to drop the `job_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `totalCost` on the `moving_jobs` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "job_assignments";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "job_team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departedAt" DATETIME,
    "hoursWorked" REAL,
    "hourlyRate" REAL,
    "totalEarnings" REAL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "job_team_members_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityAllocated" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,
    "quantityReturned" INTEGER NOT NULL DEFAULT 0,
    "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "sellingPrice" REAL,
    "totalSellingValue" REAL,
    "allocationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "job_materials_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "category" TEXT NOT NULL,
    "quantityInStock" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 10,
    "costPerUnit" REAL NOT NULL,
    "sellingPrice" REAL,
    "lastVendorId" TEXT,
    "lastPurchaseDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_rack_storage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "quantityStored" INTEGER NOT NULL,
    "dateAdded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" DATETIME,
    "batchNumber" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_rack_storage_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_rack_storage_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorPhone" TEXT,
    "quantityBought" INTEGER NOT NULL,
    "costPerUnit" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_purchases_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "returnedMaterialId" TEXT,
    "damagedMaterialId" TEXT,
    "quantityReturned" INTEGER NOT NULL DEFAULT 0,
    "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
    "returnReason" TEXT,
    "damageReason" TEXT,
    "damagePhotos" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvalDate" DATETIME,
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "returnedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_returns_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_returns_returnedMaterialId_fkey" FOREIGN KEY ("returnedMaterialId") REFERENCES "materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_returns_damagedMaterialId_fkey" FOREIGN KEY ("damagedMaterialId") REFERENCES "materials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "material_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approverNotes" TEXT,
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "attachments" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_approvals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_cost_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "totalMaterialCost" REAL NOT NULL DEFAULT 0,
    "totalMaterialSelling" REAL NOT NULL DEFAULT 0,
    "materialProfit" REAL NOT NULL DEFAULT 0,
    "totalLaborCost" REAL NOT NULL DEFAULT 0,
    "otherCosts" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "estimatedRevenue" REAL NOT NULL DEFAULT 0,
    "actualRevenue" REAL,
    "profitLoss" REAL,
    "profitMargin" REAL,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "job_cost_reports_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plugin_features" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginName" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "configSchema" TEXT,
    "configData" TEXT,
    "apiEndpoints" TEXT,
    "permissions" TEXT,
    "patchVersion" TEXT,
    "installedAt" DATETIME,
    "enabledAt" DATETIME,
    "disabledAt" DATETIME,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "plugin_features_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plugin_feature_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "featureId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "changedBy" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plugin_feature_logs_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "plugin_features" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_moving_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "jobType" TEXT NOT NULL DEFAULT 'LOCAL',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT,
    "scheduledDate" DATETIME NOT NULL,
    "scheduledTime" TEXT,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "estimatedHours" INTEGER,
    "teamLeaderId" TEXT,
    "estimatedCost" REAL,
    "actualCost" REAL,
    "sellingPrice" REAL,
    "totalProfit" REAL,
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "notes" TEXT,
    "photos" TEXT,
    "gpsStartLocation" TEXT,
    "gpsEndLocation" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "moving_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "moving_jobs_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_moving_jobs" ("clientName", "clientPhone", "companyId", "createdAt", "estimatedHours", "fromAddress", "id", "jobType", "scheduledDate", "status", "title", "toAddress", "updatedAt") SELECT "clientName", "clientPhone", "companyId", "createdAt", "estimatedHours", "fromAddress", "id", "jobType", "scheduledDate", "status", "title", "toAddress", "updatedAt" FROM "moving_jobs";
DROP TABLE "moving_jobs";
ALTER TABLE "new_moving_jobs" RENAME TO "moving_jobs";
CREATE UNIQUE INDEX "moving_jobs_jobNumber_key" ON "moving_jobs"("jobNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "job_team_members_jobId_userId_role_key" ON "job_team_members"("jobId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_companyId_key" ON "materials"("code", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "material_rack_storage_materialId_rackId_key" ON "material_rack_storage"("materialId", "rackId");

-- CreateIndex
CREATE UNIQUE INDEX "job_cost_reports_jobId_key" ON "job_cost_reports"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_features_pluginName_featureName_companyId_key" ON "plugin_features"("pluginName", "featureName", "companyId");

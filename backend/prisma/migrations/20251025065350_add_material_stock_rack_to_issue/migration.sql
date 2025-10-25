-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_material_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "stockBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "rackId" TEXT,
    "issuedById" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "material_issues_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "moving_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "material_issues_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "packing_materials" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "material_issues_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "stock_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_issues_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_issues_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "material_issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_material_issues" ("companyId", "id", "issuedAt", "issuedById", "jobId", "materialId", "notes", "quantity", "stockBatchId", "totalCost", "unitCost") SELECT "companyId", "id", "issuedAt", "issuedById", "jobId", "materialId", "notes", "quantity", "stockBatchId", "totalCost", "unitCost" FROM "material_issues";
DROP TABLE "material_issues";
ALTER TABLE "new_material_issues" RENAME TO "material_issues";
CREATE TABLE "new_packing_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "category" TEXT NOT NULL,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" REAL,
    "sellingPrice" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "packing_materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_packing_materials" ("category", "companyId", "createdAt", "description", "id", "isActive", "minStockLevel", "name", "sku", "unit", "updatedAt") SELECT "category", "companyId", "createdAt", "description", "id", "isActive", "minStockLevel", "name", "sku", "unit", "updatedAt" FROM "packing_materials";
DROP TABLE "packing_materials";
ALTER TABLE "new_packing_materials" RENAME TO "packing_materials";
CREATE UNIQUE INDEX "packing_materials_sku_companyId_key" ON "packing_materials"("sku", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

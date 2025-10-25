-- CreateTable
CREATE TABLE "material_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "material_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "material_categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "material_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_packing_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "category" TEXT NOT NULL,
    "categoryId" TEXT,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" REAL,
    "sellingPrice" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "packing_materials_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "material_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "packing_materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_packing_materials" ("category", "companyId", "createdAt", "description", "id", "isActive", "minStockLevel", "name", "sellingPrice", "sku", "totalQuantity", "unit", "unitCost", "updatedAt") SELECT "category", "companyId", "createdAt", "description", "id", "isActive", "minStockLevel", "name", "sellingPrice", "sku", "totalQuantity", "unit", "unitCost", "updatedAt" FROM "packing_materials";
DROP TABLE "packing_materials";
ALTER TABLE "new_packing_materials" RENAME TO "packing_materials";
CREATE INDEX "packing_materials_categoryId_idx" ON "packing_materials"("categoryId");
CREATE UNIQUE INDEX "packing_materials_sku_companyId_key" ON "packing_materials"("sku", "companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "material_categories_companyId_idx" ON "material_categories"("companyId");

-- CreateIndex
CREATE INDEX "material_categories_parentId_idx" ON "material_categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_name_companyId_key" ON "material_categories"("name", "companyId");

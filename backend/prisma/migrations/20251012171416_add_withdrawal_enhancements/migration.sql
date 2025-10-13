/*
  Warnings:

  - You are about to drop the column `quantity` on the `withdrawals` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `withdrawals` table. All the data in the column will be lost.
  - Added the required column `remainingBoxCount` to the `withdrawals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `withdrawals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `withdrawnBoxCount` to the `withdrawals` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_withdrawals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "withdrawnBoxCount" INTEGER NOT NULL,
    "remainingBoxCount" INTEGER NOT NULL,
    "withdrawalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "reason" TEXT,
    "notes" TEXT,
    "photos" TEXT,
    "receiptNumber" TEXT,
    "withdrawnBy" TEXT NOT NULL,
    "authorizedBy" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "withdrawals_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_withdrawals" ("companyId", "id", "photos", "reason", "shipmentId", "withdrawnBy") SELECT "companyId", "id", "photos", "reason", "shipmentId", "withdrawnBy" FROM "withdrawals";
DROP TABLE "withdrawals";
ALTER TABLE "new_withdrawals" RENAME TO "withdrawals";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

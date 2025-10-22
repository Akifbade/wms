/*
  Warnings:

  - You are about to drop the `card_limits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drivers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fuel_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `geofences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trip_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trip_points` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trips` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vehicles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "card_limits_companyId_driverId_yyyymm_key";

-- DropIndex
DROP INDEX "card_limits_yyyymm_idx";

-- DropIndex
DROP INDEX "drivers_cardNo_idx";

-- DropIndex
DROP INDEX "drivers_phone_idx";

-- DropIndex
DROP INDEX "drivers_status_idx";

-- DropIndex
DROP INDEX "drivers_companyId_idx";

-- DropIndex
DROP INDEX "drivers_userId_key";

-- DropIndex
DROP INDEX "fuel_logs_ts_idx";

-- DropIndex
DROP INDEX "fuel_logs_tripId_idx";

-- DropIndex
DROP INDEX "fuel_logs_vehicleId_idx";

-- DropIndex
DROP INDEX "fuel_logs_driverId_idx";

-- DropIndex
DROP INDEX "fuel_logs_companyId_idx";

-- DropIndex
DROP INDEX "geofences_isActive_idx";

-- DropIndex
DROP INDEX "geofences_companyId_idx";

-- DropIndex
DROP INDEX "trip_events_acknowledged_idx";

-- DropIndex
DROP INDEX "trip_events_severity_idx";

-- DropIndex
DROP INDEX "trip_events_type_idx";

-- DropIndex
DROP INDEX "trip_events_ts_idx";

-- DropIndex
DROP INDEX "trip_events_driverId_idx";

-- DropIndex
DROP INDEX "trip_events_tripId_idx";

-- DropIndex
DROP INDEX "trip_events_companyId_idx";

-- DropIndex
DROP INDEX "trip_points_ts_idx";

-- DropIndex
DROP INDEX "trip_points_tripId_idx";

-- DropIndex
DROP INDEX "trips_jobRef_idx";

-- DropIndex
DROP INDEX "trips_status_idx";

-- DropIndex
DROP INDEX "trips_startTs_idx";

-- DropIndex
DROP INDEX "trips_shipmentId_idx";

-- DropIndex
DROP INDEX "trips_vehicleId_idx";

-- DropIndex
DROP INDEX "trips_driverId_idx";

-- DropIndex
DROP INDEX "trips_companyId_idx";

-- DropIndex
DROP INDEX "vehicles_companyId_plateNo_key";

-- DropIndex
DROP INDEX "vehicles_status_idx";

-- DropIndex
DROP INDEX "vehicles_companyId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "card_limits";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "drivers";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "fuel_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "geofences";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "trip_events";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "trip_points";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "trips";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "vehicles";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "ratePerDay" REAL NOT NULL DEFAULT 2.0,
    "currency" TEXT NOT NULL DEFAULT 'KWD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "primaryColor" TEXT DEFAULT '#4F46E5',
    "secondaryColor" TEXT DEFAULT '#7C3AED',
    "accentColor" TEXT DEFAULT '#10B981',
    "showCompanyName" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_companies" ("address", "createdAt", "currency", "email", "id", "isActive", "logo", "name", "phone", "plan", "ratePerDay", "updatedAt", "website") SELECT "address", "createdAt", "currency", "email", "id", "isActive", "logo", "name", "phone", "plan", "ratePerDay", "updatedAt", "website" FROM "companies";
DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

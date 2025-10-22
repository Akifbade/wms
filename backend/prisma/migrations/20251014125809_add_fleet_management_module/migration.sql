-- CreateTable
CREATE TABLE "drivers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cardNo" TEXT,
    "licenseNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "drivers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "vin" TEXT,
    "imei" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trips" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "jobRef" TEXT,
    "shipmentId" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "startTs" DATETIME NOT NULL,
    "startLat" REAL NOT NULL,
    "startLon" REAL NOT NULL,
    "startAddress" TEXT,
    "odoStart" INTEGER,
    "endTs" DATETIME,
    "endLat" REAL,
    "endLon" REAL,
    "endAddress" TEXT,
    "odoEnd" INTEGER,
    "distanceKm" REAL NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "idleMin" INTEGER NOT NULL DEFAULT 0,
    "avgSpeed" REAL NOT NULL DEFAULT 0,
    "maxSpeed" REAL NOT NULL DEFAULT 0,
    "routePolyline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trips_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trips_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trip_points" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "tripId" BIGINT NOT NULL,
    "ts" DATETIME NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "speed" REAL,
    "heading" REAL,
    "accuracy" INTEGER,
    "altitude" REAL,
    "battery" INTEGER,
    CONSTRAINT "trip_points_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "tripId" BIGINT,
    "ts" DATETIME NOT NULL,
    "liters" REAL NOT NULL,
    "amountKwd" REAL NOT NULL,
    "pricePerLiter" REAL,
    "odometer" INTEGER,
    "station" TEXT,
    "location" TEXT,
    "receiptUrl" TEXT,
    "fuelType" TEXT NOT NULL DEFAULT 'PETROL',
    "paymentMode" TEXT NOT NULL DEFAULT 'COMPANY_CARD',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fuel_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fuel_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fuel_logs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "card_limits" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "driverId" INTEGER NOT NULL,
    "yyyymm" TEXT NOT NULL,
    "limitKwd" REAL NOT NULL DEFAULT 25.000,
    "usedKwd" REAL NOT NULL DEFAULT 0.000,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "card_limits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "card_limits_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "centerLat" REAL,
    "centerLon" REAL,
    "radiusKm" REAL,
    "polygonWkt" TEXT,
    "activeFrom" TEXT,
    "activeTo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "geofences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trip_events" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tripId" BIGINT,
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER,
    "ts" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "lat" REAL,
    "lon" REAL,
    "message" TEXT,
    "meta" TEXT,
    "geofenceId" INTEGER,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    CONSTRAINT "trip_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trip_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trip_events_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trip_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "trip_events_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "geofences" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_companyId_idx" ON "drivers"("companyId");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_phone_idx" ON "drivers"("phone");

-- CreateIndex
CREATE INDEX "drivers_cardNo_idx" ON "drivers"("cardNo");

-- CreateIndex
CREATE INDEX "vehicles_companyId_idx" ON "vehicles"("companyId");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_companyId_plateNo_key" ON "vehicles"("companyId", "plateNo");

-- CreateIndex
CREATE INDEX "trips_companyId_idx" ON "trips"("companyId");

-- CreateIndex
CREATE INDEX "trips_driverId_idx" ON "trips"("driverId");

-- CreateIndex
CREATE INDEX "trips_vehicleId_idx" ON "trips"("vehicleId");

-- CreateIndex
CREATE INDEX "trips_shipmentId_idx" ON "trips"("shipmentId");

-- CreateIndex
CREATE INDEX "trips_startTs_idx" ON "trips"("startTs");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_jobRef_idx" ON "trips"("jobRef");

-- CreateIndex
CREATE INDEX "trip_points_tripId_idx" ON "trip_points"("tripId");

-- CreateIndex
CREATE INDEX "trip_points_ts_idx" ON "trip_points"("ts");

-- CreateIndex
CREATE INDEX "fuel_logs_companyId_idx" ON "fuel_logs"("companyId");

-- CreateIndex
CREATE INDEX "fuel_logs_driverId_idx" ON "fuel_logs"("driverId");

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_idx" ON "fuel_logs"("vehicleId");

-- CreateIndex
CREATE INDEX "fuel_logs_tripId_idx" ON "fuel_logs"("tripId");

-- CreateIndex
CREATE INDEX "fuel_logs_ts_idx" ON "fuel_logs"("ts");

-- CreateIndex
CREATE INDEX "card_limits_yyyymm_idx" ON "card_limits"("yyyymm");

-- CreateIndex
CREATE UNIQUE INDEX "card_limits_companyId_driverId_yyyymm_key" ON "card_limits"("companyId", "driverId", "yyyymm");

-- CreateIndex
CREATE INDEX "geofences_companyId_idx" ON "geofences"("companyId");

-- CreateIndex
CREATE INDEX "geofences_isActive_idx" ON "geofences"("isActive");

-- CreateIndex
CREATE INDEX "trip_events_companyId_idx" ON "trip_events"("companyId");

-- CreateIndex
CREATE INDEX "trip_events_tripId_idx" ON "trip_events"("tripId");

-- CreateIndex
CREATE INDEX "trip_events_driverId_idx" ON "trip_events"("driverId");

-- CreateIndex
CREATE INDEX "trip_events_ts_idx" ON "trip_events"("ts");

-- CreateIndex
CREATE INDEX "trip_events_type_idx" ON "trip_events"("type");

-- CreateIndex
CREATE INDEX "trip_events_severity_idx" ON "trip_events"("severity");

-- CreateIndex
CREATE INDEX "trip_events_acknowledged_idx" ON "trip_events"("acknowledged");

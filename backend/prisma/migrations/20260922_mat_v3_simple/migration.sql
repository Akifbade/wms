-- Material System V3 — simple purchase + ledger + multi-day job lines + packing list
CREATE TABLE IF NOT EXISTS `mat_v3_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `purchaseNumber` VARCHAR(191) NOT NULL,
    `vendorName` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `voidReason` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mat_v3_purchase_items` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `totalCost` DOUBLE NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mat_v3_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `entryType` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCost` DOUBLE NOT NULL DEFAULT 0,
    `jobId` VARCHAR(191) NULL,
    `dayNumber` INTEGER NULL,
    `packingListId` VARCHAR(191) NULL,
    `purchaseId` VARCHAR(191) NULL,
    `jobLineId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `reason` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mat_v3_packing_lists` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `listNumber` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `notes` TEXT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `attachmentName` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NULL,
    `closedById` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mat_v3_job_lines` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `packingListId` VARCHAR(191) NOT NULL,
    `dayNumber` INTEGER NOT NULL DEFAULT 1,
    `workDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `materialId` VARCHAR(191) NOT NULL,
    `qtyIssued` INTEGER NOT NULL DEFAULT 0,
    `qtyReturned` INTEGER NOT NULL DEFAULT 0,
    `qtyDamaged` INTEGER NOT NULL DEFAULT 0,
    `chargeUnitPrice` DOUBLE NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mat_v3_job_finance` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `materialsChargeMode` VARCHAR(191) NOT NULL DEFAULT 'AUTO',
    `manualMaterialsTotal` DOUBLE NULL,
    `laborCost` DOUBLE NOT NULL DEFAULT 0,
    `transportCost` DOUBLE NOT NULL DEFAULT 0,
    `otherCost` DOUBLE NOT NULL DEFAULT 0,
    `discount` DOUBLE NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `materialsLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `lockedById` VARCHAR(191) NULL,
    `lastEmailAt` DATETIME(3) NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mat_v3_audit` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `beforeJson` LONGTEXT NULL,
    `afterJson` LONGTEXT NULL,
    `reason` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `mat_v3_purchases_companyId_purchaseNumber_key` ON `mat_v3_purchases`(`companyId`, `purchaseNumber`);
CREATE INDEX `mat_v3_purchases_companyId_purchaseDate_idx` ON `mat_v3_purchases`(`companyId`, `purchaseDate`);
CREATE INDEX `mat_v3_purchase_items_materialId_idx` ON `mat_v3_purchase_items`(`materialId`);
CREATE INDEX `mat_v3_purchase_items_purchaseId_idx` ON `mat_v3_purchase_items`(`purchaseId`);
CREATE INDEX `mat_v3_ledger_companyId_materialId_createdAt_idx` ON `mat_v3_ledger`(`companyId`, `materialId`, `createdAt`);
CREATE INDEX `mat_v3_ledger_jobId_idx` ON `mat_v3_ledger`(`jobId`);
CREATE INDEX `mat_v3_ledger_packingListId_idx` ON `mat_v3_ledger`(`packingListId`);
CREATE UNIQUE INDEX `mat_v3_packing_lists_companyId_listNumber_key` ON `mat_v3_packing_lists`(`companyId`, `listNumber`);
CREATE UNIQUE INDEX `mat_v3_packing_lists_jobId_key` ON `mat_v3_packing_lists`(`jobId`);
CREATE INDEX `mat_v3_packing_lists_companyId_idx` ON `mat_v3_packing_lists`(`companyId`);
CREATE INDEX `mat_v3_job_lines_jobId_dayNumber_idx` ON `mat_v3_job_lines`(`jobId`, `dayNumber`);
CREATE INDEX `mat_v3_job_lines_materialId_idx` ON `mat_v3_job_lines`(`materialId`);
CREATE INDEX `mat_v3_job_lines_packingListId_idx` ON `mat_v3_job_lines`(`packingListId`);
CREATE UNIQUE INDEX `mat_v3_job_finance_jobId_key` ON `mat_v3_job_finance`(`jobId`);
CREATE INDEX `mat_v3_job_finance_companyId_idx` ON `mat_v3_job_finance`(`companyId`);
CREATE INDEX `mat_v3_audit_companyId_createdAt_idx` ON `mat_v3_audit`(`companyId`, `createdAt`);
CREATE INDEX `mat_v3_audit_entityType_entityId_idx` ON `mat_v3_audit`(`entityType`, `entityId`);

ALTER TABLE `mat_v3_purchase_items` ADD CONSTRAINT `mat_v3_purchase_items_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `mat_v3_purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `mat_v3_job_lines` ADD CONSTRAINT `mat_v3_job_lines_packingListId_fkey` FOREIGN KEY (`packingListId`) REFERENCES `mat_v3_packing_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

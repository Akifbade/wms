-- Material V3: tamper-evident packing list sheet
-- printCount / lockedAt on the list + a full print log

ALTER TABLE `mat_v3_packing_lists`
  ADD COLUMN `printCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `firstPrintedAt` DATETIME(3) NULL,
  ADD COLUMN `firstPrintedById` VARCHAR(191) NULL,
  ADD COLUMN `lockedAt` DATETIME(3) NULL;

CREATE TABLE `mat_v3_list_prints` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `packingListId` VARCHAR(191) NOT NULL,
  `jobId` VARCHAR(191) NOT NULL,
  `listNumber` VARCHAR(191) NOT NULL,
  `printNumber` INTEGER NOT NULL,
  `isDuplicate` BOOLEAN NOT NULL DEFAULT false,
  `printedById` VARCHAR(191) NULL,
  `printedByName` VARCHAR(191) NULL,
  `reason` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `mat_v3_list_prints_companyId_packingListId_idx`(`companyId`, `packingListId`),
  INDEX `mat_v3_list_prints_companyId_jobId_idx`(`companyId`, `jobId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

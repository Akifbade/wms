-- CreateTable rack_audit_logs
CREATE TABLE `rack_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NULL,
    `details` LONGTEXT NULL,
    `performedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,

    INDEX `rack_audit_logs_rackId_idx`(`rackId`),
    INDEX `rack_audit_logs_createdAt_idx`(`createdAt`),
    INDEX `rack_audit_logs_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rack_audit_logs` ADD CONSTRAINT `rack_audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

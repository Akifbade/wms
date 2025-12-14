-- Create missing tables on VPS for Prisma schema sync
-- Run on VPS: docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < create_missing_tables_vps.sql

-- 1. customer_prepaid_balances table
CREATE TABLE IF NOT EXISTS `customer_prepaid_balances` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `companyProfileId` VARCHAR(191) NOT NULL,
    `monthlyRate` DOUBLE NOT NULL DEFAULT 0,
    `paymentDueDay` INT NOT NULL DEFAULT 30,
    `maxCBM` DOUBLE NULL,
    `maxStorageDays` INT NULL,
    `contractStartDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contractEndDate` DATETIME(3) NULL,
    `lastBilledDate` DATETIME(3) NULL,
    `nextBillingDate` DATETIME(3) NULL,
    `totalBilled` DOUBLE NOT NULL DEFAULT 0,
    `totalPaid` DOUBLE NOT NULL DEFAULT 0,
    `balanceRemaining` DOUBLE NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validUntil` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    
    UNIQUE INDEX `customer_prepaid_balances_companyProfileId_key`(`companyProfileId`),
    UNIQUE INDEX `customer_prepaid_balances_companyId_companyProfileId_key`(`companyId`, `companyProfileId`),
    INDEX `customer_prepaid_balances_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. prepaid_transactions table
CREATE TABLE IF NOT EXISTS `prepaid_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `prepaidBalanceId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `balanceBefore` DOUBLE NOT NULL,
    `balanceAfter` DOUBLE NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX `prepaid_transactions_prepaidBalanceId_idx`(`prepaidBalanceId`),
    INDEX `prepaid_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. ContractHistory table
CREATE TABLE IF NOT EXISTS `ContractHistory` (
    `id` VARCHAR(191) NOT NULL,
    `customerPrepaidBalanceId` VARCHAR(191) NOT NULL,
    `monthlyRate` DOUBLE NOT NULL,
    `contractStartDate` DATETIME(3) NOT NULL,
    `contractEndDate` DATETIME(3) NULL,
    `changeDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changedByUserId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    
    INDEX `ContractHistory_customerPrepaidBalanceId_idx`(`customerPrepaidBalanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys
ALTER TABLE `customer_prepaid_balances` 
    ADD CONSTRAINT `customer_prepaid_balances_companyId_fkey` 
    FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `customer_prepaid_balances` 
    ADD CONSTRAINT `customer_prepaid_balances_companyProfileId_fkey` 
    FOREIGN KEY (`companyProfileId`) REFERENCES `company_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `prepaid_transactions` 
    ADD CONSTRAINT `prepaid_transactions_prepaidBalanceId_fkey` 
    FOREIGN KEY (`prepaidBalanceId`) REFERENCES `customer_prepaid_balances`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ContractHistory` 
    ADD CONSTRAINT `ContractHistory_customerPrepaidBalanceId_fkey` 
    FOREIGN KEY (`customerPrepaidBalanceId`) REFERENCES `customer_prepaid_balances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SELECT 'Missing tables created successfully!' AS Status;

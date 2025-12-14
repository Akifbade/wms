-- Email & Notification System Tables
-- Run on VPS: cat create_email_tables.sql | docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms

-- 1. Email Settings Table
CREATE TABLE IF NOT EXISTS `email_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'gmail',
    `isEnabled` TINYINT(1) NOT NULL DEFAULT 0,
    `smtpHost` VARCHAR(191) NOT NULL DEFAULT 'smtp.gmail.com',
    `smtpPort` INT NOT NULL DEFAULT 587,
    `smtpSecure` TINYINT(1) NOT NULL DEFAULT 0,
    `smtpUser` VARCHAR(191) NOT NULL DEFAULT '',
    `smtpPassword` VARCHAR(191) NOT NULL DEFAULT '',
    `senderName` VARCHAR(191) NOT NULL DEFAULT '',
    `senderEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `dailyLimit` INT NOT NULL DEFAULT 500,
    `sentToday` INT NOT NULL DEFAULT 0,
    `lastResetDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    
    UNIQUE INDEX `email_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Notification Settings Table
CREATE TABLE IF NOT EXISTS `notification_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `notificationType` VARCHAR(191) NOT NULL,
    `isEnabled` TINYINT(1) NOT NULL DEFAULT 1,
    `notifyAdmins` TINYINT(1) NOT NULL DEFAULT 1,
    `notifyManagers` TINYINT(1) NOT NULL DEFAULT 0,
    `customEmails` TEXT NULL,
    `alertDaysBefore` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    
    UNIQUE INDEX `notification_settings_companyId_notificationType_key`(`companyId`, `notificationType`),
    INDEX `notification_settings_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Notification Recipients Table
CREATE TABLE IF NOT EXISTS `notification_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `notificationSettingsId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX `notification_recipients_notificationSettingsId_idx`(`notificationSettingsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Email Logs Table
CREATE TABLE IF NOT EXISTS `email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `recipients` TEXT NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    INDEX `email_logs_companyId_idx`(`companyId`),
    INDEX `email_logs_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Foreign Keys
ALTER TABLE `email_settings` 
    ADD CONSTRAINT `email_settings_companyId_fkey` 
    FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `notification_settings` 
    ADD CONSTRAINT `notification_settings_companyId_fkey` 
    FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `notification_recipients` 
    ADD CONSTRAINT `notification_recipients_notificationSettingsId_fkey` 
    FOREIGN KEY (`notificationSettingsId`) REFERENCES `notification_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `email_logs` 
    ADD CONSTRAINT `email_logs_companyId_fkey` 
    FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

SELECT 'Email & Notification tables created successfully!' AS Status;

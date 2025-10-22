-- CreateTable User
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `uid` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_uid_key`(`uid`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable JobFile
CREATE TABLE `JobFile` (
    `id` VARCHAR(191) NOT NULL,
    `jfn` VARCHAR(191) NOT NULL,
    `d` VARCHAR(191) NOT NULL,
    `billingDate` VARCHAR(191),
    `po` VARCHAR(191),
    `cl` LONGTEXT,
    `pt` LONGTEXT,
    `in` VARCHAR(191),
    `bd` VARCHAR(191),
    `sm` VARCHAR(191),
    `sh` VARCHAR(191),
    `co` VARCHAR(191),
    `mawb` VARCHAR(191),
    `hawb` VARCHAR(191),
    `ts` VARCHAR(191),
    `or` VARCHAR(191),
    `pc` VARCHAR(191) NOT NULL DEFAULT '',
    `gw` VARCHAR(191) NOT NULL DEFAULT '',
    `de` LONGTEXT,
    `vw` VARCHAR(191) NOT NULL DEFAULT '',
    `dsc` LONGTEXT,
    `ca` VARCHAR(191),
    `tn` LONGTEXT,
    `vn` VARCHAR(191),
    `fv` VARCHAR(191),
    `cn` LONGTEXT,
    `re` LONGTEXT,
    `pb` LONGTEXT,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `totalCost` DOUBLE NOT NULL DEFAULT 0,
    `totalSelling` DOUBLE NOT NULL DEFAULT 0,
    `totalProfit` DOUBLE NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkedById` VARCHAR(191),
    `checkedAt` DATETIME(3),
    `approvedById` VARCHAR(191),
    `approvedAt` DATETIME(3),
    `rejectedById` VARCHAR(191),
    `rejectedAt` DATETIME(3),
    `rejectionReason` VARCHAR(191),
    `lastUpdatedBy` VARCHAR(191),
    `updatedAt` DATETIME(3) NOT NULL,
    `deliveryAssigned` BOOLEAN NOT NULL DEFAULT false,
    `deliveryStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `deliveryAssignedAt` DATETIME(3),
    `deliveryAssignedById` VARCHAR(191),
    `driverUid` VARCHAR(191),
    `driverName` VARCHAR(191),
    `driverMobile` VARCHAR(191),
    `isExternal` BOOLEAN NOT NULL DEFAULT false,
    `deliveryLocation` VARCHAR(191),
    `deliveryNotes` VARCHAR(191),
    `completedAt` DATETIME(3),
    `receiverName` VARCHAR(191),
    `receiverMobile` VARCHAR(191),
    `signatureDataUrl` LONGTEXT,
    `photoDataUrl` LONGTEXT,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `geolocationName` VARCHAR(191),
    `feedbackStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `isManual` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `JobFile_jfn_key`(`jfn`),
    INDEX `JobFile_status_idx`(`status`),
    INDEX `JobFile_createdById_idx`(`createdById`),
    INDEX `JobFile_jfn_idx`(`jfn`),
    INDEX `JobFile_deliveryStatus_idx`(`deliveryStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Charge
CREATE TABLE `Charge` (
    `id` VARCHAR(191) NOT NULL,
    `jobFileId` VARCHAR(191) NOT NULL,
    `l` VARCHAR(191) NOT NULL,
    `c` VARCHAR(191) NOT NULL,
    `s` VARCHAR(191) NOT NULL,
    `n` VARCHAR(191),

    INDEX `Charge_jobFileId_idx`(`jobFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Client
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191),
    `contactPerson` VARCHAR(191),
    `phone` VARCHAR(191),
    `email` VARCHAR(191),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_name_key`(`name`),
    INDEX `Client_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable ChargeDescription
CREATE TABLE `ChargeDescription` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChargeDescription_description_key`(`description`),
    INDEX `ChargeDescription_description_idx`(`description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CustomLink
CREATE TABLE `CustomLink` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomLink_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable AppSetting
CREATE TABLE `AppSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppSetting_key_key`(`key`),
    INDEX `AppSetting_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Feedback
CREATE TABLE `Feedback` (
    `id` VARCHAR(191) NOT NULL,
    `jobFileId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rating` INTEGER,
    `comments` VARCHAR(191),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Feedback_jobFileId_idx`(`jobFileId`),
    INDEX `Feedback_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JobFile` ADD CONSTRAINT `JobFile_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobFile` ADD CONSTRAINT `JobFile_checkedById_fkey` FOREIGN KEY (`checkedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobFile` ADD CONSTRAINT `JobFile_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobFile` ADD CONSTRAINT `JobFile_rejectedById_fkey` FOREIGN KEY (`rejectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobFile` ADD CONSTRAINT `JobFile_deliveryAssignedById_fkey` FOREIGN KEY (`deliveryAssignedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Charge` ADD CONSTRAINT `Charge_jobFileId_fkey` FOREIGN KEY (`jobFileId`) REFERENCES `JobFile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_jobFileId_fkey` FOREIGN KEY (`jobFileId`) REFERENCES `JobFile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

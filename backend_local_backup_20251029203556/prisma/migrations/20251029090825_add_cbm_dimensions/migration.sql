-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `plan` VARCHAR(191) NOT NULL DEFAULT 'BASIC',
    `ratePerDay` DOUBLE NOT NULL DEFAULT 2.0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KWD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `primaryColor` VARCHAR(191) NULL DEFAULT '#4F46E5',
    `secondaryColor` VARCHAR(191) NULL DEFAULT '#7C3AED',
    `accentColor` VARCHAR(191) NULL DEFAULT '#10B981',
    `showCompanyName` BOOLEAN NOT NULL DEFAULT true,
    `logoSize` VARCHAR(191) NULL DEFAULT 'medium',
    `contactPerson` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `contractStatus` VARCHAR(191) NULL DEFAULT 'ACTIVE',
    `contractDocument` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'DRIVER', 'WORKER', 'SCANNER', 'PACKER', 'LABOR') NOT NULL DEFAULT 'WORKER',
    `skills` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDummy` BOOLEAN NOT NULL DEFAULT false,
    `permissions` TEXT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_activities_userId_idx`(`userId`),
    INDEX `user_activities_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `user_activities_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `logo` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_companyId_key`(`name`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `contactPerson` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `contractStatus` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_profiles_name_companyId_key`(`name`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racks` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `qrCode` VARCHAR(191) NOT NULL,
    `rackType` VARCHAR(191) NOT NULL DEFAULT 'STORAGE',
    `categoryId` VARCHAR(191) NULL,
    `companyProfileId` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `length` DOUBLE NULL,
    `width` DOUBLE NULL,
    `height` DOUBLE NULL,
    `dimensionUnit` VARCHAR(191) NOT NULL DEFAULT 'METERS',
    `capacityTotal` DOUBLE NOT NULL DEFAULT 100,
    `capacityUsed` DOUBLE NOT NULL DEFAULT 0,
    `minCapacity` INTEGER NOT NULL DEFAULT 2,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `lastActivity` DATETIME(3) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racks_qrCode_key`(`qrCode`),
    UNIQUE INDEX `racks_code_companyId_key`(`code`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rack_inventory` (
    `id` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NOT NULL,
    `itemType` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `quantityCurrent` INTEGER NOT NULL DEFAULT 0,
    `quantityReserved` INTEGER NOT NULL DEFAULT 0,
    `lastMovement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedBy` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rack_activities` (
    `id` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `activityType` VARCHAR(191) NOT NULL,
    `itemDetails` VARCHAR(191) NOT NULL,
    `quantityBefore` INTEGER NULL,
    `quantityAfter` INTEGER NULL,
    `photos` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `gpsLocation` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `originalBoxCount` INTEGER NOT NULL,
    `currentBoxCount` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `arrivalDate` DATETIME(3) NOT NULL,
    `clientName` VARCHAR(191) NULL,
    `clientPhone` VARCHAR(191) NULL,
    `clientEmail` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `estimatedValue` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `qrCode` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `assignedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,
    `storageCharge` DOUBLE NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `assignedById` VARCHAR(191) NULL,
    `releasedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isWarehouseShipment` BOOLEAN NOT NULL DEFAULT false,
    `warehouseData` VARCHAR(191) NULL,
    `shipper` VARCHAR(191) NULL,
    `consignee` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'CUSTOMER_STORAGE',
    `companyProfileId` VARCHAR(191) NULL,
    `awbNumber` VARCHAR(191) NULL,
    `flightNumber` VARCHAR(191) NULL,
    `origin` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `palletCount` INTEGER NULL,
    `boxesPerPallet` INTEGER NULL,
    `length` DOUBLE NULL,
    `width` DOUBLE NULL,
    `height` DOUBLE NULL,
    `cbm` DOUBLE NULL,
    `weight` DOUBLE NULL,

    UNIQUE INDEX `shipments_qrCode_key`(`qrCode`),
    INDEX `shipments_category_idx`(`category`),
    INDEX `shipments_customerName_idx`(`customerName`),
    INDEX `shipments_awbNumber_idx`(`awbNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipment_boxes` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `boxNumber` INTEGER NOT NULL,
    `qrCode` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `assignedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pieceWeight` DOUBLE NULL,
    `pieceQR` VARCHAR(191) NULL,
    `photos` VARCHAR(191) NULL,

    UNIQUE INDEX `shipment_boxes_qrCode_key`(`qrCode`),
    INDEX `shipment_boxes_rackId_idx`(`rackId`),
    INDEX `shipment_boxes_status_idx`(`status`),
    UNIQUE INDEX `shipment_boxes_shipmentId_boxNumber_key`(`shipmentId`, `boxNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipment_items` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `itemDescription` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `weight` DOUBLE NULL,
    `value` DOUBLE NULL,
    `barcode` VARCHAR(191) NULL,
    `photos` VARCHAR(191) NULL,
    `boxNumbers` VARCHAR(191) NULL,
    `customAttributes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `shipment_items_shipmentId_idx`(`shipmentId`),
    INDEX `shipment_items_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawals` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `withdrawnBoxCount` INTEGER NOT NULL,
    `remainingBoxCount` INTEGER NOT NULL,
    `withdrawalDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `reason` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `photos` VARCHAR(191) NULL,
    `receiptNumber` VARCHAR(191) NULL,
    `withdrawnBy` VARCHAR(191) NOT NULL,
    `authorizedBy` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KWD',
    `description` VARCHAR(191) NULL,
    `receipts` VARCHAR(191) NULL,
    `expenseDate` DATETIME(3) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `templateType` VARCHAR(191) NOT NULL DEFAULT 'MODERN',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#2563eb',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#64748b',
    `showLogo` BOOLEAN NOT NULL DEFAULT true,
    `footerText` VARCHAR(191) NULL,
    `termsConditions` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoice_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `storageRateType` VARCHAR(191) NOT NULL DEFAULT 'PER_DAY',
    `storageRatePerBox` DOUBLE NOT NULL DEFAULT 0.500,
    `storageRatePerWeek` DOUBLE NULL,
    `storageRatePerMonth` DOUBLE NULL,
    `taxEnabled` BOOLEAN NOT NULL DEFAULT true,
    `taxRate` DOUBLE NOT NULL DEFAULT 5.0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KWD',
    `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'INV',
    `invoiceDueDays` INTEGER NOT NULL DEFAULT 10,
    `gracePeriodDays` INTEGER NOT NULL DEFAULT 3,
    `minimumCharge` DOUBLE NOT NULL DEFAULT 10.0,
    `logoUrl` VARCHAR(191) NULL,
    `logoPosition` VARCHAR(191) NOT NULL DEFAULT 'LEFT',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#2563eb',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#64748b',
    `showCompanyDetails` BOOLEAN NOT NULL DEFAULT true,
    `showBankDetails` BOOLEAN NOT NULL DEFAULT true,
    `showTermsConditions` BOOLEAN NOT NULL DEFAULT true,
    `bankName` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `accountName` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `swiftCode` VARCHAR(191) NULL,
    `invoiceFooterText` VARCHAR(191) NULL,
    `termsAndConditions` VARCHAR(191) NULL,
    `paymentInstructions` VARCHAR(191) NULL,
    `taxRegistrationNo` VARCHAR(191) NULL,
    `companyRegistrationNo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `billing_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `charge_types` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `billingSettingsId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `calculationType` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `minCharge` DOUBLE NULL,
    `maxCharge` DOUBLE NULL,
    `applyOnRelease` BOOLEAN NOT NULL DEFAULT true,
    `applyOnStorage` BOOLEAN NOT NULL DEFAULT false,
    `isTaxable` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `charge_types_companyId_code_key`(`companyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NULL,
    `clientAddress` VARCHAR(191) NULL,
    `invoiceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `invoiceType` VARCHAR(191) NOT NULL DEFAULT 'STORAGE',
    `isWarehouseInvoice` BOOLEAN NOT NULL DEFAULT false,
    `warehouseData` VARCHAR(191) NULL,
    `subtotal` DOUBLE NOT NULL,
    `taxAmount` DOUBLE NOT NULL,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `balanceDue` DOUBLE NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `transactionRef` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `termsAndConditions` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_line_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `chargeTypeId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL DEFAULT 1,
    `unitPrice` DOUBLE NOT NULL,
    `amount` DOUBLE NOT NULL,
    `isTaxable` BOOLEAN NOT NULL DEFAULT true,
    `taxRate` DOUBLE NULL,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMethod` VARCHAR(191) NOT NULL,
    `transactionRef` VARCHAR(191) NULL,
    `receiptNumber` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipment_charges` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `currentStorageCharge` DOUBLE NOT NULL DEFAULT 0,
    `daysStored` INTEGER NOT NULL DEFAULT 0,
    `lastCalculatedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalBoxesReleased` INTEGER NOT NULL DEFAULT 0,
    `totalInvoiced` DOUBLE NOT NULL DEFAULT 0,
    `totalPaid` DOUBLE NOT NULL DEFAULT 0,
    `outstandingBalance` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipment_charges_shipmentId_key`(`shipmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_fields` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `fieldType` VARCHAR(191) NOT NULL,
    `fieldOptions` VARCHAR(191) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `section` VARCHAR(191) NOT NULL DEFAULT 'SHIPMENT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_field_values` (
    `id` VARCHAR(191) NOT NULL,
    `customFieldId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `fieldValue` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `custom_field_values_entityType_entityId_idx`(`entityType`, `entityId`),
    UNIQUE INDEX `custom_field_values_customFieldId_entityId_key`(`customFieldId`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipment_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `requireClientEmail` BOOLEAN NOT NULL DEFAULT false,
    `requireClientPhone` BOOLEAN NOT NULL DEFAULT true,
    `requireEstimatedValue` BOOLEAN NOT NULL DEFAULT false,
    `requirePhotos` BOOLEAN NOT NULL DEFAULT false,
    `autoGenerateQR` BOOLEAN NOT NULL DEFAULT true,
    `qrCodePrefix` VARCHAR(191) NOT NULL DEFAULT 'SHP',
    `showClientAddress` BOOLEAN NOT NULL DEFAULT true,
    `requireClientAddress` BOOLEAN NOT NULL DEFAULT false,
    `showDescription` BOOLEAN NOT NULL DEFAULT true,
    `requireDescription` BOOLEAN NOT NULL DEFAULT false,
    `showReferenceId` BOOLEAN NOT NULL DEFAULT true,
    `requireReferenceId` BOOLEAN NOT NULL DEFAULT false,
    `showNotes` BOOLEAN NOT NULL DEFAULT true,
    `requireNotes` BOOLEAN NOT NULL DEFAULT false,
    `showWarehouseMode` BOOLEAN NOT NULL DEFAULT true,
    `showShipperDetails` BOOLEAN NOT NULL DEFAULT true,
    `requireShipperDetails` BOOLEAN NOT NULL DEFAULT true,
    `showConsigneeDetails` BOOLEAN NOT NULL DEFAULT true,
    `requireConsigneeDetails` BOOLEAN NOT NULL DEFAULT true,
    `showWeight` BOOLEAN NOT NULL DEFAULT true,
    `requireWeight` BOOLEAN NOT NULL DEFAULT false,
    `showDimensions` BOOLEAN NOT NULL DEFAULT true,
    `requireDimensions` BOOLEAN NOT NULL DEFAULT false,
    `showStorageType` BOOLEAN NOT NULL DEFAULT true,
    `showSpecialInstructions` BOOLEAN NOT NULL DEFAULT true,
    `showEstimatedDays` BOOLEAN NOT NULL DEFAULT true,
    `requireEstimatedDays` BOOLEAN NOT NULL DEFAULT false,
    `defaultEstimatedDays` INTEGER NOT NULL DEFAULT 30,
    `formSectionOrder` VARCHAR(191) NULL,
    `defaultStorageType` VARCHAR(191) NOT NULL DEFAULT 'PERSONAL',
    `allowMultipleRacks` BOOLEAN NOT NULL DEFAULT false,
    `requireRackAssignment` BOOLEAN NOT NULL DEFAULT false,
    `autoAssignRack` BOOLEAN NOT NULL DEFAULT false,
    `notifyOnLowCapacity` BOOLEAN NOT NULL DEFAULT true,
    `lowCapacityThreshold` INTEGER NOT NULL DEFAULT 80,
    `requireReleaseApproval` BOOLEAN NOT NULL DEFAULT false,
    `releaseApproverRole` VARCHAR(191) NOT NULL DEFAULT 'MANAGER',
    `requireReleasePhotos` BOOLEAN NOT NULL DEFAULT false,
    `requireIDVerification` BOOLEAN NOT NULL DEFAULT true,
    `generateReleaseInvoice` BOOLEAN NOT NULL DEFAULT true,
    `autoSendInvoiceEmail` BOOLEAN NOT NULL DEFAULT false,
    `storageRatePerDay` DOUBLE NOT NULL DEFAULT 2.0,
    `storageRatePerBox` DOUBLE NOT NULL DEFAULT 0.0,
    `chargePartialDay` BOOLEAN NOT NULL DEFAULT true,
    `minimumChargeDays` INTEGER NOT NULL DEFAULT 1,
    `releaseHandlingFee` DOUBLE NOT NULL DEFAULT 0.0,
    `releasePerBoxFee` DOUBLE NOT NULL DEFAULT 0.0,
    `releaseTransportFee` DOUBLE NOT NULL DEFAULT 0.0,
    `notifyClientOnIntake` BOOLEAN NOT NULL DEFAULT true,
    `notifyClientOnRelease` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnStorageAlert` BOOLEAN NOT NULL DEFAULT true,
    `storageAlertDays` INTEGER NOT NULL DEFAULT 30,
    `enableCustomFields` BOOLEAN NOT NULL DEFAULT true,
    `requiredCustomFields` VARCHAR(191) NULL,
    `allowPartialRelease` BOOLEAN NOT NULL DEFAULT true,
    `partialReleaseMinBoxes` INTEGER NOT NULL DEFAULT 1,
    `requirePartialApproval` BOOLEAN NOT NULL DEFAULT false,
    `requireReleaseSignature` BOOLEAN NOT NULL DEFAULT true,
    `requireCollectorID` BOOLEAN NOT NULL DEFAULT true,
    `allowProxyCollection` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipment_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `companyLogo` VARCHAR(191) NULL,
    `companyAddress` VARCHAR(191) NULL,
    `companyPhone` VARCHAR(191) NULL,
    `companyEmail` VARCHAR(191) NULL,
    `companyWebsite` VARCHAR(191) NULL,
    `companyLicense` VARCHAR(191) NULL,
    `invoiceTemplateType` VARCHAR(191) NULL,
    `invoiceTitle` VARCHAR(191) NULL,
    `invoiceShowLogo` BOOLEAN NULL,
    `invoiceShowAddress` BOOLEAN NULL,
    `invoiceShowPhone` BOOLEAN NULL,
    `invoiceShowEmail` BOOLEAN NULL,
    `invoiceShowWebsite` BOOLEAN NULL,
    `invoiceShowLicense` BOOLEAN NULL,
    `invoiceShowFooter` BOOLEAN NULL,
    `invoiceHeaderBg` VARCHAR(191) NULL,
    `invoiceHeaderText` VARCHAR(191) NULL,
    `invoiceFooterText` VARCHAR(191) NULL,
    `invoiceTerms` VARCHAR(191) NULL,
    `invoiceShowBorders` BOOLEAN NULL,
    `invoiceShowGrid` BOOLEAN NULL,
    `invoiceTableStyle` VARCHAR(191) NULL,
    `invoiceFontSize` VARCHAR(191) NULL,
    `invoicePaperSize` VARCHAR(191) NULL,
    `invoicePrimaryColor` VARCHAR(191) NULL,
    `invoiceSecondaryColor` VARCHAR(191) NULL,
    `invoiceAccentColor` VARCHAR(191) NULL,
    `invoiceDangerColor` VARCHAR(191) NULL,
    `releaseNoteTemplate` VARCHAR(191) NULL,
    `releaseNoteTitle` VARCHAR(191) NULL,
    `releaseNoteHeaderBg` VARCHAR(191) NULL,
    `releaseNoteShowLogo` BOOLEAN NULL,
    `releaseShowShipment` BOOLEAN NULL,
    `releaseShowStorage` BOOLEAN NULL,
    `releaseShowItems` BOOLEAN NULL,
    `releaseShowCollector` BOOLEAN NULL,
    `releaseShowCharges` BOOLEAN NULL,
    `releaseShowPhotos` BOOLEAN NULL,
    `releaseShowTerms` BOOLEAN NULL,
    `releaseShowSignatures` BOOLEAN NULL,
    `releaseTerms` VARCHAR(191) NULL,
    `releaseFooterText` VARCHAR(191) NULL,
    `releasePrimaryColor` VARCHAR(191) NULL,
    `printMarginTop` INTEGER NULL,
    `printMarginBottom` INTEGER NULL,
    `printMarginLeft` INTEGER NULL,
    `printMarginRight` INTEGER NULL,
    `language` VARCHAR(191) NULL,
    `dateFormat` VARCHAR(191) NULL,
    `timeFormat` VARCHAR(191) NULL,
    `currencySymbol` VARCHAR(191) NULL,
    `currencyPosition` VARCHAR(191) NULL,
    `customField1Label` VARCHAR(191) NULL,
    `customField1Value` VARCHAR(191) NULL,
    `customField2Label` VARCHAR(191) NULL,
    `customField2Value` VARCHAR(191) NULL,
    `customField3Label` VARCHAR(191) NULL,
    `customField3Value` VARCHAR(191) NULL,
    `requireStaffSignature` BOOLEAN NULL,
    `requireClientSignature` BOOLEAN NULL,
    `signatureHeight` INTEGER NULL,
    `showQRCode` BOOLEAN NULL,
    `qrCodePosition` VARCHAR(191) NULL,
    `qrCodeSize` INTEGER NULL,
    `showWatermark` BOOLEAN NULL,
    `watermarkText` VARCHAR(191) NULL,
    `watermarkOpacity` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `template_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_permissions_role_permissionId_companyId_key`(`role`, `permissionId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `moving_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `jobCode` VARCHAR(191) NOT NULL,
    `jobTitle` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NULL,
    `jobDate` DATETIME(3) NOT NULL,
    `jobAddress` VARCHAR(191) NOT NULL,
    `dropoffAddress` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PLANNED',
    `teamLeaderId` VARCHAR(191) NULL,
    `driverName` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `moving_jobs_jobCode_key`(`jobCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `folderName` VARCHAR(100) NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,

    INDEX `job_files_jobId_idx`(`jobId`),
    INDEX `job_files_uploadedBy_idx`(`uploadedBy`),
    INDEX `job_files_folderName_idx`(`folderName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `checkInAt` DATETIME(3) NULL,
    `checkOutAt` DATETIME(3) NULL,
    `hourlyRate` DOUBLE NULL,
    `hoursWorked` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `job_assignments_jobId_userId_role_key`(`jobId`, `userId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `material_categories_companyId_idx`(`companyId`),
    INDEX `material_categories_parentId_idx`(`parentId`),
    UNIQUE INDEX `material_categories_name_companyId_key`(`name`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packing_materials` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'PCS',
    `category` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `minStockLevel` INTEGER NOT NULL DEFAULT 0,
    `totalQuantity` INTEGER NOT NULL DEFAULT 0,
    `unitCost` DOUBLE NULL,
    `sellingPrice` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `packing_materials_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `packing_materials_sku_companyId_key`(`sku`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `rating` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendors_name_companyId_key`(`name`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_batches` (
    `id` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `vendorName` VARCHAR(191) NULL,
    `purchaseOrder` VARCHAR(191) NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quantityPurchased` INTEGER NOT NULL,
    `quantityRemaining` INTEGER NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `sellingPrice` DOUBLE NULL,
    `receivedById` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rack_stock_levels` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NOT NULL,
    `stockBatchId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `rack_stock_levels_materialId_rackId_stockBatchId_key`(`materialId`, `rackId`, `stockBatchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_issues` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `stockBatchId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `totalCost` DOUBLE NOT NULL,
    `rackId` VARCHAR(191) NULL,
    `issuedById` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_returns` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NULL,
    `quantityIssued` INTEGER NULL,
    `quantityUsed` INTEGER NULL,
    `quantityGood` INTEGER NOT NULL DEFAULT 0,
    `quantityDamaged` INTEGER NOT NULL DEFAULT 0,
    `restocked` BOOLEAN NOT NULL DEFAULT false,
    `restockedAt` DATETIME(3) NULL,
    `rackId` VARCHAR(191) NULL,
    `recordedById` VARCHAR(191) NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_damages` (
    `id` VARCHAR(191) NOT NULL,
    `returnId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `photoUrls` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `recordedById` VARCHAR(191) NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvalNotes` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `approvalType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `requestedById` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decisionById` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `decisionNotes` VARCHAR(191) NULL,
    `subjectReturnId` VARCHAR(191) NULL,
    `subjectDamageId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `material_approvals_subjectReturnId_key`(`subjectReturnId`),
    UNIQUE INDEX `material_approvals_subjectDamageId_key`(`subjectDamageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_cost_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `materialsCost` DOUBLE NOT NULL DEFAULT 0,
    `laborCost` DOUBLE NOT NULL DEFAULT 0,
    `damageLoss` DOUBLE NOT NULL DEFAULT 0,
    `otherCost` DOUBLE NOT NULL DEFAULT 0,
    `revenue` DOUBLE NOT NULL DEFAULT 0,
    `profit` DOUBLE NOT NULL DEFAULT 0,
    `profitMargin` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KWD',
    `notes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_plugins` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0',
    `status` VARCHAR(191) NOT NULL DEFAULT 'INSTALLED',
    `entryPointUrl` VARCHAR(191) NULL,
    `checksum` VARCHAR(191) NULL,
    `installedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activatedAt` DATETIME(3) NULL,
    `deactivatedAt` DATETIME(3) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `system_plugins_name_companyId_key`(`name`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_plugin_logs` (
    `id` VARCHAR(191) NOT NULL,
    `pluginId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `performedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_usage` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NULL,
    `stockBatchId` VARCHAR(191) NULL,
    `quantityUsed` INTEGER NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `totalCost` DOUBLE NOT NULL,
    `usageType` VARCHAR(191) NOT NULL DEFAULT 'PACKING',
    `usedById` VARCHAR(191) NULL,
    `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `material_usage_materialId_idx`(`materialId`),
    INDEX `material_usage_shipmentId_idx`(`shipmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_transfers` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `fromRackId` VARCHAR(191) NULL,
    `toRackId` VARCHAR(191) NULL,
    `stockBatchId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `transferType` VARCHAR(191) NOT NULL DEFAULT 'RACK_TO_RACK',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `requestedById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `completedById` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    INDEX `material_transfers_materialId_idx`(`materialId`),
    INDEX `material_transfers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `alertType` VARCHAR(191) NOT NULL DEFAULT 'LOW_STOCK',
    `threshold` INTEGER NULL,
    `currentStock` INTEGER NULL,
    `message` VARCHAR(191) NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedById` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `notificationSent` BOOLEAN NOT NULL DEFAULT false,
    `notificationSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,

    INDEX `stock_alerts_materialId_idx`(`materialId`),
    INDEX `stock_alerts_isResolved_idx`(`isResolved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `vendorName` VARCHAR(191) NULL,
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedDate` DATETIME(3) NULL,
    `receivedDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_orders_vendorId_idx`(`vendorId`),
    INDEX `purchase_orders_status_idx`(`status`),
    UNIQUE INDEX `purchase_orders_orderNumber_companyId_key`(`orderNumber`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `totalCost` DOUBLE NOT NULL,
    `receivedQuantity` INTEGER NOT NULL DEFAULT 0,
    `companyId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_price_history` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `unitCost` DOUBLE NOT NULL,
    `sellingPrice` DOUBLE NULL,
    `effectiveDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,

    INDEX `material_price_history_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_activities` ADD CONSTRAINT `user_activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_profiles` ADD CONSTRAINT `company_profiles_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racks` ADD CONSTRAINT `racks_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racks` ADD CONSTRAINT `racks_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racks` ADD CONSTRAINT `racks_companyProfileId_fkey` FOREIGN KEY (`companyProfileId`) REFERENCES `company_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_inventory` ADD CONSTRAINT `rack_inventory_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `racks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_activities` ADD CONSTRAINT `rack_activities_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `racks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_activities` ADD CONSTRAINT `rack_activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_companyProfileId_fkey` FOREIGN KEY (`companyProfileId`) REFERENCES `company_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_releasedById_fkey` FOREIGN KEY (`releasedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_boxes` ADD CONSTRAINT `shipment_boxes_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_boxes` ADD CONSTRAINT `shipment_boxes_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `racks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_items` ADD CONSTRAINT `shipment_items_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_items` ADD CONSTRAINT `shipment_items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_settings` ADD CONSTRAINT `invoice_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_settings` ADD CONSTRAINT `billing_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charge_types` ADD CONSTRAINT `charge_types_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charge_types` ADD CONSTRAINT `charge_types_billingSettingsId_fkey` FOREIGN KEY (`billingSettingsId`) REFERENCES `billing_settings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_charges` ADD CONSTRAINT `shipment_charges_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_charges` ADD CONSTRAINT `shipment_charges_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_fields` ADD CONSTRAINT `custom_fields_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_field_values` ADD CONSTRAINT `custom_field_values_customFieldId_fkey` FOREIGN KEY (`customFieldId`) REFERENCES `custom_fields`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_settings` ADD CONSTRAINT `shipment_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_settings` ADD CONSTRAINT `template_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `moving_jobs` ADD CONSTRAINT `moving_jobs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `moving_jobs` ADD CONSTRAINT `moving_jobs_teamLeaderId_fkey` FOREIGN KEY (`teamLeaderId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_files` ADD CONSTRAINT `job_files_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `moving_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_files` ADD CONSTRAINT `job_files_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_assignments` ADD CONSTRAINT `job_assignments_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `moving_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_assignments` ADD CONSTRAINT `job_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_assignments` ADD CONSTRAINT `job_assignments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_categories` ADD CONSTRAINT `material_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `material_categories`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_categories` ADD CONSTRAINT `material_categories_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packing_materials` ADD CONSTRAINT `packing_materials_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `material_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packing_materials` ADD CONSTRAINT `packing_materials_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_stock_levels` ADD CONSTRAINT `rack_stock_levels_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_stock_levels` ADD CONSTRAINT `rack_stock_levels_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `racks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_stock_levels` ADD CONSTRAINT `rack_stock_levels_stockBatchId_fkey` FOREIGN KEY (`stockBatchId`) REFERENCES `stock_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rack_stock_levels` ADD CONSTRAINT `rack_stock_levels_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_issues` ADD CONSTRAINT `material_issues_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `moving_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_issues` ADD CONSTRAINT `material_issues_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_issues` ADD CONSTRAINT `material_issues_stockBatchId_fkey` FOREIGN KEY (`stockBatchId`) REFERENCES `stock_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_issues` ADD CONSTRAINT `material_issues_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `racks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_issues` ADD CONSTRAINT `material_issues_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_issues` ADD CONSTRAINT `material_issues_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_returns` ADD CONSTRAINT `material_returns_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `moving_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_returns` ADD CONSTRAINT `material_returns_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_returns` ADD CONSTRAINT `material_returns_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `material_issues`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_returns` ADD CONSTRAINT `material_returns_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `racks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_returns` ADD CONSTRAINT `material_returns_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_returns` ADD CONSTRAINT `material_returns_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_damages` ADD CONSTRAINT `material_damages_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_damages` ADD CONSTRAINT `material_damages_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `material_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_damages` ADD CONSTRAINT `material_damages_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_damages` ADD CONSTRAINT `material_damages_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_damages` ADD CONSTRAINT `material_damages_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_approvals` ADD CONSTRAINT `material_approvals_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `moving_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_approvals` ADD CONSTRAINT `material_approvals_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_approvals` ADD CONSTRAINT `material_approvals_decisionById_fkey` FOREIGN KEY (`decisionById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_approvals` ADD CONSTRAINT `material_approvals_subjectReturnId_fkey` FOREIGN KEY (`subjectReturnId`) REFERENCES `material_returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_approvals` ADD CONSTRAINT `material_approvals_subjectDamageId_fkey` FOREIGN KEY (`subjectDamageId`) REFERENCES `material_damages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_approvals` ADD CONSTRAINT `material_approvals_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cost_snapshots` ADD CONSTRAINT `job_cost_snapshots_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `moving_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cost_snapshots` ADD CONSTRAINT `job_cost_snapshots_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_plugins` ADD CONSTRAINT `system_plugins_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_plugin_logs` ADD CONSTRAINT `system_plugin_logs_pluginId_fkey` FOREIGN KEY (`pluginId`) REFERENCES `system_plugins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_plugin_logs` ADD CONSTRAINT `system_plugin_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_usedById_fkey` FOREIGN KEY (`usedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_fromRackId_fkey` FOREIGN KEY (`fromRackId`) REFERENCES `racks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_toRackId_fkey` FOREIGN KEY (`toRackId`) REFERENCES `racks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_transfers` ADD CONSTRAINT `material_transfers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_alerts` ADD CONSTRAINT `stock_alerts_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_alerts` ADD CONSTRAINT `stock_alerts_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_alerts` ADD CONSTRAINT `stock_alerts_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_price_history` ADD CONSTRAINT `material_price_history_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `packing_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_price_history` ADD CONSTRAINT `material_price_history_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_price_history` ADD CONSTRAINT `material_price_history_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

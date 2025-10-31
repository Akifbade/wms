"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET shipment settings for company
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        let settings = await prisma.shipmentSettings.findUnique({
            where: { companyId }
        });
        // If no settings exist, create default
        if (!settings) {
            settings = await prisma.shipmentSettings.create({
                data: { companyId }
            });
        }
        res.json({ settings });
    }
    catch (error) {
        console.error('Error fetching shipment settings:', error);
        res.status(500).json({ error: 'Failed to fetch shipment settings' });
    }
});
// UPDATE shipment settings
router.put('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { 
        // Intake Settings
        requireClientEmail, requireClientPhone, requireEstimatedValue, requirePhotos, autoGenerateQR, qrCodePrefix, 
        // Storage Settings
        defaultStorageType, allowMultipleRacks, requireRackAssignment, autoAssignRack, notifyOnLowCapacity, lowCapacityThreshold, 
        // Release Settings
        requireReleaseApproval, releaseApproverRole, requireReleasePhotos, requireIDVerification, generateReleaseInvoice, autoSendInvoiceEmail, 
        // Pricing
        storageRatePerDay, storageRatePerBox, chargePartialDay, minimumChargeDays, releaseHandlingFee, releasePerBoxFee, releaseTransportFee, 
        // Notifications
        notifyClientOnIntake, notifyClientOnRelease, notifyOnStorageAlert, storageAlertDays, 
        // Custom Fields
        enableCustomFields, requiredCustomFields, 
        // Partial Release
        allowPartialRelease, partialReleaseMinBoxes, requirePartialApproval, 
        // Documentation
        requireReleaseSignature, requireCollectorID, allowProxyCollection, } = req.body;
        // Validation
        if (storageRatePerDay !== undefined && storageRatePerDay < 0) {
            return res.status(400).json({ error: 'Storage rate per day cannot be negative' });
        }
        if (lowCapacityThreshold !== undefined && (lowCapacityThreshold < 0 || lowCapacityThreshold > 100)) {
            return res.status(400).json({ error: 'Low capacity threshold must be between 0 and 100' });
        }
        if (minimumChargeDays !== undefined && minimumChargeDays < 0) {
            return res.status(400).json({ error: 'Minimum charge days cannot be negative' });
        }
        if (defaultStorageType && !['PERSONAL', 'COMMERCIAL'].includes(defaultStorageType)) {
            return res.status(400).json({ error: 'Invalid storage type. Must be PERSONAL or COMMERCIAL' });
        }
        if (releaseApproverRole && !['MANAGER', 'ADMIN'].includes(releaseApproverRole)) {
            return res.status(400).json({ error: 'Invalid approver role. Must be MANAGER or ADMIN' });
        }
        // Build update data object (only include provided fields)
        const updateData = {};
        if (requireClientEmail !== undefined)
            updateData.requireClientEmail = requireClientEmail;
        if (requireClientPhone !== undefined)
            updateData.requireClientPhone = requireClientPhone;
        if (requireEstimatedValue !== undefined)
            updateData.requireEstimatedValue = requireEstimatedValue;
        if (requirePhotos !== undefined)
            updateData.requirePhotos = requirePhotos;
        if (autoGenerateQR !== undefined)
            updateData.autoGenerateQR = autoGenerateQR;
        if (qrCodePrefix !== undefined)
            updateData.qrCodePrefix = qrCodePrefix;
        if (defaultStorageType !== undefined)
            updateData.defaultStorageType = defaultStorageType;
        if (allowMultipleRacks !== undefined)
            updateData.allowMultipleRacks = allowMultipleRacks;
        if (requireRackAssignment !== undefined)
            updateData.requireRackAssignment = requireRackAssignment;
        if (autoAssignRack !== undefined)
            updateData.autoAssignRack = autoAssignRack;
        if (notifyOnLowCapacity !== undefined)
            updateData.notifyOnLowCapacity = notifyOnLowCapacity;
        if (lowCapacityThreshold !== undefined)
            updateData.lowCapacityThreshold = lowCapacityThreshold;
        if (requireReleaseApproval !== undefined)
            updateData.requireReleaseApproval = requireReleaseApproval;
        if (releaseApproverRole !== undefined)
            updateData.releaseApproverRole = releaseApproverRole;
        if (requireReleasePhotos !== undefined)
            updateData.requireReleasePhotos = requireReleasePhotos;
        if (requireIDVerification !== undefined)
            updateData.requireIDVerification = requireIDVerification;
        if (generateReleaseInvoice !== undefined)
            updateData.generateReleaseInvoice = generateReleaseInvoice;
        if (autoSendInvoiceEmail !== undefined)
            updateData.autoSendInvoiceEmail = autoSendInvoiceEmail;
        if (storageRatePerDay !== undefined)
            updateData.storageRatePerDay = storageRatePerDay;
        if (storageRatePerBox !== undefined)
            updateData.storageRatePerBox = storageRatePerBox;
        if (chargePartialDay !== undefined)
            updateData.chargePartialDay = chargePartialDay;
        if (minimumChargeDays !== undefined)
            updateData.minimumChargeDays = minimumChargeDays;
        if (releaseHandlingFee !== undefined)
            updateData.releaseHandlingFee = releaseHandlingFee;
        if (releasePerBoxFee !== undefined)
            updateData.releasePerBoxFee = releasePerBoxFee;
        if (releaseTransportFee !== undefined)
            updateData.releaseTransportFee = releaseTransportFee;
        if (notifyClientOnIntake !== undefined)
            updateData.notifyClientOnIntake = notifyClientOnIntake;
        if (notifyClientOnRelease !== undefined)
            updateData.notifyClientOnRelease = notifyClientOnRelease;
        if (notifyOnStorageAlert !== undefined)
            updateData.notifyOnStorageAlert = notifyOnStorageAlert;
        if (storageAlertDays !== undefined)
            updateData.storageAlertDays = storageAlertDays;
        if (enableCustomFields !== undefined)
            updateData.enableCustomFields = enableCustomFields;
        if (requiredCustomFields !== undefined)
            updateData.requiredCustomFields = requiredCustomFields;
        if (allowPartialRelease !== undefined)
            updateData.allowPartialRelease = allowPartialRelease;
        if (partialReleaseMinBoxes !== undefined)
            updateData.partialReleaseMinBoxes = partialReleaseMinBoxes;
        if (requirePartialApproval !== undefined)
            updateData.requirePartialApproval = requirePartialApproval;
        if (requireReleaseSignature !== undefined)
            updateData.requireReleaseSignature = requireReleaseSignature;
        if (requireCollectorID !== undefined)
            updateData.requireCollectorID = requireCollectorID;
        if (allowProxyCollection !== undefined)
            updateData.allowProxyCollection = allowProxyCollection;
        // Upsert settings
        const settings = await prisma.shipmentSettings.upsert({
            where: { companyId },
            update: updateData,
            create: {
                companyId,
                ...updateData
            }
        });
        res.json({
            message: 'Shipment settings updated successfully',
            settings
        });
    }
    catch (error) {
        console.error('Error updating shipment settings:', error);
        res.status(500).json({ error: 'Failed to update shipment settings' });
    }
});
// RESET to default settings
router.post('/reset', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        // Delete existing settings
        await prisma.shipmentSettings.deleteMany({
            where: { companyId }
        });
        // Create new default settings
        const settings = await prisma.shipmentSettings.create({
            data: { companyId }
        });
        res.json({
            message: 'Shipment settings reset to defaults successfully',
            settings
        });
    }
    catch (error) {
        console.error('Error resetting shipment settings:', error);
        res.status(500).json({ error: 'Failed to reset shipment settings' });
    }
});
exports.default = router;

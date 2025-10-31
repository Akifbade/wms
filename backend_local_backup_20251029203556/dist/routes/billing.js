"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get billing settings
router.get('/settings', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        let settings = await prisma.billingSettings.findUnique({
            where: { companyId },
            include: {
                chargeTypes: {
                    where: { isActive: true },
                    orderBy: { displayOrder: 'asc' }
                }
            }
        });
        // Create default settings if none exist
        if (!settings) {
            settings = await prisma.billingSettings.create({
                data: {
                    companyId,
                    storageRateType: 'PER_DAY',
                    storageRatePerBox: 0.500,
                    taxRate: 5.0,
                    currency: 'KWD',
                    invoicePrefix: 'INV',
                    invoiceDueDays: 10,
                    gracePeriodDays: 3,
                    minimumCharge: 10.0,
                    primaryColor: '#2563eb',
                    secondaryColor: '#64748b',
                },
                include: {
                    chargeTypes: true
                }
            });
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Get billing settings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update billing settings
router.put('/settings', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { storageRateType, storageRatePerBox, storageRatePerWeek, storageRatePerMonth, taxEnabled, taxRate, currency, invoicePrefix, invoiceDueDays, gracePeriodDays, minimumCharge, logoUrl, logoPosition, primaryColor, secondaryColor, showCompanyDetails, showBankDetails, showTermsConditions, bankName, accountNumber, accountName, iban, swiftCode, invoiceFooterText, termsAndConditions, paymentInstructions, taxRegistrationNo, companyRegistrationNo, } = req.body;
        const settings = await prisma.billingSettings.upsert({
            where: { companyId },
            update: {
                storageRateType,
                storageRatePerBox,
                storageRatePerWeek,
                storageRatePerMonth,
                taxEnabled,
                taxRate,
                currency,
                invoicePrefix,
                invoiceDueDays,
                gracePeriodDays,
                minimumCharge,
                logoUrl,
                logoPosition,
                primaryColor,
                secondaryColor,
                showCompanyDetails,
                showBankDetails,
                showTermsConditions,
                bankName,
                accountNumber,
                accountName,
                iban,
                swiftCode,
                invoiceFooterText,
                termsAndConditions,
                paymentInstructions,
                taxRegistrationNo,
                companyRegistrationNo,
            },
            create: {
                companyId,
                storageRateType,
                storageRatePerBox,
                storageRatePerWeek,
                storageRatePerMonth,
                taxEnabled,
                taxRate,
                currency,
                invoicePrefix,
                invoiceDueDays,
                gracePeriodDays,
                minimumCharge,
                logoUrl,
                logoPosition,
                primaryColor,
                secondaryColor,
                showCompanyDetails,
                showBankDetails,
                showTermsConditions,
                bankName,
                accountNumber,
                accountName,
                iban,
                swiftCode,
                invoiceFooterText,
                termsAndConditions,
                paymentInstructions,
                taxRegistrationNo,
                companyRegistrationNo,
            },
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Update billing settings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get all charge types
router.get('/charge-types', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { category, active } = req.query;
        const where = { companyId };
        if (category)
            where.category = category;
        if (active === 'true')
            where.isActive = true;
        const chargeTypes = await prisma.chargeType.findMany({
            where,
            orderBy: { displayOrder: 'asc' },
        });
        res.json(chargeTypes);
    }
    catch (error) {
        console.error('Get charge types error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get single charge type
router.get('/charge-types/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const chargeType = await prisma.chargeType.findFirst({
            where: { id, companyId },
        });
        if (!chargeType) {
            return res.status(404).json({ error: 'Charge type not found' });
        }
        res.json(chargeType);
    }
    catch (error) {
        console.error('Get charge type error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Create charge type
router.post('/charge-types', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, code, description, category, calculationType, rate, minCharge, maxCharge, applyOnRelease, applyOnStorage, isTaxable, isActive, isDefault, displayOrder, } = req.body;
        // Get billing settings to link
        let billingSettings = await prisma.billingSettings.findUnique({
            where: { companyId },
        });
        if (!billingSettings) {
            billingSettings = await prisma.billingSettings.create({
                data: { companyId },
            });
        }
        const chargeType = await prisma.chargeType.create({
            data: {
                companyId,
                billingSettingsId: billingSettings.id,
                name,
                code,
                description,
                category,
                calculationType,
                rate,
                minCharge,
                maxCharge,
                applyOnRelease,
                applyOnStorage,
                isTaxable,
                isActive,
                isDefault,
                displayOrder,
            },
        });
        res.status(201).json(chargeType);
    }
    catch (error) {
        console.error('Create charge type error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Update charge type
router.put('/charge-types/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const { name, code, description, category, calculationType, rate, minCharge, maxCharge, applyOnRelease, applyOnStorage, isTaxable, isActive, isDefault, displayOrder, } = req.body;
        const chargeType = await prisma.chargeType.updateMany({
            where: { id, companyId },
            data: {
                name,
                code,
                description,
                category,
                calculationType,
                rate,
                minCharge,
                maxCharge,
                applyOnRelease,
                applyOnStorage,
                isTaxable,
                isActive,
                isDefault,
                displayOrder,
            },
        });
        if (chargeType.count === 0) {
            return res.status(404).json({ error: 'Charge type not found' });
        }
        res.json({ message: 'Charge type updated successfully' });
    }
    catch (error) {
        console.error('Update charge type error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Delete charge type
router.delete('/charge-types/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const chargeType = await prisma.chargeType.deleteMany({
            where: { id, companyId },
        });
        if (chargeType.count === 0) {
            return res.status(404).json({ error: 'Charge type not found' });
        }
        res.json({ message: 'Charge type deleted successfully' });
    }
    catch (error) {
        console.error('Delete charge type error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get invoices
router.get('/invoices', auth_1.authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, search, isWarehouseInvoice } = req.query;
        const where = { companyId };
        if (status)
            where.paymentStatus = status;
        if (isWarehouseInvoice !== undefined) {
            where.isWarehouseInvoice = isWarehouseInvoice === 'true';
        }
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                shipment: {
                    select: {
                        referenceId: true,
                        currentBoxCount: true,
                    }
                },
                lineItems: true,
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(invoices);
    }
    catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get single invoice
router.get('/invoices/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
            include: {
                shipment: {
                    include: {
                        boxes: {
                            include: {
                                rack: {
                                    select: {
                                        id: true,
                                        code: true,
                                        location: true,
                                    }
                                }
                            },
                            orderBy: {
                                boxNumber: 'asc'
                            }
                        }
                    }
                },
                lineItems: true,
                payments: true,
                company: true,
            },
        });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        // Compute rack locations from boxes if shipment exists
        if (invoice.shipment) {
            const rackIds = [...new Set(invoice.shipment.boxes
                    .filter((b) => b.rackId)
                    .map((b) => b.rackId))];
            const racks = rackIds.length > 0 ? await prisma.rack.findMany({
                where: { id: { in: rackIds } },
                select: { code: true }
            }) : [];
            const rackCodes = racks.map(r => r.code).join(', ');
            invoice.shipment.rackLocations = rackCodes || null;
        }
        res.json(invoice);
    }
    catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Create invoice
router.post('/invoices', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { shipmentId, clientName, clientPhone, clientAddress, lineItems, notes, isWarehouseInvoice, warehouseData, } = req.body;
        // Get billing settings for invoice number generation
        const settings = await prisma.billingSettings.findUnique({
            where: { companyId },
        });
        const invoicePrefix = settings?.invoicePrefix || 'INV';
        // Get last invoice number
        const lastInvoice = await prisma.invoice.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
        let nextNumber = 1;
        if (lastInvoice?.invoiceNumber) {
            const match = lastInvoice.invoiceNumber.match(/\d+$/);
            if (match) {
                nextNumber = parseInt(match[0]) + 1;
            }
        }
        const invoiceNumber = `${invoicePrefix}-${String(nextNumber).padStart(5, '0')}`;
        // Calculate totals
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = settings?.taxRate || 0;
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;
        const invoiceDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (settings?.invoiceDueDays || 10));
        // Create invoice with line items
        const invoice = await prisma.invoice.create({
            data: {
                companyId,
                shipmentId,
                invoiceNumber,
                invoiceDate,
                dueDate,
                clientName,
                clientPhone,
                clientAddress,
                subtotal,
                taxAmount,
                totalAmount,
                balanceDue: totalAmount,
                paymentStatus: 'PENDING',
                notes,
                isWarehouseInvoice: isWarehouseInvoice || false,
                warehouseData: warehouseData ? JSON.stringify(warehouseData) : null,
                lineItems: {
                    create: lineItems.map((item) => ({
                        companyId,
                        description: item.description,
                        category: item.category || 'SERVICE',
                        quantity: parseFloat(item.quantity) || 0,
                        unitPrice: parseFloat(item.unitPrice) || 0,
                        amount: parseFloat(item.amount) || 0,
                        isTaxable: (item.taxRate || 0) > 0,
                        taxRate: parseFloat(item.taxRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                    })),
                },
            },
            include: {
                lineItems: true,
                shipment: true,
                company: true,
            },
        });
        // Update shipment charges if exists
        if (shipmentId) {
            const shipmentCharges = await prisma.shipmentCharges.findUnique({
                where: { shipmentId },
            });
            if (shipmentCharges) {
                await prisma.shipmentCharges.update({
                    where: { shipmentId },
                    data: {
                        totalInvoiced: { increment: totalAmount },
                        outstandingBalance: { increment: totalAmount },
                    },
                });
            }
            else {
                await prisma.shipmentCharges.create({
                    data: {
                        companyId,
                        shipmentId,
                        currentStorageCharge: 0,
                        daysStored: 0,
                        totalInvoiced: totalAmount,
                        totalPaid: 0,
                        outstandingBalance: totalAmount,
                    },
                });
            }
        }
        res.status(201).json(invoice);
    }
    catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Record payment
router.post('/invoices/:id/payments', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const { amount, paymentMethod, transactionRef, receiptNumber, notes } = req.body;
        const invoice = await prisma.invoice.findFirst({
            where: { id, companyId },
        });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        const payment = await prisma.payment.create({
            data: {
                companyId,
                invoiceId: id,
                amount,
                paymentDate: new Date(),
                paymentMethod,
                transactionRef,
                receiptNumber,
                notes,
            },
        });
        // Update invoice balance and status
        const newBalance = invoice.balanceDue - amount;
        const newPaidAmount = invoice.paidAmount + amount;
        let paymentStatus = invoice.paymentStatus;
        if (newBalance <= 0) {
            paymentStatus = 'PAID';
        }
        else if (newBalance < invoice.totalAmount) {
            paymentStatus = 'PARTIAL';
        }
        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                balanceDue: newBalance,
                paidAmount: newPaidAmount,
                paymentStatus,
            },
            include: {
                lineItems: true,
                payments: true,
            },
        });
        // Update shipment charges
        if (invoice.shipmentId) {
            await prisma.shipmentCharges.update({
                where: { shipmentId: invoice.shipmentId },
                data: {
                    totalPaid: { increment: amount },
                    outstandingBalance: { decrement: amount },
                },
            });
        }
        res.status(201).json({
            payment,
            invoice: updatedInvoice,
            message: 'Payment recorded successfully'
        });
    }
    catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

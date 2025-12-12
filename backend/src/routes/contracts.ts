import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// CONTRACT MANAGEMENT SYSTEM
// ============================================
// Contract = Fixed monthly payment with storage limits
// Customer pays at month end based on contract terms
// No "balance" deductions - just validate contract is active
//
// Database Fields Available:
// id, companyId, companyProfileId, totalPaid, balanceRemaining, monthlyRate
// validFrom, validUntil, status, notes, createdAt, updatedAt
// paymentDueDay, maxCBM, maxStorageDays, contractStartDate, contractEndDate
// lastBilledDate, nextBillingDate, totalBilled

// Helper to generate ID
const generateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 25; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// ============================================
// GET ALL CONTRACTS
// ============================================
router.get('/all', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;

        // Use raw query to get all fields including new ones
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as customerName, cp.contactPerson, cp.contactPhone
            FROM customer_prepaid_balances cpb
            LEFT JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.companyId = ${companyId}
            ORDER BY cpb.updatedAt DESC
        `;

        // Auto-update expired contracts using validUntil or contractEndDate
        const now = new Date();
        for (const contract of contracts) {
            const endDate = contract.contractEndDate || contract.validUntil;
            if (endDate && new Date(endDate) < now && contract.status !== 'EXPIRED') {
                await prisma.customerPrepaidBalance.update({
                    where: { id: contract.id },
                    data: { status: 'EXPIRED' }
                });
                contract.status = 'EXPIRED';
            }
        }

        // Format response to include companyProfile structure
        const formattedContracts = contracts.map(c => ({
            id: c.id,
            companyId: c.companyId,
            companyProfileId: c.companyProfileId,
            totalPaid: c.totalPaid,
            balanceRemaining: c.balanceRemaining,
            monthlyRate: c.monthlyRate,
            validFrom: c.validFrom,
            validUntil: c.validUntil,
            status: c.status,
            notes: c.notes,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            paymentDueDay: c.paymentDueDay,
            maxCBM: c.maxCBM,
            maxStorageDays: c.maxStorageDays,
            contractStartDate: c.contractStartDate,
            contractEndDate: c.contractEndDate,
            lastBilledDate: c.lastBilledDate,
            nextBillingDate: c.nextBillingDate,
            totalBilled: c.totalBilled,
            companyProfile: {
                id: c.companyProfileId,
                name: c.customerName,
                contactPerson: c.contactPerson,
                contactPhone: c.contactPhone
            }
        }));

        res.json(formattedContracts);
    } catch (error: any) {
        console.error('Get contracts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET CONTRACT FOR SPECIFIC CUSTOMER
// ============================================
router.get('/customer/:companyProfileId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { companyProfileId } = req.params;

        // Use raw query to get all fields including new ones
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as customerName, cp.contactPerson, cp.contactPhone
            FROM customer_prepaid_balances cpb
            LEFT JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.companyId = ${companyId} AND cpb.companyProfileId = ${companyProfileId}
            LIMIT 1
        `;

        const contract = contracts[0];

        if (!contract) {
            return res.json({
                companyProfileId,
                hasContract: false,
                message: 'No contract found for this customer'
            });
        }

        // Get transactions
        const transactions = await prisma.prepaidTransaction.findMany({
            where: { prepaidBalanceId: contract.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // Auto-update expired status
        const now = new Date();
        const endDate = contract.contractEndDate || contract.validUntil;
        if (endDate && new Date(endDate) < now && contract.status !== 'EXPIRED') {
            await prisma.customerPrepaidBalance.update({
                where: { id: contract.id },
                data: { status: 'EXPIRED' }
            });
            contract.status = 'EXPIRED';
        }

        res.json({
            id: contract.id,
            companyId: contract.companyId,
            companyProfileId: contract.companyProfileId,
            totalPaid: contract.totalPaid,
            balanceRemaining: contract.balanceRemaining,
            monthlyRate: contract.monthlyRate,
            validFrom: contract.validFrom,
            validUntil: contract.validUntil,
            status: contract.status,
            notes: contract.notes,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
            paymentDueDay: contract.paymentDueDay,
            maxCBM: contract.maxCBM,
            maxStorageDays: contract.maxStorageDays,
            contractStartDate: contract.contractStartDate,
            contractEndDate: contract.contractEndDate,
            lastBilledDate: contract.lastBilledDate,
            nextBillingDate: contract.nextBillingDate,
            totalBilled: contract.totalBilled,
            companyProfile: {
                id: contract.companyProfileId,
                name: contract.customerName,
                contactPerson: contract.contactPerson,
                contactPhone: contract.contactPhone
            },
            transactions,
            hasContract: true
        });
    } catch (error: any) {
        console.error('Get customer contract error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CREATE NEW CONTRACT
// ============================================
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const {
            companyProfileId,
            monthlyRate,
            paymentDueDay,     // Day of month payment is due (1-28)
            maxCBM,            // Max CBM allowed under contract
            maxStorageDays,    // Max days goods can be stored
            contractStartDate,
            contractEndDate,
            notes
        } = req.body;

        if (!companyProfileId) {
            return res.status(400).json({ error: 'Company profile ID is required' });
        }

        // Check if contract already exists
        const existing = await prisma.customerPrepaidBalance.findFirst({
            where: { companyId, companyProfileId }
        });

        if (existing) {
            return res.status(400).json({
                error: 'Contract already exists for this customer. Use update instead.'
            });
        }

        // Verify customer exists
        const customer = await prisma.companyProfile.findFirst({
            where: { id: companyProfileId, companyId }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const startDate = contractStartDate ? new Date(contractStartDate) : new Date();
        const endDate = contractEndDate ? new Date(contractEndDate) : null;
        const contractId = generateId();

        // Create base contract with Prisma
        await prisma.customerPrepaidBalance.create({
            data: {
                id: contractId,
                companyId,
                companyProfileId,
                monthlyRate: monthlyRate || 0,
                totalPaid: 0,
                balanceRemaining: 0,
                validFrom: startDate,
                validUntil: endDate,
                status: 'ACTIVE',
                notes: notes || ''
            }
        });

        // Update the new fields directly via raw query since Prisma client may not have them
        await prisma.$executeRaw`
            UPDATE customer_prepaid_balances 
            SET paymentDueDay = ${paymentDueDay || 25},
                maxCBM = ${maxCBM || null},
                maxStorageDays = ${maxStorageDays || null},
                contractStartDate = ${startDate},
                contractEndDate = ${endDate}
            WHERE id = ${contractId}
        `;

        // Fetch the created contract with all fields
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as customerName
            FROM customer_prepaid_balances cpb
            LEFT JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.id = ${contractId}
            LIMIT 1
        `;

        res.status(201).json({
            success: true,
            message: `Contract created for ${customer.name}`,
            contract: contracts[0]
        });
    } catch (error: any) {
        console.error('Create contract error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// UPDATE CONTRACT
// ============================================
router.put('/:contractId', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { contractId } = req.params;
        const {
            monthlyRate,
            paymentDueDay,
            maxCBM,
            maxStorageDays,
            contractStartDate,
            contractEndDate,
            status,
            notes
        } = req.body;

        // Find existing contract
        const existingContract = await prisma.customerPrepaidBalance.findFirst({
            where: { id: contractId, companyId }
        });

        if (!existingContract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // HISTORY TRACKING: Save current state before update if critical fields change
        if (monthlyRate !== undefined || contractStartDate !== undefined || contractEndDate !== undefined) {
            const historyId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const startDate = existingContract.contractStartDate || existingContract.validFrom || new Date();
            const endDate = existingContract.contractEndDate || existingContract.validUntil;
            const userId = req.user!.id;

            await prisma.$executeRaw`
                INSERT INTO contract_history (id, customerPrepaidBalanceId, monthlyRate, contractStartDate, contractEndDate, reason, changedByUserId, createdAt)
                VALUES (${historyId}, ${contractId}, ${existingContract.monthlyRate}, ${startDate}, ${endDate}, 'Contract Update', ${userId}, NOW())
            `;
        }

        // Build update data for Prisma (only fields it knows about)
        const updateData: any = {};

        if (monthlyRate !== undefined) {
            updateData.monthlyRate = monthlyRate;
        }

        if (contractEndDate !== undefined) {
            updateData.validUntil = contractEndDate ? new Date(contractEndDate) : null;
        }

        if (status !== undefined) {
            updateData.status = status;
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Update via Prisma
        if (Object.keys(updateData).length > 0) {
            await prisma.customerPrepaidBalance.update({
                where: { id: contractId },
                data: updateData
            });
        }

        // Update the new fields directly via raw query
        const startDateValue = contractStartDate ? new Date(contractStartDate) : null;
        const endDateValue = contractEndDate ? new Date(contractEndDate) : null;

        if (paymentDueDay !== undefined || maxCBM !== undefined || maxStorageDays !== undefined || contractStartDate !== undefined || contractEndDate !== undefined) {
            // Build SET clause dynamically
            const setClauses: string[] = [];
            const values: any[] = [];

            if (paymentDueDay !== undefined) {
                setClauses.push('paymentDueDay = ?');
                values.push(paymentDueDay);
            }
            if (maxCBM !== undefined) {
                setClauses.push('maxCBM = ?');
                values.push(maxCBM);
            }
            if (maxStorageDays !== undefined) {
                setClauses.push('maxStorageDays = ?');
                values.push(maxStorageDays);
            }
            if (contractStartDate !== undefined) {
                setClauses.push('contractStartDate = ?');
                values.push(startDateValue);
            }
            if (contractEndDate !== undefined) {
                setClauses.push('contractEndDate = ?');
                values.push(endDateValue);
            }

            if (setClauses.length > 0) {
                const sql = `UPDATE customer_prepaid_balances SET ${setClauses.join(', ')} WHERE id = ?`;
                values.push(contractId);
                await prisma.$executeRawUnsafe(sql, ...values);
            }
        }

        // Fetch updated contract
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as customerName
            FROM customer_prepaid_balances cpb
            LEFT JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.id = ${contractId}
            LIMIT 1
        `;

        res.json({
            success: true,
            message: 'Contract updated successfully',
            contract: contracts[0]
        });
    } catch (error: any) {
        console.error('Update contract error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CHECK CONTRACT VALIDITY (for shipment operations)
// ============================================
router.get('/check/:companyProfileId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { companyProfileId } = req.params;

        // Get contract with raw query to include new fields
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as customerName
            FROM customer_prepaid_balances cpb
            LEFT JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.companyId = ${companyId} AND cpb.companyProfileId = ${companyProfileId}
            LIMIT 1
        `;

        const contract = contracts[0];

        if (!contract) {
            // No contract means regular customer - can always operate
            return res.json({
                hasContract: false,
                isValid: true,
                canOperate: true,
                isContractCustomer: false,
                message: 'No contract - regular customer'
            });
        }

        const now = new Date();
        const contractEndDate = contract.contractEndDate || contract.validUntil;
        const isExpired = contractEndDate && new Date(contractEndDate) < now;
        const isSuspended = contract.status === 'SUSPENDED';
        const isCancelled = contract.status === 'CANCELLED';
        const isPending = contract.status === 'PENDING';

        // Auto-update status if expired
        if (isExpired && contract.status !== 'EXPIRED') {
            await prisma.customerPrepaidBalance.update({
                where: { id: contract.id },
                data: { status: 'EXPIRED' }
            });
        }

        const canOperate = !isExpired && !isCancelled && !isSuspended && !isPending;

        res.json({
            hasContract: true,
            isContractCustomer: true,
            isValid: canOperate,
            canOperate,
            // Status flags
            isExpired,
            isSuspended,
            isCancelled,
            isPending,
            // Contract details
            status: isExpired ? 'EXPIRED' : contract.status,
            monthlyRate: contract.monthlyRate,
            paymentDueDay: contract.paymentDueDay,
            contractStartDate: contract.contractStartDate,
            contractEndDate: contractEndDate,
            // Limits
            maxCBM: contract.maxCBM,
            maxStorageDays: contract.maxStorageDays,
            customerName: contract.customerName,
            // Message
            message: isExpired
                ? `⛔ CONTRACT EXPIRED on ${new Date(contractEndDate).toLocaleDateString()}. Contact admin to renew.`
                : isCancelled
                    ? '⛔ CONTRACT CANCELLED. Contact admin.'
                    : isSuspended
                        ? '⚠️ CONTRACT SUSPENDED. Contact admin.'
                        : isPending
                            ? '⏳ CONTRACT PENDING ACTIVATION. Contact admin.'
                            : '✅ CONTRACT ACTIVE'
        });
    } catch (error: any) {
        console.error('Check contract validity error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DELETE CONTRACT
// ============================================
router.delete('/:contractId', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { contractId } = req.params;

        const contract = await prisma.customerPrepaidBalance.findFirst({
            where: { id: contractId, companyId }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // Delete related transactions first
        await prisma.prepaidTransaction.deleteMany({
            where: { prepaidBalanceId: contractId }
        });

        // Delete contract
        await prisma.customerPrepaidBalance.delete({
            where: { id: contractId }
        });

        res.json({
            success: true,
            message: 'Contract deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete contract error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET CONTRACT SUMMARY/ANALYTICS
// ============================================
router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;

        // Use raw query to get all fields including new ones
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as customerName
            FROM customer_prepaid_balances cpb
            LEFT JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.companyId = ${companyId}
            ORDER BY cpb.updatedAt DESC
        `;

        // Auto-update expired statuses
        const now = new Date();
        for (const contract of contracts) {
            const endDate = contract.contractEndDate || contract.validUntil;
            if (endDate && new Date(endDate) < now && contract.status !== 'EXPIRED') {
                await prisma.customerPrepaidBalance.update({
                    where: { id: contract.id },
                    data: { status: 'EXPIRED' }
                });
                contract.status = 'EXPIRED';
            }
        }

        const summary = {
            totalContracts: contracts.length,
            totalMonthlyRevenue: contracts
                .filter(c => c.status === 'ACTIVE')
                .reduce((sum, c) => sum + (c.monthlyRate || 0), 0),
            activeContracts: contracts.filter(c => c.status === 'ACTIVE').length,
            pendingContracts: contracts.filter(c => c.status === 'PENDING').length,
            expiredContracts: contracts.filter(c => c.status === 'EXPIRED').length,
            suspendedContracts: contracts.filter(c => c.status === 'SUSPENDED').length,
            cancelledContracts: contracts.filter(c => c.status === 'CANCELLED').length,
            contracts: contracts.map(c => ({
                id: c.id,
                customerName: c.customerName || 'Unknown',
                companyProfileId: c.companyProfileId,
                monthlyRate: c.monthlyRate,
                paymentDueDay: c.paymentDueDay,
                maxCBM: c.maxCBM,
                maxStorageDays: c.maxStorageDays,
                contractStartDate: c.contractStartDate,
                contractEndDate: c.contractEndDate || c.validUntil,
                status: c.status
            }))
        };

        res.json(summary);
    } catch (error: any) {
        console.error('Get contract summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RECORD MONTHLY PAYMENT
// Used when customer pays their monthly bill
// ============================================
router.post('/record-payment', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const {
            contractId,
            amount,
            paymentMonth,  // e.g., "2025-06" for June 2025
            paymentMethod,
            notes
        } = req.body;

        if (!contractId || !amount || !paymentMonth) {
            return res.status(400).json({ error: 'Contract ID, amount, and payment month are required' });
        }

        const contract = await prisma.customerPrepaidBalance.findFirst({
            where: { id: contractId, companyId }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // Update total paid
        await prisma.customerPrepaidBalance.update({
            where: { id: contractId },
            data: {
                totalPaid: { increment: amount }
            }
        });

        // Update lastBilledDate and totalBilled via raw query
        await prisma.$executeRaw`
            UPDATE customer_prepaid_balances 
            SET lastBilledDate = NOW(),
                totalBilled = COALESCE(totalBilled, 0) + ${amount}
            WHERE id = ${contractId}
        `;

        // Record transaction
        await prisma.prepaidTransaction.create({
            data: {
                id: generateId(),
                prepaidBalanceId: contractId,
                type: 'MONTHLY_PAYMENT',
                amount,
                balanceBefore: contract.totalPaid || 0,
                balanceAfter: (contract.totalPaid || 0) + amount,
                referenceType: 'PAYMENT',
                referenceId: paymentMonth,
                description: `Monthly payment for ${paymentMonth}. ${paymentMethod ? `Method: ${paymentMethod}.` : ''} ${notes || ''}`
            }
        });

        res.json({
            success: true,
            message: `Payment of ${amount} KWD recorded for ${paymentMonth}`,
            totalPaid: (contract.totalPaid || 0) + amount
        });
    } catch (error: any) {
        console.error('Record payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET PAYMENT HISTORY FOR CONTRACT
// ============================================
router.get('/payments/:contractId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { contractId } = req.params;

        const contract = await prisma.customerPrepaidBalance.findFirst({
            where: { id: contractId, companyId }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        const payments = await prisma.prepaidTransaction.findMany({
            where: {
                prepaidBalanceId: contractId,
                type: 'MONTHLY_PAYMENT'
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            contractId,
            payments,
            totalPaid: contract.totalPaid || 0,
            monthlyRate: contract.monthlyRate || 0
        });
    } catch (error: any) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GENERATE CONTRACT INVOICE (Monthly Payment)
// Creates an invoice for the monthly contract amount
// ============================================
router.post('/generate-invoice/:companyProfileId', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { companyProfileId } = req.params;
        const { month, year, notes } = req.body;

        // Get contract using raw query
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT * FROM customer_prepaid_balances 
            WHERE companyProfileId = ${companyProfileId} AND companyId = ${companyId}
            LIMIT 1
        `;

        if (!contracts || contracts.length === 0) {
            return res.status(404).json({ error: 'No contract found for this company' });
        }

        const contractData = contracts[0];

        if (!contractData.monthlyRate || contractData.monthlyRate <= 0) {
            return res.status(400).json({ error: 'Contract has no monthly rate set' });
        }

        // Get company profile
        const company = await prisma.companyProfile.findFirst({
            where: { id: companyProfileId, companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Generate invoice number with CONT prefix
        const invoiceCount = await prisma.invoice.count({ where: { companyId } });
        const invoiceNumber = `CONT-${String(invoiceCount + 1).padStart(5, '0')}`;

        // Calculate due date based on payment due day
        const paymentDueDay = contractData.paymentDueDay || 25;
        const invoiceMonth = month || new Date().getMonth() + 1;
        const invoiceYear = year || new Date().getFullYear();
        const dueDate = new Date(invoiceYear, invoiceMonth - 1, Math.min(paymentDueDay, 28));

        // Check if invoice for this month already exists
        const existingInvoice = await prisma.invoice.findFirst({
            where: {
                companyProfileId,
                invoiceNumber: {
                    startsWith: 'CONT-'
                },
                notes: {
                    contains: `${invoiceMonth}/${invoiceYear}`
                }
            }
        });

        if (existingInvoice) {
            return res.status(400).json({
                error: `Invoice already exists for ${invoiceMonth}/${invoiceYear}`,
                existingInvoiceId: existingInvoice.id,
                existingInvoiceNumber: existingInvoice.invoiceNumber
            });
        }

        // Calculate amount (support multi-month billing / carry forward)
        const numberOfMonths = req.body.numberOfMonths || 1;
        const totalAmount = contractData.monthlyRate * numberOfMonths;

        // Create invoice using raw SQL to bypass schema issues
        const invoiceId = generateId();
        await prisma.$executeRaw`
            INSERT INTO invoices (
                id, invoiceNumber, companyId, companyProfileId, shipmentId,
                clientName, clientPhone, invoiceDate, dueDate, invoiceType,
                billingMonth, billingYear, subtotal, taxAmount, discountAmount,
                totalAmount, paymentStatus, paidAmount, balanceDue, notes,
                createdAt, updatedAt
            ) VALUES (
                ${invoiceId}, ${invoiceNumber}, ${companyId}, ${companyProfileId}, NULL,
                ${company.name}, ${company.contactPhone || ''}, NOW(), ${dueDate}, 'CONTRACT',
                ${invoiceMonth}, ${invoiceYear}, ${totalAmount}, 0, 0,
                ${totalAmount}, 'PENDING', 0, ${totalAmount}, 
                ${notes || `Monthly Contract Payment - ${numberOfMonths > 1 ? numberOfMonths + ' months - ' : ''}${invoiceMonth}/${invoiceYear}`},
                NOW(), NOW()
            )
        `;

        // Create line item
        await prisma.$executeRaw`
            INSERT INTO invoice_line_items (
                id, invoiceId, companyId, description, category, quantity, unitPrice, amount, isTaxable, taxAmount, displayOrder
            ) VALUES (
                ${generateId()}, ${invoiceId}, ${companyId},
                ${`Monthly Contract Fee - ${numberOfMonths > 1 ? numberOfMonths + ' months starting ' : ''}${new Date(invoiceYear, invoiceMonth - 1).toLocaleString('default', { month: 'long' })} ${invoiceYear}`},
                'CONTRACT_FEE', ${numberOfMonths}, ${contractData.monthlyRate}, ${totalAmount}, false, 0, 0
            )
        `;

        // Update contract totalBilled
        await prisma.$executeRaw`
            UPDATE customer_prepaid_balances 
            SET totalBilled = COALESCE(totalBilled, 0) + ${totalAmount},
                lastBilledDate = NOW()
            WHERE id = ${contractData.id}
        `;

        res.status(201).json({
            success: true,
            message: `Contract invoice generated for ${numberOfMonths > 1 ? numberOfMonths + ' months starting ' : ''}${new Date(invoiceYear, invoiceMonth - 1).toLocaleString('default', { month: 'long' })} ${invoiceYear}`,
            invoice: {
                id: invoiceId,
                invoiceNumber,
                totalAmount,
                numberOfMonths,
                dueDate,
                paymentStatus: 'PENDING'
            }
        });
    } catch (error: any) {
        console.error('Generate contract invoice error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET CONTRACT PAYMENT HISTORY
// Returns all contract-related invoices for a company
// ============================================
router.get('/payment-history/:companyProfileId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { companyProfileId } = req.params;

        // Get all invoices for this company that are contract payments (CONT- prefix)
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                companyProfileId,
                invoiceNumber: {
                    startsWith: 'CONT-'
                }
            },
            orderBy: { invoiceDate: 'desc' },
            include: {
                payments: true
            }
        });

        // Get detailed payment info with extension data using raw SQL
        const paymentsWithExtension = await prisma.$queryRaw<any[]>`
            SELECT p.*, i.invoiceNumber
            FROM payments p
            JOIN invoices i ON p.invoiceId = i.id
            WHERE i.companyProfileId = ${companyProfileId} AND i.companyId = ${companyId}
            AND i.invoiceNumber LIKE 'CONT-%'
            ORDER BY p.paymentDate DESC
        `;

        // Get contract info for days remaining calculation
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT * FROM customer_prepaid_balances WHERE companyProfileId = ${companyProfileId} AND companyId = ${companyId}
        `;
        const contract = contracts?.[0];

        // Calculate days remaining
        let daysRemaining = 0;
        if (contract?.contractEndDate || contract?.validUntil) {
            const endDate = new Date(contract.contractEndDate || contract.validUntil);
            const today = new Date();
            daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysRemaining < 0) daysRemaining = 0;
        }

        // Calculate summary
        const totalBilled = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
        const pendingInvoices = invoices.filter(inv => inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'PARTIAL');
        const overdueInvoices = invoices.filter(inv =>
            (inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'PARTIAL') &&
            inv.dueDate && new Date(inv.dueDate) < new Date()
        );

        res.json({
            invoices: invoices.map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                totalAmount: Number(inv.totalAmount) || 0,
                paidAmount: Number(inv.paidAmount) || 0,
                paymentStatus: inv.paymentStatus,
                notes: inv.notes,
                payments: inv.payments.map(p => ({
                    id: p.id,
                    amount: Number(p.amount) || 0,
                    paymentMethod: p.paymentMethod,
                    paymentDate: p.paymentDate
                }))
            })),
            // Detailed payment history with extension info
            paymentHistory: paymentsWithExtension.map(p => ({
                id: p.id,
                invoiceNumber: p.invoiceNumber,
                amount: Number(p.amount) || 0,
                paymentMethod: p.paymentMethod,
                transactionRef: p.transactionRef,
                receiptNumber: p.receiptNumber,
                notes: p.notes,
                paymentDate: p.paymentDate,
                extensionDays: p.extensionDays,
                previousEndDate: p.previousEndDate,
                newEndDate: p.newEndDate
            })),
            contract: contract ? {
                id: contract.id,
                status: contract.status,
                monthlyRate: Number(contract.monthlyRate) || 0,
                contractStartDate: contract.contractStartDate,
                contractEndDate: contract.contractEndDate || contract.validUntil,
                daysRemaining,
                totalPaid: Number(contract.totalPaid) || 0
            } : null,
            summary: {
                totalBilled,
                totalPaid,
                outstanding: totalBilled - totalPaid,
                pendingCount: pendingInvoices.length,
                overdueCount: overdueInvoices.length,
                hasOverdue: overdueInvoices.length > 0,
                daysRemaining
            }
        });
    } catch (error: any) {
        console.error('Get contract payment history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CHECK AND AUTO-SUSPEND OVERDUE CONTRACTS
// Admin can run this to suspend contracts with overdue payments
// ============================================
router.post('/check-overdue', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;

        // Get all active contracts
        const contracts = await prisma.$queryRaw<any[]>`
            SELECT cpb.*, cp.name as companyName
            FROM customer_prepaid_balances cpb
            JOIN company_profiles cp ON cpb.companyProfileId = cp.id
            WHERE cpb.companyId = ${companyId} AND cpb.status = 'ACTIVE'
        `;

        const suspendedContracts: string[] = [];
        const overdueDetails: any[] = [];

        for (const contract of contracts) {
            // Check for overdue contract invoices
            const overdueInvoices = await prisma.invoice.findMany({
                where: {
                    companyId,
                    companyProfileId: contract.companyProfileId,
                    invoiceNumber: { startsWith: 'CONT-' },
                    paymentStatus: { in: ['PENDING', 'PARTIAL'] },
                    dueDate: { lt: new Date() }
                }
            });

            if (overdueInvoices.length > 0) {
                // Auto-suspend contract
                await prisma.$executeRaw`
                    UPDATE customer_prepaid_balances 
                    SET status = 'SUSPENDED',
                        notes = CONCAT(COALESCE(notes, ''), '\n[AUTO-SUSPENDED] Overdue payment on ', NOW())
                    WHERE id = ${contract.id}
                `;
                suspendedContracts.push(contract.companyName);
                overdueDetails.push({
                    companyName: contract.companyName,
                    overdueInvoices: overdueInvoices.length,
                    totalOverdue: overdueInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0)
                });
            }
        }

        res.json({
            success: true,
            message: `Checked ${contracts.length} contracts`,
            suspendedCount: suspendedContracts.length,
            suspendedContracts,
            overdueDetails
        });
    } catch (error: any) {
        console.error('Check overdue contracts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REACTIVATE CONTRACT (after payment)
// ============================================
router.post('/reactivate/:contractId', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { contractId } = req.params;

        const contract = await prisma.customerPrepaidBalance.findFirst({
            where: { id: contractId, companyId }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (contract.status === 'ACTIVE') {
            return res.status(400).json({ error: 'Contract is already active' });
        }

        // Reactivate contract
        await prisma.customerPrepaidBalance.update({
            where: { id: contractId },
            data: {
                status: 'ACTIVE',
                notes: `${contract.notes || ''}\n[REACTIVATED] on ${new Date().toISOString()}`
            }
        });

        res.json({
            success: true,
            message: 'Contract reactivated successfully'
        });
    } catch (error: any) {
        console.error('Reactivate contract error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RECORD CONTRACT PAYMENT
// When contract invoice is paid, update contract and auto-extend
// ============================================
router.post('/record-payment/:invoiceId', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const userId = req.user!.id;
        const { invoiceId } = req.params;
        const { amount, paymentMethod, transactionRef, receiptNumber, notes, customExtendDays } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid payment amount is required' });
        }

        // Get the contract invoice
        const invoices = await prisma.$queryRaw<any[]>`
            SELECT * FROM invoices WHERE id = ${invoiceId} AND companyId = ${companyId}
        `;

        if (!invoices || invoices.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoices[0];

        // Check it's a contract invoice
        if (!invoice.invoiceNumber.startsWith('CONT-')) {
            return res.status(400).json({ error: 'This is not a contract invoice. Use regular invoice payment system.' });
        }

        const newPaidAmount = Number(invoice.paidAmount) + amount;
        const totalAmount = Number(invoice.totalAmount);
        const isPaidInFull = newPaidAmount >= totalAmount;
        const newPaymentStatus = isPaidInFull ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'PENDING');

        // Update invoice (same as regular invoice payment)
        await prisma.$executeRaw`
            UPDATE invoices 
            SET paidAmount = ${newPaidAmount},
                balanceDue = ${Math.max(0, totalAmount - newPaidAmount)},
                paymentStatus = ${newPaymentStatus},
                paymentDate = ${isPaidInFull ? new Date() : null},
                paymentMethod = ${paymentMethod || null},
                transactionRef = ${transactionRef || null},
                updatedAt = NOW()
            WHERE id = ${invoiceId}
        `;

        // Variables to track extension (will be set if contract extends)
        let extensionDays: number | null = null;
        let previousEndDate: Date | null = null;
        let newEndDate: Date | null = null;

        // If fully paid, update contract and potentially extend
        if (isPaidInFull && invoice.companyProfileId) {
            // Get contract
            const contracts = await prisma.$queryRaw<any[]>`
                SELECT * FROM customer_prepaid_balances 
                WHERE companyProfileId = ${invoice.companyProfileId}
            `;

            if (contracts && contracts.length > 0) {
                const contract = contracts[0];

                // Calculate extension days
                if (customExtendDays && customExtendDays > 0) {
                    // Use custom extension days provided by user
                    extensionDays = customExtendDays;
                } else {
                    // Auto-calculate based on number of months paid (30 days per month)
                    const lineItems = await prisma.$queryRaw<any[]>`
                        SELECT quantity FROM invoice_line_items WHERE invoiceId = ${invoiceId}
                    `;
                    const monthsPaid = lineItems[0]?.quantity || 1;
                    extensionDays = monthsPaid * 30;
                }

                // Store previous end date for history
                const currentEndDate = contract.contractEndDate || contract.validUntil;
                previousEndDate = currentEndDate ? new Date(currentEndDate) : null;

                if (currentEndDate && new Date(currentEndDate) > new Date()) {
                    // Contract still valid, extend from current end date
                    newEndDate = new Date(currentEndDate);
                    newEndDate.setDate(newEndDate.getDate() + extensionDays);
                } else {
                    // Contract expired or no end date, extend from today
                    newEndDate = new Date();
                    newEndDate.setDate(newEndDate.getDate() + extensionDays);
                }

                // Update contract - reactivate if suspended and extend
                await prisma.$executeRaw`
                    UPDATE customer_prepaid_balances 
                    SET status = 'ACTIVE',
                        contractEndDate = ${newEndDate},
                        validUntil = ${newEndDate},
                        totalPaid = COALESCE(totalPaid, 0) + ${amount},
                        notes = CONCAT(COALESCE(notes, ''), '\n[PAYMENT RECEIVED] ', ${amount}, ' KWD on ', NOW(), ' - Extended ', ${extensionDays}, ' days until ', ${newEndDate.toISOString().split('T')[0]})
                    WHERE id = ${contract.id}
                `;
            }
        }

        // Record payment in payments table with extension details
        await prisma.$executeRaw`
            INSERT INTO payments (
                id, invoiceId, companyId, amount, paymentMethod, transactionRef, receiptNumber, notes, 
                extensionDays, previousEndDate, newEndDate, paymentDate, createdBy, createdAt
            ) VALUES (
                ${generateId()}, ${invoiceId}, ${companyId}, ${amount}, ${paymentMethod || 'CASH'},
                ${transactionRef || null}, ${receiptNumber || null}, ${notes || 'Contract payment'},
                ${extensionDays}, ${previousEndDate}, ${newEndDate}, NOW(), ${userId}, NOW()
            )
        `;

        // Return with extension info if extended
        if (extensionDays && newEndDate) {
            return res.json({
                success: true,
                message: `Payment recorded. Contract extended by ${extensionDays} days until ${newEndDate.toLocaleDateString()}`,
                invoice: {
                    id: invoiceId,
                    paidAmount: newPaidAmount,
                    totalAmount,
                    paymentStatus: newPaymentStatus
                },
                contract: {
                    status: 'ACTIVE',
                    extensionDays,
                    previousEndDate,
                    newEndDate,
                    customExtension: !!customExtendDays
                }
            });
        }

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            invoice: {
                id: invoiceId,
                paidAmount: newPaidAmount,
                totalAmount,
                paymentStatus: newPaymentStatus
            }
        });
    } catch (error: any) {
        console.error('Record contract payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CONTRACT STATEMENT
// ============================================
// Get full statement for a contract - all releases, payments, etc.
router.get('/statement/:contractId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const companyId = req.user!.companyId;
        const { contractId } = req.params;

        // Get the contract with relations
        const contract = await prisma.customerPrepaidBalance.findFirst({
            where: { id: contractId, companyId },
            include: {
                companyProfile: {
                    select: { id: true, name: true, contactPerson: true, contactPhone: true }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        }) as any;

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // Get contract history separately using raw query
        const history = await prisma.$queryRaw<any[]>`
            SELECT * FROM ContractHistory 
            WHERE customerPrepaidBalanceId = ${contractId}
            ORDER BY createdAt DESC
        `.catch(() => []);

        // Get all shipments released under this contract (via companyProfileId)
        const releasedShipments = await prisma.shipment.findMany({
            where: {
                companyId,
                companyProfileId: contract.companyProfileId,
                status: { in: ['RELEASED', 'PARTIALLY_RELEASED'] }
            },
            select: {
                id: true,
                referenceId: true,
                clientName: true,
                status: true,
                currentBoxCount: true,
                originalBoxCount: true,
                cbm: true,
                arrivalDate: true,
                updatedAt: true,
                description: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Get all invoices for this customer
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                companyProfileId: contract.companyProfileId
            },
            select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                paidAmount: true,
                balanceDue: true,
                paymentStatus: true,
                createdAt: true,
                notes: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate totals
        const totalShipmentsReleased = releasedShipments.length;
        const totalBoxesReleased = releasedShipments.reduce((sum, s) => sum + (s.originalBoxCount || 0), 0);
        const totalCBMReleased = releasedShipments.reduce((sum, s) => sum + (s.cbm || 0), 0);
        const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
        const totalOutstanding = invoices.reduce((sum, i) => sum + i.balanceDue, 0);

        // Calculate contract value (monthly rate * months active)
        const startDate = contract.contractStartDate || contract.validFrom;
        const endDate = contract.contractEndDate || contract.validUntil || new Date();
        const monthsActive = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        const contractValue = (contract.monthlyRate || 0) * monthsActive;

        res.json({
            contract: {
                id: contract.id,
                customerName: contract.companyProfile?.name,
                contactPerson: contract.companyProfile?.contactPerson,
                contactPhone: contract.companyProfile?.contactPhone,
                monthlyRate: contract.monthlyRate,
                status: contract.status,
                startDate: startDate,
                endDate: contract.contractEndDate || contract.validUntil,
                totalPaid: contract.totalPaid,
                balance: contract.balanceRemaining
            },
            summary: {
                contractValue,
                monthsActive,
                totalShipmentsReleased,
                totalBoxesReleased,
                totalCBMReleased: parseFloat(totalCBMReleased.toFixed(3)),
                totalInvoiced,
                totalPaid,
                totalOutstanding
            },
            releasedShipments,
            invoices,
            transactions: contract.transactions || [],
            history: history || []
        });

    } catch (error: any) {
        console.error('Contract statement error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
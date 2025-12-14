"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAllNotificationJobs = exports.startJobCompletionApprovalReminderJob = exports.startLowStockAlertJob = exports.startStorageAlertJob = exports.startContractExpiryJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const emailService_1 = require("../services/emailService");
const prisma = new client_1.PrismaClient();
const parseEmailList = (value) => {
    if (!value)
        return [];
    return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
};
// ============================================
// CONTRACT EXPIRY CHECK CRON JOB
// Runs daily at 9:00 AM to check for expiring/expired contracts
// ============================================
const startContractExpiryJob = () => {
    // Run every day at 9:00 AM
    node_cron_1.default.schedule('0 9 * * *', async () => {
        console.log('🔔 Running contract expiry check...');
        await checkContractExpiry();
    });
    console.log('📅 Contract expiry cron job scheduled (daily at 9:00 AM)');
};
exports.startContractExpiryJob = startContractExpiryJob;
const checkContractExpiry = async () => {
    try {
        // Get all companies
        const companies = await prisma.company.findMany({
            where: { isActive: true },
            select: { id: true, name: true, currency: true },
        });
        for (const company of companies) {
            // Get notification settings for contract expiry
            const expiringSettings = await prisma.notificationSettings.findFirst({
                where: {
                    companyId: company.id,
                    notificationType: 'CONTRACT_EXPIRING',
                    isEnabled: true,
                },
            });
            const expiredSettings = await prisma.notificationSettings.findFirst({
                where: {
                    companyId: company.id,
                    notificationType: 'CONTRACT_EXPIRED',
                    isEnabled: true,
                },
            });
            const alertDays = expiringSettings?.alertDaysBefore || 30;
            const today = new Date();
            const alertDate = new Date();
            alertDate.setDate(today.getDate() + alertDays);
            // Find contracts expiring within alert window
            if (expiringSettings?.isEnabled) {
                const expiringContracts = await prisma.customerPrepaidBalance.findMany({
                    where: {
                        companyId: company.id,
                        status: 'ACTIVE',
                        contractEndDate: {
                            gte: today,
                            lte: alertDate,
                        },
                    },
                    include: {
                        companyProfile: {
                            select: { name: true },
                        },
                    },
                });
                for (const contract of expiringContracts) {
                    const daysRemaining = Math.ceil((contract.contractEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    await (0, emailService_1.sendNotification)(company.id, 'CONTRACT_EXPIRING', {
                        customerName: contract.companyProfile.name,
                        contractEndDate: contract.contractEndDate.toLocaleDateString(),
                        daysRemaining,
                        monthlyRate: contract.monthlyRate,
                        currency: company.currency,
                        companyName: company.name,
                    });
                    console.log(`📧 Sent expiring contract alert for ${contract.companyProfile.name}`);
                }
            }
            // Find expired contracts
            if (expiredSettings?.isEnabled) {
                const expiredContracts = await prisma.customerPrepaidBalance.findMany({
                    where: {
                        companyId: company.id,
                        status: 'ACTIVE', // Still marked as active but expired
                        contractEndDate: {
                            lt: today,
                        },
                    },
                    include: {
                        companyProfile: {
                            select: { name: true },
                        },
                    },
                });
                for (const contract of expiredContracts) {
                    await (0, emailService_1.sendNotification)(company.id, 'CONTRACT_EXPIRED', {
                        customerName: contract.companyProfile.name,
                        contractEndDate: contract.contractEndDate.toLocaleDateString(),
                        monthlyRate: contract.monthlyRate,
                        currency: company.currency,
                        companyName: company.name,
                    });
                    // Optionally update contract status to EXPIRED
                    await prisma.customerPrepaidBalance.update({
                        where: { id: contract.id },
                        data: { status: 'EXPIRED' },
                    });
                    console.log(`📧 Sent expired contract alert for ${contract.companyProfile.name}`);
                }
            }
        }
        console.log('✅ Contract expiry check completed');
    }
    catch (error) {
        console.error('❌ Contract expiry check failed:', error);
    }
};
// ============================================
// STORAGE ALERT CRON JOB
// Runs daily to check for shipments stored too long
// ============================================
const startStorageAlertJob = () => {
    // Run every day at 10:00 AM
    node_cron_1.default.schedule('0 10 * * *', async () => {
        console.log('🔔 Running storage duration check...');
        await checkStorageDuration();
    });
    console.log('📦 Storage alert cron job scheduled (daily at 10:00 AM)');
};
exports.startStorageAlertJob = startStorageAlertJob;
const checkStorageDuration = async () => {
    try {
        const companies = await prisma.company.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
        });
        for (const company of companies) {
            // Get notification settings
            const settings = await prisma.notificationSettings.findFirst({
                where: {
                    companyId: company.id,
                    notificationType: 'STORAGE_ALERT',
                    isEnabled: true,
                },
            });
            if (!settings?.isEnabled)
                continue;
            // Get shipment settings for alert threshold
            const shipmentSettings = await prisma.shipmentSettings.findUnique({
                where: { companyId: company.id },
                select: { storageAlertDays: true },
            });
            const alertThreshold = shipmentSettings?.storageAlertDays || 30;
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - alertThreshold);
            // Find shipments stored beyond threshold
            const oldShipments = await prisma.shipment.findMany({
                where: {
                    companyId: company.id,
                    status: 'STORED',
                    arrivalDate: {
                        lt: thresholdDate,
                    },
                    deletedAt: null,
                },
                select: {
                    id: true,
                    referenceId: true,
                    clientName: true,
                    arrivalDate: true,
                },
            });
            for (const shipment of oldShipments) {
                const daysStored = Math.ceil((new Date().getTime() - shipment.arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
                await (0, emailService_1.sendNotification)(company.id, 'STORAGE_ALERT', {
                    shipmentCode: shipment.referenceId,
                    clientName: shipment.clientName,
                    daysStored,
                    alertThreshold,
                    companyName: company.name,
                });
                console.log(`📧 Sent storage alert for ${shipment.referenceId}`);
            }
        }
        console.log('✅ Storage duration check completed');
    }
    catch (error) {
        console.error('❌ Storage duration check failed:', error);
    }
};
// ============================================
// LOW STOCK ALERT CRON JOB
// Runs every 4 hours to check material stock levels
// ============================================
const startLowStockAlertJob = () => {
    // Run every 4 hours
    node_cron_1.default.schedule('0 */4 * * *', async () => {
        console.log('🔔 Running low stock check...');
        await checkLowStock();
    });
    console.log('📦 Low stock alert cron job scheduled (every 4 hours)');
};
exports.startLowStockAlertJob = startLowStockAlertJob;
// ============================================
// JOB COMPLETION APPROVAL REMINDER CRON JOB
// Runs daily to remind pending approvals
// ============================================
const startJobCompletionApprovalReminderJob = () => {
    // Run every day at 11:30 AM
    node_cron_1.default.schedule('30 11 * * *', async () => {
        console.log('🔔 Running job completion approval reminders...');
        await sendJobCompletionApprovalReminders();
    });
    console.log('🛡️ Job completion approval reminder cron scheduled (daily at 11:30 AM)');
};
exports.startJobCompletionApprovalReminderJob = startJobCompletionApprovalReminderJob;
const sendJobCompletionApprovalReminders = async () => {
    const baseUrl = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
        console.warn('[notificationJobs] APP_PUBLIC_URL/FRONTEND_URL is not set; skipping job completion approval reminders');
        return;
    }
    try {
        const reminderDays = Math.max(1, parseInt(process.env.JOB_COMPLETION_APPROVAL_REMINDER_DAYS || '2', 10));
        const maxReminders = Math.max(1, parseInt(process.env.JOB_COMPLETION_APPROVAL_MAX_REMINDERS || '5', 10));
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - reminderDays);
        const companies = await prisma.company.findMany({
            where: { isActive: true },
            select: { id: true, name: true, currency: true },
        });
        for (const company of companies) {
            const pending = await prisma.materialApproval.findMany({
                where: {
                    companyId: company.id,
                    approvalType: 'JOB_COMPLETION_REPORT',
                    status: 'PENDING',
                    requestedAt: { lte: cutoff },
                    OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cutoff } }],
                    reminderCount: { lt: maxReminders },
                },
                include: {
                    job: { select: { id: true, jobCode: true, clientName: true } },
                },
                orderBy: { requestedAt: 'asc' },
                take: 200,
            });
            if (pending.length === 0)
                continue;
            for (const approval of pending) {
                const approvalUrl = `${baseUrl}/approvals?approvalId=${encodeURIComponent(approval.id)}`;
                const notifyEmails = parseEmailList(approval.notifyEmails);
                // Prefer the original recipients stored on the approval; fallback to notification settings recipients
                if (notifyEmails.length > 0) {
                    const template = emailService_1.emailTemplates.jobCompletionApprovalReminder({
                        jobCode: approval.job?.jobCode || 'Unknown',
                        customerName: approval.job?.clientName || 'Unknown',
                        completedAt: approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : new Date().toLocaleString(),
                        companyName: company.name,
                        approvalUrl,
                    });
                    await (0, emailService_1.sendEmail)(company.id, {
                        to: notifyEmails,
                        subject: template.subject,
                        html: template.html,
                    });
                }
                else {
                    await (0, emailService_1.sendNotification)(company.id, 'JOB_COMPLETION_APPROVAL_REMINDER', {
                        jobCode: approval.job?.jobCode || 'Unknown',
                        customerName: approval.job?.clientName || 'Unknown',
                        completedAt: approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : new Date().toLocaleString(),
                        companyName: company.name,
                        approvalUrl,
                    });
                }
                await prisma.materialApproval.update({
                    where: { id: approval.id },
                    data: {
                        reminderCount: { increment: 1 },
                        lastReminderAt: now,
                    },
                });
                console.log(`📧 Sent approval reminder for ${approval.job?.jobCode || approval.id} (${company.name})`);
            }
        }
    }
    catch (error) {
        console.error('❌ Job completion approval reminder job failed:', error);
    }
};
const checkLowStock = async () => {
    try {
        const companies = await prisma.company.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
        });
        for (const company of companies) {
            // Get notification settings
            const settings = await prisma.notificationSettings.findFirst({
                where: {
                    companyId: company.id,
                    notificationType: 'LOW_STOCK_ALERT',
                    isEnabled: true,
                },
            });
            if (!settings?.isEnabled)
                continue;
            // Find materials below minimum stock
            const lowStockMaterials = await prisma.packingMaterial.findMany({
                where: {
                    companyId: company.id,
                    isActive: true,
                    totalQuantity: {
                        lt: prisma.packingMaterial.fields.minStockLevel,
                    },
                },
                select: {
                    id: true,
                    name: true,
                    totalQuantity: true,
                    minStockLevel: true,
                    unit: true,
                },
            });
            // Alternative query since Prisma doesn't support field comparison directly
            const allMaterials = await prisma.packingMaterial.findMany({
                where: {
                    companyId: company.id,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    totalQuantity: true,
                    minStockLevel: true,
                    unit: true,
                },
            });
            const actualLowStock = allMaterials.filter(m => m.totalQuantity < m.minStockLevel);
            for (const material of actualLowStock) {
                await (0, emailService_1.sendNotification)(company.id, 'LOW_STOCK_ALERT', {
                    materialName: material.name,
                    currentStock: material.totalQuantity,
                    minStock: material.minStockLevel,
                    unit: material.unit,
                    companyName: company.name,
                });
                console.log(`📧 Sent low stock alert for ${material.name}`);
            }
        }
        console.log('✅ Low stock check completed');
    }
    catch (error) {
        console.error('❌ Low stock check failed:', error);
    }
};
// ============================================
// START ALL NOTIFICATION JOBS
// ============================================
const startAllNotificationJobs = () => {
    console.log('🚀 Starting notification cron jobs...');
    (0, exports.startContractExpiryJob)();
    (0, exports.startStorageAlertJob)();
    (0, exports.startLowStockAlertJob)();
    (0, exports.startJobCompletionApprovalReminderJob)();
    console.log('✅ All notification cron jobs started');
};
exports.startAllNotificationJobs = startAllNotificationJobs;
exports.default = {
    startAllNotificationJobs: exports.startAllNotificationJobs,
    startContractExpiryJob: exports.startContractExpiryJob,
    startStorageAlertJob: exports.startStorageAlertJob,
    startLowStockAlertJob: exports.startLowStockAlertJob,
    startJobCompletionApprovalReminderJob: exports.startJobCompletionApprovalReminderJob,
};

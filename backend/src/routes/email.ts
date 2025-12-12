import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authMiddleware, AuthRequest } from '../middleware/auth';
import {
  sendEmail,
  sendNotification,
  testEmailConfig,
  emailTemplates,
  NotificationType
} from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// EMAIL SETTINGS ROUTES
// ============================================

// Get email settings for company
router.get('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let settings = await prisma.emailSettings.findUnique({
      where: { companyId },
    });

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.emailSettings.create({
        data: {
          companyId,
          provider: 'gmail',
          isEnabled: false,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpSecure: false,
        },
      });
    }

    // Don't send password in response (security)
    const { smtpPassword, ...safeSettings } = settings;
    res.json({
      ...safeSettings,
      smtpPassword: smtpPassword ? '********' : ''
    });
  } catch (error: any) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update email settings
router.put('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      provider,
      isEnabled,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      senderName,
      senderEmail,
      dailyLimit,
    } = req.body;

    // Prepare update data
    const updateData: any = {
      provider,
      isEnabled,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      senderName,
      senderEmail,
    };

    // Only update password if provided and not masked
    if (smtpPassword && smtpPassword !== '********') {
      updateData.smtpPassword = smtpPassword;
    }

    if (dailyLimit !== undefined) {
      updateData.dailyLimit = dailyLimit;
    }

    const settings = await prisma.emailSettings.upsert({
      where: { companyId },
      update: updateData,
      create: {
        companyId,
        ...updateData,
        smtpPassword: smtpPassword || '',
      },
    });

    const { smtpPassword: _, ...safeSettings } = settings;
    res.json({
      success: true,
      settings: { ...safeSettings, smtpPassword: '********' }
    });
  } catch (error: any) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test email configuration
router.post('/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { testEmail, config } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    // If config provided, use it; otherwise fetch from DB
    let emailConfig;
    if (config) {
      emailConfig = config;
    } else {
      emailConfig = await prisma.emailSettings.findUnique({
        where: { companyId },
      });
      if (!emailConfig) {
        return res.status(400).json({ error: 'Email not configured' });
      }
    }

    const result = await testEmailConfig(emailConfig, testEmail);

    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully!' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Error testing email:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// NOTIFICATION SETTINGS ROUTES
// ============================================

// Get all notification settings for company
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get existing settings
    const settings = await prisma.notificationSettings.findMany({
      where: { companyId },
      include: {
        recipients: true,
      },
    });

    // Define all notification types with defaults
    const notificationTypes: { type: NotificationType; label: string; description: string; category: string }[] = [
      // Shipment Events
      { type: 'SHIPMENT_CREATED', label: 'New Shipment Intake', description: 'When a new shipment is received/created', category: 'Shipments' },
      { type: 'SHIPMENT_RELEASED', label: 'Shipment Released', description: 'When a shipment is fully or partially released', category: 'Shipments' },
      { type: 'SHIPMENT_PARTIAL_RELEASE', label: 'Partial Release', description: 'When some boxes from shipment are released', category: 'Shipments' },
      { type: 'STORAGE_ALERT', label: 'Storage Duration Alert', description: 'When items are stored beyond threshold', category: 'Shipments' },

      // Contract Events
      { type: 'CONTRACT_NEW', label: 'New Contract', description: 'When a new customer contract is created', category: 'Contracts' },
      { type: 'CONTRACT_EXPIRING', label: 'Contract Expiring Soon', description: 'Before a customer contract expires (configurable days)', category: 'Contracts' },
      { type: 'CONTRACT_EXPIRED', label: 'Contract Expired', description: 'When a customer contract has expired', category: 'Contracts' },
      { type: 'CONTRACT_RENEWED', label: 'Contract Renewed', description: 'When a contract is renewed', category: 'Contracts' },

      // Moving Job Events
      { type: 'MOVING_JOB_CREATED', label: 'Moving Job Created', description: 'When a new moving job is created', category: 'Moving Jobs' },
      { type: 'MOVING_JOB_ASSIGNED', label: 'Job Assigned to Driver', description: 'When a driver is assigned to a job', category: 'Moving Jobs' },
      { type: 'MOVING_JOB_STARTED', label: 'Job Started', description: 'When a moving job starts', category: 'Moving Jobs' },
      { type: 'MOVING_JOB_COMPLETED', label: 'Job Completed', description: 'When a moving job is completed', category: 'Moving Jobs' },
      { type: 'JOB_COMPLETION_APPROVAL_REQUEST', label: 'Job Completion Approval (Request)', description: 'When a job completion report needs manager approval', category: 'Moving Jobs' },
      { type: 'JOB_COMPLETION_APPROVAL_REMINDER', label: 'Job Completion Approval (Reminder)', description: 'Reminder email when a job completion report is still pending approval', category: 'Moving Jobs' },
      { type: 'JOB_COMPLETION_REJECTED', label: 'Job Completion Rejected', description: 'When a job completion report is rejected by manager', category: 'Moving Jobs' },

      // Billing & Payments
      { type: 'INVOICE_CREATED', label: 'Invoice Created', description: 'When a new invoice is generated', category: 'Billing' },
      { type: 'INVOICE_OVERDUE', label: 'Invoice Overdue', description: 'When an invoice becomes overdue', category: 'Billing' },
      { type: 'PAYMENT_RECEIVED', label: 'Payment Received', description: 'When a payment is recorded', category: 'Billing' },
      { type: 'PAYMENT_REMINDER', label: 'Payment Reminder', description: 'Reminder for pending payments', category: 'Billing' },

      // Materials & Inventory
      { type: 'LOW_STOCK_ALERT', label: 'Low Stock Alert', description: 'When material stock falls below minimum', category: 'Materials' },
      { type: 'MATERIAL_ISSUED', label: 'Material Issued', description: 'When materials are issued to a job', category: 'Materials' },
      { type: 'MATERIAL_RETURNED', label: 'Material Returned', description: 'When materials are returned from a job', category: 'Materials' },
      { type: 'MATERIAL_DAMAGED', label: 'Material Damaged Report', description: 'When materials are reported as damaged', category: 'Materials' },
      { type: 'PURCHASE_ORDER_CREATED', label: 'Purchase Order Created', description: 'When a new PO is created', category: 'Materials' },

      // Daily Reports
      { type: 'DAILY_SUMMARY', label: 'Daily Summary Report', description: 'Daily summary of all activities', category: 'Reports' },
      { type: 'WEEKLY_REPORT', label: 'Weekly Report', description: 'Weekly summary report', category: 'Reports' },
    ];

    // Merge with existing settings
    const mergedSettings = notificationTypes.map(nt => {
      const existing = settings.find(s => s.notificationType === nt.type);
      return {
        ...nt,
        id: existing?.id || null,
        isEnabled: existing?.isEnabled ?? false,
        notifyAdmins: existing?.notifyAdmins ?? true,
        notifyManagers: existing?.notifyManagers ?? false,
        customEmails: existing?.customEmails || '',
        alertDaysBefore: existing?.alertDaysBefore || (nt.type === 'CONTRACT_EXPIRING' ? 30 : null),
        recipients: existing?.recipients || [],
      };
    });

    res.json(mergedSettings);
  } catch (error: any) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update notification setting
router.put('/notifications/:type', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type } = req.params;
    const {
      isEnabled,
      notifyAdmins,
      notifyManagers,
      customEmails,
      alertDaysBefore,
      recipients,
    } = req.body;

    // Upsert notification settings
    const settings = await prisma.notificationSettings.upsert({
      where: {
        companyId_notificationType: {
          companyId,
          notificationType: type,
        },
      },
      update: {
        isEnabled,
        notifyAdmins,
        notifyManagers,
        customEmails,
        alertDaysBefore,
      },
      create: {
        companyId,
        notificationType: type,
        isEnabled,
        notifyAdmins,
        notifyManagers,
        customEmails,
        alertDaysBefore,
      },
    });

    // Update recipients if provided
    if (recipients && Array.isArray(recipients)) {
      // Delete existing recipients
      await prisma.notificationRecipient.deleteMany({
        where: { notificationSettingsId: settings.id },
      });

      // Create new recipients
      if (recipients.length > 0) {
        await prisma.notificationRecipient.createMany({
          data: recipients.map((r: any) => ({
            notificationSettingsId: settings.id,
            userId: r.userId || null,
            email: r.email,
            name: r.name || null,
          })),
        });
      }
    }

    // Fetch updated settings with recipients
    const updatedSettings = await prisma.notificationSettings.findUnique({
      where: { id: settings.id },
      include: { recipients: true },
    });

    res.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEND NOTIFICATION ROUTES
// ============================================

// Send custom notification
router.post('/send', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { to, subject, message, type } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, message' });
    }

    // Get company name for template
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    const template = emailTemplates.custom({
      title: subject,
      message,
      companyName: company?.name || 'WMS',
    });

    const result = await sendEmail(companyId, {
      to: Array.isArray(to) ? to : [to],
      subject: template.subject,
      html: template.html,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EMAIL LOGS ROUTES
// ============================================

// Get email logs
router.get('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { companyId };
    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.emailLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, sent, failed, todayCount] = await Promise.all([
      prisma.emailLog.count({ where: { companyId } }),
      prisma.emailLog.count({ where: { companyId, status: 'SENT' } }),
      prisma.emailLog.count({ where: { companyId, status: 'FAILED' } }),
      prisma.emailLog.count({
        where: {
          companyId,
          sentAt: { gte: today }
        }
      }),
    ]);

    // Get email settings for daily limit
    const settings = await prisma.emailSettings.findUnique({
      where: { companyId },
      select: { dailyLimit: true, isEnabled: true },
    });

    res.json({
      total,
      sent,
      failed,
      todayCount,
      dailyLimit: settings?.dailyLimit || 500,
      isEnabled: settings?.isEnabled || false,
      remainingToday: (settings?.dailyLimit || 500) - todayCount,
    });
  } catch (error: any) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

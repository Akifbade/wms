import nodemailer from 'nodemailer';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email options interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

// Notification types
export type NotificationType =
  // Shipment Events
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_RELEASED'
  | 'SHIPMENT_PARTIAL_RELEASE'
  | 'STORAGE_ALERT'
  // Contract Events
  | 'CONTRACT_NEW'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_EXPIRED'
  | 'CONTRACT_RENEWED'
  // Moving Job Events
  | 'MOVING_JOB_CREATED'
  | 'MOVING_JOB_ASSIGNED'
  | 'MOVING_JOB_STARTED'
  | 'MOVING_JOB_COMPLETED'
  | 'JOB_COMPLETION_APPROVAL_REQUEST'
  | 'JOB_COMPLETION_APPROVAL_REMINDER'
  | 'JOB_COMPLETION_REJECTED'
  // Billing & Payments
  | 'INVOICE_CREATED'
  | 'INVOICE_OVERDUE'
  | 'INVOICE_PAID'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REMINDER'
  // Materials & Inventory
  | 'LOW_STOCK_ALERT'
  | 'MATERIAL_ISSUED'
  | 'MATERIAL_RETURNED'
  | 'MATERIAL_DAMAGED'
  | 'PURCHASE_ORDER_CREATED'
  // Reports
  | 'DAILY_SUMMARY'
  | 'WEEKLY_REPORT'
  | 'CUSTOM';

// Create transporter based on company email settings
const createTransporter = (config: EmailConfig) => {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
  });
};

// Gmail specific transporter (most common for free email)
export const createGmailTransporter = (email: string, appPassword: string) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: appPassword, // Use App Password, not regular password
    },
  });
};

// Get company email settings from database
export const getCompanyEmailSettings = async (companyId: string) => {
  const settings = await prisma.emailSettings.findUnique({
    where: { companyId },
  });
  return settings;
};

// Send email function
export const sendEmail = async (
  companyId: string,
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Get company email settings
    const settings = await getCompanyEmailSettings(companyId);

    if (!settings || !settings.isEnabled) {
      console.log(`Email not enabled for company ${companyId}`);
      return { success: false, error: 'Email not configured or disabled' };
    }

    // Create transporter based on settings
    let transporter;

    if (settings.provider === 'gmail') {
      transporter = createGmailTransporter(settings.smtpUser, settings.smtpPassword);
    } else {
      transporter = createTransporter({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword,
        },
      });
    }

    // Prepare email
    const mailOptions = {
      from: `"${settings.senderName}" <${settings.senderEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      attachments: options.attachments,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log email sent
    await logEmailSent(companyId, options.to, options.subject, 'SENT', info.messageId);

    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error: any) {
    console.error('Email sending failed:', error);

    // Log failed email
    await logEmailSent(companyId, options.to, options.subject, 'FAILED', undefined, error.message);

    return { success: false, error: error.message };
  }
};

// Log email activity
const logEmailSent = async (
  companyId: string,
  recipients: string | string[],
  subject: string,
  status: 'SENT' | 'FAILED',
  messageId?: string,
  error?: string
) => {
  try {
    await prisma.emailLog.create({
      data: {
        companyId,
        recipients: Array.isArray(recipients) ? recipients.join(', ') : recipients,
        subject,
        status,
        messageId,
        error,
        sentAt: new Date(),
      },
    });
  } catch (e) {
    console.error('Failed to log email:', e);
  }
};

// Get notification recipients based on type and settings
export const getNotificationRecipients = async (
  companyId: string,
  notificationType: NotificationType
): Promise<string[]> => {
  try {
    const settings = await prisma.notificationSettings.findFirst({
      where: {
        companyId,
        notificationType,
        isEnabled: true,
      },
      include: {
        recipients: true,
      },
    });

    if (!settings) {
      console.log(`📧 No notification settings found for ${notificationType}`);
      return [];
    }

    const emails: string[] = [];

    // Add specific recipients from recipients table
    if (settings.recipients) {
      settings.recipients.forEach((r: any) => {
        if (r.email) emails.push(r.email);
      });
    }

    // Add custom emails from settings (comma-separated manual emails)
    if (settings.customEmails) {
      const customEmailList = settings.customEmails.split(',').map(e => e.trim()).filter(Boolean);
      customEmailList.forEach(email => {
        if (email && !emails.includes(email)) {
          emails.push(email);
        }
      });
      console.log(`📧 Added custom emails for ${notificationType}: ${customEmailList.join(', ')}`);
    }

    // Add admin users if setting says so
    if (settings.notifyAdmins) {
      const admins = await prisma.user.findMany({
        where: {
          companyId,
          role: 'ADMIN',
          isActive: true,
        },
        select: { email: true },
      });
      admins.forEach(a => {
        if (!emails.includes(a.email)) emails.push(a.email);
      });
    }

    // Add managers if setting says so
    if (settings.notifyManagers) {
      const managers = await prisma.user.findMany({
        where: {
          companyId,
          role: 'MANAGER',
          isActive: true,
        },
        select: { email: true },
      });
      managers.forEach(m => {
        if (!emails.includes(m.email)) emails.push(m.email);
      });
    }

    console.log(`📧 Final recipients for ${notificationType}: ${emails.join(', ')}`);
    return [...new Set(emails)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting notification recipients:', error);
    return [];
  }
};

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export const emailTemplates = {
  // Professional Shipment Released Notification
  shipmentReleased: (data: {
    shipmentCode: string;
    clientName: string;
    clientPhone?: string;
    releasedBoxes: number;
    totalBoxes: number;
    remainingBoxes?: number;
    releaseType: 'FULL' | 'PARTIAL';
    releasedBy: string;      // Admin/Manager who processed release
    receivedBy?: string;     // Collector/Customer who picked up
    driverName?: string;     // Optional driver
    reason?: string;         // Reason for release
    releasedAt: string;
    companyName: string;
    // Additional professional details
    cbm?: number;
    weight?: number;
    rackLocation?: string;
    receivedDate?: string;
    daysStored?: number;
    collectorID?: string;
    totalCharges?: number;
    currency?: string;
    photos?: string[];
    description?: string;
    warehouseName?: string;
  }) => {
    const releaseStatus = data.releaseType === 'FULL' ? '🎉 FULL RELEASE' : '📦 PARTIAL RELEASE';
    const statusColor = data.releaseType === 'FULL' ? '#10b981' : '#f59e0b';
    const currency = data.currency || 'KWD';

    // Build photos section if available - using table layout for email compatibility
    let photosHtml = '';
    if (data.photos && data.photos.length > 0) {
      photosHtml = `
        <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
          📷 Release Photos
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 15px 0;">
              ${data.photos.map((url, i) => `
                <a href="${url}" target="_blank" style="display: inline-block; margin: 4px;">
                  <img src="${url}" alt="Photo ${i + 1}" width="100" height="100" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;" />
                </a>
              `).join('')}
            </td>
          </tr>
        </table>
      `;
    }

    return {
      subject: `📦 Shipment Released - ${data.shipmentCode} | ${data.clientName}`,
      html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #f8fafc;">
        <!-- Header with Company Branding -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0 0 5px 0; font-size: 24px;">📦 Shipment Release Report</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">${data.companyName} Warehouse Management</p>
        </div>
        
        <!-- Status Banner -->
        <div style="background: ${statusColor}; color: white; padding: 12px 30px; text-align: center;">
          <strong style="font-size: 16px;">${releaseStatus}</strong>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          
          <!-- Shipment Summary Card -->
          <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%;">
              <tr>
                <td style="vertical-align: top;">
                  <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Shipment Code</span>
                  <h2 style="margin: 5px 0 0 0; color: #1e40af; font-size: 22px;">${data.shipmentCode}</h2>
                </td>
                <td style="text-align: right; vertical-align: top;">
                  <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Released</span>
                  <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: ${statusColor};">${data.releasedBoxes} / ${data.totalBoxes} boxes</p>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Release Information -->
          <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
            🔓 Release Information
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Released By (Staff):</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: bold;">${data.releasedBy}</td>
            </tr>
            ${data.receivedBy ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Received By (Collector):</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.receivedBy}</td>
            </tr>
            ` : ''}
            ${data.driverName ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">🚗 Driver:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.driverName}</td>
            </tr>
            ` : ''}
            ${data.reason ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Reason:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.reason}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Release Date:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.releasedAt}</td>
            </tr>
          </table>
          
          <!-- Client Information -->
          <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
            👤 Client Information
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Client Name:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.clientName}</td>
            </tr>
            ${data.clientPhone ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Phone:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.clientPhone}</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Shipment Details -->
          <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
            📋 Shipment Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.description ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Description:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.description}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Release Type:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${data.releaseType}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Boxes Released:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: bold;">${data.releasedBoxes} of ${data.totalBoxes}</td>
            </tr>
            ${data.remainingBoxes !== undefined && data.remainingBoxes > 0 ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Remaining in Storage:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #f59e0b; font-weight: bold;">${data.remainingBoxes} boxes</td>
            </tr>
            ` : ''}
            ${data.cbm ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">CBM (Volume):</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.cbm.toFixed(3)} m³</td>
            </tr>
            ` : ''}
            ${data.weight ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Weight:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.weight.toFixed(2)} kg</td>
            </tr>
            ` : ''}
            ${data.rackLocation ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Rack Location:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">📍 ${data.rackLocation}</td>
            </tr>
            ` : ''}
            ${data.warehouseName ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Warehouse:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">🏭 ${data.warehouseName}</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Storage Duration -->
          <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
            📅 Storage Period
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.receivedDate ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Received Date:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.receivedDate}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Release Date:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.releasedAt}</td>
            </tr>
            ${data.daysStored ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Days in Storage:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: bold;">${data.daysStored} days</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Charges Summary -->
          ${data.totalCharges !== undefined ? `
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #10b981; border-radius: 10px; padding: 20px; margin-top: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="color: #065f46; font-size: 14px;">💰 Total Charges</span>
              </div>
              <div>
                <span style="font-size: 24px; font-weight: bold; color: #047857;">${currency} ${data.totalCharges.toFixed(3)}</span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <!-- Release Details -->
          <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
            👥 Release Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Released By:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: bold;">${data.releasedBy || 'N/A'}</td>
            </tr>
            ${data.receivedBy ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Received By:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.receivedBy}</td>
            </tr>
            ` : ''}
            ${data.driverName ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Driver:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.driverName}</td>
            </tr>
            ` : ''}
            ${data.reason ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Reason:</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.reason}</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Release Photos -->
          ${photosHtml}
          
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; color: #94a3b8; padding: 20px 30px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="margin: 0 0 5px 0; font-size: 12px;">This is an automated notification from ${data.companyName} Warehouse Management System</p>
          <p style="margin: 0; font-size: 11px; color: #64748b;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `,
    };
  },

  // Contract Expiring Soon
  contractExpiring: (data: {
    customerName: string;
    contractEndDate: string;
    daysRemaining: number;
    monthlyRate: number;
    currency: string;
    companyName: string;
  }) => ({
    subject: `⚠️ Contract Expiring Soon - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">⚠️ Contract Expiring Soon</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <strong>⏰ ${data.daysRemaining} days remaining</strong>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Contract End Date:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.contractEndDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Monthly Rate:</strong></td>
              <td style="padding: 10px 0;">${data.currency} ${data.monthlyRate}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Please contact the customer to discuss contract renewal.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),

  // Contract Expired
  contractExpired: (data: {
    customerName: string;
    contractEndDate: string;
    monthlyRate: number;
    currency: string;
    companyName: string;
  }) => ({
    subject: `🚨 Contract Expired - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🚨 Contract Expired</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <strong>❌ Contract has expired</strong>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Expired On:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.contractEndDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Monthly Rate:</strong></td>
              <td style="padding: 10px 0;">${data.currency} ${data.monthlyRate}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; color: #dc2626;"><strong>Action Required:</strong> Please contact the customer immediately to renew the contract or discuss next steps.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),

  // Invoice Created
  invoiceCreated: (data: {
    invoiceNumber: string;
    clientName: string;
    amount: number;
    currency: string;
    dueDate: string;
    companyName: string;
  }) => ({
    subject: `🧾 New Invoice Created - ${data.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🧾 Invoice Created</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Invoice Number:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Client:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 18px; color: #10b981;"><strong>${data.currency} ${data.amount}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Due Date:</strong></td>
              <td style="padding: 10px 0;">${data.dueDate}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),

  // Payment Received
  paymentReceived: (data: {
    invoiceNumber: string;
    clientName: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    companyName: string;
  }) => ({
    subject: `💰 Payment Received - ${data.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">💰 Payment Received</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
            <strong style="font-size: 24px; color: #059669;">${data.currency} ${data.amount}</strong>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Invoice:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Client:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Payment Method:</strong></td>
              <td style="padding: 10px 0;">${data.paymentMethod}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),

  // Low Stock Alert
  lowStockAlert: (data: {
    materialName: string;
    currentStock: number;
    minStock: number;
    unit: string;
    companyName: string;
  }) => ({
    subject: `⚠️ Low Stock Alert - ${data.materialName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">⚠️ Low Stock Alert</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <strong>${data.materialName}</strong> is running low on stock!
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Current Stock:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #dc2626;"><strong>${data.currentStock} ${data.unit}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Minimum Required:</strong></td>
              <td style="padding: 10px 0;">${data.minStock} ${data.unit}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Please restock this material as soon as possible.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),

  // Storage Alert (items stored too long)
  storageAlert: (data: {
    shipmentCode: string;
    clientName: string;
    daysStored: number;
    alertThreshold: number;
    companyName: string;
  }) => ({
    subject: `📦 Storage Alert - ${data.shipmentCode} (${data.daysStored} days)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📦 Storage Duration Alert</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #ede9fe; border: 1px solid #8b5cf6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <strong>Shipment has been in storage for ${data.daysStored} days</strong>
            <br><small>(Alert threshold: ${data.alertThreshold} days)</small>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Shipment:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.shipmentCode}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Client:</strong></td>
              <td style="padding: 10px 0;">${data.clientName}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Consider contacting the client about collection or continued storage.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),

  // ============================================
  // MOVING JOB TEMPLATES
  // ============================================

  // Moving Job Created
  movingJobCreated: (data: {
    jobCode: string;
    customerName: string;
    jobType: string;
    pickupAddress: string;
    deliveryAddress: string;
    scheduledDate: string;
    companyName: string;
    clientPhone?: string;
    clientEmail?: string;
    driverName?: string;
    vehicleNumber?: string;
    notes?: string;
  }) => ({
    subject: `🚚 New Moving Job Created - ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🚚 New Moving Job</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job Code:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.jobCode}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td></tr>
            ${data.clientPhone ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.clientPhone}</td></tr>` : ''}
            ${data.clientEmail ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.clientEmail}</td></tr>` : ''}
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job Type:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.jobType}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Pickup:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.pickupAddress}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Delivery:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.deliveryAddress}</td></tr>
            <tr><td style="padding: 10px 0;"><strong>Scheduled:</strong></td><td style="padding: 10px 0;">${data.scheduledDate}</td></tr>
          </table>
          ${data.driverName || data.vehicleNumber ? `
            <div style="margin-top: 16px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 12px;">
              <strong>Assignment</strong><br>
              <span>Driver: ${data.driverName || 'N/A'}</span><br>
              <span>Vehicle: ${data.vehicleNumber || 'N/A'}</span>
            </div>
          ` : ''}
          ${data.notes ? `<p style="margin-top: 14px;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // Moving Job Completed
  movingJobCompleted: (data: {
    jobCode: string;
    customerName: string;
    completedAt: string;
    totalAmount: number;
    currency: string;
    companyName: string;
    approvedBy?: string;
    approvalNotes?: string;
    materials?: Array<{ name: string; issued: number; used: number; returnedGood: number; damaged: number; unit: string; totalCost: number }>;
    totals?: { issued: number; used: number; returnedGood: number; damaged: number; totalCost: number };
  }) => ({
    subject: `✅ Moving Job Completed - ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">✅ Job Completed</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
            <strong style="color: #059669;">Job Successfully Completed!</strong>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job Code:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.jobCode}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Completed:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.completedAt}</td></tr>
            <tr><td style="padding: 10px 0;"><strong>Total Amount:</strong></td><td style="padding: 10px 0; font-size: 18px; color: #10b981;"><strong>${data.currency} ${data.totalAmount}</strong></td></tr>
          </table>

          ${data.approvedBy ? `
            <div style="margin-top: 16px; background: #ecfeff; border: 1px solid #06b6d4; border-radius: 8px; padding: 12px;">
              <strong>Approved By:</strong> ${data.approvedBy}
              ${data.approvalNotes ? `<br><small style=\"color:#0f766e\">Notes: ${data.approvalNotes}</small>` : ''}
            </div>
          ` : ''}

          ${Array.isArray(data.materials) && data.materials.length > 0 ? `
            <h3 style="margin: 18px 0 10px;">Materials Report</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Material</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Issued</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Used</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Returned</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Damaged</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${data.materials.map(m => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${m.name}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.issued} ${m.unit}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.used} ${m.unit}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.returnedGood} ${m.unit}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.damaged} ${m.unit}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${data.currency} ${Number(m.totalCost || 0).toFixed(3)}</td>
                  </tr>
                `).join('')}
              </tbody>
              ${data.totals ? `
                <tfoot>
                  <tr style="background: #f9fafb;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Totals</strong></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.issued}</strong></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.used}</strong></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.returnedGood}</strong></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.damaged}</strong></td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.currency} ${Number(data.totals.totalCost || 0).toFixed(3)}</strong></td>
                  </tr>
                </tfoot>
              ` : ''}
            </table>
          ` : ''}

          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // Job Completion Approval Request (internal verification)
  jobCompletionApprovalRequest: (data: {
    jobCode: string;
    customerName: string;
    completedAt: string;
    currency: string;
    companyName: string;
    approvalUrl: string;
    materials: Array<{ name: string; issued: number; used: number; returnedGood: number; damaged: number; unit: string; totalCost: number }>;
    totals: { issued: number; used: number; returnedGood: number; damaged: number; totalCost: number };
    physicalReports?: string[];
    isResubmission?: boolean;
    previousSnapshot?: { materials: any[]; totals: any; rejectedAt: string; rejectedBy: string; rejectionReason: string };
    resubmittedBy?: string;
  }) => {
    // Build changes comparison section if this is a resubmission
    let changesSection = '';
    if (data.isResubmission && data.previousSnapshot) {
      const prev = data.previousSnapshot;
      const prevMaterialsMap = new Map(prev.materials.map((m: any) => [m.name, m]));
      const currentMaterialsMap = new Map(data.materials.map(m => [m.name, m]));
      
      const changes: string[] = [];
      
      // Check for new materials (added after rejection)
      data.materials.forEach(m => {
        if (!prevMaterialsMap.has(m.name)) {
          changes.push(`<li style="color: #16a34a; margin: 4px 0;">➕ <strong>ADDED:</strong> ${m.name} - ${m.issued} ${m.unit}</li>`);
        }
      });
      
      // Check for removed materials
      prev.materials.forEach((m: any) => {
        if (!currentMaterialsMap.has(m.name)) {
          changes.push(`<li style="color: #dc2626; margin: 4px 0;">➖ <strong>REMOVED:</strong> ${m.name} - was ${m.issued} ${m.unit}</li>`);
        }
      });
      
      // Check for quantity changes
      data.materials.forEach(m => {
        const prevM = prevMaterialsMap.get(m.name);
        if (prevM) {
          if (m.issued !== prevM.issued) {
            const diff = m.issued - prevM.issued;
            const arrow = diff > 0 ? '📈' : '📉';
            changes.push(`<li style="color: #f59e0b; margin: 4px 0;">${arrow} <strong>CHANGED:</strong> ${m.name} issued: ${prevM.issued} → ${m.issued} ${m.unit} (${diff > 0 ? '+' : ''}${diff})</li>`);
          }
          if (m.returnedGood !== prevM.returnedGood) {
            changes.push(`<li style="color: #3b82f6; margin: 4px 0;">🔄 <strong>RETURN CHANGED:</strong> ${m.name} returned: ${prevM.returnedGood} → ${m.returnedGood} ${m.unit}</li>`);
          }
          if (m.damaged !== prevM.damaged) {
            changes.push(`<li style="color: #ef4444; margin: 4px 0;">⚠️ <strong>DAMAGE CHANGED:</strong> ${m.name} damaged: ${prevM.damaged} → ${m.damaged} ${m.unit}</li>`);
          }
        }
      });
      
      if (changes.length > 0) {
        changesSection = `
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">🔄 RESUBMISSION - Changes from Previous Rejection</h3>
            <div style="background: #fffbeb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
              <p style="margin: 0; font-size: 13px; color: #78350f;">
                <strong>Previously rejected by:</strong> ${prev.rejectedBy}<br/>
                <strong>Rejected at:</strong> ${prev.rejectedAt}<br/>
                <strong>Rejection reason:</strong> ${prev.rejectionReason}
              </p>
            </div>
            <p style="color: #92400e; margin: 0 0 8px 0; font-weight: bold;">Changes Made:</p>
            <ul style="margin: 0; padding-left: 20px; color: #78350f;">
              ${changes.join('')}
            </ul>
            ${data.resubmittedBy ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #78350f;">Resubmitted by: <strong>${data.resubmittedBy}</strong></p>` : ''}
          </div>
        `;
      } else {
        changesSection = `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #92400e;"><strong>🔄 RESUBMISSION</strong> - Previously rejected by ${prev.rejectedBy}. No material changes detected.</p>
          </div>
        `;
      }
    }

    return {
    subject: `${data.isResubmission ? '🔄 RESUBMITTED: ' : ''}🛡️ Approval Required - Job Completion Report (${data.jobCode})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${data.isResubmission ? '#f59e0b 0%, #d97706' : '#0f172a 0%, #334155'} 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">${data.isResubmission ? '🔄 RESUBMITTED: ' : '🛡️ '}Job Completion Approval</h1>
          <p style="margin: 8px 0 0; opacity: 0.95;">${data.isResubmission ? 'This job was previously rejected and has been resubmitted with changes.' : 'Verification required before the system updates returns/restock.'}</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job Code:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.jobCode}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Completed At:</strong></td><td style="padding: 8px 0;">${data.completedAt}</td></tr>
          </table>

          ${changesSection}

          <div style="background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <strong>Action required:</strong> Please approve this job completion report to keep the system up to date.
          </div>

          <div style="text-align: center; margin: 18px 0;">
            <a href="${data.approvalUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Approve / Review</a>
          </div>

          ${data.physicalReports && data.physicalReports.length > 0 ? `
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0;">📋 Physical Reports Attached</h3>
            <p style="color: #1e40af; margin: 0 0 12px 0; font-size: 14px;">Preview below (your email client may require enabling images).</p>

            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 10px 0 14px 0;">
              ${data.physicalReports
          .slice(0, 6)
          .map((url, idx) => {
            const isPdf = /\.pdf($|\?)/i.test(url);
            if (isPdf) {
              return `
                      <a href="${url}" target="_blank" style="display: inline-block; background: #ffffff; border: 1px solid #93c5fd; border-radius: 8px; padding: 10px 12px; color: #1e40af; text-decoration: none; font-weight: bold; font-size: 12px;">
                        📄 Open PDF #${idx + 1}
                      </a>
                    `;
            }

            // Use inline CID images so email previews work even if the URL isn't publicly reachable.
            const cid = `physical-report-${idx + 1}`;
            return `
                    <a href="${url}" target="_blank" style="display: inline-block; text-decoration: none;">
                      <img src="cid:${cid}" alt="Physical Report ${idx + 1}" style="width: 180px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid #3b82f6; background: #ffffff;" />
                    </a>
                  `;
          })
          .join('')}
            </div>

            <a href="${data.physicalReports[0]}" target="_blank" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              👁️ VIEW PHYSICAL REPORTS
            </a>
            ${data.physicalReports.length > 1 ? `<p style="margin: 8px 0 0; color: #1e40af; font-size: 12px;">${data.physicalReports.length} report(s)</p>` : ''}
          </div>
          ` : ''}

          <h3 style="margin: 18px 0 10px;">Materials Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Material</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Issued</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Used</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Returned</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Damaged</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${data.materials.map(m => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${m.name}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.issued} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.used} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.returnedGood} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.damaged} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${data.currency} ${Number(m.totalCost || 0).toFixed(3)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Totals</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.issued}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.used}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.returnedGood}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.damaged}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.currency} ${Number(data.totals.totalCost || 0).toFixed(3)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <p style="color: #6b7280; font-size: 12px; margin-top: 18px;">
            This is an automated verification request from ${data.companyName}.
          </p>
        </div>
      </div>
    `,
    };
  },

  // Reminder email for pending approval
  jobCompletionApprovalReminder: (data: {
    jobCode: string;
    customerName: string;
    completedAt: string;
    companyName: string;
    approvalUrl: string;
  }) => ({
    subject: `⏰ Reminder: Approval Pending - Job ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">⏰ Approval Reminder</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p><strong>Job:</strong> ${data.jobCode}</p>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Completed At:</strong> ${data.completedAt}</p>
          <p style="margin-top: 14px;">This is a reminder that the job completion report is still <strong>not approved</strong>. Please review and approve to keep the system up to date.</p>
          <div style="text-align: center; margin: 18px 0;">
            <a href="${data.approvalUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Approval</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 18px;">Automated reminder from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // Job Completion REJECTED
  jobCompletionRejected: (data: {
    jobCode: string;
    customerName: string;
    rejectedBy: string;
    rejectedAt: string;
    rejectionReason: string;
    companyName: string;
    materials: Array<{ name: string; issued: number; used: number; returnedGood: number; damaged: number; unit: string; totalCost: number }>;
    totals: { issued: number; used: number; returnedGood: number; damaged: number; totalCost: number };
  }) => ({
    subject: `❌ Job Completion Report Rejected - ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">❌ Job Completion Report Rejected</h1>
          <p style="margin: 8px 0 0; opacity: 0.95;">Your job report needs revision before approval.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <strong style="color: #991b1b;">⚠️ Action Required:</strong> Please review the rejection reason below and re-submit the job completion report.
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job Code:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.jobCode}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Rejected By:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${data.rejectedBy}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Rejected At:</strong></td><td style="padding: 8px 0;">${data.rejectedAt}</td></tr>
          </table>

          <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 8px; color: #92400e;">📝 Rejection Reason:</h4>
            <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${data.rejectionReason}</p>
          </div>

          <h3 style="margin: 18px 0 10px;">Materials Summary (For Reference)</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Material</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Issued</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Used</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Returned</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Damaged</th>
              </tr>
            </thead>
            <tbody>
              ${data.materials.map(m => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${m.name}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.issued} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.used} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.returnedGood} ${m.unit}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.damaged} ${m.unit}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f9fafb;">
                <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Totals</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.issued}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.used}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.returnedGood}</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;"><strong>${data.totals.damaged}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <h4 style="margin: 0 0 8px; color: #1e40af;">ℹ️ Next Steps:</h4>
            <ol style="margin: 5px 0; padding-left: 20px; color: #1e3a8a;">
              <li>Review the rejection reason carefully</li>
              <li>Make necessary corrections to the job report</li>
              <li>Re-submit the job for approval when ready</li>
            </ol>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 18px;">
            This is an automated notification from ${data.companyName}.
          </p>
        </div>
      </div>
    `,
  }),

  // ============================================
  // MATERIAL TEMPLATES
  // ============================================

  // Material Issued
  materialIssued: (data: {
    jobCode: string;
    materials: Array<{ name: string; quantity: number; unit: string }>;
    issuedBy: string;
    issuedAt: string;
    companyName: string;
  }) => ({
    subject: `📦 Materials Issued - Job ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📦 Materials Issued</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p><strong>Job:</strong> ${data.jobCode} | <strong>Issued By:</strong> ${data.issuedBy} | <strong>Date:</strong> ${data.issuedAt}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead><tr style="background: #f3f4f6;"><th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Material</th><th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Quantity</th></tr></thead>
            <tbody>${data.materials.map(m => `<tr><td style="padding: 10px; border: 1px solid #e5e7eb;">${m.name}</td><td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.quantity} ${m.unit}</td></tr>`).join('')}</tbody>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // Material Returned
  materialReturned: (data: {
    jobCode: string;
    materials: Array<{ name: string; quantity: number; unit: string; condition: string }>;
    returnedBy: string;
    returnedAt: string;
    companyName: string;
  }) => ({
    subject: `🔄 Materials Returned - Job ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🔄 Materials Returned</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p><strong>Job:</strong> ${data.jobCode} | <strong>Returned By:</strong> ${data.returnedBy} | <strong>Date:</strong> ${data.returnedAt}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead><tr style="background: #f3f4f6;"><th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Material</th><th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Qty</th><th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Condition</th></tr></thead>
            <tbody>${data.materials.map(m => `<tr><td style="padding: 10px; border: 1px solid #e5e7eb;">${m.name}</td><td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${m.quantity} ${m.unit}</td><td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${m.condition}</td></tr>`).join('')}</tbody>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // Material Damaged Report
  materialDamaged: (data: {
    jobCode: string;
    materials: Array<{ name: string; quantity: number; damageType: string; cost: number }>;
    reportedBy: string;
    reportedAt: string;
    totalDamageCost: number;
    currency: string;
    companyName: string;
  }) => ({
    subject: `⚠️ Material Damage Report - Job ${data.jobCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">⚠️ Material Damage Report</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <strong>Total Damage Cost: ${data.currency} ${data.totalDamageCost.toFixed(3)}</strong>
          </div>
          <p><strong>Job:</strong> ${data.jobCode} | <strong>Reported By:</strong> ${data.reportedBy} | <strong>Date:</strong> ${data.reportedAt}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead><tr style="background: #fef2f2;"><th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Material</th><th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Qty</th><th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Damage Type</th><th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Cost</th></tr></thead>
            <tbody>${data.materials.map(m => `<tr><td style="padding: 10px; border: 1px solid #e5e7eb;">${m.name}</td><td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${m.quantity}</td><td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${m.damageType}</td><td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${data.currency} ${m.cost.toFixed(3)}</td></tr>`).join('')}</tbody>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // ============================================
  // SHIPMENT INTAKE TEMPLATE
  // ============================================

  // Shipment Intake/Created
  shipmentIntake: (data: {
    shipmentCode: string;
    clientName: string;
    totalBoxes: number;
    totalWeight: number;
    receivedBy: string;
    receivedAt: string;
    rackLocation?: string;
    companyName: string;
  }) => ({
    subject: `📥 New Shipment Received - ${data.shipmentCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📥 New Shipment Received</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Shipment Code:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.shipmentCode}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Client:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.clientName}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Boxes:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.totalBoxes}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Weight:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.totalWeight} kg</td></tr>
            ${data.rackLocation ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Rack Location:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.rackLocation}</td></tr>` : ''}
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Received By:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.receivedBy}</td></tr>
            <tr><td style="padding: 10px 0;"><strong>Received At:</strong></td><td style="padding: 10px 0;">${data.receivedAt}</td></tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // ============================================
  // CONTRACT TEMPLATES
  // ============================================

  // New Contract Created
  contractNew: (data: {
    customerName: string;
    contractNumber: string;
    startDate: string;
    endDate: string;
    monthlyRate: number;
    currency: string;
    companyName: string;
  }) => ({
    subject: `📝 New Contract Created - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📝 New Contract Created</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Contract #:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.contractNumber}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Start Date:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.startDate}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>End Date:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.endDate}</td></tr>
            <tr><td style="padding: 10px 0;"><strong>Monthly Rate:</strong></td><td style="padding: 10px 0; font-size: 18px; color: #10b981;"><strong>${data.currency} ${data.monthlyRate}</strong></td></tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This is an automated notification from ${data.companyName}.</p>
        </div>
      </div>
    `,
  }),

  // Custom/Generic notification
  custom: (data: {
    title: string;
    message: string;
    companyName: string;
  }) => ({
    subject: data.title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">${data.title}</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="line-height: 1.6;">${data.message}</div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ${data.companyName} WMS.
          </p>
        </div>
      </div>
    `,
  }),
};

// ============================================
// NOTIFICATION SENDER FUNCTIONS
// ============================================

export const sendNotification = async (
  companyId: string,
  type: NotificationType,
  templateData: any,
  attachments?: Array<{ filename?: string; path?: string; content?: Buffer | string; cid?: string }>
) => {
  try {
    // Get recipients for this notification type
    const recipients = await getNotificationRecipients(companyId, type);

    if (recipients.length === 0) {
      console.log(`No recipients configured for ${type} notifications`);
      return { success: false, error: 'No recipients configured' };
    }

    // Get template based on type
    let template;
    switch (type) {
      // Shipment Events
      case 'SHIPMENT_CREATED':
        template = emailTemplates.shipmentIntake(templateData);
        break;
      case 'SHIPMENT_RELEASED':
      case 'SHIPMENT_PARTIAL_RELEASE':
        template = emailTemplates.shipmentReleased(templateData);
        break;
      case 'STORAGE_ALERT':
        template = emailTemplates.storageAlert(templateData);
        break;

      // Contract Events
      case 'CONTRACT_NEW':
        template = emailTemplates.contractNew(templateData);
        break;
      case 'CONTRACT_EXPIRING':
        template = emailTemplates.contractExpiring(templateData);
        break;
      case 'CONTRACT_EXPIRED':
        template = emailTemplates.contractExpired(templateData);
        break;
      case 'CONTRACT_RENEWED':
        template = emailTemplates.contractNew({ ...templateData, title: '🔄 Contract Renewed' });
        break;

      // Moving Job Events
      case 'MOVING_JOB_CREATED':
      case 'MOVING_JOB_ASSIGNED':
      case 'MOVING_JOB_STARTED':
        template = emailTemplates.movingJobCreated(templateData);
        break;
      case 'MOVING_JOB_COMPLETED':
        template = emailTemplates.movingJobCompleted(templateData);
        break;
      case 'JOB_COMPLETION_APPROVAL_REQUEST':
        template = emailTemplates.jobCompletionApprovalRequest(templateData);
        break;
      case 'JOB_COMPLETION_APPROVAL_REMINDER':
        template = emailTemplates.jobCompletionApprovalReminder(templateData);
        break;
      case 'JOB_COMPLETION_REJECTED':
        template = emailTemplates.jobCompletionRejected(templateData);
        break;

      // Billing & Payments
      case 'INVOICE_CREATED':
      case 'INVOICE_OVERDUE':
        template = emailTemplates.invoiceCreated(templateData);
        break;
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_REMINDER':
        template = emailTemplates.paymentReceived(templateData);
        break;

      // Materials & Inventory
      case 'LOW_STOCK_ALERT':
        template = emailTemplates.lowStockAlert(templateData);
        break;
      case 'MATERIAL_ISSUED':
        template = emailTemplates.materialIssued(templateData);
        break;
      case 'MATERIAL_RETURNED':
        template = emailTemplates.materialReturned(templateData);
        break;
      case 'MATERIAL_DAMAGED':
        template = emailTemplates.materialDamaged(templateData);
        break;
      case 'PURCHASE_ORDER_CREATED':
        template = emailTemplates.custom({ title: '📋 Purchase Order Created', message: templateData.message || '', companyName: templateData.companyName });
        break;

      // Reports
      case 'DAILY_SUMMARY':
      case 'WEEKLY_REPORT':
        template = emailTemplates.custom(templateData);
        break;

      case 'CUSTOM':
      default:
        template = emailTemplates.custom(templateData);
    }

    // Prepare attachments with filenames
    const emailAttachments = (attachments || []).map((att, idx) => ({
      filename: att.filename || `attachment-${idx + 1}${att.path ? path.extname(att.path) : ''}`,
      path: att.path,
      content: att.content,
      cid: att.cid, // Preserve CID for inline images (e.g., physical reports)
    }));

    // Send email
    return await sendEmail(companyId, {
      to: recipients,
      subject: template.subject,
      html: template.html,
      attachments: emailAttachments,
    });

  } catch (error: any) {
    console.error('Failed to send notification:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfig = async (
  config: {
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    senderName: string;
    senderEmail: string;
  },
  testEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    let transporter;

    if (config.provider === 'gmail') {
      transporter = createGmailTransporter(config.smtpUser, config.smtpPassword);
    } else {
      transporter = createTransporter({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword,
        },
      });
    }

    await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: testEmail,
      subject: '✅ WMS Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #10b981;">✅ Email Configuration Successful!</h2>
          <p>This is a test email to confirm your WMS email settings are working correctly.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Send release notification email - uses notification settings for recipients
export const sendReleaseNotification = async (
  companyId: string,
  data: {
    shipmentId: string;
    shipmentCode?: string;
    clientName: string;
    clientPhone?: string;
    boxesReleased: number;
    totalBoxes: number;
    remainingBoxes: number;
    releaseType: 'FULL' | 'PARTIAL';
    releasedBy: string;
    receivedBy?: string;      // Collector/Customer who picked up
    driverName?: string;      // Optional driver
    reason?: string;          // Reason for release
    totalCharges?: number;
    // Additional professional details
    cbm?: number;
    weight?: number;
    rackLocation?: string;
    receivedDate?: string;
    daysStored?: number;
    collectorID?: string;
    photos?: string[];
    description?: string;
    warehouseName?: string;
    currency?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Get company email settings
    const settings = await getCompanyEmailSettings(companyId);

    if (!settings || !settings.isEnabled) {
      console.log('📧 Email not enabled for company');
      return { success: false, error: 'Email not enabled' };
    }

    // Get company info
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company?.name || 'WMS';

    // Get recipients from notification settings (SHIPMENT_RELEASED)
    // This includes: customEmails, admins (if enabled), managers (if enabled)
    const notificationType: NotificationType = data.releaseType === 'FULL' ? 'SHIPMENT_RELEASED' : 'SHIPMENT_PARTIAL_RELEASE';
    const recipients = await getNotificationRecipients(companyId, notificationType);

    // Also try SHIPMENT_RELEASED if PARTIAL has no recipients
    if (recipients.length === 0 && data.releaseType === 'PARTIAL') {
      const fallbackRecipients = await getNotificationRecipients(companyId, 'SHIPMENT_RELEASED');
      recipients.push(...fallbackRecipients);
    }

    if (recipients.length === 0) {
      console.log('📧 No recipients configured for release notification - check Settings > Email > Notification Types');
      return { success: false, error: 'No recipients configured. Go to Settings > Email > Notification Types to add recipients.' };
    }

    console.log(`📧 Sending release notification to: ${recipients.join(', ')}`);

    const releaseStatus = data.releaseType === 'FULL' ? '🎉 Fully Released' : '📦 Partial Release';

    // Format dates nicely
    const formattedReceivedDate = data.receivedDate
      ? new Date(data.receivedDate).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      })
      : undefined;

    // Use professional template with full details
    const template = emailTemplates.shipmentReleased({
      shipmentCode: data.shipmentCode || data.shipmentId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      releasedBoxes: data.boxesReleased,
      totalBoxes: data.totalBoxes,
      remainingBoxes: data.remainingBoxes,
      releaseType: data.releaseType,
      releasedBy: data.releasedBy,
      releasedAt: new Date().toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      companyName,
      // Additional professional details
      cbm: data.cbm,
      weight: data.weight,
      rackLocation: data.rackLocation,
      receivedDate: formattedReceivedDate,
      daysStored: data.daysStored,
      collectorID: data.collectorID,
      totalCharges: data.totalCharges,
      currency: data.currency || 'KWD',
      photos: data.photos,
      description: data.description,
      warehouseName: data.warehouseName,
      receivedBy: data.receivedBy,
      driverName: data.driverName,
      reason: data.reason,
    });

    // Send email
    return await sendEmail(companyId, {
      to: recipients,
      subject: template.subject,
      html: template.html,
    });

  } catch (error: any) {
    console.error('Send release notification error:', error);
    return { success: false, error: error.message };
  }
};

// Professional Shipment Intake/Created Email Template
export const shipmentCreatedTemplate = (data: {
  shipmentCode: string;
  clientName: string;
  clientPhone?: string;
  boxCount: number;
  cbm?: number;
  weight?: number;
  rackLocation?: string;
  receivedDate: string;
  receivedBy: string;
  companyName: string;
  description?: string;
  warehouseName?: string;
  photos?: string[];
  dimensions?: { length?: number; width?: number; height?: number };
  customRate?: number;
}) => {
  // Build photos section if available
  let photosHtml = '';
  if (data.photos && data.photos.length > 0) {
    photosHtml = `
      <tr>
        <td colspan="2" style="padding: 15px 0;">
          <strong style="display: block; margin-bottom: 10px;">📷 Intake Photos:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${data.photos.map((url, i) => `
              <a href="${url}" target="_blank" style="display: inline-block;">
                <img src="${url}" alt="Intake Photo ${i + 1}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;" />
              </a>
            `).join('')}
          </div>
        </td>
      </tr>
    `;
  }

  return {
    subject: `📦 New Shipment Received - ${data.shipmentCode} | ${data.clientName}`,
    html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #f8fafc;">
      <!-- Header with Company Branding -->
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0 0 5px 0; font-size: 24px;">📦 Shipment Intake Report</h1>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">${data.companyName} Warehouse Management</p>
      </div>
      
      <!-- Status Banner -->
      <div style="background: #10b981; color: white; padding: 12px 30px; text-align: center;">
        <strong style="font-size: 16px;">✅ SHIPMENT RECEIVED</strong>
      </div>
      
      <!-- Main Content -->
      <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
        
        <!-- Shipment Summary Card -->
        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div>
              <span style="color: #059669; font-size: 12px; text-transform: uppercase;">Shipment Code</span>
              <h2 style="margin: 5px 0 0 0; color: #047857; font-size: 22px;">${data.shipmentCode}</h2>
            </div>
            <div style="text-align: right;">
              <span style="color: #059669; font-size: 12px; text-transform: uppercase;">Total</span>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #10b981;">${data.boxCount} boxes</p>
            </div>
          </div>
        </div>
        
        <!-- Client Information -->
        <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
          👤 Client Information
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Client Name:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.clientName}</td>
          </tr>
          ${data.clientPhone ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Phone:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.clientPhone}</td>
          </tr>
          ` : ''}
        </table>
        
        <!-- Shipment Details -->
        <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
          📋 Shipment Details
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${data.description ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Description:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.description}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Box Count:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: bold;">${data.boxCount} boxes</td>
          </tr>
          ${data.cbm ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">CBM (Volume):</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.cbm.toFixed(3)} m³</td>
          </tr>
          ` : ''}
          ${data.weight ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Weight:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.weight.toFixed(2)} kg</td>
          </tr>
          ` : ''}
          ${data.dimensions?.length && data.dimensions?.width && data.dimensions?.height ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Dimensions (L×W×H):</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.dimensions.length} × ${data.dimensions.width} × ${data.dimensions.height} cm</td>
          </tr>
          ` : ''}
          ${data.rackLocation ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Assigned Rack:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">📍 ${data.rackLocation}</td>
          </tr>
          ` : ''}
          ${data.warehouseName ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Warehouse:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">🏭 ${data.warehouseName}</td>
          </tr>
          ` : ''}
          ${data.customRate ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Custom Rate:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">KWD ${data.customRate.toFixed(3)}/day</td>
          </tr>
          ` : ''}
        </table>
        
        <!-- Receipt Details -->
        <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 25px;">
          📅 Receipt Details
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 40%;"><strong style="color: #64748b;">Received Date:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.receivedDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;"><strong style="color: #64748b;">Received By:</strong></td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.receivedBy}</td>
          </tr>
        </table>
        
        <!-- Intake Photos -->
        <table style="width: 100%; border-collapse: collapse;">
          ${photosHtml}
        </table>
        
        <!-- Received By Section -->
        <div style="background: #f0fdf4; border-radius: 10px; padding: 15px; margin-top: 25px; display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
            <span style="color: white; font-size: 18px;">👤</span>
          </div>
          <div>
            <span style="color: #059669; font-size: 12px; display: block;">Received By</span>
            <span style="color: #1e293b; font-weight: bold;">${data.receivedBy}</span>
          </div>
        </div>
        
      </div>
      
      <!-- Footer -->
      <div style="background: #1e293b; color: #94a3b8; padding: 20px 30px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 12px;">This is an automated notification from ${data.companyName} Warehouse Management System</p>
        <p style="margin: 0; font-size: 11px; color: #64748b;">Generated on ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `,
  };
};

// Send shipment intake/created notification email
export const sendShipmentCreatedNotification = async (
  companyId: string,
  data: {
    shipmentId: string;
    shipmentCode: string;
    clientName: string;
    clientPhone?: string;
    boxCount: number;
    cbm?: number;
    weight?: number;
    rackLocation?: string;
    receivedDate: string;
    receivedBy: string;
    description?: string;
    warehouseName?: string;
    photos?: string[];
    dimensions?: { length?: number; width?: number; height?: number };
    customRate?: number;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Get company email settings
    const settings = await getCompanyEmailSettings(companyId);

    if (!settings || !settings.isEnabled) {
      console.log('📧 Email not enabled for company');
      return { success: false, error: 'Email not enabled' };
    }

    // Get company info
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company?.name || 'WMS';

    // Get recipients from notification settings (SHIPMENT_CREATED)
    const recipients = await getNotificationRecipients(companyId, 'SHIPMENT_CREATED');

    if (recipients.length === 0) {
      console.log('📧 No recipients configured for shipment created notification');
      return { success: false, error: 'No recipients configured for SHIPMENT_CREATED notification type.' };
    }

    console.log(`📧 Sending shipment created notification to: ${recipients.join(', ')}`);

    // Use professional template
    const template = shipmentCreatedTemplate({
      shipmentCode: data.shipmentCode,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      boxCount: data.boxCount,
      cbm: data.cbm,
      weight: data.weight,
      rackLocation: data.rackLocation,
      receivedDate: new Date(data.receivedDate).toLocaleString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      receivedBy: data.receivedBy,
      companyName,
      description: data.description,
      warehouseName: data.warehouseName || `${companyName} Warehouse`,
      photos: data.photos,
      dimensions: data.dimensions,
      customRate: data.customRate,
    });

    // Send email
    return await sendEmail(companyId, {
      to: recipients,
      subject: template.subject,
      html: template.html,
    });

  } catch (error: any) {
    console.error('Send shipment created notification error:', error);
    return { success: false, error: error.message };
  }
};

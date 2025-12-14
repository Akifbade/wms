import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import { emailTemplates, sendEmail, getNotificationRecipients, sendNotification } from "../services/emailService";

const prisma = new PrismaClient();
const router = Router();

function parseEmailList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [];
}

// Build a browser-safe public URL for an uploaded file
const buildPublicUrl = (req: AuthRequest, filePath: string | null | undefined) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
};

// Resolve an uploaded file URL to an absolute filesystem path (for email attachments)
const resolveUploadPath = (fileUrl: string | null | undefined) => {
  if (!fileUrl) return null;
  // Strip any host and leading slash
  const cleaned = fileUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, '');
  const candidates = [
    path.join(__dirname, '../../', cleaned),
    path.join(process.cwd(), cleaned),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  console.warn(`[MovingJobs] Attachment missing on disk: ${fileUrl} (checked ${candidates.join(', ')})`);
  return null;
};

/**
 * GET /api/moving-jobs
 * Fetch all moving jobs for the authenticated company
 */
router.get("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const jobs = await prisma.movingJob.findMany({
      where: { companyId },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        materialIssues: {
          select: {
            id: true,
            quantity: true,
            totalCost: true,
          }
        },
        materialReturns: {
          select: {
            id: true,
            quantityGood: true,
            quantityDamaged: true
          }
        },
        approvals: {
          where: { approvalType: 'JOB_COMPLETION_REPORT' },
          orderBy: { requestedAt: 'desc' },
          take: 1, // only latest approval per job
          include: {
            requestedBy: { select: { id: true, name: true, email: true } },
            decisionBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching moving jobs:", error);
    res.status(500).json({ error: "Failed to fetch moving jobs." });
  }
});

/**
 * GET /api/moving-jobs/:jobId
 * Fetch a specific moving job with all related data
 */
router.get("/:jobId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;

    const job = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
        approvals: {
          where: { approvalType: 'JOB_COMPLETION_REPORT' },
          orderBy: { requestedAt: 'desc' },
          take: 1,
          include: {
            requestedBy: { select: { id: true, name: true, email: true } },
            decisionBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job." });
  }
});

/**
 * POST /api/moving-jobs
 * Create a new moving job
 */
router.post("/", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.user!;
    const {
      jobCode,
      jobTitle,
      clientName,
      clientPhone,
      clientEmail,
      jobDate,
      jobAddress,
      dropoffAddress,
      teamLeaderId,
      driverName,
      vehicleNumber,
      notes,
    } = req.body;

    // Validate required fields
    if (!jobCode || !jobTitle || !clientName || !jobDate || !jobAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newJob = await prisma.movingJob.create({
      data: {
        jobCode,
        jobTitle,
        clientName,
        clientPhone,
        clientEmail,
        jobDate: new Date(jobDate),
        jobAddress,
        dropoffAddress,
        teamLeaderId,
        driverName,
        vehicleNumber,
        notes,
        companyId,
        status: "PLANNED",
      },
    });

    // Send email notification for new job
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const notifyEmailsOverride = parseEmailList((req.body as any).notifyEmails);
      await sendNotification(companyId, 'MOVING_JOB_CREATED', {
        jobCode: newJob.jobCode,
        customerName: clientName,
        jobType: jobTitle,
        pickupAddress: jobAddress,
        deliveryAddress: dropoffAddress || 'N/A',
        scheduledDate: new Date(jobDate).toLocaleString(),
        companyName: company?.name || 'WMS',
        clientPhone: clientPhone || '',
        clientEmail: clientEmail || '',
        driverName: driverName || '',
        vehicleNumber: vehicleNumber || '',
        notes: notes || '',
      });

      // Optional override: if caller provided explicit internal emails, send a copy directly to those (still not to customer)
      if (notifyEmailsOverride.length > 0) {
        await sendEmail(companyId, {
          to: notifyEmailsOverride,
          subject: `🚚 New Moving Job Created - ${newJob.jobCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>🚚 New Moving Job</h2>
              <p><strong>Job Code:</strong> ${newJob.jobCode}</p>
              <p><strong>Customer:</strong> ${clientName}</p>
              <p><strong>Phone:</strong> ${clientPhone || 'N/A'}</p>
              <p><strong>Job Type:</strong> ${jobTitle}</p>
              <p><strong>Pickup:</strong> ${jobAddress}</p>
              <p><strong>Delivery:</strong> ${dropoffAddress || 'N/A'}</p>
              <p><strong>Scheduled:</strong> ${new Date(jobDate).toLocaleString()}</p>
              <p><strong>Driver:</strong> ${driverName || 'N/A'} | <strong>Vehicle:</strong> ${vehicleNumber || 'N/A'}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
              <p style="color:#6b7280;font-size:12px;">Automated notification from ${company?.name || 'WMS'}.</p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
    }

    res.status(201).json(newJob);
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Failed to create job." });
  }
});

/**
 * PATCH /api/moving-jobs/:jobId
 * Update a moving job
 */
router.patch("/:jobId", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;
    const updateData = req.body;

    // Verify job belongs to the company
    const existingJob = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // If trying to mark as COMPLETED, change to PENDING_APPROVAL first
    let finalUpdateData = { ...updateData };
    if (updateData.status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
      console.log(`[JOB-UPDATE] Changing status from ${existingJob.status} to PENDING_APPROVAL (was trying COMPLETED)`);
      finalUpdateData.status = 'PENDING_APPROVAL';
      // completedAt not present in schema; keep history via approvals instead
    }

    console.log(`[JOB-UPDATE] Final update data:`, finalUpdateData);

    const updatedJob = await prisma.movingJob.update({
      where: { id: jobId },
      data: finalUpdateData,
    });

    console.log(`[JOB-UPDATE] Job ${jobId} updated to status: ${updatedJob.status}`);

    // If job is pending approval, send approval request (internal) with full materials report
    if (updateData.status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
      try {
        const company = await prisma.company.findUnique({ where: { id: companyId } });

        // Pull materials issued + returns
        const issues = await prisma.materialIssue.findMany({
          where: { companyId, jobId },
          include: {
            material: { select: { name: true, unit: true } },
            returns: { select: { quantityGood: true, quantityDamaged: true } },
          },
          orderBy: { issuedAt: 'asc' },
        });

        const materials = issues.map(issue => {
          const returnedGood = (issue.returns || []).reduce((sum, r) => sum + (r.quantityGood || 0), 0);
          const damaged = (issue.returns || []).reduce((sum, r) => sum + (r.quantityDamaged || 0), 0);
          const used = Math.max(0, (issue.quantity || 0) - returnedGood - damaged);
          return {
            name: issue.material?.name || 'Unknown',
            unit: issue.material?.unit || 'pcs',
            issued: issue.quantity || 0,
            used,
            returnedGood,
            damaged,
            totalCost: issue.totalCost || 0,
          };
        });

        const totals = materials.reduce(
          (acc, m) => {
            acc.issued += m.issued;
            acc.used += m.used;
            acc.returnedGood += m.returnedGood;
            acc.damaged += m.damaged;
            acc.totalCost += m.totalCost;
            return acc;
          },
          { issued: 0, used: 0, returnedGood: 0, damaged: 0, totalCost: 0 }
        );

        // Determine internal recipients
        const approvalNotifyEmailsOverride = parseEmailList((updateData as any).approvalNotifyEmails);
        const recipients = approvalNotifyEmailsOverride.length > 0
          ? approvalNotifyEmailsOverride
          : await getNotificationRecipients(companyId, 'JOB_COMPLETION_APPROVAL_REQUEST');

        if (recipients.length === 0) {
          console.log('No recipients configured for JOB_COMPLETION_APPROVAL_REQUEST');
        } else {
          // Create or reuse a pending approval record
          let approval = await prisma.materialApproval.findFirst({
            where: {
              companyId,
              jobId,
              approvalType: 'JOB_COMPLETION_REPORT',
              status: 'PENDING',
            },
            orderBy: { requestedAt: 'desc' },
          });

          if (!approval) {
            approval = await prisma.materialApproval.create({
              data: {
                companyId,
                jobId,
                approvalType: 'JOB_COMPLETION_REPORT',
                status: 'PENDING',
                requestedById: req.user!.id,
                notifyEmails: recipients.join(', '),
              },
            });
          } else {
            // Keep recipients up to date if caller overrides
            if (approvalNotifyEmailsOverride.length > 0) {
              await prisma.materialApproval.update({
                where: { id: approval.id },
                data: { notifyEmails: recipients.join(', ') },
              });
            }
          }

          const baseUrl = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || req.get('origin') || '';
          console.log('\n[MovingJobs] ========== APPROVAL EMAIL PREP ==========');
          console.log('[MovingJobs] baseUrl:', baseUrl);
          console.log('[MovingJobs] Job ID:', updatedJob.id);

          const approvalUrl = baseUrl
            ? `${baseUrl.replace(/\/$/, '')}/approvals?approvalId=${encodeURIComponent(approval.id)}`
            : '#';

          // Get physical reports from material returns for this job
          console.log('[MovingJobs] Fetching physical reports for job:', updatedJob.id);
          // NOTE: Prisma typing can lag behind schema changes in some dev setups.
          // Use a narrow query + safe access to avoid compile-time blocking.
          const materialReturns = await (prisma.materialReturn as any).findMany({
            where: { jobId: updatedJob.id, companyId, physicalReportUrl: { not: null } },
            select: { physicalReportUrl: true, id: true }
          });

          console.log('[MovingJobs] Found material returns with physicalReportUrl:', materialReturns.length);
          materialReturns.forEach((mr, i) => {
            console.log(`[MovingJobs] Return ${i}: URL = ${mr.physicalReportUrl}`);
          });

          const physicalReportsRelative = (materialReturns as any[])
            .map(r => r?.physicalReportUrl)
            .filter((url): url is string => typeof url === 'string' && url.length > 0);

          // Build full URLs for physical reports (used for the click-through links)
          const physicalReportUrls = physicalReportsRelative
            .map(url => baseUrl ? `${baseUrl.replace(/\/$/, '')}${url}` : url);

          // Attach images inline so previews work in email clients (Gmail often can't fetch localhost URLs).
          const physicalReportAttachments = physicalReportsRelative.map((relativeUrl, idx) => {
            const isPdf = /\.pdf($|\?)/i.test(relativeUrl);
            const filePath = `/app${relativeUrl}`;
            const ext = path.extname(relativeUrl) || '';
            return {
              filename: `physical-report-${idx + 1}${ext}`,
              path: filePath,
              cid: isPdf ? undefined : `physical-report-${idx + 1}`,
            };
          });

          console.log('[MovingJobs] Final physicalReportUrls:', physicalReportUrls);
          console.log('[MovingJobs] ==========================================\n');

          // Send approval request email
          await sendNotification(companyId, 'JOB_COMPLETION_APPROVAL_REQUEST', {
            jobCode: updatedJob.jobCode,
            customerName: updatedJob.clientName,
            completedAt: new Date().toLocaleString(),
            currency: company?.currency || 'KWD',
            companyName: company?.name || 'WMS',
            approvalUrl,
            materials,
            totals,
            physicalReports: physicalReportUrls,
          }, physicalReportAttachments);

          // If caller provided explicit emails, ensure they receive it even if notification settings are empty/disabled
          if (approvalNotifyEmailsOverride.length > 0) {
            const template = emailTemplates.jobCompletionApprovalRequest({
              jobCode: updatedJob.jobCode,
              customerName: updatedJob.clientName,
              completedAt: new Date().toLocaleString(),
              currency: company?.currency || 'KWD',
              companyName: company?.name || 'WMS',
              approvalUrl,
              materials,
              totals,
              physicalReports: physicalReportUrls,
            });
            await sendEmail(companyId, {
              to: approvalNotifyEmailsOverride,
              subject: template.subject,
              html: template.html,
              attachments: physicalReportAttachments as any,
            });
          }
        }
      } catch (emailErr) {
        console.error('Job completion approval email error:', emailErr);
      }
    }

    res.json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Failed to update job." });
  }
});

/**
 * DELETE /api/moving-jobs/:jobId
 * Delete a moving job (soft delete - preserves history and material records)
 */
router.delete("/:jobId", authenticateToken as any, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { jobId } = req.params;
    const { companyId } = req.user!;
    const userId = req.user!.id;

    // Verify job belongs to the company and get all relations
    const existingJob = await prisma.movingJob.findFirst({
      where: { id: jobId, companyId },
      include: {
        assignments: true,
        materialIssues: true,
        materialReturns: true,
        costSnapshots: true,
        approvals: true,
        files: true
      }
    });

    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if any materials are still pending/active
    const activeMaterials = existingJob.materialIssues.filter((m: any) =>
      m.status !== 'RETURNED' && m.status !== 'CANCELLED'
    );

    if (activeMaterials.length > 0) {
      return res.status(400).json({
        error: `Cannot delete job: ${activeMaterials.length} active material issue(s) still pending. Return or cancel them first.`,
        activeMaterialsCount: activeMaterials.length
      });
    }

    // Soft delete: mark deletedAt timestamp instead of hard delete
    // This preserves all material history and audit trails
    const deletedJob = await prisma.movingJob.update({
      where: { id: jobId },
      data: {
        deletedAt: new Date(),
        status: 'CANCELLED' // Mark status as cancelled for clarity
      },
      include: {
        materialIssues: true,
        materialReturns: true,
        costSnapshots: true
      }
    });

    console.log(`Job ${jobId} soft deleted by user ${userId} - all material history preserved`);

    res.json({
      message: "Job deleted successfully (archived with full history preserved)",
      job: {
        id: deletedJob.id,
        jobCode: deletedJob.jobCode,
        status: deletedJob.status,
        deletedAt: deletedJob.deletedAt,
        materialIssuesCount: deletedJob.materialIssues.length,
        materialReturnsCount: deletedJob.materialReturns.length
      }
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job." });
  }
});

export default router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
const jobSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    jobType: zod_1.z.enum(['LOCAL', 'INTERNATIONAL', 'PACKING_ONLY']),
    clientName: zod_1.z.string().min(2),
    clientPhone: zod_1.z.string(),
    fromAddress: zod_1.z.string(),
    toAddress: zod_1.z.string().optional(),
    scheduledDate: zod_1.z.string().transform(str => new Date(str)),
    estimatedHours: zod_1.z.number().positive().optional(),
    totalCost: zod_1.z.number().optional(),
});
// Get all moving jobs
router.get('/', async (req, res) => {
    try {
        const { status, search, startDate, endDate } = req.query;
        const companyId = req.user.companyId;
        const where = { companyId };
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { clientName: { contains: search } },
            ];
        }
        if (startDate || endDate) {
            where.scheduledDate = {};
            if (startDate)
                where.scheduledDate.gte = new Date(startDate);
            if (endDate)
                where.scheduledDate.lte = new Date(endDate);
        }
        const jobs = await prisma.movingJob.findMany({
            where,
            include: {
                assignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { scheduledDate: 'asc' },
        });
        res.json({ jobs });
    }
    catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single job
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const job = await prisma.movingJob.findFirst({
            where: { id, companyId },
            include: {
                assignments: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ job });
    }
    catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create job
router.post('/', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const data = jobSchema.parse(req.body);
        const companyId = req.user.companyId;
        const { workerIds, ...jobData } = req.body;
        const job = await prisma.movingJob.create({
            data: {
                ...jobData,
                companyId,
                scheduledDate: new Date(jobData.scheduledDate),
                status: 'SCHEDULED',
            },
        });
        // Assign workers if provided
        if (workerIds && Array.isArray(workerIds)) {
            await Promise.all(workerIds.map((userId) => prisma.jobAssignment.create({
                data: {
                    jobId: job.id,
                    userId,
                    companyId,
                    role: 'HELPER',
                },
            })));
        }
        const jobWithAssignments = await prisma.movingJob.findUnique({
            where: { id: job.id },
            include: {
                assignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
        res.status(201).json({ job: jobWithAssignments });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update job
router.put('/:id', (0, auth_1.authorizeRoles)('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const existing = await prisma.movingJob.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const job = await prisma.movingJob.update({
            where: { id },
            data: req.body,
            include: {
                assignments: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        res.json({ job });
    }
    catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete job
router.delete('/:id', (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const existing = await prisma.movingJob.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Job not found' });
        }
        await prisma.movingJob.delete({ where: { id } });
        res.json({ message: 'Job deleted successfully' });
    }
    catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

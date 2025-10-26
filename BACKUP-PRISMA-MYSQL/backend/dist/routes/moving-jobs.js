"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * GET /api/moving-jobs
 * Fetch all moving jobs for the authenticated company
 */
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
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
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json(jobs);
    }
    catch (error) {
        console.error("Error fetching moving jobs:", error);
        res.status(500).json({ error: "Failed to fetch moving jobs." });
    }
});
/**
 * GET /api/moving-jobs/:jobId
 * Fetch a specific moving job with all related data
 */
router.get("/:jobId", auth_1.authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { companyId } = req.user;
        const job = await prisma.movingJob.findFirst({
            where: { id: jobId, companyId },
            include: {
                assignments: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        res.json(job);
    }
    catch (error) {
        console.error("Error fetching job:", error);
        res.status(500).json({ error: "Failed to fetch job." });
    }
});
/**
 * POST /api/moving-jobs
 * Create a new moving job
 */
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const { jobCode, jobTitle, clientName, clientPhone, clientEmail, jobDate, jobAddress, dropoffAddress, teamLeaderId, driverName, vehicleNumber, notes, } = req.body;
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
        res.status(201).json(newJob);
    }
    catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ error: "Failed to create job." });
    }
});
/**
 * PATCH /api/moving-jobs/:jobId
 * Update a moving job
 */
router.patch("/:jobId", auth_1.authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { companyId } = req.user;
        const updateData = req.body;
        // Verify job belongs to the company
        const existingJob = await prisma.movingJob.findFirst({
            where: { id: jobId, companyId },
        });
        if (!existingJob) {
            return res.status(404).json({ error: "Job not found" });
        }
        const updatedJob = await prisma.movingJob.update({
            where: { id: jobId },
            data: updateData,
        });
        res.json(updatedJob);
    }
    catch (error) {
        console.error("Error updating job:", error);
        res.status(500).json({ error: "Failed to update job." });
    }
});
exports.default = router;

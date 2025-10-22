import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all withdrawals (with filters)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const { status, search, startDate, endDate, shipmentId } = req.query;

    const where: any = { companyId };
    
    if (status) where.status = status;
    if (shipmentId) where.shipmentId = shipmentId;
    if (search) {
      where.OR = [
        { withdrawnBy: { contains: search as string, mode: 'insensitive' } },
        { receiptNumber: { contains: search as string, mode: 'insensitive' } },
        { shipment: { clientName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      where.withdrawalDate = {};
      if (startDate) where.withdrawalDate.gte = new Date(startDate as string);
      if (endDate) where.withdrawalDate.lte = new Date(endDate as string);
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: {
        shipment: {
          select: {
            id: true,
            referenceId: true,
            clientName: true,
            clientPhone: true,
            currentBoxCount: true,
            originalBoxCount: true,
          }
        }
      },
      orderBy: { withdrawalDate: 'desc' },
    });

    res.json({ withdrawals });
  } catch (error: any) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single withdrawal
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const withdrawal = await prisma.withdrawal.findFirst({
      where: { id, companyId },
      include: {
        shipment: {
          include: {
            rack: true,
          }
        }
      },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    res.json({ withdrawal });
  } catch (error: any) {
    console.error('Get withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create withdrawal (partial or full release)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    const {
      shipmentId,
      withdrawnBoxCount,
      reason,
      notes,
      photos,
      withdrawnBy,
      receiptNumber,
    } = req.body;

    // Validate shipment
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    if (withdrawnBoxCount > shipment.currentBoxCount) {
      return res.status(400).json({ 
        error: `Cannot withdraw ${withdrawnBoxCount} boxes. Only ${shipment.currentBoxCount} boxes available.` 
      });
    }

    const remainingBoxCount = shipment.currentBoxCount - withdrawnBoxCount;

    // Create withdrawal record
    const withdrawal = await prisma.withdrawal.create({
      data: {
        companyId,
        shipmentId,
        withdrawnBoxCount,
        remainingBoxCount,
        reason,
        notes,
        photos: photos ? JSON.stringify(photos) : null,
        withdrawnBy,
        receiptNumber,
        authorizedBy: userId,
        status: 'COMPLETED',
      },
      include: {
        shipment: true,
      }
    });

    // Update shipment box count and status
    const newStatus = remainingBoxCount === 0 
      ? 'RELEASED' 
      : (withdrawnBoxCount < shipment.currentBoxCount ? 'PARTIAL' : 'IN_STORAGE');
    
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { 
        currentBoxCount: remainingBoxCount,
        status: newStatus,
        releasedAt: remainingBoxCount === 0 ? new Date() : null,
      },
    });

    // If rack assigned, update rack capacity
    if (shipment.rackId) {
      const rack = await prisma.rack.findUnique({
        where: { id: shipment.rackId },
      });

      if (rack) {
        await prisma.rack.update({
          where: { id: shipment.rackId },
          data: {
            capacityUsed: Math.max(0, rack.capacityUsed - withdrawnBoxCount),
          },
        });

        // Log rack activity
        await prisma.rackActivity.create({
          data: {
            companyId,
            rackId: shipment.rackId,
            userId,
            activityType: 'ITEM_REMOVED',
            itemDetails: `Withdrawal: ${withdrawnBoxCount} boxes from ${shipment.referenceId}`,
            quantityBefore: shipment.currentBoxCount + withdrawnBoxCount,
            quantityAfter: shipment.currentBoxCount,
          },
        });
      }
    }

    res.json({ 
      withdrawal,
      message: remainingBoxCount === 0 
        ? 'Shipment fully released' 
        : `Partial withdrawal completed. ${remainingBoxCount} boxes remaining.`
    });
  } catch (error: any) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update withdrawal status
router.put('/:id/status', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const { status } = req.body;

    const withdrawal = await prisma.withdrawal.findFirst({
      where: { id, companyId },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: { status },
    });

    res.json({ withdrawal: updated, message: 'Withdrawal status updated' });
  } catch (error: any) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete withdrawal (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const withdrawal = await prisma.withdrawal.findFirst({
      where: { id, companyId },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    await prisma.withdrawal.delete({
      where: { id },
    });

    res.json({ message: 'Withdrawal deleted successfully' });
  } catch (error: any) {
    console.error('Delete withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

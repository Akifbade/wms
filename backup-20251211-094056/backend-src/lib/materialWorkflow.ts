import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Issue materials to a job with proper stock deduction
 */
export async function issueMaterialsToJob(data: {
  jobId: string;
  materialId: string;
  quantity: number;
  rackId?: string;
  stockBatchId?: string;
  issuedById: string;
  companyId: string;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Validate job exists
    const job = await tx.movingJob.findFirst({
      where: { id: data.jobId, companyId: data.companyId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // 2. Get material with current stock
    const material = await tx.packingMaterial.findFirst({
      where: { id: data.materialId, companyId: data.companyId },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    if (material.totalQuantity < data.quantity) {
      throw new Error(`Insufficient stock. Available: ${material.totalQuantity}, Requested: ${data.quantity}`);
    }

    // 3. Get cost from stock batch or use material unitCost
    let unitCost = material.unitCost || 0;
    let stockBatchId = data.stockBatchId;

    if (stockBatchId) {
      const batch = await tx.stockBatch.findUnique({
        where: { id: stockBatchId },
      });
      if (batch) {
        unitCost = batch.unitCost;
      }
    } else {
      // Auto-select oldest stock batch (FIFO)
      const batch = await tx.stockBatch.findFirst({
        where: {
          materialId: data.materialId,
          quantityRemaining: { gte: data.quantity },
          companyId: data.companyId,
        },
        orderBy: { purchaseDate: 'asc' },
      });

      if (batch) {
        stockBatchId = batch.id;
        unitCost = batch.unitCost;
      }
    }

    // 4. Create material issue record
    const issue = await tx.materialIssue.create({
      data: {
        jobId: data.jobId,
        materialId: data.materialId,
        stockBatchId,
        quantity: data.quantity,
        unitCost,
        totalCost: unitCost * data.quantity,
        rackId: data.rackId,
        issuedById: data.issuedById,
        notes: data.notes,
        companyId: data.companyId,
      },
    });

    // 5. Update material total quantity
    await tx.packingMaterial.update({
      where: { id: data.materialId },
      data: {
        totalQuantity: { decrement: data.quantity },
      },
    });

    // 6. Update stock batch if specified
    if (stockBatchId) {
      await tx.stockBatch.update({
        where: { id: stockBatchId },
        data: {
          quantityRemaining: { decrement: data.quantity },
        },
      });
    }

    // 7. Update rack stock level if rack specified
    if (data.rackId) {
      const rackLevel = await tx.rackStockLevel.findFirst({
        where: {
          materialId: data.materialId,
          rackId: data.rackId,
          stockBatchId: stockBatchId || undefined,
        },
      });

      if (rackLevel) {
        await tx.rackStockLevel.update({
          where: { id: rackLevel.id },
          data: {
            quantity: { decrement: data.quantity },
            lastUpdated: new Date(),
          },
        });
      }
    }

    // 8. Update job cost snapshot
    await updateJobCosts(tx, data.jobId, data.companyId);

    return issue;
  });
}

/**
 * Return materials from job with automatic restocking
 */
export async function returnMaterialsFromJob(data: {
  jobId: string;
  materialId: string;
  issueId?: string;
  quantityGood: number;
  quantityDamaged: number;
  rackId?: string;
  recordedById: string;
  companyId: string;
  notes?: string;
  damageReason?: string;
  damagePhotos?: string[];
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Validate job exists
    const job = await tx.movingJob.findFirst({
      where: { id: data.jobId, companyId: data.companyId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // 2. Get material issue record
    let issue = null;
    if (data.issueId) {
      issue = await tx.materialIssue.findUnique({
        where: { id: data.issueId },
      });
    }

    // 3. Create material return record
    const materialReturn = await tx.materialReturn.create({
      data: {
        jobId: data.jobId,
        materialId: data.materialId,
        issueId: data.issueId,
        quantityIssued: issue?.quantity,
        quantityUsed: issue ? issue.quantity - (data.quantityGood + data.quantityDamaged) : undefined,
        quantityGood: data.quantityGood,
        quantityDamaged: data.quantityDamaged,
        restocked: false,
        rackId: data.rackId,
        recordedById: data.recordedById,
        notes: data.notes,
        companyId: data.companyId,
      },
    });

    // 4. Auto-restock good quantity if rack specified
    if (data.quantityGood > 0) {
      if (data.rackId) {
        // Update or create rack stock level
        const existingLevel = await tx.rackStockLevel.findFirst({
          where: {
            materialId: data.materialId,
            rackId: data.rackId,
            stockBatchId: issue?.stockBatchId,
          },
        });

        if (existingLevel) {
          await tx.rackStockLevel.update({
            where: { id: existingLevel.id },
            data: {
              quantity: { increment: data.quantityGood },
              lastUpdated: new Date(),
            },
          });
        } else {
          await tx.rackStockLevel.create({
            data: {
              materialId: data.materialId,
              rackId: data.rackId,
              stockBatchId: issue?.stockBatchId,
              quantity: data.quantityGood,
              companyId: data.companyId,
            },
          });
        }

        // Mark as restocked
        await tx.materialReturn.update({
          where: { id: materialReturn.id },
          data: {
            restocked: true,
            restockedAt: new Date(),
          },
        });
      }

      // Update material total quantity
      await tx.packingMaterial.update({
        where: { id: data.materialId },
        data: {
          totalQuantity: { increment: data.quantityGood },
        },
      });

      // Update stock batch if exists
      if (issue?.stockBatchId) {
        await tx.stockBatch.update({
          where: { id: issue.stockBatchId },
          data: {
            quantityRemaining: { increment: data.quantityGood },
          },
        });
      }
    }

    // 5. Record damaged items if any
    if (data.quantityDamaged > 0) {
      await tx.materialDamage.create({
        data: {
          returnId: materialReturn.id,
          materialId: data.materialId,
          quantity: data.quantityDamaged,
          reason: data.damageReason,
          photoUrls: data.damagePhotos ? JSON.stringify(data.damagePhotos) : null,
          status: 'PENDING',
          recordedById: data.recordedById,
          companyId: data.companyId,
        },
      });
    }

    // 6. Update job cost snapshot
    await updateJobCosts(tx, data.jobId, data.companyId);

    return tx.materialReturn.findUnique({
      where: { id: materialReturn.id },
      include: {
        damages: true,
      },
    });
  });
}

/**
 * Update job cost snapshot with latest calculations
 */
async function updateJobCosts(tx: any, jobId: string, companyId: string) {
  const job = await tx.movingJob.findUnique({
    where: { id: jobId },
    include: {
      materialIssues: true,
      assignments: true,
      materialReturns: {
        include: { damages: true },
      },
    },
  });

  if (!job) return;

  // Calculate materials cost (issued - returned good)
  const materialsCost = job.materialIssues.reduce((sum: number, issue: any) => {
    const returned = job.materialReturns
      .filter((r: any) => r.issueId === issue.id)
      .reduce((rSum: number, r: any) => rSum + r.quantityGood, 0);
    
    const usedQuantity = issue.quantity - returned;
    return sum + (usedQuantity * issue.unitCost);
  }, 0);

  // Calculate labor cost
  const laborCost = job.assignments.reduce((sum: number, assignment: any) => {
    const hours = assignment.hoursWorked || 0;
    const rate = assignment.hourlyRate || 0;
    return sum + (hours * rate);
  }, 0);

  // Calculate damage loss
  const damageLoss = job.materialReturns.reduce((sum: number, ret: any) => {
    return sum + ret.damages.reduce((dSum: number, damage: any) => {
      // Get material cost
      const issue = job.materialIssues.find((i: any) => i.materialId === damage.materialId);
      const unitCost = issue?.unitCost || 0;
      return dSum + (damage.quantity * unitCost);
    }, 0);
  }, 0);

  // Create or update cost snapshot
  await tx.jobCostSnapshot.create({
    data: {
      jobId,
      materialsCost,
      laborCost,
      damageLoss,
      otherCost: 0,
      revenue: 0, // Set externally
      profit: 0 - materialsCost - laborCost - damageLoss,
      companyId,
    },
  });
}

/**
 * Approve material damage
 */
export async function approveMaterialDamage(data: {
  damageId: string;
  approvedById: string;
  companyId: string;
  approvalNotes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const damage = await tx.materialDamage.findFirst({
      where: { id: data.damageId, companyId: data.companyId },
      include: { return: true },
    });

    if (!damage) {
      throw new Error('Damage record not found');
    }

    await tx.materialDamage.update({
      where: { id: data.damageId },
      data: {
        status: 'APPROVED',
        approvedById: data.approvedById,
        approvedAt: new Date(),
        approvalNotes: data.approvalNotes,
      },
    });

    // Update job costs
    if (damage.return) {
      await updateJobCosts(tx, damage.return.jobId, data.companyId);
    }

    return { success: true };
  });
}

export default {
  issueMaterialsToJob,
  returnMaterialsFromJob,
  approveMaterialDamage,
};

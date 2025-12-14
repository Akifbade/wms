import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restockReturn(r: { id: string; materialId: string; rackId: string | null; quantityGood: number; companyId: string }) {
  const qty = r.quantityGood || 0;
  if (qty <= 0) return;

  if (r.rackId) {
    const uniqueBatchId = `RETURN-${r.id}`;
    await prisma.rackStockLevel.upsert({
      where: { materialId_rackId_stockBatchId: { materialId: r.materialId, rackId: r.rackId, stockBatchId: uniqueBatchId } },
      create: { materialId: r.materialId, rackId: r.rackId, companyId: r.companyId, stockBatchId: uniqueBatchId, quantity: qty },
      update: { quantity: { increment: qty } },
    });
    console.log(`[RESTOCK] Return ${r.id} -> rack ${r.rackId} +${qty}`);
  } else {
    console.warn(`[RESTOCK] Return ${r.id} has no rackId. Incrementing only totalQuantity +${qty}`);
  }

  await prisma.packingMaterial.update({
    where: { id: r.materialId },
    data: { totalQuantity: { increment: qty } },
  });

  await prisma.materialReturn.update({
    where: { id: r.id },
    data: { restocked: true, restockedAt: new Date() },
  });
}

async function main() {
  const pending = await prisma.materialReturn.findMany({
    where: {
      restocked: false,
      quantityGood: { gt: 0 },
    },
    select: { id: true, materialId: true, rackId: true, quantityGood: true, companyId: true },
  });

  console.log(`Pending returns (any rack): ${pending.length}`);
  let done = 0;
  for (const r of pending) {
    await restockReturn(r);
    done++;
  }

  console.log(`✅ Completed. Restocked ${done} pending returns.`);
}

main()
  .catch((err) => {
    console.error('Restock script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

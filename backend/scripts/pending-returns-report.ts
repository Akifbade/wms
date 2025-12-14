import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.materialReturn.findMany({
    where: { restocked: false, quantityGood: { gt: 0 }, rackId: { not: null } },
    select: { id: true, jobId: true, companyId: true, materialId: true, quantityGood: true, rackId: true },
  });

  console.log(`Pending (restocked=false, qtyGood>0, rackId set): ${pending.length}`);

  const byJob: Record<string, number> = {};
  for (const p of pending) {
    byJob[p.jobId] = (byJob[p.jobId] || 0) + 1;
  }

  const jobs = Object.entries(byJob).map(([jobId, count]) => ({ jobId, count }));
  jobs.sort((a, b) => b.count - a.count);

  for (const j of jobs) {
    const approval = await prisma.materialApproval.findFirst({
      where: { jobId: j.jobId, approvalType: 'JOB_COMPLETION_REPORT' },
      orderBy: { requestedAt: 'desc' },
      select: { status: true },
    });
    console.log(`Job ${j.jobId} pending returns: ${j.count} | approval status: ${approval?.status || 'NONE'}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

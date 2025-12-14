import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 CHECKING PENDING RESTOCKS...\n');
  
  const returns = await prisma.materialReturn.findMany({
    where: {
      restocked: false,
      quantityGood: { gt: 0 }
    },
    include: {
      material: { select: { name: true, totalQuantity: true } },
      job: { select: { jobCode: true, status: true } }
    },
    orderBy: { recordedAt: 'desc' },
    take: 20
  });

  console.log(`📊 PENDING RETURNS (not restocked): ${returns.length}\n`);
  
  returns.forEach(r => {
    console.log(`  ❌ Job: ${r.job.jobCode} (${r.job.status})`);
    console.log(`     Material: ${r.material.name} (Current Stock: ${r.material.totalQuantity})`);
    console.log(`     To Restock: ${r.quantityGood} | Restocked: ${r.restocked}`);
    console.log(`     Return ID: ${r.id}\n`);
  });

  // Check approvals
  const approvals = await prisma.materialApproval.findMany({
    where: {
      approvalType: 'JOB_COMPLETION_REPORT',
      status: 'APPROVED'
    },
    include: {
      job: { select: { jobCode: true } }
    },
    orderBy: { decidedAt: 'desc' },
    take: 5
  });

  console.log(`\n✅ RECENT APPROVED JOBS: ${approvals.length}\n`);
  approvals.forEach(a => {
    console.log(`  Job: ${a.job.jobCode} | Approved: ${a.decidedAt} | Status: ${a.status}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);

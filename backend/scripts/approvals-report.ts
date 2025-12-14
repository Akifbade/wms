import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const approvals = await prisma.materialApproval.findMany({
    where: { approvalType: 'JOB_COMPLETION_REPORT' },
    orderBy: { requestedAt: 'desc' },
    take: 20,
    select: { id: true, jobId: true, status: true, requestedAt: true, decidedAt: true },
  });
  console.log('Last 20 job completion approvals:');
  approvals.forEach(a => {
    console.log(`${a.id} | job ${a.jobId} | status ${a.status} | requested ${a.requestedAt?.toISOString() || 'n/a'} | decided ${a.decidedAt?.toISOString() || 'n/a'}`);
  });
}
main().catch(err=>{console.error(err);process.exit(1);}).finally(()=>prisma.$disconnect());

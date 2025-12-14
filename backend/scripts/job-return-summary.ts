import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const targetJobs = process.argv.slice(2);
async function main() {
  if (targetJobs.length === 0) {
    console.log('Usage: npx ts-node scripts/job-return-summary.ts <jobId> [...jobIds]');
    return;
  }
  for (const jobId of targetJobs) {
    const returns = await prisma.materialReturn.findMany({
      where: { jobId },
      select: { id: true, materialId: true, quantityGood: true, rackId: true, restocked: true },
    });
    const total = returns.length;
    const restocked = returns.filter(r=>r.restocked).length;
    const withRack = returns.filter(r=>r.rackId).length;
    console.log(`Job ${jobId}: returns=${total}, restocked=${restocked}, withRack=${withRack}`);
    returns.forEach(r=>{
      console.log(`  ${r.id} | mat ${r.materialId} | qtyGood ${r.quantityGood} | rack ${r.rackId || 'NONE'} | restocked ${r.restocked}`);
    });
  }
}
main().catch(err=>{console.error(err);process.exit(1);}).finally(()=>prisma.$disconnect());

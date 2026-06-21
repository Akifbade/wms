const PrismaClient = require('./node_modules/@prisma/client').PrismaClient;
const prisma = new PrismaClient();

async function test() {
  // Find returns created AFTER June 1, 2026 (after the fix)
  const recentReturns = await prisma.materialReturn.findMany({
    orderBy: { recordedAt: 'desc' },
    take: 10,
    where: {
      recordedAt: { gte: new Date('2026-06-01') }
    },
    include: { issue: true, material: true, job: true }
  });
  
  console.log('Returns from June 2026 onwards:');
  if (recentReturns.length === 0) {
    console.log('  NO returns found from June 2026 onwards');
  }
  recentReturns.forEach((r, i) => {
    console.log(`\n[${i+1}] ID: ${r.id.slice(-8)}, recordedAt: ${r.recordedAt}`);
    console.log(`    quantityUsed: ${r.quantityUsed}, quantityGood: ${r.quantityGood}, quantityDamaged: ${r.quantityDamaged}`);
    console.log(`    issueId: ${r.issueId?.slice(-8) || 'null'}, issueQty: ${r.issue?.quantity || 'null'}`);
    console.log(`    Material: ${r.material?.name || 'null'}`);
    console.log(`    Job: ${r.job?.jobCode || 'null'}`);
  });
  
  await prisma.$disconnect();
}

test().catch(e => console.error(e.message));
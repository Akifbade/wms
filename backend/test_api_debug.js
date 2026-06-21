const PrismaClient = require('./node_modules/@prisma/client').PrismaClient;
const prisma = new PrismaClient();

async function testAPI() {
  // Find the most recent job with material issues
  const recentJob = await prisma.movingJob.findFirst({
    orderBy: { createdAt: 'desc' },
    where: { materialIssues: { some: {} } },
    select: { id: true, jobCode: true }
  });
  
  if (!recentJob) {
    console.log('No job found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Testing job-materials API for job:', recentJob.jobCode, '-', recentJob.id);
  
  const issues = await prisma.materialIssue.findMany({
    where: { jobId: recentJob.id },
    include: {
      material: true,
      returns: {
        include: { damages: true },
        orderBy: { recordedAt: 'desc' },
        take: 1
      }
    },
    orderBy: { issuedAt: 'desc' }
  });
  
  console.log('\nAPI response would be:');
  console.log('[');
  issues.forEach((issue, i) => {
    const ret = issue.returns[0];
    console.log(`  {`);
    console.log(`    "id": "${issue.id}",`);
    console.log(`    "quantity": ${issue.quantity},`);
    console.log(`    "material": { "name": "${issue.material.name}", "sku": "${issue.material.sku}", "unit": "${issue.material.unit}" },`);
    console.log(`    "returns": [${ret ? `{"quantityUsed": ${ret.quantityUsed}, "quantityGood": ${ret.quantityGood}, "quantityDamaged": ${ret.quantityDamaged}, "recordedAt": "${ret.recordedAt}"}` : '[]'}]`);
    console.log(`  }${i < issues.length - 1 ? ',' : ''}`);
  });
  console.log(']');
  
  await prisma.$disconnect();
}

testAPI().catch(e => console.error(e.message));
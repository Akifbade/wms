const PrismaClient = require('./node_modules/@prisma/client').PrismaClient;
const prisma = new PrismaClient();

async function check() {
  const returns = await prisma.materialReturn.findMany({ 
    take: 5, 
    include: { issue: true, material: true },
    orderBy: { recordedAt: 'desc' }
  });
  returns.forEach(r => {
    console.log(`Return: ${r.id.slice(-6)}, issueId: ${r.issueId?.slice(-6)}, quantityUsed: ${r.quantityUsed}, issueQty: ${r.issue?.quantity}, material: ${r.material?.name}`);
  });
  await prisma.$disconnect();
}

check().catch(e => console.error(e.message));
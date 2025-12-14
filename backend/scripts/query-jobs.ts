import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ids = ['cmj3d0blf0001txq5phtjnb83','cmj3co2n40001ooyksq4b8k6x'];
  const jobs = await prisma.movingJob.findMany({ where: { id: { in: ids } }, select:{id:true,jobCode:true,status:true} });
  console.log(jobs);
}
main().catch(console.error).finally(()=>prisma.$disconnect());

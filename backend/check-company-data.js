const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check IN_WAREHOUSE shipments with companyId
  const shipments = await prisma.shipment.findMany({
    where: { status: 'IN_WAREHOUSE' },
    select: { id: true, name: true, status: true, cbm: true, companyId: true, rackId: true }
  });
  console.log('=== IN_WAREHOUSE Shipments ===');
  console.log(JSON.stringify(shipments, null, 2));
  
  // Check companies
  const companies = await prisma.company.findMany({ 
    select: { id: true, name: true } 
  });
  console.log('\n=== Companies ===');
  console.log(JSON.stringify(companies, null, 2));
  
  // Check users and their companyId
  const users = await prisma.user.findMany({
    select: { id: true, username: true, companyId: true, role: true }
  });
  console.log('\n=== Users ===');
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

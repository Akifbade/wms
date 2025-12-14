const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = "cmhbrx8e90000dyq1ryc0uel3";
  
  // Exact same query as dashboard.ts
  const [
    totalShipments,
    pendingShipments,
    inStorageShipments,
    releasedShipments,
    activeShipments,
  ] = await Promise.all([
    prisma.shipment.count({ where: { companyId } }),
    prisma.shipment.count({ where: { companyId, status: 'PENDING' } }),
    prisma.shipment.count({ where: { companyId, status: { in: ['IN_STORAGE', 'IN_WAREHOUSE'] } } }),
    prisma.shipment.count({ where: { companyId, status: 'RELEASED' } }),
    prisma.shipment.count({ where: { companyId, status: { in: ['IN_STORAGE', 'IN_WAREHOUSE'] } } }),
  ]);
  
  console.log('Dashboard Stats for companyId:', companyId);
  console.log('totalShipments:', totalShipments);
  console.log('pendingShipments:', pendingShipments);
  console.log('inStorageShipments:', inStorageShipments);
  console.log('releasedShipments:', releasedShipments);
  console.log('activeShipments:', activeShipments);
  
  // Check CBM calculation
  const activeShipmentsWithCBM = await prisma.shipment.findMany({
    where: { companyId, status: { in: ['IN_STORAGE', 'IN_WAREHOUSE'] } },
    select: { id: true, name: true, cbm: true }
  });
  console.log('\nActive shipments with CBM:');
  console.log(JSON.stringify(activeShipmentsWithCBM, null, 2));
  
  const totalCBM = activeShipmentsWithCBM.reduce((sum, s) => sum + (s.cbm || 0), 0);
  console.log('\nTotal CBM in Storage:', totalCBM);
}

main().catch(console.error).finally(() => prisma.$disconnect());

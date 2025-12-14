const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check shipment status counts
  const stats = await prisma.shipment.groupBy({ 
    by: ['status'], 
    _count: true 
  });
  console.log('=== Shipment Status Counts ===');
  console.log(JSON.stringify(stats, null, 2));
  
  // Check active shipments
  const activeShipments = await prisma.shipment.findMany({
    where: { status: { in: ['IN_WAREHOUSE', 'IN_STORAGE', 'STORED'] } },
    select: { id: true, trackingNumber: true, status: true, cbm: true, rackId: true }
  });
  console.log('\n=== Active Shipments (IN_WAREHOUSE/IN_STORAGE/STORED) ===');
  console.log(JSON.stringify(activeShipments, null, 2));
  
  // Check rack CBM data
  const racks = await prisma.rack.findMany({
    where: { cbmUsed: { gt: 0 } },
    select: { id: true, code: true, cbmCapacity: true, cbmUsed: true }
  });
  console.log('\n=== Racks with CBM Used ===');
  console.log(JSON.stringify(racks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

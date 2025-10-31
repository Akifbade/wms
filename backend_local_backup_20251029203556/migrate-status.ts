import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating shipment statuses...\n');

  // Get all shipments with ACTIVE status
  const activeShipments = await prisma.shipment.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, rackId: true, referenceId: true }
  });

  console.log(`Found ${activeShipments.length} shipments with ACTIVE status\n`);

  let pendingCount = 0;
  let inStorageCount = 0;

  for (const shipment of activeShipments) {
    const newStatus = shipment.rackId ? 'IN_STORAGE' : 'PENDING';
    
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: newStatus }
    });

    if (newStatus === 'PENDING') {
      pendingCount++;
      console.log(`✅ ${shipment.referenceId}: ACTIVE → PENDING`);
    } else {
      inStorageCount++;
      console.log(`✅ ${shipment.referenceId}: ACTIVE → IN_STORAGE`);
    }
  }

  console.log(`\n📊 Migration Complete:`);
  console.log(`   - ${pendingCount} shipments → PENDING`);
  console.log(`   - ${inStorageCount} shipments → IN_STORAGE`);

  // Show final status distribution
  console.log('\n📈 Final Status Distribution:');
  
  const statuses = await prisma.shipment.groupBy({
    by: ['status'],
    _count: true
  });

  statuses.forEach(({ status, _count }) => {
    const icon = status === 'PENDING' ? '⏳' : 
                 status === 'IN_STORAGE' ? '✅' : 
                 status === 'PARTIAL' ? '⚠' : '🔵';
    console.log(`   ${icon} ${status}: ${_count} shipments`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

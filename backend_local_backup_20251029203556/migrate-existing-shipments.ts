import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating existing shipments with user tracking data...\n');

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    console.error('❌ No admin user found! Create an admin user first.');
    return;
  }

  console.log(`✅ Using admin: ${adminUser.name} (${adminUser.email})\n`);

  // Get all shipments without createdById
  const shipments = await prisma.shipment.findMany({
    where: {
      createdById: null
    }
  });

  console.log(`📦 Found ${shipments.length} shipments to update\n`);

  let updated = 0;
  for (const shipment of shipments) {
    try {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          createdById: adminUser.id,
          // If already assigned to a rack
          ...(shipment.rackId && shipment.status === 'ACTIVE' ? {
            assignedById: adminUser.id
          } : {}),
          // If released
          ...(shipment.status === 'RELEASED' ? {
            releasedById: adminUser.id
          } : {})
        }
      });
      console.log(`✅ Updated: ${shipment.referenceId} (${shipment.name})`);
      updated++;
    } catch (error) {
      console.error(`❌ Failed to update ${shipment.referenceId}:`, error);
    }
  }

  console.log(`\n🎉 Migration complete! Updated ${updated}/${shipments.length} shipments.`);
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

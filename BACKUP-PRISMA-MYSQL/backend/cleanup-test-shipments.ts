import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    // Delete test shipments
    const deleted = await prisma.shipment.deleteMany({
      where: {
        referenceId: {
          startsWith: 'SH-PEND-'
        }
      }
    });
    
    console.log(`✓ Deleted ${deleted.count} test shipments (and their boxes cascade deleted)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();

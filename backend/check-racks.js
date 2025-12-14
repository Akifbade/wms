const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRacks() {
  try {
    const racks = await prisma.$queryRawUnsafe(
      'SELECT id, code, cbmCapacity, cbmUsed FROM racks WHERE deletedAt IS NULL'
    );
    console.log('Racks in database:');
    racks.forEach(r => {
      console.log(`  ${r.code}: cbmCapacity=${r.cbmCapacity}, cbmUsed=${r.cbmUsed}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRacks();

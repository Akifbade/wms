const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setCBMCapacity() {
  try {
    const result = await prisma.$executeRawUnsafe(
      'UPDATE racks SET cbmCapacity = 3.5 WHERE deletedAt IS NULL'
    );
    console.log('✅ Updated all racks with 3.5 CBM capacity');
    
    // Verify
    const racks = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM racks WHERE cbmCapacity = 3.5'
    );
    console.log('Total racks with 3.5 CBM:', racks[0].count);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setCBMCapacity();

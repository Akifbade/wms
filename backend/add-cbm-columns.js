const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCBMColumns() {
  try {
    // Check if columns exist first
    const columns = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM racks`);
    const columnNames = columns.map(c => c.Field);
    
    // Add cbmCapacity column if not exists
    if (!columnNames.includes('cbmCapacity')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE racks ADD COLUMN cbmCapacity FLOAT NULL`);
      console.log('✅ cbmCapacity column added');
    } else {
      console.log('ℹ️ cbmCapacity column already exists');
    }
    
    // Add cbmUsed column if not exists
    if (!columnNames.includes('cbmUsed')) {
      await prisma.$executeRawUnsafe(`ALTER TABLE racks ADD COLUMN cbmUsed FLOAT NOT NULL DEFAULT 0`);
      console.log('✅ cbmUsed column added');
    } else {
      console.log('ℹ️ cbmUsed column already exists');
    }
    
    // Verify
    const result = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM racks`);
    console.log('Current racks columns:', result.map(r => r.Field).join(', '));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addCBMColumns();

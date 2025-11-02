const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Starting rack zones and flexible capacity migration...');
    
    // Check if columns already exist and add them one by one
    const columns = [
      { name: 'zone', sql: 'ADD COLUMN zone VARCHAR(191) NULL DEFAULT \'Unassigned\'' },
      { name: 'zoneDescription', sql: 'ADD COLUMN zoneDescription TEXT NULL' },
      { name: 'capacityMode', sql: 'ADD COLUMN capacityMode VARCHAR(191) NULL DEFAULT \'FIXED\'' },
      { name: 'palletCapacity', sql: 'ADD COLUMN palletCapacity INT NULL' },
      { name: 'boxCapacity', sql: 'ADD COLUMN boxCapacity INT NULL' },
      { name: 'currentPallets', sql: 'ADD COLUMN currentPallets INT NULL DEFAULT 0' },
      { name: 'currentBoxes', sql: 'ADD COLUMN currentBoxes INT NULL DEFAULT 0' },
      { name: 'capacityNotes', sql: 'ADD COLUMN capacityNotes TEXT NULL' }
    ];
    
    for (const column of columns) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE racks ${column.sql}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column')) {
          console.log(`⏭️  Column already exists: ${column.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📊 New fields added to racks table:');
    console.log('   - zone (VARCHAR)');
    console.log('   - zoneDescription (TEXT)');
    console.log('   - capacityMode (VARCHAR)');
    console.log('   - palletCapacity (INT)');
    console.log('   - boxCapacity (INT)');
    console.log('   - currentPallets (INT)');
    console.log('   - currentBoxes (INT)');
    console.log('   - capacityNotes (TEXT)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

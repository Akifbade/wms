const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOverCapacityRacks() {
  try {
    console.log('🔧 Checking for over-capacity racks...\n');
    
    // Get all racks with CBM data
    const racks = await prisma.$queryRawUnsafe(`
      SELECT id, code, cbmCapacity, cbmUsed 
      FROM racks 
      WHERE deletedAt IS NULL
      ORDER BY code
    `);
    
    console.log('📊 Current rack status:');
    for (const rack of racks) {
      const capacity = Number(rack.cbmCapacity) || 0;
      const used = Number(rack.cbmUsed) || 0;
      const pct = capacity > 0 ? ((used / capacity) * 100).toFixed(1) : 'N/A';
      const status = capacity > 0 && used > capacity ? '⚠️ OVER CAPACITY' : '✅';
      console.log(`  ${rack.code}: ${used.toFixed(2)} / ${capacity} m³ (${pct}%) ${status}`);
      
      // List shipments in over-capacity racks
      if (capacity > 0 && used > capacity) {
        const shipments = await prisma.$queryRawUnsafe(`
          SELECT DISTINCT s.referenceId, s.cbm, s.originalBoxCount, s.clientName,
                 COUNT(sb.id) as boxesInRack
          FROM shipment_boxes sb
          JOIN shipments s ON s.id = sb.shipmentId
          WHERE sb.rackId = ? AND sb.status IN ('IN_STORAGE', 'STORED')
          GROUP BY s.id
          ORDER BY s.cbm DESC
        `, rack.id);
        
        console.log(`    📦 Shipments in ${rack.code}:`);
        for (const ship of shipments) {
          const cbm = Number(ship.cbm) || 0;
          console.log(`       - ${ship.referenceId}: ${cbm.toFixed(2)} m³ (${ship.boxesInRack} boxes) - ${ship.clientName || 'Unknown'}`);
        }
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixOverCapacityRacks();

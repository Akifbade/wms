const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unassignOverCapacityBoxes() {
  try {
    console.log('🔧 Unassigning boxes from over-capacity racks...\n');
    
    // Get over-capacity racks
    const racks = await prisma.$queryRawUnsafe(`
      SELECT id, code, cbmCapacity, cbmUsed 
      FROM racks 
      WHERE deletedAt IS NULL AND cbmCapacity > 0 AND cbmUsed > cbmCapacity
      ORDER BY code
    `);
    
    if (racks.length === 0) {
      console.log('✅ No over-capacity racks found!');
      return;
    }
    
    console.log(`Found ${racks.length} over-capacity racks:\n`);
    
    for (const rack of racks) {
      const capacity = Number(rack.cbmCapacity) || 0;
      const used = Number(rack.cbmUsed) || 0;
      console.log(`📦 ${rack.code}: ${used.toFixed(2)} / ${capacity} m³`);
      
      // Get all boxes in this rack
      const boxes = await prisma.$queryRawUnsafe(`
        SELECT sb.id, sb.shipmentId, sb.boxNumber, s.referenceId
        FROM shipment_boxes sb
        JOIN shipments s ON s.id = sb.shipmentId
        WHERE sb.rackId = ? AND sb.status IN ('IN_STORAGE', 'STORED')
      `, rack.id);
      
      console.log(`   Unassigning ${boxes.length} boxes...`);
      
      // Unassign all boxes from this rack
      await prisma.$executeRawUnsafe(`
        UPDATE shipment_boxes 
        SET rackId = NULL, status = 'PENDING', assignedAt = NULL
        WHERE rackId = ?
      `, rack.id);
      
      // Update shipment statuses to PENDING
      const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];
      for (const shipmentId of shipmentIds) {
        await prisma.$executeRawUnsafe(`
          UPDATE shipments SET status = 'PENDING' WHERE id = ?
        `, shipmentId);
      }
      
      // Reset rack cbmUsed to 0
      await prisma.$executeRawUnsafe(`
        UPDATE racks SET cbmUsed = 0, capacityUsed = 0 WHERE id = ?
      `, rack.id);
      
      console.log(`   ✅ Done! ${boxes.length} boxes unassigned, ${shipmentIds.length} shipments set to PENDING\n`);
    }
    
    console.log('═'.repeat(50));
    console.log('✅ All over-capacity racks cleared!');
    console.log('📋 Shipments are now in PENDING status - you can reassign them properly');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

unassignOverCapacityBoxes();

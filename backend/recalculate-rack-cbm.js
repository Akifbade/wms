const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateRackCBM() {
  try {
    console.log('🔄 Recalculating CBM for all racks...\n');
    
    // Get all racks
    const racks = await prisma.$queryRawUnsafe(`
      SELECT id, code FROM racks WHERE deletedAt IS NULL
    `);
    
    for (const rack of racks) {
      // Calculate total CBM from shipments assigned to this rack
      const result = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(DISTINCT s.cbm), 0) as totalCBM
        FROM shipment_boxes sb
        JOIN shipments s ON s.id = sb.shipmentId
        WHERE sb.rackId = ?
          AND s.status IN ('IN_STORAGE', 'IN_WAREHOUSE')
          AND s.cbm IS NOT NULL
      `, rack.id);
      
      const cbmUsed = parseFloat(result[0]?.totalCBM || 0);
      
      // Update rack cbmUsed
      await prisma.$executeRawUnsafe(`
        UPDATE racks SET cbmUsed = ? WHERE id = ?
      `, cbmUsed, rack.id);
      
      console.log(`  ✅ ${rack.code}: cbmUsed = ${cbmUsed.toFixed(3)} m³`);
    }
    
    console.log('\n✅ All racks CBM updated!');
    
    // Verify
    const updated = await prisma.$queryRawUnsafe(`
      SELECT code, cbmCapacity, cbmUsed FROM racks WHERE deletedAt IS NULL
    `);
    console.log('\nFinal rack status:');
    updated.forEach(r => {
      const pct = r.cbmCapacity > 0 ? ((r.cbmUsed / r.cbmCapacity) * 100).toFixed(1) : 0;
      console.log(`  ${r.code}: ${r.cbmUsed}/${r.cbmCapacity} m³ (${pct}% used)`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateRackCBM();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Recalculating CBM for all racks...');
    
    // Get all racks
    const racks = await prisma.$queryRawUnsafe('SELECT id, code FROM racks WHERE deletedAt IS NULL');
    
    for (const rack of racks) {
      // Calculate total CBM from shipments assigned to this rack
      // Now uses per-box CBM calculation based on shipment.cbm / originalBoxCount
      const result = await prisma.$queryRawUnsafe(`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN s.cbm > 0 AND s.originalBoxCount > 0 
              THEN s.cbm / s.originalBoxCount
              ELSE 0
            END
          ), 0) as totalCBM
        FROM shipment_boxes sb
        JOIN shipments s ON s.id = sb.shipmentId
        WHERE sb.rackId = ?
          AND sb.status IN ('IN_STORAGE', 'STORED')
          AND s.cbm IS NOT NULL
      `, rack.id);
      
      const cbmUsed = parseFloat(result[0]?.totalCBM || 0);
      
      // Update rack cbmUsed
      await prisma.$executeRawUnsafe('UPDATE racks SET cbmUsed = ? WHERE id = ?', cbmUsed, rack.id);
      
      console.log('  ✅ ' + rack.code + ': cbmUsed = ' + cbmUsed.toFixed(4) + ' m³');
    }
    
    console.log('\n✅ All racks CBM updated!');
    
    // Verify
    const updated = await prisma.$queryRawUnsafe('SELECT code, cbmCapacity, cbmUsed FROM racks WHERE deletedAt IS NULL ORDER BY code');
    console.log('\nFinal rack status:');
    updated.forEach(r => {
      const pct = r.cbmCapacity > 0 ? ((r.cbmUsed / r.cbmCapacity) * 100).toFixed(1) : 0;
      console.log('  ' + r.code + ': ' + r.cbmUsed + '/' + r.cbmCapacity + ' m³ (' + pct + '% used)');
    });
    
    // Also show shipments with CBM
    const shipments = await prisma.$queryRawUnsafe(`
      SELECT referenceId, cbm, originalBoxCount, status 
      FROM shipments 
      WHERE cbm > 0 AND status IN ('IN_STORAGE', 'IN_WAREHOUSE')
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    console.log('\n📦 Recent shipments with CBM:');
    shipments.forEach(s => {
      console.log('  ' + s.referenceId + ': ' + s.cbm + ' m³ (' + s.originalBoxCount + ' boxes) - ' + s.status);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

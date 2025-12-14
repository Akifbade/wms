const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShipmentsCBM() {
  try {
    // Get shipments with CBM that are in storage
    const shipments = await prisma.$queryRawUnsafe(`
      SELECT s.id, s.referenceId, s.name, s.cbm, s.status,
             sb.rackId, r.code as rackCode, r.cbmUsed as rackCbmUsed
      FROM shipments s
      LEFT JOIN shipment_boxes sb ON sb.shipmentId = s.id
      LEFT JOIN racks r ON r.id = sb.rackId
      WHERE s.status IN ('IN_STORAGE', 'IN_WAREHOUSE') 
        AND s.cbm IS NOT NULL AND s.cbm > 0
      LIMIT 20
    `);
    
    console.log('Shipments with CBM in storage:');
    shipments.forEach(s => {
      console.log(`  ${s.referenceId}: CBM=${s.cbm}, Status=${s.status}, Rack=${s.rackCode || 'NONE'}, RackCBMUsed=${s.rackCbmUsed}`);
    });
    
    // Get total CBM in shipments
    const totalCBM = await prisma.$queryRawUnsafe(`
      SELECT SUM(cbm) as totalCBM, COUNT(*) as count
      FROM shipments 
      WHERE status IN ('IN_STORAGE', 'IN_WAREHOUSE') 
        AND cbm IS NOT NULL AND cbm > 0
    `);
    console.log('\nTotal CBM in storage shipments:', totalCBM);
    
    // Check racks CBM
    const racks = await prisma.$queryRawUnsafe(`
      SELECT id, code, cbmCapacity, cbmUsed FROM racks WHERE deletedAt IS NULL
    `);
    console.log('\nRacks CBM status:');
    racks.forEach(r => {
      console.log(`  ${r.code}: capacity=${r.cbmCapacity}, used=${r.cbmUsed}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkShipmentsCBM();

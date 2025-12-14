/**
 * Recalculate ALL Rack CBM Usage
 * This script recalculates cbmUsed for every rack based on actual shipments stored in them
 * Run on VPS: docker exec -it wms-backend node scripts/recalculate-all-rack-cbm.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateAllRackCBM() {
  console.log('🔄 Starting CBM Recalculation for ALL Racks...\n');

  try {
    // Get all racks with raw SQL to access cbmUsed
    const racks = await prisma.$queryRaw`SELECT id, name, companyId, cbmUsed, cbmCapacity FROM racks`;
    console.log(`📦 Found ${racks.length} racks to process\n`);

    let updatedCount = 0;
    let totalOldCBM = 0;
    let totalNewCBM = 0;

    for (const rack of racks) {
      // Get all boxes in this rack with status IN_STORAGE or STORED
      const boxes = await prisma.shipmentBox.findMany({
        where: {
          rackId: rack.id,
          status: { in: ['IN_STORAGE', 'STORED'] }
        },
        include: {
          shipment: {
            select: {
              id: true,
              cbm: true,
              originalBoxCount: true,
              length: true,
              width: true,
              height: true,
            }
          }
        }
      });

      if (boxes.length === 0) {
        // No boxes, set CBM to 0
        const oldCBM = Number(rack.cbmUsed) || 0;
        if (oldCBM > 0) {
          await prisma.$executeRaw`UPDATE racks SET cbmUsed = 0 WHERE id = ${rack.id}`;
          console.log(`📭 ${rack.name}: ${oldCBM.toFixed(3)} → 0.000 (empty rack)`);
          totalOldCBM += oldCBM;
          updatedCount++;
        }
        continue;
      }

      // Calculate CBM per shipment
      const shipmentCBMMap = new Map();
      const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];

      for (const shipmentId of shipmentIds) {
        const box = boxes.find(b => b.shipmentId === shipmentId);
        const shipment = box.shipment;
        const totalBoxes = shipment.originalBoxCount || 1;
        let shipmentTotalCBM = 0;

        // Priority 1: Use shipment.cbm if available
        if (shipment.cbm && Number(shipment.cbm) > 0) {
          shipmentTotalCBM = Number(shipment.cbm);
        }
        // Priority 2: Calculate from L×W×H
        else if (shipment.length && shipment.width && shipment.height) {
          shipmentTotalCBM = (Number(shipment.length) * Number(shipment.width) * Number(shipment.height)) / 1000000;
        }
        // Priority 3: Check ShipmentDimension table
        else {
          try {
            const dimensions = await prisma.shipmentDimension.findMany({
              where: { shipmentId }
            });
            for (const dim of dimensions) {
              const cbm = (Number(dim.length) * Number(dim.width) * Number(dim.height) * (dim.pieces || 1)) / 1000000;
              shipmentTotalCBM += cbm;
            }
          } catch (e) {
            // ShipmentDimension table might not exist
          }
        }

        // Store per-box CBM
        const perBoxCBM = shipmentTotalCBM / totalBoxes;
        shipmentCBMMap.set(shipmentId, perBoxCBM);
      }

      // Calculate total rack CBM
      let newCBM = 0;
      for (const box of boxes) {
        const perBoxCBM = shipmentCBMMap.get(box.shipmentId) || 0;
        newCBM += perBoxCBM;
      }
      newCBM = Math.round(newCBM * 1000) / 1000;

      const oldCBM = Number(rack.cbmUsed) || 0;
      totalOldCBM += oldCBM;
      totalNewCBM += newCBM;

      if (Math.abs(newCBM - oldCBM) > 0.001) {
        await prisma.$executeRaw`UPDATE racks SET cbmUsed = ${newCBM} WHERE id = ${rack.id}`;
        console.log(`📊 ${rack.name}: ${oldCBM.toFixed(3)} → ${newCBM.toFixed(3)} (${boxes.length} boxes)`);
        updatedCount++;
      }
    }

    console.log('\n========================================');
    console.log('✅ CBM Recalculation Complete!');
    console.log(`   Racks Updated: ${updatedCount}`);
    console.log(`   Old Total CBM: ${totalOldCBM.toFixed(3)}`);
    console.log(`   New Total CBM: ${totalNewCBM.toFixed(3)}`);
    console.log(`   Difference: ${(totalNewCBM - totalOldCBM).toFixed(3)}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAllRackCBM();

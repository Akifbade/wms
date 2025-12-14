/**
 * Recalculate ALL Rack CBM Usage
 * This script recalculates cbmUsed for every rack based on actual shipments stored in them
 * Run on VPS: docker exec -it wms-backend node scripts/recalculate-all-rack-cbm.js
 */

const mysql = require('mysql2/promise');

async function recalculateAllRackCBM() {
  console.log('🔄 Starting CBM Recalculation for ALL Racks...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'wms-database',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wmspassword123',
    database: process.env.DB_NAME || 'warehouse_wms',
  });

  try {
    // Get all racks
    const [racks] = await connection.execute('SELECT id, name, companyId, cbmUsed, cbmCapacity FROM racks');
    console.log(`📦 Found ${racks.length} racks to process\n`);

    let updatedCount = 0;
    let totalOldCBM = 0;
    let totalNewCBM = 0;

    for (const rack of racks) {
      // Get all boxes in this rack with status IN_STORAGE or STORED
      const [boxes] = await connection.execute(
        `SELECT b.id, b.shipmentId, s.cbm, s.originalBoxCount, s.length, s.width, s.height
         FROM ShipmentBox b
         JOIN Shipment s ON b.shipmentId = s.id
         WHERE b.rackId = ? AND b.status IN ('IN_STORAGE', 'STORED')`,
        [rack.id]
      );

      if (boxes.length === 0) {
        // No boxes, set CBM to 0
        if (rack.cbmUsed > 0) {
          await connection.execute('UPDATE racks SET cbmUsed = 0 WHERE id = ?', [rack.id]);
          console.log(`📭 ${rack.name}: ${rack.cbmUsed.toFixed(3)} → 0.000 (empty rack)`);
          totalOldCBM += Number(rack.cbmUsed) || 0;
          updatedCount++;
        }
        continue;
      }

      // Calculate CBM per shipment
      const shipmentCBMMap = new Map();
      const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];

      for (const shipmentId of shipmentIds) {
        const box = boxes.find(b => b.shipmentId === shipmentId);
        const totalBoxes = box.originalBoxCount || 1;
        let shipmentTotalCBM = 0;

        // Priority 1: Use shipment.cbm if available
        if (box.cbm && Number(box.cbm) > 0) {
          shipmentTotalCBM = Number(box.cbm);
        }
        // Priority 2: Calculate from L×W×H
        else if (box.length && box.width && box.height) {
          shipmentTotalCBM = (Number(box.length) * Number(box.width) * Number(box.height)) / 1000000;
        }
        // Priority 3: Check ShipmentDimension table
        else {
          const [dimensions] = await connection.execute(
            'SELECT length, width, height, pieces FROM ShipmentDimension WHERE shipmentId = ?',
            [shipmentId]
          );
          for (const dim of dimensions) {
            const cbm = (Number(dim.length) * Number(dim.width) * Number(dim.height) * (dim.pieces || 1)) / 1000000;
            shipmentTotalCBM += cbm;
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
        await connection.execute('UPDATE racks SET cbmUsed = ? WHERE id = ?', [newCBM, rack.id]);
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
    await connection.end();
  }
}

recalculateAllRackCBM();

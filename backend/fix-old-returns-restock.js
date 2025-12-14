/**
 * FIX OLD RETURNS - Retroactive Restock
 * 
 * This script restocks all old material returns that were never restocked.
 * These returns were recorded before the approval system was implemented.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldReturns() {
  console.log('🔧 Starting retroactive restock of old returns...\n');

  try {
    // Find all returns that were never restocked
    const pendingReturns = await prisma.materialReturn.findMany({
      where: {
        restocked: false,
        quantityGood: { gt: 0 },
      },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            sku: true,
            totalQuantity: true,
            unit: true,
          },
        },
        job: {
          select: {
            jobCode: true,
            clientName: true,
          },
        },
      },
      orderBy: {
        recordedAt: 'asc',
      },
    });

    if (pendingReturns.length === 0) {
      console.log('✅ No pending returns found. All returns are already restocked!');
      return;
    }

    console.log(`📦 Found ${pendingReturns.length} returns that need restocking\n`);

    let totalRestocked = 0;
    const materialUpdates = new Map();

    // Group returns by material to batch update
    for (const ret of pendingReturns) {
      if (!ret.material) {
        console.log(`⚠️  Skipping return ${ret.id} - material not found`);
        continue;
      }

      const matId = ret.material.id;
      if (!materialUpdates.has(matId)) {
        materialUpdates.set(matId, {
          material: ret.material,
          returns: [],
          totalQuantity: 0,
        });
      }

      const entry = materialUpdates.get(matId);
      entry.returns.push(ret);
      entry.totalQuantity += ret.quantityGood;
    }

    console.log(`📊 Processing ${materialUpdates.size} materials...\n`);

    // Update each material's stock
    for (const [matId, data] of materialUpdates) {
      const { material, returns, totalQuantity } = data;
      
      console.log(`\n📦 ${material.name} (${material.sku})`);
      console.log(`   Current stock: ${material.totalQuantity} ${material.unit}`);
      console.log(`   Returns to add: ${totalQuantity} ${material.unit} from ${returns.length} return(s)`);

      // Update material stock
      const updatedMaterial = await prisma.packingMaterial.update({
        where: { id: matId },
        data: {
          totalQuantity: {
            increment: totalQuantity,
          },
        },
      });

      console.log(`   ✅ New stock: ${updatedMaterial.totalQuantity} ${material.unit}`);

      // Mark all returns as restocked
      const returnIds = returns.map(r => r.id);
      await prisma.materialReturn.updateMany({
        where: {
          id: { in: returnIds },
        },
        data: {
          restocked: true,
          restockedAt: new Date(),
        },
      });

      console.log(`   ✅ Marked ${returnIds.length} return(s) as restocked`);

      totalRestocked += totalQuantity;

      // Show job details
      returns.forEach(ret => {
        console.log(`      - Job ${ret.job?.jobCode || 'Unknown'}: ${ret.quantityGood} ${material.unit}`);
      });
    }

    console.log(`\n\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ RESTOCK COMPLETED SUCCESSFULLY!`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📦 Total items restocked: ${totalRestocked}`);
    console.log(`🔢 Materials updated: ${materialUpdates.size}`);
    console.log(`📋 Returns processed: ${pendingReturns.length}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

  } catch (error) {
    console.error('❌ Error during restock:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixOldReturns()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });

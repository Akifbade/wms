const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRackCapacities() {
  console.log('🔧 FIXING RACK CAPACITIES...\n');
  
  try {
    // Get all racks with their actual box counts
    const racks = await prisma.rack.findMany({
      include: {
        _count: { select: { boxes: true } }
      }
    });
    
    console.log(`Found ${racks.length} racks\n`);
    
    let fixed = 0;
    let errors = 0;
    
    for (const rack of racks) {
      const actualBoxes = rack._count.boxes;
      const recordedCapacity = rack.capacityUsed;
      
      if (actualBoxes !== recordedCapacity) {
        console.log(`🔄 Fixing ${rack.code}:`);
        console.log(`   Old: ${recordedCapacity} boxes`);
        console.log(`   New: ${actualBoxes} boxes`);
        
        try {
          await prisma.rack.update({
            where: { id: rack.id },
            data: { capacityUsed: actualBoxes }
          });
          
          console.log(`   ✅ Fixed!\n`);
          fixed++;
        } catch (err) {
          console.log(`   ❌ Error: ${err.message}\n`);
          errors++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fixed ${fixed} racks`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    
    // Run health check again
    console.log('\n🔍 Re-checking system health...\n');
    
    const racksAfter = await prisma.rack.findMany({
      include: { _count: { select: { boxes: true } } }
    });
    
    const stillBroken = racksAfter.filter(r => r.capacityUsed !== r._count.boxes);
    
    if (stillBroken.length === 0) {
      console.log('✅ ALL RACKS FIXED! System health restored!');
    } else {
      console.log(`⚠️  ${stillBroken.length} racks still have issues:`);
      stillBroken.forEach(r => {
        console.log(`   ${r.code}: ${r.capacityUsed} != ${r._count.boxes}`);
      });
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixRackCapacities();

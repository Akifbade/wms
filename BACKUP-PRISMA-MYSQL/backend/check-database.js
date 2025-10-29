const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 CHECKING DATABASE...\n');
    
    // Count all records
    const companyCount = await prisma.company.count();
    const userCount = await prisma.user.count();
    const shipmentCount = await prisma.shipment.count();
    const rackCount = await prisma.rack.count();
    const jobCount = await prisma.job.count();
    
    console.log('📊 RECORD COUNTS:');
    console.log('  Companies:', companyCount);
    console.log('  Users:', userCount);
    console.log('  Shipments:', shipmentCount);
    console.log('  Racks:', rackCount);
    console.log('  Jobs:', jobCount);
    console.log('');
    
    // Get company details
    if (companyCount > 0) {
      const company = await prisma.company.findFirst();
      console.log('🏢 COMPANY:');
      console.log('  ID:', company.id);
      console.log('  Name:', company.name);
      console.log('');
    }
    
    // Get user details
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true
        }
      });
      console.log('👥 USERS:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - Company: ${user.companyId}`);
      });
      console.log('');
    }
    
    // Get shipment details
    if (shipmentCount > 0) {
      const shipments = await prisma.shipment.findMany({
        select: {
          id: true,
          name: true,
          referenceId: true,
          status: true,
          companyId: true
        },
        take: 5
      });
      console.log('📦 SHIPMENTS:');
      shipments.forEach(ship => {
        console.log(`  - ${ship.referenceId}: ${ship.name} (${ship.status}) - Company: ${ship.companyId}`);
      });
      console.log('');
    }
    
    console.log('✅ DATABASE CHECK COMPLETE!\n');
    
  } catch (error) {
    console.error('❌ DATABASE ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

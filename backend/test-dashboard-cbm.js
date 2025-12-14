const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboard() {
  try {
    const companyId = 'cmhbrx8e90000dyq1ryc0uel3'; // Your company ID
    
    const racks = await prisma.$queryRawUnsafe(`
      SELECT cbmCapacity, cbmUsed FROM racks 
      WHERE companyId = ? AND status = 'ACTIVE' AND deletedAt IS NULL
    `, companyId);
    
    console.log('Active racks with CBM:', racks);
    
    const totalCBMCapacity = racks.reduce((sum, r) => sum + (r.cbmCapacity || 0), 0);
    const totalCBMUsed = racks.reduce((sum, r) => sum + (r.cbmUsed || 0), 0);
    
    console.log('Total CBM Capacity:', totalCBMCapacity);
    console.log('Total CBM Used:', totalCBMUsed);
    console.log('CBM Available:', totalCBMCapacity - totalCBMUsed);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboard();

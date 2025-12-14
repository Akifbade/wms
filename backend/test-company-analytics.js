const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = "cmhbrx8e90000dyq1ryc0uel3";
  
  // Get a company profile ID to test
  const profile = await prisma.companyProfile.findFirst({
    where: { companyId },
    select: { id: true, name: true }
  });
  
  if (!profile) {
    console.log('No company profile found');
    return;
  }
  
  console.log('Testing analytics for:', profile.name, '(', profile.id, ')');
  
  // Same query as contracts.ts analytics endpoint
  const shipments = await prisma.shipment.findMany({
    where: { companyId, companyProfileId: profile.id },
    select: {
      status: true,
      cbm: true,
      weight: true,
      createdAt: true
    }
  });
  
  const totalShipments = shipments.length;
  const activeShipments = shipments.filter(s => s.status === 'IN_STORAGE' || s.status === 'IN_WAREHOUSE').length;
  const pendingShipments = shipments.filter(s => s.status === 'PENDING').length;
  
  const totalCBM = shipments
    .filter(s => s.status === 'IN_STORAGE' || s.status === 'IN_WAREHOUSE')
    .reduce((sum, s) => sum + (parseFloat(s.cbm) || 0), 0);
  
  console.log('=== Company Analytics ===');
  console.log('totalShipments:', totalShipments);
  console.log('activeShipments:', activeShipments);
  console.log('pendingShipments:', pendingShipments);
  console.log('totalCBM:', totalCBM);
}

main().catch(console.error).finally(() => prisma.$disconnect());

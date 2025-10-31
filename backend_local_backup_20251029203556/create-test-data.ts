import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Get first company
    const company = await prisma.company.findFirst();
    
    if (!company) {
      console.error('No company found!');
      return;
    }

    console.log(`Using company: ${company.name} (${company.id})`);

    // Create racks if they don't exist
    const existingRacks = await prisma.rack.count({ where: { companyId: company.id } });
    
    if (existingRacks === 0) {
      console.log('Creating racks...');
      
      const rackCodes = ['A1-01', 'A1-02', 'A1-03', 'B2-01', 'B2-02', 'C3-01'];
      
      for (const code of rackCodes) {
        await prisma.rack.create({
          data: {
            code,
            qrCode: `QR-RACK-${code}`,
            location: `Warehouse Section ${code}`,
            capacityTotal: 50,
            capacityUsed: 0,
            status: 'AVAILABLE',
            companyId: company.id,
          },
        });
        console.log(`✓ Created rack: ${code}`);
      }
    } else {
      console.log(`Racks already exist: ${existingRacks} racks`);
    }

    // Create PENDING shipments
    console.log('\nCreating PENDING shipments...');
    
    const now = new Date();
    const shipments = [
      {
        name: 'Pending Shipment 1',
        referenceId: `SH-PEND-${Date.now()}`,
        qrCode: `QR-SH-PEND-${Date.now()}`,
        arrivalDate: now,
        originalBoxCount: 5,
        currentBoxCount: 5,
        type: 'COMMERCIAL' as const,
        status: 'PENDING' as const,
        clientName: 'Test Client 1',
        clientPhone: '+1234567890',
        clientEmail: 'client1@test.com',
        notes: 'Test pending shipment for scanner',
        isWarehouseShipment: false,
        companyId: company.id,
      },
      {
        name: 'Pending Shipment 2',
        referenceId: `SH-PEND-${Date.now() + 1}`,
        qrCode: `QR-SH-PEND-${Date.now() + 1}`,
        arrivalDate: now,
        originalBoxCount: 3,
        currentBoxCount: 3,
        type: 'PERSONAL' as const,
        status: 'PENDING' as const,
        clientName: 'Test Client 2',
        clientPhone: '+9876543210',
        clientEmail: 'client2@test.com',
        notes: 'Another test shipment',
        isWarehouseShipment: false,
        companyId: company.id,
      },
    ];

    for (const shipmentData of shipments) {
      const shipment = await prisma.shipment.create({
        data: shipmentData,
      });
      console.log(`✓ Created shipment: ${shipment.referenceId} (${shipment.status})`);
      
      // Create boxes for this shipment
      const boxCount = shipmentData.currentBoxCount;
      for (let i = 1; i <= boxCount; i++) {
        await prisma.shipmentBox.create({
          data: {
            boxNumber: i,
            qrCode: `${shipmentData.qrCode}-BOX-${i}`,
            shipmentId: shipment.id,
            companyId: company.id,
          },
        });
      }
      console.log(`  ✓ Created ${boxCount} boxes for this shipment`);
    }

    // Summary
    const totalRacks = await prisma.rack.count({ where: { companyId: company.id } });
    const totalShipments = await prisma.shipment.count({ where: { companyId: company.id } });
    const pendingShipments = await prisma.shipment.count({ 
      where: { companyId: company.id, status: 'PENDING' } 
    });

    console.log('\n✅ Test Data Created Successfully!');
    console.log(`Total Racks: ${totalRacks}`);
    console.log(`Total Shipments: ${totalShipments}`);
    console.log(`Pending Shipments: ${pendingShipments}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();

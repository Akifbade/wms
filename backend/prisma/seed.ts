import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Get or create demo company
  let company = await prisma.company.findUnique({
    where: { email: 'admin@demowarehouse.com' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Demo Warehouse Co.',
        email: 'admin@demowarehouse.com',
        phone: '+965 1234 5678',
        address: 'Kuwait City, Kuwait',
        website: 'https://demowarehouse.com',
        plan: 'PRO',
        ratePerDay: 2.5,
        currency: 'KWD',
        isActive: true,
      },
    });
    console.log('✅ Company created:', company.name);
  } else {
    console.log('✅ Company already exists:', company.name);
  }

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+965 9876 5432',
      role: 'ADMIN',
      isActive: true,
      skills: JSON.stringify(['management', 'operations']),
    },
  });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'manager@demo.com',
      password: hashedPassword,
      name: 'John Manager',
      phone: '+965 5555 1111',
      role: 'MANAGER',
      isActive: true,
      skills: JSON.stringify(['inventory', 'scheduling']),
    },
  });

  const worker1 = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'worker1@demo.com',
      password: hashedPassword,
      name: 'Ali Worker',
      phone: '+965 5555 2222',
      role: 'WORKER',
      isActive: true,
      skills: JSON.stringify(['packing', 'loading']),
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'worker2@demo.com',
      password: hashedPassword,
      name: 'Ahmed Khan',
      phone: '+965 5555 3333',
      role: 'WORKER',
      isActive: true,
      skills: JSON.stringify(['driving', 'heavy-lifting']),
    },
  });

  console.log('✅ Users created: 4 users');

  // Create racks in different sections
  const racks = [];
  const sections = ['A', 'B', 'C'];
  
  for (const section of sections) {
    for (let row = 1; row <= 5; row++) {
      for (let position = 1; position <= 4; position++) {
        const rackCode = `${section}${row}-${position}`;
        const rack = await prisma.rack.create({
          data: {
            companyId: company.id,
            code: rackCode,
            qrCode: `QR-${rackCode}`,
            rackType: 'STORAGE',
            location: `Section ${section}, Row ${row}`,
            capacityTotal: 100,
            capacityUsed: 0,
            status: 'ACTIVE',
          },
        });
        racks.push(rack);
      }
    }
  }

  console.log(`✅ Racks created: ${racks.length} racks`);

  // Create customers
  const customers = [
    { name: 'Mohammed Al-Rashid', phone: '+965 6666 1111', address: 'Salmiya, Kuwait' },
    { name: 'Fatima Al-Sabah', phone: '+965 6666 2222', address: 'Hawalli, Kuwait' },
    { name: 'Abdullah Khan', phone: '+965 6666 3333', address: 'Farwaniya, Kuwait' },
  ];

  // Create shipments
  for (let i = 0; i < 3; i++) {
    const customer = customers[i];
    const assignedRack = racks[i * 10]; // Assign to a rack
    const boxCount = 15 + i * 5;

    const shipment = await prisma.shipment.create({
      data: {
        companyId: company.id,
        name: `${customer.name} Shipment`,
        referenceId: `SH-2024-${String(1001 + i).padStart(4, '0')}`,
        originalBoxCount: boxCount,
        currentBoxCount: boxCount,
        type: 'PERSONAL',
        arrivalDate: new Date(),
        clientName: customer.name,
        clientPhone: customer.phone,
        qrCode: `QR-SH-${1001 + i}`,
        status: 'ACTIVE',
        rackId: assignedRack.id,
        assignedAt: new Date(),
        storageCharge: boxCount * company.ratePerDay * 30, // 30 days estimate
      },
    });

    // Update rack capacity
    await prisma.rack.update({
      where: { id: assignedRack.id },
      data: { 
        capacityUsed: { increment: boxCount },
        lastActivity: new Date(),
      },
    });

    // Create rack inventory entry
    await prisma.rackInventory.create({
      data: {
        rackId: assignedRack.id,
        companyId: company.id,
        itemType: 'SHIPMENT',
        itemId: shipment.id,
        quantityCurrent: boxCount,
        quantityReserved: 0,
      },
    });

    // Create rack activity
    await prisma.rackActivity.create({
      data: {
        rackId: assignedRack.id,
        userId: admin.id,
        companyId: company.id,
        activityType: 'ASSIGN',
        itemDetails: `Shipment ${shipment.referenceId} - ${boxCount} boxes`,
        quantityBefore: 0,
        quantityAfter: boxCount,
        notes: `Initial shipment assignment for ${customer.name}`,
      },
    });

    console.log(`✅ Shipment created: ${shipment.referenceId} with ${boxCount} boxes`);
  }

  // Create some moving jobs
  const movingStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
  for (let i = 0; i < 5; i++) {
    const customer = customers[i % customers.length];
    
    const job = await prisma.movingJob.create({
      data: {
        companyId: company.id,
        jobCode: `JOB-${String(i + 1).padStart(4, '0')}`,
        jobTitle: `Moving Job for ${customer.name}`,
        clientName: customer.name,
        clientPhone: customer.phone,
        jobAddress: i % 2 === 0 ? 'Warehouse - Kuwait City' : customer.address,
        dropoffAddress: i % 2 === 0 ? customer.address : 'Warehouse - Kuwait City',
        jobDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // Future dates
        status: movingStatuses[i % 3],
        teamLeaderId: i % 2 === 0 ? worker1.id : worker2.id,
      },
    });

    // Assign workers to jobs using JobAssignment model
    await prisma.jobAssignment.create({
      data: {
        jobId: job.id,
        userId: worker1.id,
        role: 'TEAM_LEAD',
        companyId: company.id,
      },
    });

    await prisma.jobAssignment.create({
      data: {
        jobId: job.id,
        userId: worker2.id,
        role: 'HELPER',
        companyId: company.id,
      },
    });
  }

  console.log('✅ Moving jobs created: 5 jobs with team members');

  // Create invoice settings
  await prisma.invoiceSettings.create({
    data: {
      companyId: company.id,
      templateType: 'MODERN',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      showLogo: true,
      footerText: 'Thank you for your business!',
      termsConditions: 'Payment due within 30 days. Late payments will incur additional charges.',
    },
  });

  console.log('✅ Invoice settings created');

  // Create some expenses
  await prisma.expense.create({
    data: {
      companyId: company.id,
      title: 'Warehouse Maintenance',
      category: 'MAINTENANCE',
      amount: 150.5,
      currency: 'KWD',
      description: 'Monthly warehouse cleaning and maintenance',
      expenseDate: new Date(),
      status: 'APPROVED',
      approvedBy: admin.id,
    },
  });

  await prisma.expense.create({
    data: {
      companyId: company.id,
      title: 'Fuel for Delivery Truck',
      category: 'FUEL',
      amount: 45.0,
      currency: 'KWD',
      description: 'Fuel refill for truck #2',
      expenseDate: new Date(),
      status: 'PENDING',
    },
  });

  console.log('✅ Expenses created: 2 expenses');

  // Create custom fields
  await prisma.customField.create({
    data: {
      companyId: company.id,
      fieldName: 'Fragile Items',
      fieldType: 'DROPDOWN',
      fieldOptions: JSON.stringify(['Yes', 'No']),
      isRequired: false,
      isActive: true,
      section: 'SHIPMENT',
    },
  });

  await prisma.customField.create({
    data: {
      companyId: company.id,
      fieldName: 'Special Instructions',
      fieldType: 'TEXT',
      isRequired: false,
      isActive: true,
      section: 'JOB',
    },
  });

  console.log('✅ Custom fields created: 2 fields');

  // Create or get Billing Settings
  let billingSettings = await prisma.billingSettings.findUnique({
    where: { companyId: company.id },
  });

  if (!billingSettings) {
    billingSettings = await prisma.billingSettings.create({
      data: {
        companyId: company.id,
      storageRateType: 'PER_DAY',
      storageRatePerBox: 0.500,
      taxEnabled: true,
      taxRate: 5.0,
      currency: 'KWD',
      invoicePrefix: 'INV',
      invoiceDueDays: 10,
      gracePeriodDays: 3,
      minimumCharge: 10.0,
      logoPosition: 'LEFT',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      showCompanyDetails: true,
      showBankDetails: true,
      showTermsConditions: true,
      bankName: 'National Bank of Kuwait',
      accountName: 'Demo Warehouse Co.',
      accountNumber: '1234567890',
      iban: 'KW81CBKU0000000000001234567890',
      swiftCode: 'NBOKKWKW',
      invoiceFooterText: 'Thank you for your business! For queries, contact us at admin@demowarehouse.com',
      paymentInstructions: '- Payment due within 10 days\n- Bank transfer preferred\n- Use invoice number as reference\n- Late payments incur 5% penalty',
      termsAndConditions: '1. All storage rates are in KWD\n2. Charges calculated from arrival date minus grace period\n3. Grace period: First 3 days free\n4. Company not liable for damaged goods\n5. Insurance recommended for valuable items',
      taxRegistrationNo: 'TAX-123456789',
      companyRegistrationNo: 'CR-987654321',
      },
    });
  }

  console.log('✅ Billing settings created or already exists');

  // Create default charge types
  const chargeTypes = [
    {
      name: 'Storage Fee',
      code: 'STORAGE',
      description: 'Daily storage charges per box',
      category: 'STORAGE',
      calculationType: 'PER_BOX',
      rate: 0.500,
      applyOnRelease: true,
      applyOnStorage: true,
      isTaxable: true,
      isActive: true,
      isDefault: true,
      displayOrder: 1,
    },
    {
      name: 'Box Handling Fee',
      code: 'HANDLING',
      description: 'Handling fee per box on release',
      category: 'RELEASE',
      calculationType: 'PER_BOX',
      rate: 2.000,
      applyOnRelease: true,
      applyOnStorage: false,
      isTaxable: true,
      isActive: true,
      isDefault: true,
      displayOrder: 2,
    },
    {
      name: 'Documentation Fee',
      code: 'DOCUMENTATION',
      description: 'Documentation and paperwork processing',
      category: 'RELEASE',
      calculationType: 'FLAT',
      rate: 5.000,
      applyOnRelease: true,
      applyOnStorage: false,
      isTaxable: true,
      isActive: true,
      isDefault: true,
      displayOrder: 3,
    },
    {
      name: 'Insurance Fee',
      code: 'INSURANCE',
      description: 'Shipment insurance coverage',
      category: 'SERVICE',
      calculationType: 'PERCENTAGE',
      rate: 2.5,
      applyOnRelease: false,
      applyOnStorage: false,
      isTaxable: true,
      isActive: true,
      isDefault: false,
      displayOrder: 4,
    },
    {
      name: 'Loading Service',
      code: 'LOADING',
      description: 'Loading and unloading service',
      category: 'SERVICE',
      calculationType: 'PER_BOX',
      rate: 1.500,
      minCharge: 20.000,
      applyOnRelease: false,
      applyOnStorage: false,
      isTaxable: true,
      isActive: true,
      isDefault: false,
      displayOrder: 5,
    },
    {
      name: 'Packaging Materials',
      code: 'PACKAGING',
      description: 'Bubble wrap, boxes, and packing materials',
      category: 'SERVICE',
      calculationType: 'FLAT',
      rate: 15.000,
      applyOnRelease: false,
      applyOnStorage: false,
      isTaxable: true,
      isActive: true,
      isDefault: false,
      displayOrder: 6,
    },
    {
      name: 'Rush Release Fee',
      code: 'RUSH',
      description: 'Emergency same-day release service',
      category: 'SERVICE',
      calculationType: 'PERCENTAGE',
      rate: 20.0,
      applyOnRelease: false,
      applyOnStorage: false,
      isTaxable: true,
      isActive: true,
      isDefault: false,
      displayOrder: 7,
    },
  ];

  for (const chargeType of chargeTypes) {
    await prisma.chargeType.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: chargeType.code,
        },
      },
      update: {},
      create: {
        ...chargeType,
        companyId: company.id,
        billingSettingsId: billingSettings.id,
      },
    });
  }

  console.log('✅ Charge types created or already exist: 7 types');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Email: admin@demo.com');
  console.log('   Password: demo123');
  console.log('   Role: Admin\n');
  console.log('   Email: manager@demo.com');
  console.log('   Password: demo123');
  console.log('   Role: Manager\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

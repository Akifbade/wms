import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addBillingData() {
  console.log('🌱 Adding billing data...');

  const company = await prisma.company.findFirst();

  if (!company) {
    console.log('❌ No company found');
    return;
  }

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
    console.log('✅ Billing settings created');
  } else {
    console.log('✅ Billing settings already exist');
  }

  // Create default charge types
  const chargeTypes = [
    { name: 'Storage Fee', code: 'STORAGE', description: 'Daily storage charges per box', category: 'STORAGE', calculationType: 'PER_BOX', rate: 0.500, applyOnRelease: true, applyOnStorage: true, isTaxable: true, isActive: true, isDefault: true, displayOrder: 1 },
    { name: 'Box Handling Fee', code: 'HANDLING', description: 'Handling fee per box on release', category: 'RELEASE', calculationType: 'PER_BOX', rate: 2.000, applyOnRelease: true, applyOnStorage: false, isTaxable: true, isActive: true, isDefault: true, displayOrder: 2 },
    { name: 'Documentation Fee', code: 'DOCUMENTATION', description: 'Documentation and paperwork processing', category: 'RELEASE', calculationType: 'FLAT', rate: 5.000, applyOnRelease: true, applyOnStorage: false, isTaxable: true, isActive: true, isDefault: true, displayOrder: 3 },
    { name: 'Insurance Fee', code: 'INSURANCE', description: 'Shipment insurance coverage', category: 'SERVICE', calculationType: 'PERCENTAGE', rate: 2.5, applyOnRelease: false, applyOnStorage: false, isTaxable: true, isActive: true, isDefault: false, displayOrder: 4 },
    { name: 'Loading Service', code: 'LOADING', description: 'Loading and unloading service', category: 'SERVICE', calculationType: 'PER_BOX', rate: 1.500, minCharge: 20.000, applyOnRelease: false, applyOnStorage: false, isTaxable: true, isActive: true, isDefault: false, displayOrder: 5 },
    { name: 'Packaging Materials', code: 'PACKAGING', description: 'Bubble wrap, boxes, and packing materials', category: 'SERVICE', calculationType: 'FLAT', rate: 15.000, applyOnRelease: false, applyOnStorage: false, isTaxable: true, isActive: true, isDefault: false, displayOrder: 6 },
    { name: 'Rush Release Fee', code: 'RUSH', description: 'Emergency same-day release service', category: 'SERVICE', calculationType: 'PERCENTAGE', rate: 20.0, applyOnRelease: false, applyOnStorage: false, isTaxable: true, isActive: true, isDefault: false, displayOrder: 7 },
  ];

  for (const chargeType of chargeTypes) {
    const existing = await prisma.chargeType.findFirst({
      where: {
        companyId: company.id,
        code: chargeType.code,
      },
    });

    if (!existing) {
      await prisma.chargeType.create({
        data: {
          ...chargeType,
          companyId: company.id,
          billingSettingsId: billingSettings.id,
        },
      });
      console.log(`✅ Created charge type: ${chargeType.name}`);
    } else {
      console.log(`✅ Charge type already exists: ${chargeType.name}`);
    }
  }

  console.log('\n🎉 Billing data added successfully!');
}

addBillingData()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

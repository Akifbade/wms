const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemHealth() {
  console.log('🔍 DEEP SYSTEM HEALTH CHECK - STARTED\n');
  console.log('='.repeat(80));
  
  const issues = [];
  const warnings = [];
  const info = [];

  try {
    // ============================================
    // 1. CHECK COMPANY (ROOT)
    // ============================================
    console.log('\n📊 1. COMPANY CHECK');
    console.log('-'.repeat(80));
    
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            racks: true,
            shipments: true,
            movingJobs: true,
            companyProfiles: true,
            invoices: true,
            customFields: true
          }
        }
      }
    });
    
    console.log(`✅ Total Companies: ${companies.length}`);
    companies.forEach(c => {
      console.log(`\n   🏢 ${c.name} (${c.id})`);
      console.log(`      - Users: ${c._count.users}`);
      console.log(`      - Racks: ${c._count.racks}`);
      console.log(`      - Shipments: ${c._count.shipments}`);
      console.log(`      - Moving Jobs: ${c._count.movingJobs}`);
      console.log(`      - Company Profiles: ${c._count.companyProfiles}`);
      console.log(`      - Invoices: ${c._count.invoices}`);
      console.log(`      - Custom Fields: ${c._count.customFields}`);
      
      if (c._count.users === 0) {
        warnings.push(`⚠️  Company "${c.name}" has NO users`);
      }
    });

    // ============================================
    // 2. CHECK USERS & AUTH
    // ============================================
    console.log('\n\n📊 2. USERS & AUTHENTICATION CHECK');
    console.log('-'.repeat(80));
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        isActive: true,
        company: { select: { name: true } }
      }
    });
    
    console.log(`✅ Total Users: ${users.length}`);
    users.forEach(u => {
      console.log(`   👤 ${u.email} (${u.role}) - ${u.company?.name || '❌ NO COMPANY'}`);
      
      if (!u.company) {
        issues.push(`❌ User "${u.email}" has invalid companyId: ${u.companyId}`);
      }
      if (!u.isActive) {
        info.push(`ℹ️  User "${u.email}" is INACTIVE`);
      }
    });

    // ============================================
    // 3. CHECK SHIPMENTS & BOXES RELATIONSHIP
    // ============================================
    console.log('\n\n📊 3. SHIPMENTS & BOXES RELATIONSHIP');
    console.log('-'.repeat(80));
    
    const shipments = await prisma.shipment.findMany({
      include: {
        boxes: true,
        company: { select: { name: true } },
        _count: { select: { boxes: true } }
      }
    });
    
    console.log(`✅ Total Shipments: ${shipments.length}`);
    
    for (const ship of shipments) {
      const boxCountMatch = ship.currentBoxCount === ship._count.boxes;
      const status = boxCountMatch ? '✅' : '❌';
      
      console.log(`   ${status} ${ship.referenceId} - Company: ${ship.company?.name || '❌ MISSING'}`);
      console.log(`      Expected: ${ship.currentBoxCount} | Actual: ${ship._count.boxes} boxes`);
      console.log(`      Status: ${ship.status}`);
      
      if (!boxCountMatch) {
        issues.push(`❌ Shipment ${ship.referenceId}: currentBoxCount (${ship.currentBoxCount}) != actual boxes (${ship._count.boxes})`);
      }
      
      if (!ship.company) {
        issues.push(`❌ Shipment ${ship.referenceId} has invalid companyId: ${ship.companyId}`);
      }
      
      // Check boxes relationship
      const orphanBoxes = ship.boxes.filter(b => b.shipmentId !== ship.id);
      if (orphanBoxes.length > 0) {
        issues.push(`❌ Shipment ${ship.referenceId} has ${orphanBoxes.length} orphan boxes`);
      }
    }

    // ============================================
    // 4. CHECK BOXES & RACKS RELATIONSHIP
    // ============================================
    console.log('\n\n📊 4. BOXES & RACKS RELATIONSHIP');
    console.log('-'.repeat(80));
    
    const boxes = await prisma.shipmentBox.findMany({
      include: {
        rack: { select: { code: true } },
        shipment: { select: { referenceId: true } }
      }
    });
    
    console.log(`✅ Total Boxes: ${boxes.length}`);
    
    const assignedBoxes = boxes.filter(b => b.rackId);
    const unassignedBoxes = boxes.filter(b => !b.rackId);
    
    console.log(`   📦 Assigned to Racks: ${assignedBoxes.length}`);
    console.log(`   📦 Unassigned: ${unassignedBoxes.length}`);
    
    for (const box of boxes) {
      if (!box.shipment) {
        issues.push(`❌ Box ${box.qrCode} has invalid shipmentId: ${box.shipmentId}`);
      }
      
      if (box.rackId && !box.rack) {
        issues.push(`❌ Box ${box.qrCode} has invalid rackId: ${box.rackId}`);
      }
      
      if (box.rackId && box.status === 'PENDING') {
        warnings.push(`⚠️  Box ${box.qrCode} is assigned to rack but status is PENDING`);
      }
    }

    // ============================================
    // 5. CHECK RACKS & INVENTORY
    // ============================================
    console.log('\n\n📊 5. RACKS & INVENTORY');
    console.log('-'.repeat(80));
    
    const racks = await prisma.rack.findMany({
      include: {
        boxes: true,
        company: { select: { name: true } },
        _count: { select: { boxes: true } }
      }
    });
    
    console.log(`✅ Total Racks: ${racks.length}`);
    
    for (const rack of racks) {
      const usage = `${rack.capacityUsed}/${rack.capacityTotal}`;
      const percent = ((rack.capacityUsed / rack.capacityTotal) * 100).toFixed(1);
      const status = rack.capacityUsed <= rack.capacityTotal ? '✅' : '❌';
      
      console.log(`   ${status} ${rack.code} - ${usage} (${percent}%) - ${rack._count.boxes} boxes`);
      
      if (rack.capacityUsed > rack.capacityTotal) {
        issues.push(`❌ Rack ${rack.code} is OVERCAPACITY: ${rack.capacityUsed}/${rack.capacityTotal}`);
      }
      
      if (!rack.company) {
        issues.push(`❌ Rack ${rack.code} has invalid companyId: ${rack.companyId}`);
      }
      
      // Check if capacityUsed matches actual boxes
      if (rack.capacityUsed !== rack._count.boxes) {
        warnings.push(`⚠️  Rack ${rack.code}: capacityUsed (${rack.capacityUsed}) != actual boxes (${rack._count.boxes})`);
      }
    }

    // ============================================
    // 6. CHECK COMPANY PROFILES (CUSTOMERS)
    // ============================================
    console.log('\n\n📊 6. COMPANY PROFILES (CUSTOMERS/VENDORS)');
    console.log('-'.repeat(80));
    
    const profiles = await prisma.companyProfile.findMany({
      include: {
        company: { select: { name: true } },
        _count: { select: { racks: true } }
      }
    });
    
    console.log(`✅ Total Company Profiles: ${profiles.length}`);
    
    for (const profile of profiles) {
      console.log(`   👥 ${profile.name} (${profile.type})`);
      console.log(`      - Racks: ${profile._count.racks}`);
      console.log(`      - Owner: ${profile.company?.name || '❌ MISSING'}`);
      
      if (!profile.company) {
        issues.push(`❌ CompanyProfile "${profile.name}" has invalid companyId: ${profile.companyId}`);
      }
    }

    // ============================================
    // 7. CHECK SETTINGS & CONFIGURATIONS
    // ============================================
    console.log('\n\n📊 7. SETTINGS & CONFIGURATIONS');
    console.log('-'.repeat(80));
    
    const shipmentSettings = await prisma.shipmentSettings.count();
    const billingSettings = await prisma.billingSettings.count();
    const invoiceSettings = await prisma.invoiceSettings.count();
    
    console.log(`   ⚙️  Shipment Settings: ${shipmentSettings}`);
    console.log(`   ⚙️  Billing Settings: ${billingSettings}`);
    console.log(`   ⚙️  Invoice Settings: ${invoiceSettings}`);
    
    if (companies.length > 0) {
      companies.forEach(c => {
        if (shipmentSettings === 0) {
          warnings.push(`⚠️  Company "${c.name}" has NO ShipmentSettings`);
        }
        if (billingSettings === 0) {
          warnings.push(`⚠️  Company "${c.name}" has NO BillingSettings`);
        }
      });
    }

    // ============================================
    // 8. CHECK INVOICES & PAYMENTS
    // ============================================
    console.log('\n\n📊 8. INVOICES & PAYMENTS');
    console.log('-'.repeat(80));
    
    const invoices = await prisma.invoice.findMany({
      include: {
        _count: { select: { lineItems: true, payments: true } },
        company: { select: { name: true } }
      }
    });
    
    console.log(`✅ Total Invoices: ${invoices.length}`);
    
    for (const invoice of invoices) {
      console.log(`   📄 ${invoice.invoiceNumber} - ${invoice.company?.name || '❌ MISSING'}`);
      console.log(`      Total: ${invoice.totalAmount} | Paid: ${invoice.paidAmount} | Status: ${invoice.status}`);
      console.log(`      Line Items: ${invoice._count.lineItems} | Payments: ${invoice._count.payments}`);
      
      if (!invoice.company) {
        issues.push(`❌ Invoice ${invoice.invoiceNumber} has invalid companyId`);
      }
      
      if (invoice._count.lineItems === 0) {
        warnings.push(`⚠️  Invoice ${invoice.invoiceNumber} has NO line items`);
      }
    }

    // ============================================
    // 9. CHECK ORPHAN RECORDS
    // ============================================
    console.log('\n\n📊 9. ORPHAN RECORDS CHECK');
    console.log('-'.repeat(80));
    
    // Check for boxes with invalid shipmentId
    const allBoxes = await prisma.shipmentBox.findMany({
      select: { id: true, qrCode: true, shipmentId: true }
    });
    
    const allShipmentIds = await prisma.shipment.findMany({
      select: { id: true }
    });
    const validShipmentIds = allShipmentIds.map(s => s.id);
    
    const orphanBoxes = allBoxes.filter(b => !validShipmentIds.includes(b.shipmentId));
    
    if (orphanBoxes.length > 0) {
      issues.push(`❌ Found ${orphanBoxes.length} ORPHAN boxes (invalid shipmentId)`);
      orphanBoxes.forEach(b => {
        console.log(`   ❌ Orphan box: ${b.qrCode} (shipmentId: ${b.shipmentId})`);
      });
    } else {
      console.log(`   ✅ No orphan boxes`);
    }

    // ============================================
    // 10. SUMMARY
    // ============================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 HEALTH CHECK SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n✅ CRITICAL ISSUES: ${issues.length}`);
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
    if (warnings.length > 0) {
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log(`\nℹ️  INFO: ${info.length}`);
    if (info.length > 0) {
      info.forEach(i => console.log(`   ${i}`));
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ SYSTEM HEALTH: EXCELLENT - No issues found!');
    } else if (issues.length === 0) {
      console.log('✅ SYSTEM HEALTH: GOOD - Only minor warnings');
    } else {
      console.log('❌ SYSTEM HEALTH: NEEDS ATTENTION - Critical issues found!');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR DURING HEALTH CHECK:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemHealth();

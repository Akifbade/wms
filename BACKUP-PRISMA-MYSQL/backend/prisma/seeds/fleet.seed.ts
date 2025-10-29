/**
 * Fleet Management Module - Seed Data
 * 
 * This script populates the database with sample data for testing
 * the Fleet Management system.
 * 
 * Run with: npx ts-node prisma/seeds/fleet.seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFleet() {
  console.log('🚛 Starting Fleet Management seed...\n');

  // Get the first company (or create one if none exists)
  let company = await prisma.company.findFirst();
  
  if (!company) {
    console.log('📦 Creating sample company...');
    company = await prisma.company.create({
      data: {
        name: 'Demo Logistics Company',
        email: 'demo@logistics.com',
        phone: '+971-50-123-4567',
      },
    });
    console.log(`✅ Company created: ${company.name} (ID: ${company.id})\n`);
  } else {
    console.log(`✅ Using existing company: ${company.name} (ID: ${company.id})\n`);
  }

  const companyId = company.id;

  // Create Drivers
  console.log('👨‍✈️ Creating drivers...');
  
  const driver1 = await prisma.driver.upsert({
    where: { 
      companyId_cardNumber: { 
        companyId, 
        cardNumber: 'DRV-001' 
      } 
    },
    update: {},
    create: {
      companyId,
      name: 'Ahmad Ali',
      phone: '+971-50-111-2222',
      email: 'ahmad.ali@demo.com',
      licenseNumber: 'DXB-1234567',
      licenseExpiry: new Date('2026-12-31'),
      cardNumber: 'DRV-001',
      status: 'active',
    },
  });
  console.log(`✅ Driver: ${driver1.name} (Card: ${driver1.cardNumber})`);

  const driver2 = await prisma.driver.upsert({
    where: { 
      companyId_cardNumber: { 
        companyId, 
        cardNumber: 'DRV-002' 
      } 
    },
    update: {},
    create: {
      companyId,
      name: 'Mohammed Hassan',
      phone: '+971-50-333-4444',
      email: 'mohammed.hassan@demo.com',
      licenseNumber: 'DXB-7654321',
      licenseExpiry: new Date('2027-06-30'),
      cardNumber: 'DRV-002',
      status: 'active',
    },
  });
  console.log(`✅ Driver: ${driver2.name} (Card: ${driver2.cardNumber})\n`);

  // Create Vehicles
  console.log('🚗 Creating vehicles...');
  
  const vehicle1 = await prisma.vehicle.upsert({
    where: { 
      companyId_plateNumber: { 
        companyId, 
        plateNumber: 'DXB-T-1234' 
      } 
    },
    update: {},
    create: {
      companyId,
      plateNumber: 'DXB-T-1234',
      make: 'Toyota',
      model: 'Hilux',
      year: 2023,
      vin: 'VIN123456789ABCDEF',
      imei: '123456789012345',
      status: 'active',
      fuelType: 'diesel',
      capacity: 1000, // kg
    },
  });
  console.log(`✅ Vehicle: ${vehicle1.make} ${vehicle1.model} (${vehicle1.plateNumber})`);

  const vehicle2 = await prisma.vehicle.upsert({
    where: { 
      companyId_plateNumber: { 
        companyId, 
        plateNumber: 'DXB-P-5678' 
      } 
    },
    update: {},
    create: {
      companyId,
      plateNumber: 'DXB-P-5678',
      make: 'Nissan',
      model: 'Patrol',
      year: 2022,
      vin: 'VIN987654321FEDCBA',
      imei: '987654321098765',
      status: 'active',
      fuelType: 'petrol',
      capacity: 800, // kg
    },
  });
  console.log(`✅ Vehicle: ${vehicle2.make} ${vehicle2.model} (${vehicle2.plateNumber})\n`);

  // Create Geofences
  console.log('📍 Creating geofences...');
  
  const geofence1 = await prisma.geofence.upsert({
    where: {
      companyId_name: {
        companyId,
        name: 'Main Warehouse',
      },
    },
    update: {},
    create: {
      companyId,
      name: 'Main Warehouse',
      lat: 25.2048, // Dubai latitude
      lng: 55.2708, // Dubai longitude
      radiusMeters: 500,
      isActive: true,
    },
  });
  console.log(`✅ Geofence: ${geofence1.name} (Radius: ${geofence1.radiusMeters}m)`);

  const geofence2 = await prisma.geofence.upsert({
    where: {
      companyId_name: {
        companyId,
        name: 'Customer Hub - Abu Dhabi',
      },
    },
    update: {},
    create: {
      companyId,
      name: 'Customer Hub - Abu Dhabi',
      lat: 24.4539, // Abu Dhabi latitude
      lng: 54.3773, // Abu Dhabi longitude
      radiusMeters: 1000,
      isActive: true,
    },
  });
  console.log(`✅ Geofence: ${geofence2.name} (Radius: ${geofence2.radiusMeters}m)\n`);

  // Create Card Limits
  console.log('💳 Creating card limits...');
  
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const cardLimit1 = await prisma.cardLimit.upsert({
    where: {
      companyId_cardNumber_month: {
        companyId,
        cardNumber: driver1.cardNumber,
        month: thisMonth,
      },
    },
    update: {},
    create: {
      companyId,
      cardNumber: driver1.cardNumber,
      month: thisMonth,
      limitAed: 2500.00,
      usedAed: 450.50,
    },
  });
  console.log(`✅ Card Limit: ${cardLimit1.cardNumber} - AED ${cardLimit1.limitAed} (Used: AED ${cardLimit1.usedAed})`);

  const cardLimit2 = await prisma.cardLimit.upsert({
    where: {
      companyId_cardNumber_month: {
        companyId,
        cardNumber: driver2.cardNumber,
        month: thisMonth,
      },
    },
    update: {},
    create: {
      companyId,
      cardNumber: driver2.cardNumber,
      month: thisMonth,
      limitAed: 2500.00,
      usedAed: 1200.75,
    },
  });
  console.log(`✅ Card Limit: ${cardLimit2.cardNumber} - AED ${cardLimit2.limitAed} (Used: AED ${cardLimit2.usedAed})\n`);

  // Create Sample Completed Trip
  console.log('🛣️ Creating sample trip...');
  
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - 3); // 3 hours ago
  
  const endTime = new Date();
  endTime.setHours(endTime.getHours() - 1); // 1 hour ago

  const trip1 = await prisma.trip.create({
    data: {
      companyId,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      startTs: startTime,
      endTs: endTime,
      status: 'completed',
      distanceKm: 45.8,
      durationMinutes: 120,
      idleMinutes: 15,
      avgSpeedKmph: 38.5,
      maxSpeedKmph: 85.2,
      notes: 'Delivery to Abu Dhabi - Package ID: PKG-12345',
    },
  });
  console.log(`✅ Trip: ${trip1.id} - ${trip1.distanceKm}km in ${trip1.durationMinutes} minutes`);

  // Create GPS points for the trip
  const gpsPoints = [
    { lat: 25.2048, lng: 55.2708, speed: 0, ts: new Date(startTime.getTime()) },
    { lat: 25.1900, lng: 55.2600, speed: 45, ts: new Date(startTime.getTime() + 10 * 60000) },
    { lat: 25.1500, lng: 55.2300, speed: 60, ts: new Date(startTime.getTime() + 30 * 60000) },
    { lat: 25.0800, lng: 55.1800, speed: 70, ts: new Date(startTime.getTime() + 60 * 60000) },
    { lat: 24.4539, lng: 54.3773, speed: 0, ts: endTime },
  ];

  for (const point of gpsPoints) {
    await prisma.tripPoint.create({
      data: {
        tripId: trip1.id,
        lat: point.lat,
        lng: point.lng,
        speedKmph: point.speed,
        accuracy: 10,
        ts: point.ts,
      },
    });
  }
  console.log(`✅ GPS Points: ${gpsPoints.length} points added to trip\n`);

  // Create Fuel Log
  console.log('⛽ Creating fuel log...');
  
  const fuelLog1 = await prisma.fuelLog.create({
    data: {
      companyId,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      cardNumber: driver1.cardNumber,
      liters: 55.5,
      costPerLiter: 3.25,
      totalCost: 180.38,
      odometerKm: 12345,
      ts: new Date(endTime.getTime() + 30 * 60000), // 30 min after trip end
      station: 'ENOC Station - Dubai',
      receiptNumber: 'RCPT-2025-001',
    },
  });
  console.log(`✅ Fuel Log: ${fuelLog1.liters}L @ AED ${fuelLog1.costPerLiter}/L = AED ${fuelLog1.totalCost}\n`);

  // Create Events
  console.log('🔔 Creating events...');
  
  const event1 = await prisma.tripEvent.create({
    data: {
      companyId,
      tripId: trip1.id,
      type: 'overspeed',
      severity: 'warning',
      message: 'Speed exceeded 80 km/h',
      lat: 25.0800,
      lng: 55.1800,
      ts: new Date(startTime.getTime() + 60 * 60000),
    },
  });
  console.log(`✅ Event: ${event1.type} - ${event1.message}`);

  const event2 = await prisma.tripEvent.create({
    data: {
      companyId,
      tripId: trip1.id,
      type: 'geofence_exit',
      severity: 'info',
      message: 'Left Main Warehouse geofence',
      lat: 25.2048,
      lng: 55.2708,
      ts: new Date(startTime.getTime() + 5 * 60000),
    },
  });
  console.log(`✅ Event: ${event2.type} - ${event2.message}\n`);

  console.log('✅ Fleet Management seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Drivers: 2`);
  console.log(`   - Vehicles: 2`);
  console.log(`   - Geofences: 2`);
  console.log(`   - Card Limits: 2`);
  console.log(`   - Trips: 1 (completed)`);
  console.log(`   - GPS Points: ${gpsPoints.length}`);
  console.log(`   - Fuel Logs: 1`);
  console.log(`   - Events: 2`);
  console.log('\n🚀 You can now test the Fleet Management system!\n');
}

// Run the seed
seedFleet()
  .catch((error) => {
    console.error('❌ Error seeding fleet data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

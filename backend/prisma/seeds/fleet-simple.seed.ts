/**
 * Fleet Management Module - Simple Seed Data
 * 
 * Creates test data matching the actual Prisma schema
 * Run with: npx ts-node prisma/seeds/fleet-simple.seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFleet() {
  console.log('🚛 Starting Fleet Management seed...\n');

  // Get first company
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
    console.log(`✅ Company created: ${company.name}\n`);
  } else {
    console.log(`✅ Using existing company: ${company.name}\n`);
  }

  const companyId = company.id;

  // Create Drivers
  console.log('👨‍✈️ Creating drivers...');
  
  const driver1 = await prisma.driver.create({
    data: {
      companyId,
      name: 'Ahmad Ali',
      phone: '+971-50-111-2222',
      email: 'ahmad.ali@demo.com',
      licenseNo: 'DXB-1234567',
      cardNo: 'CARD-001',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Driver: ${driver1.name} (Card: ${driver1.cardNo})`);

  const driver2 = await prisma.driver.create({
    data: {
      companyId,
      name: 'Mohammed Hassan',
      phone: '+971-50-333-4444',
      email: 'mohammed.hassan@demo.com',
      licenseNo: 'DXB-7654321',
      cardNo: 'CARD-002',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Driver: ${driver2.name} (Card: ${driver2.cardNo})\n`);

  // Create Vehicles
  console.log('🚗 Creating vehicles...');
  
  const vehicle1 = await prisma.vehicle.create({
    data: {
      companyId,
      plateNo: 'DXB-T-1234',
      make: 'Toyota',
      model: 'Hilux',
      year: 2023,
      vin: 'VIN123456789ABCDEF',
      imei: '123456789012345',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Vehicle: ${vehicle1.make} ${vehicle1.model} (${vehicle1.plateNo})`);

  const vehicle2 = await prisma.vehicle.create({
    data: {
      companyId,
      plateNo: 'DXB-P-5678',
      make: 'Nissan',
      model: 'Patrol',
      year: 2022,
      vin: 'VIN987654321FEDCBA',
      imei: '987654321098765',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Vehicle: ${vehicle2.make} ${vehicle2.model} (${vehicle2.plateNo})\n`);

  // Create Geofences
  console.log('📍 Creating geofences...');
  
  const geofence1 = await prisma.geofence.create({
    data: {
      companyId,
      name: 'Main Warehouse',
      type: 'WAREHOUSE',
      centerLat: 25.2048,
      centerLon: 55.2708,
      radiusKm: 0.5,
      isActive: true,
    },
  });
  console.log(`✅ Geofence: ${geofence1.name} (Radius: ${geofence1.radiusKm}km)`);

  const geofence2 = await prisma.geofence.create({
    data: {
      companyId,
      name: 'Customer Hub - Abu Dhabi',
      type: 'CUSTOMER',
      centerLat: 24.4539,
      centerLon: 54.3773,
      radiusKm: 1.0,
      isActive: true,
    },
  });
  console.log(`✅ Geofence: ${geofence2.name} (Radius: ${geofence2.radiusKm}km)\n`);

  // Create Card Limits
  console.log('💳 Creating card limits...');
  
  const currentMonth = new Date().toISOString().slice(0, 7); // "2025-10"

  const cardLimit1 = await prisma.cardLimit.create({
    data: {
      companyId,
      driverId: driver1.id,
      yyyymm: currentMonth,
      limitKwd: 250.0,
      usedKwd: 45.5,
    },
  });
  console.log(`✅ Card Limit: Driver ${driver1.name} - KWD ${cardLimit1.limitKwd} (Used: KWD ${cardLimit1.usedKwd})`);

  const cardLimit2 = await prisma.cardLimit.create({
    data: {
      companyId,
      driverId: driver2.id,
      yyyymm: currentMonth,
      limitKwd: 250.0,
      usedKwd: 120.75,
    },
  });
  console.log(`✅ Card Limit: Driver ${driver2.name} - KWD ${cardLimit2.limitKwd} (Used: KWD ${cardLimit2.usedKwd})\n`);

  // Create Sample Completed Trip
  console.log('🛣️ Creating sample trip...');
  
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - 3);
  
  const endTime = new Date();
  endTime.setHours(endTime.getHours() - 1);

  const trip1 = await prisma.trip.create({
    data: {
      companyId,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      startTs: startTime,
      startLat: 25.2048,
      startLon: 55.2708,
      endTs: endTime,
      endLat: 24.4539,
      endLon: 54.3773,
      status: 'ENDED',
      distanceKm: 45.8,
      durationMin: 120,
      idleMin: 15,
      avgSpeed: 38.5,
      maxSpeed: 85.2,
      notes: 'Delivery to Abu Dhabi - Package ID: PKG-12345',
    },
  });
  console.log(`✅ Trip: ${trip1.id} - ${trip1.distanceKm}km in ${trip1.durationMin} minutes`);

  // Create GPS points for the trip
  const gpsPoints = [
    { lat: 25.2048, lon: 55.2708, speed: 0, ts: new Date(startTime.getTime()) },
    { lat: 25.1900, lon: 55.2600, speed: 45, ts: new Date(startTime.getTime() + 10 * 60000) },
    { lat: 25.1500, lon: 55.2300, speed: 60, ts: new Date(startTime.getTime() + 30 * 60000) },
    { lat: 25.0800, lon: 55.1800, speed: 70, ts: new Date(startTime.getTime() + 60 * 60000) },
    { lat: 24.4539, lon: 54.3773, speed: 0, ts: endTime },
  ];

  for (const point of gpsPoints) {
    await prisma.tripPoint.create({
      data: {
        tripId: trip1.id,
        lat: point.lat,
        lon: point.lon,
        speed: point.speed,
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
      tripId: trip1.id,
      liters: 55.5,
      pricePerLiter: 0.325, // KWD per liter
      amountKwd: 18.04,
      odometer: 12345,
      ts: new Date(endTime.getTime() + 30 * 60000),
      station: 'KNPC Station - Dubai',
      fuelType: 'DIESEL',
      paymentMode: 'COMPANY_CARD',
    },
  });
  console.log(`✅ Fuel Log: ${fuelLog1.liters}L @ KWD ${fuelLog1.pricePerLiter}/L = KWD ${fuelLog1.amountKwd}\n`);

  // Create Events
  console.log('🔔 Creating events...');
  
  const event1 = await prisma.tripEvent.create({
    data: {
      companyId,
      tripId: trip1.id,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      type: 'OVERSPEED',
      severity: 'WARNING',
      message: 'Speed exceeded 80 km/h',
      lat: 25.0800,
      lon: 55.1800,
      ts: new Date(startTime.getTime() + 60 * 60000),
    },
  });
  console.log(`✅ Event: ${event1.type} - ${event1.message}`);

  const event2 = await prisma.tripEvent.create({
    data: {
      companyId,
      tripId: trip1.id,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      type: 'GEOFENCE_EXIT',
      severity: 'INFO',
      message: 'Left Main Warehouse geofence',
      lat: 25.2048,
      lon: 55.2708,
      geofenceId: geofence1.id,
      ts: new Date(startTime.getTime() + 5 * 60000),
    },
  });
  console.log(`✅ Event: ${event2.type} - ${event2.message}\n`);

  console.log('✅ Fleet Management seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Drivers: 2 (${driver1.name}, ${driver2.name})`);
  console.log(`   - Vehicles: 2 (${vehicle1.plateNo}, ${vehicle2.plateNo})`);
  console.log(`   - Geofences: 2`);
  console.log(`   - Card Limits: 2`);
  console.log(`   - Trips: 1 (completed)`);
  console.log(`   - GPS Points: ${gpsPoints.length}`);
  console.log(`   - Fuel Logs: 1`);
  console.log(`   - Events: 2`);
  console.log('\n🚀 You can now test the Fleet Management system!\n');
  console.log('📱 Access:');
  console.log('   - Admin Dashboard: http://localhost:3000/fleet');
  console.log('   - Driver PWA: http://localhost:3000/driver');
  console.log('   - Backend API: http://localhost:5000/api/fleet\n');
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

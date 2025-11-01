/**
 * Fleet Management Module - Trip Integration Tests
 * 
 * Integration tests for trip lifecycle and business logic
 */

import { PrismaClient } from '@prisma/client';
import { startTrip, logGPS, endTrip, getTripById } from '../../src/modules/fleet/services/trip.service';

const prisma = new PrismaClient();

describe('Trip Service Integration Tests', () => {
  let companyId: string;
  let driverId: string;
  let vehicleId: string;
  let tripId: string;

  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        email: 'test@company.com',
        phone: '+971-50-000-0000',
      },
    });
    companyId = company.id;

    // Create test driver
    const driver = await prisma.driver.create({
      data: {
        companyId,
        name: 'Test Driver',
        phone: '+971-50-111-1111',
        email: 'driver@test.com',
        licenseNumber: 'TEST-123',
        licenseExpiry: new Date('2027-12-31'),
        cardNumber: 'TEST-CARD-001',
        status: 'active',
      },
    });
    driverId = driver.id;

    // Create test vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        companyId,
        plateNumber: 'TEST-1234',
        make: 'Toyota',
        model: 'Test',
        year: 2023,
        vin: 'TEST-VIN',
        imei: 'TEST-IMEI',
        status: 'active',
        fuelType: 'diesel',
      },
    });
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.tripPoint.deleteMany({ where: { trip: { companyId } } });
    await prisma.tripEvent.deleteMany({ where: { companyId } });
    await prisma.trip.deleteMany({ where: { companyId } });
    await prisma.fuelLog.deleteMany({ where: { companyId } });
    await prisma.cardLimit.deleteMany({ where: { companyId } });
    await prisma.driver.deleteMany({ where: { companyId } });
    await prisma.vehicle.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  describe('Trip Lifecycle', () => {
    it('should start a new trip', async () => {
      const tripData = {
        companyId,
        driverId,
        vehicleId,
        lat: 25.2048,
        lng: 55.2708,
        speedKmph: 0,
        accuracy: 10,
      };

      const trip = await startTrip(tripData);
      tripId = trip.id;

      expect(trip).toBeDefined();
      expect(trip.status).toBe('active');
      expect(trip.driverId).toBe(driverId);
      expect(trip.vehicleId).toBe(vehicleId);
      expect(trip.distanceKm).toBe(0);
      expect(trip.points).toHaveLength(1);
    });

    it('should log GPS points during trip', async () => {
      const gpsData = {
        lat: 25.2050,
        lng: 55.2710,
        speedKmph: 45,
        accuracy: 10,
      };

      const trip = await logGPS(tripId, gpsData);

      expect(trip.points.length).toBeGreaterThan(1);
      expect(trip.distanceKm).toBeGreaterThan(0);
      expect(trip.avgSpeedKmph).toBeGreaterThan(0);
    });

    it('should calculate distance correctly', async () => {
      // Log another GPS point
      await logGPS(tripId, {
        lat: 25.2060,
        lng: 55.2720,
        speedKmph: 60,
        accuracy: 10,
      });

      const trip = await getTripById(tripId);

      expect(trip.distanceKm).toBeGreaterThan(0);
      expect(trip.distanceKm).toBeLessThan(5); // Should be small distance
    });

    it('should track max speed', async () => {
      await logGPS(tripId, {
        lat: 25.2070,
        lng: 55.2730,
        speedKmph: 85,
        accuracy: 10,
      });

      const trip = await getTripById(tripId);

      expect(trip.maxSpeedKmph).toBeGreaterThanOrEqual(85);
    });

    it('should end trip with notes', async () => {
      const notes = 'Test trip completed successfully';
      const trip = await endTrip(tripId, notes);

      expect(trip.status).toBe('completed');
      expect(trip.notes).toBe(notes);
      expect(trip.endTs).toBeDefined();
      expect(trip.durationMinutes).toBeGreaterThan(0);
    });
  });

  describe('Trip Validation', () => {
    it('should prevent starting trip with non-existent driver', async () => {
      const tripData = {
        companyId,
        driverId: 'non-existent-id',
        vehicleId,
        lat: 25.2048,
        lng: 55.2708,
        speedKmph: 0,
        accuracy: 10,
      };

      await expect(startTrip(tripData)).rejects.toThrow();
    });

    it('should prevent starting trip with non-existent vehicle', async () => {
      const tripData = {
        companyId,
        driverId,
        vehicleId: 'non-existent-id',
        lat: 25.2048,
        lng: 55.2708,
        speedKmph: 0,
        accuracy: 10,
      };

      await expect(startTrip(tripData)).rejects.toThrow();
    });

    it('should prevent logging GPS for non-existent trip', async () => {
      const gpsData = {
        lat: 25.2050,
        lng: 55.2710,
        speedKmph: 45,
        accuracy: 10,
      };

      await expect(logGPS('non-existent-id', gpsData)).rejects.toThrow();
    });

    it('should prevent ending already completed trip', async () => {
      // Try to end the trip that was already ended
      await expect(endTrip(tripId, 'Should fail')).rejects.toThrow();
    });
  });

  describe('GPS Tracking', () => {
    let activeTrip: any;

    beforeAll(async () => {
      // Start a new trip for GPS tests
      const tripData = {
        companyId,
        driverId,
        vehicleId,
        lat: 25.2048,
        lng: 55.2708,
        speedKmph: 0,
        accuracy: 10,
      };
      activeTrip = await startTrip(tripData);
    });

    it('should filter out GPS jumps > 500m', async () => {
      // Log a normal point
      await logGPS(activeTrip.id, {
        lat: 25.2050,
        lng: 55.2710,
        speedKmph: 40,
        accuracy: 10,
      });

      // Try to log a huge jump (should be ignored for distance)
      await logGPS(activeTrip.id, {
        lat: 26.0000,
        lng: 56.0000,
        speedKmph: 100,
        accuracy: 10,
      });

      const trip = await getTripById(activeTrip.id);

      // Distance should not include the huge jump
      expect(trip.distanceKm).toBeLessThan(50);
    });

    it('should detect idle time', async () => {
      // Log several points with low speed
      for (let i = 0; i < 5; i++) {
        await logGPS(activeTrip.id, {
          lat: 25.2048,
          lng: 55.2708,
          speedKmph: 2, // Below idle threshold
          accuracy: 10,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const trip = await getTripById(activeTrip.id);

      expect(trip.idleMinutes).toBeGreaterThan(0);
    });

    afterAll(async () => {
      await endTrip(activeTrip.id, 'GPS test completed');
    });
  });
});

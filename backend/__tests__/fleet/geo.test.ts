/**
 * Fleet Management Module - Geo Utilities Tests
 * 
 * Unit tests for geographic calculation functions
 */

import {
  haversineKm,
  sumDistanceKm,
  calcIdleMinutes,
  calcAvgMaxSpeed,
  calcDurationMinutes,
  isPointInCircle,
  isWithinActiveHours,
  formatDistance,
  formatDuration,
} from '../../src/modules/fleet/utils/geo';

describe('Geo Utilities', () => {
  describe('haversineKm', () => {
    it('should calculate distance between Dubai and Abu Dhabi', () => {
      const dubai = { lat: 25.2048, lng: 55.2708 };
      const abuDhabi = { lat: 24.4539, lng: 54.3773 };
      
      const distance = haversineKm(dubai, abuDhabi);
      
      // Dubai to Abu Dhabi is approximately 130-140 km
      expect(distance).toBeGreaterThan(120);
      expect(distance).toBeLessThan(150);
    });

    it('should return 0 for same location', () => {
      const point = { lat: 25.2048, lng: 55.2708 };
      const distance = haversineKm(point, point);
      
      expect(distance).toBe(0);
    });

    it('should calculate small distances accurately', () => {
      const point1 = { lat: 25.2048, lng: 55.2708 };
      const point2 = { lat: 25.2050, lng: 55.2710 }; // ~200 meters
      
      const distance = haversineKm(point1, point2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });
  });

  describe('sumDistanceKm', () => {
    it('should calculate total distance for a route', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 0, ts: new Date('2025-01-01T10:00:00Z') },
        { lat: 25.2050, lng: 55.2710, speedKmph: 40, ts: new Date('2025-01-01T10:05:00Z') },
        { lat: 25.2060, lng: 55.2720, speedKmph: 60, ts: new Date('2025-01-01T10:10:00Z') },
        { lat: 25.2070, lng: 55.2730, speedKmph: 50, ts: new Date('2025-01-01T10:15:00Z') },
      ];

      const distance = sumDistanceKm(points);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(5); // Should be a few km at most
    });

    it('should skip points with jumps > 500m', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 0, ts: new Date('2025-01-01T10:00:00Z') },
        { lat: 26.0000, lng: 56.0000, speedKmph: 100, ts: new Date('2025-01-01T10:05:00Z') }, // Huge jump
        { lat: 25.2050, lng: 55.2710, speedKmph: 40, ts: new Date('2025-01-01T10:10:00Z') },
      ];

      const distance = sumDistanceKm(points, 0.5); // 500m max jump

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // Should only count the small jump
    });

    it('should return 0 for single point', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 0, ts: new Date() },
      ];

      const distance = sumDistanceKm(points);
      expect(distance).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const distance = sumDistanceKm([]);
      expect(distance).toBe(0);
    });
  });

  describe('calcIdleMinutes', () => {
    it('should detect idle time when speed is low', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 0, ts: new Date('2025-01-01T10:00:00Z') },
        { lat: 25.2048, lng: 55.2708, speedKmph: 2, ts: new Date('2025-01-01T10:02:00Z') },
        { lat: 25.2048, lng: 55.2708, speedKmph: 1, ts: new Date('2025-01-01T10:04:00Z') },
        { lat: 25.2048, lng: 55.2708, speedKmph: 0, ts: new Date('2025-01-01T10:06:00Z') },
        { lat: 25.2050, lng: 55.2710, speedKmph: 60, ts: new Date('2025-01-01T10:10:00Z') },
      ];

      const idleMinutes = calcIdleMinutes(points, 5); // 5 km/h threshold

      expect(idleMinutes).toBeGreaterThanOrEqual(4); // ~6 minutes idle
    });

    it('should not count idle time when moving', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 40, ts: new Date('2025-01-01T10:00:00Z') },
        { lat: 25.2050, lng: 55.2710, speedKmph: 50, ts: new Date('2025-01-01T10:05:00Z') },
        { lat: 25.2060, lng: 55.2720, speedKmph: 60, ts: new Date('2025-01-01T10:10:00Z') },
      ];

      const idleMinutes = calcIdleMinutes(points, 5);
      expect(idleMinutes).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const idleMinutes = calcIdleMinutes([]);
      expect(idleMinutes).toBe(0);
    });
  });

  describe('calcAvgMaxSpeed', () => {
    it('should calculate average and max speed', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 40, ts: new Date() },
        { lat: 25.2050, lng: 55.2710, speedKmph: 60, ts: new Date() },
        { lat: 25.2060, lng: 55.2720, speedKmph: 80, ts: new Date() },
        { lat: 25.2070, lng: 55.2730, speedKmph: 50, ts: new Date() },
      ];

      const { avgSpeed, maxSpeed } = calcAvgMaxSpeed(points);

      expect(avgSpeed).toBe(57.5); // (40 + 60 + 80 + 50) / 4
      expect(maxSpeed).toBe(80);
    });

    it('should return 0 for empty array', () => {
      const { avgSpeed, maxSpeed } = calcAvgMaxSpeed([]);
      
      expect(avgSpeed).toBe(0);
      expect(maxSpeed).toBe(0);
    });

    it('should handle single point', () => {
      const points = [
        { lat: 25.2048, lng: 55.2708, speedKmph: 50, ts: new Date() },
      ];

      const { avgSpeed, maxSpeed } = calcAvgMaxSpeed(points);

      expect(avgSpeed).toBe(50);
      expect(maxSpeed).toBe(50);
    });
  });

  describe('calcDurationMinutes', () => {
    it('should calculate trip duration', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T12:30:00Z');

      const duration = calcDurationMinutes(start, end);

      expect(duration).toBe(150); // 2.5 hours = 150 minutes
    });

    it('should return 0 for same time', () => {
      const time = new Date();
      const duration = calcDurationMinutes(time, time);

      expect(duration).toBe(0);
    });

    it('should handle negative duration (end before start)', () => {
      const start = new Date('2025-01-01T12:00:00Z');
      const end = new Date('2025-01-01T10:00:00Z');

      const duration = calcDurationMinutes(start, end);

      expect(duration).toBeLessThan(0);
    });
  });

  describe('isPointInCircle', () => {
    it('should detect point inside geofence', () => {
      const center = { lat: 25.2048, lng: 55.2708 };
      const point = { lat: 25.2050, lng: 55.2710 }; // Very close
      const radiusKm = 1;

      const isInside = isPointInCircle(point, center, radiusKm);

      expect(isInside).toBe(true);
    });

    it('should detect point outside geofence', () => {
      const center = { lat: 25.2048, lng: 55.2708 };
      const point = { lat: 26.0000, lng: 56.0000 }; // Very far
      const radiusKm = 1;

      const isInside = isPointInCircle(point, center, radiusKm);

      expect(isInside).toBe(false);
    });

    it('should handle point exactly on boundary', () => {
      const center = { lat: 25.2048, lng: 55.2708 };
      const radiusKm = 1;
      
      // Calculate a point exactly 1km away
      const distance = haversineKm(center, { lat: 25.2139, lng: 55.2708 });
      
      // Should be very close to the boundary
      expect(Math.abs(distance - radiusKm)).toBeLessThan(0.1);
    });
  });

  describe('isWithinActiveHours', () => {
    it('should allow point during active hours', () => {
      const point = {
        lat: 25.2048,
        lng: 55.2708,
        ts: new Date('2025-01-01T10:00:00Z'), // 10 AM
      };

      const isWithin = isWithinActiveHours(point, '06:00', '18:00');

      expect(isWithin).toBe(true);
    });

    it('should block point outside active hours', () => {
      const point = {
        lat: 25.2048,
        lng: 55.2708,
        ts: new Date('2025-01-01T20:00:00Z'), // 8 PM
      };

      const isWithin = isWithinActiveHours(point, '06:00', '18:00');

      expect(isWithin).toBe(false);
    });

    it('should allow any time when no hours specified', () => {
      const point = {
        lat: 25.2048,
        lng: 55.2708,
        ts: new Date('2025-01-01T23:00:00Z'), // 11 PM
      };

      const isWithin = isWithinActiveHours(point);

      expect(isWithin).toBe(true);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in km', () => {
      expect(formatDistance(45.678)).toBe('45.68 km');
      expect(formatDistance(123.456)).toBe('123.46 km');
      expect(formatDistance(0.123)).toBe('0.12 km');
    });

    it('should handle zero distance', () => {
      expect(formatDistance(0)).toBe('0.00 km');
    });

    it('should handle very large distances', () => {
      expect(formatDistance(1234.5678)).toBe('1234.57 km');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in hours and minutes', () => {
      expect(formatDuration(150)).toBe('2h 30m');
      expect(formatDuration(65)).toBe('1h 5m');
      expect(formatDuration(45)).toBe('0h 45m');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0h 0m');
    });

    it('should handle full hours', () => {
      expect(formatDuration(120)).toBe('2h 0m');
      expect(formatDuration(60)).toBe('1h 0m');
    });

    it('should handle very long durations', () => {
      expect(formatDuration(1440)).toBe('24h 0m'); // 1 day
      expect(formatDuration(2880)).toBe('48h 0m'); // 2 days
    });
  });
});

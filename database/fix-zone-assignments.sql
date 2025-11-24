-- Fix Zone Assignments for Existing Racks
-- This updates existing racks that had zone='Unassigned' to proper zone numbers
-- Run after adding zone field to database schema

-- Zone 1: Number-based racks (1A, 1B, 1C, etc.)
UPDATE racks SET zone = '1' WHERE code LIKE '1%';

-- Zone 2: A-series racks (A1-1, A2-1, etc.)
UPDATE racks SET zone = '2' WHERE code LIKE 'A%';

-- Zone 3: B-series racks (B1-1, B2-1, etc.)
UPDATE racks SET zone = '3' WHERE code LIKE 'B%';

-- Zone 4: C-series racks (C1-1, C2-1, etc.)
UPDATE racks SET zone = '4' WHERE code LIKE 'C%';

-- Verify the updates
SELECT zone, COUNT(*) as rack_count 
FROM racks 
GROUP BY zone 
ORDER BY zone;

-- View sample racks from each zone
SELECT zone, code, location 
FROM racks 
ORDER BY zone, code 
LIMIT 20;

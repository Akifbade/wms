-- ============================================
-- WMS Critical Database Fixes
-- ============================================

-- 1. Fix shipments with boxes assigned but no rackId
UPDATE shipments s
JOIN (
    SELECT DISTINCT shipmentId, rackId 
    FROM shipment_boxes 
    WHERE rackId IS NOT NULL
    GROUP BY shipmentId, rackId
) b ON s.id = b.shipmentId
SET s.rackId = b.rackId
WHERE s.rackId IS NULL AND b.rackId IS NOT NULL;

-- 2. Fix rack capacity calculations
UPDATE racks r
SET r.capacityUsed = (
    SELECT COALESCE(COUNT(*), 0)
    FROM shipment_boxes sb
    WHERE sb.rackId = r.id AND sb.status = 'IN_STORAGE'
);

-- 3. Verify shipment box counts
UPDATE shipments s
SET s.currentBoxCount = (
    SELECT COUNT(*) 
    FROM shipment_boxes sb 
    WHERE sb.shipmentId = s.id
)
WHERE s.currentBoxCount != (
    SELECT COUNT(*) 
    FROM shipment_boxes sb 
    WHERE sb.shipmentId = s.id
);

-- 4. Create default settings for companies if missing
INSERT IGNORE INTO invoice_settings (
    id, companyId, templateType, primaryColor, secondaryColor, 
    showLogo, createdAt, updatedAt
)
SELECT 
    CONCAT('inv-set-', id),
    id,
    'MODERN',
    '#2563eb',
    '#64748b',
    1,
    NOW(),
    NOW()
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_settings WHERE companyId = companies.id
);

INSERT IGNORE INTO shipment_settings (
    id, companyId, createdAt, updatedAt
)
SELECT 
    CONCAT('shp-set-', id),
    id,
    NOW(),
    NOW()
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM shipment_settings WHERE companyId = companies.id
);

INSERT IGNORE INTO billing_settings (
    id, companyId, createdAt, updatedAt
)
SELECT 
    CONCAT('bill-set-', id),
    id,
    NOW(),
    NOW()
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM billing_settings WHERE companyId = companies.id
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT '=== DATABASE STATUS ===' as Info;

SELECT 'ENTITIES COUNT' as Category, '' as Name, '' as Value
UNION ALL
SELECT '', 'Companies', CAST(COUNT(*) AS CHAR) FROM companies
UNION ALL
SELECT '', 'Users', CAST(COUNT(*) AS CHAR) FROM users
UNION ALL
SELECT '', 'Racks', CAST(COUNT(*) AS CHAR) FROM racks
UNION ALL
SELECT '', 'Shipments', CAST(COUNT(*) AS CHAR) FROM shipments
UNION ALL
SELECT '', 'Shipment Boxes', CAST(COUNT(*) AS CHAR) FROM shipment_boxes
UNION ALL
SELECT '', 'Invoices', CAST(COUNT(*) AS CHAR) FROM invoices
UNION ALL
SELECT '', 'Payments', CAST(COUNT(*) AS CHAR) FROM payments;

SELECT '=== SHIPMENT DETAILS ===' as Info;

SELECT 
    s.name as Shipment,
    s.status as Status,
    s.originalBoxCount as Total_Boxes,
    s.rackId as Rack_ID,
    r.code as Rack_Code,
    COUNT(sb.id) as Actual_Box_Count
FROM shipments s
LEFT JOIN shipment_boxes sb ON s.id = sb.shipmentId
LEFT JOIN racks r ON s.rackId = r.id
GROUP BY s.id, s.name, s.status, s.originalBoxCount, s.rackId, r.code;

SELECT '=== RACK UTILIZATION ===' as Info;

SELECT 
    code as Rack,
    status as Status,
    capacityTotal as Total_Capacity,
    capacityUsed as Used_Capacity,
    CONCAT(ROUND((capacityUsed / capacityTotal * 100), 1), '%') as Utilization
FROM racks
ORDER BY code;

SELECT '=== DATA INTEGRITY CHECK ===' as Info;

SELECT 
    'Shipments with rack mismatch' as Issue,
    COUNT(*) as Count
FROM shipments s
WHERE s.rackId IS NULL 
AND EXISTS (
    SELECT 1 FROM shipment_boxes sb 
    WHERE sb.shipmentId = s.id AND sb.rackId IS NOT NULL
)
UNION ALL
SELECT 
    'Orphaned shipment boxes',
    COUNT(*)
FROM shipment_boxes sb
WHERE sb.shipmentId NOT IN (SELECT id FROM shipments)
UNION ALL
SELECT 
    'Users without company',
    COUNT(*)
FROM users u
WHERE u.companyId NOT IN (SELECT id FROM companies)
UNION ALL
SELECT 
    'Companies without settings',
    (SELECT COUNT(*) FROM companies WHERE NOT EXISTS (SELECT 1 FROM invoice_settings WHERE companyId = companies.id))
    + (SELECT COUNT(*) FROM companies WHERE NOT EXISTS (SELECT 1 FROM shipment_settings WHERE companyId = companies.id))
    + (SELECT COUNT(*) FROM companies WHERE NOT EXISTS (SELECT 1 FROM billing_settings WHERE companyId = companies.id));

-- ============================================
-- WMS Database Integrity Fix & Verification
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

-- 2. Update shipment status based on box assignments
UPDATE shipments s
SET s.status = CASE
    WHEN EXISTS (
        SELECT 1 FROM shipment_boxes sb 
        WHERE sb.shipmentId = s.id AND sb.rackId IS NOT NULL
    ) THEN 'IN_STORAGE'
    WHEN s.releasedAt IS NOT NULL THEN 'RELEASED'
    ELSE 'PENDING'
END
WHERE s.status = 'PENDING' OR s.status IS NULL;

-- 3. Ensure all shipments have boxes created
INSERT INTO shipment_boxes (id, shipmentId, boxNumber, qrCode, status, rackId, companyId, createdAt, updatedAt)
SELECT 
    CONCAT('box-', s.id, '-', numbers.n) as id,
    s.id as shipmentId,
    numbers.n as boxNumber,
    CONCAT(s.qrCode, '-BOX-', numbers.n) as qrCode,
    'PENDING' as status,
    NULL as rackId,
    s.companyId as companyId,
    NOW() as createdAt,
    NOW() as updatedAt
FROM shipments s
CROSS JOIN (
    SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
    UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) numbers
WHERE numbers.n <= s.originalBoxCount
AND NOT EXISTS (
    SELECT 1 FROM shipment_boxes sb 
    WHERE sb.shipmentId = s.id AND sb.boxNumber = numbers.n
);

-- 4. Fix rack capacity calculations
UPDATE racks r
SET r.capacityUsed = (
    SELECT COALESCE(SUM(s.currentBoxCount), 0)
    FROM shipments s
    WHERE s.rackId = r.id AND s.status = 'IN_STORAGE'
)
WHERE r.id IN (SELECT DISTINCT rackId FROM shipments WHERE rackId IS NOT NULL);

-- 5. Create default invoice settings if not exists
INSERT IGNORE INTO invoice_settings (
    id, companyId, prefix, startingNumber, terms, footerText, 
    showCompanyLogo, showQRCode, createdAt, updatedAt
)
SELECT 
    CONCAT('inv-set-', id) as id,
    id as companyId,
    'INV' as prefix,
    1000 as startingNumber,
    'Payment due within 30 days' as terms,
    'Thank you for your business!' as footerText,
    true as showCompanyLogo,
    true as showQRCode,
    NOW() as createdAt,
    NOW() as updatedAt
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_settings WHERE companyId = companies.id
);

-- 6. Create default shipment settings if not exists
INSERT IGNORE INTO shipment_settings (
    id, companyId, requireEmail, requirePhone, allowCustomFields,
    autoGenerateQR, requireSignature, createdAt, updatedAt
)
SELECT 
    CONCAT('shp-set-', id) as id,
    id as companyId,
    false as requireEmail,
    true as requirePhone,
    true as allowCustomFields,
    true as autoGenerateQR,
    false as requireSignature,
    NOW() as createdAt,
    NOW() as updatedAt
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM shipment_settings WHERE companyId = companies.id
);

-- 7. Create default billing settings if not exists
INSERT IGNORE INTO billing_settings (
    id, companyId, taxRate, currency, paymentMethods,
    invoicePrefix, invoiceDueDays, createdAt, updatedAt
)
SELECT 
    CONCAT('bill-set-', id) as id,
    id as companyId,
    0.0 as taxRate,
    'KWD' as currency,
    '["CASH","CARD","BANK_TRANSFER"]' as paymentMethods,
    'INV' as invoicePrefix,
    30 as invoiceDueDays,
    NOW() as createdAt,
    NOW() as updatedAt
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM billing_settings WHERE companyId = companies.id
);

-- 8. Fix any orphaned shipment_boxes
DELETE FROM shipment_boxes
WHERE shipmentId NOT IN (SELECT id FROM shipments);

-- 9. Fix any orphaned custom_field_values
DELETE FROM custom_field_values
WHERE fieldId NOT IN (SELECT id FROM custom_fields);

-- 10. Verify and fix user company relationships
UPDATE users u
SET u.companyId = (SELECT id FROM companies LIMIT 1)
WHERE u.companyId NOT IN (SELECT id FROM companies)
AND EXISTS (SELECT 1 FROM companies);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show current state
SELECT 'COMPANIES' as Entity, COUNT(*) as Count FROM companies
UNION ALL
SELECT 'USERS', COUNT(*) FROM users
UNION ALL
SELECT 'RACKS', COUNT(*) FROM racks
UNION ALL
SELECT 'SHIPMENTS', COUNT(*) FROM shipments
UNION ALL
SELECT 'SHIPMENT_BOXES', COUNT(*) FROM shipment_boxes
UNION ALL
SELECT 'INVOICES', COUNT(*) FROM invoices
UNION ALL
SELECT 'PAYMENTS', COUNT(*) FROM payments
UNION ALL
SELECT 'MOVING_JOBS', COUNT(*) FROM moving_jobs
UNION ALL
SELECT 'EXPENSES', COUNT(*) FROM expenses;

-- Show data integrity status
SELECT 
    'Shipments with mismatched rack assignments' as Check_Type,
    COUNT(*) as Issues
FROM shipments s
WHERE s.rackId IS NULL 
AND EXISTS (
    SELECT 1 FROM shipment_boxes sb 
    WHERE sb.shipmentId = s.id AND sb.rackId IS NOT NULL
)
UNION ALL
SELECT 
    'Shipment boxes without parent shipment',
    COUNT(*)
FROM shipment_boxes sb
WHERE sb.shipmentId NOT IN (SELECT id FROM shipments)
UNION ALL
SELECT 
    'Racks with incorrect capacity',
    COUNT(*)
FROM racks r
WHERE r.capacityUsed != (
    SELECT COALESCE(SUM(s.currentBoxCount), 0)
    FROM shipments s
    WHERE s.rackId = r.id AND s.status = 'IN_STORAGE'
)
UNION ALL
SELECT 
    'Users without valid company',
    COUNT(*)
FROM users u
WHERE u.companyId NOT IN (SELECT id FROM companies);

-- Show shipment status summary
SELECT 
    status,
    COUNT(*) as count,
    SUM(originalBoxCount) as total_boxes
FROM shipments
GROUP BY status;

-- Show rack utilization
SELECT 
    code,
    status,
    capacityTotal,
    capacityUsed,
    ROUND((capacityUsed / capacityTotal * 100), 2) as utilization_percent
FROM racks
ORDER BY code;

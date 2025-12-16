-- Check TEST current stock
SELECT name, totalQuantity FROM packing_materials WHERE name = 'TEST';

-- Check if the 18 qty was already added to stock
-- Current should be 69, if 18 was added it should be 69
-- Let's recalculate what TEST stock SHOULD be

-- Stock batches for TEST
SELECT materialId, SUM(quantityPurchased) as batch_qty 
FROM stock_batches 
WHERE materialId = (SELECT id FROM packing_materials WHERE name = 'TEST')
GROUP BY materialId;

-- PO received for TEST
SELECT poi.materialId, SUM(poi.quantity) as po_qty 
FROM purchase_order_items poi 
JOIN purchase_orders po ON poi.purchaseOrderId = po.id 
WHERE po.status = 'RECEIVED' 
AND poi.materialId = (SELECT id FROM packing_materials WHERE name = 'TEST')
GROUP BY poi.materialId;

-- Issues for TEST
SELECT materialId, SUM(quantity) as issued 
FROM material_issues 
WHERE materialId = (SELECT id FROM packing_materials WHERE name = 'TEST')
GROUP BY materialId;

-- Returns restocked for TEST
SELECT materialId, SUM(quantityGood) as returned, restocked
FROM material_returns 
WHERE materialId = (SELECT id FROM packing_materials WHERE name = 'TEST')
GROUP BY materialId, restocked;

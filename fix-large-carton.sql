-- Fix LARGE CARTON balance calculation
-- Material ID: cmi47gyfq00ucml174ozr161m

-- 1. Check current returns for LARGE CARTON
SELECT 'Returns for LARGE CARTON' as info;
SELECT id, quantityGood, restocked, recordedAt 
FROM material_returns 
WHERE materialId = 'cmi47gyfq00ucml174ozr161m';

-- 2. Calculate correct balance
SELECT 
  (SELECT COALESCE(SUM(quantityPurchased), 0) FROM stock_batches WHERE materialId = 'cmi47gyfq00ucml174ozr161m') as stock_batches,
  (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi JOIN purchase_orders po ON poi.purchaseOrderId = po.id WHERE poi.materialId = 'cmi47gyfq00ucml174ozr161m' AND po.status = 'RECEIVED') as purchases,
  (SELECT COALESCE(SUM(quantity), 0) FROM material_issues WHERE materialId = 'cmi47gyfq00ucml174ozr161m') as issues,
  (SELECT COALESCE(SUM(quantityGood), 0) FROM material_returns WHERE materialId = 'cmi47gyfq00ucml174ozr161m' AND restocked = 1) as returns_restocked;

-- 3. Update totalQuantity with correct balance (after restocked returns added)
UPDATE packing_materials 
SET totalQuantity = (
  (SELECT COALESCE(SUM(quantityPurchased), 0) FROM stock_batches WHERE materialId = 'cmi47gyfq00ucml174ozr161m')
  + (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi JOIN purchase_orders po ON poi.purchaseOrderId = po.id WHERE poi.materialId = 'cmi47gyfq00ucml174ozr161m' AND po.status = 'RECEIVED')
  - (SELECT COALESCE(SUM(quantity), 0) FROM material_issues WHERE materialId = 'cmi47gyfq00ucml174ozr161m')
  + (SELECT COALESCE(SUM(quantityGood), 0) FROM material_returns WHERE materialId = 'cmi47gyfq00ucml174ozr161m' AND restocked = 1)
)
WHERE id = 'cmi47gyfq00ucml174ozr161m';

-- 4. Verify
SELECT name, totalQuantity FROM packing_materials WHERE id = 'cmi47gyfq00ucml174ozr161m';

UPDATE packing_materials pm 
SET totalQuantity = (
  COALESCE((SELECT SUM(sb.quantityPurchased) FROM stock_batches sb WHERE sb.materialId = pm.id), 0) +
  COALESCE((SELECT SUM(poi.quantity) FROM purchase_order_items poi JOIN purchase_orders po ON poi.purchaseOrderId = po.id WHERE poi.materialId = pm.id AND po.status = 'RECEIVED'), 0) -
  COALESCE((SELECT SUM(mi.quantity) FROM material_issues mi WHERE mi.materialId = pm.id), 0) +
  COALESCE((SELECT SUM(mr.quantityGood) FROM material_returns mr WHERE mr.materialId = pm.id AND mr.restocked = 1), 0) -
  COALESCE((SELECT SUM(md.quantity) FROM material_damages md WHERE md.materialId = pm.id), 0)
);

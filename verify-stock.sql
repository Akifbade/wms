-- Check current stock vs calculated closing stock
SELECT 
    pm.name,
    pm.totalQuantity as current_stock,
    COALESCE(sb.batch_qty, 0) as stock_batches,
    COALESCE(po.po_qty, 0) as po_received,
    COALESCE(iss.issued, 0) as issued,
    COALESCE(ret.returned, 0) as returned,
    (COALESCE(sb.batch_qty, 0) + COALESCE(po.po_qty, 0) - COALESCE(iss.issued, 0) + COALESCE(ret.returned, 0)) as calculated_closing,
    CASE 
        WHEN pm.totalQuantity = (COALESCE(sb.batch_qty, 0) + COALESCE(po.po_qty, 0) - COALESCE(iss.issued, 0) + COALESCE(ret.returned, 0))
        THEN 'OK'
        ELSE 'MISMATCH'
    END as status
FROM packing_materials pm
LEFT JOIN (
    SELECT materialId, SUM(quantityPurchased) as batch_qty 
    FROM stock_batches 
    GROUP BY materialId
) sb ON pm.id = sb.materialId
LEFT JOIN (
    SELECT poi.materialId, SUM(poi.quantity) as po_qty 
    FROM purchase_order_items poi 
    JOIN purchase_orders po ON poi.purchaseOrderId = po.id 
    WHERE po.status = 'RECEIVED' 
    GROUP BY poi.materialId
) po ON pm.id = po.materialId
LEFT JOIN (
    SELECT materialId, SUM(quantity) as issued 
    FROM material_issues 
    GROUP BY materialId
) iss ON pm.id = iss.materialId
LEFT JOIN (
    SELECT materialId, SUM(quantityGood) as returned 
    FROM material_returns 
    WHERE restocked = 1 
    GROUP BY materialId
) ret ON pm.id = ret.materialId
ORDER BY pm.name;

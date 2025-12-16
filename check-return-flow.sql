-- Check TEST material current stock
SELECT id, name, totalQuantity FROM packing_materials WHERE name = 'TEST';

-- Check recent returns that are NOT restocked
SELECT mr.id, mr.materialId, pm.name, mr.quantityGood, mr.restocked
FROM material_returns mr
JOIN packing_materials pm ON pm.id = mr.materialId
WHERE mr.restocked = 0 AND mr.quantityGood > 0
LIMIT 10;

-- Check job approvals pending
SELECT ma.id, ma.approvalType, ma.status, ma.jobId, mj.jobCode
FROM material_approvals ma
LEFT JOIN moving_jobs mj ON mj.id = ma.jobId
WHERE ma.status = 'PENDING' AND ma.approvalType = 'JOB_COMPLETION_REPORT'
LIMIT 5;

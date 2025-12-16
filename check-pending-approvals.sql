-- Check pending job approvals
SELECT ma.id, ma.status, ma.approvalType, mj.jobCode, mj.status as job_status 
FROM material_approvals ma 
JOIN moving_jobs mj ON mj.id = ma.jobId 
WHERE ma.status = 'PENDING' 
ORDER BY ma.id DESC LIMIT 10;

-- Check TEST material pending returns
SELECT mr.id, pm.name, mr.quantityGood, mr.restocked, mj.jobCode, mj.status as job_status
FROM material_returns mr 
JOIN packing_materials pm ON pm.id = mr.materialId 
JOIN moving_jobs mj ON mj.id = mr.jobId 
WHERE pm.name = 'TEST' AND mr.restocked = 0
ORDER BY mr.id DESC;

-- Check recent TEST material returns (all)
SELECT mr.id, mr.quantityGood, mr.restocked, mj.jobCode, mj.status as job_status
FROM material_returns mr 
JOIN packing_materials pm ON pm.id = mr.materialId 
JOIN moving_jobs mj ON mj.id = mr.jobId 
WHERE pm.name = 'TEST'
ORDER BY mr.id DESC LIMIT 10;

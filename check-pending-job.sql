-- Check pending approval job details
SELECT ma.id as approval_id, ma.status, ma.approvalType, ma.jobId, mj.jobCode, mj.status as job_status
FROM material_approvals ma 
JOIN moving_jobs mj ON mj.id = ma.jobId 
WHERE ma.status = 'PENDING';

-- Get the job ID from above and check its returns
SELECT mr.id, pm.name, mr.quantityGood, mr.restocked, mr.jobId
FROM material_returns mr
JOIN packing_materials pm ON pm.id = mr.materialId
WHERE mr.jobId IN (SELECT jobId FROM material_approvals WHERE status = 'PENDING');

-- Check what returns are NOT restocked and have quantityGood > 0
SELECT mr.id, pm.name, mr.quantityGood, mr.restocked, mj.jobCode, mj.status as job_status
FROM material_returns mr
JOIN packing_materials pm ON pm.id = mr.materialId
JOIN moving_jobs mj ON mj.id = mr.jobId
WHERE mr.restocked = 0 AND mr.quantityGood > 0;

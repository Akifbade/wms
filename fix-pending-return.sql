-- Check the specific return record that's incorrectly restocked
SELECT id, materialId, quantityGood, restocked, restockedAt, jobId
FROM material_returns 
WHERE id = 'cmj3zfali000liwfbvxh9qxnh';

-- This return should have restocked=0 because the job is still PENDING_APPROVAL
-- Let's fix it
UPDATE material_returns 
SET restocked = 0, restockedAt = NULL 
WHERE id = 'cmj3zfali000liwfbvxh9qxnh';

-- Also need to subtract 18 from totalQuantity since it was incorrectly added
UPDATE packing_materials 
SET totalQuantity = totalQuantity - 18 
WHERE name = 'TEST';

-- Verify the fix
SELECT name, totalQuantity FROM packing_materials WHERE name = 'TEST';
SELECT id, quantityGood, restocked FROM material_returns WHERE id = 'cmj3zfali000liwfbvxh9qxnh';

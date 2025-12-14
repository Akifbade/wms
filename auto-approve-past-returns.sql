-- Auto-approve all past pending returns and restock materials
-- Step 1: Add quantities back to stock for each material
UPDATE packing_materials pm
SET totalQuantity = totalQuantity + (
    SELECT COALESCE(SUM(mr.quantityGood), 0)
    FROM material_returns mr
    WHERE mr.materialId = pm.id AND mr.restocked = 0
)
WHERE id IN (SELECT DISTINCT materialId FROM material_returns WHERE restocked = 0);

-- Step 2: Mark all pending returns as restocked (approved)
UPDATE material_returns SET restocked = 1, restockedAt = NOW() WHERE restocked = 0;

-- Step 3: Also approve any pending material_approvals
UPDATE material_approvals SET status = 'APPROVED', approvedAt = NOW() WHERE status = 'PENDING';

-- Verify
SELECT 'Done! All pending returns and approvals auto-approved.' as status;
SELECT COUNT(*) as remaining_pending FROM material_returns WHERE restocked = 0;

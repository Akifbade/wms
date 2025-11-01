-- Add RACKS/DELETE permission if it doesn't exist
INSERT INTO `permissions` (`id`, `resource`, `action`, `description`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('perm_', UUID()),
  'RACKS',
  'DELETE',
  'Delete racks from the warehouse',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `permissions` WHERE `resource` = 'RACKS' AND `action` = 'DELETE'
);

-- Get the permission ID for RACKS/DELETE
SET @perm_id = (SELECT `id` FROM `permissions` WHERE `resource` = 'RACKS' AND `action` = 'DELETE' LIMIT 1);

-- Get all companies
SET @company_id = NULL;

-- Assign RACKS/DELETE to ADMIN role for all companies (if they don't have it)
INSERT INTO `role_permissions` (`id`, `role`, `permissionId`, `companyId`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('rp_', UUID()),
  'ADMIN',
  @perm_id,
  `id`,
  NOW(),
  NOW()
FROM `companies`
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` 
  WHERE `role` = 'ADMIN' 
  AND `permissionId` = @perm_id 
  AND `companyId` = `companies`.`id`
);

-- Also assign to MANAGER role (managers can delete racks)
INSERT INTO `role_permissions` (`id`, `role`, `permissionId`, `companyId`, `createdAt`, `updatedAt`)
SELECT 
  CONCAT('rp_', UUID()),
  'MANAGER',
  @perm_id,
  `id`,
  NOW(),
  NOW()
FROM `companies`
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` 
  WHERE `role` = 'MANAGER' 
  AND `permissionId` = @perm_id 
  AND `companyId` = `companies`.`id`
);

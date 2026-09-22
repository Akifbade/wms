-- Material V3: buy by pack/box with auto per-unit cost
ALTER TABLE `mat_v3_purchase_items`
  ADD COLUMN `packUnit` VARCHAR(191) NULL,
  ADD COLUMN `packQty` INTEGER NULL,
  ADD COLUMN `unitsPerPack` INTEGER NULL,
  ADD COLUMN `packCost` DOUBLE NULL;

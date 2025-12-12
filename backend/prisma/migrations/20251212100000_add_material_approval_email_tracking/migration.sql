-- Add email recipient tracking + reminders for internal approvals

ALTER TABLE `material_approvals`
  ADD COLUMN `notifyEmails` TEXT NULL,
  ADD COLUMN `reminderCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `lastReminderAt` DATETIME(3) NULL;

CREATE INDEX `material_approvals_company_status_type_idx`
  ON `material_approvals` (`companyId`, `status`, `approvalType`);

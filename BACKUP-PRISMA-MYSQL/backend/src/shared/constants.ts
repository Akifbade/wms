export const JOB_STATUSES = [
  "PLANNED",
  "DISPATCHED",
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_ASSIGNMENT_ROLES = [
  "TEAM_LEAD",
  "LABOR",
  "DRIVER",
  "HELPER",
  "SUPERVISOR",
] as const;
export type JobAssignmentRole = (typeof JOB_ASSIGNMENT_ROLES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const MATERIAL_APPROVAL_TYPES = [
  "RETURN",
  "DAMAGE",
  "STOCK_IN",
] as const;
export type MaterialApprovalType = (typeof MATERIAL_APPROVAL_TYPES)[number];

export const PLUGIN_STATUSES = [
  "INSTALLED",
  "ACTIVE",
  "DISABLED",
  "ERROR",
] as const;
export type PluginStatus = (typeof PLUGIN_STATUSES)[number];

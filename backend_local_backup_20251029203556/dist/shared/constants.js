"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLUGIN_STATUSES = exports.MATERIAL_APPROVAL_TYPES = exports.APPROVAL_STATUSES = exports.JOB_ASSIGNMENT_ROLES = exports.JOB_STATUSES = void 0;
exports.JOB_STATUSES = [
    "PLANNED",
    "DISPATCHED",
    "IN_PROGRESS",
    "COMPLETED",
    "CLOSED",
    "CANCELLED",
];
exports.JOB_ASSIGNMENT_ROLES = [
    "TEAM_LEAD",
    "LABOR",
    "DRIVER",
    "HELPER",
    "SUPERVISOR",
];
exports.APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
exports.MATERIAL_APPROVAL_TYPES = [
    "RETURN",
    "DAMAGE",
    "STOCK_IN",
];
exports.PLUGIN_STATUSES = [
    "INSTALLED",
    "ACTIVE",
    "DISABLED",
    "ERROR",
];

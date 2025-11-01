"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.getUserPermissions = getUserPermissions;
exports.checkPermission = checkPermission;
exports.requireRole = requireRole;
// Define permissions for each role
exports.ROLE_PERMISSIONS = {
    ADMIN: {
        canViewDashboard: true,
        canManageUsers: true,
        canManageRacks: true,
        canManageShipments: true,
        canManageMovingJobs: true,
        canViewReports: true,
        canManageSettings: true,
        canScanShipments: true,
        canManageMaterials: true,
        canViewFinancials: true,
        canManageExpenses: true,
        canAccessAllJobs: true,
    },
    MANAGER: {
        canViewDashboard: true,
        canManageUsers: true,
        canManageRacks: true,
        canManageShipments: true,
        canManageMovingJobs: true,
        canViewReports: true,
        canManageSettings: false,
        canScanShipments: true,
        canManageMaterials: true,
        canViewFinancials: true,
        canManageExpenses: true,
        canAccessAllJobs: true,
    },
    DRIVER: {
        canViewDashboard: false,
        canManageUsers: false,
        canManageRacks: false,
        canManageShipments: false,
        canManageMovingJobs: false, // Can only view assigned jobs
        canViewReports: false,
        canManageSettings: false,
        canScanShipments: false,
        canManageMaterials: false,
        canViewFinancials: false,
        canManageExpenses: false,
        canAccessAllJobs: false, // Only assigned jobs
    },
    WORKER: {
        canViewDashboard: true,
        canManageUsers: false,
        canManageRacks: false,
        canManageShipments: true,
        canManageMovingJobs: false,
        canViewReports: false,
        canManageSettings: false,
        canScanShipments: true,
        canManageMaterials: false,
        canViewFinancials: false,
        canManageExpenses: false,
        canAccessAllJobs: false,
    },
    SCANNER: {
        canViewDashboard: false,
        canManageUsers: false,
        canManageRacks: false,
        canManageShipments: false,
        canManageMovingJobs: false,
        canViewReports: false,
        canManageSettings: false,
        canScanShipments: true, // ONLY scanning
        canManageMaterials: false,
        canViewFinancials: false,
        canManageExpenses: false,
        canAccessAllJobs: false,
    },
    PACKER: {
        // Dummy user - cannot login to system
        canViewDashboard: false,
        canManageUsers: false,
        canManageRacks: false,
        canManageShipments: false,
        canManageMovingJobs: false,
        canViewReports: false,
        canManageSettings: false,
        canScanShipments: false,
        canManageMaterials: false,
        canViewFinancials: false,
        canManageExpenses: false,
        canAccessAllJobs: false,
    },
    LABOR: {
        // Dummy user - cannot login to system
        canViewDashboard: false,
        canManageUsers: false,
        canManageRacks: false,
        canManageShipments: false,
        canManageMovingJobs: false,
        canViewReports: false,
        canManageSettings: false,
        canScanShipments: false,
        canManageMaterials: false,
        canViewFinancials: false,
        canManageExpenses: false,
        canAccessAllJobs: false,
    },
};
// Get permissions for a user (with override support)
function getUserPermissions(role, customPermissions) {
    const basePermissions = exports.ROLE_PERMISSIONS[role] || exports.ROLE_PERMISSIONS.WORKER;
    // If custom permissions provided, merge them
    if (customPermissions) {
        try {
            const custom = JSON.parse(customPermissions);
            return { ...basePermissions, ...custom };
        }
        catch (e) {
            return basePermissions;
        }
    }
    return basePermissions;
}
// Middleware to check if user has a specific permission
function checkPermission(permissionKey) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const permissions = getUserPermissions(req.user.role, req.user.permissions);
        if (!permissions[permissionKey]) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
}
// Middleware to check if user has specific role(s)
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
        next();
    };
}

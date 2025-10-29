import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
    permissions?: string;
  };
}

// Define permissions for each role
export const ROLE_PERMISSIONS = {
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
export function getUserPermissions(role: string, customPermissions?: string) {
  const basePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.WORKER;
  
  // If custom permissions provided, merge them
  if (customPermissions) {
    try {
      const custom = JSON.parse(customPermissions);
      return { ...basePermissions, ...custom };
    } catch (e) {
      return basePermissions;
    }
  }
  
  return basePermissions;
}

// Middleware to check if user has a specific permission
export function checkPermission(permissionKey: keyof typeof ROLE_PERMISSIONS.ADMIN) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }

    next();
  };
}

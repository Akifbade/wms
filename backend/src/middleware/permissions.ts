import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  };
}

/**
 * Check if a user has a specific permission
 */
export async function checkPermission(
  userId: string,
  companyId: string,
  role: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Get the permission
    const permission = await prisma.permission.findUnique({
      where: {
        resource_action: {
          resource,
          action
        }
      }
    });

    if (!permission) {
      return false;
    }

    // Check if the role has this permission for this company
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId_companyId: {
          role,
          permissionId: permission.id,
          companyId
        }
      }
    });

    return !!rolePermission;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string,
  companyId: string,
  role: string
): Promise<Array<{ resource: string; action: string }>> {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role,
        companyId
      },
      include: {
        permission: true
      }
    });

    return rolePermissions.map(rp => ({
      resource: rp.permission.resource,
      action: rp.permission.action
    }));
  } catch (error) {
    console.error('Get user permissions error:', error);
    return [];
  }
}

/**
 * Middleware factory: Require specific permission to access route
 * Usage: router.get('/shipments', requirePermission('SHIPMENTS', 'VIEW'), handler)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id, role, companyId } = req.user;

      // Check permission
      const hasPermission = await checkPermission(
        id,
        companyId,
        role,
        resource,
        action
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${action} access to ${resource}`,
          required: {
            resource,
            action
          }
        });
      }

      // Permission granted, continue
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
}

/**
 * Middleware factory: Require ANY of the specified permissions
 * Usage: router.get('/data', requireAnyPermission([
 *   { resource: 'SHIPMENTS', action: 'VIEW' },
 *   { resource: 'RACKS', action: 'VIEW' }
 * ]), handler)
 */
export function requireAnyPermission(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id, role, companyId } = req.user;

      // Check if user has ANY of the required permissions
      const checks = await Promise.all(
        permissions.map(p =>
          checkPermission(id, companyId, role, p.resource, p.action)
        )
      );

      const hasAnyPermission = checks.some(check => check === true);

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: No required permission found',
          required: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
}

/**
 * Middleware factory: Require ALL of the specified permissions
 * Usage: router.post('/critical', requireAllPermissions([
 *   { resource: 'SHIPMENTS', action: 'DELETE' },
 *   { resource: 'INVOICES', action: 'MANAGE' }
 * ]), handler)
 */
export function requireAllPermissions(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id, role, companyId } = req.user;

      // Check if user has ALL of the required permissions
      const checks = await Promise.all(
        permissions.map(p =>
          checkPermission(id, companyId, role, p.resource, p.action)
        )
      );

      const hasAllPermissions = checks.every(check => check === true);

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: All required permissions not met',
          required: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
}

/**
 * Middleware: Require ADMIN role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Middleware: Require ADMIN or MANAGER role
 */
export function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({
      success: false,
      message: 'Manager access required'
    });
  }

  next();
}

import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requirePermission, AuthRequest } from '../middleware/permissions';
import { checkPermission, getUserPermissions } from '../middleware/permissions';

const router = express.Router();

/**
 * GET /api/permissions
 * Get all available permissions
 * Requires: ADMIN role
 */
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    // Group by resource
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        permissions,
        grouped,
        total: permissions.length
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions'
    });
  }
});

/**
 * GET /api/permissions/role/:role
 * Get permissions for a specific role
 * Requires: ADMIN role or viewing own role
 */
router.get('/role/:role', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { role } = req.params;
    const user = req.user!;

    // Only admins can view other roles
    if (role !== user.role && user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot view permissions for other roles'
      });
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role,
        companyId: user.companyId
      },
      include: {
        permission: true
      }
    });

    const permissions = rolePermissions.map(rp => ({
      id: rp.id,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
      permissionId: rp.permissionId
    }));

    // Group by resource
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        role,
        permissions,
        grouped,
        total: permissions.length
      }
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role permissions'
    });
  }
});

/**
 * GET /api/permissions/my-permissions
 * Get current user's permissions
 */
router.get('/my-permissions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    const permissions = await getUserPermissions(user.id, user.companyId, user.role);

    // Group by resource
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        permissions,
        grouped,
        total: permissions.length,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions'
    });
  }
});

/**
 * POST /api/permissions/check
 * Check if user has specific permission
 * Body: { resource: string, action: string }
 */
router.post('/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { resource, action } = req.body;
    const user = req.user!;

    if (!resource || !action) {
      return res.status(400).json({
        success: false,
        message: 'Resource and action are required'
      });
    }

    const hasPermission = await checkPermission(
      user.id,
      user.companyId,
      user.role,
      resource,
      action
    );

    res.json({
      success: true,
      data: {
        hasPermission,
        resource,
        action,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Permission check failed'
    });
  }
});

/**
 * POST /api/permissions/assign
 * Assign permission to role
 * Requires: ADMIN role
 * Body: { role: string, permissionId: string }
 */
router.post('/assign', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { role, permissionId } = req.body;
    const user = req.user!;

    if (!role || !permissionId) {
      return res.status(400).json({
        success: false,
        message: 'Role and permissionId are required'
      });
    }

    // Validate permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId }
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Check if already assigned
    const existing = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId_companyId: {
          role,
          permissionId,
          companyId: user.companyId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Permission already assigned to role'
      });
    }

    // Assign permission
    const rolePermission = await prisma.rolePermission.create({
      data: {
        role,
        permissionId,
        companyId: user.companyId
      },
      include: {
        permission: true
      }
    });

    res.json({
      success: true,
      message: 'Permission assigned successfully',
      data: rolePermission
    });
  } catch (error) {
    console.error('Assign permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign permission'
    });
  }
});

/**
 * DELETE /api/permissions/revoke/:rolePermissionId
 * Revoke permission from role
 * Requires: ADMIN role
 */
router.delete('/revoke/:rolePermissionId', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { rolePermissionId } = req.params;
    const user = req.user!;

    // Verify the role permission belongs to this company
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        id: rolePermissionId,
        companyId: user.companyId
      },
      include: {
        permission: true
      }
    });

    if (!rolePermission) {
      return res.status(404).json({
        success: false,
        message: 'Role permission not found'
      });
    }

    await prisma.rolePermission.delete({
      where: { id: rolePermissionId }
    });

    res.json({
      success: true,
      message: 'Permission revoked successfully',
      data: {
        role: rolePermission.role,
        permission: {
          resource: rolePermission.permission.resource,
          action: rolePermission.permission.action
        }
      }
    });
  } catch (error) {
    console.error('Revoke permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke permission'
    });
  }
});

/**
 * PUT /api/permissions/role/:role/bulk
 * Bulk update permissions for a role
 * Requires: ADMIN role
 * Body: { permissionIds: string[] }
 */
router.put('/role/:role/bulk', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { role } = req.params;
    const { permissionIds } = req.body;
    const user = req.user!;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: 'permissionIds must be an array'
      });
    }

    // Delete all existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: {
        role,
        companyId: user.companyId
      }
    });

    // Create new permissions
    const newPermissions = await Promise.all(
      permissionIds.map(permissionId =>
        prisma.rolePermission.create({
          data: {
            role,
            permissionId,
            companyId: user.companyId
          },
          include: {
            permission: true
          }
        })
      )
    );

    res.json({
      success: true,
      message: `Updated ${newPermissions.length} permissions for role ${role}`,
      data: {
        role,
        permissions: newPermissions.map(rp => ({
          resource: rp.permission.resource,
          action: rp.permission.action
        })),
        total: newPermissions.length
      }
    });
  } catch (error) {
    console.error('Bulk update permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions'
    });
  }
});

export default router;

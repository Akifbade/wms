import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/users - Get all users in company
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        avatar: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ===== USER PROFILE MANAGEMENT =====
// Note: Profile routes MUST come before /:id to avoid route conflicts

/**
 * GET /api/users/profile/me
 * Get current user's full profile
 */
router.get('/profile/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        skills: true,
        avatar: true,
        position: true,
        department: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            plan: true
          }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Force HTTPS in production, HTTP in development
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? `http://${req.get('host')}` : `https://${req.get('host')}`;

    res.json({ 
      success: true,
      data: {
        ...user,
        company: user.company ? {
          ...user.company,
          logoUrl: user.company.logo ? `${baseUrl}${user.company.logo}` : null,
          logoPath: user.company.logo
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profile' 
    });
  }
});

/**
 * PUT /api/users/profile/me
 * Update current user's profile
 */
router.put('/profile/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { name, phone, skills, position, department } = req.body;

    // Validate user exists
    const existingUser = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Update profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(skills !== undefined && { skills }),
        ...(position !== undefined && { position }),
        ...(department !== undefined && { department }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        skills: true,
        avatar: true,
        position: true,
        department: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ 
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile' 
    });
  }
});

/**
 * PUT /api/users/profile/password
 * Change current user's password
 */
router.put('/profile/password', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'New password must be at least 6 characters long' 
      });
    }

    // Get user with password
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to change password' 
    });
  }
});

/**
 * PUT /api/users/profile/avatar
 * Update current user's avatar
 */
router.put('/profile/avatar', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ 
        success: false,
        error: 'Avatar URL is required' 
      });
    }

    // Validate user exists
    const existingUser = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });

    if (!existingUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Update avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    res.json({ 
      success: true,
      message: 'Avatar updated successfully',
      data: updatedUser 
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update avatar' 
    });
  }
});

/**
 * GET /api/users/profile/stats
 * Get current user's activity statistics
 */
router.get('/profile/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Get user
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Get statistics
    const [
      rackActivities,
      jobAssignments,
    ] = await Promise.all([
      prisma.rackActivity.count({
        where: { userId, companyId }
      }),
      prisma.jobAssignment.count({
        where: { userId }
      })
    ]);

    // Calculate days since joined
    const daysSinceJoined = Math.floor(
      (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    res.json({ 
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        stats: {
          rackActivities,
          jobAssignments,
          daysSinceJoined,
          lastLoginAt: user.lastLoginAt,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user stats' 
    });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const user = await prisma.user.findFirst({
      where: { 
        id,
        companyId, // Ensure user belongs to same company
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user (ADMIN only)
router.post('/', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { email, name, password, role } = req.body;

    // Validation
    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: 'Email, name, password, and role are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['ADMIN', 'MANAGER', 'WORKER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role,
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ user, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user (ADMIN only)
router.put('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const { name, email, role, isActive, password } = req.body;

    // Ensure user belongs to same company
    const existingUser = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (role && !['ADMIN', 'MANAGER', 'WORKER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Hash new password if provided
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (ADMIN only)
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const currentUserId = req.user!.id;

    // Prevent self-deletion
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Ensure user belongs to same company
    const user = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PATCH /api/users/:id/toggle - Toggle user active status (ADMIN only)
router.patch('/:id/toggle', authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const currentUserId = req.user!.id;

    // Prevent toggling own status
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Cannot toggle your own status' });
    }

    // Ensure user belongs to same company
    const user = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user: updatedUser, message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

export default router;

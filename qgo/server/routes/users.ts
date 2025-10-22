import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get all users (admin only)
router.get('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        uid: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        uid: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin only)
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { uid, email, displayName, password, role = 'user' } = req.body;

    if (!uid || !email || !displayName || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { uid }] },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        uid,
        email,
        displayName,
        passwordHash,
        role,
        status: 'active',
      },
      select: {
        id: true,
        uid: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
router.put('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, role, status, password } = req.body;

    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        uid: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

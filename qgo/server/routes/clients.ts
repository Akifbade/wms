import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get all clients
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get client by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create client
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, contactPerson, phone, email, type } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const client = await prisma.client.create({
      data: {
        name,
        address,
        contactPerson,
        phone,
        email,
        type,
      },
    });

    res.status(201).json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update client
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, contactPerson, phone, email, type } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        contactPerson,
        phone,
        email,
        type,
      },
    });

    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete client
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.client.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

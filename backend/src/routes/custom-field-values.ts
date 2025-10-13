import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get custom field values for an entity
router.get('/:entityType/:entityId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { companyId } = req.user!;

    const values = await prisma.customFieldValue.findMany({
      where: {
        entityType: entityType.toUpperCase(),
        entityId,
        companyId
      },
      include: {
        customField: true
      }
    });

    res.json(values);
  } catch (error) {
    console.error('Error fetching custom field values:', error);
    res.status(500).json({ error: 'Failed to fetch custom field values' });
  }
});

// Save/Update custom field values for an entity (bulk operation)
router.post('/:entityType/:entityId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { companyId } = req.user!;
    const { values } = req.body; // Array of { customFieldId, fieldValue }

    if (!Array.isArray(values)) {
      return res.status(400).json({ error: 'Values must be an array' });
    }

    // Delete existing values for this entity
    await prisma.customFieldValue.deleteMany({
      where: {
        entityType: entityType.toUpperCase(),
        entityId,
        companyId
      }
    });

    // Create new values
    const createdValues = await Promise.all(
      values.map(async (value) => {
        // Skip empty values
        if (!value.fieldValue || value.fieldValue === '') {
          return null;
        }

        return prisma.customFieldValue.create({
          data: {
            customFieldId: value.customFieldId,
            entityType: entityType.toUpperCase(),
            entityId,
            fieldValue: String(value.fieldValue),
            companyId
          },
          include: {
            customField: true
          }
        });
      })
    );

    // Filter out null values (empty fields)
    const validValues = createdValues.filter(v => v !== null);

    res.json(validValues);
  } catch (error) {
    console.error('Error saving custom field values:', error);
    res.status(500).json({ error: 'Failed to save custom field values' });
  }
});

// Delete custom field value
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user!;

    await prisma.customFieldValue.delete({
      where: {
        id,
        companyId
      }
    });

    res.json({ message: 'Custom field value deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom field value:', error);
    res.status(500).json({ error: 'Failed to delete custom field value' });
  }
});

export default router;

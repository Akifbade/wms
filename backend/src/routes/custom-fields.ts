import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET all custom fields
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { section } = req.query;

    const where: any = { companyId, isActive: true };
    
    if (section) {
      where.section = section;
    }

    const customFields = await prisma.customField.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    // Parse fieldOptions from JSON string to array
    const fields = customFields.map((field: any) => ({
      ...field,
      fieldOptions: field.fieldOptions ? JSON.parse(field.fieldOptions) : null
    }));

    res.json({ customFields: fields });
  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
});

// GET single custom field
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const customField = await prisma.customField.findFirst({
      where: { id, companyId }
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    // Parse fieldOptions from JSON string
    const field = {
      ...customField,
      fieldOptions: customField.fieldOptions ? JSON.parse(customField.fieldOptions) : null
    };

    res.json(field);
  } catch (error: any) {
    console.error('Error fetching custom field:', error);
    res.status(500).json({ error: 'Failed to fetch custom field' });
  }
});

// POST create new custom field
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { fieldName, fieldType, fieldOptions, isRequired, section } = req.body;

    // Validation
    if (!fieldName || !fieldName.trim()) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    if (!fieldType || !['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CHECKBOX'].includes(fieldType)) {
      return res.status(400).json({ error: 'Invalid field type. Must be TEXT, NUMBER, DATE, DROPDOWN, or CHECKBOX' });
    }

    if (!section || !['SHIPMENT', 'JOB', 'EXPENSE'].includes(section)) {
      return res.status(400).json({ error: 'Invalid section. Must be SHIPMENT, JOB, or EXPENSE' });
    }

    // Validate options for DROPDOWN type
    if (fieldType === 'DROPDOWN') {
      if (!fieldOptions || !Array.isArray(fieldOptions) || fieldOptions.length === 0) {
        return res.status(400).json({ error: 'Dropdown field must have at least one option' });
      }
      
      const validOptions = fieldOptions.filter((opt: any) => opt && opt.trim());
      if (validOptions.length === 0) {
        return res.status(400).json({ error: 'Dropdown must have at least one non-empty option' });
      }
    }

    // Check if field name already exists in the same section
    const existingField = await prisma.customField.findFirst({
      where: { 
        fieldName: fieldName.trim(), 
        section,
        companyId,
        isActive: true
      }
    });

    if (existingField) {
      return res.status(400).json({ error: `Field "${fieldName}" already exists in ${section} section` });
    }

    // Convert fieldOptions array to JSON string for storage
    const optionsString = fieldOptions && Array.isArray(fieldOptions) 
      ? JSON.stringify(fieldOptions.filter((opt: any) => opt && opt.trim()))
      : null;

    const customField = await prisma.customField.create({
      data: {
        fieldName: fieldName.trim(),
        fieldType,
        fieldOptions: optionsString,
        isRequired: isRequired || false,
        section,
        isActive: true,
        companyId
      }
    });

    // Return with parsed options
    const field = {
      ...customField,
      fieldOptions: customField.fieldOptions ? JSON.parse(customField.fieldOptions) : null
    };

    res.status(201).json(field);
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// PUT update custom field
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const { fieldName, fieldType, fieldOptions, isRequired, section, isActive } = req.body;

    // Check if field exists and belongs to company
    const existingField = await prisma.customField.findFirst({
      where: { id, companyId }
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    // Validation
    if (fieldName && !fieldName.trim()) {
      return res.status(400).json({ error: 'Field name cannot be empty' });
    }

    if (fieldType && !['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CHECKBOX'].includes(fieldType)) {
      return res.status(400).json({ error: 'Invalid field type' });
    }

    if (section && !['SHIPMENT', 'JOB', 'EXPENSE'].includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    // Check if new name conflicts with existing field in same section
    if (fieldName && fieldName.trim() !== existingField.fieldName) {
      const nameConflict = await prisma.customField.findFirst({
        where: { 
          fieldName: fieldName.trim(),
          section: section || existingField.section,
          companyId,
          isActive: true,
          id: { not: id }
        }
      });

      if (nameConflict) {
        return res.status(400).json({ error: 'Field name already exists in this section' });
      }
    }

    // Validate options for DROPDOWN type
    const updatedFieldType = fieldType || existingField.fieldType;
    if (updatedFieldType === 'DROPDOWN' && fieldOptions !== undefined) {
      if (!Array.isArray(fieldOptions) || fieldOptions.length === 0) {
        return res.status(400).json({ error: 'Dropdown field must have at least one option' });
      }
      
      const validOptions = fieldOptions.filter((opt: any) => opt && opt.trim());
      if (validOptions.length === 0) {
        return res.status(400).json({ error: 'Dropdown must have at least one non-empty option' });
      }
    }

    // Convert fieldOptions array to JSON string if provided
    const optionsString = fieldOptions !== undefined
      ? (Array.isArray(fieldOptions) 
          ? JSON.stringify(fieldOptions.filter((opt: any) => opt && opt.trim()))
          : null)
      : undefined;

    const updatedField = await prisma.customField.update({
      where: { id },
      data: {
        ...(fieldName && { fieldName: fieldName.trim() }),
        ...(fieldType && { fieldType }),
        ...(optionsString !== undefined && { fieldOptions: optionsString }),
        ...(isRequired !== undefined && { isRequired }),
        ...(section && { section }),
        ...(isActive !== undefined && { isActive })
      }
    });

    // Return with parsed options
    const field = {
      ...updatedField,
      fieldOptions: updatedField.fieldOptions ? JSON.parse(updatedField.fieldOptions) : null
    };

    res.json(field);
  } catch (error: any) {
    console.error('Error updating custom field:', error);
    res.status(500).json({ error: 'Failed to update custom field' });
  }
});

// DELETE custom field (soft delete - set isActive to false)
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // Check if field exists and belongs to company
    const existingField = await prisma.customField.findFirst({
      where: { id, companyId }
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    // Soft delete by setting isActive to false
    await prisma.customField.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Custom field deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

// GET custom fields statistics
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const fields = await prisma.customField.findMany({
      where: { companyId, isActive: true },
      select: {
        section: true,
        fieldType: true,
        isRequired: true
      }
    });

    const stats = {
      total: fields.length,
      bySection: {
        SHIPMENT: 0,
        JOB: 0,
        EXPENSE: 0
      },
      byType: {
        TEXT: 0,
        NUMBER: 0,
        DATE: 0,
        DROPDOWN: 0,
        CHECKBOX: 0
      },
      required: 0
    };

    fields.forEach((field: any) => {
      const section = field.section as 'SHIPMENT' | 'JOB' | 'EXPENSE';
      const type = field.fieldType as 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';
      
      if (stats.bySection[section] !== undefined) {
        stats.bySection[section]++;
      }
      
      if (stats.byType[type] !== undefined) {
        stats.byType[type]++;
      }
      
      if (field.isRequired) {
        stats.required++;
      }
    });

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching custom fields statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

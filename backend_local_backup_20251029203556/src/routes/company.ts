import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// PUBLIC endpoint for branding (no auth required) - MUST be before authenticateToken
router.get('/branding', async (req, res: Response) => {
  try {
    // Get first company (for single-tenant system)
    const company = await prisma.company.findFirst({
      select: {
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        showCompanyName: true,
        logoSize: true,
      },
    });

    if (!company) {
      // Return defaults if no company exists
      return res.json({
        branding: {
          name: 'Warehouse Management',
          logo: null,
          primaryColor: '#4F46E5',
          secondaryColor: '#7C3AED',
          accentColor: '#10B981',
          showCompanyName: true,
        }
      });
    }

    // Use HTTP protocol (not HTTPS) since we don't have SSL yet
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.json({
      branding: {
        name: company.name,
        logo: company.logo,
        logoUrl: company.logo ? `${baseUrl}${company.logo}` : null,
        primaryColor: company.primaryColor || '#4F46E5',
        secondaryColor: company.secondaryColor || '#7C3AED',
        accentColor: company.accentColor || '#10B981',
        showCompanyName: company.showCompanyName !== false,
        logoSize: (company as any).logoSize || 'medium',
      }
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    // Return defaults on error
    res.json({
      branding: {
        name: 'Warehouse Management',
        logo: null,
        primaryColor: '#4F46E5',
        secondaryColor: '#7C3AED',
        accentColor: '#10B981',
        showCompanyName: true,
      }
    });
  }
});

// Apply authentication to all OTHER routes
router.use(authenticateToken);

// GET /api/company - Get company information
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

  // DEBUG: Log authenticated user and companyId
  console.log('🔍 GET /api/company - authenticated user:', req.user);
  console.log('🔍 Fetching company for ID:', companyId);
  const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        showCompanyName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Use HTTP protocol (not HTTPS) since we don't have SSL yet
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.json({ 
      company: {
        ...company,
        logoPath: company.logo,
        logoUrl: company.logo ? `${baseUrl}${company.logo}` : null,
      }
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
});

// PUT /api/company - Update company information
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { name, email, phone, website, address, logo, primaryColor, secondaryColor, accentColor, showCompanyName } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const updateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      address: address?.trim() || null,
      logo: logo?.trim() || null,
    };

    if (email !== undefined) {
      const cleanedEmail = email.trim();
      if (cleanedEmail === '') {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      updateData.email = cleanedEmail;
    }

    if (primaryColor?.trim()) {
      updateData.primaryColor = primaryColor.trim();
    }

    if (secondaryColor?.trim()) {
      updateData.secondaryColor = secondaryColor.trim();
    }

    if (accentColor?.trim()) {
      updateData.accentColor = accentColor.trim();
    }

    if (showCompanyName !== undefined) {
      updateData.showCompanyName = showCompanyName;
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        showCompanyName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Use HTTP protocol (not HTTPS) since we don't have SSL yet
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.json({ 
      company: {
        ...company,
        logoPath: company.logo,
        logoUrl: company.logo ? `${baseUrl}${company.logo}` : null,
      },
      message: 'Company information updated successfully' 
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company information' });
  }
});

export default router;

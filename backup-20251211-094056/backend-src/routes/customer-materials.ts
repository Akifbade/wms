import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all customers with their material summary
router.get('/customers/materials', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { search, category, status } = req.query;

    // Build where clause
    const where: any = { companyId, isWarehouseShipment: true };

    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { shipper: { contains: search as string } },
        { consignee: { contains: search as string } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    // Get all warehouse shipments
    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        boxes: {
          include: {
            rack: {
              select: {
                id: true,
                code: true,
                location: true,
              },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by customer name
    const customerMap = new Map<string, any>();

    shipments.forEach(shipment => {
      const customerKey = shipment.customerName || shipment.shipper || 'Unknown Customer';

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          customerName: customerKey,
          shipper: shipment.shipper,
          consignee: shipment.consignee,
          totalShipments: 0,
          totalBoxes: 0,
          assignedBoxes: 0,
          inStorageBoxes: 0,
          releasedBoxes: 0,
          categories: new Set<string>(),
          items: {},
          locations: new Set<string>(),
          shipments: [],
        });
      }

      const customer = customerMap.get(customerKey)!;
      customer.totalShipments += 1;
      customer.totalBoxes += shipment.boxes.length;
      customer.assignedBoxes += shipment.boxes.filter(b => b.rackId !== null).length;
      customer.inStorageBoxes += shipment.boxes.filter(b => b.status === 'IN_STORAGE').length;
      customer.releasedBoxes += shipment.boxes.filter(b => b.status === 'RELEASED').length;
      customer.categories.add(shipment.category);

      // Collect rack locations
      shipment.boxes.forEach(box => {
        if (box.rack) {
          customer.locations.add(box.rack.code);
        }
      });

      // Aggregate items by category
      shipment.items.forEach(item => {
        const itemCategory = item.category;
        if (!customer.items[itemCategory]) {
          customer.items[itemCategory] = {
            category: itemCategory,
            totalQuantity: 0,
            totalWeight: 0,
            totalValue: 0,
            itemNames: new Set<string>(),
          };
        }
        customer.items[itemCategory].totalQuantity += item.quantity;
        customer.items[itemCategory].totalWeight += item.weight || 0;
        customer.items[itemCategory].totalValue += item.value || 0;
        customer.items[itemCategory].itemNames.add(item.itemName);
      });

      // Add shipment summary
      customer.shipments.push({
        id: shipment.id,
        name: shipment.name,
        referenceId: shipment.referenceId,
        category: shipment.category,
        awbNumber: shipment.awbNumber,
        status: shipment.status,
        boxCount: shipment.boxes.length,
        arrivalDate: shipment.arrivalDate,
      });
    });

    // Convert to array and format
    const customers = Array.from(customerMap.values()).map(customer => ({
      customerName: customer.customerName,
      shipper: customer.shipper,
      consignee: customer.consignee,
      totalShipments: customer.totalShipments,
      totalBoxes: customer.totalBoxes,
      assignedBoxes: customer.assignedBoxes,
      inStorageBoxes: customer.inStorageBoxes,
      releasedBoxes: customer.releasedBoxes,
      categories: Array.from(customer.categories),
      items: Object.values(customer.items).map((item: any) => ({
        ...item,
        itemNames: Array.from(item.itemNames),
      })),
      locations: Array.from(customer.locations).sort(),
      shipments: customer.shipments,
    }));

    // Sort by total boxes descending
    customers.sort((a, b) => b.totalBoxes - a.totalBoxes);

    res.json({
      customers,
      total: customers.length,
    });
  } catch (error) {
    console.error('Error fetching customer materials:', error);
    res.status(500).json({ error: 'Failed to fetch customer materials' });
  }
});

// Get detailed materials for a specific customer
router.get('/customers/:customerName/materials', async (req: AuthRequest, res: Response) => {
  try {
    const { customerName } = req.params;
    const companyId = req.user!.companyId;

    const shipments = await prisma.shipment.findMany({
      where: {
        companyId,
        isWarehouseShipment: true,
        OR: [
          { customerName: { contains: customerName } },
          { shipper: { contains: customerName } },
        ],
      },
      include: {
        boxes: {
          include: {
            rack: {
              select: {
                id: true,
                code: true,
                location: true,
              },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (shipments.length === 0) {
      return res.status(404).json({ error: 'No shipments found for this customer' });
    }

    // Parse items with JSON fields
    const parsedShipments = shipments.map(shipment => ({
      ...shipment,
      items: shipment.items.map(item => ({
        ...item,
        photos: item.photos ? JSON.parse(item.photos) : [],
        boxNumbers: item.boxNumbers ? JSON.parse(item.boxNumbers) : [],
        customAttributes: item.customAttributes ? JSON.parse(item.customAttributes) : {},
      })),
    }));

    res.json({ shipments: parsedShipments });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

// Get customer statistics
router.get('/customers/stats', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const [totalCustomers, totalBoxes, totalShipments, categoryBreakdown] = await Promise.all([
      // Count distinct customers
      prisma.shipment
        .findMany({
          where: { companyId, isWarehouseShipment: true },
          select: { customerName: true, shipper: true },
        })
        .then(shipments => {
          const customers = new Set(
            shipments.map(s => s.customerName || s.shipper).filter(Boolean)
          );
          return customers.size;
        }),

      // Total boxes in storage
      prisma.shipmentBox.count({
        where: {
          companyId,
          status: 'IN_STORAGE',
        },
      }),

      // Total warehouse shipments
      prisma.shipment.count({
        where: { companyId, isWarehouseShipment: true },
      }),

      // Category breakdown
      prisma.shipment
        .groupBy({
          by: ['category'],
          where: { companyId, isWarehouseShipment: true },
          _count: true,
        })
        .then(groups =>
          groups.map(g => ({
            category: g.category,
            count: g._count,
          }))
        ),
    ]);

    res.json({
      totalCustomers,
      totalBoxes,
      totalShipments,
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

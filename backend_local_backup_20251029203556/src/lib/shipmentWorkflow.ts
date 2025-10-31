import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create shipment with automatic box generation in a transaction
 * Ensures data consistency and proper workflow
 */
export async function createShipmentWithBoxes(data: {
  name: string;
  referenceId: string;
  originalBoxCount: number;
  type: 'PERSONAL' | 'COMMERCIAL';
  arrivalDate: Date;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;
  estimatedValue?: number;
  notes?: string;
  companyId: string;
  createdById: string;
  isWarehouseShipment?: boolean;
  warehouseData?: any;
  shipper?: string;
  consignee?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Generate master QR code
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7).toUpperCase();
    const masterQR = `SHP-${timestamp}-${random}`;

    // 2. Create shipment
    const shipment = await tx.shipment.create({
      data: {
        name: data.name,
        referenceId: data.referenceId,
        originalBoxCount: data.originalBoxCount,
        currentBoxCount: data.originalBoxCount,
        type: data.type,
        arrivalDate: data.arrivalDate,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        description: data.description,
        estimatedValue: data.estimatedValue,
        notes: data.notes,
        qrCode: masterQR,
        status: 'ACTIVE',
        companyId: data.companyId,
        createdById: data.createdById,
        isWarehouseShipment: data.isWarehouseShipment || false,
        warehouseData: data.warehouseData ? JSON.stringify(data.warehouseData) : null,
        shipper: data.shipper,
        consignee: data.consignee,
      },
    });

    // 3. Generate individual boxes with QR codes
    const boxes = [];
    for (let i = 1; i <= data.originalBoxCount; i++) {
      const boxQR = `${masterQR}-BOX${String(i).padStart(3, '0')}`;
      boxes.push({
        shipmentId: shipment.id,
        boxNumber: i,
        qrCode: boxQR,
        status: 'PENDING',
        companyId: data.companyId,
      });
    }

    await tx.shipmentBox.createMany({
      data: boxes,
    });

    // 4. Create shipment charges tracking
    await tx.shipmentCharges.create({
      data: {
        shipmentId: shipment.id,
        companyId: data.companyId,
        currentStorageCharge: 0,
        daysStored: 0,
      },
    });

    // 5. Return shipment with boxes
    return tx.shipment.findUnique({
      where: { id: shipment.id },
      include: {
        boxes: {
          orderBy: { boxNumber: 'asc' },
        },
        charges: true,
      },
    });
  });
}

/**
 * Assign boxes to rack with validation
 */
export async function assignBoxesToRack(data: {
  boxIds: string[];
  rackId: string;
  companyId: string;
  assignedById: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Validate rack exists and belongs to company
    const rack = await tx.rack.findFirst({
      where: {
        id: data.rackId,
        companyId: data.companyId,
        status: 'ACTIVE',
      },
    });

    if (!rack) {
      throw new Error('Rack not found or not active');
    }

    // 2. Check rack capacity
    const currentBoxes = await tx.shipmentBox.count({
      where: {
        rackId: data.rackId,
        status: 'IN_STORAGE',
      },
    });

    if (currentBoxes + data.boxIds.length > rack.capacityTotal) {
      throw new Error(`Rack capacity exceeded. Current: ${currentBoxes}, Requested: ${data.boxIds.length}, Max: ${rack.capacityTotal}`);
    }

    // 3. Update boxes
    await tx.shipmentBox.updateMany({
      where: {
        id: { in: data.boxIds },
        companyId: data.companyId,
      },
      data: {
        rackId: data.rackId,
        status: 'IN_STORAGE',
        assignedAt: new Date(),
      },
    });

    // 4. Update rack capacity
    await tx.rack.update({
      where: { id: data.rackId },
      data: {
        capacityUsed: { increment: data.boxIds.length },
        lastActivity: new Date(),
      },
    });

    // 5. Update shipment status if needed
    const boxes = await tx.shipmentBox.findMany({
      where: { id: { in: data.boxIds } },
      select: { shipmentId: true },
    });

    const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];
    
    for (const shipmentId of shipmentIds) {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: { boxes: true },
      });

      if (shipment) {
        const assignedCount = shipment.boxes.filter(b => b.status === 'IN_STORAGE').length;
        
        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: assignedCount === shipment.originalBoxCount ? 'ACTIVE' : 'PARTIAL',
            assignedAt: new Date(),
            assignedById: data.assignedById,
          },
        });
      }
    }

    // 6. Create rack activity log
    await tx.rackActivity.create({
      data: {
        rackId: data.rackId,
        userId: data.assignedById,
        activityType: 'ASSIGN',
        itemDetails: `Assigned ${data.boxIds.length} boxes`,
        quantityAfter: currentBoxes + data.boxIds.length,
        companyId: data.companyId,
      },
    });

    return { success: true, assignedBoxes: data.boxIds.length };
  });
}

/**
 * Release boxes with proper workflow
 */
export async function releaseBoxes(data: {
  boxIds: string[];
  companyId: string;
  releasedById: string;
  generateInvoice?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Get boxes with shipment info
    const boxes = await tx.shipmentBox.findMany({
      where: {
        id: { in: data.boxIds },
        companyId: data.companyId,
      },
      include: {
        shipment: true,
        rack: true,
      },
    });

    if (boxes.length === 0) {
      throw new Error('No boxes found');
    }

    // 2. Update boxes to released
    await tx.shipmentBox.updateMany({
      where: { id: { in: data.boxIds } },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    // 3. Update rack capacities
    const rackUpdates = new Map<string, number>();
    boxes.forEach(box => {
      if (box.rackId) {
        rackUpdates.set(box.rackId, (rackUpdates.get(box.rackId) || 0) + 1);
      }
    });

    for (const [rackId, count] of rackUpdates.entries()) {
      await tx.rack.update({
        where: { id: rackId },
        data: {
          capacityUsed: { decrement: count },
          lastActivity: new Date(),
        },
      });
    }

    // 4. Update shipments
    const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];
    
    for (const shipmentId of shipmentIds) {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: { boxes: true },
      });

      if (shipment) {
        const remainingBoxes = shipment.boxes.filter(
          b => !data.boxIds.includes(b.id) && b.status !== 'RELEASED'
        ).length;

        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            currentBoxCount: remainingBoxes,
            status: remainingBoxes === 0 ? 'RELEASED' : 'PARTIAL',
            releasedAt: remainingBoxes === 0 ? new Date() : shipment.releasedAt,
            releasedById: data.releasedById,
          },
        });

        // Update shipment charges
        await tx.shipmentCharges.update({
          where: { shipmentId },
          data: {
            totalBoxesReleased: { increment: data.boxIds.length },
          },
        });
      }
    }

    return { 
      success: true, 
      releasedBoxes: data.boxIds.length,
      shipments: shipmentIds 
    };
  });
}

export default {
  createShipmentWithBoxes,
  assignBoxesToRack,
  releaseBoxes,
};

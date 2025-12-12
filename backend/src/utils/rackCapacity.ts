import { PrismaClient } from '@prisma/client';

interface BoxWithShipmentMeta {
  boxNumber: number | null;
  pieceQR?: string | null;
  shipment?: {
    id: string;
    boxesPerPallet: number | null;
  } | null;
}

/**
 * Calculates the number of pallet slots consumed by the provided boxes.
 * Uses shipment.boxesPerPallet to determine pallet grouping; falls back
 * to treating each box as a single pallet slot when metadata is missing.
 */
export function calculatePalletUsage(boxes: BoxWithShipmentMeta[]): number {
  if (!boxes || boxes.length === 0) {
    return 0;
  }

  const palletKeys = new Set<string>();

  for (const box of boxes) {
    if (!box) {
      continue;
    }

    const shipmentId = box.shipment?.id ?? 'unknown';
    // Prefer explicit palletNumber in pieceQR (JSON) when available
    let explicitPallet: number | null = null;
    if (box.pieceQR) {
      try {
        const meta = JSON.parse(box.pieceQR as string);
        if (typeof meta?.palletNumber === 'number') {
          explicitPallet = meta.palletNumber;
        }
        if (meta?.isLoose === true) {
          // Loose boxes do not consume a pallet slot
          continue;
        }
      } catch {
        // fall back to computed method
      }
    }

    if (explicitPallet !== null && explicitPallet > 0) {
      palletKeys.add(`${shipmentId}-${explicitPallet}`);
    } else {
      const boxesPerPallet = box.shipment?.boxesPerPallet && box.shipment.boxesPerPallet > 0
        ? box.shipment.boxesPerPallet
        : 1;
      const boxNumber = box.boxNumber ?? 1;
      const palletIndex = Math.ceil(boxNumber / boxesPerPallet);
      palletKeys.add(`${shipmentId}-${palletIndex}`);
    }
  }

  return palletKeys.size;
}

/**
 * Recomputes the pallet usage for a given rack by inspecting current boxes.
 * Returns the recalculated pallet usage for downstream updates.
 */
export async function recomputeRackPalletUsage(
  prisma: PrismaClient,
  rackId: string,
  companyId: string
): Promise<number> {
  const boxes = await prisma.shipmentBox.findMany({
    where: {
      rackId,
      companyId,
      status: {
        in: ['IN_STORAGE', 'STORED'],
      },
    },
    select: {
      boxNumber: true,
      pieceQR: true,
      shipment: {
        select: {
          id: true,
          boxesPerPallet: true,
        },
      },
    },
  });

  return calculatePalletUsage(boxes);
}

/**
 * Calculates the CBM (Cubic Meters) used by boxes in a rack.
 * Uses shipment.cbm field (primary) or shipment_dimensions table (fallback).
 * This ensures CBM is calculated correctly whether dimensions are entered:
 * - Directly in shipment (L×W×H or direct CBM)
 * - Via multi-dimension entries (ShipmentDimension records)
 */
export async function recomputeRackCBMUsage(
  prisma: PrismaClient,
  rackId: string,
  companyId: string
): Promise<number> {
  // Get all boxes in rack with their shipment info
  const boxes = await prisma.shipmentBox.findMany({
    where: {
      rackId,
      companyId,
      status: {
        in: ['IN_STORAGE', 'STORED'],
      },
    },
    select: {
      id: true,
      shipmentId: true,
    },
  });

  if (boxes.length === 0) {
    return 0;
  }

  // Get unique shipment IDs
  const shipmentIds = [...new Set(boxes.map(b => b.shipmentId))];

  // Fetch shipments with CBM and box count - include the cbm field directly!
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds } },
    select: {
      id: true,
      originalBoxCount: true,
      cbm: true,        // ✅ Primary CBM source
      length: true,     // ✅ For fallback calculation
      width: true,
      height: true,
    },
  });

  // Calculate CBM per shipment (per-box)
  const shipmentCBMMap = new Map<string, number>();

  for (const shipment of shipments) {
    const totalBoxes = (shipment as any).originalBoxCount || 1;
    let shipmentTotalCBM = 0;

    // ✅ PRIORITY 1: Use shipment.cbm if available (from direct input or L×W×H calculation)
    if ((shipment as any).cbm && (shipment as any).cbm > 0) {
      shipmentTotalCBM = (shipment as any).cbm;
    }
    // ✅ PRIORITY 2: Calculate from shipment dimensions (L×W×H)
    else if ((shipment as any).length && (shipment as any).width && (shipment as any).height) {
      shipmentTotalCBM = ((shipment as any).length * (shipment as any).width * (shipment as any).height) / 1000000;
    }
    // ✅ PRIORITY 3: Try ShipmentDimension records (multi-dimension entries)
    else {
      try {
        const dimensions = await (prisma as any).shipmentDimension.findMany({
          where: { shipmentId: shipment.id },
        });

        for (const dim of dimensions) {
          const cbm = ((dim.length || 0) * (dim.width || 0) * (dim.height || 0) * (dim.pieces || 1)) / 1000000;
          shipmentTotalCBM += cbm;
        }
      } catch (e) {
        // ShipmentDimension table might not exist yet
        shipmentTotalCBM = 0;
      }
    }

    // Store per-box CBM for this shipment
    const perBoxCBM = shipmentTotalCBM / totalBoxes;
    shipmentCBMMap.set(shipment.id, perBoxCBM);
  }

  // Calculate total CBM for all boxes in rack
  let totalRackCBM = 0;
  for (const box of boxes) {
    const perBoxCBM = shipmentCBMMap.get(box.shipmentId) || 0;
    totalRackCBM += perBoxCBM;
  }

  return Math.round(totalRackCBM * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Updates both pallet usage and CBM usage for a rack.
 */
export async function updateRackCapacityAndCBM(
  prisma: PrismaClient,
  rackId: string,
  companyId: string
): Promise<{ palletsUsed: number; cbmUsed: number }> {
  const [palletsUsed, cbmUsed] = await Promise.all([
    recomputeRackPalletUsage(prisma, rackId, companyId),
    recomputeRackCBMUsage(prisma, rackId, companyId),
  ]);

  // Update rack with both values using raw SQL (cbmUsed not in Prisma schema)
  // Note: Table name is 'racks' (lowercase with s) in MySQL
  await prisma.$executeRaw`
    UPDATE racks 
    SET capacityUsed = ${palletsUsed}, cbmUsed = ${cbmUsed}
    WHERE id = ${rackId}
  `;

  return { palletsUsed, cbmUsed };
}

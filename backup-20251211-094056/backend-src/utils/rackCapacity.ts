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


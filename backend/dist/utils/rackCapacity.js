"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePalletUsage = calculatePalletUsage;
exports.recomputeRackPalletUsage = recomputeRackPalletUsage;
/**
 * Calculates the number of pallet slots consumed by the provided boxes.
 * Uses shipment.boxesPerPallet to determine pallet grouping; falls back
 * to treating each box as a single pallet slot when metadata is missing.
 */
function calculatePalletUsage(boxes) {
    if (!boxes || boxes.length === 0) {
        return 0;
    }
    const palletKeys = new Set();
    for (const box of boxes) {
        if (!box) {
            continue;
        }
        const shipmentId = box.shipment?.id ?? 'unknown';
        // Prefer explicit palletNumber in pieceQR (JSON) when available
        let explicitPallet = null;
        if (box.pieceQR) {
            try {
                const meta = JSON.parse(box.pieceQR);
                if (typeof meta?.palletNumber === 'number') {
                    explicitPallet = meta.palletNumber;
                }
                if (meta?.isLoose === true) {
                    // Loose boxes do not consume a pallet slot
                    continue;
                }
            }
            catch {
                // fall back to computed method
            }
        }
        if (explicitPallet !== null && explicitPallet > 0) {
            palletKeys.add(`${shipmentId}-${explicitPallet}`);
        }
        else {
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
async function recomputeRackPalletUsage(prisma, rackId, companyId) {
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

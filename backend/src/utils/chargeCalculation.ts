/**
 * Shipment Charge Calculation Utility
 * 
 * Handles storage charge calculations with support for:
 * - Per-shipment custom rates (priority)
 * - Company default billing settings (fallback)
 * - CBM-based or Box-based charging
 * - Grace periods and minimum charges
 * - Custom charge types (handling, release, service fees)
 */

import { PrismaClient } from '@prisma/client';

interface ChargeLineItem {
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    chargeTypeId?: string;
    isTaxable: boolean;
}

interface ChargeCalculationResult {
    totalCharge: number;
    breakdown: {
        baseCharge: number;
        additionalCharges: number;
        taxAmount: number;
        currency: string;
    };
    lineItems: ChargeLineItem[];  // ✅ NEW: Detailed charge breakdown
    rateUsed: {
        type: 'CUSTOM' | 'COMPANY_DEFAULT';
        ratePerCBMPerDay?: number;
        ratePerBoxPerDay?: number;
        source: string;
    };
    daysCharged: number;
    gracePeriodApplied: boolean;
}

/**
 * Calculate storage charges for a shipment
 * Smart rate selection: Custom rate > Company default
 */
export async function calculateShipmentCharges(
    prisma: PrismaClient,
    shipmentId: string,
    companyId: string,
    upToDate?: Date
): Promise<ChargeCalculationResult> {

    // Fetch shipment with all relevant data
    const shipment = await prisma.shipment.findFirst({
        where: { id: shipmentId, companyId },
        include: {
            boxes: {
                where: { status: 'IN_STORAGE' } // Only count boxes currently in storage
            }
        }
    });

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    // Fetch company billing settings (fallback rates)
    const billingSettings = await prisma.billingSettings.findUnique({
        where: { companyId }
    });

    if (!billingSettings) {
        throw new Error('Billing settings not configured for company');
    }

    // Calculate storage duration
    const startDate = new Date(shipment.arrivalDate);
    const endDate = upToDate || new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Apply grace period
    const gracePeriodDays = billingSettings.gracePeriodDays || 0;
    const chargeableDays = Math.max(0, totalDays - gracePeriodDays);
    const gracePeriodApplied = totalDays <= gracePeriodDays;

    // 🎯 SMART RATE SELECTION: Custom > Company Default
    let baseCharge = 0;
    let rateUsed: ChargeCalculationResult['rateUsed'];

    if (shipment.customRateEnabled) {
        // ✅ CUSTOM RATE: Use per-shipment pricing
        console.log(`💰 Using CUSTOM rates for shipment ${shipment.referenceId}`);

        // Priority 1: CBM-based charging (if CBM available and rate set)
        if (shipment.cbm && shipment.cbm > 0 && shipment.customRatePerCBMPerDay) {
            baseCharge = shipment.cbm * shipment.customRatePerCBMPerDay * chargeableDays;
            rateUsed = {
                type: 'CUSTOM',
                ratePerCBMPerDay: shipment.customRatePerCBMPerDay,
                source: `Custom CBM rate: ${shipment.customRatePerCBMPerDay} KWD/m³/day`
            };
        }
        // Priority 2: Box-based charging
        else if (shipment.customRatePerBoxPerDay) {
            const boxCount = shipment.boxes.length;
            baseCharge = boxCount * shipment.customRatePerBoxPerDay * chargeableDays;
            rateUsed = {
                type: 'CUSTOM',
                ratePerBoxPerDay: shipment.customRatePerBoxPerDay,
                source: `Custom Box rate: ${shipment.customRatePerBoxPerDay} KWD/box/day`
            };
        }
        // Fallback: If custom enabled but no rates set, use company default
        else {
            console.warn(`⚠️ Custom rate enabled but no rates set for ${shipment.referenceId}, using company default`);
            const boxCount = shipment.boxes.length;
            baseCharge = boxCount * billingSettings.storageRatePerBox * chargeableDays;
            rateUsed = {
                type: 'COMPANY_DEFAULT',
                ratePerBoxPerDay: billingSettings.storageRatePerBox,
                source: `Company default: ${billingSettings.storageRatePerBox} KWD/box/day (custom rate misconfigured)`
            };
        }
    } else {
        // ✅ COMPANY DEFAULT: Use billing settings rates
        console.log(`💰 Using COMPANY DEFAULT rates for shipment ${shipment.referenceId}`);

        // Use storageRatePerBox from BillingSettings (existing field)
        const boxCount = shipment.boxes.length;
        baseCharge = boxCount * billingSettings.storageRatePerBox * chargeableDays;
        rateUsed = {
            type: 'COMPANY_DEFAULT',
            ratePerBoxPerDay: billingSettings.storageRatePerBox,
            source: `Company default: ${billingSettings.storageRatePerBox} KWD/box/day`
        };
    }

    // Apply minimum charge if configured
    if (billingSettings.minimumCharge && baseCharge < billingSettings.minimumCharge) {
        console.log(`📈 Applying minimum charge: ${billingSettings.minimumCharge} KWD (calculated: ${baseCharge})`);
        baseCharge = billingSettings.minimumCharge;
    }

    // 🎯 BUILD LINE ITEMS for invoice generation
    const lineItems: ChargeLineItem[] = [];

    // Storage charge line item
    let storageDescription = '';
    if (shipment.customRateEnabled && shipment.customRatePerCBMPerDay && shipment.cbm) {
        storageDescription = `Storage charges (${chargeableDays} days × ${shipment.cbm.toFixed(3)} m³ × ${shipment.customRatePerCBMPerDay} KWD/m³/day)`;
    } else if (shipment.customRateEnabled && shipment.customRatePerBoxPerDay) {
        storageDescription = `Storage charges (${chargeableDays} days × ${shipment.boxes.length} boxes × ${shipment.customRatePerBoxPerDay} KWD/box/day)`;
    } else {
        storageDescription = `Storage charges (${chargeableDays} days × ${shipment.boxes.length} boxes × ${billingSettings.storageRatePerBox} KWD/box/day)`;
    }

    lineItems.push({
        description: storageDescription,
        category: 'STORAGE',
        quantity: chargeableDays,
        unitPrice: parseFloat((baseCharge / chargeableDays).toFixed(3)),
        amount: parseFloat(baseCharge.toFixed(3)),
        isTaxable: true
    });

    // 🎯 ADD CUSTOM CHARGE TYPES (handling fees, release fees, etc)
    const chargeTypes = await prisma.chargeType.findMany({
        where: {
            companyId,
            isActive: true,
            applyOnStorage: true // Only storage-related charges for now
        }
    });

    let additionalCharges = 0;
    for (const chargeType of chargeTypes) {
        let chargeAmount = 0;

        // Calculate based on charge type calculation method
        switch (chargeType.calculationType) {
            case 'PER_BOX':
                chargeAmount = shipment.boxes.length * chargeType.rate;
                lineItems.push({
                    description: chargeType.name,
                    category: chargeType.category,
                    quantity: shipment.boxes.length,
                    unitPrice: chargeType.rate,
                    amount: parseFloat(chargeAmount.toFixed(3)),
                    chargeTypeId: chargeType.id,
                    isTaxable: chargeType.isTaxable
                });
                break;

            case 'PER_SHIPMENT':
            case 'FLAT':
                chargeAmount = chargeType.rate;
                lineItems.push({
                    description: chargeType.name,
                    category: chargeType.category,
                    quantity: 1,
                    unitPrice: chargeType.rate,
                    amount: parseFloat(chargeAmount.toFixed(3)),
                    chargeTypeId: chargeType.id,
                    isTaxable: chargeType.isTaxable
                });
                break;

            case 'PER_CUBIC_M':
                if (shipment.cbm && shipment.cbm > 0) {
                    chargeAmount = shipment.cbm * chargeType.rate;
                    lineItems.push({
                        description: `${chargeType.name} (${shipment.cbm.toFixed(3)} m³)`,
                        category: chargeType.category,
                        quantity: parseFloat(shipment.cbm.toFixed(3)),
                        unitPrice: chargeType.rate,
                        amount: parseFloat(chargeAmount.toFixed(3)),
                        chargeTypeId: chargeType.id,
                        isTaxable: chargeType.isTaxable
                    });
                }
                break;

            case 'PER_KG':
                if (shipment.weight && shipment.weight > 0) {
                    chargeAmount = shipment.weight * chargeType.rate;
                    lineItems.push({
                        description: `${chargeType.name} (${shipment.weight} kg)`,
                        category: chargeType.category,
                        quantity: shipment.weight,
                        unitPrice: chargeType.rate,
                        amount: parseFloat(chargeAmount.toFixed(3)),
                        chargeTypeId: chargeType.id,
                        isTaxable: chargeType.isTaxable
                    });
                }
                break;
        }

        // Apply min/max charge limits
        if (chargeAmount > 0) {
            if (chargeType.minCharge && chargeAmount < chargeType.minCharge) {
                chargeAmount = chargeType.minCharge;
            }
            if (chargeType.maxCharge && chargeAmount > chargeType.maxCharge) {
                chargeAmount = chargeType.maxCharge;
            }
            additionalCharges += chargeAmount;
        }
    }

    // Calculate tax on total (base + additional charges)
    const subtotal = baseCharge + additionalCharges;
    let taxAmount = 0;
    if (billingSettings.taxEnabled && billingSettings.taxRate) {
        // Tax only taxable items
        const taxableAmount = lineItems
            .filter(item => item.isTaxable)
            .reduce((sum, item) => sum + item.amount, 0);
        taxAmount = (taxableAmount * billingSettings.taxRate) / 100;
    }

    const totalCharge = subtotal + taxAmount;

    return {
        totalCharge: parseFloat(totalCharge.toFixed(3)),
        breakdown: {
            baseCharge: parseFloat(baseCharge.toFixed(3)),
            additionalCharges: parseFloat(additionalCharges.toFixed(3)),
            taxAmount: parseFloat(taxAmount.toFixed(3)),
            currency: billingSettings.currency || 'KWD'
        },
        lineItems, // ✅ Detailed breakdown for invoice
        rateUsed,
        daysCharged: chargeableDays,
        gracePeriodApplied
    };
}

/**
 * Update ShipmentCharges table with latest calculation
 * Called automatically during release or on-demand
 */
export async function updateShipmentCharges(
    prisma: PrismaClient,
    shipmentId: string,
    companyId: string
): Promise<void> {
    const calculation = await calculateShipmentCharges(prisma, shipmentId, companyId);

    // Upsert ShipmentCharges record
    await prisma.shipmentCharges.upsert({
        where: { shipmentId },
        create: {
            shipmentId,
            companyId,
            currentStorageCharge: calculation.totalCharge,
            daysStored: calculation.daysCharged,
            lastCalculatedDate: new Date()
        },
        update: {
            currentStorageCharge: calculation.totalCharge,
            daysStored: calculation.daysCharged,
            lastCalculatedDate: new Date()
        }
    });

    console.log(`✅ Updated charges for shipment ${shipmentId}: ${calculation.totalCharge} KWD`);
}

/**
 * Preview charges without saving (for UI display)
 */
export async function previewShipmentCharges(
    prisma: PrismaClient,
    shipmentId: string,
    companyId: string,
    customRates?: {
        enabled: boolean;
        ratePerCBMPerDay?: number;
        ratePerBoxPerDay?: number;
    }
): Promise<ChargeCalculationResult> {

    // If custom rates provided for preview, temporarily apply them
    if (customRates) {
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
            include: { boxes: { where: { status: 'IN_STORAGE' } } }
        });

        if (!shipment) throw new Error('Shipment not found');

        // Create temporary shipment object with preview rates
        const previewShipment = {
            ...shipment,
            customRateEnabled: customRates.enabled,
            customRatePerCBMPerDay: customRates.ratePerCBMPerDay || null,
            customRatePerBoxPerDay: customRates.ratePerBoxPerDay || null
        };

        // Temporarily update for calculation (won't persist)
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                customRateEnabled: previewShipment.customRateEnabled,
                customRatePerCBMPerDay: previewShipment.customRatePerCBMPerDay,
                customRatePerBoxPerDay: previewShipment.customRatePerBoxPerDay
            }
        });

        const result = await calculateShipmentCharges(prisma, shipmentId, companyId);

        // Restore original values
        await prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                customRateEnabled: shipment.customRateEnabled,
                customRatePerCBMPerDay: shipment.customRatePerCBMPerDay,
                customRatePerBoxPerDay: shipment.customRatePerBoxPerDay
            }
        });

        return result;
    }

    // Normal preview with current rates
    return calculateShipmentCharges(prisma, shipmentId, companyId);
}

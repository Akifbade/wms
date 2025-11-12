"use strict";
/**
 * Shipment Charge Calculation Utility
 *
 * Handles storage charge calculations with support for:
 * - Per-shipment custom rates (priority)
 * - Company default billing settings (fallback)
 * - CBM-based or Box-based charging
 * - Grace periods and minimum charges
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateShipmentCharges = calculateShipmentCharges;
exports.updateShipmentCharges = updateShipmentCharges;
exports.previewShipmentCharges = previewShipmentCharges;
/**
 * Calculate storage charges for a shipment
 * Smart rate selection: Custom rate > Company default
 */
async function calculateShipmentCharges(prisma, shipmentId, companyId, upToDate) {
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
    let rateUsed;
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
    }
    else {
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
    // Calculate tax
    let taxAmount = 0;
    if (billingSettings.taxEnabled && billingSettings.taxRate) {
        taxAmount = (baseCharge * billingSettings.taxRate) / 100;
    }
    const totalCharge = baseCharge + taxAmount;
    return {
        totalCharge: parseFloat(totalCharge.toFixed(3)),
        breakdown: {
            baseCharge: parseFloat(baseCharge.toFixed(3)),
            additionalCharges: 0, // Can extend for handling fees, etc.
            taxAmount: parseFloat(taxAmount.toFixed(3)),
            currency: billingSettings.currency || 'KWD'
        },
        rateUsed,
        daysCharged: chargeableDays,
        gracePeriodApplied
    };
}
/**
 * Update ShipmentCharges table with latest calculation
 * Called automatically during release or on-demand
 */
async function updateShipmentCharges(prisma, shipmentId, companyId) {
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
async function previewShipmentCharges(prisma, shipmentId, companyId, customRates) {
    // If custom rates provided for preview, temporarily apply them
    if (customRates) {
        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, companyId },
            include: { boxes: { where: { status: 'IN_STORAGE' } } }
        });
        if (!shipment)
            throw new Error('Shipment not found');
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

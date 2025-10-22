"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWarehouseData = exports.createWarehouseData = exports.calculateWarehouseCharges = exports.parseRackQR = exports.generateRackQR = exports.parsePieceQR = exports.generatePieceQR = exports.generateWarehouseBarcode = void 0;
// Warehouse utility functions for barcode and QR generation
const crypto_1 = require("crypto");
/**
 * Generate warehouse barcode in format: WH + YYMMDD + NNNN
 * Example: WH24101312345
 */
const generateWarehouseBarcode = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = (0, crypto_1.randomInt)(1000, 9999); // 4-digit random number
    return `WH${year}${month}${day}${random}`;
};
exports.generateWarehouseBarcode = generateWarehouseBarcode;
/**
 * Generate individual piece QR code
 * Format: PIECE_[barcode]_[pieceNumber]
 * Example: PIECE_WH24101312345_001
 */
const generatePieceQR = (barcode, pieceNumber) => {
    return `PIECE_${barcode}_${String(pieceNumber).padStart(3, '0')}`;
};
exports.generatePieceQR = generatePieceQR;
/**
 * Parse piece QR code to extract barcode and piece number
 * Input: PIECE_WH24101312345_001
 * Output: { barcode: 'WH24101312345', pieceNumber: 1 }
 */
const parsePieceQR = (qrCode) => {
    const match = qrCode.match(/^PIECE_([A-Z0-9]+)_(\d{3})$/);
    if (!match)
        return null;
    return {
        barcode: match[1],
        pieceNumber: parseInt(match[2], 10)
    };
};
exports.parsePieceQR = parsePieceQR;
/**
 * Generate rack QR code
 * Format: RACK_[rackCode]
 * Example: RACK_A_01_01
 */
const generateRackQR = (rackCode) => {
    return `RACK_${rackCode.replace(/-/g, '_')}`;
};
exports.generateRackQR = generateRackQR;
/**
 * Parse rack QR code to extract rack code
 * Input: RACK_A_01_01
 * Output: A-01-01
 */
const parseRackQR = (qrCode) => {
    if (!qrCode.startsWith('RACK_'))
        return null;
    return qrCode.replace('RACK_', '').replace(/_/g, '-');
};
exports.parseRackQR = parseRackQR;
const calculateWarehouseCharges = (inDate, outDate = new Date(), weight, settings = {}) => {
    const { storageRatePerBox = 0.5, // Default 0.5 KWD per box per day
    handlingFee = 10.0, // Default 10 KWD handling fee
    gracePeriodDays = 3 // Default 3 free days
     } = settings;
    // Calculate total storage days
    const storageDays = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    // Calculate chargeable days (after grace period)
    const chargeableDays = Math.max(0, storageDays - gracePeriodDays);
    // Calculate storage charges (per box, not per KG for simplicity)
    const storageCharges = chargeableDays * storageRatePerBox;
    // Total charges
    const totalCharges = storageCharges + handlingFee;
    return {
        storageDays,
        chargeableDays,
        storageCharges,
        handlingCharges: handlingFee,
        totalCharges
    };
};
exports.calculateWarehouseCharges = calculateWarehouseCharges;
/**
 * Create warehouse data object for storage in database
 */
const createWarehouseData = (data) => {
    return JSON.stringify({
        ...data,
        createdAt: new Date().toISOString(),
        type: 'WAREHOUSE_STORAGE'
    });
};
exports.createWarehouseData = createWarehouseData;
/**
 * Parse warehouse data from database string
 */
const parseWarehouseData = (dataString) => {
    if (!dataString)
        return null;
    try {
        return JSON.parse(dataString);
    }
    catch (error) {
        console.error('Error parsing warehouse data:', error);
        return null;
    }
};
exports.parseWarehouseData = parseWarehouseData;

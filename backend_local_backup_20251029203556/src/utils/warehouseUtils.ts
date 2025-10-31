// Warehouse utility functions for barcode and QR generation
import { randomInt } from 'crypto';

/**
 * Generate warehouse barcode in format: WH + YYMMDD + NNNN
 * Example: WH24101312345
 */
export const generateWarehouseBarcode = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = randomInt(1000, 9999); // 4-digit random number
  
  return `WH${year}${month}${day}${random}`;
};

/**
 * Generate individual piece QR code
 * Format: PIECE_[barcode]_[pieceNumber]
 * Example: PIECE_WH24101312345_001
 */
export const generatePieceQR = (barcode: string, pieceNumber: number): string => {
  return `PIECE_${barcode}_${String(pieceNumber).padStart(3, '0')}`;
};

/**
 * Parse piece QR code to extract barcode and piece number
 * Input: PIECE_WH24101312345_001
 * Output: { barcode: 'WH24101312345', pieceNumber: 1 }
 */
export const parsePieceQR = (qrCode: string): { barcode: string; pieceNumber: number } | null => {
  const match = qrCode.match(/^PIECE_([A-Z0-9]+)_(\d{3})$/);
  if (!match) return null;
  
  return {
    barcode: match[1],
    pieceNumber: parseInt(match[2], 10)
  };
};

/**
 * Generate rack QR code 
 * Format: RACK_[rackCode]
 * Example: RACK_A_01_01
 */
export const generateRackQR = (rackCode: string): string => {
  return `RACK_${rackCode.replace(/-/g, '_')}`;
};

/**
 * Parse rack QR code to extract rack code
 * Input: RACK_A_01_01
 * Output: A-01-01
 */
export const parseRackQR = (qrCode: string): string | null => {
  if (!qrCode.startsWith('RACK_')) return null;
  return qrCode.replace('RACK_', '').replace(/_/g, '-');
};

/**
 * Calculate storage charges based on days and settings
 */
export interface StorageCharges {
  storageDays: number;
  chargeableDays: number;
  storageCharges: number;
  handlingCharges: number;
  totalCharges: number;
}

export const calculateWarehouseCharges = (
  inDate: Date,
  outDate: Date = new Date(),
  weight: number,
  settings: {
    storageRatePerBox?: number;
    handlingFee?: number;
    gracePeriodDays?: number;
  } = {}
): StorageCharges => {
  const {
    storageRatePerBox = 0.5, // Default 0.5 KWD per box per day
    handlingFee = 10.0,      // Default 10 KWD handling fee
    gracePeriodDays = 3      // Default 3 free days
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

/**
 * Create warehouse data object for storage in database
 */
export const createWarehouseData = (data: {
  shipper: string;
  consignee: string;
  weight: number;
  pieces: number;
  notes?: string;
}): string => {
  return JSON.stringify({
    ...data,
    createdAt: new Date().toISOString(),
    type: 'WAREHOUSE_STORAGE'
  });
};

/**
 * Parse warehouse data from database string
 */
export const parseWarehouseData = (dataString: string | null): any => {
  if (!dataString) return null;
  try {
    return JSON.parse(dataString);
  } catch (error) {
    console.error('Error parsing warehouse data:', error);
    return null;
  }
};
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const QR_DIR = path.join(process.cwd(), 'uploads', 'qr-codes');

// Ensure QR directory exists
if (!fs.existsSync(QR_DIR)) {
  fs.mkdirSync(QR_DIR, { recursive: true });
}

// ─── Generate & Save QR for a Shipment ─────────────────────
router.post('/shipment/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const qrText = shipment.qrCode || `SHIPMENT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const filename = `shipment_${id}.png`;
    const filepath = path.join(QR_DIR, filename);

    // Generate QR PNG
    await QRCode.toFile(filepath, qrText, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    // If qrCode not set, save it
    if (!shipment.qrCode) {
      await prisma.shipment.update({
        where: { id },
        data: { qrCode: qrText },
      });
    }

    const url = `/uploads/qr-codes/${filename}`;
    res.json({ success: true, url, qrCode: qrText });
  } catch (err: any) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// ─── Generate QR for all shipments (batch) ─────────────────
router.post('/shipments/batch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const shipments = await prisma.shipment.findMany({
      where: { companyId },
      select: { id: true, qrCode: true, name: true },
    });

    const results: { id: string; url: string; success: boolean }[] = [];

    for (const shipment of shipments) {
      try {
        const qrText = shipment.qrCode || `SHIPMENT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const filename = `shipment_${shipment.id}.png`;
        const filepath = path.join(QR_DIR, filename);

        await QRCode.toFile(filepath, qrText, {
          type: 'png',
          width: 400,
          margin: 2,
          color: { dark: '#000', light: '#fff' },
        });

        // Update qrCode if not set
        if (!shipment.qrCode) {
          await prisma.shipment.update({
            where: { id: shipment.id },
            data: { qrCode: qrText },
          });
        }

        results.push({ id: shipment.id, url: `/uploads/qr-codes/${filename}`, success: true });
      } catch (err) {
        results.push({ id: shipment.id, url: '', success: false });
      }
    }

    res.json({ success: true, total: shipments.length, generated: results.filter(r => r.success).length, results });
  } catch (err: any) {
    console.error('Batch QR error:', err);
    res.status(500).json({ error: 'Failed to generate QR codes' });
  }
});

// ─── Generate QR for a Rack ────────────────────────────────
router.post('/rack/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const rack = await prisma.rack.findFirst({
      where: { id, companyId },
    });

    if (!rack) {
      return res.status(404).json({ error: 'Rack not found' });
    }

    const qrText = `RACK_${rack.code}`;
    const filename = `rack_${id}.png`;
    const filepath = path.join(QR_DIR, filename);

    await QRCode.toFile(filepath, qrText, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#000', light: '#fff' },
    });

    const url = `/uploads/qr-codes/${filename}`;
    res.json({ success: true, url, qrCode: qrText });
  } catch (err: any) {
    console.error('Rack QR error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// ─── Get QR image URL for a shipment ───────────────────────
router.get('/shipment/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const filename = `shipment_${id}.png`;
    const filepath = path.join(QR_DIR, filename);

    if (fs.existsSync(filepath)) {
      res.json({ url: `/uploads/qr-codes/${filename}`, exists: true });
    } else {
      res.json({ url: null, exists: false, message: 'QR not generated yet' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check QR' });
  }
});

export default router;

# 📋 PROFESSIONAL RELEASE NOTES SYSTEM

## 🎯 REQUIREMENT
Release ke baad ek **professional release note** generate hona chahiye jo:
- Print kar sakte hain
- Client ko de sakte hain
- Record ke liye rakha ja sake
- Professional format me ho

---

## 📄 RELEASE NOTE FORMAT

### Document Structure:
```
┌─────────────────────────────────────────────┐
│           COMPANY LOGO / HEADER             │
│                                             │
│         SHIPMENT RELEASE NOTE               │
│                                             │
├─────────────────────────────────────────────┤
│ Release Note #: RN-00001                    │
│ Date & Time: Oct 13, 2025 - 03:30 PM      │
│ Released By: Admin User                     │
├─────────────────────────────────────────────┤
│                                             │
│ SHIPMENT DETAILS                            │
│ ─────────────────                           │
│ Shipment ID: QGO-1234567890                │
│ Reference: SH-2024-1003                    │
│ Client Name: Abdullah Khan                  │
│ Client Phone: +965 6666 3333               │
│ Client Email: abdullah@example.com          │
│                                             │
│ STORAGE INFORMATION                         │
│ ─────────────────────                       │
│ Arrival Date: Oct 5, 2025                  │
│ Release Date: Oct 13, 2025                 │
│ Storage Duration: 8 days                    │
│ Rack Location: B1-1                        │
│                                             │
│ ITEMS RELEASED                              │
│ ───────────────                             │
│ Total Boxes: 25 boxes                      │
│ Release Type: FULL RELEASE                 │
│ Boxes Released: All 25 boxes              │
│ Box Numbers: 1-25                          │
│                                             │
│ COLLECTOR INFORMATION                       │
│ ───────────────────────                     │
│ Collector Name: [Signature Line]           │
│ ID Number: TEST12345                       │
│ Signature: _____________________           │
│ Date: Oct 13, 2025                         │
│                                             │
│ CHARGES & PAYMENT                           │
│ ────────────────────                        │
│ Storage Charges: 200.00 KD                 │
│ Release Fee: 50.00 KD                      │
│ Additional Charges: 25.00 KD               │
│ ─────────────────────────────              │
│ Subtotal: 275.00 KD                        │
│ Tax (5%): 13.75 KD                         │
│ ═════════════════════════════              │
│ TOTAL: 288.75 KD                           │
│                                             │
│ Invoice Number: INV-00001                  │
│ Payment Status: PENDING                    │
│                                             │
│ RELEASE PHOTOS                              │
│ ──────────────                              │
│ [Photo 1] [Photo 2] [Photo 3]             │
│                                             │
│ TERMS & CONDITIONS                          │
│ ────────────────────                        │
│ • All items released in good condition     │
│ • Company not liable after release         │
│ • Payment due within 7 days                │
│                                             │
│ SIGNATURES                                  │
│ ────────────                                │
│ Released By:          Collected By:        │
│ _______________      _______________       │
│ [Staff Name]         [Collector Name]      │
│ Date: __________     Date: __________      │
│                                             │
│ NOTES                                       │
│ ─────                                       │
│ [Any additional notes or remarks]          │
│                                             │
├─────────────────────────────────────────────┤
│         Thank you for your business!        │
│                                             │
│      Company Address | Phone | Email       │
│           Website | License No.            │
└─────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA

### New Table: ReleaseNote
```prisma
model ReleaseNote {
  id                    String   @id @default(cuid())
  noteNumber            String   @unique
  companyId             String
  shipmentId            String
  invoiceId             String?
  
  // Release Info
  releaseDate           DateTime @default(now())
  releaseType           String   // FULL, PARTIAL
  releasedBy            String   // User ID
  releasedByName        String   // User name at time of release
  
  // Collector Info
  collectorName         String?
  collectorID           String
  collectorPhone        String?
  collectorSignature    String?  // Base64 or URL
  
  // Shipment Summary
  clientName            String
  clientPhone           String
  clientEmail           String?
  shipmentQR            String
  referenceId           String?
  
  // Storage Details
  arrivalDate           DateTime
  storageDuration       Int      // Days
  rackLocation          String?
  
  // Items Released
  totalBoxes            Int
  releasedBoxes         Int
  boxNumbers            String   // JSON array or comma-separated
  
  // Financial
  storageCharges        Float
  releaseCharges        Float
  additionalCharges     Float
  subtotal              Float
  taxAmount             Float
  totalAmount           Float
  invoiceNumber         String?
  paymentStatus         String
  
  // Media
  releasePhotos         String?  // JSON array of URLs
  
  // Additional Info
  notes                 String?
  terms                 String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  company               Company   @relation(fields: [companyId], references: [id])
  shipment              Shipment  @relation(fields: [shipmentId], references: [id])
  invoice               Invoice?  @relation(fields: [invoiceId], references: [id])
  user                  User      @relation(fields: [releasedBy], references: [id])
  
  @@map("release_notes")
}
```

---

## 🎨 FRONTEND COMPONENT

### ReleaseNoteView.tsx
```tsx
import React from 'react';
import { format } from 'date-fns';

interface ReleaseNoteProps {
  releaseNote: any;
  companyInfo: any;
}

export const ReleaseNoteView: React.FC<ReleaseNoteProps> = ({
  releaseNote,
  companyInfo
}) => {
  return (
    <div className="release-note-container bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="header text-center mb-8 border-b-2 border-gray-300 pb-4">
        {companyInfo.logo && (
          <img src={companyInfo.logo} alt="Company Logo" className="h-16 mx-auto mb-2" />
        )}
        <h1 className="text-3xl font-bold text-gray-800">{companyInfo.name}</h1>
        <h2 className="text-xl text-gray-600 mt-2">SHIPMENT RELEASE NOTE</h2>
      </div>

      {/* Document Info */}
      <div className="doc-info mb-6 bg-gray-50 p-4 rounded">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Release Note #:</span>
            <span className="ml-2">{releaseNote.noteNumber}</span>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <span className="ml-2">
              {format(new Date(releaseNote.releaseDate), 'MMM dd, yyyy - hh:mm a')}
            </span>
          </div>
          <div>
            <span className="font-semibold">Released By:</span>
            <span className="ml-2">{releaseNote.releasedByName}</span>
          </div>
        </div>
      </div>

      {/* Shipment Details */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">SHIPMENT DETAILS</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Shipment ID:</span> {releaseNote.shipmentQR}</p>
            <p><span className="font-semibold">Reference:</span> {releaseNote.referenceId}</p>
            <p><span className="font-semibold">Client Name:</span> {releaseNote.clientName}</p>
          </div>
          <div>
            <p><span className="font-semibold">Phone:</span> {releaseNote.clientPhone}</p>
            <p><span className="font-semibold">Email:</span> {releaseNote.clientEmail}</p>
            <p><span className="font-semibold">Rack:</span> {releaseNote.rackLocation}</p>
          </div>
        </div>
      </div>

      {/* Storage Information */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">STORAGE INFORMATION</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold">Arrival Date</p>
            <p>{format(new Date(releaseNote.arrivalDate), 'MMM dd, yyyy')}</p>
          </div>
          <div>
            <p className="font-semibold">Release Date</p>
            <p>{format(new Date(releaseNote.releaseDate), 'MMM dd, yyyy')}</p>
          </div>
          <div>
            <p className="font-semibold">Duration</p>
            <p>{releaseNote.storageDuration} days</p>
          </div>
        </div>
      </div>

      {/* Items Released */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">ITEMS RELEASED</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold">Total Boxes</p>
            <p>{releaseNote.totalBoxes} boxes</p>
          </div>
          <div>
            <p className="font-semibold">Release Type</p>
            <p className="uppercase">{releaseNote.releaseType}</p>
          </div>
          <div>
            <p className="font-semibold">Boxes Released</p>
            <p>{releaseNote.releasedBoxes} boxes</p>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <p className="font-semibold">Box Numbers:</p>
          <p className="text-gray-700">{releaseNote.boxNumbers}</p>
        </div>
      </div>

      {/* Collector Information */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">COLLECTOR INFORMATION</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Collector Name:</span></p>
            <p className="border-b border-gray-400 pb-1">{releaseNote.collectorName || '___________________'}</p>
          </div>
          <div>
            <p><span className="font-semibold">ID Number:</span> {releaseNote.collectorID}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-8">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">Signature:</p>
            {releaseNote.collectorSignature ? (
              <img src={releaseNote.collectorSignature} alt="Signature" className="h-16" />
            ) : (
              <div className="border-b-2 border-gray-400 h-16"></div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">Date:</p>
            <p className="border-b border-gray-400 pb-1">{format(new Date(releaseNote.releaseDate), 'MMM dd, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Charges & Payment */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">CHARGES & PAYMENT</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1">Storage Charges</td>
              <td className="text-right">{releaseNote.storageCharges.toFixed(3)} {companyInfo.currency}</td>
            </tr>
            <tr>
              <td className="py-1">Release Fee</td>
              <td className="text-right">{releaseNote.releaseCharges.toFixed(3)} {companyInfo.currency}</td>
            </tr>
            <tr>
              <td className="py-1">Additional Charges</td>
              <td className="text-right">{releaseNote.additionalCharges.toFixed(3)} {companyInfo.currency}</td>
            </tr>
            <tr className="border-t">
              <td className="py-1 font-semibold">Subtotal</td>
              <td className="text-right font-semibold">{releaseNote.subtotal.toFixed(3)} {companyInfo.currency}</td>
            </tr>
            <tr>
              <td className="py-1">Tax</td>
              <td className="text-right">{releaseNote.taxAmount.toFixed(3)} {companyInfo.currency}</td>
            </tr>
            <tr className="border-t-2 border-gray-800">
              <td className="py-2 text-lg font-bold">TOTAL</td>
              <td className="text-right text-lg font-bold">{releaseNote.totalAmount.toFixed(3)} {companyInfo.currency}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 text-sm">
          <p><span className="font-semibold">Invoice Number:</span> {releaseNote.invoiceNumber}</p>
          <p>
            <span className="font-semibold">Payment Status:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              releaseNote.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {releaseNote.paymentStatus}
            </span>
          </p>
        </div>
      </div>

      {/* Release Photos */}
      {releaseNote.releasePhotos && releaseNote.releasePhotos.length > 0 && (
        <div className="section mb-6">
          <h3 className="text-lg font-bold mb-3 border-b pb-2">RELEASE PHOTOS</h3>
          <div className="grid grid-cols-3 gap-4">
            {JSON.parse(releaseNote.releasePhotos).map((photo: string, idx: number) => (
              <img key={idx} src={photo} alt={`Release ${idx + 1}`} className="w-full h-32 object-cover rounded" />
            ))}
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">TERMS & CONDITIONS</h3>
        <ul className="text-xs space-y-1 text-gray-700">
          <li>• All items have been released in good condition</li>
          <li>• Company is not liable for items after release</li>
          <li>• Payment must be made within {companyInfo.paymentTerms || 7} days</li>
          <li>• This document serves as proof of release</li>
        </ul>
      </div>

      {/* Signatures */}
      <div className="section mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">AUTHORIZATION SIGNATURES</h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-sm font-semibold mb-8">Released By (Staff)</p>
            <div className="border-b-2 border-gray-800 mb-2 h-16"></div>
            <p className="text-xs">{releaseNote.releasedByName}</p>
            <p className="text-xs text-gray-600">Date: {format(new Date(releaseNote.releaseDate), 'MMM dd, yyyy')}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-8">Collected By (Client)</p>
            <div className="border-b-2 border-gray-800 mb-2 h-16"></div>
            <p className="text-xs">{releaseNote.collectorName || '___________________'}</p>
            <p className="text-xs text-gray-600">Date: ___________________</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {releaseNote.notes && (
        <div className="section mb-6">
          <h3 className="text-lg font-bold mb-3 border-b pb-2">NOTES</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{releaseNote.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="footer text-center mt-8 pt-6 border-t-2 border-gray-300">
        <p className="text-lg font-semibold text-gray-800 mb-2">Thank you for your business!</p>
        <div className="text-xs text-gray-600 space-y-1">
          <p>{companyInfo.address}</p>
          <p>Phone: {companyInfo.phone} | Email: {companyInfo.email}</p>
          <p>Website: {companyInfo.website} | License: {companyInfo.licenseNo}</p>
        </div>
      </div>

      {/* Print Buttons */}
      <div className="print-actions mt-8 flex gap-4 justify-center no-print">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          🖨️ Print Release Note
        </button>
        <button
          onClick={() => {/* Download PDF logic */}}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          📄 Download PDF
        </button>
        <button
          onClick={() => {/* Email logic */}}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          📧 Email to Client
        </button>
      </div>
    </div>
  );
};
```

---

## 🔧 BACKEND API

### New Route: `/api/release-notes`

```typescript
// backend/src/routes/releaseNotes.ts

import { Router } from 'express';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// Create Release Note
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.id;
    const {
      shipmentId,
      invoiceId,
      releaseType,
      collectorName,
      collectorID,
      collectorPhone,
      boxNumbers,
      notes
    } = req.body;

    // Get shipment details
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
      include: {
        rack: true,
        boxes: true
      }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Get invoice details if exists
    let invoice = null;
    if (invoiceId) {
      invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, companyId }
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Generate note number
    const lastNote = await prisma.releaseNote.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    let nextNumber = 1;
    if (lastNote?.noteNumber) {
      const match = lastNote.noteNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const noteNumber = `RN-${String(nextNumber).padStart(5, '0')}`;

    // Calculate storage duration
    const arrivalDate = new Date(shipment.arrivalDate);
    const releaseDate = new Date();
    const storageDuration = Math.ceil((releaseDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

    // Create release note
    const releaseNote = await prisma.releaseNote.create({
      data: {
        noteNumber,
        companyId,
        shipmentId,
        invoiceId: invoiceId || null,
        releaseDate,
        releaseType,
        releasedBy: userId,
        releasedByName: user?.name || 'Unknown',
        collectorName,
        collectorID,
        collectorPhone,
        clientName: shipment.clientName,
        clientPhone: shipment.clientPhone,
        clientEmail: shipment.clientEmail,
        shipmentQR: shipment.qrCode,
        referenceId: shipment.referenceId,
        arrivalDate: shipment.arrivalDate,
        storageDuration,
        rackLocation: shipment.rack?.code || null,
        totalBoxes: shipment.originalBoxCount,
        releasedBoxes: releaseType === 'FULL' ? shipment.currentBoxCount : boxNumbers.length,
        boxNumbers: JSON.stringify(boxNumbers),
        storageCharges: invoice?.subtotal || 0,
        releaseCharges: 0,
        additionalCharges: 0,
        subtotal: invoice?.subtotal || 0,
        taxAmount: invoice?.taxAmount || 0,
        totalAmount: invoice?.totalAmount || 0,
        invoiceNumber: invoice?.invoiceNumber || null,
        paymentStatus: invoice?.paymentStatus || 'PENDING',
        notes
      }
    });

    res.json({ releaseNote });
  } catch (error) {
    console.error('Create release note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Release Note by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const releaseNote = await prisma.releaseNote.findFirst({
      where: { id, companyId },
      include: {
        shipment: true,
        invoice: true,
        user: true
      }
    });

    if (!releaseNote) {
      return res.status(404).json({ error: 'Release note not found' });
    }

    res.json({ releaseNote });
  } catch (error) {
    console.error('Get release note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all Release Notes
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const companyId = req.user!.companyId;

    const releaseNotes = await prisma.releaseNote.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        shipment: true,
        invoice: true
      }
    });

    res.json({ releaseNotes });
  } catch (error) {
    console.error('List release notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

## 🔄 INTEGRATION WITH RELEASE FLOW

### Update ReleaseShipmentModal.tsx

```typescript
// After successful release, create release note
const createReleaseNote = async () => {
  const releaseNoteData = {
    shipmentId: shipment.id,
    invoiceId: invoiceResult.invoice.id,
    releaseType: releaseType,
    collectorName: collectorName,
    collectorID: collectorID,
    collectorPhone: collectorPhone,
    boxNumbers: releaseType === 'FULL' 
      ? Array.from({length: shipment.currentBoxCount}, (_, i) => i + 1)
      : boxNumbers,
    notes: additionalNotes
  };

  const noteResult = await fetch('/api/release-notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify(releaseNoteData)
  });

  const { releaseNote } = await noteResult.json();
  
  // Open release note in new window
  window.open(`/release-note/${releaseNote.id}`, '_blank');
};
```

---

## 🎯 IMPLEMENTATION STEPS

### Phase 1: Database (30 min)
1. Create migration for ReleaseNote model
2. Run migration
3. Test database structure

### Phase 2: Backend API (1 hour)
1. Create releaseNotes.ts route file
2. Implement POST /release-notes
3. Implement GET /release-notes/:id
4. Implement GET /release-notes
5. Test all endpoints

### Phase 3: Frontend Component (2 hours)
1. Create ReleaseNoteView.tsx
2. Style for print (CSS @media print)
3. Add PDF generation (html2pdf or jsPDF)
4. Test printing

### Phase 4: Integration (1 hour)
1. Update ReleaseShipmentModal
2. Call create release note API after release
3. Show/open release note automatically
4. Add "View Release Note" button in shipments list

### Phase 5: Testing (30 min)
1. Test complete flow
2. Test printing
3. Test PDF download
4. Test email sending

---

## 📱 FEATURES TO ADD

### Must Have:
- ✅ Professional format
- ✅ Print functionality
- ✅ All shipment details
- ✅ Charges breakdown
- ✅ Collector information
- ✅ Signatures section

### Nice to Have:
- PDF download
- Email to client
- QR code on document
- Company logo
- Custom templates
- Multiple languages
- Digital signature capture
- Photo attachments

---

**Ye complete plan hai! Implement karna hai? 🚀**

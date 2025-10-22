# Quick Implementation Guide - Template Settings Backend

## Step 1: Integrate Schema (5 minutes)

### Add to `backend/prisma/schema.prisma`

Open `backend/prisma/schema.prisma` and add:

```prisma
model TemplateSettings {
  id                    String   @id @default(cuid())
  companyId             String   @unique
  company               Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // Company Branding
  companyName           String?
  companyLogo           String?
  companyAddress        String?
  companyPhone          String?
  companyEmail          String?
  companyWebsite        String?
  companyLicense        String?
  
  // Invoice Template
  invoiceTemplateType   String?
  invoiceTitle          String?
  invoiceShowLogo       Boolean?
  invoiceShowAddress    Boolean?
  invoiceShowPhone      Boolean?
  invoiceShowEmail      Boolean?
  invoiceShowWebsite    Boolean?
  invoiceShowLicense    Boolean?
  invoiceShowFooter     Boolean?
  invoiceHeaderBg       String?
  invoiceHeaderText     String?
  invoiceFooterText     String?
  invoiceTerms          String?  @db.Text
  invoiceShowBorders    Boolean?
  invoiceShowGrid       Boolean?
  invoiceTableStyle     String?
  invoiceFontSize       String?
  invoicePaperSize      String?
  invoicePrimaryColor   String?
  invoiceSecondaryColor String?
  invoiceAccentColor    String?
  invoiceDangerColor    String?
  
  // Release Note Template
  releaseNoteTemplate   String?
  releaseNoteTitle      String?
  releaseNoteHeaderBg   String?
  releaseNoteShowLogo   Boolean?
  releaseShowShipment   Boolean?
  releaseShowStorage    Boolean?
  releaseShowItems      Boolean?
  releaseShowCollector  Boolean?
  releaseShowCharges    Boolean?
  releaseShowPhotos     Boolean?
  releaseShowTerms      Boolean?
  releaseShowSignatures Boolean?
  releaseTerms          String?  @db.Text
  releaseFooterText     String?
  releasePrimaryColor   String?
  
  // Print Settings
  printMarginTop        Int?
  printMarginBottom     Int?
  printMarginLeft       Int?
  printMarginRight      Int?
  
  // Localization
  language              String?
  dateFormat            String?
  timeFormat            String?
  currencySymbol        String?
  currencyPosition      String?
  
  // Custom Fields
  customField1Label     String?
  customField1Value     String?
  customField2Label     String?
  customField2Value     String?
  customField3Label     String?
  customField3Value     String?
  
  // Signature Settings
  requireStaffSignature Boolean?
  requireClientSignature Boolean?
  signatureHeight       Int?
  
  // QR Code Settings
  showQRCode            Boolean?
  qrCodePosition        String?
  qrCodeSize            Int?
  
  // Watermark Settings
  showWatermark         Boolean?
  watermarkText         String?
  watermarkOpacity      Float?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("template_settings")
}
```

Also add relation to Company model:
```prisma
model Company {
  // ... existing fields
  templates             TemplateSettings?
  // ... rest of fields
}
```

---

## Step 2: Run Migration (2 minutes)

```powershell
cd backend
npx prisma migrate dev --name add_template_settings
npx prisma generate
```

---

## Step 3: Create Backend API (30 minutes)

### Create `backend/src/routes/templates.ts`

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/template-settings - Get current settings
router.get('/', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - companyId comes from auth middleware
    const companyId = req.user.companyId;

    let settings = await prisma.templateSettings.findUnique({
      where: { companyId }
    });

    // If no settings exist, return defaults
    if (!settings) {
      settings = {
        id: '',
        companyId,
        companyName: 'QGO Cargo',
        companyAddress: 'Kuwait',
        companyPhone: '+965 XXXX XXXX',
        companyEmail: 'info@qgocargo.com',
        companyWebsite: 'www.qgocargo.com',
        invoiceTitle: 'TAX INVOICE',
        releaseNoteTitle: 'SHIPMENT RELEASE NOTE',
        invoicePrimaryColor: '#2563eb',
        releasePrimaryColor: '#1e40af',
        currencySymbol: 'KD',
        createdAt: new Date(),
        updatedAt: new Date(),
        // ... other default values
      } as any;
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to fetch template settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT /api/template-settings - Update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const companyId = req.user.companyId;
    const settingsData = req.body;

    // Remove fields that shouldn't be updated
    delete settingsData.id;
    delete settingsData.companyId;
    delete settingsData.createdAt;
    delete settingsData.updatedAt;

    const settings = await prisma.templateSettings.upsert({
      where: { companyId },
      update: settingsData,
      create: {
        companyId,
        ...settingsData
      }
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to update template settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// POST /api/template-settings/reset - Reset to defaults
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const companyId = req.user.companyId;

    await prisma.templateSettings.delete({
      where: { companyId }
    });

    res.json({ success: true, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('Failed to reset template settings:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
});

export default router;
```

---

## Step 4: Register Route (2 minutes)

### Update `backend/src/index.ts` (or main server file)

Find where routes are registered and add:

```typescript
import templateRoutes from './routes/templates';

// ... other imports and setup

// Register template settings routes
app.use('/api/template-settings', authenticateToken, templateRoutes);
```

Make sure `authenticateToken` middleware is imported and used.

---

## Step 5: Test Backend (5 minutes)

```powershell
# Start backend
cd backend
npm run dev

# Test GET (in another terminal or Postman)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/template-settings

# Test PUT
curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" -d "{\"companyName\":\"Test Company\"}" http://localhost:5000/api/template-settings
```

---

## Step 6: Test Frontend (5 minutes)

1. Start frontend: `cd frontend && npm run dev`
2. Navigate to Settings → Invoice & Templates
3. Click "Open Template Settings" button
4. Try changing some values
5. Click "Save Settings"
6. Refresh page - settings should persist

---

## Quick Commands (Copy-Paste Ready)

```powershell
# Full setup in one go
cd c:\Users\USER\Videos\NEW START\backend
npx prisma migrate dev --name add_template_settings
npx prisma generate
npm run dev

# In another terminal
cd c:\Users\USER\Videos\NEW START\frontend
npm run dev
```

---

## Verification Checklist

- [ ] Schema added to `schema.prisma`
- [ ] Migration ran successfully
- [ ] `templates.ts` file created
- [ ] Route registered in main server file
- [ ] Backend starts without errors
- [ ] GET endpoint returns default settings
- [ ] PUT endpoint saves settings
- [ ] Frontend loads settings
- [ ] Frontend saves settings
- [ ] Settings persist after refresh

---

## Common Issues

### Issue: Migration fails with "relation does not exist"
**Fix**: Make sure Company model has the `templates TemplateSettings?` relation

### Issue: 401 Unauthorized
**Fix**: Make sure you're logged in and have valid auth token

### Issue: TypeScript errors in templates.ts
**Fix**: Run `npx prisma generate` to update types

### Issue: Frontend can't save settings
**Fix**: Check browser console for API errors, verify backend route is registered

---

## Next Steps After Backend is Working

1. **Apply Settings to ReleaseNoteModal** (1 hour)
   - Fetch settings in parent component
   - Pass as prop to modal
   - Apply colors, show/hide toggles, logo, etc.

2. **Logo Upload** (30 min)
   - Add file upload in UI
   - Create POST /api/template-settings/logo endpoint
   - Use multer for file handling
   - Save file to public/uploads/logos/

3. **Preview Feature** (1 hour)
   - Create preview panel in TemplateSettings
   - Show live preview of invoice/release note
   - Update preview when settings change

4. **PDF Generation** (2 hours)
   - Install puppeteer or pdfkit
   - Create PDF generation endpoint
   - Apply template settings to PDF layout

---

**Total Time: ~1 hour to get backend fully working**

Good luck! 🚀

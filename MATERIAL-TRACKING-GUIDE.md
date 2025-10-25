# 📊 Material Tracking & Damage Reports - Complete Guide

## ✅ Backend APIs Created

### 1️⃣ Material Transaction History API
**Endpoint:** `GET /api/materials/:materialId/history`

**Returns:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "PURCHASE | ISSUE | RETURN",
      "quantity": 100,
      "balanceAfter": 150,
      "date": "2024-10-25T14:30:00Z",
      "details": {
        "jobCode": "JOB-123",
        "jobTitle": "House Shifting",
        "supplier": "ABC Traders",
        "purchaseOrderNo": "PO-001",
        "unitCost": 2.50,
        "rack": "A-12 - Main Warehouse",
        "notes": "Bulk purchase"
      }
    }
  ],
  "summary": {
    "currentStock": 150,
    "totalPurchased": 200,
    "totalIssued": 80,
    "totalReturned": 30,
    "totalDamaged": 5
  }
}
```

**Features:**
- ✅ Shows ALL transactions chronologically
- ✅ PURCHASE: Stock additions with supplier details
- ✅ ISSUE: Materials sent to jobs with job code
- ✅ RETURN: Good materials back to stock
- ✅ Running balance after each transaction
- ✅ Full job details, rack location, costs

### 2️⃣ Damage Report API
**Endpoint:** `GET /api/reports/damages?startDate=&endDate=&materialId=`

**Returns:**
```json
{
  "damages": [
    {
      "id": "uuid",
      "material": {
        "sku": "BW-001",
        "name": "BUBBLE WRAP",
        "unit": "PCS"
      },
      "quantity": 5,
      "reason": "Boxes torn during transport",
      "photoUrls": [
        "/uploads/damages/damage-123.jpg",
        "/uploads/damages/damage-124.jpg"
      ],
      "recordedAt": "2024-10-25T14:30:00Z",
      "job": {
        "jobCode": "JOB-1761402921100",
        "jobTitle": "ADADAD",
        "jobAddress": "asdfasdfasdf"
      },
      "recordedBy": {
        "name": "Admin User"
      },
      "estimatedValue": 12.50
    }
  ],
  "summary": {
    "totalItems": 45,
    "totalValue": 2340.50,
    "mostDamagedMaterial": "BUBBLE WRAP",
    "recentDamageDate": "2024-10-25T14:30:00Z"
  }
}
```

**Features:**
- ✅ Complete damage history with photos
- ✅ Filter by date range or specific material
- ✅ Full job details linked to each damage
- ✅ Estimated value loss calculation
- ✅ Summary statistics
- ✅ Photo viewer modal
- ✅ Print & CSV export

## 🎨 Frontend Components Created

### 1️⃣ MaterialTransactionHistory.tsx
**Location:** `frontend/src/components/MaterialTransactionHistory.tsx`

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
}
```

**UI Features:**
- ✅ Modal popup with full transaction list
- ✅ 5 summary cards (Current, Purchased, Issued, Returned, Damaged)
- ✅ Color-coded transaction types:
  - 🟢 Green: PURCHASE/RETURN (stock increase)
  - 🟠 Orange: ISSUE (stock decrease)
- ✅ Timeline view with all details
- ✅ Job codes clickable (future: can navigate to job)
- ✅ Supplier, PO#, Rack location displayed
- ✅ Running balance shown for each transaction

### 2️⃣ DamageReport.tsx
**Location:** `frontend/src/components/reports/DamageReport.tsx`

**UI Features:**
- ✅ Full-page report view
- ✅ 4 summary cards (Items, Value, Most Damaged, Recent)
- ✅ Date range filters
- ✅ Photo grid with zoom modal
- ✅ Job details with address
- ✅ Damage reason highlighted
- ✅ Recorded by & timestamp
- ✅ Print button (hides UI elements)
- ✅ CSV export button

## 🔧 Next Steps to Integrate

### Step 1: Add History Button to Materials Table
**File to Edit:** `frontend/src/pages/Materials/MaterialsManagement.tsx`

**In the materials table, add button:**
```tsx
import { MaterialTransactionHistory } from '../../components/MaterialTransactionHistory';

// Add states
const [historyModalOpen, setHistoryModalOpen] = useState(false);
const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

// In the table actions column, add:
<button
  onClick={() => {
    setSelectedMaterial(material);
    setHistoryModalOpen(true);
  }}
  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  📊 History
</button>

// At the end of component, before closing div:
<MaterialTransactionHistory
  isOpen={historyModalOpen}
  onClose={() => setHistoryModalOpen(false)}
  materialId={selectedMaterial?.id || ''}
  materialName={selectedMaterial?.name || ''}
/>
```

### Step 2: Add Damage Report to Reports Menu
**File to Edit:** `frontend/src/App.tsx` or navigation component

**Add route:**
```tsx
import { DamageReport } from './components/reports/DamageReport';

// In Routes:
<Route path="/reports/damages" element={<DamageReport />} />
```

**Add to sidebar navigation:**
```tsx
<Link to="/reports/damages" className="...">
  <AlertTriangle className="w-5 h-5" />
  <span>Damage Report</span>
</Link>
```

## 📸 How It Works

### Material History Flow:
1. User opens Materials page
2. Clicks "📊 History" button on any material (e.g., BUBBLE WRAP)
3. Modal opens showing complete transaction timeline:
   ```
   PURCHASE: +100 PCS from ABC Traders (PO-001) → Balance: 100
   ISSUE: -40 PCS to JOB-176 (ADADAD) → Balance: 60
   RETURN: +10 PCS from JOB-176 (Good items) → Balance: 70
   PURCHASE: +50 PCS from XYZ Suppliers → Balance: 120
   ```
4. Each transaction shows full details with icons and colors
5. Summary cards at top show aggregated stats

### Damage Report Flow:
1. User navigates to Reports → Damage Report
2. Page loads with all damage records
3. Summary shows:
   - Total damaged: 45 items
   - Value loss: ₹2,340.50
   - Most damaged material: BUBBLE WRAP
   - Recent damage: Oct 25, 2024
4. Each damage card shows:
   - Material name & SKU
   - Quantity damaged & estimated value
   - Job details (code, title, address)
   - Damage reason in highlighted box
   - Photo grid (click to zoom)
   - Recorded by & timestamp
5. User can filter by date range
6. User can print report or export to CSV

## 🎯 Benefits

✅ **Complete Transparency:** See every + and - movement
✅ **Job Tracking:** Know exactly which job used/damaged materials
✅ **Cost Analysis:** Calculate value of damaged items
✅ **Photo Evidence:** Visual proof of damages with zoom
✅ **Audit Trail:** Who recorded damage and when
✅ **Reporting:** Print & CSV export for management
✅ **Supplier Tracking:** See which supplier materials came from
✅ **Rack Location:** Know where materials were stored

## 📝 Database Relations Used

```
MaterialIssue → StockBatch (FIFO deduction)
MaterialIssue → MovingJob (job details)
MaterialIssue → Rack (storage location)
MaterialReturn → MaterialIssue (link back to issue)
MaterialDamage → MaterialReturn (damage linked to return)
MaterialDamage → PackingMaterial (material details)
MaterialDamage → User (who recorded)
```

## 🚀 Ready to Use!

Both backend APIs are complete and frontend components are built. 

**Just need to:**
1. Add History button to materials table
2. Add Damage Report route to navigation

Would you like me to do the integration now? 😊

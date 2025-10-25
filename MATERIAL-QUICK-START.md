# 🚀 Material Stock System - Quick Reference

## How It Works (Simple Version)

### 1️⃣ Add Material to System
```
Materials → Add Material
- Name: Cardboard Box
- SKU: BOX-001  
- Cost: 50 Rs
- Category: BOX
```

### 2️⃣ Record Stock Purchase
```
- Add 100 boxes via Stock Batch
- Stock is now = 100 PCS
```

### 3️⃣ Create Moving Job with Materials
```
Job → Add Materials Section
- Select: Cardboard Box (100 available)
- Quantity: 20
- Rack: A1 (Ground Floor) ← MUST SELECT RACK
- Auto: Stock becomes 80
```

### 4️⃣ Job Complete - Record Returns
```
Job → Return Materials
- Good items: 18
- Damaged: 2  
- Return Rack: A1
- Auto: Restocks 18, damages recorded
- Final Stock: 98 (2 damaged separate)
```

---

## Key Points

✅ **Rack Selection Required** - Every material for a job goes to a specific rack
✅ **Auto Stock Deduction** - No manual entry needed, happens automatically
✅ **Auto Restock** - Good items auto-added back when returned
✅ **Damage Tracked** - Damaged items separated from good stock
✅ **Real-time Updates** - Stock always accurate

---

## API Cheat Sheet

```bash
# Create Material
POST /api/materials
{ "sku": "BOX-001", "name": "Box", "category": "BOX", "unitCost": 50 }

# Get All Materials
GET /api/materials

# Get Available Racks
GET /api/materials/available-racks

# Allocate to Job (Auto Deduct)
POST /api/materials/issues
{ "jobId": "job-1", "materialId": "mat-1", "quantity": 20, "rackId": "rack-1" }

# Record Return (Auto Restock)
POST /api/materials/returns
{ "jobId": "job-1", "materialId": "mat-1", "quantityGood": 18, "quantityDamaged": 2, "rackId": "rack-1" }
```

---

## File Locations

### Backend:
- Routes: `/backend/src/routes/materials.ts`
- Database: `/backend/prisma/schema.prisma`

### Frontend:
- Materials List: `/frontend/src/pages/Materials/MaterialsList.tsx`
- Job Allocation: `/frontend/src/pages/Materials/JobMaterialsForm.tsx`
- Returns: `/frontend/src/pages/Materials/MaterialReturnForm.tsx`

---

## Status: ✅ READY TO USE

All features implemented and tested!

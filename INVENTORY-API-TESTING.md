# Inventory API Testing Guide

## System Status ✅
- Backend: Running on http://148.230.107.155:5000
- Database: MySQL (wms_production)
- All routes registered and compiled

## Quick Test

### 1. Get Health Status
```bash
curl http://148.230.107.155:5000/api/health
```

### 2. Get Consumables (With JWT Token)
You need a valid JWT token from login. First get token:

```bash
curl -X POST http://148.230.107.155:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wms.local",
    "password": "your_password"
  }'
```

This returns:
```json
{
  "token": "eyJhbGc...",
  "user": {...}
}
```

Then use the token:
```bash
TOKEN="eyJhbGc..."
curl -H "Authorization: Bearer $TOKEN" \
  http://148.230.107.155:5000/api/consumables/company/all
```

### 3. Add Consumable
```bash
TOKEN="your_token_here"
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rackId": "rack_001",
    "itemType": "Boxes",
    "quantity": 100,
    "unit": "pcs",
    "minThreshold": 20
  }' \
  http://148.230.107.155:5000/api/consumables
```

Response:
```json
{
  "success": true,
  "message": "Consumable added",
  "id": "consumable_1729610892345_abc123"
}
```

### 4. Transfer Stock Between Racks
```bash
TOKEN="your_token_here"
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromRackId": "rack_001",
    "toRackId": "rack_002",
    "itemType": "Boxes",
    "quantity": 50,
    "unit": "pcs",
    "reason": "Moving to secondary warehouse"
  }' \
  http://148.230.107.155:5000/api/consumables/transfer/stock
```

### 5. Dispose of Consumables
```bash
TOKEN="your_token_here"
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rackId": "rack_001",
    "itemType": "Boxes",
    "quantity": 10,
    "disposalType": "DAMAGED",
    "reason": "Water damaged during storage"
  }' \
  http://148.230.107.155:5000/api/consumables/dispose/item
```

### 6. Sell Old Material
```bash
TOKEN="your_token_here"
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rackId": "rack_001",
    "itemType": "Boxes",
    "quantity": 20,
    "unitPrice": 5.50,
    "description": "Used boxes sold to recycling company"
  }' \
  http://148.230.107.155:5000/api/consumables/sell/material
```

Response:
```json
{
  "success": true,
  "message": "Material sold",
  "revenue": 110.00
}
```

### 7. Get Sales Report
```bash
TOKEN="your_token_here"
COMPANY_ID="your_company_id"
curl -H "Authorization: Bearer $TOKEN" \
  http://148.230.107.155:5000/api/consumables/sales/report/$COMPANY_ID
```

### 8. Get Inventory Configuration
```bash
TOKEN="your_token_here"
COMPANY_ID="your_company_id"
curl -H "Authorization: Bearer $TOKEN" \
  http://148.230.107.155:5000/api/inventory-config/$COMPANY_ID
```

### 9. Create Inventory Configuration
```bash
TOKEN="your_token_here"
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemTypes": ["Boxes", "Tape", "Bubble Wrap", "Foam"],
    "units": ["pcs", "roll", "box", "meter"],
    "lowStockThreshold": 15
  }' \
  http://148.230.107.155:5000/api/inventory-config
```

### 10. Update Inventory Configuration
```bash
TOKEN="your_token_here"
COMPANY_ID="your_company_id"
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemTypes": ["Boxes", "Tape", "Bubble Wrap", "Foam", "Packing Peanuts"],
    "units": ["pcs", "roll", "box", "meter", "bag"],
    "lowStockThreshold": 25
  }' \
  http://148.230.107.155:5000/api/inventory-config/$COMPANY_ID
```

## Database Tables

### rack_consumables
Stores current stock levels:
```
id, rackId, companyId, itemType, quantity, unit, minThreshold, lastRestocked, restokedBy, createdAt, updatedAt
```

### consumable_movements
Logs all transfers:
```
id, fromRackId, toRackId, fromConsumableId, toConsumableId, companyId, itemType, quantity, unit, movementType, reason, movedBy, createdAt
```

### consumable_disposals
Tracks waste/damage:
```
id, consumableId, companyId, itemType, quantity, unit, disposalType (USED/DAMAGED/EXPIRED/WASTE), reason, disposedBy, createdAt
```

### consumable_sales
Records revenue from sales:
```
id, consumableId, companyId, itemType, quantity, unit, unitPrice, totalPrice, saleDescription, soldBy, createdAt
```

### inventory_configurations
Per-company settings:
```
id, companyId, itemTypes (JSON), units (JSON), lowStockThreshold, createdAt, updatedAt
```

## Error Handling

All endpoints return standardized responses:

**Success:**
```json
{
  "success": true,
  "data": {...} or "message": "..."
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

Common errors:
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `400` - Bad request (validation error or insufficient stock)
- `404` - Not found
- `500` - Server error

---

**Last Updated:** October 22, 2025
**API Version:** 1.0.0

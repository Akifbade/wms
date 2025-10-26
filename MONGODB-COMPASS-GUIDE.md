# 🗄️ MongoDB Compass Connection Guide

## Quick Connect

**Connection String:**
```
mongodb://admin:adminpassword@localhost:27017/warehouse_wms?authSource=admin
```

## Step-by-Step

1. **Download MongoDB Compass** (if not installed)
   - https://www.mongodb.com/try/download/compass

2. **Open MongoDB Compass**

3. **Paste Connection String:**
   ```
   mongodb://admin:adminpassword@localhost:27017/warehouse_wms?authSource=admin
   ```

4. **Click "Connect"**

5. **View Data:**
   - Database: `warehouse_wms`
   - Collections:
     - MovingJob
     - Company
     - Shipment
     - PackingMaterial
     - (+ 39 more as you use them)

## What You'll See

### MovingJob Collection
```json
{
  "_id": "Ly60fyld2x",
  "clientName": "Ali Hassan",
  "jobAddress": "DHA Phase 5, Karachi",
  "clientPhone": "+923001234567",
  "dropoffAddress": "Bahria Town, Karachi",
  "status": "PENDING",
  "jobDate": "2025-11-15",
  "jobTitle": "House Moving - Karachi",
  "jobCode": "JOB001",
  "_created_at": "2025-10-26T20:55:14.881Z",
  "_updated_at": "2025-10-26T20:55:14.881Z"
}
```

### Company Collection
```json
{
  "_id": "VQoGJoQ4FD",
  "email": "info@alkareem.pk",
  "name": "Al-Kareem Movers",
  "phone": "+923001112233",
  "address": "Karachi, Pakistan",
  "_created_at": "2025-10-26T20:56:41.570Z",
  "_updated_at": "2025-10-26T20:56:41.570Z"
}
```

### Shipment Collection
```json
{
  "_id": "cAx8zRVdPt",
  "status": "IN_TRANSIT",
  "weight": 150.5,
  "destination": "Islamabad",
  "trackingId": "SHIP-2025-001",
  "customerName": "Ahmed Khan",
  "origin": "Lahore",
  "_created_at": "2025-10-26T20:56:47.492Z",
  "_updated_at": "2025-10-26T20:56:47.492Z"
}
```

## Features

### 1. Visual Data Browser
- See all collections
- Browse documents
- Search and filter

### 2. Query Editor
```javascript
// Find pending jobs
{ "status": "PENDING" }

// Find jobs by client
{ "clientName": /ali/i }

// Find recent shipments
{ "_created_at": { $gte: ISODate("2025-10-26") } }
```

### 3. Aggregation Pipeline
```javascript
[
  { $match: { status: "PENDING" } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
]
```

### 4. Schema Analysis
- Auto-detect field types
- View document structure
- See indexes

### 5. Export/Import
- Export to JSON
- Export to CSV
- Import data

## Advantages Over phpMyAdmin

| Feature | phpMyAdmin | MongoDB Compass |
|---------|------------|-----------------|
| UI | Old, clunky | Modern, beautiful |
| Speed | Slow queries | Lightning fast |
| Search | Basic SQL | Powerful queries |
| Filters | Complex WHERE | Visual filters |
| Relationships | Manual JOINs | Embedded docs |
| Real-time | No | Yes |
| Aggregations | Complex SQL | Visual pipeline |

## Tips

1. **Use Filters** - Click any field value to filter
2. **Document View** - Click row to see full JSON
3. **Schema Tab** - See field types and distributions
4. **Aggregation Builder** - Visual query builder
5. **Indexes** - Add indexes for faster queries

## Alternative: Direct MongoDB Shell

```bash
docker exec -it wms-mongodb-dev mongosh -u admin -p adminpassword --authenticationDatabase admin
```

```javascript
// Switch to database
use warehouse_wms

// Show collections
show collections

// Find all jobs
db.MovingJob.find()

// Find pending jobs
db.MovingJob.find({ status: "PENDING" })

// Count documents
db.MovingJob.countDocuments()

// Exit
exit
```

## Parse Dashboard (Backup Option)

If you get Parse Dashboard working:
```
URL: http://localhost:4040
Username: admin
Password: admin123
```

Currently has connection issue (CSRF errors), but Compass is better anyway!

---

**Enjoy your visual database management!** 🚀

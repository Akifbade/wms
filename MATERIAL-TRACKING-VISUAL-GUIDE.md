# Material Tracking System - Visual Guides & Code Patterns

## 📊 Material Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE MATERIAL LIFECYCLE                               │
└──────────────────────────────────────────────────────────────────────────────────┘

                              DAY OF JOB
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              
        ╔═══════════════════╗
        ║  1. CREATE JOB    ║
        ║  (Morning)        ║
        ╚═══════════════════╝
             │
             ├─ Task: "Home Shifting"
             ├─ Crew: [Ahmed, Ali, Fatima]
             ├─ Date: 2025-10-22
             ├─ Time: 09:00 - 17:00
             │
             └─→ SELECT MATERIALS ◄──┐
                  │                    │
                  ├─ Large Box: 50     │ Search Inventory
                  ├─ Medium Box: 10    │ Stock checked
                  └─ Tape: 1 roll      │ Qty validated
                       │
                       └─→ INVENTORY UPDATED ◄─┐
                            │                   │
                            ├─ Large Box: 950  │ Subtract
                            ├─ Medium Box: 40  │ from stock
                            └─ Tape: 5 rolls   │
                                 │
                                 └─→ JOB SAVED ✓
                                      Status: Pending
                                      Materials: ✓ Locked


        ╔═══════════════════╗
        ║  2. JOB ACTIVE    ║
        ║  (09:00 - 17:00)  ║
        ╚═══════════════════╝
             │
             └─→ CREW WORKS
                  │
                  ├─ Uses materials as assigned
                  │  • 50 large boxes loaded
                  │  • 10 medium boxes loaded
                  │  • Some items packed with tape
                  │
                  └─→ STATUS VISIBLE
                       "Pending" (yellow)
                       Crew notified of material count


        ╔═══════════════════╗
        ║  3. MARK COMPLETE ║
        ║  (17:00)          ║
        ╚═══════════════════╝
             │
             └─→ CREW CLICKS "Mark as Complete"
                  │
                  ├─ Submits job completion
                  ├─ System checks for materials
                  │
                  └─→ STATUS CHANGES
                       IF materials assigned:
                       Status: "Pending Confirmation" (orange) ◄─ WAITS FOR SUPERVISOR
                       
                       IF NO materials:
                       Status: "Finished" (green) ◄─ JOB DONE


        ╔═══════════════════════════════════╗
        ║  4. SUPERVISOR RECONCILIATION     ║
        ║  (17:30 - Inspection)             ║
        ╚═══════════════════════════════════╝
             │
             └─→ SUPERVISOR CLICKS "Confirm Material Returns"
                  │
                  ├─ MODAL APPEARS
                  │  ├─ Large Box (Used: 50)
                  │  │  ├─ Good Qty: [   48    ] (default: 50, max: 50)
                  │  │  └─ Damaged Qty: [ 2   ] (max: 50)
                  │  │
                  │  ├─ Medium Box (Used: 10)
                  │  │  ├─ Good Qty: [   10    ]
                  │  │  └─ Damaged Qty: [ 0    ]
                  │  │
                  │  ├─ Tape (Used: 1 roll)
                  │  │  ├─ Good Qty: [   1    ]
                  │  │  └─ Damaged Qty: [ 0    ]
                  │  │
                  │  ├─ PHOTO UPLOAD
                  │  │  └─ 📷 [Add Photo Button]
                  │  │
                  │  └─ NOTES
                  │     └─ "2 boxes damaged due to rough handling"
                  │
                  ├─ SUPERVISOR ENTERS DATA
                  │  └─ Physical count of each item
                  │
                  └─→ CLICKS "Confirm & Finish Job"


        ╔═══════════════════════════════════╗
        ║  5. BATCH TRANSACTION EXECUTES    ║
        ║  (Milliseconds - Atomic)          ║
        ╚═══════════════════════════════════╝
             │
             ├─→ GOOD ITEMS ADDED BACK
             │    ├─ Large Box: 950 + 48 = 998 ✓
             │    ├─ Medium Box: 40 + 10 = 50 ✓
             │    └─ Tape: 5 + 1 = 6 rolls ✓
             │
             ├─→ DAMAGED ITEMS LOGGED
             │    ├─ Create damage record
             │    ├─ itemId: "inv_001"
             │    ├─ itemName: "Large Box"
             │    ├─ quantity: 2
             │    ├─ scheduleId: "schedule_12345"
             │    └─ timestamp: NOW ✓
             │
             ├─→ SCHEDULE UPDATED
             │    ├─ status: "Finished" ✓
             │    ├─ materialsConfirmed: true ✓
             │    ├─ materialsConfirmedBy: "Ahmed" ✓
             │    ├─ materialReturnPhotoData: [base64] ✓
             │    └─ reconciliationDetails:
             │        ├─ returnedItems: {Large Box: 48, Medium Box: 10, Tape: 1}
             │        ├─ damagedItems: {Large Box: 2}
             │        └─ discrepancyNotes: "2 boxes damaged..."  ✓
             │
             └─→ BATCH COMMITTED
                  ALL CHANGES SAVED TOGETHER
                  OR NONE IF ERROR
                  (No partial updates)


        ╔═══════════════════════════════════╗
        ║  6. JOB COMPLETE & VISIBLE        ║
        ║  (Dashboard Updated)              ║
        ╚═══════════════════════════════════╝
             │
             ├─ Status Badge: "Finished" (green) ✓
             ├─ Material Details Visible
             │  ├─ Used: Large Box 50, Medium Box 10, Tape 1
             │  ├─ Returned: Large Box 48, Medium Box 10, Tape 1
             │  ├─ Damaged: Large Box 2
             │  ├─ Photo: [Thumbnail visible]
             │  └─ Confirmed by: Ahmed at 17:30:45
             │
             ├─ Dashboard Metrics Updated
             │  ├─ "Finished Today": +1
             │  ├─ "Finished This Month": +1
             │  ├─ "Damaged Items": +2
             │  └─ Charts refreshed
             │
             └─ AUDIT TRAIL COMPLETE
                ├─ Job creation time
                ├─ Material assignment
                ├─ Completion time
                ├─ Reconciliation details
                ├─ Damage photo
                ├─ Supervisor name
                └─ All timestamps
```

---

## 🔄 State Machine Diagram

```
                         JOB LIFECYCLE STATES


                    ┌─────────────────────────┐
                    │   CREATED (NEW)         │
                    │  status: null           │
                    │  no materials yet       │
                    └────────────┬────────────┘
                                 │
                         User adds materials
                                 │
                    ┌────────────▼────────────┐
                    │   PENDING               │
                    │  status: "Pending"      │
                    │  materials: assigned    │
                    │  inventory: reduced     │
                    └────────────┬────────────┘
                                 │
                    Crew marks job complete
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
         ┌────────▼────────┐          ┌────────▼────────┐
         │ HAS MATERIALS? │          │   NO MATERIALS? │
         └────────┬────────┘          └────────┬────────┘
                  │ YES                       │ NO
         ┌────────▼──────────────┐   ┌────────▼────────┐
         │PENDING CONFIRMATION   │   │   FINISHED      │
         │  status: "Pending..." │   │status:"Finished"│
         │  Waiting for          │   │ Job done        │
         │  supervisor review    │   └─────────────────┘
         └────────┬──────────────┘
                  │
      Supervisor clicks "Confirm"
                  │
         ┌────────▼──────────────┐
         │   FINISHED            │
         │   status: "Finished"   │
         │   ✓ Materials logged   │
         │   ✓ Damage recorded    │
         │   ✓ Photo attached     │
         │   ✓ Inventory updated  │
         └───────────────────────┘
                  │
        Data persists in audit trail
                  │
         Visible in dashboard & reports
```

---

## 📋 Material Row UI Pattern

```html
MATERIAL ASSIGNMENT FORM

┌─────────────────────────────────────────────────────────────────┐
│ Materials to be Used                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Row 1 (Material):                                                 │
│ ┌──────────────────────┐  ┌─────────┐  ┌──────┐                 │
│ │ Search for item...   │  │   Qty   │  │ ✕    │                 │
│ │                      │  │  [  ]   │  │ DEL  │                 │
│ │ • Large Box         │  │         │  │      │                 │
│ │ • Medium Box        │  │         │  │      │                 │
│ │ • Tape (5 rolls)    │  │         │  │      │                 │
│ └──────────────────────┘  └─────────┘  └──────┘                 │
│                                                                   │
│ Row 2 (Material):                                                 │
│ ┌──────────────────────┐  ┌─────────┐  ┌──────┐                 │
│ │ Large Box (50 avail) │  │   50    │  │ ✕    │                 │
│ │ [Hidden: inv_001]    │  │  [  ]   │  │ DEL  │                 │
│ └──────────────────────┘  └─────────┘  └──────┘                 │
│                                                                   │
│ Row 3 (Material):                                                 │
│ ┌──────────────────────┐  ┌─────────┐  ┌──────┐                 │
│ │ Medium Box (10 avail)│  │   10    │  │ ✕    │                 │
│ │ [Hidden: inv_002]    │  │  [  ]   │  │ DEL  │                 │
│ └──────────────────────┘  └─────────┘  └──────┘                 │
│                                                                   │
│          [+ Add Material]  [Save Schedule]  [Cancel]              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


KEY INTERACTIONS:
1. User types in search box: "la" → shows "Large Box (50 in stock)"
2. User clicks item → populates itemId, item name, sets max qty
3. User enters quantity → compared against stock
4. User can add multiple materials
5. Each material row is removable
6. Saving validates: qty ≤ stock + previously assigned
7. Inventory is deducted on save
```

---

## ✅ Reconciliation Modal UI

```html
MATERIAL RETURN RECONCILIATION

┌─────────────────────────────────────────────────────────────────┐
│ Reconcile Material Returns                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Returned & Damaged Quantities:                                    │
│                                                                   │
│ Material 1: Large Box (Used: 50)                                  │
│ ┌──────────────────────────────┐  ┌──────────────────────────┐  │
│ │ Good Qty  [   48      ]       │  │ Damaged Qty  [  2  ]     │  │
│ │ max: 50, default: 50          │  │ max: 50, default: 0      │  │
│ └──────────────────────────────┘  └──────────────────────────┘  │
│                                                                   │
│ Material 2: Medium Box (Used: 10)                                 │
│ ┌──────────────────────────────┐  ┌──────────────────────────┐  │
│ │ Good Qty  [   10      ]       │  │ Damaged Qty  [  0  ]     │  │
│ │ max: 10, default: 10          │  │ max: 10, default: 0      │  │
│ └──────────────────────────────┘  └──────────────────────────┘  │
│                                                                   │
│                                                                   │
│ Photo of Returned Items:                                          │
│          [📷 Add Photo]                                           │
│     [Photo preview here]                                          │
│                                                                   │
│ Discrepancy Notes (Required if quantities don't match):           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 2 boxes damaged due to rough handling                        │ │
│ │                                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│      [Cancel]    [Confirm & Finish Job]                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘


DATA VALIDATION:
✓ Good Qty + Damaged Qty = Used Qty (or less)
✓ All quantities as numbers
✓ Photo optional but recommended
✓ Notes required if any discrepancy
```

---

## 🗄️ Database Structure (MySQL Equivalent)

```sql
-- SCHEDULES TABLE (Jobs)
CREATE TABLE schedules (
  id VARCHAR(36) PRIMARY KEY,
  task VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  startTime TIME NOT NULL,
  endTime TIME NOT NULL,
  priority ENUM('Low', 'Medium', 'High'),
  address VARCHAR(255),
  vehicle VARCHAR(100),
  notes TEXT,
  status ENUM('Pending', 'Pending Confirmation', 'Finished'),
  completionTime TIMESTAMP NULL,
  materialsConfirmed BOOLEAN DEFAULT FALSE,
  materialsConfirmedBy VARCHAR(255),
  materialsConfirmationTime TIMESTAMP NULL,
  materialReturnPhotoData LONGBLOB,
  userId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- SCHEDULE_MATERIALS TABLE (Pivot)
CREATE TABLE schedule_materials (
  id VARCHAR(36) PRIMARY KEY,
  scheduleId VARCHAR(36) NOT NULL,
  itemId VARCHAR(36) NOT NULL,
  itemName VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (scheduleId) REFERENCES schedules(id),
  FOREIGN KEY (itemId) REFERENCES inventory(id)
);

-- RECONCILIATION_DETAILS TABLE
CREATE TABLE reconciliation_details (
  id VARCHAR(36) PRIMARY KEY,
  scheduleId VARCHAR(36) NOT NULL,
  itemId VARCHAR(36) NOT NULL,
  itemName VARCHAR(255),
  returnedQty INT NOT NULL,
  damagedQty INT NOT NULL,
  discrepancyNotes TEXT,
  FOREIGN KEY (scheduleId) REFERENCES schedules(id),
  FOREIGN KEY (itemId) REFERENCES inventory(id)
);

-- DAMAGED_ITEMS TABLE (Audit Trail)
CREATE TABLE damaged_items (
  id VARCHAR(36) PRIMARY KEY,
  itemId VARCHAR(36) NOT NULL,
  itemName VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  scheduleId VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  userId VARCHAR(36) NOT NULL,
  FOREIGN KEY (itemId) REFERENCES inventory(id),
  FOREIGN KEY (scheduleId) REFERENCES schedules(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- INVENTORY TABLE
CREATE TABLE inventory (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(50),
  quantity INT DEFAULT 0,
  imageData LONGBLOB,
  userId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- SCHEDULE_CREW TABLE (Pivot for crew assignments)
CREATE TABLE schedule_crew (
  id VARCHAR(36) PRIMARY KEY,
  scheduleId VARCHAR(36) NOT NULL,
  crewId VARCHAR(36) NOT NULL,
  FOREIGN KEY (scheduleId) REFERENCES schedules(id),
  FOREIGN KEY (crewId) REFERENCES crew(id)
);
```

---

## 🔐 Key Business Rules

```
MATERIAL ASSIGNMENT RULES:
═════════════════════════════

1. Stock Validation
   ✓ Can assign ≤ available inventory
   ✓ Can reassign same items in edit
   ✓ Formula: assigned_qty ≤ stock + previously_assigned

2. Inventory Updates
   ✓ ON CREATE: Deduct from inventory immediately
   ✓ ON EDIT: Calculate delta, update inventory
   ✓ ON DELETE: Return to inventory if not reconciled
   ✓ ON RETURN: Add good items to inventory
   ✓ ON DAMAGE: Log separately, don't add to inventory

3. Status Workflow
   ✓ Pending → Pending Confirmation (if has materials)
   ✓ Pending → Finished (if no materials)
   ✓ Pending Confirmation → Finished (after supervisor confirms)
   ✓ Can delete only from Pending state (before reconciliation)

4. Reconciliation Rules
   ✓ Supervisor must confirm returns
   ✓ Good + Damaged ≤ Used quantity
   ✓ Photo optional but recommended
   ✓ Discrepancy notes explain any mismatch
   ✓ All changes committed atomically

5. Audit Trail
   ✓ Every action timestamped
   ✓ Every user tracked
   ✓ Before/after quantities preserved
   ✓ Damage logged separately for analysis
```

---

## 📊 Dashboard Metrics Queries

```javascript
// FINISHED JOBS TODAY
SELECT COUNT(*) 
FROM schedules 
WHERE status = 'Finished' 
  AND DATE(completionTime) = CURDATE()

// ONGOING JOBS
SELECT COUNT(*) 
FROM schedules 
WHERE status IN ('Pending', 'Pending Confirmation')

// TOTAL DAMAGED ITEMS
SELECT SUM(quantity) as total_damaged
FROM damaged_items

// DAMAGE RATE BY ITEM
SELECT 
  itemName,
  SUM(quantity) as total_damaged,
  (SELECT COUNT(*) FROM schedule_materials WHERE itemId = di.itemId) as used_count,
  ROUND(SUM(quantity) / COUNT(*) * 100, 2) as damage_percent
FROM damaged_items di
GROUP BY itemId
ORDER BY damage_percent DESC
```

---

## ⚡ Performance Considerations

```
OPTIMIZATION POINTS:

1. Batch Transactions
   ✓ All inventory updates in single transaction
   ✓ Prevents race conditions
   ✓ Atomic: all succeed or all fail

2. Indexing
   ✓ INDEX schedules(userId, status, date)
   ✓ INDEX schedules(userId, completionTime)
   ✓ INDEX inventory(userId, name)
   ✓ INDEX damaged_items(scheduleId)

3. Caching
   ✓ Cache inventory list (refresh on schedule save)
   ✓ Cache dashboard metrics (refresh hourly or on update)

4. Query Optimization
   ✓ Avoid N+1 queries (batch load crew, materials, reconciliation)
   ✓ Use JOINs for material details
   ✓ Paginate reconciliation history
```

---


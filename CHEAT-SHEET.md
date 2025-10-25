# 📋 MATERIAL TRACKING - ONE PAGE CHEAT SHEET

## Complete Workflow (30 seconds)

```
CREATE JOB
  ↓
  ADD MATERIALS (search inventory)
  ↓
  INVENTORY DEDUCTED
  ↓
  JOB ACTIVE (crew works)
  ↓
  MARK COMPLETE
  ↓
  STATUS: "Pending Confirmation" (IF has materials)
  ↓
  SUPERVISOR RECONCILIATION
  ├─ Good items quantity
  ├─ Damaged items quantity
  ├─ Upload photo
  └─ Enter notes
  ↓
  BATCH TRANSACTION (atomic)
  ├─ Good items → ADD to inventory
  ├─ Damaged → LOG separately
  └─ Schedule → MARK FINISHED
  ↓
  JOB COMPLETE + AUDIT TRAIL
```

---

## Key Data Fields

| Table | Fields |
|-------|--------|
| **Schedule** | task, date, status, materialsUsed[], reconciliationDetails{}, photo, confirmedBy, confirmedTime |
| **Inventory** | name, sku, quantity (UPDATED on return) |
| **Damaged Items** | itemId, itemName, quantity, scheduleId, date, timestamp |

---

## Status Flow

```
        ┌─ Has Materials? ─┐
        │                  │
    YES │                  │ NO
        ▼                  ▼
   Pending →            Pending →
   Pending Conf →       Finished ✓
   Finished ✓
```

---

## Roles & Actions

| Role | Can Do |
|------|--------|
| **Admin** | Create job, Assign materials, Confirm returns, View all |
| **Crew** | Mark complete, View materials |
| **Supervisor** | Confirm returns, Enter good/damaged, Upload photo |

---

## Critical Code Pattern

```javascript
// ATOMIC BATCH TRANSACTION (most important)
async function confirmMaterialReturns(id, data) {
  const batch = writeBatch(db);
  
  // 1. Add good items
  batch.update(inventory_ref, {quantity: qty + good});
  
  // 2. Log damaged items
  batch.set(damage_ref, {itemId, quantity: damaged, ...});
  
  // 3. Update schedule
  batch.update(schedule_ref, {status: "Finished", ...});
  
  await batch.commit();  // ALL SUCCEED OR NONE
}
```

---

## Material Assignment Formula

```
New Qty ≤ Available Stock + Previously Assigned
```

Example:
- Stock: 50
- Previously assigned: 10
- Can assign in new job: 60 maximum

---

## Reconciliation Validation

```
Good Qty + Damaged Qty ≤ Used Qty
```

---

## Dashboard Metrics

```
Total Crew: Count
Ongoing Jobs: WHERE status IN ('Pending', 'Pending Confirmation')
Finished Today: WHERE status = 'Finished' AND date = TODAY
Finished Month: WHERE status = 'Finished' AND date >= MONTH_START
Damaged Items: COUNT(*) FROM damaged_items
```

---

## Implementation Checklist

- [ ] Database: Add materialsUsed, reconciliationDetails, photo, status
- [ ] Create: schedule_materials, damaged_items, reconciliation_details tables
- [ ] API: POST /materials, PUT /materials/:id, DELETE /materials/:id
- [ ] API: POST /:id/confirm-returns
- [ ] Frontend: Material search component
- [ ] Frontend: Reconciliation modal
- [ ] Frontend: Photo upload
- [ ] Backend: Batch transaction logic
- [ ] Testing: Stock validation
- [ ] Testing: Batch transactions
- [ ] Testing: Status workflow

---

## Error Handling

| Error | Solution |
|-------|----------|
| Insufficient stock | Show message: "Only X available" |
| Quantity mismatch | Require discrepancy notes |
| Batch fails | Rollback all changes, retry |
| Photo missing | Optional but recommended |

---

## Performance Tips

- Index: `schedules(userId, status, date)`
- Index: `inventory(userId, name)`
- Cache: Inventory list (refresh on update)
- Batch: All inventory updates in one transaction

---

## File Reference

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **MATERIAL-TRACKING-START-HERE.md** | This overview | 5 min |
| **README-MATERIAL-TRACKING.md** | Quick reference | 15 min |
| **MATERIAL-TRACKING-DEEP-ANALYSIS.md** | Complete guide | 30 min |
| **MATERIAL-TRACKING-VISUAL-GUIDE.md** | Diagrams & patterns | 20 min |
| **MATERIAL-TRACKING-CODE-PATTERNS.md** | Code examples | 30 min |

---

## Quick Answers

**Q: When is inventory updated?**
A: When user saves schedule (materials deducted), and when supervisor confirms returns (good items added back)

**Q: What's a batch transaction?**
A: Multiple database operations that all succeed together or all rollback - ensures consistency

**Q: Why separate damaged items table?**
A: Audit trail for quality analysis, insurance, dispute resolution

**Q: Can user delete job with materials?**
A: Only if not reconciled yet, materials return to inventory first

**Q: What if supervisor disagrees with quantities?**
A: Photo + discrepancy notes explain the difference

**Q: How long does reconciliation take?**
A: Batch transaction executes in milliseconds (atomic)

---

## WhatsApp Integration Point

After job is created with materials, share button can:
```
Generate message:
"Job: Home Shifting
Time: 09:00 - 17:00
Crew: Ahmed, Ali, Fatima
Materials: 50 Large Box, 10 Medium Box
Return: Expected 17:30 with photo verification"
```

---

## One More Thing

**The key insight**: Atomic batch transactions ensure your inventory is ALWAYS accurate, even if something fails mid-way. Either all changes apply or NONE. That's why it's the most critical pattern.

---


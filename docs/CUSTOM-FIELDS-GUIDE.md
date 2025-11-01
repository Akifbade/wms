# 📝 CUSTOM FIELDS SYSTEM - COMPLETE GUIDE

## 🎯 **WHAT ARE CUSTOM FIELDS?**

Custom Fields allow you to add **extra information** to your Shipments, Moving Jobs, and Expenses beyond the standard fields. 

### Real-World Example:
Imagine you want to track:
- **Priority Level** for shipments (Low, Medium, High, Urgent)
- **Customer Type** for jobs (Individual, Corporate, Government)
- **Insurance Value** for shipments (number field)

Instead of hardcoding these in the database, Custom Fields let you create them **dynamically**!

---

## 🏗️ **HOW IT WORKS - ARCHITECTURE**

### 1. **Database Storage** (Backend)
```
CustomField Table:
┌─────────────┬──────────────┬─────────────┬──────────────────┬────────────┐
│ fieldName   │ fieldType    │ section     │ fieldOptions     │ isRequired │
├─────────────┼──────────────┼─────────────┼──────────────────┼────────────┤
│ Priority    │ DROPDOWN     │ SHIPMENT    │ ["Low","High"]   │ false      │
│ Insurance   │ NUMBER       │ SHIPMENT    │ null             │ true       │
│ Customer    │ DROPDOWN     │ JOB         │ ["Corporate"]    │ false      │
└─────────────┴──────────────┴─────────────┴──────────────────┴────────────┘
```

**Key Points:**
- Each company has their own custom fields (multi-tenant)
- Fields are organized by **section** (SHIPMENT, JOB, EXPENSE)
- **fieldOptions** stores dropdown choices as JSON string
- Soft delete with **isActive** flag (never truly deleted)

### 2. **Field Types Supported**

| Type | Description | Example Use Case | Options Needed? |
|------|-------------|------------------|-----------------|
| **TEXT** | Single line text | Special Instructions | ❌ No |
| **NUMBER** | Numeric value | Insurance Amount | ❌ No |
| **DATE** | Date picker | Delivery Deadline | ❌ No |
| **DROPDOWN** | Select from list | Priority Level | ✅ Yes |
| **CHECKBOX** | Yes/No toggle | Fragile Item | ❌ No |

### 3. **Data Flow Diagram**

```
┌─────────────────┐
│   FRONTEND      │
│  (UI Component) │
└────────┬────────┘
         │
         │ 1. User clicks "Add Field"
         │
         ▼
┌─────────────────────────┐
│ SystemSettings.tsx      │
│ - Shows modal form      │
│ - Collects field data:  │
│   • Name: "Priority"    │
│   • Type: "DROPDOWN"    │
│   • Options: ["Low","High"] │
│   • Section: "SHIPMENT" │
└────────┬────────────────┘
         │
         │ 2. Calls API
         │
         ▼
┌─────────────────────────┐
│ customFieldsAPI.create()│
│ (frontend/api.ts)       │
└────────┬────────────────┘
         │
         │ 3. HTTP POST Request
         │
         ▼
┌─────────────────────────────────┐
│ Backend Route                   │
│ POST /api/custom-fields         │
│                                 │
│ Validates:                      │
│ ✓ Field name not empty          │
│ ✓ Type is valid                 │
│ ✓ Section is valid              │
│ ✓ If DROPDOWN, has options      │
│ ✓ Name unique in section        │
└────────┬────────────────────────┘
         │
         │ 4. Save to Database
         │
         ▼
┌─────────────────────────────────┐
│ Database (Prisma)               │
│                                 │
│ INSERT INTO custom_fields       │
│ VALUES (                        │
│   fieldName: "Priority",        │
│   fieldType: "DROPDOWN",        │
│   fieldOptions: '["Low","High"]'│ ← Stored as JSON string
│   section: "SHIPMENT",          │
│   companyId: "abc123",          │
│   isActive: true                │
│ )                               │
└────────┬────────────────────────┘
         │
         │ 5. Return Success
         │
         ▼
┌─────────────────────────┐
│ Frontend Updates        │
│ - Adds to list          │
│ - Shows success message │
└─────────────────────────┘
```

---

## 🔄 **LIFECYCLE OF A CUSTOM FIELD**

### **STEP 1: Creation**
```typescript
// Frontend sends:
{
  fieldName: "Priority Level",
  fieldType: "DROPDOWN",
  fieldOptions: ["Low", "Medium", "High", "Urgent"],
  section: "SHIPMENT",
  isRequired: false
}

// Backend converts options to JSON string:
fieldOptions: '["Low","Medium","High","Urgent"]'

// Saves to database with companyId
```

### **STEP 2: Retrieval**
```typescript
// Backend fetches from database
// Converts JSON string back to array:
{
  id: "field123",
  fieldName: "Priority Level",
  fieldType: "DROPDOWN",
  fieldOptions: ["Low", "Medium", "High", "Urgent"], // ← Parsed from JSON
  section: "SHIPMENT",
  isRequired: false
}
```

### **STEP 3: Usage** (Future Implementation)
```typescript
// When creating a shipment:
POST /api/shipments
{
  name: "John's Boxes",
  // ... standard fields
  customFieldValues: {
    "field123": "High"  // Selected "High" priority
  }
}
```

### **STEP 4: Update**
```typescript
// Change dropdown options:
PUT /api/custom-fields/field123
{
  fieldOptions: ["Low", "Medium", "High", "Urgent", "Critical"]
}
```

### **STEP 5: Deletion**
```typescript
// Soft delete (keeps data, hides from UI):
DELETE /api/custom-fields/field123

// Database:
UPDATE custom_fields 
SET isActive = false 
WHERE id = 'field123'
```

---

## 🎨 **FRONTEND UI FLOW**

### **Settings Page → System Settings Tab**

```
┌──────────────────────────────────────────────────────────┐
│ System Configuration                                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ [Warehouse Layout Section]                               │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Custom Fields                      [+ Add Field]    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │                                                      │ │
│ │ SHIPMENT Fields                                      │ │
│ │ ┌──────────────────────────────────────────┐        │ │
│ │ │ Priority Level (DROPDOWN)   [Required]   │ [🗑️]  │ │
│ │ │ Options: Low, Medium, High, Urgent       │        │ │
│ │ └──────────────────────────────────────────┘        │ │
│ │                                                      │ │
│ │ ┌──────────────────────────────────────────┐        │ │
│ │ │ Insurance Value (NUMBER)    [Required]   │ [🗑️]  │ │
│ │ └──────────────────────────────────────────┘        │ │
│ │                                                      │ │
│ │ JOB Fields                                           │ │
│ │ ┌──────────────────────────────────────────┐        │ │
│ │ │ Customer Type (DROPDOWN)                 │ [🗑️]  │ │
│ │ │ Options: Individual, Corporate, Gov      │        │ │
│ │ └──────────────────────────────────────────┘        │ │
│ │                                                      │ │
│ │ EXPENSE Fields                                       │ │
│ │ (No custom fields yet)                               │ │
│ └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### **Add Field Modal**

When you click **[+ Add Field]**:

```
┌─────────────────────────────────────────┐
│ Add Custom Field                     [X]│
├─────────────────────────────────────────┤
│                                         │
│ Field Name:                             │
│ ┌─────────────────────────────────────┐ │
│ │ Priority Level                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Field Type:                             │
│ ┌─────────────────────────────────────┐ │
│ │ ▼ Dropdown                          │ │
│ └─────────────────────────────────────┘ │
│   Options: Text, Number, Date,          │
│            Dropdown, Checkbox           │
│                                         │
│ Options: (only for Dropdown)            │
│ ┌─────────────────────────────────┬─┐  │
│ │ Low                             │X│  │
│ ├─────────────────────────────────┼─┤  │
│ │ Medium                          │X│  │
│ ├─────────────────────────────────┼─┤  │
│ │ High                            │X│  │
│ ├─────────────────────────────────┼─┤  │
│ │ Urgent                          │X│  │
│ └─────────────────────────────────┴─┘  │
│ [+ Add Option]                          │
│                                         │
│ Section:                                │
│ ┌─────────────────────────────────────┐ │
│ │ ▼ Shipment                          │ │
│ └─────────────────────────────────────┘ │
│   Where will this field appear?         │
│                                         │
│ ☐ Required field                        │
│                                         │
│ [Cancel]              [Add Field]       │
└─────────────────────────────────────────┘
```

---

## 🔒 **SECURITY & VALIDATION**

### **Backend Validation Rules:**

```typescript
1. Field Name:
   ✓ Cannot be empty
   ✓ Must be unique within the same section
   ✓ Example: Can't have two "Priority" fields in SHIPMENT

2. Field Type:
   ✓ Must be: TEXT, NUMBER, DATE, DROPDOWN, or CHECKBOX
   ✗ Rejects: "INVALID_TYPE"

3. Section:
   ✓ Must be: SHIPMENT, JOB, or EXPENSE
   ✗ Rejects: "ORDER" (not supported)

4. Dropdown Options:
   ✓ If type is DROPDOWN, must have at least 1 option
   ✓ Options cannot be all empty strings
   ✓ Example: ["Low", "High"] ✓
   ✗ Example: ["", ""] ✗

5. Multi-Tenant Isolation:
   ✓ Company A cannot see Company B's fields
   ✓ Automatic via companyId from JWT token
```

### **Access Control:**

| Action | Who Can Do It? |
|--------|----------------|
| **View** Fields | All users (ADMIN, MANAGER, WORKER) |
| **Create** Field | ADMIN, MANAGER only |
| **Update** Field | ADMIN, MANAGER only |
| **Delete** Field | ADMIN only |

---

## 💡 **IMPROVEMENTS MADE**

### **1. Better Field Ordering**
Currently fields show in creation order. We can add:
- Drag-and-drop reordering
- Manual order field (1, 2, 3...)

### **2. Field Templates**
Pre-built common fields:
- "Priority Level" (DROPDOWN: Low, Medium, High, Urgent)
- "Delivery Instructions" (TEXT)
- "Insurance Required" (CHECKBOX)
- "Estimated Value" (NUMBER)

### **3. Field Dependencies**
"If Priority = Urgent, then Insurance Required = true"

### **4. Field Validation Rules**
- NUMBER: min/max values
- TEXT: character limits, regex patterns
- DATE: date ranges (not before today)

### **5. Usage Analytics**
Track how often each field is used:
```
Priority Level: Used in 85% of shipments
Special Notes: Used in 12% of shipments
```

---

## 🚀 **HOW TO USE (STEP-BY-STEP)**

### **For Admins/Managers:**

**1. Navigate to Settings**
```
Dashboard → Settings (⚙️) → System Settings Tab
```

**2. Add a Custom Field**
```
Click [+ Add Field] button
Fill in:
- Name: "Priority Level"
- Type: Dropdown
- Options: Low, Medium, High, Urgent
- Section: Shipment
- Check "Required" if mandatory
Click [Add Field]
```

**3. Field Appears in List**
```
SHIPMENT Fields
├─ Priority Level (DROPDOWN) [Required]
│  Options: Low, Medium, High, Urgent
└─ [Delete Button]
```

**4. Delete if Needed**
```
Click delete (🗑️) button
Confirm deletion
Field is hidden (soft deleted)
```

### **For Future: Using in Forms**

When creating a shipment, the custom fields will automatically appear:

```
Create Shipment Form:
├─ Name: _____________
├─ Reference ID: _____
├─ Box Count: ________
│
└─ Custom Fields:
   ├─ Priority Level: [Dropdown: Low/Medium/High/Urgent] *Required
   └─ Insurance Value: [Number: ______] *Required
```

---

## 🐛 **TROUBLESHOOTING**

### **Problem: Field not showing up**
**Solution:**
- Check if `isActive = true` in database
- Verify correct `section` (SHIPMENT vs JOB vs EXPENSE)
- Check user's company ID matches field's company ID

### **Problem: Can't delete field**
**Solution:**
- Must be ADMIN role
- Check authentication token is valid
- Field is soft-deleted, data remains in database

### **Problem: Dropdown has no options**
**Solution:**
- Check `fieldOptions` in database is valid JSON
- Frontend should prevent saving dropdown without options
- Example fix: `["Option1","Option2"]`

---

## 📊 **DATABASE QUERIES (For Developers)**

### **Get all active fields for a company:**
```sql
SELECT * FROM custom_fields 
WHERE companyId = 'abc123' 
  AND isActive = true 
ORDER BY createdAt ASC;
```

### **Get fields for specific section:**
```sql
SELECT * FROM custom_fields 
WHERE companyId = 'abc123' 
  AND section = 'SHIPMENT' 
  AND isActive = true;
```

### **Count usage by type:**
```sql
SELECT fieldType, COUNT(*) as count 
FROM custom_fields 
WHERE companyId = 'abc123' AND isActive = true 
GROUP BY fieldType;
```

---

## ✅ **WHAT'S WORKING NOW**

- ✅ Create custom fields (all 5 types)
- ✅ View fields grouped by section
- ✅ Delete fields (soft delete)
- ✅ Validation (name uniqueness, dropdown options)
- ✅ Multi-tenant isolation
- ✅ Role-based access control
- ✅ JSON serialization for dropdown options

## 🔜 **COMING NEXT**

- ⏳ Edit existing fields
- ⏳ Field reordering (drag-and-drop)
- ⏳ Field templates (quick add common fields)
- ⏳ Use fields in Shipment/Job/Expense forms
- ⏳ Field validation rules (min/max, patterns)
- ⏳ Usage analytics dashboard

---

**Last Updated**: October 12, 2025
**Status**: ✅ Fully Functional
**Developer**: GitHub Copilot

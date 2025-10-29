# Company Profiles Setup Guide (DIOR, JAZEERA, etc.)

## Overview
This guide explains how to create and use Company Profiles (DIOR, JAZEERA, COMPANY_MATERIAL, etc.) in the WMS system to categorize racks and shipments.

---

## 1. WHERE TO CREATE COMPANY PROFILES

### Location in Settings
1. Go to **Settings** (gear icon in main menu)
2. Click on **"Company Profiles"** tab (NEW - appears after Company & Branding)
3. Click the **"New Profile"** button to create a new company profile

### Screenshot Path
- Menu: Settings → Company Profiles
- URL: `http://qgocargo.cloud/settings/company-profiles` (after routing)

---

## 2. HOW TO CREATE A COMPANY PROFILE

### Step-by-Step Process

#### A. Upload Company Logo
- Click on the logo upload area
- Select an image file (PNG, JPG, SVG - max 2MB)
- Recommended size: 200x200px
- Preview will appear instantly

#### B. Fill in Company Information
| Field | Required | Example | Description |
|-------|----------|---------|-------------|
| **Company Name** | YES ⭐ | DIOR | Unique name for company profile |
| **Description** | No | Luxury Fashion Brand | Brief description |
| **Contact Person** | No | Ahmed Al-Dossari | Contact person name |
| **Contact Phone** | No | +965 9999 8888 | Phone number |
| **Contract Status** | No | ACTIVE | ACTIVE, INACTIVE, EXPIRED, PENDING |
| **Active Status** | No | Toggle ON | Enable/disable profile |

#### C. Save Profile
- Review all information
- Click **"Create Profile"** button
- Wait for success message
- Profile will appear in the list below

---

## 3. AVAILABLE COMPANY PROFILES IN YOUR SYSTEM

### Examples Created (You Can Create More)
- **DIOR** - Luxury Fashion Brand
- **JAZEERA** - Shipping/Logistics Company
- **COMPANY_MATERIAL** - Material Supplier
- **BOODAI_TRADING** - Trading Company
- **ARAMCO** - Oil & Gas Company

Each profile can have:
- Unique logo
- Contact details
- Contract status
- Active/Inactive status

---

## 4. USE COMPANY PROFILES IN RACKS

### When Creating/Editing a Rack

#### Location
1. Go to **Warehouse** → **Racks**
2. Click **"Add New Rack"** or **Edit** existing rack
3. You'll see a new dropdown: **"Company Profile"**

#### How to Assign
- Open rack creation modal
- Select company profile from dropdown (e.g., "DIOR", "JAZEERA")
- The rack will show company logo and details
- This identifies WHICH COMPANY owns/uses this rack

#### Example
- Rack A1: DIOR (with DIOR logo)
- Rack A2: JAZEERA (with JAZEERA logo)
- Rack B1: COMPANY_MATERIAL (with material supplier logo)

---

## 5. USE COMPANY PROFILES IN SHIPMENT INTAKE

### When Creating Shipments

#### Location
1. Go to **Shipments** → **"Intake"** or **"New Shipment"**
2. You'll see a new dropdown: **"Company Profile"**

#### How to Select
- Select the customer/vendor company profile
- This identifies WHO sent the shipment (DIOR, JAZEERA, etc.)
- Shipment will be categorized under that company

#### Example Workflow
```
Shipment Intake:
├─ Company Profile: DIOR ← Select this
├─ Reference: DIOR-2025-001
├─ Box Count: 10
├─ Description: Winter Collection
└─ [Assign to Rack with DIOR profile]
```

---

## 6. VIEWING COMPANY PROFILE DETAILS

### In Company Profiles Settings Tab
- **Grid View**: Shows all profiles as cards
- Each card displays:
  - Company logo
  - Company name
  - Description
  - Contact person
  - Phone number
  - Contract status badge (green/red/yellow)
  - Active status indicator
  
### Actions Available
- **Edit** - Modify any information
- **Delete** - Remove profile (if not used in any racks)

---

## 7. EDITING A COMPANY PROFILE

### Steps
1. Go to **Settings** → **"Company Profiles"**
2. Find the profile in the list
3. Click **"Edit"** button
4. Modify any fields
5. Upload new logo if needed
6. Click **"Update Profile"**

---

## 8. DATABASE STRUCTURE

### Backend: What Gets Stored
```sql
Table: company_profiles
├── id (unique ID)
├── name (DIOR, JAZEERA, etc.)
├── description
├── logo (file path)
├── contactPerson
├── contactPhone
├── contractStatus (ACTIVE/INACTIVE/EXPIRED/PENDING)
├── isActive (true/false)
└── companyId (your warehouse company)
```

### Relations
- **Racks** can be assigned to company profiles
- **Shipments** can be linked to company profiles
- Multiple racks/shipments can share same company profile

---

## 9. API ENDPOINTS (For Developers)

### Base URL
`/api/company-profiles`

### Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List all profiles |
| GET | `/:profileId` | Get single profile |
| POST | `/` | Create new profile |
| PUT | `/:profileId` | Update profile |
| DELETE | `/:profileId` | Delete profile |

---

## 10. BEST PRACTICES

### ✅ DO
- Create one profile per customer/vendor/company
- Use unique, recognizable names (DIOR, JAZEERA, etc.)
- Upload company logos for easy visual identification
- Keep contact information up to date
- Mark inactive profiles as INACTIVE (don't delete)

### ❌ DON'T
- Create duplicate profiles with same name
- Delete profiles that are currently used in racks
- Upload very large images (stick to 2MB max)
- Use generic names like "Company1", "Company2"

---

## 11. TROUBLESHOOTING

### Profile not appearing in dropdown
- Ensure profile is marked as **ACTIVE**
- Refresh the page
- Check if company profile was created successfully

### Can't delete profile
- The profile is being used in existing racks
- Remove profile assignment from all racks first
- Then delete the profile

### Logo not showing
- Check file size (must be < 2MB)
- Verify file format (PNG, JPG, SVG)
- Try uploading a different image

---

## 12. WORKFLOW EXAMPLE: Complete Shipment Process

```
1. CREATE COMPANY PROFILE
   Settings → Company Profiles → New Profile
   Name: "DIOR"
   Logo: Upload dior_logo.png
   Contact: "Ahmed Al-Dossari, +965 98765432"
   Status: ACTIVE

2. CREATE RACKS FOR DIOR
   Warehouse → Racks → New Rack
   Code: "A1"
   Company Profile: "DIOR"
   Capacity: 100 units

3. CREATE SHIPMENT FROM DIOR
   Shipments → Intake → New Shipment
   Company Profile: "DIOR"
   Reference: "DIOR-2025-001"
   Boxes: 10
   Assign to Rack: "A1 (DIOR)"

4. TRACK SHIPMENT
   Dashboard shows:
   - 10 boxes from DIOR
   - Stored in Rack A1
   - DIOR logo and contact visible
```

---

## 13. NEXT STEPS

After setting up company profiles:

1. **Create all your customer/vendor profiles**
   - DIOR, JAZEERA, COMPANY_MATERIAL, etc.

2. **Organize racks by profile**
   - Assign existing/new racks to profiles
   - Makes warehouse organization clearer

3. **Link shipments to profiles**
   - All incoming shipments categorized by company
   - Easier to track and manage

4. **Generate reports by profile**
   - See which company uses how much storage
   - Track revenue per company profile

---

## 14. CONTACT & SUPPORT

If you need help:
- Check **Settings** → **Company Profiles** for full UI
- All changes save automatically
- API endpoints available at `/api/company-profiles`
- Backend: `backend/src/routes/companies.ts`
- Frontend: `frontend/src/pages/Settings/components/CompanyProfiles.tsx`

---

**Last Updated**: October 29, 2025
**Version**: 1.0 - Company Profiles System
**Status**: ✅ DEPLOYED TO STAGING

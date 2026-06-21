# WMS v2 Complete Feature Inventory
## Source: WMS-STAGING frontend at /root/WMS-STAGING/frontend/src/
## Generated: Full audit of every state variable, API call, UI element, and interaction flow

---

# 1. RACKS (pages/Racks/Racks.tsx + modals)

## 1.1 Page: Racks.tsx (1822 lines)

### State Variables (17)
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| selectedSection | string | 'all' | Filter by section (A, B, C) |
| selectedCategory | string | 'all' | Filter by category (DIOR, COMPANY_MATERIAL, JAZEERA, OTHERS) |
| selectedZone | string | 'all' | Zone filter |
| viewMode | 'zones' \| 'grid' | 'zones' | Toggle zone accordion vs grid view |
| expandedZones | Set<string> | new Set() | Track expanded zones in accordion |
| racks | any[] | [] | All racks data |
| loading | boolean | true | Loading state |
| createModalOpen | boolean | false | Create rack modal |
| editModalOpen | boolean | false | Edit rack modal |
| bulkAddModalOpen | boolean | false | Bulk add rack modal |
| bulkCbmModalOpen | boolean | false | Bulk CBM capacity modal |
| bulkCbmValue | string | '' | CBM value input |
| bulkCbmLoading | boolean | false | Bulk CBM update loading |
| selectedRack | any | null | Rack selected for edit |
| detailsModalOpen | boolean | false | Rack details modal |
| rackDetails | any | null | Full rack details |
| companyFilter | string \| null | null | Filter by company name in detail modal |
| loadingDetails | boolean | false | Details loading |
| bulkQrModalOpen | boolean | false | Bulk QR print modal |
| selectedRacks | Set<string> | new Set() | Selected rack IDs for QR printing |

### API Calls
| Endpoint | Method | When | Params |
|----------|--------|------|--------|
| racksAPI.getAll() | GET | useEffect on mount | - |
| racksAPI.getById(rack.id) | GET | Click rack card | rack.id |
| GET /api/company/branding | GET | handlePrintAllQR | - |
| POST /api/racks/bulk-cbm-capacity | POST | Bulk CBM submit | { applyToAll: true, cbmCapacity: number } |

### UI Elements
**Header Section:**
- Title "Racks" with subtitle
- View toggle buttons (zones icon, grid icon)

**Action Buttons:**
- Bulk QR button (purple, CameraIcon)
- Set CBM button (gradient purple-pink, CubeIcon)
- Bulk Add button (gradient blue-purple, SparklesIcon)
- Add Rack button (primary, PlusIcon)

**Stats Cards (4):**
- Total (CubeIcon, racks.length)
- Capacity (ChartBarIcon, sum capacityTotal)
- Occupied (green %, sum capacityUsed)
- Available (blue %, capacityTotal - capacityUsed)

**Filter Section:**
- Section filter: All, A, B, C (MapPinIcon label)
- Category filter: All, Dior, Company, Jazeera, Others (TagIcon label)
- Zone filter: All Zones, each zone with count + active count badge

**Zone View (accordion):**
- Zone header: zoneIcon, zone name, company badge, description, stats bar
- Stats per zone: totalRacks, availableRacks (green dot), occupied (blue dot), full (red dot), pallet/box capacities
- Utilization indicator: colored emoji, % number, bar, label (Critical/High/Healthy)
- Expand/collapse chevron
- Rack cards within zone: company logo badge, edit button, status dot, rack code, location, progress bar, capacity info, shipment count, CBM progress bar

**Grid View:**
- Legend: 0-50% (green), 50-90% (yellow), 90-100% (red)
- Rack cards: colored border by utilization, company logo badge, status badge (FULL/BUSY/PARTIAL/EMPTY/MAINT/status), rack code, location, capacity mode badge, progress bar, shipment count, CBM usage bar

**Rack Details Modal:**
- Header with rack code + location
- Stats grid: Status, Pallet Capacity, Available, CBM Used, Utilization %
- Company/category profile info with logo, contact details
- Dimensions display (L×W×H)
- "Stored Shipments" section with grouped-by-pallet display
- ShipmentBoxCard sub-component (see below)
- Company filter button
- Footer with "Click on shipment for details"

**ShipmentBoxCard (inline component):**
- Props: shipment, boxCount, photos[], assignedDate, onViewShipment
- Shows: referenceId, status badge, client info (amber box), boxes count, CBM, days in rack, arrival date
- Collapsible photo grid (up to 4 per row)
- Clicking navigates to /shipment-report/{id}

**Bulk QR Modal:**
- Selection controls: Select All, Deselect All
- Rack grid with checkbox/selected state
- Canvas elements for each QR code
- Print Selected button
- Company logo display on print

**Bulk CBM Modal:**
- Input for CBM capacity value
- Summary showing how many racks affected
- Cancel and "Apply to All Racks" buttons

### Data Transformations
- resolveLogoUrl: adds cache-busting ?t= query param
- getUtilizationColor: >=90% red, >=75% yellow, else green
- racksByZone: groups racks into zone buckets
- uniqueZones: deduplicated sorted zones
- renderCapacity: handles FIXED, FLEXIBLE, UNLIMITED modes
- CBM percentage calculation
- Utilization percentage: Math.round((capacityUsed/capacityTotal)*100)
- Pallet/box total calculations per zone
- QR canvas generation via qrcode library

---

## 1.2 CreateRackModal (669 lines)

### Props
```typescript
interface CreateRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

### State Variables
| Variable | Type | Default |
|----------|------|---------|
| loading | boolean | false |
| categories | Category[] | [] |
| existingZones | Array<{zone, zoneIcon, zoneDescription}> | [] |
| formData | object | see below |
| qrCodeUrl | string | '' |
| error | string | '' |
| success | string | '' |
| selectedCategoryInfo | Category \| null | null |
| showIconPicker | boolean | false |
| useExistingZone | boolean | false |

### Form Fields
- **Zone Number** (text, required) - numeric zone ID
- **Zone Icon** (button -> IconPickerModal)
- **Zone Description** (textarea)
- **Quick Select Existing Zone** (select dropdown) - optional
- **Company Profile** (select) - from companiesAPI.listProfiles()
- **Rack Code** (text, required, uppercase) - auto-generates QR
- **Location** (auto-generated, read-only) - "Zone {zone}, Rack {code}"
- **Rack Type** (select): STORAGE, MATERIALS, EQUIPMENT
- **Total Capacity** (number, required)
- **Status** (select): ACTIVE, MAINTENANCE, RESERVED
- **Dimensions** (4 fields): Length, Width, Height, Unit (METERS/FEET)
- **QR Code Preview** (image, conditional) + Download button

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| companiesAPI.listProfiles() | GET | Modal open |
| racksAPI.getAll() | GET | Load existing zones |
| racksAPI.create(dataToSubmit) | POST | Form submit |

### UI Elements
- Modal overlay with purple header
- Error/success messages
- Zone Configuration section (blue bg)
- Rack Code & Settings section
- Dimensions section (L×W×H with unit picker)
- QR preview with download
- Cancel + Create Rack buttons
- IconPickerModal sub-component

---

## 1.3 EditRackModal (730 lines)

### Props
```typescript
interface EditRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rack: any;
}
```

### State Variables
Same as CreateRackModal plus pre-populated form from rack data.

### Additional Elements vs Create
- **Current Usage Info** bar showing capacityUsed/capacityTotal
- **Zone Selector** with "Keep Current Zone" option
- **CBM Capacity** individual field
- Capacity validation: cannot reduce below current usage
- Calls racksAPI.update(rack.id, dataToSubmit) on submit

### Key Differences
- formData pre-populated from rack prop
- QR code generated for existing code
- CBM capacity field in purple section
- "Update Rack" submit button

---

## 1.4 BulkAddRackModal (648 lines)

### Props
```typescript
interface BulkAddRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

### Form Fields (Unique to Bulk)
- **Zone Number** (required)
- **Zone Icon** (button -> IconPickerModal)
- **Zone Description** (textarea)
- **Company Profile** (select)
- **Prefix** (text, required) - e.g., "1" creates 1A, 1B...
- **Start Letter** (number, 1=A) - range 1-26
- **End Letter** (number) - range start-26
- **Location Template** (text) - use {n} placeholder
- **Capacity Mode** (3 buttons): Fixed, Flexible, Unlimited
  - Fixed: Total Capacity input
  - Flexible: Max Pallets + OR Max Boxes
  - Unlimited: Notes textarea
- **Rack Type** (STORAGE/MATERIALS/EQUIPMENT)

### Auto-generated per rack
- `${prefix}${letter}` code, location template with {n}, zone assignment

### Data Transformation
- numberToLetter(num): 1=A, 2=B... 26=Z
- getPreviewRacks(): previews up to 5 racks
- getTotalCount(): endNumber - startNumber + 1
- Capacity mode data shaping for each rack

### UI Elements
- Preview chips showing generated rack codes
- Total count badge
- Cancel + Create N Racks button

---

## 1.5 RackMapModal (561 lines)

### Props
```typescript
interface RackMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRack: (rackId: string, rackCode: string) => void;
  selectedRackId?: string;
}
```

### State Variables
- racks, loading (from racksAPI.getAll())
- filter: 'all' | 'available' | 'full'
- selectedSection: 'all' | A/B/C...
- selectedRackDetails: Rack | null
- loadingDetails: boolean

### UI Elements
- Header: "Warehouse Rack Map" gradient
- Section filter buttons (All, A, B, C... from code prefixes)
- Availability filter: All, Available, Full
- Color-coded legend
- Rack grid cards: code, status badge, location, capacity bar, utilization %, available/taken spaces
- Rack Details Sidebar (slide-in from right): status, capacity, utilization bar, stored shipments with photo gallery
- Footer with cancel + "Select This Rack" button

### API Calls
- racksAPI.getAll()
- racksAPI.getById(rack.id)

---

## 1.6 DimensionRackManager (310 lines)

### Props
```typescript
interface DimensionRackManagerProps {
  shipmentId: string;
  onUpdate?: () => void;
}
```

### State Variables
- dimensions: Dimension[]
- summary: any (pending, assigned, released counts)
- racks: Rack[] (ACTIVE only)
- selectedDimensions: string[] (multi-select)
- selectedRack: string
- assigning, error, success

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| shipmentsAPI.getDimensionsStatus(shipmentId) | GET | mount |
| racksAPI.getAll({ status: 'ACTIVE' }) | GET | mount |
| shipmentsAPI.bulkAssignDimensions(shipmentId, dimIds, rackId) | POST | assign |
| shipmentsAPI.releaseDimension(shipmentId, dimensionId) | POST | release |

### UI Elements
- Summary badges: Pending, Assigned, Released
- Stats: Total CBM, Assigned CBM, Released CBM
- Assignment controls: Select All/Deselect All, Rack dropdown, Assign button
- Dimension items: checkbox, item icon (by type), label, dimensions, CBM, status badge, rack info, Release button
- Item types: PALLET 🚛, BOX 📦, CRATE 🪵, CARTON 📫, LOOSE 🎁, OTHER 📋

---

# 2. SCANNER (pages/Scanner/Scanner.tsx, 4015 lines)

## 2.1 Scanner Page

### State Variables (36)
| Variable | Type | Default |
|----------|------|---------|
| scanning | boolean | false |
| scanResult | ScanResult \| null | null |
| error | string | '' |
| loading | boolean | false |
| scanHistory | ScanResult[] | [] |
| pendingShipment | any | null |
| boxQuantity | number | 0 |
| remainingBoxes | number | 0 |
| activeTab | 'scanner' \| 'list' | 'scanner' |
| allShipments | any[] | [] |
| filteredShipments | any[] | [] |
| racks | any[] | [] |
| selectedShipmentForRack | any | null |
| showRackSelection | boolean | false |
| showAssignmentModal | boolean | false |
| selectedRackForAssignment | any | null |
| palletQuantity | number | 0 |
| looseBoxQuantity | number | 0 |
| assignmentPhotos | File[] | [] |
| uploadingPhotos | boolean | false |
| uploadProgress | {current, total, size} \| null | null |
| showShipmentDetails | boolean | false |
| selectedShipmentForDetails | any | null |
| showMoveModal | boolean | false |
| moveShipmentData | any | null |
| moveDestinationRack | string | '' |
| moveDestinationRackCode | string | '' |
| scanningForDestination | boolean | false |
| moveReason | string | '' |
| moveAuthorizedBy | string | '' |
| moveNotes | string | '' |
| movePhotos | File[] | [] |
| movingInProgress | boolean | false |
| authorizedUsers | any[] | [] |
| showMoveHistory | boolean | false |
| moveHistory | any[] | [] |
| loadingMoveHistory | boolean | false |
| showManualMoveModal | boolean | false |
| inStorageShipments | any[] | [] |
| selectedManualShipment | string | '' |
| selectedSourceRack | string | '' |
| loadingInStorageShipments | boolean | false |
| palletsToMove | number | 0 |
| looseBoxesToMove | number | 0 |
| manualCode | string | '' |

### Types
```typescript
type ScanType = 'rack' | 'shipment' | 'unknown';
interface ScanResult {
  type: ScanType;
  data: any;
  rawCode: string;
}
```

### API Calls (all raw fetch)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| GET /api/users/authorized | GET | Authorized users list |
| GET /api/shipments/{id}/move-history | GET | Move history |
| POST /api/shipments/upload/photo | POST | Upload photo |
| POST /api/shipments/{id}/move-boxes | POST | Move boxes |
| GET /api/shipments?status=IN_STORAGE&status=IN_WAREHOUSE | GET | In-storage shipments |
| GET /api/shipments/{id}/boxes | GET | Shipment boxes |
| POST /api/shipments/{id}/assign-rack | POST | Assign to rack |
| GET /api/shipments (all) | GET | All shipments |
| GET /api/shipments/{id}/dimensions | GET | Dimensions |
| GET /api/racks | GET | All racks |
| racksAPI.getAll({ search: code }) | GET | Search racks |
| shipmentsAPI.getAll({ search: code }) | GET | Search shipments |
| GET /api/shipments/{id} | GET | Direct shipment lookup |

### Scanner Flow
1. **Tab 1: Scanner (📸)**
   - Start Camera → Html5Qrcode with environment facingMode
   - HTTPS check with redirect button
   - Camera test with 3 configs (degrading)
   - Scanning UI with QR reader element
   - Stop Camera button
   - Scan result processing:
     - **Rack scanned**: Show rack info, capacity, CBM. If pendingShipment exists, show assignment controls
     - **Shipment scanned**: Show client, reference, remaining boxes. Alert if already stored. Offer "Scan Rack Now" button
     - **Unknown**: Yellow error box
   - Scan history sidebar (last 10)

2. **Tab 2: Pending List (📋)**
   - Loads PENDING + PARTIAL shipments
   - Shows per shipment: referenceId, status badge (PARTIAL/PENDING), availablePallets, looseBoxes, CBM
   - "Choose Rack" button → inline rack selection grid
   - Selecting rack → Assignment Modal

3. **Move Tab (🔄)**
   - Opens Manual Move Modal

### Assignment Modal (showAssignmentModal)
- Rack info: code, location, capacity, CBM
- Shipment info: referenceId, client
- Available: pallets + loose boxes breakdown
- Pallet quantity stepper (-/+/All)
- Loose box quantity stepper (-/+/All)
- Total summary with CBM calculation
- Photo upload (max 10, with preview)
- Cancel + Confirm buttons

### Move Modal Features
- Source rack display
- Destination selection: QR scan or dropdown
- Reason selection (8 options)
- Authorized by user selection
- Notes textarea
- Photo upload
- Move history timeline

### Manual Move Modal
- Shipment dropdown (IN_STORAGE/IN_WAREHOUSE)
- Source rack from rackGroups
- Pallet/loose breakdown with quantity steppers
- Destination rack grid (filtered, colored by capacity)
- Reason + authorized by + notes + photos

### Data Transformations
- getPalletBoxCount: sorts palletDetails, sums boxCounts
- processScanCode: priority-based QR matching (RACK_, PALLET_, SHIPMENT_, -BOX, reference fallback)
- validateAndReturnShipment: filters unassigned boxes, groups by palletNumber from pieceQR
- compressPhoto: compresses before upload
- PieceQR pallet number extraction
- CBM capacity validation

### Sound Alerts
- useSoundAlerts hook: playSuccessSound, playErrorSound, playWarningSound

---

# 3. MOVING JOBS

## 3.1 Page: MovingJobs.tsx (561 lines)

### State Variables
| Variable | Type | Default |
|----------|------|---------|
| filterStatus | string | 'all' |
| jobs | any[] | [] |
| loading | boolean | true |
| createModalOpen | boolean | false |
| editModalOpen | boolean | false |
| detailsModalOpen | boolean | false |
| reportModalOpen | boolean | false |
| returnModalOpen | boolean | false |
| fileManagerOpen | boolean | false |
| selectedJob | any | null |

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| jobsAPI.getAll(params) | GET | On mount + filter change |
| jobsAPI.delete(job.id) | DELETE | Delete button |

### UI Elements
**Header:** Title "Moving Jobs", "New Job" button

**Stats Grid (4):** Total Jobs, Active (IN_PROGRESS), Scheduled (SCHEDULED/PLANNED), Completed

**Filters:** all, scheduled, inprogress, completed (pill buttons)

**Status Badge Mapping:**
- SCHEDULED: blue
- PLANNED: purple
- IN_PROGRESS: amber
- DISPATCHED: indigo
- PENDING_APPROVAL: yellow
- COMPLETED: green
- CANCELLED: red

**Job Cards:**
- Delete button (absolute top right)
- Title + jobCode + status badge
- Rejection alert: red box with parsed JSON decisionNotes showing material verifications (CORRECT/ISSUE)
- Approval info: green box for approved
- Client: UserGroupIcon, name, phone
- Date: CalendarIcon
- Route: MapPinIcon, from→to with ArrowRightIcon
- Physical Reports preview: DocumentTextIcon links
- Footer actions: View, Edit, Files, Report, Return/Resubmit buttons
- Full-width button: "Return Materials & Record" or "RESUBMIT FOR APPROVAL"

### Data Transformations
- getStatusBadge: CSS classes per status
- filterStatus → statusMap: scheduled→SCHEDULED,PLANNED, etc.
- decisionNotes JSON parsing: verifications with material-level CORRECT/ISSUE status
- physicalReports: extract from materialReturns

---

## 3.2 JobDetailsModal (201 lines)

### Props
```typescript
interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onUpdate?: () => void;
}
```

### Tabs
1. **Job Details**: Client info (name, phone, email), Job info (status, date, driver, vehicle), Addresses (pickup, dropoff), Notes
2. **Materials**: Renders `<JobMaterialsManager jobId={job.id} jobStatus={job.status} onUpdate={onUpdate} />`
3. **Staff Assignment**: Title + "Assign Staff to Job" button → opens `<StaffAssignmentDialog>`

---

## 3.3 JobFileManager (287 lines)

### Props
```typescript
interface JobFileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}
```

### State
- files: JobFile[], loading, uploading, dragActive

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/job-files/{jobId} | GET | Open |
| POST /api/job-files/upload | POST | Upload |
| DELETE /api/job-files/{fileId} | DELETE | Delete |

### UI Elements
- Drag-and-drop upload zone (purple border)
- File type filter: .pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx
- File list: icon (by mime type), name, size, date, uploader
- Actions per file: View, Download, Delete
- Upload progress (implicit)
- File icons: image 🖼️, pdf 📄, word 📝, excel 📊, other 📎
- formatFileSize utility

---

## 3.4 JobMaterialReport (334 lines)

### Props
```typescript
interface JobMaterialReportProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}
```

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/moving-jobs/{jobId} | GET | Open |
| GET /api/materials/job-materials/{jobId} | GET | Open |

### UI Elements
- Print-optimized report layout
- Job header: code, title, client, date, status
- Summary cards (5): Total Issued, Total Used, Returned Good, Damaged, Total Cost (KWD)
- Materials table: SKU, Name, Issued, Used, Returned, Damaged, Unit Cost, Total Cost, Status
- Totals footer row
- Damage Details section: material name, damaged qty, reason, photo gallery
- Action buttons: Print, CSV Download
- CSV generation: includes full material data + totals

### Data Transformations
- calculateTotals(): sum of issued, used, returned good, damaged, totalCost
- CSV builder with proper quoting
- Damage photo URLs parsing

---

## 3.5 JobMaterialsManager (1197 lines)

### Props
```typescript
interface JobMaterialsManagerProps {
  jobId: string;
  jobStatus: string;
  onUpdate?: () => void;
}
```

### State Variables (extensive)
| Variable | Type | Default |
|----------|------|---------|
| activeTab | 'issued' \| 'return' | 'issued' |
| materials | Material[] | [] |
| racks | Rack[] | [] |
| stockPurchases | any[] | [] |
| issuedMaterials | IssuedMaterial[] | [] |
| showIssueForm | boolean | false |
| issueForm | {materialId, quantity, rackId, stockPurchaseId, notes} | defaults |
| showEditForm | boolean | false |
| editingIssue | IssuedMaterial \| null | null |
| editForm | {quantity, notes, reason} | defaults |
| showDeleteConfirm | boolean | false |
| deletingIssue | IssuedMaterial \| null | null |
| deleteReason | string | '' |
| showReturnForm | boolean | false |
| selectedIssue | IssuedMaterial \| null | null |
| returnForm | {issueId, quantityUsed, quantityGood, quantityDamaged, damageReason, notes, photos[], generateQR} | defaults |
| showEditReturnForm | boolean | false |
| editingReturn | any \| null | null |
| editReturnForm | {quantityGood, quantityDamaged, notes} | defaults |
| physicalReportFile | File \| null | null |
| physicalReportPreview | string \| null | null |
| loading | boolean | false |

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/materials | GET | load |
| GET /api/materials/purchase-orders | GET | load |
| GET /api/materials/available-racks | GET | load |
| GET /api/materials/job-materials/{jobId} | GET | load |
| POST /api/materials/issues | POST | Issue material |
| PUT /api/materials/issues/{issueId} | PUT | Edit issue |
| DELETE /api/materials/issues/{issueId} | DELETE | Delete issue (body: {reason}) |
| POST /api/materials/returns | POST | Return material (multipart) |
| PUT /api/materials/returns/{returnId} | PUT | Edit return |
| DELETE /api/materials/returns/{returnId} | DELETE | Delete return |

### Tabs
1. **Issued Tab**: List of issued materials with rack info, costs, return status
   - Header: Total Cost + Pending Returns count
   - "Issue Material" button → form with material select, quantity, rack, notes
   - Edit + Delete buttons per material
   - Edit form: quantity, notes, reason
   - Delete confirmation: reason required
2. **Return Tab**: Return form for selected issue
   - Form: quantityUsed, quantityGood, quantityDamaged, damageReason, notes
   - Photo upload (multiple) with preview and remove
   - Physical Report upload (PDF/image) with preview
   - generateQR checkbox

### UI Elements
- Cost/totals header
- Tab navigation
- Issue form modal
- Edit form modal
- Delete confirmation modal
- Return form with photo gallery
- Physical report file upload
- Damage photo upload
- Status badges per material

---

## 3.6 JobReportsDashboard (258 lines)

### State
- report: ProfitabilityReport | null
- snapshots: CostSnapshot[]
- activeTab: 'summary' | 'details' | 'costs'
- loading: boolean

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/reports/profitability | GET | mount |
| GET /api/reports/material-costs | GET | mount |

### Tabs
1. **Profitability Summary**: Revenue, Costs, Profit (color-coded), Avg Profit Margin, Jobs Tracked
2. **Cost Breakdown**: Materials, Labor, Damage, Other with % of total
3. **Material Costs**: Table per material: material name, SKU, quantity, total cost, job code

### Data Transformations
- formatCurrency: "XX.XXX KWD"
- Percentage calculations per cost category

---

## 3.7 MaterialsManager (391 lines) - Legacy

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/materials | GET | mount |
| POST /api/materials | POST | Add material |
| GET /api/materials/issues | GET | mount |
| POST /api/materials/issues | POST | Issue material |

### Tabs
1. **Materials Catalog**: Table (SKU, Name, Category, Unit, Min Stock) + Add form
2. **Material Issues**: Form with material select, quantity, issue type (JOB/INTERNAL/MAINTENANCE/OTHER), Job ID/Reference; Table
3. **Material Returns & Damage**: Placeholder

---

## 3.8 MonthlyJobsReport (191 lines)

### Props
```typescript
interface MonthlyReportProps {
  jobs: any[];
}
```

### State
- selectedMonth: string (YYYY-MM, defaults to current month)

### UI Elements
- Month picker input
- Download CSV button
- Stats cards: Total Jobs, Completed, In Progress, Revenue (KWD)
- Jobs table: Job Code, Client, Date, Status badge, Revenue
- CSV export: summary + details

### Data Transformations
- filterJobsByMonth(): filters jobs array by selected month
- calculateMonthlyStats(): totals by status, revenue sum
- CSV: month header, summary rows, detail rows

---

## 3.9 MovingJobsManager (285 lines) - Legacy

### State
- jobs: MovingJob[], loading, showForm, formData

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/moving-jobs | GET | mount |
| POST /api/moving-jobs | POST | Create job |

### UI Elements
- Simple form: jobCode, jobTitle, clientName, clientPhone, clientEmail, jobDate, jobAddress, dropoffAddress, notes
- Status table with color badges per status

---

## 3.10 ApprovalManager (673 lines)

### Types
```typescript
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface MaterialApproval {
  id: string; jobId: string; approvalType: string; status: ApprovalStatus;
  requestedAt: string; requestedBy?: ApprovalUser | null;
  decidedAt?: string | null; decisionBy?: ApprovalUser | null;
  decisionNotes?: string | null; notifyEmails?: string | null;
  reminderCount?: number; lastReminderAt?: string | null;
  job?: ApprovalJob | null;
}
```

### State Variables
- approvals: MaterialApproval[]
- filteredApprovals: MaterialApproval[]
- statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' (default: PENDING)
- typeFilter: 'ALL' | string (default: ALL)
- selectedApproval, selectedDetail, decisionNotes
- verifications: Record<string, { status: 'CORRECT' | 'ISSUE' | null; remarks: string }>
- expandedImage: string | null
- loading: boolean

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/materials/approvals | GET | mount |
| GET /api/materials/approvals/{approvalId} | GET | Select approval |
| PATCH /api/materials/approvals/{approvalId} | PATCH | Approve/reject |

### Approval Types
- DAMAGE, PREMIUM_MATERIAL, QUANTITY_VARIATION, RETURN, STOCK_IN, JOB_COMPLETION_REPORT

### UI Elements
- Filter: status select + type select
- Approval cards: status-colored left border, job info, type badge, status badge, request details, reminders count
- "Review & Decide" button for PENDING
- Decision Modal: physical reports (image grid / PDF / expanded view), material data, totals
- Approve/Reject buttons with verification checklist
- Notes textarea for decision

---

## 3.11 PluginSystemManager (449 lines)

### State
- plugins: SystemPlugin[]
- logs: SystemPluginLog[]
- activeTab: 'plugins' | 'install' | 'logs'
- loading, selectedPluginId
- formData: {name, version, description}

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/plugins | GET | mount |
| GET /api/plugins/{id}/logs | GET | View logs |
| POST /api/plugins | POST | Install |
| PATCH /api/plugins/{id}/activate | PATCH | Enable |
| PATCH /api/plugins/{id}/deactivate | PATCH | Disable |
| DELETE /api/plugins/{id} | DELETE | Uninstall |

### UI Elements
- Plugin cards: name, version, install date, status badge, action buttons (Enable/Disable, View Logs, Uninstall)
- Install form: name, version, description
- Audit Logs table: timestamp, action (color-coded), performed by, details

---

# 4. MATERIALS

## 4.1 MaterialsDashboard (912 lines)

### State Variables
- activeTab: 'overview' | 'inventory' | 'issues' | 'purchases'
- materials: Material[] | []
- issues: MaterialIssue[] | []
- purchases: StockPurchase[] | []
- stats: DashboardStats { totalMaterials, lowStockCount, inventoryValue, recentIssues }
- searchTerm, categoryFilter, stockFilter (all/adequate/low/out)
- categories: string[], vendors: string[]
- showIssueForm, showPurchaseForm
- issueForm: {materialId, quantity, issueType, jobId, reference, notes}
- purchaseForm: {invoiceNumber, vendorName, materialId, quantity, unitCost, purchaseDate, notes}
- loading: boolean

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/materials | GET | mount |
| GET /api/materials/issues | GET | mount |
| GET /api/materials/stock/unified | GET | mount |
| POST /api/materials/issues | POST | Create issue |
| POST /api/materials/stock | POST | Create purchase |

### UI Elements
**Header:** Title + subtitle

**Dashboard Stats (4 cards with left border color + icon):**
- Total Materials (blue, Package icon)
- Low Stock Alerts (orange, AlertTriangle icon)
- Inventory Value (green, TrendingUp icon)
- Issues 30 Days (purple, Clock icon)

**Tab Navigation:** Overview, Inventory (count), Material Issues (count), Stock Purchases (count)

**Overview Tab:**
- Quick Stats: Active Materials, Out of Stock
- Recent Issues (last 5)

**Inventory Tab:**
- Filters: Search (name/SKU), Category filter, Stock filter (All/Adequate/Low/Out)
- Materials table: SKU, Name, Category, Stock (unit), Min Level, Status badge (Adequate/Low/Out), Value

**Issues Tab:**
- "Create Material Issue" button with expandable form
- Form: Material select, Quantity, Issue Type (radio: JOB/INTERNAL/MAINTENANCE), Job ID or Reference, Notes
- Issues table: Material, Type badge, Reference, Quantity, Total Cost, Date

**Stock Purchases Tab:**
- "Add Stock Purchase" button with expandable form
- Form: Invoice/Reference Number, Vendor Name, Material select, Quantity, Unit Cost, Notes
- Green info box: "Direct Entry - no approval needed"
- Purchases table: Batch #, Material, Vendor, Purchased (+N), Remaining, Unit Cost, Total, Status, Date

### Data Transformations
- getStockStatus(material): 'adequate' if qty > min, 'low' if qty <= min, 'out' if qty === 0
- Low stock count: materials.filter(m => m.totalQuantity <= m.minStockLevel).length
- Inventory value: sum of (totalQuantity * unitCost)
- 30-day issues filter
- Category extraction from materialCategory?.name
- Unified stock data transformation

---

## 4.2 MaterialsHub (44 lines)

### State
- view: 'dashboard' | 'management'

### Toggle Buttons
- Dashboard (LayoutGrid icon)
- Add/Manage Materials (Settings icon)

### Content
- view === 'dashboard' → MaterialsDashboard
- view === 'management' → MaterialsManagement

---

## 4.3 MaterialsManagement (1103 lines)

### State Variables (extensive CRUD)
- activeTab: 'categories' | 'materials' | 'stock'
- categories: MaterialCategory[] (hierarchical)
- materials: Material[]
- stockPurchases: StockPurchase[]
- loading, searchTerm, userRole
- historyModalOpen, selectedMaterial
- showCategoryForm, editingCategoryId
- categoryForm: {name, parentId, description}
- showMaterialForm, editingMaterialId
- materialForm: {sku, name, description, categoryId, unit, minStockLevel, unitCost, sellingPrice, isActive}
- showStockForm
- stockForm: {orderNumber, invoiceNumber, vendorName, materialId, quantity, unitCost, orderDate, receivedDate, status, notes}

### API Calls (extensive CRUD)
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/materials/categories | GET | mount |
| GET /api/materials | GET | mount |
| GET /api/materials/stock/unified | GET | stock tab |
| POST/PUT /api/materials/categories[/:id] | POST/PUT | Save category |
| DELETE /api/materials/categories/:id | DELETE | Delete category |
| POST/PUT /api/materials[/:id] | POST/PUT | Save material |
| DELETE /api/materials/:id | DELETE | Delete material |
| POST /api/materials/purchase-orders | POST | Add stock |

### Tabs
1. **Categories Tab:**
   - Hierarchical tree view (indented, collapsible)
   - Each node: FolderTree icon, name, description, material count
   - Edit + Delete (admin only, only if 0 materials) buttons
   - Add Category form: name, parent category, description

2. **Materials Tab:**
   - Search input + Add Material button
   - Add/Edit form: SKU, name, description, category, unit (PCS/ROLL/BOX/KG/METER), minStockLevel, unitCost, sellingPrice
   - Materials table: SKU, Name, Category, Stock (red if low), Unit, Status (Active/Inactive), Actions (History, Edit, Delete)
   - Role-based delete (ADMIN only, only if 0 stock)

3. **Stock Tab:**
   - Add Stock form: PO number, Invoice number, vendor, material, quantity, unitCost, order date, received date, status (PENDING/APPROVED/ORDERED/RECEIVED/CANCELLED), notes
   - Stock table: Source badge (Batch/PO), Order #, Vendor, Material, Quantity, Unit Cost, Total Cost, Status, Date

### MaterialTransactionHistory Modal
- Props: isOpen, onClose, materialId, materialName
- Shows full transaction history for a material

---

## 4.4 MaterialReports (1122 lines)

### Types
- Material: id, sku, name, category, unit, unitCost, currentStock, minStockLevel
- Transaction: id, date, type (PURCHASE/ISSUE/RETURN/DAMAGE), description, reference, stockIn, stockOut, balance
- MaterialStatement: material, transactions[], totals
- Summary: totalMaterials, totals by category, totalValue

### State Variables
- loading, statements: MaterialStatement[], summary: Summary | null
- expandedMaterials: Set<string>
- viewMode: 'summary' | 'detailed'
- activeTab: 'statement' | 'history'
- issueHistory: IssueHistoryItem[]
- historyLoading: boolean
- dateRange: {start, end} (default: last 3 months)
- selectedMaterial: string (filter)

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/materials/reports/material-statement | GET | Load statement (with date range, optional materialId) |
| GET /api/materials/issues/history | GET | Load issue history (with date range) |

### UI Elements
**Header:** "Material Stock Statement" title + export buttons (PDF, Print, CSV)

**Filters:** From Date, To Date, Material selector, Load button, View toggle (Summary/Detailed)

**Tabs:** Stock Statement, Edit/Delete History

**Summary View:**
- Professional print layout with logo, company info, period
- Table: Material (linked), SKU, Unit, Current Stock, +Purchased, -Consumed, +Returned, -Damaged, Unit Price, Total Value, Actions
- Totals footer row
- Color-coded columns (blue/green/purple/red backgrounds)
- Legend: 4 colored dots explaining each movement type

**Detailed View:**
- Expandable material panels
- Each panel: name, SKU, category, unit
- Quick stats: Opening, Purchased, Consumed, Returned, Damaged, Closing balance
- Transactions table: Date, Type (colored badge), Details/Job, IN, OUT, Balance
- Links to moving jobs
- Opening balance row + Closing balance footer

**History Tab:**
- Purple gradient header
- Issue history table: Date/Time, Action badge (CREATED green, EDITED yellow, DELETED red), Material, Quantity (with old→new for edits), Cost, Reason, By

### Export Functions
- **CSV export**: material-level + totals
- **PDF export** (jsPDF + autoTable): professional landscape layout, blue header, themed column colors, page numbers
- **Print**: @media print styles with A4 landscape, logo header, styled tables, colored backgrounds

---

# 5. CUSTOMER MATERIALS (pages/CustomerMaterials.tsx, 401 lines)

### State Variables
- customers: Customer[]
- loading, error, searchTerm
- categoryFilter: 'all' | 'CUSTOMER_STORAGE' | 'AIRPORT_CARGO' | 'WAREHOUSE_STOCK'
- selectedCustomer: Customer | null
- stats: {totalCustomers, totalBoxes, totalShipments, categoryBreakdown}

### API Calls
| Endpoint | Method | When |
|----------|--------|------|
| GET /api/customers/materials?search=&category= | GET | mount + filter |
| GET /api/customers/stats | GET | mount |

### UI Elements
**Header:** Title "Customer Materials" + "Back to Shipments" link

**Stats Cards (4, gradient backgrounds):**
- Total Customers (blue)
- Total Boxes (green)
- Total Shipments (purple)
- Categories (orange)

**Filters:** Search input, Category select (3 types), Search button

**Customer Cards:**
- Name, category badges (colored by type)
- Shipper/Consignee info
- Stats grid: Shipments, Total Boxes, In Storage, Released, Locations
- Items Breakdown: gradient cards per category with qty, weight, value, item names (truncated)
- Locations: pill badges
- "View Details" toggle button
- Expanded: Shipment list with ref, boxCount, date, AWB, status badge, "View" link

### Category Icons & Colors
- CUSTOMER_STORAGE: 📦 blue
- AIRPORT_CARGO: ✈️ purple
- WAREHOUSE_STOCK: 🏭 green

---

# SUMMARY OF ALL API ENDPOINTS

## Racks
- `racksAPI.getAll()` - GET /api/racks
- `racksAPI.getById(id)` - GET /api/racks/:id
- `racksAPI.create(data)` - POST /api/racks
- `racksAPI.update(id, data)` - PUT /api/racks/:id
- POST /api/racks/bulk-cbm-capacity
- GET /api/company/branding

## Scanner
- GET /api/users/authorized
- GET /api/shipments/:id/move-history
- POST /api/shipments/upload/photo
- POST /api/shipments/:id/move-boxes
- GET /api/shipments
- GET /api/shipments/:id/boxes
- GET /api/shipments/:id/dimensions
- POST /api/shipments/:id/assign-rack
- GET /api/racks (with search param)
- `shipmentsAPI.getAll({ search })`

## Moving Jobs
- `jobsAPI.getAll(params)` - GET /api/moving-jobs
- `jobsAPI.delete(id)` - DELETE /api/moving-jobs/:id
- GET /api/moving-jobs/:id
- POST /api/moving-jobs
- GET /api/job-files/:jobId
- POST /api/job-files/upload
- DELETE /api/job-files/:fileId
- GET /api/materials/job-materials/:jobId
- POST /api/materials/issues
- PUT /api/materials/issues/:id
- DELETE /api/materials/issues/:id
- POST /api/materials/returns
- PUT /api/materials/returns/:id
- DELETE /api/materials/returns/:id
- GET /api/materials/available-racks
- GET /api/materials/purchase-orders
- GET /api/reports/profitability
- GET /api/reports/material-costs
- GET /api/materials/approvals
- GET /api/materials/approvals/:id
- PATCH /api/materials/approvals/:id
- GET /api/plugins
- GET /api/plugins/:id/logs
- POST /api/plugins
- PATCH /api/plugins/:id/activate
- PATCH /api/plugins/:id/deactivate
- DELETE /api/plugins/:id

## Materials
- GET /api/materials
- POST /api/materials
- PUT /api/materials/:id
- DELETE /api/materials/:id
- GET /api/materials/categories
- POST /api/materials/categories
- PUT /api/materials/categories/:id
- DELETE /api/materials/categories/:id
- GET /api/materials/issues
- POST /api/materials/issues
- GET /api/materials/stock/unified
- POST /api/materials/stock
- POST /api/materials/purchase-orders
- GET /api/materials/reports/material-statement
- GET /api/materials/issues/history

## Customer Materials
- GET /api/customers/materials
- GET /api/customers/stats

---

# ALL SUB-COMPONENTS REFERENCED

| Component | Source File | Used By |
|-----------|-------------|---------|
| CreateRackModal | components/CreateRackModal.tsx | Racks.tsx |
| EditRackModal | components/EditRackModal.tsx | Racks.tsx |
| BulkAddRackModal | components/BulkAddRackModal.tsx | Racks.tsx |
| RackMapModal | components/RackMapModal.tsx | External/Scanner |
| DimensionRackManager | components/DimensionRackManager.tsx | External |
| IconPickerModal | components/IconPickerModal.tsx | CreateRackModal, EditRackModal, BulkAddRackModal |
| ShipmentDetailModal | components/ShipmentDetailModal.tsx | Scanner.tsx |
| CreateMovingJobModal | components/CreateMovingJobModal.tsx | MovingJobs.tsx |
| EditMovingJobModal | components/EditMovingJobModal.tsx | MovingJobs.tsx |
| MaterialReturnModal | components/MaterialReturnModal.tsx | MovingJobs.tsx |
| JobDetailsModal | components/moving-jobs/JobDetailsModal.tsx | MovingJobs.tsx |
| JobFileManager | components/moving-jobs/JobFileManager.tsx | MovingJobs.tsx |
| JobMaterialReport | components/moving-jobs/JobMaterialReport.tsx | MovingJobs.tsx |
| JobMaterialsManager | components/moving-jobs/JobMaterialsManager.tsx | JobDetailsModal |
| MaterialsManager | components/moving-jobs/MaterialsManager.tsx | (legacy standalone) |
| JobReportsDashboard | components/moving-jobs/JobReportsDashboard.tsx | (standalone) |
| MonthlyJobsReport | components/moving-jobs/MonthlyJobsReport.tsx | (standalone) |
| MovingJobsManager | components/moving-jobs/MovingJobsManager.tsx | (legacy standalone) |
| ApprovalManager | components/moving-jobs/ApprovalManager.tsx | (standalone) |
| PluginSystemManager | components/moving-jobs/PluginSystemManager.tsx | (standalone) |
| StaffAssignmentDialog | components/StaffAssignmentDialog.tsx | JobDetailsModal |
| MaterialTransactionHistory | components/MaterialTransactionHistory.tsx | MaterialsManagement |
| MaterialsHub | pages/Materials/MaterialsHub.tsx | Router |
| MaterialsDashboard | pages/Materials/MaterialsDashboard.tsx | MaterialsHub |
| MaterialsManagement | pages/Materials/MaterialsManagement.tsx | MaterialsHub |
| MaterialReports | pages/Materials/MaterialReports.tsx | Router |
| CustomerMaterialsView | pages/CustomerMaterials.tsx | Router |
| ShipmentBoxCard | inline in Racks.tsx | Racks.tsx |
| compressPhoto | useSoundAlerts | Scanner.tsx |
| useSoundAlerts | useSoundAlerts.ts | Scanner.tsx |

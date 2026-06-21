# WMS v2 Feature Inventory (Staging Frontend)

> **Source:** `/root/WMS-STAGING/frontend/src/pages/` + `components/`
> **Date:** Generated from comprehensive code analysis
> **Scope:** Every state variable, API call, UI element, modal, button, form field, interaction flow, data transformation, and visual element.

---

## 1. FINANCE (FinanceDashboard.tsx + 8 components)

### 1.1 FinanceDashboard.tsx (Tab Container)

**State Variables:**
- `activeTab: string` — currently active tab id (default: 'overview')
- `activeCategory: string` — currently active category (default: 'overview')

**Categories/Tabs Structure:**
- **Overview & Analytics:** Overview (FinanceOverview), Analytics (CompanyAnalytics), Companies (CompanyFinancials)
- **Transactions & Payments:** All Transactions (GlobalTransactions), Invoices (Invoices), Advances (AdvancesList), Expenses (Expenses)
- **Contracts & Assets:** Contracts (ContractsList), Inventory (InventoryFinancials), Settings (BillingSettings)

**UI Elements:**
- Header with 💎 icon, "Finance" title, subtitle
- Category pills (scrollable on mobile): "📊 Overview & Analytics", "💰 Transactions & Payments", "📑 Contracts & Assets"
- Glass tabs under active category: icon + name per tab, active tab has blue bottom border
- Content area with glass effect card wrapping each component
- Custom scrollbar styles
- Transitions: opacity/scale animation on tab switch

**Interaction Flows:**
- Click category pill → sets activeCategory + first tab of that category
- Click tab → sets activeTab
- Renders only active tab's component

---

### 1.2 FinanceOverview.tsx

**State Variables:**
- `stats: any` — overview financial data from API (nullable)
- `loading: boolean` (default: true)
- `timeRange: string` — 'day' | 'week' | 'month' | 'year' | 'all' (default: 'month')
- `topCustomers: any[]` (default: [])
- `recentTransactions: any[]` (default: [])

**API Calls:**
- `GET /api/finance/overview?startDate=...&endDate=...` — fetches stats (time-range filtered)
- `GET /api/finance/top-customers?limit=5` — top 5 customers
- `GET /api/finance/transactions?limit=10` — recent 10 transactions

**Date Filtering (fetchStats):**
- `day`: start=today 00:00:00.000, end=today 23:59:59.999
- `week`: start=7 days ago
- `month`: start=first day of current month
- `year`: start=Jan 1 of current year
- `all`: no date filter

**Data Transformations:**
- `stats.netProfit` → green if >=0, red if negative, 3 decimal places
- `stats.totalRevenue` → blue, 3 decimals, splits into collected/pending
- `stats.totalExpenses` → red, 3 decimals
- Material Costs = breakdown.materialPurchases + breakdown.damageLosses
- Transaction date: falls back through `date` → `paymentDate` → `createdAt`
- Transaction type badge: INCOME=green, EXPENSE=red, else=blue
- Amount sign: + for positive, - for negative

**UI Elements:**
- **Time Range Selector:** 5 buttons — Today, 7 Days, Month, Year, All
- **Key Metrics Grid (4 cards):**
  1. Net Profit — green left border, BanknotesIcon, shows KWD
  2. Total Revenue — blue left border, ArrowTrendingUpIcon, collected/pending subtext
  3. Total Expenses — red left border, ArrowTrendingDownIcon
  4. Material Costs — purple left border, CurrencyDollarIcon
- **Expense Breakdown section:** 3 rows (General Expenses, Material Purchases, Damage Losses) with colored dots and amounts in KWD
- **Top Customers section:** dropdown list of up to 5 customers with rank number, name, invoice count, revenue — clicking navigates to `/companies/:id`
- **Recent Transactions table** (up to 8 rows):
  - Columns: Date, Type (badge), Customer, Method, Amount
  - Empty state: "No recent transactions"
- **Quick Actions bar (4 buttons):**
  1. View Invoices → navigate('/invoices')
  2. Advance Payments → navigate('/finance')
  3. Manage Contracts → navigate('/finance')
  4. View Shipments → navigate('/shipments')

---

### 1.3 AdvancesList.tsx

**State Variables:**
- `invoices: any[]` (default: [])
- `loading: boolean` (default: true)
- `searchTerm: string` (default: '')
- `isModalOpen: boolean` (default: false)

**API Call:**
- `GET /api/billing/invoices?includeShipment=true` — fetches all invoices
- Client-side filter: `invoiceType === 'ADVANCE'`

**Search Filtering:** by invoiceNumber, clientName, shipment.referenceId, companyProfile.name

**UI Elements:**
- Header: "Advance Payments" title + description
- "New Advance" button (PlusIcon) → opens RecordAdvanceModal
- "Export Report" button (ArrowDownTrayIcon)
- Search input with magnifying glass icon
- **Table columns:** Invoice #, Company Profile, Client Name, Shipment Ref, Amount, Date, Status
- Status always shown as "Paid" (green badge)
- Empty state: "No advance payments found."
- Loading state: "Loading advances..."

**Modal:** RecordAdvanceModal (see below)

---

### 1.4 CompanyFinancials.tsx

**State Variables:**
- `companies: any[]` (default: [])
- `loading: boolean` (default: true)
- `searchTerm: string` (default: '')

**API Call:**
- `GET /api/finance/companies` — company financial data

**Search Filtering:** by company name, contactPerson

**UI Elements:**
- Header: "Company Financials" title + description
- Search input
- **Table columns:** Company, Shipments, Total Billed, Total Paid, Pending, Actions
- "Statement" action button per row (DocumentTextIcon, placeholder: alert with company ID)
- Pending amount: red if > 0, else gray
- Empty state: handled by filtered array

---

### 1.5 ContractActionModal.tsx

**Props:**
- `isOpen: boolean`, `onClose: () => void`, `onSuccess: () => void`

**State Variables:**
- `step: 'search' | 'details'` (default: 'search')
- `searchTerm: string` (default: '')
- `searchResults: any[]` (default: [])
- `searching: boolean` (default: false)
- `selectedProfile: any` (nullable)
- `amount: string`, `monthlyRate: string`, `validUntil: string`, `notes: string`
- `submitting: boolean`, `error: string`

**API Calls:**
- `companiesAPI.listProfiles()` — load all company profiles
- Client-side search filtering by name and contactPerson
- `POST /api/prepaid/balance` — body: `{ companyProfileId, amount, monthlyRate?, validUntil?, notes }`

**UI Elements (Step 1 - Search):**
- Modal overlay with backdrop
- "Manage Contract / Add Funds" title
- X close button
- Search input (autofocus): "Filter by Company Name or Contact Person..."
- Scrollable company table: Company Name, Contact Person, Phone, Status badge (ACTIVE=green, EXPIRED=red, PENDING=gray)
- Row click → handleSelectProfile
- "💡 Click on any company to manage contract or add funds" hint

**UI Elements (Step 2 - Details form):**
- Selected Profile display with "Change" button
- Error alert (red box)
- Amount (KWD) — number input, step 0.001, required
- Monthly Rate (Optional) — number input
- Valid Until (Optional) — date input
- Notes — textarea, 3 rows
- "Save Contract" submit button (disabled when submitting)
- "Cancel" button

---

### 1.6 ContractsList.tsx

**State Variables:**
- `contracts: any[]` (default: [])
- `loading: boolean` (default: true)
- `searchTerm: string` (default: '')
- `isModalOpen: boolean`, `showEditModal: boolean`, `showStatementModal: boolean`
- `selectedContract: any` (nullable)
- `editData: { monthlyRate, paymentDueDay, maxCBM, maxStorageDays, contractStartDate, contractEndDate, status, notes }`
- `saving: boolean` (default: false)

**API Calls:**
- `GET /api/prepaid/balances?includeDetails=true` — load contracts
- `PUT /api/contracts/:id` — update contract via `getBackendUrl()` + `/api/contracts/${selectedContract.id}`

**Date Calculations:**
- `daysRemaining` = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
- `isExpired` = daysRemaining <= 0
- Contract period display: startDate → endDate or "Indefinite"
- Days left color: ≤30 red, ≤60 yellow, >60 normal

**UI Elements:**
- Header: "Contracts & Prepaid Balances" title
- "New Contract" button (PlusIcon)
- "Export" button (ArrowDownTrayIcon)
- Search input with magnifying glass
- **Table columns:** Company/Profile, Contact, Contract Period, Monthly Rate, Payment Due Day, Balance, Status, Actions
- Row actions: View Statement (DocumentTextIcon, green), View Profile (EyeIcon, blue → `/companies/:id`), Edit Contract (PencilSquareIcon, indigo)
- EXPIRED warning icon on expired contracts
- **Edit Contract Modal:** gradient header, Customer info, Monthly Rate, Payment Due Day, Max CBM, Max Storage Days, Start/End Date, Status dropdown (ACTIVE/SUSPENDED/EXPIRED/CANCELLED), Notes textarea, Save/Cancel buttons

**Modals Used:** ContractActionModal (New), ContractStatementModal + inline edit modal

---

### 1.7 ContractStatementModal.tsx

**Props:**
- `isOpen`, `onClose`, `contractId`, `customerName`

**Interfaces (StatementData):**
- `contract`: id, customerName, contactPerson, contactPhone, monthlyRate, status, startDate, endDate, totalPaid, balance
- `summary`: contractValue, monthsActive, totalShipmentsReleased, totalBoxesReleased, totalCBMReleased, totalInvoiced, totalPaid, totalOutstanding
- `releasedShipments: any[]`, `invoices: any[]`, `transactions: any[]`, `history: any[]`

**State:**
- `loading`, `data: StatementData|null`, `error`, `activeTab: 'summary'|'shipments'|'invoices'|'transactions'`

**API Call:**
- `GET /api/contracts/statement/:contractId` (via getBackendUrl)

**UI Elements:**
- Full-screen overlay modal, max-width 5xl
- Header: "Contract Statement" + customer name (Arabic: كشف الحساب), Print button (PrinterIcon), Close (XMarkIcon)
- **Contract Info Banner** (blue gradient): Monthly Rate, Contract Value, Months Active, Status badge
- **Summary Cards (4):** Shipments Released, Boxes Released, Total CBM, Total Paid
- **Tabs:** 📊 Summary, 📦 Shipments Released, 📄 Invoices, 💰 Transactions
- **Summary Tab:** Contract Start/End dates, Total Invoiced, Outstanding Balance
- **Shipments Tab Table:** Reference, Description, Boxes, CBM, Status, Released date
- **Invoices Tab Table:** Invoice #, Date, Total, Paid, Balance, Status
- **Transactions Tab Table:** Date, Type (CREDIT/DEBIT badges), Description, Amount with sign
- Footer: Close button

---

### 1.8 GlobalTransactions.tsx

**State:**
- `transactions: any[]` (default: [])
- `loading: boolean` (default: true)

**API Call:**
- `GET /api/finance/transactions?limit=100`

**UI Elements:**
- "Global Transaction Ledger" title
- **Table columns:** Date, Type (INCOME/EXPENSE badges), Category, Description (with Ref), Amount
- Amount sign: negative = green, positive = red

---

### 1.9 InventoryFinancials.tsx

**State:**
- `inventory: any[]` (default: [])
- `loading: boolean` (default: true)

**API Call:**
- `GET /api/finance/inventory`

**UI Elements:**
- "Inventory Financials" title
- **Table columns:** Material (with SKU), Current Stock, Unit Cost, Total Purchased (cost + qty), Total Used (cost + qty), Total Damaged (cost + qty)

---

### 1.10 RecordAdvanceModal.tsx

**Props:**
- `isOpen`, `onClose`, `onSuccess`

**State:**
- `step: 'search' | 'details'` (default: 'search')
- `searchTerm`, `searchResults`, `searching`
- `selectedShipment`, `amount`, `paymentMethod` (default: 'CASH'), `transactionRef`, `notes`, `submitting`, `error`

**API Calls:**
- `shipmentsAPI.getAll({ limit: 200 })` — load all shipments
- `shipmentsAPI.getAll({ search: searchTerm, limit: 100 })` — search
- `POST /api/billing/shipments/:id/advance` — body: `{ amount, paymentMethod, transactionRef, notes }`

**UI Elements (Step 1):**
- "Record Advance Payment" title
- Search input: "Filter by Ref ID, Client Name, Phone..."
- Scrollable shipment table: Reference, Client (name + phone/email), Type (COMMERCIAL=purple, other=green), Boxes (current/original), Arrival date, Status badge (RELEASED=green, ACTIVE=blue)
- 💡 hint text

**UI Elements (Step 2):**
- Selected Shipment display with "Change" button
- Amount (KWD) — required number, step 0.001
- Payment Method — select: CASH, KNET, CARD, BANK_TRANSFER, CHEQUE
- Transaction Reference (Optional) — text
- Notes — textarea (3 rows)
- "Record Payment" / "Cancel" buttons

---

## 2. COMPANIES / CUSTOMERS

### 2.1 CompaniesManagement.tsx

**State Variables:**
- `companies: Company[]` (typed interface), `loading: boolean`, `searchTerm: string`
- `modalOpen: boolean`, `editingCompany: Company|null`
- `formData: { name, description, contactPerson, contactPhone, contactEmail, address }`

**API Calls (using axios):**
- `GET /api/companies` (with Bearer token from localStorage)
- `POST /api/companies` (create)
- `PUT /api/companies/:id` (update)
- `DELETE /api/companies/:id` (with confirm dialog)

**Data Transformations:**
- Search filters by name, contactPerson, contactPhone
- Form reset on modal close

**UI Elements:**
- Header: BuildingOfficeIcon, "Companies Management" title, "Add New Company" button
- Search bar with magnifying glass icon
- **Companies Grid (cards):** each card has:
  - Company name + ID
  - Description (line-clamp-2)
  - Contact person with UserIcon
  - Contact phone with PhoneIcon
  - 3 action buttons: View Profile (EyeIcon → `/company-profile/:id`), Edit (PencilIcon), Delete (TrashIcon, red)
- **Empty state:** BuildingOfficeIcon, "No companies found", "Add Your First Company" button
- **Modal (Add/Edit):**
  - Company Name * (required, placeholder examples: DIOR, GUCCI)
  - Description textarea
  - Contact Person + Contact Phone (side by side)
  - Contact Email
  - Address textarea
  - Cancel + Create/Update buttons

---

### 2.2 CompanyProfile.tsx (2628 lines — the largest file)

**URL Param:** `profileId` from `useParams`

**Interfaces:**
- `CompanyAnalytics` — profile + stats + shipmentCharges + paymentMethods + monthlyRevenue + recentActivity
- `ContractData` — contract details
- `EditContractFormData` — editable contract fields
- `ShipmentCharges` — per-shipment charge map

**State Variables (extensive list):**
- `loading`, `data: CompanyAnalytics|null`, `contract: ContractData|null`
- `activeTab: 'overview'|'shipments'|'invoices'|'payments'|'contract-payments'`
- Shipments tab: `allShipments`, `shipmentsLoading`, `shipmentStatusFilter`, `shipmentSearchTerm`, `shipmentCharges`
- Invoices tab: `allInvoices`, `invoicesLoading`, `invoiceStatusFilter`, `invoiceSearchTerm`, `invoicePaymentModalOpen`, `selectedInvoiceForInvoicePayment`
- Contract Payment History: `contractPaymentHistory`, `loadingPaymentHistory`
- `generatingInvoice`, `showGenerateInvoiceModal`, `invoiceMonth`, `invoiceYear`, `numberOfMonths`
- `showRecordPaymentModal`, `selectedInvoiceForPayment`, `paymentAmount`, `paymentMethod`, `recordingPayment`, `paymentTransactionRef`, `paymentReceiptNumber`, `paymentNotes`, `customExtendDays`
- Billing Settings: `showCBMSettingsModal`, `cbmSettings` (billingType, cbmRatePerDay, monthlyContractAmount, freeStorageDays, minimumCharge, advanceBalance, statementEmails), `savingCBMSettings`
- Advance Payment: `showAdvancePaymentModal`, `advancePaymentAmount`, `advancePaymentNote`, `savingAdvancePayment`
- Email Statement: `showEmailStatementModal`, `emailStatementData` (emails, subject, includeShipments, includeInvoices, includeCharges), `sendingEmail`
- Edit Contract: `showEditContractModal`, `editContractData`, `savingContract`

**API Calls (all via axios with Bearer token):**
- `GET /api/companies/:profileId/analytics` — main analytics loads
- `GET /api/contracts/customer/:profileId` — load contract
- `GET /api/contracts/payment-history/:profileId` — load contract payment history
- `POST /api/contracts/generate-invoice/:profileId` — body: `{ month, year, numberOfMonths }`
- `POST /api/contracts/record-payment/:invoiceId` — body: `{ amount, paymentMethod, transactionRef, receiptNumber, notes, customExtendDays }`
- `PUT /api/contracts/:id` — update contract
- `PUT /api/companies/:profileId` — update billing settings / advance balance
- `POST /api/companies/:profileId/send-statement` — body: `{ emails[], subject, includeShipments, includeInvoices, includeCharges }`
- `GET /api/shipments?companyProfileId=...` — load shipments
- `GET /api/billing/shipments/:id/live-charges` — per-shipment live charges
- `GET /api/billing/invoices?companyProfileId=...` — load invoices

**Data Transformations:**
- `formatNumber()` — safe number formatting with fallback to 0
- PaymentMethods normalization — parseFloat each value, handle non-numbers
- MonthlyRevenue normalization — same safe parsing
- Shipment charges map built from analytics data
- `isContractExpired` — compares contractEndDate to now
- Invoice outstanding = totalAmount - paidAmount

**UI Elements (Header Section):**
- Back button (ArrowLeftIcon) → navigate(-1)
- Action buttons: Billing Settings (CalculatorIcon, indigo), Record Advance (BanknotesIcon, green), Send Statement Email (EnvelopeIcon, emerald), Print Report, Export Data
- Company logo with avatar fallback + contract badge (📄) if contract exists
- Placeholder warning banner (yellow) if profile.isPlaceholder
- Company name + contract badge (CONTRACT CUSTOMER/CONTRACT EXPIRED)
- Contact info: BuildingOfficeIcon, PhoneIcon, CalendarIcon (member since)
- Total Business Value on right

**Statistics Dashboard (8-9 cards):**
1. Total Shipments — TruckIcon, blue, shows active/released breakdown
2. Current Boxes — ArchiveBoxIcon, purple, shows total stored
3. Current CBM — CubeIcon, cyan, shows rate per CBM/day
4. Released CBM — CubeIcon, green, with value in KWD
5. Current Charges — CurrencyDollarIcon, orange
6. 30-Day Estimate — CalendarIcon, amber
7. Total Invoices — DocumentTextIcon, indigo, shows avg amount
8. Paid Amount — CheckCircleIcon, green, shows paid count
9. Outstanding Balance — CurrencyDollarIcon, red, shows pending/overdue counts
10. Contract Info (conditional) — DocumentTextIcon, shows contract status, monthly rate, due day, maxCBM, maxDays, end date with expiration warnings
11. Avg Storage Days — ClockIcon, orange
12. Total Payments — BanknotesIcon, teal
13. Partial Payments — DocumentTextIcon, yellow

**Tab Navigation:**
- Overview (ChartBarIcon)
- Shipments (TruckIcon)
- Invoices (DocumentTextIcon)
- Payments (BanknotesIcon) — placeholder "coming in next update"
- Contract Billing (CalendarIcon) — only if contract exists; redirects to Finance

**Tab Contents:**
- **Overview Tab:** Recent Activity (shipments + invoices + payments with status badges), Payment Methods breakdown, Monthly Revenue (last 6 months)
- **Shipments Tab:** Search + status filter (PENDING/IN_WAREHOUSE/RELEASED) + Export to Excel button; Table: Reference ID, Client Info, Status, Boxes, CBM, Days Stored, Est. Charges, Rack, Actions (View); Summary footer with total CBM and charges
- **Invoices Tab:** Search + status filter (PAID/PARTIAL/PENDING/OVERDUE) + Export to Excel; Table: Invoice #, Shipment Ref, Total, Paid, Outstanding, Status, Date, Actions (Pay + View); Summary footer with totals
- **Payments Tab:** Placeholder text

**Modals (7 total):**
1. **Generate Contract Invoice Modal:** Month/Year selects, Number of Months carry-forward (1-12), Cancel/Generate buttons
2. **Record Payment Modal:** Invoice info, Amount, Payment Method (CASH/KNET/CARD/BANK_TRANSFER/CHEQUE), Transaction Reference (conditional by method), Receipt Number, Custom Extend Days, Notes, full-payment extension info, Cancel/Record buttons
3. **Edit Contract Modal:** Full contract editing (same as ContractsList edit modal)
4. **Billing Settings Modal (CBM):** Billing Type selector (PER_CBM/FIXED_MONTHLY/PER_BOX), conditional fields (rate/amount), Free Storage Days, Minimum Charge, Advance Balance, Statement Emails, Billing Summary preview
5. **Record Advance Payment Modal:** Current balance display, Amount input, Note textarea, New balance preview
6. **Email Statement Modal:** Email addresses (comma-separated), Subject, Include checkboxes (Shipments/Invoices/Charges), Report Preview section
7. **RecordPaymentModal (reusable component)** — for invoice payments in invoices tab

---

## 3. INVOICES

### 3.1 Invoices.tsx

**State Variables:**
- `invoices: any[]`, `loading: boolean`
- `searchTerm: string`, `statusFilter: string` (default: 'all')
- `warehouseFilter: string` (default: 'all'), `dateFilter: string` (default: 'all')
- `stats: { total, totalAmount, paid, outstanding, partial, overdue, avgInvoiceAmount, totalPaid }`

**API Call:**
- `billingAPI.getInvoices(params)` — params can include: `status`, `isWarehouseInvoice`, `search`

**Data Transformations:**
- `calculateStats()` — reduces invoice list to totals, counts, averages
- `getStatusBadge(status)` — returns styled badge with icon: PENDING(yellow/ClockIcon), PAID(green/CheckCircleIcon), PARTIAL(blue/CurrencyDollarIcon), OVERDUE(red/XCircleIcon), CANCELLED(gray/XCircleIcon)
- Balance = totalAmount - paidAmount

**UI Elements:**
- Header: DocumentTextIcon, "Invoices" title, Export + Print buttons
- **Stats Cards (4):** Total, Total Amount (with avg), Paid Amount, Outstanding (with overdue count)
- **Quick Overview:** Grid of 5 counts: Pending, Paid, Partial, Overdue, Cancelled — each with emoji icon
- **Filters Section:** FunnelIcon header
  - Search input (invoice number, client name, phone)
  - Status filter dropdown (All/Pending/Paid/Partial/Overdue/Cancelled)
  - Warehouse filter dropdown (All/Regular/Warehouse)
  - Date range buttons: Today, This Week, This Month, All Time
- **Table:** Invoice # (with DocumentTextIcon), Date (CalendarIcon), Client (UserIcon + phone), Shipment Ref, Total Amount, Paid, Balance, Status badge, Actions (View Details → `/invoices/:id`)
- Alternating row background colors
- Empty state: Large DocumentTextIcon, "No invoices found", "Try adjusting your filters"

---

### 3.2 InvoiceDetail.tsx

**URL Param:** `id`

**State:**
- `invoice: any`, `billingSettings: any`, `templateSettings: any`
- `loading: boolean`, `recordPaymentOpen: boolean`, `generatingPDF: boolean`

**API Calls:**
- `billingAPI.getInvoice(id)` — invoice data
- `billingAPI.getSettings()` — billing settings
- `GET /api/template-settings` — template customization

**Data Transformations:**
- Balance = totalAmount - paidAmount
- PaymentProgress = (paidAmount / totalAmount) * 100
- QR position from templateSettings.qrCodePosition (TOP_RIGHT default)

**UI Elements:**
- **Header Actions (print:hidden):** Back to Invoices button, Record Payment (green, shown only if balance>0), Print, Download PDF (with loading spinner), Send Email
- **Invoice Document (max-w-5xl, white card with shadow):**
  - QR Code (conditional): SVG QRCode with value `INV-{invoiceNumber}`, size and position from settings
  - Header: Company Logo (conditional), Invoice Title ("INVOICE"), Invoice #, Company Name/Address/Phone/Email (conditional)
  - Status badge (same as Invoices.tsx)
  - Invoice Details Grid: Invoice Date, Due Date
  - Bill To/From sections: From (billing settings), To (client info + shipment reference + rack locations)
  - **Shipment Details Section (NEW):** blue gradient background, info grid (Shipment ID, Total Boxes, Arrival Date, Days Stored), Box Distribution by Rack Location (grouped), rack summary stats
  - **Line Items Table:** Description, Qty, Unit Price, Tax, Amount
  - **Totals:** Subtotal, Tax, Total (with currency symbol)
  - **Payment Status:** Total Amount, Paid, Balance Due + progress bar + percentage
  - **Payment History Table (conditional):** Date, Method, Reference, Amount
  - **Bank Details (conditional):** Blue background, pre-formatted text
  - **Terms & Conditions (conditional):** from settings
  - **Footer:** "Thank you for your business!" + website

**Modal:** RecordPaymentModal (reusable component)

---

## 4. EXPENSES (Expenses.tsx)

**State:**
- `expenses: Expense[]`, `summary: any|null`, `loading`, `error`
- `searchTerm`, `filterCategory`, `filterStatus`
- `showCreateModal`, `selectedExpense: Expense|null`

**API Calls (expensesAPI):**
- `expensesAPI.getAll(filters)` — filters: category, status, search
- `expensesAPI.delete(id)`
- `expensesAPI.updateStatus(id, 'APPROVED'|'REJECTED')`

**Interfaces:**
- `Expense`: id, title, category, amount, currency, description, expenseDate, status, approvedBy, createdAt

**UI Elements:**
- Header: "Expenses" title, "Add Expense" button (PlusIcon)
- **Summary Cards (4):** Total, Pending (yellow), Approved (green), This Month (blue)
- **Filters:** Search input, Category filter (MAINTENANCE/FUEL/MATERIALS/SALARIES/RENT/UTILITIES/OTHER), Status filter (PENDING/APPROVED/REJECTED) — all with FunnelIcon
- **Table:** Expense (title + description), Category (colored pills), Amount, Date, Status (badge with icon), Actions
- **Row Actions:**
  - PENDING status: Approve (CheckCircleIcon, green) + Reject (XCircleIcon, red)
  - Edit (PencilIcon, blue) → sets selectedExpense for EditExpenseModal
  - Delete (TrashIcon, red) → confirm dialog then delete
- Empty state: "No expenses found", "Create your first expense to get started"

**Modals:** CreateExpenseModal + EditExpenseModal (reusable components)

---

## 5. SETTINGS

### 5.1 Settings.tsx (Tab Container)

**State:**
- `activeSection: string` (default: 'company')

**Navigation (Sidebar):**
- Company & Branding → path: 'company' → renders CompanySettings
- Company Profiles → path: 'company-profiles' → renders CompanyProfiles
- User Management → path: 'users' → renders UserManagement
- Shipment Workflow → path: 'shipment' → renders ShipmentConfiguration
- Integrations → path: 'integrations' → renders IntegrationSettings
- Warehouse Setup → path: 'system' → renders SystemSettings
- Security & Access → path: 'security' → renders SecuritySettings
- Notifications → path: 'notifications' → renders NotificationSettings
- Email Service → path: 'email' → renders EmailSettings

**UI Elements:**
- Blue gradient sidebar with CogIcon, "Settings" title
- Navigation items with icon + name + description, active state (white bg)
- Quick Stats sidebar: Total Users (12), Active Racks (48), Monthly Revenue (2450 KWD)
- Content area on right with max-w-5xl

---

### 5.2 CompanySettings.tsx

**State:**
- `companyData: CompanyData` — brand settings object (many fields: name, email, phone, address, website, logo, colors, login page customization)
- `isLoading`, `loading`, `message`, `logoFile`, `logoPreview`

**API Calls:**
- `companyAPI.get()` — load company data
- `companyAPI.update(data)` — save company data

**Interfaces:**
- `CompanyData` — name, email, phone, address, website, logo, primaryColor, secondaryColor, accentColor, showCompanyName, logoSize, login video/background settings, gallery/services/features/partners

**UI Elements:**
- **Tabs:** General, Branding, Login Page
- **General Tab:** Company Name, Email, Phone, Address, Website fields
- **Branding Tab:** Logo upload (file picker + URL input), Color presets (4 presets: Indigo Purple, Blue Cyan, Green, Amber Red), Logo Size (Small/Medium/Large), Show Company Name toggle
- **Login Page Tab:** Hero Title, Hero Subtitle, Background Type (Video/Image/Color), Video URL, Background Image URL, Glass Effect toggle, Features toggle, Cursor Effect toggle, 3D Effect toggle, Blur Strength, Theme Mode
- Save/Cancel buttons

---

### 5.3 CompanyProfiles.tsx

**State:**
- `profiles: CompanyProfile[]`, `loading`, `showForm`, `editingId`
- `logoFile`, `logoPreview`, `message`, `isSubmitting`, `confirmDelete`
- `formData: { name, description, contactPerson, contactPhone, contractStatus, isActive }`

**API Calls:**
- `companiesAPI.listProfiles()` — load all
- `companiesAPI.createProfile(formData, logoFile?)` — create
- `companiesAPI.updateProfile(id, formData, logoFile?)` — update
- `companiesAPI.deleteProfile(id)` — delete

**UI Elements:**
- Header: "Company Profiles" title, "Add Profile" button
- **Profiles List:** each shows logo (or BuildingOfficeIcon), name, description, contact info, status badge, contract status badge
- Actions: Edit, Delete (with confirmation)
- **Add/Edit Modal:** Name, Description, Contact Person, Contact Phone, Contract Status (Active/Inactive/Expired/Pending), Logo upload (max 2MB)

---

### 5.4 UserManagement.tsx (1002 lines)

**Interfaces:**
- `User`: id, name, email, phone, role (ADMIN/MANAGER/DRIVER/WORKER/SCANNER/PACKER/LABOR), status (ACTIVE/INACTIVE), skills[], joinedAt, lastActive, avatar, isDummy
- mockUsers array (4 users for demo)

**State:**
- `users: User[]`, `loading`, `searchTerm`
- `filterRole: string` (default: 'ALL'), `filterStatus: string` (default: 'ALL')
- `showAddModal`, `showViewModal`, `showPermissionsModal`

**API Calls:**
- `usersAPI.getAll()` — fetch all users
- `usersAPI.create(data)` — create user
- `usersAPI.update(id, data)` — update user
- `usersAPI.delete(id)` — delete user

**Role Colors:**
- ADMIN=red, MANAGER=blue, DRIVER=purple, WORKER=green, SCANNER=yellow, PACKER/LABOR=gray

**UI Elements:**
- Header: UserGroupIcon, role filter tabs (All/Admin/Manager/Worker/Driver), status filter buttons (All/Active/Inactive)
- Search bar, "Add User" button
- **User Cards/Table:** Avatar, Name, Email, Role (colored badge), Status (colored badge), Skills, Last Active, Joined Date
- Actions: View (EyeIcon), Edit (PencilIcon), Delete (TrashIcon)
- **Add/Edit Modal:** Name, Email, Phone, Password, Role select, Status toggle, Skills textarea

---

### 5.5 BillingSettings.tsx (1011 lines)

**Interfaces:**
- `ChargeType`: id, name, code, description, category (STORAGE/RELEASE/SERVICE/OTHER), calculationType (PER_BOX/FLAT/PERCENTAGE/PER_DAY/PER_KG/PER_HOUR/PER_CUBIC_M/PER_SHIPMENT), rate, min/maxCharge, applyOnRelease, applyOnStorage, isTaxable, isActive
- `BillingSettings`: storageRateType, storageRatePerBox/CBM, storageRatePerWeek/Month, minimumStorageCharge, taxRate, gracePeriodDays, currency, invoicePrefix, invoiceDueDays, logoUrl, logoPosition, primaryColor, secondaryColor, showCompanyStamp, bank details, terms, paymentInstructions, footerText, tax/company registration numbers
- `PrepaidBalance`: companyProfile, totalPaid, balanceRemaining, monthlyRate, validFrom/Until, status, transactions

**State:**
- `activeTab: TabId` ('general'|'invoice'|'bank'|'terms'|'charges'|'prepaid')
- `settings: BillingSettings|null`, `loading`, `saving`, `message`
- Custom charge editing state, prepaid balances state

**API Calls:**
- `billingAPI.getSettings()` — load
- `billingAPI.updateSettings(data)` — save
- `billingAPI.getChargeTypes()` / `createChargeType()` / `updateChargeType()` / `deleteChargeType()`
- `billingAPI.getPrepaidBalances()` — prepaid
- `billingAPI.addPrepaidBalance(data)` / `updatePrepaidBalance()` / `deletePrepaidBalance()`

**UI Elements:**
- **6 Tab Layout:** General, Invoice Format, Bank Details, Terms, Charge Types, Prepaid
- **General Tab:** Storage Rate Type (PER_BOX/PER_CUBIC_M), rates, grace period, minimum charge, currency
- **Invoice Format Tab:** Logo upload/URL, Logo Position (LEFT/CENTER/RIGHT), Primary/Secondary color, Show Stamp toggle, Invoice Prefix, Due Days
- **Bank Details Tab:** Bank Name, Account Name, Account Number, IBAN, Swift Code, Branch
- **Terms Tab:** Terms & Conditions, Payment Instructions, Footer Text, Tax/Company Registration Numbers
- **Charge Types Tab:** List of custom charges, Add/Edit/Delete charge forms
- **Prepaid Tab:** List of prepaid balances per company, CRUD operations

---

### 5.6 IntegrationSettings.tsx

**UI Elements (mostly static/placeholder):**
- **WhatsApp Business API:** Configure button, API Key + Phone Number inputs
- **Email Notifications:** Shows "Connected" badge
- **SMS Gateway:** Connect button
- All fields are static inputs (no state management beyond form)

---

### 5.7 InvoiceSettings.tsx

**State:**
- `settings`: { templateType, primaryColor, secondaryColor, showLogo, showCompanyAddress, showClientDetails, footerText, termsConditions, invoicePrefix, invoiceStartNumber }
- `loading`, `saving`, `message`

**API Calls:**
- `invoiceSettingsAPI.get()` — load
- `invoiceSettingsAPI.update(data)` — save

**UI Elements:**
- Template type selector: Modern (📄), Classic (📋), Minimal (📝) — card-based selection
- Color pickers: Primary, Secondary
- Toggles: Show Logo, Show Company Address, Show Client Details
- Invoice Prefix, Starting Number
- Footer Text, Terms & Conditions textareas
- Link to advanced template settings
- Save button

---

### 5.8 NotificationSettings.tsx

**State:**
- `preferences`: { email: {}, sms: {}, push: {} }
- `loading`, `saving`, `message`

**API Calls:**
- `notificationPreferencesAPI.get()` — load
- `notificationPreferencesAPI.update(preferences)` — save

**UI Elements:**
- **Email Notifications section:** 4 toggle items (New Shipment, Job Assignments, Expense Approvals, System Updates)
- (SMS/Push sections with similar toggles)
- Save button

---

### 5.9 SecuritySettings.tsx

**UI Elements (mostly static):**
- **Password Policy:** 4 checkboxes (8 chars, uppercase, numbers, special chars) — all defaultChecked
- **Two-Factor Authentication:** Enable button
- **Session Management:** Timeout input (default 30 min)
- No state management or API calls

---

### 5.10 ShipmentConfiguration.tsx (922 lines)

**Interfaces:**
- `ShipmentSettings`: extensive settings object covering intake, storage, release, pricing, notifications, custom fields, partial release, documentation

**State:**
- `settings: ShipmentSettings|null`, `loading`, `saving`, `resetting`, `message`

**API Calls:**
- (load/save via API, endpoints inferred)
- `resetDefaults()` — reset to defaults

**UI Elements:**
- **Sections (accordion/collapsible):**
  1. **Intake Settings:** Require client email/phone/estimated value/photos, auto-generate QR, QR prefix
  2. **Intake Form Fields:** Show/Require toggles for address, description, referenceId, notes, warehouse mode, shipper/consignee details, weight, dimensions, storage type, special instructions, estimated days
  3. **Storage Settings:** Default storage type, allow multiple racks, require rack assignment, auto-assign rack, low capacity notification + threshold
  4. **Release Settings:** Require approval, approver role, require photos/ID verification, generate release invoice, auto-send invoice email
  5. **Pricing:** Storage rates (per day, per box), charge partial day, minimum days, release fees (handling, per-box, transport)
  6. **Notifications:** Toggles for client notifications on intake/release/storage alert, alert days
  7. **Custom Fields:** Enable/disable custom fields
  8. **Partial Release:** Allow, minimum boxes, require approval
  9. **Documentation:** Require signature, collector ID, allow proxy collection
- Reset to defaults button
- Save button

---

### 5.11 SystemSettings.tsx (1062 lines)

**Interfaces:**
- `Rack`: id, code, location, type (STORAGE/MATERIALS/EQUIPMENT), capacity, currentLoad, qrCode, status
- `CustomField`: id, name, type (TEXT/NUMBER/DATE/DROPDOWN/CHECKBOX), options[], required, section, order

**State:**
- `racks: Rack[]`, `customFields: CustomField[]`, `loading`
- `showAddRack`, `showAddField`, `editingField`
- `selectedRacks: Set<string>`, `selectedFields: Set<string>`
- `newRack: { code, location, rackType, capacityTotal }`
- `newField: { fieldName, fieldType, fieldOptions, isRequired, section }`

**API Calls:**
- `racksAPI.getAll()` — load racks
- `racksAPI.create(data)` — create rack
- `racksAPI.update(id, data)` — update rack
- `racksAPI.delete(id)` — delete rack
- `customFieldsAPI.getAll()` — load fields
- `customFieldsAPI.create(data)` — create field
- `customFieldsAPI.update(id, data)` — update
- `customFieldsAPI.delete(id)` — delete

**UI Elements:**
- **Tabs:** Racks, Custom Fields
- **Racks Tab:** Add Rack button, rack list/table with Code, Location, Type (colored badge), Capacity (progress bar), Status (colored badge), QR Code, Actions (Edit/Delete), Bulk select + delete
- **Add Rack Modal:** Code, Location, Type (STORAGE/MATERIALS/EQUIPMENT), Capacity
- **Custom Fields Tab:** Add Field button, field list with Name, Type, Section, Required, Order, Actions
- **Add Field Modal:** Field Name, Type (TEXT/NUMBER/DATE/DROPDOWN/CHECKBOX), Options (for DROPDOWN), Required toggle, Section (SHIPMENT/JOB/EXPENSE)

---

## 6. EMAIL SETTINGS

### 6.1 EmailSettings.tsx (764 lines — uses lucide-react)

**Interfaces:**
- `EmailSettings`: id, provider, isEnabled, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, senderName, senderEmail, dailyLimit
- `NotificationSetting`: type, label, description, category, id, isEnabled, notifyAdmins, notifyManagers, customEmails, alertDaysBefore, recipients[]
- `EmailStats`: total, sent, failed, todayCount, dailyLimit, isEnabled, remainingToday

**State:**
- `activeTab: 'settings'|'notifications'|'logs'` (notifications implemented, logs tab placeholder)
- `loading`, `saving`, `testing`
- `emailSettings: EmailSettings`, `notifications: NotificationSetting[]`, `stats: EmailStats|null`
- `testEmail: string`
- `expandedCategories: Record<string, boolean>`, `showEmailModal`, `selectedNotificationType`, `newCustomEmail`

**API Calls (api service — uses axios):**
- `GET /email/settings`
- `PUT /email/settings`
- `GET /email/notifications`
- `PUT /email/notifications/:type`
- `POST /email/test` — body: `{ testEmail }`
- `GET /email/stats`

**UI Elements:**
- Header: Mail icon, "Email & Notifications" title
- **Stats Card:** Sent (green), Failed (red), Left Today (blue)
- **Tabs:** Email Settings, Notification Types
- **Gmail Setup Guide** — step-by-step instructions (blue info box)
- **Enable/Disable Toggle:** switch for all email notifications
- **SMTP Configuration:** Provider (Gmail/Custom SMTP), SMTP Host, Port, SSL toggle (disabled for Gmail), Email Address (smtpUser), App Password, Sender Name, Sender Email
- **Test Segment:** Test email input + "Test" button (green)
- **Save Button:** "Save Settings"
- **Notifications Tab:** Category-grouped notifications with expand/collapse
  - Each notification: icon, label, description, toggle switch
  - Recipients: Admins checkbox, Managers checkbox, Alert Days Before (for CONTRACT_EXPIRING)
  - Add Custom Email button → modal
  - Custom Emails list with remove (X) button
- **Add Custom Email Modal:** Email input + Add/Cancel

**Notification Categories:** Shipments, Contracts, Moving Jobs, Billing, Materials, Reports — each with color-coded badges

**Notification Types:** SHIPMENT_RELEASED, SHIPMENT_CREATED, SHIPMENT_PARTIAL_RELEASE, CONTRACT_NEW, CONTRACT_EXPIRING, CONTRACT_EXPIRED, CONTRACT_RENEWED, MOVING_JOB_CREATED/ASSIGNED/STARTED/COMPLETED, INVOICE_CREATED/OVERDUE, PAYMENT_RECEIVED/REMINDER, LOW_STOCK_ALERT, MATERIAL_ISSUED/RETURNED/DAMAGED, PURCHASE_ORDER_CREATED, STORAGE_ALERT, DAILY_SUMMARY, WEEKLY_REPORT

---

### 6.2 TemplateSettings.tsx (818 lines)

**State:**
- `settings: any|null`, `loading`, `saving`, `activeTab`, `logoFile`, `uploading`

**API Calls:**
- `GET /api/template-settings` — load
- `PUT /api/template-settings` — save
- `POST /api/upload/logo` — logo upload (multipart form data)

**Default Settings Object:**
- companyName: 'QGO Cargo', address, phone, email, website, invoiceTitle: 'TAX INVOICE', releaseNoteTitle: 'SHIPMENT RELEASE NOTE', invoicePrimaryColor: '#2563eb', releasePrimaryColor: '#1e40af', currencySymbol: 'KD'

**UI Elements (5 tabs):**
1. **Company Info:** Logo upload (file + URL "OR" flow), Company Name*, Address, Phone, Email, Website, License/Registration No.
2. **Invoice Template:** Invoice Title, Template Style (Standard/Modern/Minimal/Classic), Display Elements checkboxes (show logo/address/phone/email/website/license/footer), Default Terms & Conditions, Footer Text
3. **Release Note Template:** Release Note Title, Template Style (Professional/Compact/Detailed), Display Sections checkboxes (show logo/shipment/storage/items/collector/charges/photos/terms/signatures), Terms, Footer Text
4. **Colors & Styling:** Primary color, Secondary color, QR Code position (TOP_RIGHT/TOP_LEFT/BOTTOM_RIGHT/BOTTOM_LEFT), QR Code Size, Show QR Code toggle, Font Style (Default/Serif/Sans-serif/Monospace)
5. **Advanced:** Company Bank Details (multiple accounts), Custom CSS field

---

### 6.3 PluginSettings.tsx (286 lines)

**Interfaces:**
- `PluginStats`: name, icon, status (active/idle/error), endpoint, data, action

**State:**
- `loading`, `stats: PluginStats[]` (3 default: Performance Monitor, Request Logger, Audit Logger)

**API Calls:**
- `GET /plugins/performance/stats` — performance data
- `GET /plugins/request-logger/recent?limit=10` — request logs
- `GET /plugins/audit-logger/recent?limit=10` — audit logs

**UI Elements:**
- Header: "Plugin Settings & Monitoring" title
- "Refresh All" button
- **Plugin Cards (grid):** Performance Monitor (Activity icon, shows total requests, avg response time, slow requests), Request Logger (FileText icon, shows recent logs with method/path/status code), Audit Logger (Shield icon, shows total logs + recent actions with user/timestamp/action/status)
- **Auto-Backup System section:** Blue gradient card showing backup interval (6 hours), retention (7 days), storage location (backups/auto/)

---

## 7. ADMIN

### 7.1 RoleManagement.tsx (506 lines)

**Interfaces:**
- `Permission`: id, resource, action, description
- `RolePermission`: id, resource, action, description, permissionId
- `GroupedPermissions`: Record<string, Permission[]>

**Constants:**
- ROLES = ['ADMIN', 'MANAGER', 'WORKER']
- ROLE_COLORS with color mappings
- CATEGORY_LABELS — 57 resource category display labels (DASHBOARD, FINANCE, COMPANIES, SHIPMENTS, RACKS, INVOICES, PAYMENTS, EXPENSES, MOVING_JOBS, MATERIALS, SCANNER, ANALYTICS, WORKER_DASHBOARD, MOBILE_UPLOAD, BACKUP_MANAGEMENT, SYSTEM_MONITOR, USERS, SETTINGS_x, REPORTS_x, ROLE_MANAGEMENT, BILLING, PROFILE)

**State:**
- `selectedRole: string` (default: 'MANAGER')
- `allPermissions: Permission[]`, `groupedPermissions: GroupedPermissions`
- `rolePermissions: RolePermission[]`, `selectedPermissions: Set<string>`
- `loading`, `saving`, `message`
- `searchTerm`, `expandedCategories: Set<string>`

**API Calls:**
- `GET /api/permissions` — all permissions
- `GET /api/permissions/role/:role` — role permissions
- `PUT /api/permissions/role/:role/bulk` — update permissions (body: `{ permissionIds[] }`)

**UI Elements:**
- Header: Shield icon, "Role & Permission Management", permission count badge
- **Role Tabs:** 3 role buttons (ADMIN/MANAGER/WORKER) with full-width active state
- **Role Info Box:** Shows currently configured role + description, assigned count
- **Search & Controls:** Search input (Expand All / Collapse All buttons)
- **Permission Matrix:** Grouped by resource category, each group has:
  - Checkbox (all/some/none) for bulk select
  - Category name with expand/collapse (ChevronUp/Down)
  - Count badge (selected/total)
  - Individual permission buttons (blue selected, white unselected, ADMIN disabled)
- **Action Buttons:** Reset Changes (RefreshCw), Save Changes (Save)
- **Help Text:** ADMIN cannot be modified note
- **Stats Summary:** Total Categories, Total Permissions, Role count, Coverage %

---

### 7.2 SystemMonitor.tsx (404 lines — uses MUI)

**Interfaces:**
- `ContainerStat`: name, cpu, memory, network, diskIO
- `SystemStats`: system (platform, arch, hostname, uptime, cpu/memory/disk stats), processes[], containers[]

**State:**
- `stats: SystemStats|null`, `loading`, `error`

**API Call:**
- `GET /api/system/stats` — auto-refreshes every 5 seconds

**Data Transformations:**
- `formatBytes(bytes)` — B/KB/MB/GB/TB
- `formatUptime(seconds)` — Xd Xh Xm

**UI Elements:**
- **Header:** "System Monitor" title, "Last updated" chip, Refresh button
- **CPU Card:** SpeedIcon, percentage (large), progress bar, cores, load average
- **Memory Card:** MemoryIcon, percentage, progress bar, used/total, free
- **System Info Card:** DnsIcon, hostname, OS, uptime, disk usage
- **Top Processes Table:** PID, User, Command (with tooltip), CPU %, Memory % (with color chips)
- **Docker Containers Section:** ContainerIcon, list of containers with name, status (always Running), CPU, Memory, Network I/O, Disk I/O — WMS containers highlighted

---

### 7.3 SystemMonitorEnhanced.tsx (525 lines — MUI, richer)

**Interfaces:**
- `ActiveUser`: userId, name, email, role, currentPage, lastActivity, ipAddress, userAgent, loginTime, sessionDuration, idleTime
- `SystemStats` extended with `database`, `users` (active[], statistics)

**State:**
- `stats: SystemStats|null`, `loading`, `error`

**API Call:**
- `GET /api/system/stats` — auto-refreshes every 3 seconds

**Helper Functions:**
- `formatBytes`, `formatUptime`, `formatDuration`, `getPageName`, `getRoleColor`

**UI Elements:**
- **System Resource Cards (4):** CPU %, Memory %, System Info, Active Users (online count, total users, 24h stats)
- **Online Users Panel:** Avatar with online/away badge (green/orange), name, role chip, current page (with emoji), session duration, idle time, IP
- **Docker Containers Table:** Name, CPU, Memory, Network I/O
- **Top Processes Table:** PID, User, CPU %, Memory %, Command
- **Recent Logins List:** Avatar, name, role chip, email, last login timestamp

---

## 8. REPORTS

### 8.1 ShipmentReport.tsx (962 lines)

**URL Param:** `id`

**Interfaces:**
- `ShipmentDetails`: id, referenceId, clientName/Phone/Email, companyProfileId, companyProfile, receivedAt, status, box counts, totalWeight, notes, shipmentPhotos, releasedAt, releasedBy, boxes[], withdrawals[], invoices[], releaseHistory[]

**State:**
- `shipment: ShipmentDetails|null`, `loading`, `error`
- `chargesModalOpen`, `liveCharges`

**API Calls:**
- `shipmentsAPI.getById(id)` — main shipment details
- `GET /api/shipments/:id/charges-calculation` — live charges

**Data Transformations:**
- `safeNumber(v)` — returns 0 for NaN/null
- `formatNumber(v, decimals)` — safe fixed decimal
- `getDaysStored()` — based on arrivalDate/receivedDate/createdAt
- `getCurrentStorageCharge()` — complex priority logic:
  1. If liveCharges available, use totalCharge from backend
  2. Fallback: custom CBM rate on shipment → days × CBM × rate
  3. Fallback: custom box rate → days × boxes × rate
  4. Fallback with CBM → days × CBM × 1
  5. Fallback with boxes → days × boxes × 0.5
- `getRateDisplayInfo()` — extract rate source info from liveCharges
- `getStatusBadge(status)` — IN_WAREHOUSE(green)/PARTIAL(orange)/RELEASED(gray)

**UI Elements:**
- **Header Actions (print:hidden):** Back button, "Set Custom Charges" button (gradient purple), Print Report button
- **Shipment Report Document:**
  - **Header:** Gray background with "Shipment Report", referenceId, generated date/time
  - **Status Banner:** Current status badge, storage duration, company name
  - **User Tracking Section** (blue bg): Created By (name/email/role), Assigned to Rack By
  - **Timeline & Volume Section** (green bg): Arrival Date, Created By, Volume (CBM), Days Stored
  - **Storage Charges Section** (yellow bg, conditional): Rate info (custom/company default), Current Charge, Total Invoiced, Total Paid, Outstanding Balance
  - **Client Information:** Name, Phone, Email, Arrival Date, Created By
  - **Shipment Details:** Original/Current Box Count, Pallet Breakdown (pallets with box numbers grouped by pallet), CBM
  - **Boxes & Rack Assignment:** Table with box number, rack code, zone, status
  - **Withdrawal History** (conditional): Date, Boxes withdrawn, Remaining, By, Notes, Reason, Receipt
  - **Invoice History** (conditional): Invoice #, Date, Total, Status, line items, payments
  - **Release History** (conditional): Date, Boxes, Received by, Notes
  - **Photos Section** (conditional): Image gallery

**Modal:** CustomChargesModal (reusable component)

---

### 8.2 DamageReport.tsx (351 lines)

**Interfaces:**
- `DamageRecord`: id, material (sku, name, unit), quantity, reason, photoUrls[], recordedAt, job (jobCode, jobTitle, jobAddress), recordedBy (name), estimatedValue
- `DamageSummary`: totalItems, totalValue, mostDamagedMaterial, recentDamageDate

**State:**
- `damages: DamageRecord[]`, `summary: DamageSummary|null`, `loading`
- `selectedPhoto: string|null`, `authRequired: string|null`
- `filters: { startDate, endDate, materialId }`

**API Call:**
- `GET /api/reports/damages?startDate=&endDate=&materialId=` — with auth check

**UI Elements:**
- Header: AlertTriangle icon, "Damage Report" title
- **Summary Cards (4):** Total Items, Total Value, Most Damaged Material, Recent Damage Date
- **Filters:** Date range (start/end), Material filter
- **Damage Records List/Cards:** Each shows material, quantity, reason, estimated value, job info, recorded by, recorded date, photos (clickable thumbnails)
- **Photo Lightbox Modal:** Full-size photo view
- Actions: Print, Export CSV
- Empty state when no damages

---

## 9. BACKUP MANAGEMENT (BackupManagement.tsx, 1031 lines)

**Interfaces:**
- `Backup`: name, path, size, createdAt, modifiedAt, type ('quick'|'full-system'|'auto'), directory, autoCreated
- `BackupSettings`: autoBackupEnabled, autoBackupTime, autoBackupFrequency, includeDatabase/Uploads/Code, maxBackupCount, emailNotifications, retentionDays, gitSyncEnabled, gitRepoUrl, gitBranch, gitUsername, gitEmail, gitToken, emailOnSuccess/Failure/Warning, autoDeleteOld

**Constants:**
- SECRET_PASSWORD = '24865'

**State:**
- `backups: Backup[]`, `loading`, `creating`, `creatingFull`
- `error`, `success`, `backupDir`, `maxBackups`, `stats`
- Password protection: `isUnlocked`, `passwordInput`, `passwordError`
- Settings modal: `showSettings`, `settings: BackupSettings`, `testingGit`
- Custom backup: `showCustomBackup`, `customOptions: { includeDatabase, includeUploads, includeCode, backupName }`

**API Calls (api.backups service):**
- `api.backups.getAll()` — list backups
- `api.backups.getSettings()` — load settings
- `api.backups.updateSettings(settings)` — save settings
- `api.backups.create()` — quick backup
- `api.backups.createCustom(options)` — custom backup
- `api.backups.createFullSystem()` — full system backup
- `api.backups.testGitConnection({ gitRepoUrl, gitToken, gitBranch })` — test git
- `DELETE /api/backups/download/:name` — download (direct fetch with blob)
- `api.backups.delete(name)` — delete

**UI Elements:**
- **Password Lock Screen** (when locked): Gradient dark background, lock icon, "Secure Backup Access" title, 5-digit code input, error display, "Unlock Backup System" button
- **After Unlock:**
  - **Header:** ServerStackIcon, "Secure Backup Management" title, Settings button
  - **Stats Cards (4):** Total Backups, Total Size, Quick Backups, Full System
  - **Action Buttons:** Quick Backup (blue gradient), Custom Backup (purple), Full System Backup (green gradient)
  - **Error/Success Alerts**
  - **Backups Table/List:** Name, Type, Size (formatted), Created date, Actions (Download, Delete)
  - Empty state: no backups yet
- **Settings Modal:** Auto-backup toggle + time + frequency, Include toggles (Database/Uploads/Code), Retention days, Max backup count, Email notification settings, Git Sync settings (enable, repo URL, branch, username, email, token) + Test Connection, Auto-delete old backups
- **Custom Backup Modal:** Include toggles, Backup Name input, Create button

---

## 10. ANALYTICS (CompanyAnalytics.tsx, 440 lines)

**Interfaces:**
- `CompanyStats`: id, name, logoUrl, contactPerson, total/active/released Shipments, total/current Boxes, total/current Pallets, rackLocations[], totalInvoiceAmount, outstandingBalance
- `OverallStats`: totalCompanies, totalShipments, activeShipments, totalBoxes, currentBoxes, totalPallets, currentPallets, totalRevenue, outstandingBalance
- `RackLocationInfo`: rackCode, zone, shipmentCount, boxCount, palletCount, shipments[]

**State:**
- `loading`, `companies: CompanyStats[]`, `overallStats: OverallStats|null`
- `rackLocations: RackLocationInfo[]`, `activeTab: 'companies'|'locations'`
- `searchTerm`, `sortBy: 'name'|'shipments'|'boxes'|'revenue'`

**API Call:**
- `GET /api/companies/all-analytics` — loads companies, overall stats, rack locations

**UI Elements:**
- Header: ChartBarIcon, "Company Analytics" title
- **Overall Statistics (5 cards):** Total Companies (blue), Total Shipments (purple, active count), Total Boxes (orange, in-storage count), Total Pallets (indigo), Total Revenue (green, outstanding in red)
- **Tabs:** Companies (count) + Rack Locations (count)
- **Companies Tab:**
  - Search input + Sort dropdown (Shipments/Boxes/Revenue/Name)
  - **Company Cards (grid):** Logo/placeholder, name, contact person, stats mini-grid (Shipments, Boxes, Pallets, Revenue), Rack locations (colored badges, +N more), View Details button (EyeIcon → `/company-profile/:id`)
- **Locations Tab:**
  - **Table:** Rack code (blue), Zone, Shipments (purple badge), Boxes (orange badge), Pallets (indigo badge), Details (up to 3 shipments with ref/company/boxes/pallets, "+N more")

---

## 11. WORKER DASHBOARD (WorkerDashboard.tsx, 421 lines)

**Interfaces:**
- `PendingShipment`: id, name, referenceId, customerName, category, awbNumber, arrivalDate, totalBoxes, pendingBoxes, boxes[], items[], daysSinceArrival
- `Rack`: id, code, location, capacity, currentBoxes, availableCapacity, utilizationPercent, qrCode

**State:**
- `pendingShipments: PendingShipment[]`, `availableRacks: Rack[]`
- `todayStats: { assignedToday, activitiesToday, pendingBoxes }`
- `loading`, `error`
- `selectedBoxes: Set<string>`, `selectedRackId: string`
- `categoryFilter: string` (default: 'all'), `assigning: boolean`

**API Calls:**
- `GET /api/worker/pending?category=...` — pending shipments
- `GET /api/worker/available-racks` — available racks
- `GET /api/worker/tasks` — today's stats
- `POST /api/worker/quick-assign` — body: `{ boxIds[], rackId }`

**UI Elements:**
- Header: "🔧 Worker Dashboard" title, "📱 Open Scanner" link → `/warehouse/scanner`
- **Today's Stats (3 gradient cards):** Assigned Today (green), Activities Today (blue), Pending Boxes (orange)
- **Main Layout:** 2/3 + 1/3 grid
  - **Left (Pending Shipments):**
    - Category filter dropdown (All/CUSTOMER_STORAGE/AIRPORT_CARGO/WAREHOUSE_STOCK)
    - Shipment cards with:
      - Priority color border (red >3 days, yellow >1 day, green ≤1 day)
      - Name + category badge + days old badge
      - Customer/Reference/AWB info
      - Items preview
      - Boxes grid (clickable toggles, blue when selected)
      - "Select All" button
  - **Right (Assignment Panel):**
    - Selected Boxes counter, "Clear Selection" button
    - Available Racks list (clickable, disabled if insufficient capacity), shows code, location, capacity (current/max), utilization bar
    - "Assign N Boxes" button (green, full width, disabled when nothing selected)

---

## 12. MOBILE UPLOAD (MobileUploadPage.tsx, 245 lines)

**URL Param:** `returnId`

**State:**
- `uploading`, `uploadStatus: UploadStatus|null`, `previewUrl`, `error`
- `fileInputRef: useRef`

**API Calls:**
- `GET /api/mobile-upload/:returnId/status` — check upload status
- `POST /api/mobile-upload/:returnId` — upload file (multipart/form-data)

**Data Transformations:**
- Token extraction from URL query params (`?token=...`)
- File validation: type (JPEG/PNG/PDF), size (<10MB)
- Image preview via FileReader

**UI Elements:**
- Gradient header: "📄 Upload Physical Report" / "Take a photo or select document"
- Error display (red box)
- **Before Upload:** Hidden file input (accept image/*, capture="environment"), preview image, "Take Photo / Select File" button (gradient blue-purple), format hint text
- **After Upload:** Green checkmark, "Upload Complete!", preview, "Close Window" button
- Auth redirect to /login if token missing

---

## 13. LANDING (SwiftCargoLanding.tsx, 381 lines)

**State:**
- `showLoginModal`, `email`, `password`, `showPassword`, `loading`, `error`
- `branding: Branding` (name default: 'QGO Cargo')
- `heroTitle`, `heroSubtitle`, `galleryImages` (3 defaults), `services[]`, `features[]`, `partners[]`

**API Call:**
- `GET /api/company/branding` — load branding (name, logo, hero text, gallery, services, features, partners)

**UI Elements:**
- **Navigation:** Fixed top bar, logo (image or fallback CubeIcon), "Customer Login" button
- **Hero Section:** Gradient bg, "Kuwait's #1 Logistics Partner" badge, hero title/subtitle, "Access Customer Portal" + "Our Services" buttons, Stats row (10+ Years, 194K+ Customers, 24/7 Support, 99% On-Time)
- **Scrolling Image Gallery:** Auto-scrolling image strip (CSS animation)
- **Services Section:** 4 service cards (dynamic from API) with icons (ShieldCheckIcon, GlobeAltIcon, TruckIcon, BuildingOffice2Icon)
- **Customer Portal Section:** Blue gradient bg, 4 feature cards, advanced features highlight (Photo Upload, Customizable Settings, Advanced Analytics)
- **Partners Strip (conditional):** Logo row with links
- **Contact Section:** 3 cards (Visit Us/MapPinIcon, Call Us/PhoneIcon, Email Us/EnvelopeIcon)
- **Login Modal:** Logo, "Customer Login" title, Email input (EnvelopeIcon), Password input (LockClosedIcon, show/hide toggle), Error display, "Sign In" button

---

## 14. PROFILE (UserProfile.tsx, 645 lines)

**Interfaces:**
- `UserProfile`: id, email, name, phone, role, skills, avatar, position, department, isActive, lastLoginAt, createdAt, updatedAt, company (id, name, logo, plan)
- `UserStats`: rackActivities, jobAssignments, daysSinceJoined, lastLoginAt

**State:**
- `activeTab: 'personal'|'security'|'activity'`
- `profile: UserProfile|null`, `stats: UserStats|null`, `loading`, `saving`, `message`
- `formData: { name, phone, skills, position, department }`
- `passwordData: { currentPassword, newPassword, confirmPassword }`
- `avatarUrl: string`

**API Calls:**
- `GET /api/users/profile/me` — load profile
- `PUT /api/users/profile/me` — update profile
- `GET /api/users/profile/stats` — load stats
- `PUT /api/users/profile/password` — change password `{ currentPassword, newPassword }`
- `PUT /api/users/profile/avatar` — update avatar `{ avatar }`

**UI Elements:**
- **Header:** Blue gradient banner, avatar (image or User placeholder), camera button (edit), name, email, role badge (red/green/blue), position, department
- **Company Info:** Logo, name, plan
- **Message alerts**
- **Tabs:** Personal Info (User), Security (Lock), Activity (Activity — placeholder)
- **Personal Info Tab:** Full Name, Email (disabled), Phone, Position, Department, Role (disabled), Skills textarea, Avatar URL input + "Update Avatar" button, Cancel/Save Changes buttons
- **Security Tab:** Current Password, New Password, Confirm Password, Cancel/Change Password buttons

---

## 15. DEBUG LOGIN (DebugLogin.tsx, 222 lines)

**Interfaces:**
- `LogEntry`: time, message, type (info/success/error/warning)

**State:**
- `logs: LogEntry[]`, `email` (default: 'test@example.com'), `password` (default: 'Test123!')
- `authStatus: { hasToken, hasUser, userData }`

**API Calls:**
- `POST /api/auth/login` — body: `{ email, password }`

**Data Transformations:**
- `addLog()` — prepends log entry with timestamp
- `checkAuthStatus()` — reads localStorage for token + user data

**UI Elements:**
- Header: "🔍 Login Debug Tool" title
- **Auth Status:** Token exists (green/red) + User data exists (green/red) + User data JSON display + "🗑️ Clear Auth Data" button + "🔄 Refresh" button
- **Test Login:** Email input, Password input, "🚀 Test Login" button
- **Response Logs:** Dark terminal-style log viewer (green text on black bg, monospace font, scrollable)
- **Quick Actions:** "🔙 Go to Login Page" + "📊 Go to Dashboard" buttons

---

## Summary of All API Endpoints Used

| Method | Endpoint | Component |
|--------|----------|-----------|
| GET | /api/finance/overview | FinanceOverview |
| GET | /api/finance/top-customers?limit=5 | FinanceOverview |
| GET | /api/finance/transactions?limit=10 | FinanceOverview |
| GET | /api/billing/invoices?includeShipment=true | AdvancesList |
| GET | /api/finance/companies | CompanyFinancials |
| GET | /api/finance/transactions?limit=100 | GlobalTransactions |
| GET | /api/finance/inventory | InventoryFinancials |
| POST | /api/prepaid/balance | ContractActionModal |
| GET | /api/prepaid/balances?includeDetails=true | ContractsList |
| PUT | /api/contracts/:id | ContractsList, CompanyProfile |
| GET | /api/contracts/statement/:id | ContractStatementModal |
| POST | /api/billing/shipments/:id/advance | RecordAdvanceModal |
| GET/POST/PUT/DELETE | /api/companies | CompaniesManagement |
| POST | /api/companies/:id/send-statement | CompanyProfile |
| GET | /api/companies/:id/analytics | CompanyProfile |
| GET | /api/contracts/customer/:id | CompanyProfile |
| GET | /api/contracts/payment-history/:id | CompanyProfile |
| POST | /api/contracts/generate-invoice/:id | CompanyProfile |
| POST | /api/contracts/record-payment/:id | CompanyProfile |
| GET/PUT | /api/companies/:id | CompanyProfile (billing/advance) |
| GET | /api/shipments?companyProfileId=... | CompanyProfile, WorkerDashboard |
| GET | /api/billing/shipments/:id/live-charges | CompanyProfile |
| GET | /api/billing/invoices?companyProfileId=... | CompanyProfile |
| GET | /api/billing/invoices (filtered) | Invoices |
| GET | /api/billing/invoices/:id | InvoiceDetail |
| GET | /api/billing/settings | InvoiceDetail, BillingSettings |
| GET/PUT | /api/template-settings | InvoiceDetail, TemplateSettings |
| POST | /api/upload/logo | TemplateSettings |
| GET/PUT | /api/email/settings | EmailSettings |
| GET/PUT | /api/email/notifications | EmailSettings |
| POST | /api/email/test | EmailSettings |
| GET | /api/email/stats | EmailSettings |
| GET | /api/permissions | RoleManagement |
| GET | /api/permissions/role/:role | RoleManagement |
| PUT | /api/permissions/role/:role/bulk | RoleManagement |
| GET | /api/system/stats | SystemMonitor, SystemMonitorEnhanced |
| GET | /api/reports/damages | DamageReport |
| GET/POST/PUT/DELETE | /api/backups/* | BackupManagement |
| GET | /api/companies/all-analytics | CompanyAnalytics |
| GET | /api/worker/pending, /racks, /tasks | WorkerDashboard |
| POST | /api/worker/quick-assign | WorkerDashboard |
| GET | /api/mobile-upload/:id/status | MobileUploadPage |
| POST | /api/mobile-upload/:id | MobileUploadPage |
| GET | /api/company/branding | SwiftCargoLanding |
| POST | /api/auth/login | DebugLogin, SwiftCargoLanding |
| GET/PUT | /api/users/profile/me | UserProfile |
| GET | /api/users/profile/stats | UserProfile |
| PUT | /api/users/profile/password | UserProfile |
| PUT | /api/users/profile/avatar | UserProfile |
| GET | /api/shipments/:id/charges-calculation | ShipmentReport |
| GET | /api/plugins/performance/stats | PluginSettings |
| GET | /api/plugins/request-logger/recent | PluginSettings |
| GET | /api/plugins/audit-logger/recent | PluginSettings |

## Summary of All Reusable Modal Components

1. **RecordAdvanceModal** — Record advance payment for a shipment
2. **RecordPaymentModal** — Record payment against an invoice (used in InvoiceDetail, CompanyProfile)
3. **ContractActionModal** — Manage contract / add funds
4. **ContractStatementModal** — View full contract statement
5. **CreateExpenseModal** — Create new expense
6. **EditExpenseModal** — Edit existing expense
7. **CustomChargesModal** — Set custom charges on a shipment

## Summary of State Patterns

- **~200+ distinct state variables** across all components
- Primary patterns: `useState` for all state, `useEffect` for data loading
- Some `useMemo` (RoleManagement filtering)
- `useRef` (MobileUpload file input)
- `useNavigate` for navigation in most pages
- `useParams` for URL parameters (CompanyProfile, InvoiceDetail, ShipmentReport, MobileUploadPage)
- `useLocation` in Settings for URL-based tab routing

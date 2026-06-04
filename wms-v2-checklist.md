# WMS v2 — Complete Fix Checklist

## 🚨 CRITICAL (Pages Crashing)
- [ ] **Shipments page blank** — API field mismatch (use referenceId, not trackingNumber)
- [ ] **Finance page blank** — Check API response format
- [ ] **Scanner page blank** — Check Html5Qrcode and API integration

## 📋 DATA MAPPING (Frontend types ≠ API response)
- [ ] API returns `name` → Shipment type has `trackingNumber` 
- [ ] API returns `originalBoxCount` → type has `totalBoxes`
- [ ] API returns `currentBoxCount` → type has same ✓
- [ ] API returns `referenceId` → type has `referenceId` ✓
- [ ] ShipmentPhotos format — check if array of URLs or objects
- [ ] Rack API response — check field names match types

## 📦 SHIPMENTS — Full Feature Parity
- [ ] Shipment list renders with real data
- [ ] Folder/Table view toggle
- [ ] Search + filters work
- [ ] Detail modal shows all info (client, boxes, dimensions, move history)
- [ ] Create shipment modal (all fields)
- [ ] Edit shipment modal (pre-filled, locked if rack-assigned)
- [ ] Release modal (FULL/PARTIAL, charges, invoice, photos, collector ID)
- [ ] Withdrawal modal (box count, collector, reason, photos, live charges)
- [ ] Photo lightbox (full-screen, nav, thumbnails)
- [ ] Manual assign (Scanner feature) — SELECT shipment → SELECT rack
- [ ] Move shipment between racks (destination scan)
- [ ] Box distribution tree by rack
- [ ] Charges section (CustomChargesModal)
- [ ] Move history (expandable per shipment)

## 📸 SCANNER — Full Feature Parity  
- [ ] Camera opens and scans QR codes
- [ ] Detect shipment vs rack from QR
- [ ] Shipment scan → assign to rack flow
- [ ] Rack scan → show info
- [ ] Manual code entry (when camera not available)
- [ ] Pending shipments list tab
- [ ] Choose rack from list
- [ ] Sound alerts (success/error/warning beeps)
- [ ] Photo capture during assignment
- [ ] Move shipment between racks (scan destination)
- [ ] Manual move (select shipment → select source → select destination)
- [ ] Assignment modal (pallet/box count, photos)
- [ ] Scan history list
- [ ] 3s cooldown between same QRs

## 🏗️ RACKS — Full Feature Parity
- [ ] Grid view with capacity bars
- [ ] Table view
- [ ] Create/Edit rack modal
- [ ] Bulk add racks (prefix, count)
- [ ] Rack map (zone-based grid, color-coded)
- [ ] Dimension/CBM manager per rack
- [ ] Search + filter

## 📊 MATERIALS — Full Feature Parity
- [ ] Dashboard tab (summary, low stock alerts, activity)
- [ ] Inventory tab (table, CRUD, color-coded rows)
- [ ] Purchase Orders tab (list, create, status)
- [ ] Reports tab (usage, movement, waste)
- [ ] Approvals tab (pending, approve/reject)

## 🚚 MOVING JOBS — Full Feature Parity
- [ ] Job cards grid
- [ ] Create/Edit job modal
- [ ] Job details (info, materials, files, timeline, costs)
- [ ] File manager (upload/download/delete)
- [ ] Materials manager (issue/return/track)
- [ ] Approval manager (approve/reject material requests)
- [ ] Monthly jobs report
- [ ] Delete with confirmation

## 💰 FINANCE — Full Feature Parity
- [ ] Overview tab (revenue, collected, pending, chart)
- [ ] Invoices tab (list, CRUD, payments)
- [ ] Expenses tab (list, CRUD, category stats)
- [ ] Record payment modal

## 🏢 COMPANIES — Full Feature Parity
- [ ] Company cards grid
- [ ] Create/Edit with logo upload
- [ ] Contract management (create, extend, suspend)
- [ ] Contract statement modal
- [ ] Prepaid balance display
- [ ] Delete with confirmation

## ⚙️ SETTINGS — Full Feature Parity
- [ ] Company settings (edit, logo)
- [ ] User management (CRUD, toggle active)
- [ ] Billing settings
- [ ] Invoice settings
- [ ] Shipment configuration
- [ ] Notification preferences
- [ ] Email settings (SMTP, test)
- [ ] Template settings
- [ ] Plugin settings

## 🛡️ ADMIN & BACKUPS
- [ ] Role management
- [ ] System monitor (health, uptime, logs)
- [ ] Backups list, create, settings

## 🎨 UI & UX
- [ ] Dark mode consistent
- [ ] Loading/error/empty states everywhere
- [ ] Responsive design
- [ ] Photo uploads working

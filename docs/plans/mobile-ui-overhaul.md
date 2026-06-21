# WMS Mobile UI Overhaul — Implementation Plan

> **For Hermes:** Execute task-by-task, auto-git-commit after each.

**Goal:** Make WMS fully usable on mobile phones (warehouse staff use phones daily for Moving Jobs, Scanner, Materials).

**Architecture:** Tailwind responsive classes. No new libraries. Fix tables, grids, forms, and navigation for mobile-first experience.

**Audit Results:**
- ✅ Dashboard: 42 responsive classes — good
- ✅ MobileNav: clean bottom nav with animations
- ✅ Main content: `pb-24` for MobileNav clearance
- ❌ MovingJobs: only 4 responsive classes — critical
- ❌ 10+ pages with tables lacking `overflow-x-auto`
- ❌ 10+ pages with grids lacking mobile breakpoints
- ❌ Forms likely non-responsive

---

## Phase 1: Critical Pages (Warehouse workers' daily tools)

### Task 1: Moving Jobs — table overflow fix
**File:** `frontend/src/pages/MovingJobs/MovingJobs.tsx`
- Add `overflow-x-auto` wrapper around job cards/table
- Add `min-w-[640px]` or `md:min-w-0` to table to enable horizontal scroll on mobile
- Cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for job cards

### Task 2: Moving Jobs — filter/search bar responsive
**File:** `frontend/src/pages/MovingJobs/MovingJobs.tsx`
- Search + filters: `flex-col md:flex-row` stacking
- Buttons: `w-full md:w-auto` on mobile

### Task 3: Moving Jobs — Job detail/modal mobile
**File:** `frontend/src/components/moving-jobs/JobMaterialReport.tsx`
- Modal: `max-w-[95vw]` instead of `max-w-6xl` on mobile
- Summary cards: `grid-cols-2 md:grid-cols-5`
- Table: `overflow-x-auto` wrapper

### Task 4: Materials Management — table responsive
**File:** `frontend/src/pages/Materials/MaterialsManagement.tsx`
- Add `overflow-x-auto` to all tables
- Filter bar: `flex-col md:flex-row`

### Task 5: Material Reports — table + print
**File:** `frontend/src/pages/Materials/MaterialReports.tsx`
- Add `overflow-x-auto` to stock statement table
- Summary cards: `grid-cols-2 md:grid-cols-5`
- Print already has `print-only-report` CSS ✅

---

## Phase 2: Secondary Pages

### Task 6: Shipments — table + filters responsive
**Files:** `frontend/src/pages/Shipments/` (find main list component)
- Table: `overflow-x-auto` wrapper
- Filters: stacked on mobile
- Shipment cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

### Task 7: Racks page responsive
**File:** `frontend/src/pages/Racks/RacksPage.tsx`
- Rack grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`
- Add `overflow-x-auto` to any tables

### Task 8: Finance pages responsive
**Files:** `frontend/src/pages/Finance/`, `frontend/src/pages/Expenses/`
- Tables: `overflow-x-auto` wrappers
- Summary cards: mobile stacking

---

## Phase 3: Navigation & UX Polish

### Task 9: MobileNav — add Moving Jobs to bottom bar
**File:** `frontend/src/components/Layout/MobileNav.tsx`
- Current: Home, Shipments, Scanner, Racks, More
- Problem: Most-used "Moving Jobs" is inside "More" menu
- Fix: Replace "Racks" with "Jobs" (Moving Jobs) since warehouse staff use Jobs more than Racks
- OR: Make 5-tab layout with smaller icons

### Task 10: Forms — mobile-friendly inputs
**Check all forms:**
- All `<input>`, `<select>`, `<textarea>` should have `w-full` on mobile
- Submit buttons: `w-full md:w-auto`
- Modal forms: `max-h-[85vh] overflow-y-auto`

### Task 11: Touch targets — minimum 44px
**Global check:**
- All clickable elements (buttons, links, icons): `min-h-[44px] min-w-[44px]`
- Add `touch-target` utility class if absent
- Check MobileNav already has `touch-target` ✅

---

## Phase 4: Polish

### Task 12: Loading states mobile
- All loading spinners centered: `flex items-center justify-center min-h-[200px]`
- Skeleton placeholders for tables on slow connections

### Task 13: Error states mobile
- Error messages: `p-4 text-center` not cut off
- Toast position: bottom-center on mobile (not top-right)

### Task 14: Test on actual mobile
- Deploy and test on phone browser
- Check all critical flows:
  1. Login → Moving Jobs → Open Job → Report → Print/CSV
  2. Scanner → Scan QR → View result
  3. Materials → Filter → Download report
  4. Shipments → View details

---

## Quick Wins (Do First — 1 hour total)

| # | What | Where | Effort |
|---|---|---|---|
| 1 | Add `overflow-x-auto` to ALL tables in 10+ pages | Global grep-replace | 15 min |
| 2 | Grid breakpoints: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` | All pages with `grid grid-cols-` | 20 min |
| 3 | MobileNav: add Jobs tab | MobileNav.tsx | 10 min |
| 4 | Forms: `w-full` on mobile inputs | Global check | 15 min |

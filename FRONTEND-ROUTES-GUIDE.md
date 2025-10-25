# Frontend Routes Configuration - Moving Jobs v3.0

## New Routes Added to App.tsx

The following routes have been added to support the Moving Jobs v3.0 system:

### 1. Jobs Management Route
**Path**: `/jobs-management`  
**Component**: `MovingJobsManager`  
**Roles**: ADMIN, MANAGER  
**Purpose**: Create, view, and manage moving jobs

```tsx
<Route path="jobs-management" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
    <MovingJobsManager />
  </ProtectedRoute>
} />
```

**Features**:
- Create new moving jobs with client details
- View all jobs in table format
- Status-based color coding
- Real-time data fetching from `/api/moving-jobs`

---

### 2. Materials Management Route
**Path**: `/materials-management`  
**Component**: `MaterialsManager`  
**Roles**: ADMIN, MANAGER  
**Purpose**: Manage material catalog, allocations, and returns

```tsx
<Route path="materials-management" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
    <MaterialsManager />
  </ProtectedRoute>
} />
```

**Features**:
- **Materials Tab**: Add materials to catalog with SKU, name, category
- **Issues Tab**: View materials allocated to jobs
- **Returns Tab**: Record returned/damaged materials
- Integration with `/api/materials` endpoints

---

### 3. Job Reports Route
**Path**: `/job-reports`  
**Component**: `JobReportsDashboard`  
**Roles**: ADMIN, MANAGER  
**Purpose**: View financial analytics and cost reports

```tsx
<Route path="job-reports" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
    <JobReportsDashboard />
  </ProtectedRoute>
} />
```

**Features**:
- **Profitability Summary Tab**:
  - Total revenue, costs, profit display
  - Average profit margin calculation
  - Color-coded metrics (green for profit, red for costs)
  
- **Cost Breakdown Tab**:
  - Materials, labor, damage cost analysis
  - Percentage of total calculations
  - Detailed line-by-line breakdown

- **Material Costs Tab**:
  - Material spend by job
  - SKU and quantity tracking
  - Cost per material

Data sources:
- `/api/reports/profitability` - Company-wide metrics
- `/api/reports/material-costs` - Material spend details

---

### 4. Approvals Route
**Path**: `/approvals`  
**Component**: `ApprovalManager`  
**Roles**: ADMIN, MANAGER  
**Purpose**: Review and process approval requests

```tsx
<Route path="approvals" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
    <ApprovalManager />
  </ProtectedRoute>
} />
```

**Features**:
- Filter approvals by status (PENDING, APPROVED, REJECTED)
- Filter by type (DAMAGE, PREMIUM_MATERIAL, QUANTITY_VARIATION)
- Review modal for detailed decision
- Add notes to approval decisions
- Approve or reject with timestamp tracking

Data sources:
- `GET /api/materials/approvals` - List all approvals
- `PATCH /api/materials/approvals/:id` - Record decision

---

### 5. Plugin System Route
**Path**: `/plugin-system`  
**Component**: `PluginSystemManager`  
**Roles**: ADMIN (exclusive)  
**Purpose**: Install, manage, and monitor plugins

```tsx
<Route path="plugin-system" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <PluginSystemManager />
  </ProtectedRoute>
} />
```

**Features**:
- **Installed Plugins Tab**:
  - List all installed plugins with status
  - Enable/disable toggle buttons
  - Uninstall option
  - View audit logs link

- **Install Plugin Tab**:
  - Plugin installation form
  - Name, version, description fields
  - Admin-only installation

- **Audit Logs Tab**:
  - Complete activity history
  - Action type tracking (INSTALLED, ACTIVATED, DEACTIVATED, UNINSTALLED)
  - Timestamp and user tracking

Data sources:
- `GET /api/plugins` - List plugins
- `POST /api/plugins` - Install plugin
- `PATCH /api/plugins/:id/activate` - Activate
- `PATCH /api/plugins/:id/deactivate` - Disable
- `DELETE /api/plugins/:id` - Uninstall
- `GET /api/plugins/:id/logs` - Audit trail

---

## Component Import Hierarchy

```
App.tsx
├── MovingJobsManager (hooks: useState, useEffect, fetch)
├── MaterialsManager (3-tab tabbed interface)
├── JobReportsDashboard (metrics and tables)
├── ApprovalManager (filtering and modal workflow)
└── PluginSystemManager (plugin lifecycle management)
```

## Authentication Flow

All routes are wrapped with `<ProtectedRoute>`:

```tsx
<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
  <Component />
</ProtectedRoute>
```

This ensures:
1. User must be authenticated (have valid JWT token)
2. User must have one of the specified roles
3. Request redirects to login if not authenticated
4. Component hidden if user lacks required role

## Navigation Integration

Add these links to your navigation menu:

```tsx
const navigationLinks = [
  { path: '/jobs-management', label: 'Jobs', roles: ['ADMIN', 'MANAGER'] },
  { path: '/materials-management', label: 'Materials', roles: ['ADMIN', 'MANAGER'] },
  { path: '/job-reports', label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
  { path: '/approvals', label: 'Approvals', roles: ['ADMIN', 'MANAGER'] },
  { path: '/plugin-system', label: 'Plugins', roles: ['ADMIN'] },
];
```

## Session & Data Persistence

All components use:
- `localStorage.getItem('token')` for JWT authentication
- React hooks (useState, useEffect) for state management
- Fetch API with Bearer token headers

Example token usage:
```tsx
fetch('/api/materials', {
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}` 
  }
})
```

## Styling & UI Framework

All components use **inline CSS styles** (no external CSS framework):
- Consistent color scheme (blues, greens, reds for status)
- Responsive grid layouts
- Tab-based navigation
- Modal dialogs for critical actions
- Badge components for status indicators

Color scheme used:
- Primary: `#007bff` (Blue)
- Success: `#28a745` (Green)
- Warning: `#ffc107` (Yellow)
- Danger: `#dc3545` (Red)
- Secondary: `#6c757d` (Gray)

## Error Handling

Each component implements:
1. Try-catch blocks around API calls
2. `alert()` notifications for errors
3. Loading states during data fetching
4. Empty state messages when no data

## TypeScript Interfaces

Each component defines its own data interfaces:

```tsx
interface MovingJob {
  id: string;
  jobCode: string;
  jobTitle: string;
  // ... other fields
}

interface MaterialApproval {
  id: string;
  materialName: string;
  // ... other fields
}
```

## Performance Optimizations

1. **Data Fetching**: `useEffect` dependency arrays prevent unnecessary re-renders
2. **Lazy Loading**: Components load data only when mounted
3. **Tab Switching**: No re-fetch when switching tabs (local state)
4. **Filter Operations**: Client-side filtering for quick response

## Accessibility Features

- Semantic HTML elements (forms, buttons, tables)
- Descriptive button labels
- Clear form field labels
- Status indicators with color + text
- Keyboard-navigable interfaces

## Testing Considerations

For unit testing:

```tsx
// Example test structure
describe('MovingJobsManager', () => {
  it('should fetch jobs on mount', () => {
    render(<MovingJobsManager />);
    expect(fetchMock).toHaveBeenCalledWith('/api/moving-jobs', ...);
  });
  
  it('should display jobs in table', () => {
    // Verify table rendering
  });
});
```

## Troubleshooting Routes

**Routes not showing?**
- Check user role matches allowed roles
- Verify JWT token exists in localStorage
- Check browser console for 401/403 errors

**Data not loading?**
- Verify API server is running
- Check network tab for failed requests
- Ensure correct endpoint paths
- Verify token is valid

**Components not rendering?**
- Check for TypeScript errors
- Verify component import paths
- Check React DevTools for component tree
- Ensure all dependencies are installed

---

**Configuration Version**: 1.0  
**Last Updated**: December 2024  
**React Version**: 18+  
**TypeScript Version**: 5+

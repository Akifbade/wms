# Frontend Integration Guide - Moving Jobs v2.0

## Step-by-Step Integration Instructions

### Step 1: Update Your Main App Router

Edit `frontend/src/App.tsx` or your router configuration file:

```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MovingJobsManager from './components/moving-jobs/MovingJobsManager';
import MaterialsManager from './components/moving-jobs/MaterialsManager';
import JobReportsDashboard from './components/moving-jobs/JobReportsDashboard';
import PluginSystemManager from './components/moving-jobs/PluginSystemManager';

function App() {
  return (
    <Router>
      <Routes>
        {/* Existing routes */}
        
        {/* New Moving Jobs Routes */}
        <Route path="/moving-jobs" element={<MovingJobsManager />} />
        <Route path="/materials" element={<MaterialsManager />} />
        <Route path="/reports" element={<JobReportsDashboard />} />
        <Route path="/plugins" element={<PluginSystemManager />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### Step 2: Add Navigation Menu Items

Update your navigation component to include the new routes:

```typescript
// In your Navigation/Sidebar component
const navigationItems = [
  { label: 'Home', path: '/', icon: 'Home' },
  { label: 'Moving Jobs', path: '/moving-jobs', icon: 'Truck' },
  { label: 'Materials', path: '/materials', icon: 'Box' },
  { label: 'Reports', path: '/reports', icon: 'BarChart3' },
  { label: 'Plugins', path: '/plugins', icon: 'Zap' },
];

return (
  <nav>
    {navigationItems.map(item => (
      <Link key={item.path} to={item.path}>
        {item.label}
      </Link>
    ))}
  </nav>
);
```

### Step 3: Verify Environment Variables

Ensure your `.env.local` file has:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Check Component Imports

All components use these imports - ensure they're available:

```typescript
// React
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// HTTP Client
import axios from 'axios';

// Icons
import { Plus, Edit, Trash2, Eye, ToggleRight, ToggleLeft } from 'lucide-react';
```

### Step 5: Install Missing Dependencies (if any)

```bash
cd frontend
npm install react-router-dom axios lucide-react
```

### Step 6: Verify Backend is Running

The components expect the backend API to be running on port 5000:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## Component API Integration Details

### MovingJobsManager
**API Endpoints Used:**
- `GET /jobs` - Fetch all jobs with filters
- `POST /jobs` - Create new job
- `PUT /jobs/:id` - Update job
- `DELETE /jobs/:id` - Delete job
- `GET /jobs/:id` - Get job details
- `GET /jobs/:id/team-members` - Get team members

**Props Expected:** None (standalone component)

**State Managed:**
- jobs: Job[]
- selectedJob: Job | null
- loading: boolean
- error: string | null

---

### MaterialsManager
**API Endpoints Used:**
- `GET /materials` - List materials
- `POST /materials` - Create material
- `POST /materials/purchase` - Purchase stock
- `POST /materials/allocate/:jobId` - Allocate to job

**Props Expected:** None (standalone component)

**State Managed:**
- materials: Material[]
- purchases: PurchaseRecord[]
- loading: boolean
- error: string | null

---

### JobReportsDashboard
**API Endpoints Used:**
- `GET /reports/dashboard/all-jobs` - Get all job costs
- `GET /reports/job-cost/:jobId` - Get specific job cost
- `GET /reports/materials/consumption/:jobId` - Material consumption

**Props Expected:** None (standalone component)

**State Managed:**
- jobs: JobWithCosts[]
- dateRange: { start: Date, end: Date }
- loading: boolean

---

### PluginSystemManager
**API Endpoints Used:**
- `GET /plugins` - List plugins
- `POST /plugins/install` - Install plugin
- `PATCH /plugins/:id/enable` - Enable plugin
- `PATCH /plugins/:id/disable` - Disable plugin
- `PATCH /plugins/:id/config` - Update config
- `DELETE /plugins/:id` - Delete plugin
- `GET /plugins/:id/logs` - Get audit logs

**Props Expected:** None (standalone component)

**State Managed:**
- plugins: PluginFeature[]
- loading: boolean
- error: string | null

---

## Authorization Header Setup

Components automatically include JWT token in requests:

```typescript
const token = localStorage.getItem('authToken');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

Ensure your login/auth component saves the token:

```typescript
// After successful login
localStorage.setItem('authToken', response.data.token);
```

---

## Common API Response Format

All endpoints follow this format:

```typescript
{
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## Error Handling

Components handle errors gracefully:

```typescript
.catch((error) => {
  setError(error.response?.data?.message || 'Failed to fetch data');
  console.error('API Error:', error);
});
```

---

## Testing the Integration

### Test 1: Moving Jobs
1. Navigate to `/moving-jobs`
2. Click "نئی نوکری" (New Job)
3. Fill form and create job
4. Verify job appears in list

### Test 2: Materials
1. Navigate to `/materials`
2. Create a material
3. Purchase stock
4. Verify material appears with correct stock count

### Test 3: Reports
1. Navigate to `/reports`
2. Select date range
3. View cost breakdowns
4. Verify calculations are correct

### Test 4: Plugins
1. Navigate to `/plugins`
2. Install a test plugin
3. Enable/disable toggle
4. Update configuration
5. Verify changes persist

---

## Performance Optimization

### Lazy Loading (Optional)

If you want to optimize bundle size:

```typescript
import React, { Suspense, lazy } from 'react';

const MovingJobsManager = lazy(() => import('./components/moving-jobs/MovingJobsManager'));
const MaterialsManager = lazy(() => import('./components/moving-jobs/MaterialsManager'));
const JobReportsDashboard = lazy(() => import('./components/moving-jobs/JobReportsDashboard'));
const PluginSystemManager = lazy(() => import('./components/moving-jobs/PluginSystemManager'));

// In Routes
<Suspense fallback={<div>Loading...</div>}>
  <Route path="/moving-jobs" element={<MovingJobsManager />} />
</Suspense>
```

### Caching (Optional)

Add React Query for better caching:

```bash
npm install @tanstack/react-query
```

---

## Troubleshooting

### Components show "Failed to fetch data"
- Check backend is running on port 5000
- Verify `VITE_API_URL` in .env.local
- Check browser console for CORS errors

### TypeScript errors on import.meta.env
- This is normal for Vite projects
- The env variables work at runtime
- If you want to suppress warnings, add type hints:

```typescript
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL: string;
    };
  }
}
```

### "Cannot find module" errors
- Run `npm install` in frontend directory
- Verify all imports use correct paths
- Check file naming (case-sensitive on Linux/Mac)

### Components don't appear in navigation
- Verify routes are added to Routes in App.tsx
- Check routing component is wrapping pages
- Verify navigation links have correct paths

---

## Next Steps

1. ✅ Add routes to App.tsx
2. ✅ Add navigation menu items
3. ✅ Test each component page load
4. ✅ Test CRUD operations
5. ✅ Verify cost calculations
6. ✅ Deploy to staging environment

---

## API Endpoint Verification Checklist

Before moving to production, verify these endpoints work:

```bash
# Jobs
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/jobs
curl -X POST http://localhost:5000/api/jobs -H "Content-Type: application/json"

# Materials
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/materials
curl -X POST http://localhost:5000/api/materials/purchase

# Reports
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/reports/dashboard/all-jobs

# Plugins
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/plugins
```

---

## Need Help?

Refer to these files:
- Main documentation: `MOVING-JOBS-V2-DOCUMENTATION.md`
- Backend routes: `backend/src/routes/`
- Frontend components: `frontend/src/components/moving-jobs/`
- Database schema: `backend/prisma/schema.prisma`

---

**Status**: ✅ Ready for Integration  
**Last Updated**: October 24, 2025  
**Version**: 2.0.0

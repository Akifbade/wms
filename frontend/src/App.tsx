import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { VersionBadge } from './components/VersionBadge';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { FinanceDashboard } from './pages/Finance/FinanceDashboard';
import { Shipments } from './pages/Shipments/Shipments';
import ShipmentReport from './pages/ShipmentReport/ShipmentReport';
import { Racks } from './pages/Racks/Racks';
import { MovingJobs } from './pages/MovingJobs/MovingJobs';
import { Settings } from './pages/Settings/Settings';
import { Scanner } from './pages/Scanner/Scanner';
import { Login } from './pages/Login/Login';
import { SwiftCargoLanding } from './pages/Landing/SwiftCargoLanding';
import { Invoices } from './pages/Invoices/Invoices';
import { InvoiceDetail } from './pages/Invoices/InvoiceDetail';
import { CompanyProfile } from './pages/CompanyProfile/CompanyProfile';
import { CompaniesManagement } from './pages/Companies/CompaniesManagement';
import { Expenses } from './pages/Expenses/Expenses';
import { TemplateSettingsPage } from './pages/Settings/TemplateSettings';
import EmailSettings from './pages/Settings/EmailSettings';
import UserProfile from './pages/Profile/UserProfile';
import JobReportsDashboard from './components/moving-jobs/JobReportsDashboard';
import ApprovalManager from './components/moving-jobs/ApprovalManager';
import MaterialReports from './pages/Materials/MaterialReports';
import MaterialsHub from './pages/Materials/MaterialsHub';
import { DamageReport } from './components/reports/DamageReport';
import { DebugLogin } from './pages/DebugLogin';
import BackupManagement from './pages/BackupManagement/BackupManagement';
import RoleManagement from './pages/Admin/RoleManagement';
import SystemMonitorEnhanced from './pages/Admin/SystemMonitorEnhanced';
import CompanyAnalytics from './pages/Analytics/CompanyAnalytics';

import { getAuthToken } from './services/api';
import { PermissionProvider } from './contexts/PermissionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for valid auth token on app load
    const checkAuth = () => {
      const token = getAuthToken();
      const user = localStorage.getItem('user');

      if (token && user) {
        // Token exists, verify it's not expired
        try {
          JSON.parse(user); // Verify valid JSON
          setIsAuthenticated(true);
        } catch (error) {
          // Invalid user data, clear auth
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionProvider>
      <Router>
        <GlobalErrorBoundary>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/landing" element={<SwiftCargoLanding />} />
            <Route path="/debug-login" element={<DebugLogin />} />



            {/* Protected Routes */}
            <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* ADMIN & MANAGER Routes */}
              <Route path="dashboard" element={
                <Dashboard />
              } />
              <Route path="finance" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <FinanceDashboard />
                </ProtectedRoute>
              } />
              <Route path="shipments" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Shipments />
                </ProtectedRoute>
              } />
              <Route path="shipment-report/:id" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <ShipmentReport />
                </ProtectedRoute>
              } />
              <Route path="racks" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Racks />
                </ProtectedRoute>
              } />
              <Route path="materials" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <MaterialsHub />
                </ProtectedRoute>
              } />
              <Route path="material-reports" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <MaterialReports />
                </ProtectedRoute>
              } />
              <Route path="damage-report" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <DamageReport />
                </ProtectedRoute>
              } />
              <Route path="moving-jobs" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <MovingJobs />
                </ProtectedRoute>
              } />
              <Route path="moving-jobs/:jobId" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <MovingJobs />
                </ProtectedRoute>
              } />
              <Route path="job-reports" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <JobReportsDashboard />
                </ProtectedRoute>
              } />
              <Route path="approvals" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <ApprovalManager />
                </ProtectedRoute>
              } />
              <Route path="invoices" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="invoices/:id" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <InvoiceDetail />
                </ProtectedRoute>
              } />
              <Route path="company-profile/:profileId" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <CompanyProfile />
                </ProtectedRoute>
              } />
              <Route path="companies" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <CompaniesManagement />
                </ProtectedRoute>
              } />
              <Route path="expenses" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Expenses />
                </ProtectedRoute>
              } />

              {/* ADMIN Only Routes */}
              <Route path="admin/role-management" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <RoleManagement />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="settings/:section" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="settings/templates" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <TemplateSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="settings/email" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <EmailSettings />
                </ProtectedRoute>
              } />
              <Route path="backups" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <BackupManagement />
                </ProtectedRoute>
              } />
              <Route path="system-monitor" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <SystemMonitorEnhanced />
                </ProtectedRoute>
              } />



              {/* All Roles - Scanner & Profile */}
              <Route path="scanner" element={<Scanner />} />
              <Route path="profile" element={<UserProfile />} />

              {/* Worker-specific routes */}
              <Route path="my-jobs" element={
                <ProtectedRoute allowedRoles={['WORKER']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">My Jobs</h1>
                    <p className="text-gray-600 mt-2">Your assigned moving jobs will appear here</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="my-tasks" element={
                <ProtectedRoute allowedRoles={['WORKER']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">My Tasks</h1>
                    <p className="text-gray-600 mt-2">Your current tasks and assignments</p>
                  </div>
                </ProtectedRoute>
              } />
            </Route>

            {/* Catch all - redirect based on role */}
            <Route path="*" element={<Navigate to="/scanner" replace />} />
          </Routes>
          <VersionBadge />
        </GlobalErrorBoundary>
      </Router>
    </PermissionProvider>
  );
}

export default App;

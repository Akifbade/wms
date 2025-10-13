import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Shipments } from './pages/Shipments/Shipments';
import { Racks } from './pages/Racks/Racks';
import { MovingJobs } from './pages/MovingJobs/MovingJobs';
import { Settings } from './pages/Settings/Settings';
import { Scanner } from './pages/Scanner/Scanner';
import { Login } from './pages/Login/Login';
import { Invoices } from './pages/Invoices/Invoices';
import { InvoiceDetail } from './pages/Invoices/InvoiceDetail';
import { Expenses } from './pages/Expenses/Expenses';
import { getAuthToken } from './services/api';

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
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="racks" element={<Racks />} />
          <Route path="moving-jobs" element={<MovingJobs />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
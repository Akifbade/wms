import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './layouts/Sidebar'
import Dashboard from './pages/dashboard/Dashboard'
import ShipmentsPage from './pages/shipments/ShipmentsPage'
import RacksPage from './pages/racks/RacksPage'
import FinancePage from './pages/finance/FinancePage'
import MaterialsPage from './pages/materials/MaterialsPage'
import CustomersPage from './pages/customers/CustomersPage'
import JobsPage from './pages/jobs/JobsPage'
import ScannerPage from './pages/scanner/ScannerPage'
import SettingsPage from './pages/settings/SettingsPage'
import type { DashboardStats } from './shared/types'
import { fetchDashboard } from './shared/api'

function MainContent() {
  const [collapsed, setCollapsed] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/') {
      setLoading(true)
      fetchDashboard().then(data => {
        setDashboardData(data)
        setLoading(false)
      })
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="p-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard data={dashboardData} loading={loading} />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/racks" element={<RacksPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MainContent />
    </BrowserRouter>
  )
}

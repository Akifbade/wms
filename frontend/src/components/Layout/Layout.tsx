import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CubeIcon,
  TruckIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  ArchiveBoxIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { VersionBadgeHeader } from '../VersionBadgeHeader';

// Role-based navigation configuration
const navigationConfig = {
  ADMIN: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Shipments', href: '/shipments', icon: ArchiveBoxIcon },
    { name: 'Racks', href: '/racks', icon: CubeIcon },
    { name: 'Materials', href: '/materials', icon: DocumentTextIcon },
    { name: 'Material Reports', href: '/material-reports', icon: ChartBarIcon },
    { name: 'Damage Report', href: '/damage-report', icon: ExclamationTriangleIcon },
    { name: 'Moving Jobs', href: '/moving-jobs', icon: TruckIcon },
    { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
    { name: 'Expenses', href: '/expenses', icon: BanknotesIcon },
    { name: 'Scanner', href: '/scanner', icon: QrCodeIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ],
  MANAGER: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Shipments', href: '/shipments', icon: ArchiveBoxIcon },
    { name: 'Racks', href: '/racks', icon: CubeIcon },
    { name: 'Materials', href: '/materials', icon: DocumentTextIcon },
    { name: 'Material Reports', href: '/material-reports', icon: ChartBarIcon },
    { name: 'Damage Report', href: '/damage-report', icon: ExclamationTriangleIcon },
    { name: 'Moving Jobs', href: '/moving-jobs', icon: TruckIcon },
    { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
    { name: 'Expenses', href: '/expenses', icon: BanknotesIcon },
    { name: 'Scanner', href: '/scanner', icon: QrCodeIcon },
  ],
  WORKER: [
    { name: 'My Jobs', href: '/my-jobs', icon: TruckIcon },
    { name: 'QR Scanner', href: '/scanner', icon: QrCodeIcon },
    { name: 'My Tasks', href: '/my-tasks', icon: ArchiveBoxIcon },
  ]
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        
        // Redirect worker from dashboard to scanner
        if (userData.role === 'WORKER' && location.pathname === '/dashboard') {
          navigate('/scanner', { replace: true });
        }
      } catch (error) {
        console.error('Failed to parse user data');
      }
    }
  }, [location.pathname, navigate]);

  const isActive = (href: string) => {
    return location.pathname.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <CubeIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">WMS</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {/* Role-based Navigation */}
          {currentUser?.role && navigationConfig[currentUser.role as keyof typeof navigationConfig]?.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${active
                    ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`mr-3 h-5 w-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <Link
            to="/profile"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentUser?.email || 'user@demo.com'}
              </p>
              <p className="text-xs text-primary-600 font-medium">
                View Profile →
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm z-30">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 flex items-center justify-end space-x-4">
              {/* Version badge - shows current deployed version */}
              <VersionBadgeHeader />
              {/* Search */}
              <div className="hidden md:block">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User menu - Profile Link */}
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="View Profile"
              >
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden md:inline text-sm font-medium">
                  {currentUser?.name || 'Profile'}
                </span>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

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
  ExclamationTriangleIcon,
  ServerStackIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { VersionBadgeHeader } from '../VersionBadgeHeader';
import MobileNav from './MobileNav';

// Role-based navigation configuration
const navigationConfig = {
  ADMIN: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Shipments', href: '/shipments', icon: ArchiveBoxIcon },
    { name: 'Racks', href: '/racks', icon: CubeIcon },
    { name: 'Finance', href: '/finance', icon: BanknotesIcon },
    { name: 'Materials', href: '/materials', icon: DocumentTextIcon },
    { name: 'Material Reports', href: '/material-reports', icon: ChartBarIcon },
    { name: 'Damage Report', href: '/damage-report', icon: ExclamationTriangleIcon },
    { name: 'Moving Jobs', href: '/moving-jobs', icon: TruckIcon },
    { name: 'Scanner', href: '/scanner', icon: QrCodeIcon },
    { name: 'Backups', href: '/backups', icon: ServerStackIcon },
    { name: 'System Monitor', href: '/system-monitor', icon: CpuChipIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ],
  MANAGER: [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Shipments', href: '/shipments', icon: ArchiveBoxIcon },
    { name: 'Racks', href: '/racks', icon: CubeIcon },
    { name: 'Finance', href: '/finance', icon: BanknotesIcon },
    { name: 'Materials', href: '/materials', icon: DocumentTextIcon },
    { name: 'Material Reports', href: '/material-reports', icon: ChartBarIcon },
    { name: 'Damage Report', href: '/damage-report', icon: ExclamationTriangleIcon },
    { name: 'Moving Jobs', href: '/moving-jobs', icon: TruckIcon },
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
  const [debugInfo, setDebugInfo] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    console.log('📋 Layout useEffect - user from localStorage:', user);
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('✅ Parsed user data:', userData);
        setCurrentUser(userData);
        const roleInfo = `Role: ${userData.role || 'NO_ROLE'}`;
        setDebugInfo(roleInfo);
        console.log('🔍 SIDEBAR DEBUG:', roleInfo, userData);

        // Redirect worker from dashboard to scanner
        if (userData.role === 'WORKER' && location.pathname === '/dashboard') {
          navigate('/scanner', { replace: true });
        }
      } catch (error) {
        console.error('❌ Failed to parse user data', error);
        setDebugInfo('Parse error');
      }
    } else {
      console.warn('⚠️ No user in localStorage');
      setDebugInfo('No user in localStorage');
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
    <div className="flex h-screen bg-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Modern Glass Dark Theme */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <CubeIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">QGOWMS</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {/* Role-based Navigation */}
          {currentUser?.role ? (
            navigationConfig[currentUser.role as keyof typeof navigationConfig]?.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`min-h-[44px] 
                    flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                    ${active
                      ? 'bg-white/10 text-white backdrop-blur-sm border border-white/10'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })
          ) : (
            <div className="px-4 py-2 text-xs text-slate-500">
              Loading menu...
            </div>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-slate-700/50 p-3 space-y-1.5">
          <Link
            to="/profile"
            className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 group"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center ring-2 ring-slate-600 group-hover:ring-blue-500 transition-all">
              <span className="text-white font-semibold text-sm">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate group-hover:text-slate-300 transition-colors">
                {currentUser?.email || 'user@demo.com'}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-200 touch-target active:scale-95"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header - Glass Effect */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-30 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4 md:px-6">
            {/* Mobile: Menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 flex items-center justify-end space-x-2 md:space-x-3">
              {/* Mobile: Logout button (visible on mobile only) */}
              <button
                onClick={handleLogout}
                className="lg:hidden flex items-center space-x-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 touch-target active:scale-95"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Logout</span>
              </button>
              {/* Version badge */}
              <VersionBadgeHeader />

              {/* Notifications */}
              <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                <BellIcon className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>

              {/* User menu */}
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="View Profile"
              >
                <UserCircleIcon className="h-7 w-7 text-slate-500" />
                <span className="hidden md:inline text-sm font-medium">
                  {currentUser?.name || 'Profile'}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-3 md:p-6 pb-20 md:pb-6 no-scrollbar scroll-smooth">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          onMenuClick={() => setSidebarOpen(true)}
          userRole={currentUser?.role}
        />
      </div>
    </div>
  );
};

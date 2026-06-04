import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ArchiveBoxIcon,
  CubeIcon,
  QrCodeIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  CubeIcon as CubeIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  TruckIcon as TruckIconSolid,
} from '@heroicons/react/24/solid';

interface MobileNavProps {
  onMenuClick: () => void;
  userRole?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onMenuClick, userRole }) => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  // 5-tab layout — primary tabs visible, rest in More
  const getNavItems = () => {
    if (userRole === 'WORKER') {
      return [
        { name: 'Scanner', href: '/scanner', icon: QrCodeIcon, activeIcon: QrCodeIconSolid },
        { name: 'Jobs', href: '/moving-jobs', icon: TruckIcon, activeIcon: TruckIconSolid },
      ];
    }

    return [
      { name: 'Home', href: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid },
      { name: 'Jobs', href: '/moving-jobs', icon: TruckIcon, activeIcon: TruckIconSolid },
      { name: 'Scanner', href: '/scanner', icon: QrCodeIcon, activeIcon: QrCodeIconSolid },
      { name: 'Ship', href: '/shipments', icon: ArchiveBoxIcon, activeIcon: ArchiveBoxIconSolid },
      { name: 'Racks', href: '/racks', icon: CubeIcon, activeIcon: CubeIconSolid },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 md:hidden safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slideUp">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-0 transition-all duration-200 touch-target active:scale-95 ${
                active
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600 active:text-blue-600'
              }`}
            >
              <div className={`transform transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] mt-0.5 leading-tight truncate max-w-full px-0.5 ${active ? 'font-bold' : 'font-medium'} transition-all`}>
                {item.name}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full animate-slideDown" />
              )}
            </Link>
          );
        })}

        {/* More menu button — always last */}
        <button
          onClick={onMenuClick}
          className="relative flex flex-col items-center justify-center flex-1 h-full min-w-0 text-slate-400 hover:text-slate-600 active:text-blue-600 transition-all duration-200 touch-target active:scale-95"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <span className="text-[10px] mt-0.5 leading-tight font-medium">More</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;

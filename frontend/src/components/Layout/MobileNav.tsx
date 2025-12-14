import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ArchiveBoxIcon,
  CubeIcon,
  QrCodeIcon,
  Bars3Icon,
  TruckIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  CubeIcon as CubeIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  Bars3Icon as Bars3IconSolid,
  TruckIcon as TruckIconSolid,
  BanknotesIcon as BanknotesIconSolid,
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

  // Role-based navigation items for mobile
  const getNavItems = () => {
    if (userRole === 'WORKER') {
      return [
        { name: 'Scanner', href: '/scanner', icon: QrCodeIcon, activeIcon: QrCodeIconSolid },
        { name: 'Jobs', href: '/moving-jobs', icon: TruckIcon, activeIcon: TruckIconSolid },
      ];
    }

    return [
      { name: 'Home', href: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid },
      { name: 'Shipments', href: '/shipments', icon: ArchiveBoxIcon, activeIcon: ArchiveBoxIconSolid },
      { name: 'Scanner', href: '/scanner', icon: QrCodeIcon, activeIcon: QrCodeIconSolid },
      { name: 'Racks', href: '/racks', icon: CubeIcon, activeIcon: CubeIconSolid },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors touch-target ${
                active
                  ? 'text-blue-600'
                  : 'text-slate-500 active:text-blue-600'
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More menu button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-500 active:text-blue-600 transition-colors touch-target"
        >
          <Bars3Icon className="h-6 w-6" />
          <span className="text-[10px] mt-0.5 font-medium">More</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;

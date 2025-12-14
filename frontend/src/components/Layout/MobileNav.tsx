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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 md:hidden safe-area-bottom shadow-lg">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-slate-400 active:text-blue-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-[9px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More menu button */}
        <button
          onClick={onMenuClick}
          className="relative flex flex-col items-center justify-center flex-1 h-full text-slate-400 active:text-blue-600 transition-colors"
        >
          <Bars3Icon className="h-5 w-5" />
          <span className="text-[9px] mt-0.5 font-medium">More</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;

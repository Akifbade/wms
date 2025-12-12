import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  CogIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BellIcon,
  TruckIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

// Settings Sub-components
import { CompanySettings } from './components/CompanySettings';
import { CompanyProfiles } from './components/CompanyProfiles';
import { UserManagement } from './components/UserManagement';
import { BillingSettings } from './components/BillingSettings';
import { IntegrationSettings } from './components/IntegrationSettings';
import { SystemSettings } from './components/SystemSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { NotificationSettings } from './components/NotificationSettings';
import ShipmentConfiguration from './components/ShipmentConfiguration';
import EmailSettings from './EmailSettings';

interface SettingsNavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description: string;
}

const settingsNavigation: SettingsNavItem[] = [
  {
    id: 'company',
    name: 'Company & Branding',
    icon: BuildingOfficeIcon,
    path: 'company',
    description: 'Company details, logo, colors, and branding'
  },
  {
    id: 'company-profiles',
    name: 'Company Profiles',
    icon: UserGroupIcon,
    path: 'company-profiles',
    description: 'Manage customer profiles (DIOR, JAZEERA, etc.)'
  },
  {
    id: 'users',
    name: 'User Management',
    icon: UserGroupIcon,
    path: 'users',
    description: 'Manage team members, roles, and permissions'
  },

  {
    id: 'shipment',
    name: 'Shipment Workflow',
    icon: TruckIcon,
    path: 'shipment',
    description: 'Intake, storage, and release workflow settings'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: DevicePhoneMobileIcon,
    path: 'integrations',
    description: 'WhatsApp, SMS, email connections'
  },
  {
    id: 'system',
    name: 'Warehouse Setup',
    icon: ChartBarIcon,
    path: 'system',
    description: 'Racks, zones, custom fields'
  },
  {
    id: 'security',
    name: 'Security & Access',
    icon: ShieldCheckIcon,
    path: 'security',
    description: 'Authentication and permissions'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: BellIcon,
    path: 'notifications',
    description: 'Alert preferences and messaging'
  },
  {
    id: 'email',
    name: 'Email Service',
    icon: EnvelopeIcon,
    path: 'email',
    description: 'Gmail SMTP and email notifications'
  }
];

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('company');

  // Extract section from URL path (e.g., /settings/company-profiles -> company-profiles)
  useEffect(() => {
    const path = location.pathname;
    const match = path.match(/\/settings\/([^/]+)/);
    if (match) {
      const section = match[1];
      setActiveSection(section);
    } else if (path === '/settings') {
      setActiveSection('company');
    }
  }, [location.pathname]);

  const handleSectionClick = (id: string) => {
    setActiveSection(id);
    if (id === 'company') {
      navigate('/settings');
    } else {
      navigate(`/settings/${id}`);
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Modern Settings Sidebar */}
      <div className="w-80 bg-gradient-to-br from-blue-600 to-indigo-600 shadow-2xl overflow-y-auto">
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
              <CogIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-blue-100">Configure your system</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {settingsNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-white hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20'
                  }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-6 w-6 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-100'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${isActive ? 'text-gray-900' : 'text-white'
                      }`}>
                      {item.name}
                    </p>
                    <p className={`text-sm mt-1 ${isActive ? 'text-gray-600' : 'text-blue-100'
                      }`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Modern Quick Stats */}
        <div className="p-4 mt-6 border-t border-white/20">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Quick Stats</h3>
          <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Total Users</span>
                <span className="font-bold text-white text-lg">12</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Active Racks</span>
                <span className="font-bold text-white text-lg">48</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Monthly Revenue</span>
                <span className="font-bold text-white text-lg">2,450 KWD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto p-8">
          {/* Dynamic Content Based on Active Section */}
          {activeSection === 'company' && <CompanySettings />}
          {activeSection === 'company-profiles' && <CompanyProfiles />}
          {activeSection === 'users' && <UserManagement />}

          {activeSection === 'integrations' && <IntegrationSettings />}
          {activeSection === 'shipment' && <ShipmentConfiguration />}
          {activeSection === 'system' && <SystemSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'email' && <EmailSettings />}
        </div>
      </div>
    </div>
  );
};

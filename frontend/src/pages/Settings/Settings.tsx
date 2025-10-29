import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  CogIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BellIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

// Settings Sub-components
import { CompanySettings } from './components/CompanySettings';
import { CompanyProfiles } from './components/CompanyProfiles';
import { UserManagement } from './components/UserManagement';
import { InvoiceSettings } from './components/InvoiceSettings';
import { BillingSettings } from './components/BillingSettings';
import { IntegrationSettings } from './components/IntegrationSettings';
import { SystemSettings } from './components/SystemSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { NotificationSettings } from './components/NotificationSettings';
import ShipmentConfiguration from './components/ShipmentConfiguration';

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
    description: 'Company details, logo, colors, and branding settings'
  },
  {
    id: 'company-profiles',
    name: 'Company Profiles',
    icon: UserGroupIcon,
    path: 'company-profiles',
    description: 'Manage customer/vendor profiles (DIOR, JAZEERA, etc.)'
  },
  {
    id: 'users',
    name: 'User Management',
    icon: UserGroupIcon,
    path: 'users',
    description: 'Manage team members, roles, and permissions'
  },
  {
    id: 'invoice',
    name: 'Invoice & Templates',
    icon: DocumentTextIcon,
    path: 'invoice',
    description: 'Customize invoice templates, branding, and layouts'
  },
  {
    id: 'billing',
    name: 'Billing & Rates',
    icon: CurrencyDollarIcon,
    path: 'billing',
    description: 'Storage rates, payment methods, and subscription'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: DevicePhoneMobileIcon,
    path: 'integrations',
    description: 'WhatsApp, SMS, email, and third-party connections'
  },
  {
    id: 'shipment',
    name: 'Shipment Configuration',
    icon: TruckIcon,
    path: 'shipment',
    description: 'Configure shipment intake, storage, release workflows, and pricing'
  },
  {
    id: 'system',
    name: 'System Configuration',
    icon: ChartBarIcon,
    path: 'system',
    description: 'Racks setup, custom fields, and operational settings'
  },
  {
    id: 'security',
    name: 'Security & Access',
    icon: ShieldCheckIcon,
    path: 'security',
    description: 'Authentication, permissions, and security policies'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: BellIcon,
    path: 'notifications',
    description: 'Alert preferences, email notifications, and messaging'
  }
];

export const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('company');

  return (
    <div className="flex h-full bg-gray-50">
      {/* Settings Sidebar */}
      <div className="w-80 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CogIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Configure your warehouse system</p>
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
                onClick={() => setActiveSection(item.id)}
                className={`
                  w-full text-left p-4 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-50 border border-primary-200 text-primary-700' 
                    : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                  }
                `}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      isActive ? 'text-primary-900' : 'text-gray-900'
                    }`}>
                      {item.name}
                    </p>
                    <p className={`text-sm mt-1 ${
                      isActive ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div className="p-4 mt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Users</span>
              <span className="font-medium text-gray-900">12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Active Racks</span>
              <span className="font-medium text-gray-900">48</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Monthly Revenue</span>
              <span className="font-medium text-gray-900">2,450 KWD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Dynamic Content Based on Active Section */}
          {activeSection === 'company' && <CompanySettings />}
          {activeSection === 'company-profiles' && <CompanyProfiles />}
          {activeSection === 'users' && <UserManagement />}
          {activeSection === 'invoice' && <InvoiceSettings />}
          {activeSection === 'billing' && <BillingSettings />}
          {activeSection === 'integrations' && <IntegrationSettings />}
          {activeSection === 'shipment' && <ShipmentConfiguration />}
          {activeSection === 'system' && <SystemSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  TruckIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import WarehouseIntake from './WarehouseIntake';
import WarehouseRelease from './WarehouseRelease';
import QRScanner from './QRScanner';
import WarehouseDashboard from './WarehouseDashboard';

type TabType = 'dashboard' | 'intake' | 'release' | 'scanner';

interface WarehouseProps {}

export const Warehouse: React.FC<WarehouseProps> = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: ChartBarIcon },
    { id: 'intake' as TabType, name: 'Intake', icon: TruckIcon },
    { id: 'release' as TabType, name: 'Release', icon: CurrencyDollarIcon },
    { id: 'scanner' as TabType, name: 'QR Scanner', icon: QrCodeIcon },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <WarehouseDashboard />;
      case 'intake':
        return <WarehouseIntake />;
      case 'release':
        return <WarehouseRelease />;
      case 'scanner':
        return <QRScanner />;
      default:
        return <WarehouseDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default Warehouse;

import React, { useState, useEffect } from 'react';
import { 
  CubeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface WarehouseDashboardProps {}

interface DashboardStats {
  shipments: {
    total: number;
    active: number;
    released: number;
  };
  revenue: {
    total: number;
    paid: number;
    outstanding: number;
  };
  racks: {
    total: number;
    occupied: number;
    available: number;
  };
}

export const WarehouseDashboard: React.FC<WarehouseDashboardProps> = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/warehouse/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load dashboard stats');
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error || 'Failed to load dashboard data'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatCard: React.FC<{
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
    trend?: { value: number; label: string };
  }> = ({ title, value, subtitle, icon: Icon, color, trend }) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-blue-600 bg-blue-50',
      green: 'bg-green-500 text-green-600 bg-green-50',
      purple: 'bg-purple-500 text-purple-600 bg-purple-50',
      yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50',
      red: 'bg-red-500 text-red-600 bg-red-50'
    };

    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`p-3 rounded-md ${colorClasses[color].split(' ')[2]}`}>
                <Icon className={`h-6 w-6 ${colorClasses[color].split(' ')[1]}`} />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">{value}</div>
                  {trend && (
                    <div className="ml-2 flex items-baseline text-sm">
                      <span className="text-gray-500">{trend.label}</span>
                    </div>
                  )}
                </dd>
                {subtitle && (
                  <dd className="text-sm text-gray-600">{subtitle}</dd>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Warehouse Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of warehouse storage operations and statistics
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Shipments"
          value={stats.shipments.total.toString()}
          subtitle={`${stats.shipments.active} active`}
          icon={TruckIcon}
          color="blue"
        />
        
        <StatCard
          title="Active Storage"
          value={stats.shipments.active.toString()}
          subtitle="Currently stored"
          icon={CubeIcon}
          color="green"
        />
        
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.revenue.total)}
          subtitle={`${formatCurrency(stats.revenue.outstanding)} outstanding`}
          icon={CurrencyDollarIcon}
          color="purple"
        />
        
        <StatCard
          title="Rack Utilization"
          value={`${getPercentage(stats.racks.occupied, stats.racks.total)}%`}
          subtitle={`${stats.racks.occupied}/${stats.racks.total} occupied`}
          icon={BuildingStorefrontIcon}
          color={getPercentage(stats.racks.occupied, stats.racks.total) > 80 ? 'red' : 'yellow'}
        />
      </div>

      {/* Detailed Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Shipment Status Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">Shipment Status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Active Shipments</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900">{stats.shipments.active}</span>
                  <div className="ml-2 w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${getPercentage(stats.shipments.active, stats.shipments.total)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Released Shipments</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900">{stats.shipments.released}</span>
                  <div className="ml-2 w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ width: `${getPercentage(stats.shipments.released, stats.shipments.total)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">Revenue Overview</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Paid Amount</span>
                </div>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(stats.revenue.paid)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Outstanding</span>
                </div>
                <span className="text-lg font-semibold text-yellow-600">
                  {formatCurrency(stats.revenue.outstanding)}
                </span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Collection Rate</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {getPercentage(stats.revenue.paid, stats.revenue.total)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <TruckIcon className="h-5 w-5 mr-2 text-blue-500" />
              New Intake
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-500" />
              Release & Invoice
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-500" />
              View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.racks.occupied / stats.racks.total > 0.8 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">High Rack Utilization</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Rack capacity is {getPercentage(stats.racks.occupied, stats.racks.total)}% full. 
                Consider adding more racks or releasing completed shipments.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseDashboard;

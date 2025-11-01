import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { dashboardAPI } from '../../services/api';
import MovingJobsManager from '../../components/moving-jobs/MovingJobsManager';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [storageBySection, setStorageBySection] = useState<any[]>([]);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data.stats);
      setTopClients(data.topClients || []);
      setStorageBySection(data.storageBySection || []);
      setRecentShipments(data.recentShipments || []);
      setRecentJobs(data.recentJobs || []);
      setRecentActivities(data.recentActivities || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  const statsCards = [
    { 
      name: 'Total Revenue', 
      value: `${stats?.invoiceRevenue?.total?.toFixed(2) || '0.00'} KWD`, 
      subtitle: `${stats?.invoiceRevenue?.count || 0} invoices`,
      icon: CurrencyDollarIcon, 
      color: 'bg-blue-500' 
    },
    { 
      name: 'Paid Amount', 
      value: `${stats?.invoiceRevenue?.paid?.toFixed(2) || '0.00'} KWD`, 
      subtitle: `${stats?.invoiceRevenue?.paidCount || 0} paid invoices`,
      icon: BanknotesIcon, 
      color: 'bg-green-500' 
    },
    { 
      name: 'Outstanding', 
      value: `${stats?.invoiceRevenue?.outstanding?.toFixed(2) || '0.00'} KWD`, 
      subtitle: 'Pending payments',
      icon: ArrowTrendingUpIcon, 
      color: 'bg-yellow-500' 
    },
    { 
      name: 'This Month', 
      value: `${stats?.thisMonthRevenue?.amount?.toFixed(2) || '0.00'} KWD`, 
      subtitle: 'Current month revenue',
      icon: ChartBarIcon, 
      color: 'bg-purple-500' 
    },
  ];

  const quickStats = [
    { 
      name: 'Active Shipments', 
      value: stats?.shipments?.active || 0, 
      total: stats?.shipments?.total || 0,
      icon: CubeIcon, 
      color: 'text-blue-600' 
    },
    { 
      name: 'Rack Utilization', 
      value: `${stats?.racks?.utilization || 0}%`, 
      total: `${stats?.racks?.active || 0} active`,
      icon: UserGroupIcon, 
      color: 'text-green-600' 
    },
    { 
      name: 'Jobs In Progress', 
      value: stats?.jobs?.inProgress || 0, 
      total: `${stats?.jobs?.scheduled || 0} scheduled`,
      icon: TruckIcon, 
      color: 'text-yellow-600' 
    },
    { 
      name: 'Withdrawals (Month)', 
      value: stats?.withdrawals?.thisMonth || 0, 
      total: `${stats?.withdrawals?.total || 0} total`,
      icon: ArrowPathIcon, 
      color: 'text-purple-600' 
    },
  ];

  // Prepare chart data
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
  const storageChartData = storageBySection.map((section, index) => ({
    name: section.section || 'Unknown',
    value: section.capacityUsed || 0,
    total: section.capacityTotal || 0,
    utilization: section.utilization || 0,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat: any) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat: any) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <Icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-xs text-gray-500">{stat.name}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.total}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipment Status Breakdown */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CubeIcon className="h-6 w-6 mr-2 text-blue-600" />
          📊 Shipment Status Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-400">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Shipments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.shipmentStatusBreakdown?.total || 0}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats?.shipmentStatusBreakdown?.pending || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.shipmentStatusBreakdown?.total > 0 
                    ? Math.round((stats?.shipmentStatusBreakdown?.pending / stats?.shipmentStatusBreakdown?.total) * 100)
                    : 0}% of total
                </p>
              </div>
              <div className="text-4xl">🟡</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">In Storage</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.shipmentStatusBreakdown?.inStorage || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.shipmentStatusBreakdown?.total > 0 
                    ? Math.round((stats?.shipmentStatusBreakdown?.inStorage / stats?.shipmentStatusBreakdown?.total) * 100)
                    : 0}% of total
                </p>
              </div>
              <div className="text-4xl">🟢</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Released</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.shipmentStatusBreakdown?.released || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.shipmentStatusBreakdown?.total > 0 
                    ? Math.round((stats?.shipmentStatusBreakdown?.released / stats?.shipmentStatusBreakdown?.total) * 100)
                    : 0}% of total
                </p>
              </div>
              <div className="text-4xl">🔵</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Utilization Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Utilization by Section</h3>
          {storageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={storageChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, utilization }) => `${name} (${utilization}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {storageChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} / ${props.payload.total} (${props.payload.utilization}%)`,
                    'Capacity Used'
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-400">No storage data available</p>
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients</h3>
          <div className="space-y-3">
            {topClients.length > 0 ? (
              topClients.map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.shipments || 0} shipments</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{(client.revenue || 0).toFixed(2)} KWD</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No client data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          <button 
            onClick={loadDashboardData}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user?.name || 'System'}</span>
                    {' '}
                    <span className="text-gray-600">
                      {activity.activityType === 'ITEM_ADDED' && 'added item to'}
                      {activity.activityType === 'ITEM_REMOVED' && 'removed item from'}
                      {activity.activityType === 'STATUS_CHANGE' && 'changed status of'}
                      {activity.activityType === 'CAPACITY_UPDATE' && 'updated capacity of'}
                      {' '}
                    </span>
                    <span className="font-medium">{activity.rack?.code}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {activity.description}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>

      {/* Recent Shipments & Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Shipments</h3>
          <div className="space-y-3">
            {recentShipments.length > 0 ? (
              recentShipments.map((shipment: any) => (
                <div key={shipment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{shipment.referenceId}</div>
                    <div className="text-sm text-gray-500">{shipment.clientName} • {shipment.currentBoxCount} boxes</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      shipment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shipment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent shipments</p>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Jobs</h3>
          <div className="space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{job.title}</div>
                    <div className="text-sm text-gray-500">{job.clientName} • {job.jobType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{new Date(job.scheduledDate).toLocaleDateString()}</div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming jobs</p>
            )}
          </div>
        </div>
      </div>

      {/* Moving Jobs Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TruckIcon className="h-6 w-6 mr-2 text-orange-600" />
          🚚 Moving Jobs Management
        </h3>
        <MovingJobsManager />
      </div>
    </div>
  );
};

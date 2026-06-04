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
  const analyticsEnabled = true; // Default to true since patch system is removed

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
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

  // Debug: Log storage analytics

  const statsCards = [
    {
      name: 'Total Revenue',
      value: `${stats?.invoiceRevenue?.total?.toFixed(2) || '0.00'} KWD`,
      subtitle: `${stats?.invoiceRevenue?.count || 0} invoices`,
      icon: CurrencyDollarIcon,
      color: 'bg-blue-600'
    },
    {
      name: 'Paid Amount',
      value: `${stats?.invoiceRevenue?.paid?.toFixed(2) || '0.00'} KWD`,
      subtitle: `${stats?.invoiceRevenue?.paidCount || 0} paid invoices`,
      icon: BanknotesIcon,
      color: 'bg-emerald-600'
    },
    {
      name: 'Outstanding',
      value: `${stats?.invoiceRevenue?.outstanding?.toFixed(2) || '0.00'} KWD`,
      subtitle: 'Pending payments',
      icon: ArrowTrendingUpIcon,
      color: 'bg-amber-500'
    },
    {
      name: 'This Month',
      value: `${stats?.thisMonthRevenue?.amount?.toFixed(2) || '0.00'} KWD`,
      subtitle: 'Current month revenue',
      icon: ChartBarIcon,
      color: 'bg-indigo-600'
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
      color: 'text-emerald-600'
    },
    {
      name: 'Jobs In Progress',
      value: stats?.jobs?.inProgress || 0,
      total: `${stats?.jobs?.scheduled || 0} scheduled`,
      icon: TruckIcon,
      color: 'text-amber-600'
    },
    {
      name: 'Withdrawals (Month)',
      value: stats?.withdrawals?.thisMonth || 0,
      total: `${stats?.withdrawals?.total || 0} total`,
      icon: ArrowPathIcon,
      color: 'text-indigo-600'
    },
  ];

  // Prepare chart data
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#0891b2'];
  const storageChartData = storageBySection.map((section, index) => ({
    name: section.section || 'Unknown',
    value: section.capacityUsed || 0,
    total: section.capacityTotal || 0,
    utilization: section.utilization || 0,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 bg-slate-100 min-h-screen animate-fade-in pb-20 md:pb-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5 md:mt-1 hidden md:block">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="text-xs md:text-sm text-slate-600 font-medium bg-white/80 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-slate-200/50 shadow-sm self-start md:self-auto">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid - Mobile Scrollable */}
      {analyticsEnabled ? (
        <div className="mobile-scroll-x md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5 animate-stagger -mx-3 px-3 md:mx-0 md:px-0">
          {statsCards.map((stat: any, index: number) => {
            const Icon = stat.icon;
            const colors = [
              { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
              { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
              { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
              { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
            ];
            const color = colors[index % colors.length];
            return (
              <div key={stat.name} className="flex-shrink-0 w-[200px] md:w-auto mr-3 md:mr-0 last:mr-0 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200/50 p-4 md:p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-slate-500 truncate">{stat.name}</p>
                    <p className="text-lg md:text-2xl font-bold text-slate-900 mt-0.5 md:mt-1">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5 md:mt-1 truncate">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className={`${color.bg} p-2 md:p-3 rounded-lg md:rounded-xl shadow-lg flex-shrink-0`}>
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-900">Analytics temporarily disabled</h3>
          <p className="text-amber-800 mt-2 text-sm">
            We turned off dashboard revenue widgets because the <span className="font-semibold">dashboard-safe-analytics</span> patch is inactive. Core operations continue normally.
          </p>
        </div>
      )}

      {/* Quick Stats - Mobile Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {quickStats.map((stat: any) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 p-3 md:p-4 hover:border-blue-200 transition-colors">
              <div className="flex items-center space-x-2 md:space-x-3">
                <Icon className="h-5 w-5 md:h-7 md:w-7 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider font-semibold truncate">{stat.name}</p>
                  <p className="text-base md:text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-[10px] md:text-xs text-slate-500 truncate">{stat.total}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipment Status Breakdown - Mobile Optimized */}
      {analyticsEnabled && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200/50 p-4 md:p-6 shadow-sm">
          <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4 flex items-center">
            <CubeIcon className="h-4 w-4 md:h-5 md:w-5 mr-2 text-blue-500" />
            Shipment Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="bg-slate-50 rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-slate-400">
              <p className="text-[10px] md:text-sm text-slate-600 font-medium">Total</p>
              <p className="text-xl md:text-2xl font-bold text-slate-900 mt-0.5 md:mt-1">{stats?.shipmentStatusBreakdown?.total || 0}</p>
            </div>

            <div className="bg-amber-50/80 rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-amber-500">
              <p className="text-[10px] md:text-sm text-amber-800 font-medium">Pending</p>
              <p className="text-xl md:text-2xl font-bold text-amber-700 mt-0.5 md:mt-1">{stats?.shipmentStatusBreakdown?.pending || 0}</p>
              <p className="text-[10px] text-amber-600 mt-0.5 hidden md:block">
                {stats?.shipmentStatusBreakdown?.total > 0
                  ? Math.round((stats?.shipmentStatusBreakdown?.pending / stats?.shipmentStatusBreakdown?.total) * 100)
                  : 0}% of total
              </p>
            </div>

            <div className="bg-emerald-50/80 rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-emerald-500">
              <p className="text-[10px] md:text-sm text-emerald-800 font-medium">In Storage</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-700 mt-0.5 md:mt-1">{stats?.shipmentStatusBreakdown?.inStorage || 0}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5 hidden md:block">
                {stats?.shipmentStatusBreakdown?.total > 0
                  ? Math.round((stats?.shipmentStatusBreakdown?.inStorage / stats?.shipmentStatusBreakdown?.total) * 100)
                  : 0}% of total
              </p>
            </div>

            <div className="bg-blue-50/80 rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-blue-500">
              <p className="text-[10px] md:text-sm text-blue-800 font-medium">Released</p>
              <p className="text-xl md:text-2xl font-bold text-blue-700 mt-0.5 md:mt-1">{stats?.shipmentStatusBreakdown?.released || 0}</p>
              <p className="text-[10px] text-blue-600 mt-0.5 hidden md:block">
                {stats?.shipmentStatusBreakdown?.total > 0
                  ? Math.round((stats?.shipmentStatusBreakdown?.released / stats?.shipmentStatusBreakdown?.total) * 100)
                  : 0}% of total
              </p>
            </div>
          </div>
        </div>
      )}

      {/*  Storage Analytics - CBM & Estimated Charges */}
      {analyticsEnabled && stats?.storageAnalytics && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-emerald-500" />
            Storage Analytics (In-Storage Shipments)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
              <p className="text-sm text-slate-600 font-medium">Total CBM in Storage</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {(stats?.storageAnalytics?.totalCBMInStorage || 0).toFixed(3)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Cubic meters</p>
            </div>

            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
              <p className="text-sm text-slate-600 font-medium">Estimated Total Charges</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {(stats?.storageAnalytics?.estimatedTotalCharges || 0).toFixed(3)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.storageAnalytics?.currency || 'KWD'} (if released today)
              </p>
            </div>

            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-slate-600 font-medium">Active Shipments</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stats?.storageAnalytics?.shipmentsCount || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Avg CBM: {stats?.storageAnalytics?.shipmentsCount > 0
                  ? ((stats?.storageAnalytics?.totalCBMInStorage || 0) / stats?.storageAnalytics?.shipmentsCount).toFixed(3)
                  : '0.000'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📦 CBM Rack Capacity Overview */}
      {analyticsEnabled && stats?.racks?.cbm && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            📦 Rack CBM Capacity Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-white/80 font-medium">Total CBM Capacity</p>
              <p className="text-3xl font-bold mt-1">{stats?.racks?.cbm?.total?.toFixed(2) || '0.00'} m³</p>
              <p className="text-xs text-white/60 mt-1">All racks combined</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-white/80 font-medium">CBM Used</p>
              <p className="text-3xl font-bold mt-1">{stats?.racks?.cbm?.used?.toFixed(2) || '0.00'} m³</p>
              <p className="text-xs text-white/60 mt-1">Currently occupied</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-white/80 font-medium">CBM Available</p>
              <p className="text-3xl font-bold mt-1">{stats?.racks?.cbm?.available?.toFixed(2) || '0.00'} m³</p>
              <p className="text-xs text-white/60 mt-1">Free space</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-white/80 font-medium">CBM Utilization</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-3xl font-bold">{stats?.racks?.cbm?.utilization || 0}%</p>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats?.racks?.cbm?.utilization || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Utilization Pie Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Storage Utilization by Section</h3>
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
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '0.5rem' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
              <p className="text-slate-400">No storage data available</p>
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Clients</h3>
          <div className="space-y-3">
            {topClients.length > 0 ? (
              topClients.map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{client.name}</div>
                      <div className="text-xs text-slate-500">{client.shipments || 0} shipments</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">{(client.revenue || 0).toFixed(2)} KWD</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">No client data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activities</h3>
          <button
            onClick={loadDashboardData}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 font-medium"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-900">
                    <span className="font-medium">{activity.user?.name || 'System'}</span>
                    {' '}
                    <span className="text-slate-600">
                      {activity.activityType === 'ITEM_ADDED' && 'added item to'}
                      {activity.activityType === 'ITEM_REMOVED' && 'removed item from'}
                      {activity.activityType === 'STATUS_CHANGE' && 'changed status of'}
                      {activity.activityType === 'CAPACITY_UPDATE' && 'updated capacity of'}
                      {' '}
                    </span>
                    <span className="font-medium text-blue-700">{activity.rack?.code}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {activity.description}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>

      {/* Recent Shipments & Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Shipments</h3>
          <div className="space-y-3">
            {recentShipments.length > 0 ? (
              recentShipments.map((shipment: any) => (
                <div key={shipment.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{shipment.referenceId}</div>
                    <div className="text-sm text-slate-500">{shipment.clientName}  {shipment.currentBoxCount} boxes</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${shipment.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {shipment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">No recent shipments</p>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Jobs</h3>
          <div className="space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{job.title}</div>
                    <div className="text-sm text-slate-500">{job.clientName}  {job.jobType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">{new Date(job.scheduledDate).toLocaleDateString()}</div>
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">No upcoming jobs</p>
            )}
          </div>
        </div>
      </div>

      {/* Moving Jobs Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <TruckIcon className="h-6 w-6 mr-2 text-amber-600" />
          Moving Jobs Management
        </h3>
        <MovingJobsManager />
      </div>
    </div>
  );
};

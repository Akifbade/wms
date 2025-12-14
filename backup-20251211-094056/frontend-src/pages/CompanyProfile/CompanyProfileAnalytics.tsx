import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ChartBarIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArchiveBoxIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { getBackendUrl } from '../../services/api';

interface AnalyticsData {
  overview: {
    totalShipments: number;
    activeShipments: number;
    pendingShipments: number;
    totalCBM: number;
    totalWeight: number;
  };
  financials: {
    totalInvoiced: number;
    totalPaid: number;
    pendingBalance: number;
    walletBalance: number;
  };
  liveEstimates: {
    estimatedLivePrice: number;
    daysPassed: number;
    daysInMonth: number;
  };
  contract: {
    monthlyRate: number;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
}

interface CompanyProfileAnalyticsProps {
  companyProfileId?: string;
}

export const CompanyProfileAnalytics: React.FC<CompanyProfileAnalyticsProps> = ({ companyProfileId }) => {
  const { profileId: routeProfileId } = useParams<{ profileId: string }>();
  const profileId = companyProfileId || routeProfileId;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${getBackendUrl()}/api/contracts/analytics/${profileId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(response.data);
      } catch (err: any) {
        console.error('Failed to load analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchData();
    }
  }, [profileId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">No data available</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          Performance Analytics
        </h2>
        <div className="text-sm text-slate-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total CBM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Volume
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{data.overview.totalCBM.toFixed(3)} m³</h3>
          <p className="text-sm text-slate-500 mt-1">Total Volume in Storage</p>
        </div>

        {/* Active Shipments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              Active
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{data.overview.activeShipments}</h3>
          <p className="text-sm text-slate-500 mt-1">Shipments In Storage</p>
        </div>

        {/* Financials: Pending Balance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{data.financials.pendingBalance.toFixed(3)} KWD</h3>
          <p className="text-sm text-slate-500 mt-1">Outstanding Balance</p>
        </div>

        {/* Live Estimate */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ClockIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              Accrued
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{data.liveEstimates.estimatedLivePrice.toFixed(3)} KWD</h3>
          <p className="text-sm text-slate-500 mt-1">
            Live Cost ({data.liveEstimates.daysPassed}/{data.liveEstimates.daysInMonth} days)
          </p>
        </div>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Shipment Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-slate-700">Total Shipments</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{data.overview.totalShipments}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-slate-700">Pending Processing</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{data.overview.pendingShipments}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                <span className="text-sm font-medium text-slate-700">Total Weight</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{data.overview.totalWeight.toFixed(2)} kg</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Total Invoiced</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{data.financials.totalInvoiced.toFixed(3)} KWD</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-slate-700">Total Paid</span>
              </div>
              <span className="text-sm font-bold text-green-600">{data.financials.totalPaid.toFixed(3)} KWD</span>
            </div>
            {data.contract && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Contract Rate</span>
                  <span className="text-sm font-medium text-slate-900">{data.contract.monthlyRate.toFixed(3)} KWD/mo</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-500">Contract Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${data.contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {data.contract.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

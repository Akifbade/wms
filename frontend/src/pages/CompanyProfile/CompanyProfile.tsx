import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ArrowLeftIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface CompanyAnalytics {
  profile: {
    id: string;
    name: string;
    description?: string;
    contactPerson?: string;
    contactPhone?: string;
    logoUrl?: string;
    createdAt: string;
    isPlaceholder?: boolean;
    placeholderMessage?: string;
  };
  stats: {
    totalShipments: number;
    activeShipments: number;
    releasedShipments: number;
    pendingShipments: number;
    totalBoxes: number;
    currentBoxes: number;
    avgStorageDays: number;
    totalInvoices: number;
    totalInvoiceAmount: number;
    paidInvoices: number;
    partialInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalPaidAmount: number;
    outstandingBalance: number;
    totalPayments: number;
    avgInvoiceAmount: number;
  };
  paymentMethods: Record<string, number>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    invoiceCount: number;
  }>;
  recentActivity: {
    shipments: any[];
    invoices: any[];
    payments: any[];
  };
}

export const CompanyProfile: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CompanyAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'invoices' | 'payments' | 'analytics'>('overview');

  // Shipments tab state
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<string>('all');
  const [shipmentSearchTerm, setShipmentSearchTerm] = useState('');

  // Invoices tab state
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

  const formatNumber = (value: number | string | null | undefined, decimals = 3) => {
    const numeric = typeof value === 'number'
      ? value
      : value === null || value === undefined || value === ''
        ? 0
        : parseFloat(String(value));
    return Number.isFinite(numeric) ? numeric.toFixed(decimals) : (0).toFixed(decimals);
  };

  useEffect(() => {
    loadCompanyAnalytics();
  }, [profileId]);

  useEffect(() => {
    if (activeTab === 'shipments' && allShipments.length === 0) {
      loadCompanyShipments();
    }
    if (activeTab === 'invoices' && allInvoices.length === 0) {
      loadCompanyInvoices();
    }
  }, [activeTab]);

  const loadCompanyAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/companies/${profileId}/analytics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const normalizedPaymentMethods = Object.entries(response.data?.paymentMethods || {}).reduce(
        (acc, [method, amount]) => {
          const parsed = typeof amount === 'number' ? amount : parseFloat(`${amount ?? 0}`);
          acc[method] = Number.isFinite(parsed) ? parsed : 0;
          return acc;
        },
        {} as Record<string, number>
      );

      const normalizedMonthlyRevenue = (response.data?.monthlyRevenue || []).map(entry => {
        const parsedRevenue = typeof entry.revenue === 'number'
          ? entry.revenue
          : parseFloat(`${entry.revenue ?? 0}`);
        return {
          ...entry,
          revenue: Number.isFinite(parsedRevenue) ? parsedRevenue : 0,
          invoiceCount: entry.invoiceCount ?? 0,
        };
      });

      setData({
        ...response.data,
        paymentMethods: normalizedPaymentMethods,
        monthlyRevenue: normalizedMonthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading company analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyShipments = async () => {
    try {
      setShipmentsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/shipments?companyProfileId=${profileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Backend returns { shipments, pagination }, so ensure we extract the list
      setAllShipments(response.data?.shipments || response.data || []);
    } catch (error) {
      console.error('Error loading company shipments:', error);
    } finally {
      setShipmentsLoading(false);
    }
  };

  const getFilteredShipments = () => {
    let filtered = allShipments;

    if (shipmentStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === shipmentStatusFilter);
    }

    if (shipmentSearchTerm) {
      filtered = filtered.filter(s =>
        s.referenceId?.toLowerCase().includes(shipmentSearchTerm.toLowerCase()) ||
        s.clientName?.toLowerCase().includes(shipmentSearchTerm.toLowerCase()) ||
        s.clientPhone?.toLowerCase().includes(shipmentSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const exportShipmentsToExcel = () => {
    const filtered = getFilteredShipments();
    const exportData = filtered.map(s => ({
      'Reference ID': s.referenceId,
      'Client Name': s.clientName,
      'Client Phone': s.clientPhone,
      'Status': s.status,
      'Boxes': `${s.currentBoxCount}/${s.originalBoxCount}`,
      'Weight': s.totalWeight ? `${s.totalWeight} kg` : 'N/A',
      'Received Date': new Date(s.receivedDate).toLocaleDateString(),
      'Arrival Date': s.arrivalDate ? new Date(s.arrivalDate).toLocaleDateString() : 'N/A',
      'Rack Locations': s.rackLocations || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
    XLSX.writeFile(wb, `${data?.profile.name || 'Company'}_Shipments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const loadCompanyInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/billing/invoices?companyProfileId=${profileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAllInvoices(response.data?.invoices || response.data || []);
    } catch (error) {
      console.error('Error loading company invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    let filtered = allInvoices;

    if (invoiceStatusFilter !== 'all') {
      filtered = filtered.filter(i => i.paymentStatus === invoiceStatusFilter);
    }

    if (invoiceSearchTerm) {
      filtered = filtered.filter(i =>
        i.invoiceNumber?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
        i.clientName?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
        i.shipment?.referenceId?.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const exportInvoicesToExcel = () => {
    const filtered = getFilteredInvoices();
    const exportData = filtered.map(i => {
      const totalAmount = parseFloat(`${i.totalAmount ?? 0}`);
      const paidAmount = parseFloat(`${i.paidAmount ?? 0}`);
      return ({
        'Invoice Number': i.invoiceNumber,
        'Client Name': i.clientName,
        'Shipment Ref': i.shipment?.referenceId || 'N/A',
        'Total Amount': formatNumber(totalAmount),
        'Paid Amount': formatNumber(paidAmount),
        'Outstanding': formatNumber(totalAmount - paidAmount),
        'Status': i.paymentStatus,
        'Invoice Date': new Date(i.invoiceDate).toLocaleDateString(),
        'Due Date': i.dueDate ? new Date(i.dueDate).toLocaleDateString() : 'N/A',
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `${data?.profile.name || 'Company'}_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Company not found</p>
          <button
            onClick={() => navigate('/shipments')}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { profile, stats, paymentMethods, monthlyRevenue, recentActivity } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>
          <div className="flex gap-3">
            <button className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold shadow-sm">
              <PrinterIcon className="h-5 w-5 mr-2" />
              Print Report
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold shadow-sm">
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Data
            </button>
          </div>
        </div>

        <div className="flex items-start gap-6">
          {/* Company Logo */}
          <div className="flex-shrink-0">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="flex-1">
            {profile.isPlaceholder && profile.placeholderMessage && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <strong>Heads up:</strong> {profile.placeholderMessage}
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
            {profile.description && (
              <p className="text-gray-600 mb-4">{profile.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profile.contactPerson && (
                <div className="flex items-center gap-2 text-sm">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700 font-medium">{profile.contactPerson}</span>
                </div>
              )}
              {profile.contactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700 font-medium">{profile.contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Total Business Value */}
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Total Business Value</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalInvoiceAmount)}</p>
            <p className="text-sm text-gray-500">KWD</p>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Shipments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TruckIcon className="h-7 w-7 text-blue-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Shipments</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalShipments}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.activeShipments} active • {stats.releasedShipments} released
          </p>
        </div>

        {/* Current Boxes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <ArchiveBoxIcon className="h-7 w-7 text-purple-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Current Boxes</p>
          <p className="text-3xl font-bold text-gray-900">{stats.currentBoxes}</p>
          <p className="text-xs text-gray-500 mt-2">
            Total stored: {stats.totalBoxes} boxes
          </p>
        </div>

        {/* Total Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <DocumentTextIcon className="h-7 w-7 text-indigo-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalInvoices}</p>
          <p className="text-xs text-gray-500 mt-2">
            Avg: {formatNumber(stats.avgInvoiceAmount)} KWD
          </p>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-7 w-7 text-green-600" />
            </div>
            <BanknotesIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Paid Amount</p>
          <p className="text-3xl font-bold text-green-600">{formatNumber(stats.totalPaidAmount)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.paidInvoices} invoices paid
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <CurrencyDollarIcon className="h-7 w-7 text-red-600" />
            </div>
            <XCircleIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Outstanding</p>
          <p className="text-3xl font-bold text-red-600">{formatNumber(stats.outstandingBalance)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.pendingInvoices} pending • {stats.overdueInvoices} overdue
          </p>
        </div>

        {/* Storage Duration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <ClockIcon className="h-7 w-7 text-orange-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Avg Storage</p>
          <p className="text-3xl font-bold text-gray-900">{stats.avgStorageDays}</p>
          <p className="text-xs text-gray-500 mt-2">Days per shipment</p>
        </div>

        {/* Total Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-50 rounded-lg">
              <BanknotesIcon className="h-7 w-7 text-teal-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
          <p className="text-xs text-gray-500 mt-2">Payment transactions</p>
        </div>

        {/* Partial Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <DocumentTextIcon className="h-7 w-7 text-yellow-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Partial Payments</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.partialInvoices}</p>
          <p className="text-xs text-gray-500 mt-2">Partially paid invoices</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'shipments', label: 'Shipments', icon: TruckIcon },
              { key: 'invoices', label: 'Invoices', icon: DocumentTextIcon },
              { key: 'payments', label: 'Payments', icon: BanknotesIcon },
              { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-4 px-6 text-center font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.key
                  ? 'border-b-4 border-gray-900 text-gray-900 bg-gray-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="h-6 w-6 text-gray-700" />
                  Recent Activity
                </h3>

                {/* Recent Shipments */}
                {recentActivity.shipments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Shipments</h4>
                    <div className="space-y-2">
                      {recentActivity.shipments.map(shipment => (
                        <div key={shipment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <TruckIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{shipment.referenceId}</p>
                              <p className="text-xs text-gray-500">{shipment.clientName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${shipment.status === 'RELEASED' ? 'bg-green-100 text-green-800' :
                              shipment.status === 'IN_WAREHOUSE' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                              {shipment.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(shipment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Invoices */}
                {recentActivity.invoices.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Invoices</h4>
                    <div className="space-y-2">
                      {recentActivity.invoices.map(invoice => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                              <p className="text-xs text-gray-500">{formatNumber(invoice.totalAmount)} KWD</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${invoice.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                              invoice.paymentStatus === 'PARTIAL' ? 'bg-blue-100 text-blue-800' :
                                invoice.paymentStatus === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                              }`}>
                              {invoice.paymentStatus}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Payments */}
                {recentActivity.payments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Payments</h4>
                    <div className="space-y-2">
                      {recentActivity.payments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <BanknotesIcon className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{formatNumber(payment.amount)} KWD</p>
                              <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods Breakdown */}
              {Object.keys(paymentMethods).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6 text-gray-700" />
                    Payment Methods
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(paymentMethods).map(([method, amount]) => {
                      const numericAmount = typeof amount === 'number'
                        ? amount
                        : parseFloat(`${amount ?? 0}`);
                      const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

                      return (
                        <div key={method} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <p className="text-sm text-gray-600 mb-1">{method}</p>
                          <p className="text-xl font-bold text-gray-900">{formatNumber(safeAmount)}</p>
                          <p className="text-xs text-gray-500">KWD</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Revenue */}
              {monthlyRevenue.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-6 w-6 text-gray-700" />
                    Monthly Revenue (Last 6 Months)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {monthlyRevenue.map(month => {
                      const revenueValue = typeof month.revenue === 'number'
                        ? month.revenue
                        : parseFloat(`${month.revenue ?? 0}`);
                      const safeRevenue = Number.isFinite(revenueValue) ? revenueValue : 0;

                      return (
                        <div key={month.month} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <p className="text-xs text-gray-600 mb-2">{month.month}</p>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(safeRevenue, 0)}</p>
                          <p className="text-xs text-gray-500">{month.invoiceCount} invoices</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shipments' && (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by reference, client..."
                      value={shipmentSearchTerm}
                      onChange={(e) => setShipmentSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <select
                      value={shipmentStatusFilter}
                      onChange={(e) => setShipmentStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="all">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_WAREHOUSE">In Warehouse</option>
                      <option value="RELEASED">Released</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={exportShipmentsToExcel}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold shadow-sm"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export to Excel
                </button>
              </div>

              {/* Shipments Table */}
              {shipmentsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading shipments...</p>
                </div>
              ) : getFilteredShipments().length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No shipments found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Reference ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Client Info
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Boxes
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Weight
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Received Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Rack Location
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredShipments().map((shipment, index) => (
                        <tr
                          key={shipment.id}
                          className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{shipment.referenceId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{shipment.clientName}</div>
                            <div className="text-xs text-gray-500">{shipment.clientPhone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${shipment.status === 'RELEASED'
                              ? 'bg-green-100 text-green-800'
                              : shipment.status === 'IN_WAREHOUSE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {shipment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {shipment.currentBoxCount} / {shipment.originalBoxCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {shipment.totalWeight ? `${shipment.totalWeight} kg` : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {new Date(shipment.receivedDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {shipment.rackLocations || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => navigate(`/shipment-report/${shipment.id}`)}
                              className="text-sm font-semibold text-gray-900 hover:text-gray-600 underline"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span>
                  Showing <span className="font-bold text-gray-900">{getFilteredShipments().length}</span> of{' '}
                  <span className="font-bold text-gray-900">{allShipments.length}</span> shipments
                </span>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by invoice, client, shipment..."
                      value={invoiceSearchTerm}
                      onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <select
                      value={invoiceStatusFilter}
                      onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="all">All Status</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PENDING">Pending</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={exportInvoicesToExcel}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold shadow-sm"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export to Excel
                </button>
              </div>

              {/* Invoices Table */}
              {invoicesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading invoices...</p>
                </div>
              ) : getFilteredInvoices().length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No invoices found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Shipment Ref
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Outstanding
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Invoice Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredInvoices().map((invoice, index) => {
                        const outstanding = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0);
                        return (
                          <tr
                            key={invoice.id}
                            className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-700">
                                {invoice.shipment?.referenceId || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">
                                {formatNumber(invoice.totalAmount)} KWD
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-green-600">
                                {formatNumber(invoice.paidAmount)} KWD
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-bold ${outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {formatNumber(outstanding)} KWD
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${invoice.paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : invoice.paymentStatus === 'PARTIAL'
                                  ? 'bg-blue-100 text-blue-800'
                                  : invoice.paymentStatus === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {invoice.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">
                                {new Date(invoice.invoiceDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                                className="text-sm font-semibold text-gray-900 hover:text-gray-600 underline"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span>
                  Showing <span className="font-bold text-gray-900">{getFilteredInvoices().length}</span> of{' '}
                  <span className="font-bold text-gray-900">{allInvoices.length}</span> invoices
                </span>
                <div className="flex items-center gap-6">
                  <span>
                    Total: <span className="font-bold text-gray-900">
                      {formatNumber(getFilteredInvoices().reduce((sum, i) => sum + parseFloat(`${i.totalAmount ?? 0}`), 0))} KWD
                    </span>
                  </span>
                  <span>
                    Paid: <span className="font-bold text-green-600">
                      {formatNumber(getFilteredInvoices().reduce((sum, i) => sum + parseFloat(`${i.paidAmount ?? 0}`), 0))} KWD
                    </span>
                  </span>
                  <span>
                    Outstanding: <span className="font-bold text-red-600">
                      {formatNumber(getFilteredInvoices().reduce((sum, i) => {
                        const totalAmount = parseFloat(`${i.totalAmount ?? 0}`);
                        const paidAmount = parseFloat(`${i.paidAmount ?? 0}`);
                        return sum + (totalAmount - paidAmount);
                      }, 0))} KWD
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="text-center py-12">
              <BanknotesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Payments history will be shown here</p>
              <p className="text-sm text-gray-400 mt-2">Coming in next update</p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Analytics charts will be shown here</p>
              <p className="text-sm text-gray-400 mt-2">Coming in next update</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

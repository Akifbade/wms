import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { billingAPI } from '../../services/api';

export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // NEW: Date filter
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    paid: 0,
    outstanding: 0,
    partial: 0,
    overdue: 0,
    avgInvoiceAmount: 0, // NEW
    totalPaid: 0, // NEW
  });

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, warehouseFilter, searchTerm]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter.toUpperCase();
      if (warehouseFilter === 'regular') {
        params.isWarehouseInvoice = false;
      } else if (warehouseFilter === 'warehouse') {
        params.isWarehouseInvoice = true;
      }
      if (searchTerm) params.search = searchTerm;

      const response: any = await billingAPI.getInvoices(params);
      const invoiceList = Array.isArray(response) ? response : (response.invoices || []);
      setInvoices(invoiceList);

      // Calculate stats
      calculateStats(invoiceList);
    } catch (err) {
      console.error('Load invoices error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (invoiceList: any[]) => {
    const total = invoiceList.length;
    const totalAmount = invoiceList.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);
    const totalPaid = invoiceList.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || 0), 0);
    const paid = invoiceList.filter(inv => (inv.paymentStatus || inv.status) === 'PAID').length;
    const partial = invoiceList.filter(inv => (inv.paymentStatus || inv.status) === 'PARTIAL').length;
    const overdue = invoiceList.filter(inv => (inv.paymentStatus || inv.status) === 'OVERDUE').length;
    const outstanding = invoiceList
      .filter(inv => (inv.paymentStatus || inv.status) !== 'PAID')
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0) - parseFloat(inv.paidAmount || 0), 0);
    const avgInvoiceAmount = total > 0 ? totalAmount / total : 0;

    setStats({ total, totalAmount, paid, outstanding, partial, overdue, avgInvoiceAmount, totalPaid });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      PAID: 'bg-green-100 text-green-800 border border-green-300',
      PARTIAL: 'bg-blue-100 text-blue-800 border border-blue-300',
      OVERDUE: 'bg-red-100 text-red-800 border border-red-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border border-gray-300',
    };

    const icons = {
      PENDING: <ClockIcon className="h-4 w-4" />,
      PAID: <CheckCircleIcon className="h-4 w-4" />,
      PARTIAL: <CurrencyDollarIcon className="h-4 w-4" />,
      OVERDUE: <XCircleIcon className="h-4 w-4" />,
      CANCELLED: <XCircleIcon className="h-4 w-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${styles[status as keyof typeof styles] || styles.PENDING}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-gray-700" />
            Invoices & Billing
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive invoice management and payment tracking</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold shadow-sm">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export to Excel
          </button>
          <button className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold shadow-sm">
            <PrinterIcon className="h-5 w-5 mr-2" />
            Print Report
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <DocumentTextIcon className="h-7 w-7 text-gray-700" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">All time invoices</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <CurrencyDollarIcon className="h-7 w-7 text-gray-700" />
            </div>
            <BanknotesIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAmount.toFixed(3)}</p>
          <p className="text-xs text-gray-500 mt-2">KWD • Avg: {stats.avgInvoiceAmount.toFixed(3)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-7 w-7 text-green-600" />
            </div>
            <ReceiptPercentIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Paid Amount</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalPaid.toFixed(3)}</p>
          <p className="text-xs text-gray-500 mt-2">KWD • {stats.paid} invoices paid</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <ClockIcon className="h-7 w-7 text-red-600" />
            </div>
            <XCircleIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Outstanding</p>
          <p className="text-3xl font-bold text-red-600">{stats.outstanding.toFixed(3)}</p>
          <p className="text-xs text-gray-500 mt-2">KWD • Overdue: {stats.overdue}</p>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-gray-700" />
            Quick Overview
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{invoices.filter(i => (i.paymentStatus || i.status) === 'PENDING').length}</p>
            <p className="text-xs text-gray-600 font-medium mt-1">⏳ Pending</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-gray-600 font-medium mt-1">✅ Paid</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-blue-600">{stats.partial}</p>
            <p className="text-xs text-gray-600 font-medium mt-1">💰 Partial</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-gray-600 font-medium mt-1">⚠️ Overdue</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-600">{invoices.filter(i => (i.paymentStatus || i.status) === 'CANCELLED').length}</p>
            <p className="text-xs text-gray-600 font-medium mt-1">❌ Cancelled</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-base font-bold text-gray-900">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice number, client name, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-medium appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Warehouse Filter */}
          <div className="relative">
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm font-medium appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="regular">Regular Invoices</option>
              <option value="warehouse">Warehouse Invoices</option>
            </select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mt-4 flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'today' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'week' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'month' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Shipment
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading invoices...</p>
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((invoice, index) => {
                  const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0);
                  return (
                    <tr key={invoice.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                          <span className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{invoice.clientName}</div>
                            <div className="text-xs text-gray-500">{invoice.clientPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-semibold border border-gray-300">
                          {invoice.shipment?.referenceId || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{parseFloat(invoice.totalAmount).toFixed(3)}</div>
                        <div className="text-xs text-gray-500 font-medium">KWD</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">{parseFloat(invoice.paidAmount || 0).toFixed(3)}</div>
                        <div className="text-xs text-gray-500 font-medium">KWD</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance.toFixed(3)}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">KWD</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.paymentStatus || invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold text-xs"
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-bold text-gray-500">No invoices found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

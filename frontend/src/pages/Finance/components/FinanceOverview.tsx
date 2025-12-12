import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BanknotesIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    UserGroupIcon,
    CalendarIcon,
    ClockIcon,
    DocumentTextIcon,
    CreditCardIcon,
    TruckIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { getAuthToken } from '../../../services/api';

export const FinanceOverview = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('month'); // day, week, month, year, all
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
        fetchTopCustomers();
        fetchRecentTransactions();
    }, [timeRange]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            let query = '';
            const now = new Date();

            if (timeRange === 'day') {
                const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                const end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
                query = `?startDate=${start}&endDate=${end}`;
            } else if (timeRange === 'week') {
                const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                query = `?startDate=${start}`;
            } else if (timeRange === 'month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                query = `?startDate=${start}`;
            } else if (timeRange === 'year') {
                const start = new Date(now.getFullYear(), 0, 1).toISOString();
                query = `?startDate=${start}`;
            }

            const response = await fetch(`/api/finance/overview${query}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch finance stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopCustomers = async () => {
        try {
            const response = await fetch('/api/finance/top-customers?limit=5', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            setTopCustomers(data || []);
        } catch (error) {
            console.error('Failed to fetch top customers:', error);
        }
    };

    const fetchRecentTransactions = async () => {
        try {
            const response = await fetch('/api/finance/transactions?limit=10', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            // The transactions endpoint returns an array directly
            setRecentTransactions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch recent transactions:', error);
        }
    };

    const getTimeRangeLabel = () => {
        switch (timeRange) {
            case 'day': return 'Today';
            case 'week': return 'Last 7 Days';
            case 'month': return 'This Month';
            case 'year': return 'This Year';
            default: return 'All Time';
        }
    };

    if (loading) return <div className="p-8 text-center">Loading financial data...</div>;
    if (!stats) return <div className="p-8 text-center text-red-600">Failed to load data</div>;

    return (
        <div className="p-6 space-y-6 bg-gray-50">
            {/* Header with Time Range Selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
                    <p className="text-sm text-gray-600 mt-1">{getTimeRangeLabel()} Performance Overview</p>
                </div>
                <div className="flex gap-2">
                    {['day', 'week', 'month', 'year', 'all'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === range
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                }`}
                        >
                            {range === 'day' ? 'Today' : range === 'week' ? '7 Days' : range === 'month' ? 'Month' : range === 'year' ? 'Year' : 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Net Profit */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Net Profit</p>
                            <p className={`text-2xl font-bold mt-2 ${(stats.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(stats.netProfit || 0).toFixed(3)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">KWD</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <BanknotesIcon className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-600 mt-2">{(stats.totalRevenue || 0).toFixed(3)}</p>
                            <p className="text-xs text-gray-500 mt-1">KWD</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="text-green-600 font-medium">✓ {(stats.totalCollected || 0).toFixed(2)} Collected</span>
                        <span className="text-red-600 font-medium">⏳ {(stats.totalPending || 0).toFixed(2)} Pending</span>
                    </div>
                </div>

                {/* Total Expenses */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600 mt-2">{(stats.totalExpenses || 0).toFixed(3)}</p>
                            <p className="text-xs text-gray-500 mt-1">KWD</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full">
                            <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
                        </div>
                    </div>
                </div>

                {/* Material Costs */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Material Costs</p>
                            <p className="text-2xl font-bold text-purple-600 mt-2">
                                {((stats.breakdown?.materialPurchases || 0) + (stats.breakdown?.damageLosses || 0)).toFixed(3)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">KWD</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts and Breakdown Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-gray-600" />
                            Expense Breakdown
                        </h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                                <span className="text-sm font-medium text-gray-700">General Expenses</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{(stats.breakdown?.generalExpenses || 0).toFixed(3)} KWD</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-medium text-blue-700">Material Purchases</span>
                            </div>
                            <span className="text-sm font-bold text-blue-900">{(stats.breakdown?.materialPurchases || 0).toFixed(3)} KWD</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-medium text-red-700">Damage Losses</span>
                            </div>
                            <span className="text-sm font-bold text-red-900">{(stats.breakdown?.damageLosses || 0).toFixed(3)} KWD</span>
                        </div>
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <UserGroupIcon className="h-5 w-5 text-gray-600" />
                            Top Customers
                        </h3>
                        <button
                            onClick={() => navigate('/finance')}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-3">
                        {topCustomers.length > 0 ? topCustomers.slice(0, 5).map((customer, idx) => (
                            <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                onClick={() => navigate(`/companies/${customer.id}`)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{customer.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{customer.totalInvoices || 0} invoices</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-blue-600">{(customer.totalRevenue || 0).toFixed(2)} KWD</span>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-4">No customer data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-gray-600" />
                        Recent Transactions
                    </h3>
                    <button
                        onClick={() => navigate('/finance')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        View All →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentTransactions.length > 0 ? recentTransactions.slice(0, 8).map((txn) => (
                                <tr key={txn.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {new Date(txn.date || txn.paymentDate || txn.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${txn.type === 'INCOME' ? 'bg-green-100 text-green-800' :
                                                txn.type === 'EXPENSE' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                            }`}>
                                            {txn.type || txn.paymentType || 'INVOICE'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {txn.description || txn.invoice?.companyProfile?.name || txn.category || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{txn.category || txn.paymentMethod || 'N/A'}</td>
                                    <td className={`px-4 py-3 text-sm font-bold text-right ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {txn.amount >= 0 ? '+' : ''}{(txn.amount || 0).toFixed(3)} KWD
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No recent transactions
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button onClick={() => navigate('/invoices')} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center gap-3">
                    <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">View Invoices</span>
                </button>
                <button onClick={() => navigate('/finance')} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center gap-3">
                    <CreditCardIcon className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Advance Payments</span>
                </button>
                <button onClick={() => navigate('/finance')} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center gap-3">
                    <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Manage Contracts</span>
                </button>
                <button onClick={() => navigate('/shipments')} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center gap-3">
                    <TruckIcon className="h-6 w-6 text-orange-600" />
                    <span className="text-sm font-medium text-gray-900">View Shipments</span>
                </button>
            </div>
        </div>
    );
};

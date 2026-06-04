import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    DocumentTextIcon,
    TruckIcon,
    CurrencyDollarIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PrinterIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { getAuthToken, getBackendUrl } from '../../../services/api';

interface ContractStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string | null;
    customerName?: string;
}

interface StatementData {
    contract: {
        id: string;
        customerName: string;
        contactPerson: string;
        contactPhone: string;
        monthlyRate: number;
        status: string;
        startDate: string;
        endDate: string | null;
        totalPaid: number;
        balance: number;
    };
    summary: {
        contractValue: number;
        monthsActive: number;
        totalShipmentsReleased: number;
        totalBoxesReleased: number;
        totalCBMReleased: number;
        totalInvoiced: number;
        totalPaid: number;
        totalOutstanding: number;
    };
    releasedShipments: any[];
    invoices: any[];
    transactions: any[];
    history: any[];
}

export const ContractStatementModal: React.FC<ContractStatementModalProps> = ({
    isOpen,
    onClose,
    contractId,
    customerName
}) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<StatementData | null>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'summary' | 'shipments' | 'invoices' | 'transactions'>('summary');

    useEffect(() => {
        if (isOpen && contractId) {
            loadStatement();
        }
    }, [isOpen, contractId]);

    const loadStatement = async () => {
        if (!contractId) return;

        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${getBackendUrl()}/api/contracts/statement/${contractId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load contract statement');
            }

            const result = await response.json();
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to load statement');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <DocumentTextIcon className="h-7 w-7 text-blue-600" />
                            Contract Statement
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {customerName || data?.contract?.customerName || 'Customer'} | كشف الحساب
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            title="Print"
                        >
                            <PrinterIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16 text-red-600">
                            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4" />
                            <p>{error}</p>
                        </div>
                    ) : data ? (
                        <>
                            {/* Contract Info Banner */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-blue-200 text-sm">Monthly Rate</p>
                                        <p className="text-2xl font-bold">{data.contract.monthlyRate?.toFixed(3)} KWD</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-200 text-sm">Contract Value</p>
                                        <p className="text-2xl font-bold">{data.summary.contractValue?.toFixed(3)} KWD</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-200 text-sm">Months Active</p>
                                        <p className="text-2xl font-bold">{data.summary.monthsActive} months</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-200 text-sm">Status</p>
                                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${data.contract.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                                            }`}>
                                            {data.contract.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <TruckIcon className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Shipments Released</p>
                                            <p className="text-xl font-bold text-gray-900">{data.summary.totalShipmentsReleased}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Boxes Released</p>
                                            <p className="text-xl font-bold text-gray-900">{data.summary.totalBoxesReleased}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total CBM</p>
                                            <p className="text-xl font-bold text-gray-900">{data.summary.totalCBMReleased?.toFixed(3)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <CheckCircleIcon className="h-6 w-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total Paid</p>
                                            <p className="text-xl font-bold text-green-600">{data.summary.totalPaid?.toFixed(3)} KWD</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 mb-4">
                                <nav className="-mb-px flex space-x-8">
                                    {[
                                        { id: 'summary', name: '📊 Summary' },
                                        { id: 'shipments', name: '📦 Shipments Released' },
                                        { id: 'invoices', name: '📄 Invoices' },
                                        { id: 'transactions', name: '💰 Transactions' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {tab.name}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Tab Content */}
                            <div className="mt-4">
                                {activeTab === 'summary' && (
                                    <div className="bg-gray-50 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold mb-4">Contract Summary</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-lg border">
                                                <p className="text-sm text-gray-500">Contract Start</p>
                                                <p className="font-semibold">{new Date(data.contract.startDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border">
                                                <p className="text-sm text-gray-500">Contract End</p>
                                                <p className="font-semibold">
                                                    {data.contract.endDate ? new Date(data.contract.endDate).toLocaleDateString() : 'Indefinite'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border">
                                                <p className="text-sm text-gray-500">Total Invoiced</p>
                                                <p className="font-semibold">{data.summary.totalInvoiced?.toFixed(3)} KWD</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border">
                                                <p className="text-sm text-gray-500">Outstanding Balance</p>
                                                <p className={`font-semibold ${data.summary.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {data.summary.totalOutstanding?.toFixed(3)} KWD
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'shipments' && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boxes</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CBM</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Released</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {data.releasedShipments.length > 0 ? data.releasedShipments.map((s) => (
                                                    <tr key={s.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{s.referenceId}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{s.description || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{s.originalBoxCount || 0}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{s.cbm?.toFixed(3) || '-'}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${s.status === 'RELEASED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {s.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">
                                                            {new Date(s.updatedAt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                            No shipments released under this contract
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'invoices' && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {data.invoices.length > 0 ? data.invoices.map((inv) => (
                                                    <tr key={inv.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{inv.invoiceNumber}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {new Date(inv.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-right font-medium">{inv.totalAmount?.toFixed(3)} KWD</td>
                                                        <td className="px-4 py-3 text-sm text-right text-green-600">{inv.paidAmount?.toFixed(3)} KWD</td>
                                                        <td className="px-4 py-3 text-sm text-right text-red-600">{inv.balanceDue?.toFixed(3)} KWD</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${inv.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                                                                    inv.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                }`}>
                                                                {inv.paymentStatus}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                            No invoices found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'transactions' && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {data.transactions.length > 0 ? data.transactions.map((txn) => (
                                                    <tr key={txn.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {new Date(txn.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${txn.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {txn.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{txn.description || '-'}</td>
                                                        <td className={`px-4 py-3 text-sm text-right font-medium ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {txn.type === 'CREDIT' ? '+' : '-'}{Math.abs(txn.amount)?.toFixed(3)} KWD
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                            No transactions found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

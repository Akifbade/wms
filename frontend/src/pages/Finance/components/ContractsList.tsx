import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    DocumentTextIcon,
    PlusIcon,
    PencilSquareIcon,
    EyeIcon,
    XCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getAuthToken, getBackendUrl } from '../../../services/api';
import { ContractActionModal } from './ContractActionModal';
import { ContractStatementModal } from './ContractStatementModal';

export const ContractsList = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [editData, setEditData] = useState({
        monthlyRate: 0,
        paymentDueDay: 25,
        maxCBM: 0,
        maxStorageDays: 0,
        contractStartDate: '',
        contractEndDate: '',
        status: 'ACTIVE',
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    const openStatementModal = (contract: any) => {
        setSelectedContract(contract);
        setShowStatementModal(true);
    };

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        try {
            setLoading(true);
            // Fetch full contract details with company profile information
            const response = await fetch('/api/prepaid/balances?includeDetails=true', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setContracts(data);
            }
        } catch (error) {
            console.error('Failed to load contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredContracts = contracts.filter(c =>
        c.companyProfile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.companyProfile?.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openEditModal = (contract: any) => {
        setSelectedContract(contract);
        setEditData({
            monthlyRate: contract.monthlyRate || 0,
            paymentDueDay: contract.paymentDueDay || 25,
            maxCBM: contract.maxCBM || 0,
            maxStorageDays: contract.maxStorageDays || 0,
            contractStartDate: contract.contractStartDate ? new Date(contract.contractStartDate).toISOString().split('T')[0] : '',
            contractEndDate: contract.contractEndDate ? new Date(contract.contractEndDate).toISOString().split('T')[0] : '',
            status: contract.status || 'ACTIVE',
            notes: ''
        });
        setShowEditModal(true);
    };

    const handleSaveContract = async () => {
        if (!selectedContract) return;
        try {
            setSaving(true);
            const response = await fetch(`${getBackendUrl()}/api/contracts/${selectedContract.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    monthlyRate: parseFloat(String(editData.monthlyRate)) || 0,
                    paymentDueDay: parseInt(String(editData.paymentDueDay)) || 25,
                    maxCBM: parseFloat(String(editData.maxCBM)) || null,
                    maxStorageDays: parseInt(String(editData.maxStorageDays)) || null,
                    contractStartDate: editData.contractStartDate || null,
                    contractEndDate: editData.contractEndDate || null,
                    status: editData.status,
                    notes: editData.notes || undefined
                })
            });

            if (response.ok) {
                setShowEditModal(false);
                await loadContracts();
                alert('Contract updated successfully!');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update contract');
            }
        } catch (error: any) {
            console.error('Failed to update contract:', error);
            alert('Failed to update contract');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h2 className="text-xl font-semibold text-gray-900">Contracts & Prepaid Balances</h2>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage customer contracts, monthly rates, and prepaid balances.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        New Contract
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                        Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Company / Profile
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Contact
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Contract Period
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Monthly Rate
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Payment Due Day
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Balance
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Status
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="py-10 text-center text-gray-500">
                                                Loading contracts...
                                            </td>
                                        </tr>
                                    ) : filteredContracts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-10 text-center text-gray-500">
                                                No contracts found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredContracts.map((contract) => {
                                            const startDate = contract.contractStartDate ? new Date(contract.contractStartDate) : null;
                                            const endDate = contract.contractEndDate ? new Date(contract.contractEndDate) : null;
                                            const daysRemaining = endDate ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                                            const isExpired = daysRemaining !== null && daysRemaining <= 0;

                                            return (
                                                <tr key={contract.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                        <button
                                                            onClick={() => navigate(`/companies/${contract.companyProfileId}`)}
                                                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                                                        >
                                                            {contract.companyProfile?.name || 'Unknown Profile'}
                                                        </button>
                                                        <div className="text-xs text-gray-500">{contract.companyProfile?.description || ''}</div>
                                                        {isExpired && (
                                                            <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-semibold">
                                                                <ExclamationTriangleIcon className="h-3 w-3" />
                                                                EXPIRED
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <div>{contract.companyProfile?.contactPerson || 'N/A'}</div>
                                                        <div className="text-xs text-gray-400">{contract.companyProfile?.contactPhone || ''}</div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <div>{startDate ? startDate.toLocaleDateString() : 'N/A'}</div>
                                                        <div className="text-xs">to {endDate ? endDate.toLocaleDateString() : 'Indefinite'}</div>
                                                        {daysRemaining !== null && (
                                                            <div className={`text-xs font-medium mt-1 ${daysRemaining <= 30 ? 'text-red-600' : daysRemaining <= 60 ? 'text-yellow-600' : 'text-gray-500'}`}>
                                                                {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-gray-900">
                                                        {(contract.monthlyRate || 0).toFixed(3)} KWD
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        Day {contract.paymentDueDay || 25} of month
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                                                        <span className={contract.balance < 0 ? 'text-red-600' : 'text-green-600'}>
                                                            {(contract.balance || 0).toFixed(3)} KWD
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${contract.status === 'ACTIVE' && !isExpired ? 'bg-green-100 text-green-800' :
                                                            contract.status === 'EXPIRED' || isExpired ? 'bg-red-100 text-red-800' :
                                                                contract.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {isExpired ? 'EXPIRED' : contract.status || 'UNKNOWN'}
                                                        </span>
                                                    </td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => openStatementModal(contract)}
                                                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                                                title="View Statement"
                                                            >
                                                                <DocumentTextIcon className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/companies/${contract.companyProfileId}`)}
                                                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                                title="View Profile"
                                                            >
                                                                <EyeIcon className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(contract)}
                                                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                                                                title="Edit Contract"
                                                            >
                                                                <PencilSquareIcon className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Contract Modal */}
            <ContractActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    loadContracts();
                    setIsModalOpen(false);
                }}
            />

            {/* Edit Contract Modal */}
            {showEditModal && selectedContract && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 rounded-t-xl sticky top-0">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <DocumentTextIcon className="h-6 w-6 text-white" />
                                    <h3 className="text-lg font-semibold text-white">Edit Contract</h3>
                                </div>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-white hover:text-blue-200"
                                >
                                    <XCircleIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Customer Info */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <p className="text-sm text-gray-600">Customer</p>
                                <p className="font-semibold text-gray-900">{selectedContract.companyProfile?.name}</p>
                            </div>

                            {/* Monthly Rate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    💰 Monthly Rate (KWD) *
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={editData.monthlyRate}
                                    onChange={(e) => setEditData({ ...editData, monthlyRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Fixed monthly payment amount</p>
                            </div>

                            {/* Payment Due Day */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📅 Payment Due Day (1-31)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={editData.paymentDueDay}
                                    onChange={(e) => setEditData({ ...editData, paymentDueDay: parseInt(e.target.value) || 25 })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Day of month when payment is due</p>
                            </div>

                            {/* CBM Limit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📦 Max CBM Allowed (leave 0 for unlimited)
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={editData.maxCBM}
                                    onChange={(e) => setEditData({ ...editData, maxCBM: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Maximum CBM this customer can store. Set 0 for no limit.</p>
                            </div>

                            {/* Storage Days Limit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🕐 Max Storage Days (leave 0 for unlimited)
                                </label>
                                <input
                                    type="number"
                                    value={editData.maxStorageDays}
                                    onChange={(e) => setEditData({ ...editData, maxStorageDays: parseInt(e.target.value) || 0 })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Maximum days goods can be stored. Set 0 for no limit.</p>
                            </div>

                            {/* Contract Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        📆 Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editData.contractStartDate}
                                        onChange={(e) => setEditData({ ...editData, contractStartDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        📆 End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editData.contractEndDate}
                                        onChange={(e) => setEditData({ ...editData, contractEndDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📋 Status
                                </label>
                                <select
                                    value={editData.status}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="ACTIVE">ACTIVE - Contract active</option>
                                    <option value="SUSPENDED">SUSPENDED - Temporarily suspended</option>
                                    <option value="EXPIRED">EXPIRED - Contract expired</option>
                                    <option value="CANCELLED">CANCELLED - Contract cancelled</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📝 Notes (Optional)
                                </label>
                                <textarea
                                    value={editData.notes}
                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Reason for changes..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveContract}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contract Statement Modal */}
            <ContractStatementModal
                isOpen={showStatementModal}
                onClose={() => setShowStatementModal(false)}
                contractId={selectedContract?.id}
                customerName={selectedContract?.companyProfile?.name}
            />
        </div>
    );
};

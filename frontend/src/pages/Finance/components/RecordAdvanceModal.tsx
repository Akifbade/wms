import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { shipmentsAPI, getAuthToken } from '../../../services/api';

interface RecordAdvanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const RecordAdvanceModal: React.FC<RecordAdvanceModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [step, setStep] = useState<'search' | 'details'>('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<any>(null);

    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [transactionRef, setTransactionRef] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('search');
            setSearchTerm('');
            setSearchResults([]);
            setSelectedShipment(null);
            setAmount('');
            setPaymentMethod('CASH');
            setTransactionRef('');
            setNotes('');
            setError('');
            // Load all active shipments when modal opens
            loadAllShipments();
        }
    }, [isOpen]);

    // Filter results based on search term
    useEffect(() => {
        if (searchTerm) {
            performSearch();
        } else if (isOpen) {
            loadAllShipments();
        }
    }, [searchTerm]);

    const loadAllShipments = async () => {
        setSearching(true);
        try {
            const data = await shipmentsAPI.getAll({ limit: 200 });
            setSearchResults(data.shipments || []);
        } catch (err) {
            console.error('Failed to load shipments', err);
        } finally {
            setSearching(false);
        }
    };

    const performSearch = async () => {
        setSearching(true);
        try {
            // Use shipmentsAPI to search
            const data = await shipmentsAPI.getAll({ search: searchTerm, limit: 100 });
            setSearchResults(data.shipments || []);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectShipment = (shipment: any) => {
        setSelectedShipment(shipment);
        setStep('details');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedShipment) return;

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch(`/api/billing/shipments/${selectedShipment.id}/advance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    paymentMethod,
                    transactionRef,
                    notes
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to record advance payment');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                Record Advance Payment
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {step === 'search' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Shipment for Advance Payment</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                            placeholder="Filter by Ref ID, Client Name, Phone..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Full Shipments Table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="max-h-96 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boxes</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {searching && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading shipments...</td>
                                                    </tr>
                                                )}
                                                {!searching && searchResults.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No active shipments found</td>
                                                    </tr>
                                                )}
                                                {searchResults.map((shipment) => (
                                                    <tr
                                                        key={shipment.id}
                                                        onClick={() => handleSelectShipment(shipment)}
                                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                    >
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-blue-600">{shipment.referenceId}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm font-medium text-gray-900">{shipment.clientName}</div>
                                                            <div className="text-xs text-gray-500">{shipment.clientPhone || shipment.clientEmail}</div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${shipment.type === 'COMMERCIAL' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                {shipment.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            {shipment.currentBoxCount || 0} / {shipment.originalBoxCount || 0}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(shipment.arrivalDate).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${shipment.status === 'RELEASED' ? 'bg-green-100 text-green-800' :
                                                                    shipment.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {shipment.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 text-center">💡 Click on any shipment to record advance payment</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded-md mb-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Selected Shipment</p>
                                            <p className="text-sm text-gray-500">{selectedShipment.referenceId} - {selectedShipment.clientName}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep('search')}
                                            className="text-xs text-primary-600 hover:text-primary-800"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                                        <span className="block sm:inline">{error}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Amount (KWD)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="KNET">KNET</option>
                                        <option value="CARD">Credit Card</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Transaction Reference (Optional)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={transactionRef}
                                        onChange={(e) => setTransactionRef(e.target.value)}
                                        placeholder="e.g. KNET Ref Number"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                                    <textarea
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>

                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                    >
                                        {submitting ? 'Recording...' : 'Record Payment'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

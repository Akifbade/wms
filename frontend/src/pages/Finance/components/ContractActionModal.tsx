import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { companiesAPI, getAuthToken } from '../../../services/api';

interface ContractActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ContractActionModal: React.FC<ContractActionModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [step, setStep] = useState<'search' | 'details'>('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);

    const [amount, setAmount] = useState('');
    const [monthlyRate, setMonthlyRate] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('search');
            setSearchTerm('');
            setSearchResults([]);
            setSelectedProfile(null);
            setAmount('');
            setMonthlyRate('');
            setValidUntil('');
            setNotes('');
            setError('');
            // Load all profiles when modal opens
            loadAllProfiles();
        }
    }, [isOpen]);

    // Filter results based on search term
    useEffect(() => {
        if (searchTerm) {
            performSearch();
        } else if (isOpen) {
            loadAllProfiles();
        }
    }, [searchTerm]);

    const loadAllProfiles = async () => {
        setSearching(true);
        try {
            const data = await companiesAPI.listProfiles();
            setSearchResults(data);
        } catch (err) {
            console.error('Failed to load profiles', err);
        } finally {
            setSearching(false);
        }
    };

    const performSearch = async () => {
        setSearching(true);
        try {
            // Fetch all profiles and filter client-side (API doesn't support search yet)
            const data = await companiesAPI.listProfiles();
            const filtered = data.filter((p: any) =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(filtered);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectProfile = (profile: any) => {
        setSelectedProfile(profile);
        // Pre-fill if existing contract data available (would need to fetch balance details)
        setStep('details');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile) return;

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/prepaid/balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    companyProfileId: selectedProfile.id,
                    amount: parseFloat(amount),
                    monthlyRate: monthlyRate ? parseFloat(monthlyRate) : undefined,
                    validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
                    notes
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update contract');
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
                                Manage Contract / Add Funds
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {step === 'search' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Company Profile for Contract</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                            placeholder="Filter by Company Name or Contact Person..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Full Company Profiles Table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="max-h-96 overflow-y-auto overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {searching && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">Loading company profiles...</td>
                                                    </tr>
                                                )}
                                                {!searching && searchResults.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">No company profiles found</td>
                                                    </tr>
                                                )}
                                                {searchResults.map((profile) => (
                                                    <tr
                                                        key={profile.id}
                                                        onClick={() => handleSelectProfile(profile)}
                                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm font-medium text-blue-600">{profile.name}</div>
                                                            {profile.description && <div className="text-xs text-gray-500">{profile.description}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            {profile.contactPerson || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                            {profile.contactPhone || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${profile.contractStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                                    profile.contractStatus === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {profile.contractStatus || 'PENDING'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 text-center">💡 Click on any company to manage contract or add funds</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded-md mb-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Selected Profile</p>
                                            <p className="text-sm text-gray-500">{selectedProfile.name}</p>
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
                                    <label className="block text-sm font-medium text-gray-700">Add Amount (KWD)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Amount to add to balance"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Monthly Rate (Optional)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                            value={monthlyRate}
                                            onChange={(e) => setMonthlyRate(e.target.value)}
                                            placeholder="Update rate"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Valid Until (Optional)</label>
                                        <input
                                            type="date"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                            value={validUntil}
                                            onChange={(e) => setValidUntil(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                                    <textarea
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Payment reference or contract notes"
                                    />
                                </div>

                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : 'Save Contract'}
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

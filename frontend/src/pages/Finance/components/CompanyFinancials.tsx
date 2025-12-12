import React, { useState, useEffect } from 'react';
import {
    DocumentTextIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { getAuthToken } from '../../../services/api';

export const CompanyFinancials = () => {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/finance/companies', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            setCompanies(data);
        } catch (error) {
            console.error('Failed to fetch company financials:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportStatement = (companyId: string) => {
        // Placeholder for export functionality
        alert(`Exporting statement for company ID: ${companyId}`);
        // In real implementation, this would trigger a PDF download from backend
    };

    if (loading) return <div className="p-8 text-center">Loading company data...</div>;

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h2 className="text-xl font-semibold text-gray-900">Company Financials</h2>
                    <p className="mt-2 text-sm text-gray-700">
                        Detailed breakdown of shipments, billing, and payments per company.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <input
                        type="text"
                        placeholder="Search companies..."
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Company</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Shipments</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Billed</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Paid</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Pending</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredCompanies.map((company) => (
                                        <tr key={company.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                <div className="font-medium text-gray-900">{company.name}</div>
                                                <div className="text-gray-500">{company.contactPerson}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {company.totalShipments}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                                                {(company.financials?.billed || 0).toFixed(3)} KWD
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                                                {(company.financials?.paid || 0).toFixed(3)} KWD
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                                                <span className={(company.financials?.pending || 0) > 0 ? 'text-red-600' : 'text-gray-500'}>
                                                    {(company.financials?.pending || 0).toFixed(3)} KWD
                                                </span>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    onClick={() => handleExportStatement(company.id)}
                                                    className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                                                >
                                                    <DocumentTextIcon className="h-4 w-4 mr-1" />
                                                    Statement
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BuildingOfficeIcon,
    ChartBarIcon,
    ArchiveBoxIcon,
    TruckIcon,
    CubeIcon,
    MapPinIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    ArrowTrendingUpIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { getAuthToken } from '../../services/api';

interface CompanyStats {
    id: string;
    name: string;
    logoUrl?: string;
    contactPerson?: string;
    totalShipments: number;
    activeShipments: number;
    releasedShipments: number;
    totalBoxes: number;
    currentBoxes: number;
    totalPallets: number;
    currentPallets: number;
    rackLocations: string[];
    totalInvoiceAmount: number;
    outstandingBalance: number;
}

interface OverallStats {
    totalCompanies: number;
    totalShipments: number;
    activeShipments: number;
    totalBoxes: number;
    currentBoxes: number;
    totalPallets: number;
    currentPallets: number;
    totalRevenue: number;
    outstandingBalance: number;
}

interface RackLocationInfo {
    rackCode: string;
    zone: string;
    shipmentCount: number;
    boxCount: number;
    palletCount: number;
    shipments: {
        referenceId: string;
        clientName: string;
        companyName: string;
        boxes: number;
        pallets: number;
    }[];
}

const CompanyAnalytics: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<CompanyStats[]>([]);
    const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
    const [rackLocations, setRackLocations] = useState<RackLocationInfo[]>([]);
    const [activeTab, setActiveTab] = useState<'companies' | 'locations'>('companies');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'shipments' | 'boxes' | 'revenue'>('shipments');

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();

            // Load all companies with their analytics
            const companiesRes = await axios.get('/api/companies/all-analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCompanies(companiesRes.data.companies || []);
            setOverallStats(companiesRes.data.overall || null);
            setRackLocations(companiesRes.data.rackLocations || []);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (value: number | null | undefined, decimals = 3) => {
        const num = value ?? 0;
        return num.toFixed(decimals);
    };

    const getFilteredCompanies = () => {
        let filtered = companies;

        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'shipments':
                    return b.totalShipments - a.totalShipments;
                case 'boxes':
                    return b.currentBoxes - a.currentBoxes;
                case 'revenue':
                    return b.totalInvoiceAmount - a.totalInvoiceAmount;
                default:
                    return 0;
            }
        });

        return filtered;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ChartBarIcon className="w-8 h-8 text-blue-600" />
                        Company Analytics
                    </h1>
                    <p className="text-gray-600 mt-1">Overview of all companies, shipments, boxes, pallets, and rack locations</p>
                </div>
            </div>

            {/* Overall Statistics */}
            {overallStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Total Companies</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{overallStats.totalCompanies}</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TruckIcon className="w-6 h-6 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Total Shipments</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{overallStats.totalShipments}</p>
                        <p className="text-xs text-green-600 mt-1">{overallStats.activeShipments} active</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <ArchiveBoxIcon className="w-6 h-6 text-orange-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Total Boxes</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{overallStats.totalBoxes}</p>
                        <p className="text-xs text-blue-600 mt-1">{overallStats.currentBoxes} in storage</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <CubeIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Total Pallets</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{overallStats.totalPallets}</p>
                        <p className="text-xs text-blue-600 mt-1">{overallStats.currentPallets} in storage</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{formatNumber(overallStats.totalRevenue)} KWD</p>
                        <p className="text-xs text-red-600 mt-1">{formatNumber(overallStats.outstandingBalance)} outstanding</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('companies')}
                            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'companies'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <BuildingOfficeIcon className="w-5 h-5" />
                            Companies ({companies.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('locations')}
                            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'locations'
                                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <MapPinIcon className="w-5 h-5" />
                            Rack Locations ({rackLocations.length})
                        </button>
                    </div>
                </div>

                {/* Companies Tab */}
                {activeTab === 'companies' && (
                    <div className="p-4">
                        {/* Search and Sort */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1 relative">
                                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search companies..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <FunnelIcon className="w-5 h-5 text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="shipments">Sort by Shipments</option>
                                    <option value="boxes">Sort by Boxes</option>
                                    <option value="revenue">Sort by Revenue</option>
                                    <option value="name">Sort by Name</option>
                                </select>
                            </div>
                        </div>

                        {/* Companies Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getFilteredCompanies().map((company) => (
                                <div
                                    key={company.id}
                                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {company.logoUrl ? (
                                                <img
                                                    src={company.logoUrl}
                                                    alt={company.name}
                                                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                                    <BuildingOfficeIcon className="w-6 h-6 text-gray-500" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{company.name}</h3>
                                                {company.contactPerson && (
                                                    <p className="text-xs text-gray-500">{company.contactPerson}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/company-profile/${company.id}`)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="View Details"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <div className="bg-white rounded p-2 border border-gray-100">
                                            <p className="text-xs text-gray-500">Shipments</p>
                                            <p className="text-lg font-bold text-gray-900">{company.totalShipments}</p>
                                            <p className="text-xs text-green-600">{company.activeShipments} active</p>
                                        </div>
                                        <div className="bg-white rounded p-2 border border-gray-100">
                                            <p className="text-xs text-gray-500">Boxes</p>
                                            <p className="text-lg font-bold text-gray-900">{company.currentBoxes}</p>
                                            <p className="text-xs text-gray-400">of {company.totalBoxes}</p>
                                        </div>
                                        <div className="bg-white rounded p-2 border border-gray-100">
                                            <p className="text-xs text-gray-500">Pallets</p>
                                            <p className="text-lg font-bold text-indigo-600">{company.currentPallets}</p>
                                            <p className="text-xs text-gray-400">of {company.totalPallets}</p>
                                        </div>
                                        <div className="bg-white rounded p-2 border border-gray-100">
                                            <p className="text-xs text-gray-500">Revenue</p>
                                            <p className="text-lg font-bold text-green-600">{formatNumber(company.totalInvoiceAmount, 0)}</p>
                                            <p className="text-xs text-gray-400">KWD</p>
                                        </div>
                                    </div>

                                    {/* Rack Locations */}
                                    {company.rackLocations && company.rackLocations.length > 0 && (
                                        <div className="border-t border-gray-200 pt-3">
                                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                <MapPinIcon className="w-4 h-4" />
                                                Rack Locations
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {company.rackLocations.slice(0, 5).map((loc, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium"
                                                    >
                                                        {loc}
                                                    </span>
                                                ))}
                                                {company.rackLocations.length > 5 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                        +{company.rackLocations.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {getFilteredCompanies().length === 0 && (
                            <div className="text-center py-12">
                                <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No companies found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Locations Tab */}
                {activeTab === 'locations' && (
                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rack</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zone</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Shipments</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Boxes</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Pallets</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rackLocations.map((rack, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-blue-600">{rack.rackCode}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-gray-700">{rack.zone || 'Default'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                                                    {rack.shipmentCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">
                                                    {rack.boxCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium">
                                                    {rack.palletCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {rack.shipments.slice(0, 3).map((shipment, sIdx) => (
                                                        <div key={sIdx} className="text-xs">
                                                            <span className="font-medium text-gray-900">{shipment.referenceId}</span>
                                                            <span className="text-gray-500"> - {shipment.companyName}</span>
                                                            <span className="text-gray-400"> ({shipment.boxes} boxes, {shipment.pallets} pallets)</span>
                                                        </div>
                                                    ))}
                                                    {rack.shipments.length > 3 && (
                                                        <p className="text-xs text-gray-400">+{rack.shipments.length - 3} more shipments</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {rackLocations.length === 0 && (
                            <div className="text-center py-12">
                                <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No rack locations with shipments</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyAnalytics;

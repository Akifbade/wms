import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shipmentsAPI, getBackendUrl } from '../../services/api';
import CustomChargesModal from '../../components/CustomChargesModal';

interface ShipmentDetails {
    id: string;
    referenceId: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    companyProfileId: string;
    companyProfile?: {
        companyName: string;
        address?: string;
        contactPerson?: string;
    };
    receivedAt: string;
    status: string;
    originalBoxCount: number;
    currentBoxCount: number;
    totalWeight?: number;
    notes?: string;
    shipmentPhotos?: string[];
    releasedAt?: string;
    releasedById?: string;
    releasedBy?: {
        id: string;
        name: string;
        email: string;
    };
    boxes: Array<{
        id: string;
        boxNumber: number;
        rackId?: string;
        rack?: {
            rackCode: string;
            zone?: string;
            level?: string;
        };
        pieceQR?: any;
    }>;
    withdrawals?: Array<{
        id: string;
        withdrawalDate: string;
        withdrawnBoxCount: number;
        remainingBoxCount: number;
        withdrawnBy?: string;
        notes?: string;
        reason?: string;
        receiptNumber?: string;
    }>;
    invoices?: Array<{
        id: string;
        invoiceNumber: string;
        totalAmount: number;
        status: string;
        createdAt: string;
        dueDate?: string;
        lineItems: Array<{
            description: string;
            quantity: number;
            rate: number;
            amount: number;
        }>;
        payments?: Array<{
            id: string;
            amount: number;
            paymentMethod: string;
            paymentDate: string;
            referenceNumber?: string;
            notes?: string;
        }>;
    }>;
    releaseHistory?: Array<{
        id: string;
        releasedAt: string;
        boxCount: number;
        receivedBy: string;
        notes?: string;
    }>;
}

const ShipmentReport: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState<ShipmentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [chargesModalOpen, setChargesModalOpen] = useState(false);

    // Safe number helpers to avoid runtime crashes when backend returns null/strings
    const safeNumber = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const formatNumber = (v: any, decimals = 3) => {
        return safeNumber(v).toFixed(decimals);
    };

    useEffect(() => {
        loadShipmentDetails();
    }, [id]);

    const loadShipmentDetails = async () => {
        try {
            setLoading(true);
            console.log('📄 Loading shipment report for ID:', id);
            const response = await shipmentsAPI.getById(id!);
            console.log('📄 Report API response:', response);
            // Backend returns { shipment: {...} }
            setShipment(response.shipment || response.data || response);
        } catch (err: any) {
            console.error('❌ Report load error:', err);
            setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load shipment details');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getDaysStored = () => {
        const dateField = (shipment as any)?.arrivalDate || (shipment as any)?.receivedDate || shipment?.receivedAt || (shipment as any)?.createdAt;
        if (!dateField) return 0;
        const received = new Date(dateField);
        const today = new Date();
        return Math.max(0, Math.ceil((today.getTime() - received.getTime()) / (1000 * 60 * 60 * 24)));
    };

    const getCurrentStorageCharge = () => {
        const days = getDaysStored();
        const cbm = (shipment as any)?.cbm || (shipment as any)?.totalCBM || 0;

        // ✅ SAME PRIORITY AS INVOICE - MUST MATCH!
        // Priority 1: Custom CBM rate on shipment
        if ((shipment as any)?.customRateEnabled && (shipment as any)?.customRatePerCBMPerDay && cbm > 0) {
            return days * cbm * parseFloat((shipment as any).customRatePerCBMPerDay);
        }
        // Priority 2: Custom box rate on shipment
        else if ((shipment as any)?.customRateEnabled && (shipment as any)?.customRatePerBoxPerDay) {
            const boxCount = (shipment as any)?.originalBoxCount || (shipment as any)?.currentBoxCount || 0;
            return days * boxCount * parseFloat((shipment as any).customRatePerBoxPerDay);
        }
        // Priority 3: Settings type is CBM and shipment has CBM
        // NOTE: Would need to fetch settings here for full accuracy
        // For now, use CBM if available with default rate
        else if (cbm > 0) {
            // Default CBM rate (would need settings API call to get actual rate)
            // Using 0.5 as fallback - should match settings.storageRatePerCBM
            return days * cbm * 0.5;
        }
        // Priority 4/Fallback: Box count with default rate
        else {
            const boxCount = (shipment as any)?.originalBoxCount || (shipment as any)?.currentBoxCount || 0;
            return days * boxCount * 0.5;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'IN_WAREHOUSE':
                return { label: 'In Warehouse', color: 'bg-green-100 text-green-800' };
            case 'PARTIAL':
                return { label: 'Partial Release', color: 'bg-orange-100 text-orange-800' };
            case 'RELEASED':
                return { label: 'Released', color: 'bg-gray-100 text-gray-800' };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-800' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading shipment report...</p>
                </div>
            </div>
        );
    }

    if (error || !shipment) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Shipment not found'}</p>
                    <button
                        onClick={() => navigate('/shipments')}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                    >
                        Back to Shipments
                    </button>
                </div>
            </div>
        );
    }

    const statusBadge = getStatusBadge(shipment.status);
    const daysStored = getDaysStored();

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header Actions - Hide on print */}
                <div className="mb-6 flex justify-between items-center print:hidden">
                    <button
                        onClick={() => navigate('/shipments')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setChargesModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            ⚙️ Set Custom Charges
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Report
                        </button>
                    </div>
                </div>

                {/* Main Report */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-800 text-white p-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Shipment Report</h1>
                                <p className="text-gray-300 text-lg">{shipment.referenceId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-300 text-sm">Report Generated</p>
                                <p className="text-lg font-semibold">
                                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-sm text-gray-400">{new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Banner */}
                    <div className="px-8 py-4 bg-gray-50 border-b flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 rounded-lg font-bold text-sm ${statusBadge.color}`}>
                                {statusBadge.label}
                            </span>
                            <span className="text-gray-600 font-semibold">
                                Storage Duration: <span className="text-gray-900">{daysStored} days</span>
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Company</p>
                            <p className="font-bold text-lg text-gray-900">{shipment.companyProfile?.companyName || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-8">
                        {/* User Tracking Section */}
                        <section className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                User Tracking
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-lg p-4 border border-blue-200">
                                    <p className="text-sm text-gray-600 mb-2 font-semibold">Created By</p>
                                    <p className="font-bold text-lg text-gray-900">{(shipment as any).createdBy?.name || 'N/A'}</p>
                                    <p className="text-sm text-gray-600">{(shipment as any).createdBy?.email || '-'}</p>
                                    <p className="text-xs text-blue-600 font-semibold mt-1">{(shipment as any).createdBy?.role || '-'}</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-blue-200">
                                    <p className="text-sm text-gray-600 mb-2 font-semibold">Assigned to Rack By</p>
                                    <p className="font-bold text-lg text-gray-900">{(shipment as any).assignedBy?.name || 'Not Assigned Yet'}</p>
                                    <p className="text-sm text-gray-600">{(shipment as any).assignedBy?.email || '-'}</p>
                                    <p className="text-xs text-blue-600 font-semibold mt-1">{(shipment as any).assignedBy?.role || '-'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Dates & CBM Section */}
                        <section className="mb-8 bg-green-50 border-2 border-green-200 rounded-lg p-6">
                            <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Timeline & Volume
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Arrival Date</p>
                                    <p className="font-bold text-lg text-gray-900">
                                        {(shipment as any).arrivalDate ? new Date((shipment as any).arrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Created By</p>
                                    <p className="font-bold text-lg text-gray-900">
                                        {(shipment as any).createdBy
                                            ? (typeof (shipment as any).createdBy === 'object'
                                                ? (shipment as any).createdBy.name || (shipment as any).createdBy.email
                                                : (shipment as any).createdBy)
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Volume (CBM)</p>
                                    <p className="font-bold text-2xl text-green-600">
                                        {(shipment as any).cbm ? `${formatNumber((shipment as any).cbm, 3)} m³` : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-green-200">
                                    <p className="text-sm text-gray-600 mb-1">Days Stored</p>
                                    <p className="font-bold text-2xl text-orange-600">{daysStored} days</p>
                                </div>
                            </div>
                        </section>

                        {/* Charges Section */}
                        {(shipment as any).charges && (
                            <section className="mb-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-yellow-900 mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Storage Charges
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-white rounded-lg p-4 border border-yellow-300">
                                        <p className="text-sm text-gray-600 mb-1">Current Storage Charge</p>
                                        <p className="font-bold text-2xl text-green-600">
                                            {formatNumber(getCurrentStorageCharge(), 3)} KWD
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-yellow-300">
                                        <p className="text-sm text-gray-600 mb-1">Total Invoiced</p>
                                        <p className="font-bold text-xl text-gray-900">
                                            {formatNumber((shipment as any).charges?.totalInvoiced || 0, 3)} KWD
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-yellow-300">
                                        <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                                        <p className="font-bold text-xl text-blue-600">
                                            {formatNumber((shipment as any).charges?.totalPaid || 0, 3)} KWD
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-yellow-300">
                                        <p className="text-sm text-gray-600 mb-1">Outstanding Balance</p>
                                        <p className="font-bold text-2xl text-red-600">
                                            {formatNumber((shipment as any).charges?.outstandingBalance || 0, 3)} KWD
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Client Information */}
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                Client Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Client Name</p>
                                    <p className="font-semibold text-gray-900">{shipment.clientName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                                    <p className="font-semibold text-gray-900">{shipment.clientPhone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Email</p>
                                    <p className="font-semibold text-gray-900">{shipment.clientEmail || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Arrival Date</p>
                                    <p className="font-semibold text-gray-900">
                                        {(shipment as any).arrivalDate && !isNaN(new Date((shipment as any).arrivalDate).getTime())
                                            ? new Date((shipment as any).arrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : shipment.receivedAt && !isNaN(new Date(shipment.receivedAt).getTime())
                                                ? new Date(shipment.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Created By</p>
                                    <p className="font-semibold text-gray-900">
                                        {(shipment as any).createdBy
                                            ? (typeof (shipment as any).createdBy === 'object'
                                                ? (shipment as any).createdBy.name || (shipment as any).createdBy.email
                                                : (shipment as any).createdBy)
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Shipment Details */}
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                Shipment Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Original Box Count</p>
                                    <p className="font-semibold text-2xl text-gray-900">{shipment.originalBoxCount}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Current Box Count</p>
                                    <p className="font-semibold text-2xl text-gray-900">{shipment.currentBoxCount}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Pallet Breakdown</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {(() => {
                                            const pallets = shipment.boxes.filter(b => b.pieceQR?.palletNumber > 0);
                                            const loose = shipment.boxes.filter(b => !b.pieceQR?.palletNumber || b.pieceQR?.palletNumber === 0);
                                            const uniquePallets = [...new Set(pallets.map(b => b.pieceQR?.palletNumber))].sort((a, b) => a - b);

                                            return (
                                                <>
                                                    {uniquePallets.map(palletNum => {
                                                        const boxesInPallet = pallets.filter(b => b.pieceQR?.palletNumber === palletNum);
                                                        return (
                                                            <span
                                                                key={palletNum}
                                                                className="px-3 py-1.5 bg-blue-100 text-blue-900 rounded-lg border-2 border-blue-300 font-semibold text-sm"
                                                            >
                                                                Pallet #{palletNum} ({boxesInPallet.length} pcs)
                                                            </span>
                                                        );
                                                    })}
                                                    {loose.length > 0 && (
                                                        <span className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded-lg border-2 border-orange-300 font-semibold text-sm">
                                                            Loose ({loose.length} pcs)
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Weight</p>
                                    <p className="font-semibold text-2xl text-gray-900">
                                        {shipment.totalWeight ? `${shipment.totalWeight} kg` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Days in Storage</p>
                                    <p className="font-semibold text-2xl text-gray-900">{daysStored}</p>
                                </div>
                            </div>
                            {shipment.notes && (
                                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                    <p className="text-sm text-gray-600 mb-1 font-semibold">Notes:</p>
                                    <p className="text-gray-800">{shipment.notes}</p>
                                </div>
                            )}
                        </section>

                        {/* Shipment Photos */}
                        {shipment.shipmentPhotos && shipment.shipmentPhotos.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                    Shipment Photos ({shipment.shipmentPhotos.length})
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {shipment.shipmentPhotos.map((photo, idx) => (
                                        <div key={idx} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                                            <img
                                                src={`${getBackendUrl()}${photo}`}
                                                alt={`Shipment photo ${idx + 1}`}
                                                className="w-full h-48 object-cover"
                                            />
                                            <div className="bg-gray-100 px-2 py-1 text-xs text-center font-semibold text-gray-700">
                                                Photo {idx + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Box Details */}
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                Box Details ({shipment.boxes.length} boxes)
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-800 text-white">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-bold">Box #</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold">Rack Location</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold">Zone</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold">Level</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold">Pallet</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {shipment.boxes.map((box) => (
                                            <tr key={box.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-bold text-gray-900">{box.boxNumber}</td>
                                                <td className="px-4 py-3">
                                                    {box.rack ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-gray-700 text-white rounded text-xs font-semibold">
                                                            {box.rack.rackCode}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">{box.rack?.zone || '-'}</td>
                                                <td className="px-4 py-3 text-gray-700">{box.rack?.level || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {box.pieceQR?.palletNumber ? (
                                                        <span className="text-gray-900 font-semibold">
                                                            Pallet {box.pieceQR.palletNumber}
                                                        </span>
                                                    ) : (
                                                        <span className="text-orange-600 font-semibold">Loose</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {box.rackId ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                                            In Warehouse
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                                                            Released
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* ✅ RELEASE DETAILS - NEW SECTION */}
                        {shipment.status === 'RELEASED' && shipment.releasedAt && (
                            <section className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                    📦 Release Details
                                </h2>
                                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Release Date</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {new Date(shipment.releasedAt).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Released By</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {shipment.releasedBy?.name || 'N/A'}
                                            </p>
                                            {shipment.releasedBy?.email && (
                                                <p className="text-xs text-gray-500">{shipment.releasedBy.email}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Status</p>
                                            <p className="text-lg font-bold text-green-600">
                                                ✅ FULLY RELEASED
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ✅ WITHDRAWAL HISTORY - NEW SECTION */}
                        {shipment.withdrawals && shipment.withdrawals.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                    📤 Withdrawal History ({shipment.withdrawals.length} withdrawals)
                                </h2>
                                <div className="space-y-4">
                                    {shipment.withdrawals.map((withdrawal, idx) => (
                                        <div key={withdrawal.id} className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-bold text-gray-900">Withdrawal #{idx + 1}</h3>
                                                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                                                    {withdrawal.withdrawnBoxCount} boxes withdrawn
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Date & Time</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {new Date(withdrawal.withdrawalDate).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Boxes Withdrawn</p>
                                                    <p className="font-semibold text-gray-900">{withdrawal.withdrawnBoxCount}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Remaining</p>
                                                    <p className="font-semibold text-gray-900">{withdrawal.remainingBoxCount}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Collected By</p>
                                                    <p className="font-semibold text-gray-900">{withdrawal.withdrawnBy || 'N/A'}</p>
                                                </div>
                                            </div>
                                            {withdrawal.receiptNumber && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-600">Receipt #: <span className="font-semibold text-gray-900">{withdrawal.receiptNumber}</span></p>
                                                </div>
                                            )}
                                            {withdrawal.reason && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-600">Reason: <span className="font-semibold text-gray-900">{withdrawal.reason}</span></p>
                                                </div>
                                            )}
                                            {withdrawal.notes && (
                                                <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                                    <p className="text-sm"><span className="font-semibold">Notes:</span> {withdrawal.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ✅ INVOICES & PAYMENTS - NEW SECTION */}
                        {shipment.invoices && shipment.invoices.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                    💰 Invoices & Payments ({shipment.invoices.length} invoices)
                                </h2>
                                <div className="space-y-6">
                                    {shipment.invoices.map((invoice, idx) => (
                                        <div key={invoice.id} className="border-2 border-purple-300 rounded-lg overflow-hidden bg-white">
                                            {/* Invoice Header */}
                                            <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-lg">Invoice #{invoice.invoiceNumber}</h3>
                                                    <p className="text-sm opacity-90">
                                                        Created: {new Date(invoice.createdAt).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold">{formatNumber(invoice.totalAmount, 3)} KWD</p>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${invoice.status === 'PAID' ? 'bg-green-500' :
                                                        invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}>
                                                        {invoice.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Invoice Line Items */}
                                            <div className="p-4 bg-gray-50">
                                                <h4 className="font-bold text-gray-900 mb-2">Charges Breakdown</h4>
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-gray-300">
                                                            <th className="text-left py-2">Description</th>
                                                            <th className="text-center py-2">Qty</th>
                                                            <th className="text-right py-2">Rate</th>
                                                            <th className="text-right py-2">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {invoice.lineItems.map((item, itemIdx) => (
                                                            <tr key={itemIdx} className="border-b border-gray-200">
                                                                <td className="py-2">{item.description}</td>
                                                                <td className="text-center py-2">{item.quantity}</td>
                                                                <td className="text-right py-2">{formatNumber(item.rate, 3)}</td>
                                                                <td className="text-right py-2 font-semibold">{formatNumber(item.amount, 3)} KWD</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="font-bold text-lg">
                                                            <td colSpan={3} className="text-right py-2">Total:</td>
                                                            <td className="text-right py-2 text-purple-600">{formatNumber(invoice.totalAmount, 3)} KWD</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            {/* Payment Details */}
                                            {invoice.payments && invoice.payments.length > 0 && (
                                                <div className="p-4 bg-green-50 border-t-2 border-green-300">
                                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                                        <span className="text-green-600 mr-2">💳</span>
                                                        Payment Details ({invoice.payments.length} payments)
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {invoice.payments.map((payment, payIdx) => (
                                                            <div key={payment.id} className="bg-white border border-green-300 rounded-lg p-3">
                                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                                    <div>
                                                                        <p className="text-xs text-gray-600">Payment Date</p>
                                                                        <p className="font-semibold text-gray-900">
                                                                            {new Date(payment.paymentDate).toLocaleDateString('en-GB', {
                                                                                day: '2-digit',
                                                                                month: 'short',
                                                                                year: 'numeric'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-600">Amount Paid</p>
                                                                        <p className="font-bold text-green-600 text-lg">{formatNumber(payment.amount, 3)} KWD</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-600">Payment Method</p>
                                                                        <p className="font-semibold text-gray-900">
                                                                            {payment.paymentMethod === 'CASH' && '💵 Cash'}
                                                                            {payment.paymentMethod === 'CARD' && '💳 Card'}
                                                                            {payment.paymentMethod === 'BANK_TRANSFER' && '🏦 Bank Transfer'}
                                                                            {payment.paymentMethod === 'CHEQUE' && '📄 Cheque'}
                                                                            {!['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].includes(payment.paymentMethod) && payment.paymentMethod}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-600">Reference #</p>
                                                                        <p className="font-semibold text-gray-900">{payment.referenceNumber || 'N/A'}</p>
                                                                    </div>
                                                                </div>
                                                                {payment.notes && (
                                                                    <div className="mt-2 pt-2 border-t border-green-200">
                                                                        <p className="text-sm text-gray-700">
                                                                            <span className="font-semibold">Notes:</span> {payment.notes}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Payment Summary */}
                                                    <div className="mt-4 pt-4 border-t-2 border-green-400">
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-gray-600">Total Invoice Amount:</p>
                                                                <p className="font-bold text-lg text-gray-900">{formatNumber(invoice.totalAmount, 3)} KWD</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-600">Total Paid:</p>
                                                                <p className="font-bold text-lg text-green-600">
                                                                    {formatNumber(invoice.payments.reduce((sum, p) => sum + safeNumber(p.amount), 0), 3)} KWD
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {safeNumber(invoice.totalAmount) > (invoice.payments ? invoice.payments.reduce((sum, p) => sum + safeNumber(p.amount), 0) : 0) && (
                                                            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                                                                <p className="text-sm font-bold text-yellow-800">
                                                                    Outstanding Balance: {formatNumber(safeNumber(invoice.totalAmount) - (invoice.payments ? invoice.payments.reduce((sum, p) => sum + safeNumber(p.amount), 0) : 0), 3)} KWD
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* No Payments Yet */}
                                            {(!invoice.payments || invoice.payments.length === 0) && (
                                                <div className="p-4 bg-red-50 border-t-2 border-red-300">
                                                    <p className="text-red-600 font-semibold">⚠️ No payments recorded for this invoice</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Release History */}
                        {shipment.releaseHistory && shipment.releaseHistory.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                    Release History ({shipment.releaseHistory.length} releases)
                                </h2>
                                <div className="space-y-4">
                                    {shipment.releaseHistory.map((release) => (
                                        <div key={release.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Released Date</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {new Date(release.releasedAt).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Boxes Released</p>
                                                    <p className="font-semibold text-gray-900">{release.boxCount}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Received By</p>
                                                    <p className="font-semibold text-gray-900">{release.receivedBy}</p>
                                                </div>
                                            </div>
                                            {release.notes && (
                                                <div className="mt-2 text-sm text-gray-700">
                                                    <span className="font-semibold">Notes:</span> {release.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Company Information */}
                        {shipment.companyProfile && (
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-800">
                                    Company Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Company Name</p>
                                        <p className="font-semibold text-gray-900">{shipment.companyProfile.companyName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Contact Person</p>
                                        <p className="font-semibold text-gray-900">{shipment.companyProfile.contactPerson || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Address</p>
                                        <p className="font-semibold text-gray-900">{shipment.companyProfile.address || '-'}</p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-100 px-8 py-6 border-t">
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <p>Generated by Warehouse Management System</p>
                            <p>Report ID: {shipment.id}</p>
                        </div>
                    </div>
                </div>

                {/* Custom Charges Modal */}
                <CustomChargesModal
                    isOpen={chargesModalOpen}
                    onClose={() => setChargesModalOpen(false)}
                    shipmentId={shipment.id}
                    shipmentRef={shipment.referenceId}
                    currentCBM={(shipment as any).cbm}
                    currentBoxCount={shipment.currentBoxCount}
                    onSuccess={() => {
                        loadShipmentDetails(); // Reload report to show updated charges
                    }}
                />
            </div>
        </div>
    );
};

export default ShipmentReport;

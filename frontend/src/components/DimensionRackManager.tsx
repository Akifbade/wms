import React, { useState, useEffect } from 'react';
import { shipmentsAPI, racksAPI } from '../services/api';

interface DimensionRackManagerProps {
    shipmentId: string;
    onUpdate?: () => void;
}

interface Dimension {
    id: string;
    label: string;
    itemType: string;
    quantity: number;
    length: number;
    width: number;
    height: number;
    cbm: number;
    totalCBM: number;
    weight?: number;
    totalWeight?: number;
    status: 'PENDING' | 'ASSIGNED' | 'RELEASED';
    rackId?: string;
    rackCode?: string;
    rackLocation?: string;
    assignedAt?: string;
    releasedAt?: string;
}

interface Rack {
    id: string;
    code: string;
    location: string;
    cbmCapacity: number;
    cbmUsed: number;
    status: string;
}

export default function DimensionRackManager({ shipmentId, onUpdate }: DimensionRackManagerProps) {
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [racks, setRacks] = useState<Rack[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
    const [selectedRack, setSelectedRack] = useState<string>('');
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, [shipmentId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dimResponse, rackResponse] = await Promise.all([
                shipmentsAPI.getDimensionsStatus(shipmentId),
                racksAPI.getAll({ status: 'ACTIVE' })
            ]);
            setDimensions(dimResponse.dimensions || []);
            setSummary(dimResponse.summary || {});
            setRacks(rackResponse.racks || []);
        } catch (err: any) {
            console.error('Failed to load dimensions:', err);
            setError('Failed to load dimensions');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectDimension = (dimId: string) => {
        setSelectedDimensions(prev =>
            prev.includes(dimId)
                ? prev.filter(id => id !== dimId)
                : [...prev, dimId]
        );
    };

    const handleSelectAll = () => {
        const pendingDims = dimensions.filter(d => d.status === 'PENDING');
        if (selectedDimensions.length === pendingDims.length) {
            setSelectedDimensions([]);
        } else {
            setSelectedDimensions(pendingDims.map(d => d.id));
        }
    };

    const handleAssign = async () => {
        if (!selectedRack || selectedDimensions.length === 0) {
            setError('Please select dimensions and a rack');
            return;
        }

        setAssigning(true);
        setError('');
        setSuccess('');

        try {
            await shipmentsAPI.bulkAssignDimensions(shipmentId, selectedDimensions, selectedRack);
            setSuccess(`✅ ${selectedDimensions.length} item(s) assigned to rack!`);
            setSelectedDimensions([]);
            setSelectedRack('');
            loadData();
            onUpdate?.();
        } catch (err: any) {
            setError(err.message || 'Failed to assign dimensions');
        } finally {
            setAssigning(false);
        }
    };

    const handleRelease = async (dimensionId: string) => {
        if (!confirm('Release this item from the rack?')) return;

        try {
            await shipmentsAPI.releaseDimension(shipmentId, dimensionId);
            setSuccess('✅ Item released from rack');
            loadData();
            onUpdate?.();
        } catch (err: any) {
            setError(err.message || 'Failed to release dimension');
        }
    };

    const getItemIcon = (itemType: string) => {
        const icons: Record<string, string> = {
            PALLET: '🚛',
            BOX: '📦',
            CRATE: '🪵',
            CARTON: '📫',
            LOOSE: '🎁',
            OTHER: '📋'
        };
        return icons[itemType] || '📦';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            ASSIGNED: 'bg-green-100 text-green-800 border-green-300',
            RELEASED: 'bg-gray-100 text-gray-500 border-gray-300'
        };
        return colors[status] || colors.PENDING;
    };

    if (loading) {
        return (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="animate-pulse flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-200 rounded"></div>
                    <div className="h-4 bg-blue-200 rounded w-48"></div>
                </div>
            </div>
        );
    }

    if (dimensions.length === 0) {
        return (
            <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-500">📏 No dimensions recorded for this shipment</p>
                <p className="text-gray-400 text-sm mt-1">Add dimensions in Edit Shipment to enable item-level rack assignment</p>
            </div>
        );
    }

    return (
        <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                    <span className="text-xl mr-2">📏</span> Dimensions & Rack Assignment
                </span>
                <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        ⏳ {summary?.pending || 0} Pending
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        ✅ {summary?.assigned || 0} Assigned
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        📤 {summary?.released || 0} Released
                    </span>
                </div>
            </h4>

            {error && (
                <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-3 p-2 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
                    {success}
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                    <p className="text-2xl font-bold text-purple-600">{summary?.totalCBM?.toFixed(3) || 0}</p>
                    <p className="text-xs text-gray-500">Total CBM</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                    <p className="text-2xl font-bold text-green-600">{summary?.assignedCBM?.toFixed(3) || 0}</p>
                    <p className="text-xs text-gray-500">Assigned CBM</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">{summary?.releasedCBM?.toFixed(3) || 0}</p>
                    <p className="text-xs text-gray-500">Released CBM</p>
                </div>
            </div>

            {/* Assignment Controls */}
            {dimensions.some(d => d.status === 'PENDING') && (
                <div className="bg-white rounded-lg p-3 mb-4 border border-purple-200">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleSelectAll}
                            className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                            {selectedDimensions.length === dimensions.filter(d => d.status === 'PENDING').length
                                ? '☑️ Deselect All'
                                : '☐ Select All Pending'}
                        </button>

                        <select
                            value={selectedRack}
                            onChange={(e) => setSelectedRack(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Select Rack...</option>
                            {racks.map(rack => (
                                <option key={rack.id} value={rack.id}>
                                    {rack.code} - {rack.location} ({rack.cbmUsed?.toFixed(2) || 0}/{rack.cbmCapacity || '∞'} m³)
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleAssign}
                            disabled={assigning || selectedDimensions.length === 0 || !selectedRack}
                            className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {assigning ? '⏳ Assigning...' : `🗄️ Assign ${selectedDimensions.length} Item(s)`}
                        </button>
                    </div>
                </div>
            )}

            {/* Dimensions List */}
            <div className="space-y-2">
                {dimensions.map((dim) => (
                    <div
                        key={dim.id}
                        className={`bg-white rounded-lg p-3 border ${dim.status === 'PENDING' ? 'border-yellow-300' : dim.status === 'ASSIGNED' ? 'border-green-300' : 'border-gray-300'} transition-all ${dim.status === 'PENDING' && selectedDimensions.includes(dim.id) ? 'ring-2 ring-purple-400' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Checkbox for pending items */}
                            {dim.status === 'PENDING' && (
                                <input
                                    type="checkbox"
                                    checked={selectedDimensions.includes(dim.id)}
                                    onChange={() => handleSelectDimension(dim.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                            )}

                            {/* Item Icon & Info */}
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-2xl">{getItemIcon(dim.itemType)}</span>
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {dim.label || `${dim.itemType} ${dim.quantity > 1 ? `(×${dim.quantity})` : ''}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {dim.length}×{dim.width}×{dim.height} cm • {dim.totalCBM?.toFixed(4)} m³
                                        {dim.totalWeight ? ` • ${dim.totalWeight} kg` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(dim.status)}`}>
                                {dim.status === 'PENDING' ? '⏳ Pending' : dim.status === 'ASSIGNED' ? '✅ Assigned' : '📤 Released'}
                            </span>

                            {/* Rack Info */}
                            {dim.rackCode && (
                                <div className="text-right">
                                    <p className="text-sm font-bold text-green-700">🗄️ {dim.rackCode}</p>
                                    <p className="text-xs text-gray-500">{dim.rackLocation}</p>
                                </div>
                            )}

                            {/* Release Button */}
                            {dim.status === 'ASSIGNED' && (
                                <button
                                    onClick={() => handleRelease(dim.id)}
                                    className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                >
                                    📤 Release
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

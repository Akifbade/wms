import React, { useState, useEffect } from 'react';
import { shipmentsAPI } from '../services/api';

interface CustomChargesModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipmentId: string;
    shipmentRef: string;
    currentCBM?: number;
    currentBoxCount: number;
    onSuccess?: () => void;
}

interface ChargesPreview {
    totalCharge: number;
    breakdown: {
        baseCharge: number;
        taxAmount: number;
        currency: string;
    };
    rateUsed: {
        type: 'CUSTOM' | 'COMPANY_DEFAULT';
        ratePerCBMPerDay?: number;
        ratePerBoxPerDay?: number;
        source: string;
    };
    daysCharged: number;
    gracePeriodApplied: boolean;
}

const CustomChargesModal: React.FC<CustomChargesModalProps> = ({
    isOpen,
    onClose,
    shipmentId,
    shipmentRef,
    currentCBM,
    currentBoxCount,
    onSuccess
}) => {
    const [customRateEnabled, setCustomRateEnabled] = useState(false);
    const [ratePerCBMPerDay, setRatePerCBMPerDay] = useState<string>('');
    const [ratePerBoxPerDay, setRatePerBoxPerDay] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<ChargesPreview | null>(null);
    const [currentCharges, setCurrentCharges] = useState<ChargesPreview | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCurrentCharges();
            loadShipmentCustomRates();
        }
    }, [isOpen, shipmentId]);

    const loadCurrentCharges = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/shipments/${shipmentId}/charges-calculation`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setCurrentCharges(data.calculation);
            }
        } catch (err) {
            console.error('Failed to load current charges:', err);
        }
    };

    const loadShipmentCustomRates = async () => {
        try {
            const response = await shipmentsAPI.getById(shipmentId);
            const shipment = response.shipment || response.data || response;

            if (shipment.customRateEnabled) {
                setCustomRateEnabled(true);
                setRatePerCBMPerDay(shipment.customRatePerCBMPerDay?.toString() || '');
                setRatePerBoxPerDay(shipment.customRatePerBoxPerDay?.toString() || '');
                setNotes(shipment.customRateNotes || '');
            }
        } catch (err) {
            console.error('Failed to load shipment rates:', err);
        }
    };

    const handlePreview = async () => {
        if (!customRateEnabled) {
            setPreview(currentCharges);
            return;
        }

        if (!ratePerCBMPerDay && !ratePerBoxPerDay) {
            setError('Please provide at least one rate (CBM or Box)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`http://localhost:5000/api/shipments/${shipmentId}/charges-preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    customRateEnabled,
                    ratePerCBMPerDay: ratePerCBMPerDay ? parseFloat(ratePerCBMPerDay) : undefined,
                    ratePerBoxPerDay: ratePerBoxPerDay ? parseFloat(ratePerBoxPerDay) : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                setPreview(data.preview);
            } else {
                setError(data.error || 'Failed to preview charges');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to preview charges');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (customRateEnabled && !ratePerCBMPerDay && !ratePerBoxPerDay) {
            setError('Please provide at least one rate when custom charging is enabled');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`http://localhost:5000/api/shipments/${shipmentId}/custom-charges`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    customRateEnabled,
                    ratePerCBMPerDay: customRateEnabled && ratePerCBMPerDay ? parseFloat(ratePerCBMPerDay) : null,
                    ratePerBoxPerDay: customRateEnabled && ratePerBoxPerDay ? parseFloat(ratePerBoxPerDay) : null,
                    notes: notes || null
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(`✅ Custom charges ${customRateEnabled ? 'enabled' : 'disabled'} successfully!\n\nNew charge: ${data.calculation.totalCharge} KWD`);
                onSuccess?.();
                onClose();
            } else {
                setError(data.error || 'Failed to save custom charges');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save custom charges');
        } finally {
            setLoading(false);
        }
    };

    // Auto-preview when rates change
    useEffect(() => {
        if (customRateEnabled && (ratePerCBMPerDay || ratePerBoxPerDay)) {
            const debounce = setTimeout(() => {
                handlePreview();
            }, 500);
            return () => clearTimeout(debounce);
        }
    }, [customRateEnabled, ratePerCBMPerDay, ratePerBoxPerDay]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">⚙️ Custom Charges Setup</h2>
                            <p className="text-indigo-100 text-sm">Shipment: {shipmentRef}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Current Charges Display */}
                    {currentCharges && (
                        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">📊 Current Charges</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600">Total Charge</p>
                                    <p className="text-2xl font-bold text-green-600">{currentCharges.totalCharge} KWD</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Days Charged</p>
                                    <p className="text-xl font-bold text-gray-900">{currentCharges.daysCharged}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Rate Type</p>
                                    <p className="text-sm font-semibold text-blue-600">
                                        {currentCharges.rateUsed.type === 'CUSTOM' ? '🎯 Custom' : '🏢 Company Default'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Tax</p>
                                    <p className="text-lg font-bold text-gray-900">{currentCharges.breakdown.taxAmount} KWD</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-2 italic">{currentCharges.rateUsed.source}</p>
                        </div>
                    )}

                    {/* Enable Custom Rate Toggle */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={customRateEnabled}
                                onChange={(e) => {
                                    setCustomRateEnabled(e.target.checked);
                                    if (!e.target.checked) {
                                        setPreview(currentCharges);
                                    }
                                }}
                                className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div>
                                <span className="text-lg font-bold text-blue-900">Enable Custom Rate for this Shipment</span>
                                <p className="text-sm text-blue-700">Override company default billing settings with shipment-specific rates</p>
                            </div>
                        </label>
                    </div>

                    {/* Shipment Info */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <p className="text-sm text-gray-600">Volume (CBM)</p>
                            <p className="text-lg font-bold text-gray-900">{currentCBM ? `${currentCBM.toFixed(3)} m³` : 'Not Set'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Box Count</p>
                            <p className="text-lg font-bold text-gray-900">{currentBoxCount} boxes</p>
                        </div>
                    </div>

                    {/* Rate Inputs (Conditional) */}
                    {customRateEnabled && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* CBM Rate */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        📦 Rate per CBM per Day (KWD)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={ratePerCBMPerDay}
                                        onChange={(e) => setRatePerCBMPerDay(e.target.value)}
                                        placeholder={currentCBM ? "e.g., 2.500" : "CBM not available"}
                                        disabled={!currentCBM}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-lg font-semibold"
                                    />
                                    {currentCBM && ratePerCBMPerDay && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Preview: {(parseFloat(ratePerCBMPerDay) * currentCBM).toFixed(3)} KWD/day
                                        </p>
                                    )}
                                </div>

                                {/* Box Rate */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        📦 Rate per Box per Day (KWD)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={ratePerBoxPerDay}
                                        onChange={(e) => setRatePerBoxPerDay(e.target.value)}
                                        placeholder="e.g., 0.500"
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                                    />
                                    {ratePerBoxPerDay && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Preview: {(parseFloat(ratePerBoxPerDay) * currentBoxCount).toFixed(3)} KWD/day
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    📝 Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g., Special client discount, Contract terms, VIP pricing..."
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                                <p className="text-sm text-yellow-900 font-semibold">💡 Priority: CBM rate takes precedence over box rate if both are set and CBM is available.</p>
                            </div>
                        </div>
                    )}

                    {/* Live Preview */}
                    {preview && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">💰</span>
                                {customRateEnabled ? 'Custom Rate Preview' : 'Company Default Rate'}
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-white rounded-lg p-3 shadow">
                                    <p className="text-xs text-gray-600 mb-1">Base Charge</p>
                                    <p className="text-2xl font-bold text-gray-900">{preview.breakdown.baseCharge} KWD</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow">
                                    <p className="text-xs text-gray-600 mb-1">Tax Amount</p>
                                    <p className="text-xl font-bold text-orange-600">+{preview.breakdown.taxAmount} KWD</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow col-span-2 md:col-span-1">
                                    <p className="text-xs text-gray-600 mb-1">Total Charge</p>
                                    <p className="text-3xl font-bold text-green-600">{preview.totalCharge} KWD</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Rate Details:</p>
                                <p className="text-xs text-gray-600">{preview.rateUsed.source}</p>
                                <p className="text-xs text-gray-600 mt-1">Days charged: {preview.daysCharged}</p>
                                {preview.gracePeriodApplied && (
                                    <p className="text-xs text-blue-600 font-semibold mt-1">🎁 Grace period applied</p>
                                )}
                            </div>

                            {currentCharges && preview.totalCharge !== currentCharges.totalCharge && (
                                <div className="mt-4 bg-blue-100 border border-blue-300 rounded p-3">
                                    <p className="text-sm font-semibold text-blue-900">
                                        Change: {preview.totalCharge > currentCharges.totalCharge ? '📈' : '📉'}
                                        {' '}{(preview.totalCharge - currentCharges.totalCharge).toFixed(3)} KWD
                                        {' '}({((preview.totalCharge - currentCharges.totalCharge) / currentCharges.totalCharge * 100).toFixed(1)}%)
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                            <p className="text-red-800 font-semibold">❌ {error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePreview}
                            disabled={loading || (customRateEnabled && !ratePerCBMPerDay && !ratePerBoxPerDay)}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ Loading...' : '👁️ Preview Charges'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? '💾 Saving...' : '💾 Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomChargesModal;

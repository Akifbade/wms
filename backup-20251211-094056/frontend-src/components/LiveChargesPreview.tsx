import { useState, useEffect } from 'react';

interface ChargeLineItem {
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    chargeTypeId?: string;
    isTaxable: boolean;
}

interface ChargeCalculation {
    totalCharge: number;
    breakdown: {
        baseCharge: number;
        additionalCharges: number;
        taxAmount: number;
        currency: string;
    };
    lineItems: ChargeLineItem[];
    rateUsed: {
        type: 'CUSTOM' | 'COMPANY_DEFAULT';
        ratePerCBMPerDay?: number;
        ratePerBoxPerDay?: number;
        source: string;
    };
    daysCharged: number;
    gracePeriodApplied: boolean;
}

interface LiveChargesProps {
    shipmentId: string;
}

export default function LiveChargesPreview({ shipmentId }: LiveChargesProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [charges, setCharges] = useState<ChargeCalculation | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadCharges();
    }, [shipmentId]);

    const loadCharges = async () => {
        try {
            setRefreshing(true);
            setError(''); // Clear previous errors

            const response = await fetch(`/api/shipments/${shipmentId}/charges-calculation`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();

            // Validate response structure - backend returns { success, shipmentId, calculation }
            const chargeData = data.calculation || data;
            if (!chargeData || typeof chargeData.totalCharge === 'undefined') {
                throw new Error('Invalid charge data received from server');
            }

            setCharges(chargeData);
            setError('');
        } catch (err: any) {
            console.error('Load charges error:', err);
            setError(err.message || 'Failed to load charges');
            setCharges(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-300 p-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Calculating charges...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">❌ {error}</p>
            </div>
        );
    }

    if (!charges) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg border border-gray-300 shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">💰</span>
                        <div>
                            <h3 className="text-xl font-bold">Live Charges Preview</h3>
                            <p className="text-sm text-blue-100">Real-time calculation</p>
                        </div>
                    </div>
                    <button
                        onClick={loadCharges}
                        disabled={refreshing}
                        className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {/* Total Amount - Big Display */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-gray-200 px-6 py-6">
                <div className="text-center">
                    <p className="text-sm text-gray-600 uppercase font-medium mb-2">Total Amount Due</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-5xl font-bold text-green-700">
                            {(charges.totalCharge || 0).toFixed(3)}
                        </span>
                        <span className="text-2xl text-green-600 font-medium">{charges.breakdown?.currency || 'KWD'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        ⏱️ Storage Duration: <strong>{charges.daysCharged} days</strong>
                        {charges.gracePeriodApplied && <span className="ml-2 text-green-600">✅ Grace period applied</span>}
                    </p>
                </div>
            </div>

            {/* Rate Information */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">
                        {charges.rateUsed.type === 'CUSTOM' ? '⭐' : '📊'}
                    </span>
                    <div className="flex-1">
                        <p className="font-medium text-gray-700">
                            {charges.rateUsed.type === 'CUSTOM' ? '⭐ Custom Rate Applied' : '📊 Company Default Rate'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{charges.rateUsed.source}</p>
                        {/* Show ONLY the rate that's actually being used - CBM takes priority */}
                        {charges.rateUsed.ratePerCBMPerDay ? (
                            <p className="text-sm text-blue-600 mt-1">
                                📦 {charges.rateUsed.ratePerCBMPerDay.toFixed(3)} {charges.breakdown.currency}/m³/day
                            </p>
                        ) : charges.rateUsed.ratePerBoxPerDay ? (
                            <p className="text-sm text-blue-600 mt-1">
                                📦 {charges.rateUsed.ratePerBoxPerDay.toFixed(3)} {charges.breakdown.currency}/box/day
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Line Items Breakdown */}
            <div className="px-6 py-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>📋</span>
                    Detailed Breakdown
                </h4>
                <div className="space-y-2">
                    {charges.lineItems.map((item, index) => (
                        <div key={index} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{item.description}</p>
                                <p className="text-xs text-gray-500">
                                    {item.quantity} × {(item.unitPrice || 0).toFixed(3)} {charges.breakdown.currency}
                                    {item.isTaxable && <span className="ml-2 text-blue-600">(Taxable)</span>}
                                </p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                                    {item.category}
                                </span>
                            </div>
                            <p className="font-bold text-gray-900 text-lg ml-4">
                                {(item.amount || 0).toFixed(3)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal (Base + Additional):</span>
                        <span className="font-medium text-gray-800">
                            {((charges.breakdown?.baseCharge || 0) + (charges.breakdown?.additionalCharges || 0)).toFixed(3)} {charges.breakdown?.currency || 'KWD'}
                        </span>
                    </div>
                    {(charges.breakdown?.additionalCharges || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 ml-4">├─ Base Storage:</span>
                            <span className="text-gray-700">{(charges.breakdown?.baseCharge || 0).toFixed(3)}</span>
                        </div>
                    )}
                    {(charges.breakdown?.additionalCharges || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 ml-4">└─ Additional Charges:</span>
                            <span className="text-gray-700">{(charges.breakdown?.additionalCharges || 0).toFixed(3)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium text-gray-800">
                            {(charges.breakdown?.taxAmount || 0).toFixed(3)} {charges.breakdown?.currency || 'KWD'}
                        </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                        <span className="text-gray-800">Total:</span>
                        <span className="text-green-700">
                            {(charges.totalCharge || 0).toFixed(3)} {charges.breakdown?.currency || 'KWD'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 rounded-b-lg">
                <p className="text-xs text-blue-700 flex items-center gap-2">
                    <span>ℹ️</span>
                    This is a live preview. Final invoice will be generated upon release.
                </p>
            </div>
        </div>
    );
}

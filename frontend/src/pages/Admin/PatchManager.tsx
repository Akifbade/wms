import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Power } from 'lucide-react';

interface PatchStatus {
    id: string;
    description?: string;
    enabled: boolean;
    status: 'ACTIVE' | 'DISABLED' | 'FAILED' | 'PENDING';
    lastError?: string;
}

export default function PatchManager() {
    const [patches, setPatches] = useState<PatchStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Fetch patch statuses
    const fetchPatches = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/system-patches/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });

            if (!response.ok) throw new Error('Failed to fetch patches');
            const data = await response.json();
            setPatches(data.patches || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    // Toggle patch
    const togglePatch = async (patchId: string, currentEnabled: boolean) => {
        try {
            setTogglingId(patchId);
            const response = await fetch(`/api/system-patches/toggle/${patchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ enabled: !currentEnabled }),
            });

            if (!response.ok) throw new Error('Failed to toggle patch');
            const result = await response.json();

            alert(`✅ ${result.message}\n⚠️ ${result.note}`);
            fetchPatches(); // Refresh list
        } catch (err) {
            alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setTogglingId(null);
        }
    };

    useEffect(() => {
        fetchPatches();
        const interval = setInterval(fetchPatches, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'text-green-600 bg-green-50';
            case 'DISABLED':
                return 'text-gray-500 bg-gray-50';
            case 'FAILED':
                return 'text-red-600 bg-red-50';
            case 'PENDING':
                return 'text-yellow-600 bg-yellow-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'FAILED':
                return <XCircle className="w-5 h-5 text-red-600" />;
            case 'PENDING':
                return <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">🔧 Patch Manager</h1>
                    <p className="text-gray-600">Enable/disable experimental features and safety plugins</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900">Error loading patches</h3>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Refresh Button */}
                <div className="mb-6">
                    <button
                        onClick={fetchPatches}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {/* Patches Grid */}
                {loading && patches.length === 0 ? (
                    <div className="bg-white rounded-lg p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
                        <p className="text-gray-500">Loading patches...</p>
                    </div>
                ) : patches.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No patches configured</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {patches.map((patch) => (
                            <div
                                key={patch.id}
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    {/* Patch Info */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="mt-1">{getStatusIcon(patch.status)}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{patch.id}</h3>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patch.status)}`}>
                                                    {patch.status}
                                                </span>
                                            </div>
                                            {patch.description && (
                                                <p className="text-gray-600 text-sm mt-1">{patch.description}</p>
                                            )}
                                            {patch.lastError && (
                                                <p className="text-red-600 text-xs mt-2 font-mono bg-red-50 p-2 rounded">
                                                    {patch.lastError}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Toggle Button */}
                                    <button
                                        onClick={() => togglePatch(patch.id, patch.enabled)}
                                        disabled={togglingId === patch.id}
                                        className={`ml-4 p-3 rounded-lg transition-all flex-shrink-0 ${patch.enabled
                                                ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            } disabled:opacity-50`}
                                        title={patch.enabled ? 'Click to disable' : 'Click to enable'}
                                    >
                                        {togglingId === patch.id ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Power className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>

                                {/* Extra Info */}
                                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                                    <span className={patch.enabled ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                        {patch.enabled ? '✓ Enabled' : '✗ Disabled'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 How it works</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Click the power button to enable/disable a patch</li>
                        <li>• Changes are saved to the config file immediately</li>
                        <li>• Restart the server to apply changes (some patches may require this)</li>
                        <li>• Only admins can manage patches</li>
                        <li>• Check the status bar below each patch for any errors</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

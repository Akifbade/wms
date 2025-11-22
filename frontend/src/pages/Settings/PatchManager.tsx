import { useState, useEffect } from 'react';
import { RefreshCw, Power, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Patch {
    id: string;
    description?: string;
    enabled: boolean;
    status: string;
    lastError?: string;
}

export default function PatchManagerPage() {
    const [patches, setPatches] = useState<Patch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    useEffect(() => {
        if (!token) {
            setError('Authentication required. Please login first.');
            setLoading(false);
            return;
        }
        fetchPatches();
    }, [token]);

    const fetchPatches = async () => {
        if (!token) return;
        try {
            setLoading(true);
            console.log('🔄 Fetching patches with token:', token.substring(0, 20) + '...');
            const response = await fetch('http://localhost:5000/api/system-patches/status', {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('✅ Patches response status:', response.status);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to fetch (${response.status})`);
            }
            const data = await response.json();
            console.log('✅ Patches loaded:', data);
            setPatches(data.patches || []);
            setError(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error loading patches';
            console.error('❌ Fetch error:', msg);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const togglePatch = async (patchId: string, enabled: boolean) => {
        try {
            setTogglingId(patchId);
            const response = await fetch(`http://localhost:5000/api/system-patches/toggle/${patchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ enabled: !enabled }),
            });
            if (!response.ok) throw new Error('Failed to toggle');
            alert('✅ Patch toggled! Restart server to apply.');
            fetchPatches();
        } catch (err) {
            alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setTogglingId(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'FAILED':
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return <AlertCircle className="w-5 h-5 text-yellow-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">🔧 Patch Manager</h1>
                <p className="text-gray-600 mt-2">Enable/disable experimental features and safety plugins</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <button
                onClick={fetchPatches}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </button>

            {loading ? (
                <div className="text-center py-8">Loading patches...</div>
            ) : patches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No patches configured</div>
            ) : (
                <div className="grid gap-4">
                    {patches.map((patch) => (
                        <div key={patch.id} className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    {getStatusIcon(patch.status)}
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{patch.id}</h3>
                                        <p className="text-sm text-gray-600">{patch.description}</p>
                                        <div className="mt-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${patch.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                    patch.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {patch.status}
                                            </span>
                                        </div>
                                        {patch.lastError && (
                                            <p className="text-xs text-red-600 mt-2">{patch.lastError}</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => togglePatch(patch.id, patch.enabled)}
                                    disabled={togglingId === patch.id}
                                    className={`p-3 rounded-lg ${patch.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                            'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } disabled:opacity-50`}
                                >
                                    {togglingId === patch.id ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Power className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-gray-500">
                                {patch.enabled ? '✓ Enabled' : '✗ Disabled'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

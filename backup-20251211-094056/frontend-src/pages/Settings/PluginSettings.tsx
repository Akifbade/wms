import { useState, useEffect } from 'react';
import { RefreshCw, Activity, FileText, Shield } from 'lucide-react';

interface PluginStats {
    name: string;
    icon: any;
    status: 'active' | 'idle' | 'error';
    endpoint: string;
    data?: any;
    action?: () => void;
    actionLabel?: string;
}

export default function PluginSettings() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<PluginStats[]>([
        {
            name: 'Performance Monitor',
            icon: Activity,
            status: 'idle',
            endpoint: '/plugins/performance/stats',
        },
        {
            name: 'Request Logger',
            icon: FileText,
            status: 'idle',
            endpoint: '/plugins/request-logger/recent?limit=10',
        },
        {
            name: 'Audit Logger',
            icon: Shield,
            status: 'idle',
            endpoint: '/plugins/audit-logger/recent?limit=10',
        },
    ]);

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    const fetchPluginData = async (plugin: PluginStats, index: number) => {
        try {
            const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : '';
            const response = await fetch(`${backendUrl}${plugin.endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            setStats((prev) =>
                prev.map((p, i) =>
                    i === index ? { ...p, status: 'active', data } : p
                )
            );
        } catch (error: any) {
            console.error(`Error fetching ${plugin.name}:`, error);
            setStats((prev) =>
                prev.map((p, i) =>
                    i === index ? { ...p, status: 'error', data: { error: error.message } } : p
                )
            );
        }
    };

    const fetchAllPlugins = async () => {
        setLoading(true);
        await Promise.all(stats.map((plugin, index) => fetchPluginData(plugin, index)));
        setLoading(false);
    };

    useEffect(() => {
        fetchAllPlugins();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'error':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Plugin Settings & Monitoring</h1>
                    <p className="text-gray-600 mt-2">Real-time status of all active plugins</p>
                </div>
                <button
                    onClick={fetchAllPlugins}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh All
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.map((plugin, index) => {
                    const Icon = plugin.icon;
                    return (
                        <div
                            key={index}
                            className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-primary-100 rounded-lg">
                                        <Icon className="h-6 w-6 text-primary-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{plugin.name}</h3>
                                        <span
                                            className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(
                                                plugin.status
                                            )}`}
                                        >
                                            {plugin.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {plugin.data && (
                                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                                    {plugin.data.error ? (
                                        <p className="text-sm text-red-600">Error: {plugin.data.error}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {/* Performance Monitor */}
                                            {plugin.name === 'Performance Monitor' && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Total Requests:</span>
                                                        <span className="font-semibold">
                                                            {plugin.data.totalRequests || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Avg Response Time:</span>
                                                        <span className="font-semibold">
                                                            {plugin.data.avgResponseTime || 0}ms
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Slow Requests:</span>
                                                        <span className="font-semibold text-orange-600">
                                                            {plugin.data.slowRequests || 0} (
                                                            {plugin.data.slowRequestPercentage || 0}%)
                                                        </span>
                                                    </div>
                                                </>
                                            )}

                                            {/* Audit Logger - Show FULL DETAILS */}
                                            {plugin.name === 'Audit Logger' && (
                                                <>
                                                    <div className="flex justify-between mb-2">
                                                        <span className="text-sm text-gray-600">Total Logs:</span>
                                                        <span className="font-semibold">{plugin.data.totalInFile || 0}</span>
                                                    </div>
                                                    {plugin.data.logs && plugin.data.logs.length > 0 ? (
                                                        <div className="mt-3 space-y-2">
                                                            <p className="text-xs font-semibold text-gray-700 mb-2">📋 Recent Actions:</p>
                                                            {plugin.data.logs.slice(0, 5).map((log: any, i: number) => (
                                                                <div key={i} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className="font-semibold text-purple-600">{log.user}</span>
                                                                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                                    </div>
                                                                    <div className="text-gray-700">
                                                                        <span className="font-medium">{log.action}</span>
                                                                    </div>
                                                                    <div className="flex justify-between mt-1">
                                                                        <span className={`text-xs ${log.status < 400 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            Status: {log.status}
                                                                        </span>
                                                                        <span className="text-gray-500">{log.duration}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 italic mt-2">No audit logs yet</p>
                                                    )}
                                                </>
                                            )}

                                            {/* Remove Material Expiry section */}
                                            ```

                                            {/* Request Logger */}
                                            {plugin.name === 'Request Logger' && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Recent Logs:</span>
                                                        <span className="font-semibold">{plugin.data.count || 0}</span>
                                                    </div>
                                                    {plugin.data.logs && plugin.data.logs.length > 0 && (
                                                        <div className="mt-2 text-xs space-y-1">
                                                            {plugin.data.logs.slice(0, 3).map((log: any, i: number) => (
                                                                <div key={i} className="bg-white p-2 rounded border">
                                                                    <span
                                                                        className={`font-mono ${log.statusCode >= 400
                                                                            ? 'text-red-600'
                                                                            : 'text-green-600'
                                                                            }`}
                                                                    >
                                                                        {log.method} {log.path}
                                                                    </span>
                                                                    <span className="text-gray-500 ml-2">
                                                                        {log.statusCode} - {log.duration}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Auto-Assign Stats */}
                                            {plugin.name === 'Auto-Assign Stats' && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Total Shipments:</span>
                                                        <span className="font-semibold">
                                                            {plugin.data.totalShipments || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Total Racks:</span>
                                                        <span className="font-semibold">
                                                            {plugin.data.totalRacks || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">Average per Rack:</span>
                                                        <span className="font-semibold">
                                                            {plugin.data.averagePerRack || 0}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Database Backup Section */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="h-8 w-8 text-blue-600" />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Auto-Backup System</h2>
                        <p className="text-sm text-gray-600">
                            Automatic database backups every 6 hours with 7-day retention
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-gray-600">Backup Interval</p>
                        <p className="text-2xl font-bold text-blue-600">6 hours</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-gray-600">Retention Period</p>
                        <p className="text-2xl font-bold text-blue-600">7 days</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-gray-600">Storage Location</p>
                        <p className="text-sm font-mono text-gray-800 mt-1">backups/auto/</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

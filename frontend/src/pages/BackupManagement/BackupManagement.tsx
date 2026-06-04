import React, { useState, useEffect } from 'react';
import {
    ServerStackIcon,
    ArrowDownTrayIcon,
    PlusIcon,
    TrashIcon,
    ClockIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    Cog6ToothIcon,
    LockClosedIcon,
    ShieldCheckIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Backup {
    name: string;
    path: string;
    size: number;
    createdAt: string;
    modifiedAt: string;
    type?: 'quick' | 'full-system' | 'auto';
    directory?: string;
    autoCreated?: boolean;
}

interface BackupSettings {
    autoBackupEnabled: boolean;
    autoBackupTime: string;
    autoBackupFrequency: string;
    includeDatabase: boolean;
    includeUploads: boolean;
    includeCode: boolean;
    maxBackupCount: number;
    emailNotifications: boolean;
    retentionDays: number;
    // Git Sync Settings
    gitSyncEnabled?: boolean;
    gitRepoUrl?: string;
    gitBranch?: string;
    gitUsername?: string;
    gitEmail?: string;
    gitToken?: string;
    // Advanced Email Settings
    emailOnSuccess?: boolean;
    emailOnFailure?: boolean;
    emailOnWarning?: boolean;
    autoDeleteOld?: boolean;
}

const SECRET_PASSWORD = '24865'; // Secret backup access code

const BackupManagement: React.FC = () => {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [creatingFull, setCreatingFull] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [backupDir, setBackupDir] = useState('');
    const [maxBackups, setMaxBackups] = useState(10);
    const [stats, setStats] = useState<any>(null);

    // Password protection
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Settings modal
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<BackupSettings>({
        autoBackupEnabled: false,
        autoBackupTime: '03:00',
        autoBackupFrequency: 'daily',
        includeDatabase: true,
        includeUploads: true,
        includeCode: false,
        maxBackupCount: 10,
        emailNotifications: true,
        retentionDays: 30,
        // Git Sync defaults
        gitSyncEnabled: false,
        gitRepoUrl: '',
        gitBranch: 'main',
        gitUsername: '',
        gitEmail: '',
        gitToken: '',
        // Email defaults
        emailOnSuccess: true,
        emailOnFailure: true,
        emailOnWarning: true,
        autoDeleteOld: true
    });
    const [testingGit, setTestingGit] = useState(false);

    // Custom backup options
    const [showCustomBackup, setShowCustomBackup] = useState(false);
    const [customOptions, setCustomOptions] = useState({
        includeDatabase: true,
        includeUploads: true,
        includeCode: false,
        backupName: ''
    });

    useEffect(() => {
        // Check if previously unlocked in this session
        const unlocked = sessionStorage.getItem('backupUnlocked');
        if (unlocked === 'true') {
            setIsUnlocked(true);
            loadBackups();
            loadSettings();
        }
    }, []);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (passwordInput === SECRET_PASSWORD) {
            setIsUnlocked(true);
            sessionStorage.setItem('backupUnlocked', 'true');
            loadBackups();
            loadSettings();
        } else {
            setPasswordError('Invalid access code. Please try again.');
            setPasswordInput('');
        }
    };

    const loadBackups = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.backups.getAll();

            setBackups(response.backups);
            setBackupDir(response.backupDir);
            setMaxBackups(response.maxBackups);
            setStats(response.stats);
        } catch (err: any) {
            console.error('Load backups error:', err);
            setError(err.response?.data?.error || 'Failed to load backups');
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const response = await api.backups.getSettings();
            setSettings(response.settings);
        } catch (err: any) {
            console.error('Load settings error:', err);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await api.backups.updateSettings(settings);
            setSuccess('✅ Settings saved successfully!');
            setShowSettings(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError('Failed to save settings: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleTestGitConnection = async () => {
        try {
            setTestingGit(true);
            setError('');
            setSuccess('');
            
            // Test endpoint (you'll need to add this to backend)
            const response = await api.backups.testGitConnection({
                gitRepoUrl: settings.gitRepoUrl,
                gitToken: settings.gitToken,
                gitBranch: settings.gitBranch
            });
            
            setSuccess('✅ Git connection successful!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError('❌ Git connection failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setTestingGit(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            setCreating(true);
            setError('');
            setSuccess('');

            const response = await api.backups.create();

            setSuccess(`✅ Backup created: ${response.backup.name}`);
            loadBackups();
        } catch (err: any) {
            console.error('Create backup error:', err);
            setError(err.response?.data?.error || 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleCreateCustomBackup = async () => {
        try {
            setCreating(true);
            setError('');
            setSuccess('');

            const response = await api.backups.createCustom(customOptions);

            setSuccess(`✅ Custom backup created: ${response.backup.name}`);
            setShowCustomBackup(false);
            loadBackups();
        } catch (err: any) {
            console.error('Create custom backup error:', err);
            setError(err.response?.data?.error || 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleCreateFullSystemBackup = async () => {
        try {
            setCreatingFull(true);
            setError('');
            setSuccess('');

            const response = await api.backups.createFullSystem();

            setSuccess(`✅ Full system backup created: ${response.backup.name}`);
            loadBackups();
        } catch (err: any) {
            console.error('Full backup error:', err);
            setError(err.response?.data?.error || 'Failed to create full system backup');
        } finally {
            setCreatingFull(false);
        }
    };

    const handleDownloadBackup = async (backup: Backup) => {
        try {
            const response = await fetch(`/api/backups/download/${backup.name}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = backup.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setSuccess(`Downloaded: ${backup.name}`);
        } catch (err: any) {
            console.error('Download error:', err);
            setError('Failed to download backup');
        }
    };

    const handleDeleteBackup = async (backup: Backup) => {
        if (!confirm(`🗑️ DELETE BACKUP?\n\nAre you sure you want to delete:\n${backup.name}\n\nThis action CANNOT be undone!`)) {
            return;
        }

        try {
            setError('');

            await api.backups.delete(backup.name);

            setSuccess(`Deleted: ${backup.name}`);
            loadBackups();
        } catch (err: any) {
            console.error('Delete error:', err);
            setError(err.response?.data?.error || 'Failed to delete backup');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Password Lock Screen
    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full">
                    <form onSubmit={handlePasswordSubmit} className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
                                <LockClosedIcon className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">🔒 Secure Backup Access</h1>
                            <p className="text-blue-200">Enter secret access code to continue</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-blue-100 mb-2">
                                    Access Code
                                </label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                                    placeholder="• • • • •"
                                    maxLength={5}
                                    autoFocus
                                />
                            </div>

                            {passwordError && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-300 flex-shrink-0" />
                                    <p className="text-red-200 text-sm">{passwordError}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <ShieldCheckIcon className="w-5 h-5" />
                                Unlock Backup System
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-blue-300">
                                🔐 Protected by secret access code
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Main Backup Management Interface
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                                <ServerStackIcon className="h-10 w-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">🔒 Secure Backup Management</h1>
                                <p className="text-gray-600 mt-1">
                                    Advanced backup control panel - Protected by secret code
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
                            <span className="font-medium text-gray-700">Settings</span>
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Backups</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalBackups}</p>
                                </div>
                                <ServerStackIcon className="h-12 w-12 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Size</p>
                                    <p className="text-3xl font-bold text-gray-900">{formatBytes(stats.totalSize)}</p>
                                </div>
                                <DocumentArrowDownIcon className="h-12 w-12 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Quick Backups</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.quickBackups}</p>
                                </div>
                                <ClockIcon className="h-12 w-12 text-purple-500" />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Full System</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.fullSystemBackups}</p>
                                </div>
                                <ShieldCheckIcon className="h-12 w-12 text-orange-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleCreateBackup}
                            disabled={creating || creatingFull}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow transition-all ${creating || creatingFull
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                                }`}
                        >
                            {creating ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="h-5 w-5" />
                                    Quick Backup
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowCustomBackup(true)}
                            disabled={creating || creatingFull}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-purple-500 hover:bg-purple-600 text-white shadow transition-all"
                        >
                            <Cog6ToothIcon className="h-5 w-5" />
                            Custom Backup
                        </button>

                        <button
                            onClick={handleCreateFullSystemBackup}
                            disabled={creating || creatingFull}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow transition-all ${creating || creatingFull
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                                }`}
                        >
                            {creatingFull ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <ServerStackIcon className="h-5 w-5" />
                                    Full System Backup
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg flex items-start gap-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-800">Error</p>
                            <p className="text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-lg flex items-start gap-3">
                        <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-green-800">Success</p>
                            <p className="text-green-700">{success}</p>
                        </div>
                    </div>
                )}

                {/* Backups List */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <DocumentArrowDownIcon className="h-6 w-6 text-gray-600" />
                            Available Backups ({backups.length})
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading backups...</p>
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="p-12 text-center">
                            <ServerStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-gray-600 mb-2">No backups yet</p>
                            <p className="text-gray-500 mb-6">Create your first backup to protect your data</p>
                            <button
                                onClick={handleCreateBackup}
                                disabled={creating}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                            >
                                <PlusIcon className="h-5 w-5" />
                                Create First Backup
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {backups.map((backup) => (
                                <div key={backup.name} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <ServerStackIcon className="h-6 w-6 text-blue-600" />
                                                <h3 className="text-lg font-semibold text-gray-900 font-mono">
                                                    {backup.name}
                                                </h3>
                                                {backup.type === 'full-system' && (
                                                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full uppercase tracking-wide shadow">
                                                        ⭐ Full System
                                                    </span>
                                                )}
                                                {backup.type === 'auto' && (
                                                    <span className="px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full uppercase">
                                                        🤖 Auto
                                                    </span>
                                                )}
                                                {backup.type === 'quick' && (
                                                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full uppercase">
                                                        ⚡ Quick
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-6 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <ClockIcon className="h-4 w-4" />
                                                    <span>{formatDate(backup.createdAt)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <DocumentArrowDownIcon className="h-4 w-4" />
                                                    <span className="font-semibold">{formatBytes(backup.size)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleDownloadBackup(backup)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                            >
                                                <ArrowDownTrayIcon className="h-5 w-5" />
                                                Download
                                            </button>

                                            <button
                                                onClick={() => handleDeleteBackup(backup)}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Panel */}
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-900 mb-2">🔐 Backup Security Information</h3>
                            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                                <li>This backup system is protected by secret access code: <code className="bg-yellow-200 px-2 py-1 rounded">24865</code></li>
                                <li>Backups include: Database, uploaded files, and system configurations</li>
                                <li>Last {maxBackups} backups are kept automatically, older ones are deleted</li>
                                <li>Download important backups to external storage for safety</li>
                                <li>Auto backups can be scheduled in Settings (coming soon)</li>
                                <li>All backups are compressed and optimized for storage</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900">⚙️ Backup Settings</h2>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Auto Backup */}
                                <div>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.autoBackupEnabled}
                                            onChange={(e) => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <span className="font-semibold text-gray-900">Enable Automatic Backups</span>
                                    </label>
                                </div>

                                {settings.autoBackupEnabled && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Backup Time
                                            </label>
                                            <input
                                                type="time"
                                                value={settings.autoBackupTime}
                                                onChange={(e) => setSettings({ ...settings, autoBackupTime: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Frequency
                                            </label>
                                            <select
                                                value={settings.autoBackupFrequency}
                                                onChange={(e) => setSettings({ ...settings, autoBackupFrequency: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* What to Backup */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">What to Include</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={settings.includeDatabase}
                                                onChange={(e) => setSettings({ ...settings, includeDatabase: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span className="text-gray-700">Database (Recommended)</span>
                                        </label>

                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={settings.includeUploads}
                                                onChange={(e) => setSettings({ ...settings, includeUploads: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span className="text-gray-700">Uploaded Files (Recommended)</span>
                                        </label>

                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={settings.includeCode}
                                                onChange={(e) => setSettings({ ...settings, includeCode: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span className="text-gray-700">Source Code (Advanced)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Retention */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Retention Days
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.retentionDays}
                                        onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        min="7"
                                        max="365"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Backups older than this will be deleted</p>
                                </div>

                                {/* Max Backup Count */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Maximum Backup Count
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.maxBackupCount}
                                        onChange={(e) => setSettings({ ...settings, maxBackupCount: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        min="5"
                                        max="100"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Keep only the most recent backups</p>
                                </div>

                                {/* Email Notifications */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">📧 Email Notifications</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={settings.emailNotifications}
                                                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span className="text-gray-700">Enable All Notifications</span>
                                        </label>
                                        
                                        {settings.emailNotifications && (
                                            <div className="ml-8 space-y-2 mt-2">
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.emailOnSuccess}
                                                        onChange={(e) => setSettings({ ...settings, emailOnSuccess: e.target.checked })}
                                                        className="w-4 h-4 text-green-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-600">✅ Backup Created Successfully</span>
                                                </label>
                                                
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.emailOnFailure}
                                                        onChange={(e) => setSettings({ ...settings, emailOnFailure: e.target.checked })}
                                                        className="w-4 h-4 text-red-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-600">❌ Backup Failed</span>
                                                </label>
                                                
                                                <label className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.emailOnWarning}
                                                        onChange={(e) => setSettings({ ...settings, emailOnWarning: e.target.checked })}
                                                        className="w-4 h-4 text-yellow-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-600">⚠️ Storage Warnings</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Git Sync Section */}
                                <div className="border-t pt-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <input
                                            type="checkbox"
                                            checked={settings.gitSyncEnabled}
                                            onChange={(e) => setSettings({ ...settings, gitSyncEnabled: e.target.checked })}
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <h3 className="font-semibold text-gray-900">🔗 Git Sync (Auto-push backups to GitHub)</h3>
                                    </div>

                                    {settings.gitSyncEnabled && (
                                        <div className="space-y-4 ml-8">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Repository URL *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.gitRepoUrl}
                                                    onChange={(e) => setSettings({ ...settings, gitRepoUrl: e.target.value })}
                                                    placeholder="https://github.com/username/wms-backups.git"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Branch
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={settings.gitBranch}
                                                        onChange={(e) => setSettings({ ...settings, gitBranch: e.target.value })}
                                                        placeholder="main"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Username
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={settings.gitUsername}
                                                        onChange={(e) => setSettings({ ...settings, gitUsername: e.target.value })}
                                                        placeholder="Your GitHub username"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={settings.gitEmail}
                                                    onChange={(e) => setSettings({ ...settings, gitEmail: e.target.value })}
                                                    placeholder="your@email.com"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Personal Access Token *
                                                </label>
                                                <input
                                                    type="password"
                                                    value={settings.gitToken}
                                                    onChange={(e) => setSettings({ ...settings, gitToken: e.target.value })}
                                                    placeholder="ghp_xxxxxxxxxxxx"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Generate at: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">github.com/settings/tokens</a>
                                                </p>
                                            </div>

                                            <button
                                                onClick={handleTestGitConnection}
                                                disabled={testingGit || !settings.gitRepoUrl || !settings.gitToken}
                                                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                                            >
                                                {testingGit ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                        Testing Connection...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                        Test Git Connection
                                                    </>
                                                )}
                                            </button>

                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                    💡 <strong>Tip:</strong> When Git Sync is enabled, every backup will be automatically committed and pushed to your GitHub repository!
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Auto-delete Old Backups */}
                                <div className="border-t pt-6">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.autoDeleteOld}
                                            onChange={(e) => setSettings({ ...settings, autoDeleteOld: e.target.checked })}
                                            className="w-5 h-5 text-red-600 rounded"
                                        />
                                        <span className="text-gray-700">🗑️ Automatically Delete Old Backups (based on retention policy)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 flex gap-3">
                                <button
                                    onClick={handleSaveSettings}
                                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                                >
                                    Save Settings
                                </button>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Backup Modal */}
                {showCustomBackup && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-900">🎯 Custom Backup</h2>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Backup Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={customOptions.backupName}
                                        onChange={(e) => setCustomOptions({ ...customOptions, backupName: e.target.value })}
                                        placeholder="Leave empty for auto-generated name"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Select What to Backup</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={customOptions.includeDatabase}
                                                onChange={(e) => setCustomOptions({ ...customOptions, includeDatabase: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span>Database</span>
                                        </label>

                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={customOptions.includeUploads}
                                                onChange={(e) => setCustomOptions({ ...customOptions, includeUploads: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span>Uploads</span>
                                        </label>

                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={customOptions.includeCode}
                                                onChange={(e) => setCustomOptions({ ...customOptions, includeCode: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded"
                                            />
                                            <span>Source Code</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 flex gap-3">
                                <button
                                    onClick={handleCreateCustomBackup}
                                    className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
                                >
                                    Create Custom Backup
                                </button>
                                <button
                                    onClick={() => setShowCustomBackup(false)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackupManagement;

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
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Backup {
    name: string;
    path: string;
    size: number;
    createdAt: string;
    modifiedAt: string;
    type?: 'quick' | 'full-system';
    directory?: string;
}

const BackupManagement: React.FC = () => {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [creatingFull, setCreatingFull] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [backupDir, setBackupDir] = useState('');
    const [maxBackups, setMaxBackups] = useState(7);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.backups.getAll();

            setBackups(response.backups);
            setBackupDir(response.backupDir);
            setMaxBackups(response.maxBackups);
        } catch (err: any) {
            console.error('Load backups error:', err);
            setError(err.response?.data?.error || 'Failed to load backups');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            setCreating(true);
            setError('');
            setSuccess('');

            const response = await api.backups.create();

            setSuccess(`Backup created successfully: ${response.backup.name}`);
            loadBackups(); // Refresh list
        } catch (err: any) {
            console.error('Create backup error:', err);
            setError(err.response?.data?.error || 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleCreateFullSystemBackup = async () => {
        const command = `$t=Get-Date -Format 'yyyy-MM-dd_HH-mm-ss';$p="C:\\WMS_FULL_BACKUPS\\WMS_FULL_SYSTEM_$t";mkdir "$p\\database","$p\\backend","$p\\frontend" -Force|Out-Null;docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction warehouse_wms>"$p\\database\\database.sql";Copy-Item backend\\* "$p\\backend\\" -Recurse -Exclude node_modules,dist,uploads -Force;Copy-Item backend\\uploads "$p\\backend\\" -Recurse -Force -ErrorAction SilentlyContinue;Copy-Item frontend\\* "$p\\frontend\\" -Recurse -Exclude node_modules,dist -Force;Copy-Item docker-compose*.yml,"env*" $p -Force -ErrorAction SilentlyContinue;'Complete backup ready!'|Out-File "$p\\README.txt";Compress-Archive "$p\\*" "$p.zip" -Force;Remove-Item $p -Recurse;Write-Host "✅ Backup created: $p.zip" -ForegroundColor Green`;

        const message = `🚀 COMPLETE PLUG-AND-PLAY SYSTEM BACKUP\n\n` +
            `This creates a backup with:\n` +
            `• Complete backend source code\n` +
            `• Complete frontend source code\n` +
            `• Full database with all data\n` +
            `• All uploads and user files\n` +
            `• Docker configurations\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📋 COPY & RUN THIS COMMAND IN POWERSHELL:\n\n` +
            `The command will be copied to your clipboard.\n` +
            `Just paste it in PowerShell and press Enter!\n\n` +
            `Backup will be saved to: C:\\WMS_FULL_BACKUPS\\`;

        if (confirm(message)) {
            try {
                // Copy to clipboard
                await navigator.clipboard.writeText(command);
                setSuccess(`✅ Command copied to clipboard!\n\nNow:\n1. Open PowerShell\n2. Press Ctrl+V to paste\n3. Press Enter\n\nBackup will be created in C:\\WMS_FULL_BACKUPS\\`);
            } catch {
                // Fallback: show command in alert
                alert(`Copy this command and run in PowerShell:\n\n${command}`);
                setSuccess('Command shown in dialog - copy and run it in PowerShell');
            }
        }
    };

    const handleDownloadBackup = async (backup: Backup) => {
        try {
            const response = await fetch(`/api/backups/download/${backup.name}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

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
        if (!confirm(`Are you sure you want to delete backup: ${backup.name}?`)) {
            return;
        }

        try {
            setError('');

            await api.backups.delete(backup.name);

            setSuccess(`Deleted: ${backup.name}`);
            loadBackups(); // Refresh list
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
                                <h1 className="text-3xl font-bold text-gray-900">Backup Management</h1>
                                <p className="text-gray-600 mt-1">
                                    Protect your data with automated backups
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCreateBackup}
                                disabled={creating || creatingFull}
                                className={`
                  flex items-center gap-3 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all
                  ${creating || creatingFull
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                                    }
                `}
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
                                onClick={handleCreateFullSystemBackup}
                                disabled={creating || creatingFull}
                                className={`
                  flex items-center gap-3 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all
                  ${creating || creatingFull
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                                    }
                `}
                            >
                                {creatingFull ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Creating Full Backup...
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

                {/* Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Backups</p>
                            <p className="text-2xl font-bold text-gray-900">{backups.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Backup Location</p>
                            <p className="text-sm font-mono text-gray-900 truncate" title={backupDir}>{backupDir}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Retention Policy</p>
                            <p className="text-2xl font-bold text-gray-900">Last {maxBackups} backups</p>
                        </div>
                    </div>
                </div>

                {/* Backups List */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <DocumentArrowDownIcon className="h-6 w-6 text-gray-600" />
                            Available Backups
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
                                <div
                                    key={backup.name}
                                    className="p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <ServerStackIcon className="h-6 w-6 text-blue-600" />
                                                <h3 className="text-lg font-semibold text-gray-900 font-mono">
                                                    {backup.name}
                                                </h3>
                                                {backup.type === 'full-system' && (
                                                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full uppercase tracking-wide shadow-lg">
                                                        ⭐ Full System
                                                    </span>
                                                )}
                                                {backup.type === 'quick' && (
                                                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                                                        Quick
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
                                                {backup.type === 'full-system' && (
                                                    <div className="text-xs text-green-600 font-semibold">
                                                        ✓ Complete system - One-click restore ready!
                                                    </div>
                                                )}
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
                            <h3 className="font-semibold text-yellow-900 mb-2">Important Information</h3>
                            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                                <li>Backups include: Database, uploaded files, and configurations</li>
                                <li>Only the last {maxBackups} backups are kept automatically</li>
                                <li>Download important backups to external storage for safety</li>
                                <li>Regular backups help recover from accidental data loss or system failures</li>
                                <li>Backup creation may take 10-60 seconds depending on data size</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupManagement;

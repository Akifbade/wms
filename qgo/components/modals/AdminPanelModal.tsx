import React, { useState } from 'react';
import { User, RolePermissions, PermissionSet } from '../../types';
import Modal from './Modal';

interface AdminPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onUpdateUsers: (users: User[]) => void;
    permissions: RolePermissions;
    onUpdatePermissions: (permissions: RolePermissions) => void;
}

type Tab = 'users' | 'permissions';

const PermissionCheckbox: React.FC<{ label: string; isChecked: boolean; onChange: (checked: boolean) => void }> = ({ label, isChecked, onChange }) => (
    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
        <input type="checkbox" checked={isChecked} onChange={e => onChange(e.target.checked)} className="h-4 w-4" />
        <span className="text-sm">{label}</span>
    </label>
);

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose, users, onUpdateUsers, permissions, onUpdatePermissions }) => {
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [localPermissions, setLocalPermissions] = useState(permissions);

    React.useEffect(() => {
        if (isOpen) {
            setLocalPermissions(permissions); // Reset local state when modal opens
        }
    }, [isOpen, permissions]);

    const handlePermissionChange = (role: 'checker' | 'user', key: keyof PermissionSet, value: boolean) => {
        setLocalPermissions(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [key]: value
            }
        }));
    };

    const handleSaveChanges = () => {
        onUpdatePermissions(localPermissions);
        onClose(); // Assuming you want to close on save
    };

    const permissionLabels: { key: keyof PermissionSet, label: string }[] = [
        { key: 'canCreateJob', label: 'Can Create Jobs' },
        { key: 'canEditJob', label: 'Can Edit Jobs' },
        { key: 'canDeleteJob', label: 'Can Delete Jobs' },
        { key: 'canCheckJob', label: 'Can Check Jobs' },
        { key: 'canApproveJob', label: 'Can Approve/Reject Jobs' },
        { key: 'canManageClients', label: 'Can Manage Clients' },
        { key: 'canViewAnalytics', label: 'Can View Analytics' },
        { key: 'canManagePODs', label: 'Can Manage PODs' },
        { key: 'canManageUsers', label: 'Can Manage Users' },
        { key: 'canManageSettings', label: 'Can Manage App Settings' },
    ];
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Admin Panel" maxWidth="max-w-4xl">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        User Management
                    </button>
                    <button onClick={() => setActiveTab('permissions')} className={`${activeTab === 'permissions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Role Permissions
                    </button>
                </nav>
            </div>

            {activeTab === 'users' && (
                <div className="py-4">
                    <div className="overflow-x-auto max-h-[60vh]">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2 text-left">User</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Status</th></tr></thead>
                            <tbody>{users.map(user => (<tr key={user.uid} className="border-t">
                                <td className="p-2"><p className="font-semibold">{user.displayName}</p><p className="text-xs text-gray-500">{user.email}</p></td>
                                <td className="p-2"><select value={user.role} onChange={e => onUpdateUsers(users.map(u => u.uid === user.uid ? { ...u, role: e.target.value as User['role'] } : u))} className="input-field-sm">
                                    <option value="user">User</option><option value="checker">Checker</option><option value="driver">Driver</option><option value="admin">Admin</option>
                                </select></td>
                                <td className="p-2"><select value={user.status} onChange={e => onUpdateUsers(users.map(u => u.uid === user.uid ? { ...u, status: e.target.value as User['status'] } : u))} className="input-field-sm">
                                    <option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option>
                                </select></td>
                            </tr>))}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-lg mb-2">Checker Role</h3>
                            <div className="space-y-2">{permissionLabels.map(({ key, label }) => (
                                <PermissionCheckbox key={key} label={label} isChecked={localPermissions.checker[key]} onChange={(val) => handlePermissionChange('checker', key, val)} />
                            ))}</div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-2">User Role</h3>
                            <div className="space-y-2">{permissionLabels.map(({ key, label }) => (
                                <PermissionCheckbox key={key} label={label} isChecked={localPermissions.user[key]} onChange={(val) => handlePermissionChange('user', key, val)} />
                            ))}</div>
                        </div>
                    </div>
                    <div className="text-right mt-6">
                        <button onClick={handleSaveChanges} className="btn btn-primary">Save Permissions</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default AdminPanelModal;
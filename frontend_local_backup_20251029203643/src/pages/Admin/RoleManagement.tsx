import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Check, X, Save, RefreshCw, Users } from 'lucide-react';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface RolePermission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  permissionId: string;
}

interface GroupedPermissions {
  [resource: string]: Permission[];
}

const ROLES = ['ADMIN', 'MANAGER', 'WORKER'];

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  MANAGER: 'bg-green-100 text-green-800 border-green-200',
  WORKER: 'bg-blue-100 text-blue-800 border-blue-200',
};

const RoleManagement: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('MANAGER');
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAllPermissions();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchAllPermissions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAllPermissions(response.data.data.permissions);
        setGroupedPermissions(response.data.data.grouped);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      showMessage('error', 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (role: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`/api/permissions/role/${role}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setRolePermissions(response.data.data.permissions);
        
        // Build set of selected permission IDs
        const selected = new Set(response.data.data.permissions.map((p: RolePermission) => p.permissionId));
        setSelectedPermissions(selected);
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
      showMessage('error', 'Failed to load role permissions');
    }
  };

  const togglePermission = (permissionId: string) => {
    // Don't allow editing ADMIN permissions
    if (selectedRole === 'ADMIN') {
      showMessage('error', 'ADMIN role has full access and cannot be modified');
      return;
    }

    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleAllForResource = (resource: string) => {
    if (selectedRole === 'ADMIN') {
      showMessage('error', 'ADMIN role has full access and cannot be modified');
      return;
    }

    const resourcePerms = groupedPermissions[resource] || [];
    const allSelected = resourcePerms.every(p => selectedPermissions.has(p.id));
    
    const newSelected = new Set(selectedPermissions);
    resourcePerms.forEach(p => {
      if (allSelected) {
        newSelected.delete(p.id);
      } else {
        newSelected.add(p.id);
      }
    });
    
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    if (selectedRole === 'ADMIN') {
      showMessage('error', 'ADMIN role has full access and cannot be modified');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `/api/permissions/role/${selectedRole}/bulk`,
        { permissionIds: Array.from(selectedPermissions) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showMessage('success', `Permissions updated for ${selectedRole}!`);
        await fetchRolePermissions(selectedRole);
      }
    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchRolePermissions(selectedRole);
    showMessage('success', 'Changes discarded');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getPermissionCount = () => {
    return selectedPermissions.size;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Role & Permission Management
            </h1>
            <p className="text-gray-600 mt-1">
              Configure what each role can see and do in the system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Permissions:</span>
            <span className="text-lg font-bold text-blue-600">{getPermissionCount()}/{allPermissions.length}</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Role Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex-1 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedRole === role
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{role}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Role Info */}
          <div className={`border-2 rounded-lg p-4 mb-6 ${ROLE_COLORS[selectedRole as keyof typeof ROLE_COLORS]}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Configuring: {selectedRole}</h3>
                <p className="text-sm mt-1">
                  {selectedRole === 'ADMIN' && 'Full system access - cannot be modified'}
                  {selectedRole === 'MANAGER' && 'Operational control - can manage daily tasks'}
                  {selectedRole === 'WORKER' && 'Limited access - basic operational tasks'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  {rolePermissions.length} permissions assigned
                </span>
              </div>
            </div>
          </div>

          {/* Permission Matrix */}
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([resource, permissions]) => {
              const allSelected = permissions.every(p => selectedPermissions.has(p.id));
              const someSelected = permissions.some(p => selectedPermissions.has(p.id));
              
              return (
                <div key={resource} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Resource Header */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAllForResource(resource)}
                        disabled={selectedRole === 'ADMIN'}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedRole === 'ADMIN'
                            ? 'bg-gray-200 border-gray-300 cursor-not-allowed'
                            : allSelected
                            ? 'bg-blue-600 border-blue-600'
                            : someSelected
                            ? 'bg-blue-300 border-blue-300'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {allSelected && <Check className="w-3 h-3 text-white" />}
                        {!allSelected && someSelected && <div className="w-2 h-0.5 bg-white" />}
                      </button>
                      <h4 className="font-semibold text-gray-900">{resource.replace(/_/g, ' ')}</h4>
                    </div>
                    <span className="text-sm text-gray-500">
                      {permissions.filter(p => selectedPermissions.has(p.id)).length} / {permissions.length}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {permissions.map(permission => (
                      <button
                        key={permission.id}
                        onClick={() => togglePermission(permission.id)}
                        disabled={selectedRole === 'ADMIN'}
                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                          selectedRole === 'ADMIN'
                            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                            : selectedPermissions.has(permission.id)
                            ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {selectedPermissions.has(permission.id) && <Check className="w-4 h-4" />}
                          {permission.action}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              onClick={handleReset}
              disabled={selectedRole === 'ADMIN' || saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Reset Changes
            </button>
            <button
              onClick={handleSave}
              disabled={selectedRole === 'ADMIN' || saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 inline mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Help Text */}
          {selectedRole === 'ADMIN' && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> ADMIN role has full system access by default and cannot be modified.
                To restrict admin permissions, consider creating a custom MANAGER role instead.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold mb-4">Permission Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div>
            <p className="font-medium text-sm">VIEW</p>
            <p className="text-xs text-gray-600">Read and view data</p>
          </div>
          <div>
            <p className="font-medium text-sm">CREATE</p>
            <p className="text-xs text-gray-600">Create new records</p>
          </div>
          <div>
            <p className="font-medium text-sm">EDIT</p>
            <p className="text-xs text-gray-600">Modify existing data</p>
          </div>
          <div>
            <p className="font-medium text-sm">DELETE</p>
            <p className="text-xs text-gray-600">Remove records</p>
          </div>
          <div>
            <p className="font-medium text-sm">APPROVE</p>
            <p className="text-xs text-gray-600">Approve requests</p>
          </div>
          <div>
            <p className="font-medium text-sm">EXPORT</p>
            <p className="text-xs text-gray-600">Export data files</p>
          </div>
          <div>
            <p className="font-medium text-sm">MANAGE</p>
            <p className="text-xs text-gray-600">Full control</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;

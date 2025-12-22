import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Shield, Check, X, Save, RefreshCw, Users, Search, ChevronDown, ChevronUp } from 'lucide-react';

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

// Category labels for better organization
const CATEGORY_LABELS: Record<string, string> = {
  'DASHBOARD': '🏠 Dashboard',
  'DASHBOARD_STATS': '📊 Dashboard Stats',
  'DASHBOARD_CHARTS': '📈 Dashboard Charts',
  'DASHBOARD_QUICK_ACTIONS': '⚡ Quick Actions',
  'FINANCE': '💰 Finance Tab',
  'FINANCE_OVERVIEW': '📊 Finance Overview',
  'FINANCE_CHARTS': '📈 Finance Charts',
  'FINANCE_EXPORT': '📤 Finance Export',
  'FINANCE_ANALYTICS': '📊 Finance Analytics',
  'FINANCE_PROFIT_LOSS': '💵 Profit & Loss',
  'COMPANIES': '🏢 Companies',
  'COMPANY_PROFILE': '🏢 Company Profile',
  'COMPANY_PROFILE_ANALYTICS': '📊 Profile Analytics',
  'COMPANY_PROFILE_INVOICES': '🧾 Profile Invoices',
  'COMPANY_PROFILE_PAYMENTS': '💳 Profile Payments',
  'COMPANY_PROFILE_SHIPMENTS': '📦 Profile Shipments',
  'SHIPMENTS': '📦 Shipments',
  'RACKS': '🏷️ Racks',
  'INVOICES': '🧾 Invoices',
  'PAYMENTS': '💰 Payments',
  'EXPENSES': '💸 Expenses',
  'MOVING_JOBS': '🚚 Moving Jobs',
  'MATERIALS': '📦 Materials',
  'MATERIALS_REPORT': '📊 Materials Report',
  'CUSTOMER_MATERIALS': '📦 Customer Materials',
  'SCANNER': '📱 Scanner',
  'ANALYTICS': '📊 Analytics',
  'SHIPMENT_REPORT': '📋 Shipment Report',
  'WORKER_DASHBOARD': '👷 Worker Dashboard',
  'MOBILE_UPLOAD': '📸 Mobile Upload',
  'BACKUP_MANAGEMENT': '💾 Backup Management',
  'SYSTEM_MONITOR': '🖥️ System Monitor',
  'USERS': '👥 Users',
  'SETTINGS_COMPANY_PROFILE': '🏢 Company Profile',
  'SETTINGS_QR_CONFIG': '🔲 QR Settings',
  'SETTINGS_BILLING': '💳 Billing Settings',
  'SETTINGS_CUSTOM_FIELDS': '🔧 Custom Fields',
  'SETTINGS_NOTIFICATIONS': '🔔 Notifications',
  'SETTINGS_SYSTEM': '⚙️ System Settings',
  'REPORTS': '📑 Reports',
  'REPORTS_FINANCIAL': '💵 Financial Reports',
  'REPORTS_INVENTORY': '📊 Inventory Reports',
  'REPORTS_JOBS': '🚛 Jobs Reports',
  'REPORTS_CUSTOM': '📝 Custom Reports',
  'ROLE_MANAGEMENT': '🎭 Role Management',
  'BILLING': '💳 Billing',
  'PROFILE': '👤 Profile',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  const toggleCategory = (resource: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(filteredGroups)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
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

  // Filtered groups based on search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedPermissions;

    const filtered: GroupedPermissions = {};
    Object.entries(groupedPermissions).forEach(([resource, perms]) => {
      const matchingPerms = perms.filter(p =>
        p.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingPerms.length > 0) {
        filtered[resource] = matchingPerms;
      }
    });

    return filtered;
  }, [groupedPermissions, searchTerm]);

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
        <div className={`px-4 py-3 rounded-lg border ${message.type === 'success'
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
                className={`flex-1 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${selectedRole === role
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
          <div className={`border-2 rounded-lg p-4 mb-4 ${ROLE_COLORS[selectedRole as keyof typeof ROLE_COLORS]}`}>
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

          {/* Search & Controls */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Collapse All
            </button>
          </div>

          {/* Permission Matrix */}
          <div className="space-y-3">
            {Object.entries(filteredGroups).map(([resource, permissions]) => {
              const allSelected = permissions.every(p => selectedPermissions.has(p.id));
              const someSelected = permissions.some(p => selectedPermissions.has(p.id));
              const isExpanded = expandedCategories.has(resource);

              return (
                <div key={resource} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Resource Header */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAllForResource(resource)}
                        disabled={selectedRole === 'ADMIN'}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedRole === 'ADMIN'
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
                      <button
                        onClick={() => toggleCategory(resource)}
                        className="flex items-center gap-2 hover:text-blue-600"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <h4 className="font-semibold text-gray-900">
                          {CATEGORY_LABELS[resource] || resource.replace(/_/g, ' ')}
                        </h4>
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      {permissions.filter(p => selectedPermissions.has(p.id)).length} / {permissions.length}
                    </span>
                  </div>

                  {/* Actions */}
                  {isExpanded && (
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {permissions.map(permission => (
                        <button
                          key={permission.id}
                          onClick={() => togglePermission(permission.id)}
                          disabled={selectedRole === 'ADMIN'}
                          title={permission.description || undefined}
                          className={`px-3 py-2 rounded-lg border-2 font-medium text-xs transition-all ${selectedRole === 'ADMIN'
                              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                              : selectedPermissions.has(permission.id)
                                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                            }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {selectedPermissions.has(permission.id) && <Check className="w-3.5 h-3.5" />}
                            <span className="truncate">{permission.action}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Granular Control Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Categories</p>
            <p className="text-2xl font-bold text-blue-600">{Object.keys(groupedPermissions).length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Permissions</p>
            <p className="text-2xl font-bold text-green-600">{allPermissions.length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">{selectedRole} Has</p>
            <p className="text-2xl font-bold text-purple-600">{getPermissionCount()}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Coverage</p>
            <p className="text-2xl font-bold text-orange-600">
              {Math.round((getPermissionCount() / allPermissions.length) * 100)}%
            </p>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>💡 <strong>Settings are now separated:</strong> Company Profile, QR Settings, Billing, etc. have individual permissions</p>
          <p>💡 <strong>Full control:</strong> You can now control every VIEW, CREATE, EDIT, DELETE action separately</p>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;

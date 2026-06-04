import React, { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  EyeIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { usersAPI } from '../../../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'DRIVER' | 'WORKER' | 'SCANNER' | 'PACKER' | 'LABOR';
  status: 'ACTIVE' | 'INACTIVE';
  skills: string[];
  joinedAt: string;
  lastActive: string;
  avatar?: string;
  isDummy?: boolean;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ahmed Al-Rashid',
    email: 'ahmed@kws.com',
    phone: '+965 9876 5432',
    role: 'ADMIN',
    status: 'ACTIVE',
    skills: ['Management', 'Planning', 'Customer Service'],
    joinedAt: '2024-01-15',
    lastActive: '2 minutes ago'
  },
  {
    id: '2',
    name: 'Fatima Al-Zahra',
    email: 'fatima@kws.com',
    phone: '+965 8765 4321',
    role: 'MANAGER',
    status: 'ACTIVE',
    skills: ['Team Management', 'Inventory', 'Quality Control'],
    joinedAt: '2024-02-20',
    lastActive: '1 hour ago'
  },
  {
    id: '3',
    name: 'Mohammed Hassan',
    email: 'mohammed@kws.com',
    phone: '+965 7654 3210',
    role: 'WORKER',
    status: 'ACTIVE',
    skills: ['Packing', 'Heavy Lifting', 'Driving'],
    joinedAt: '2024-03-10',
    lastActive: '30 minutes ago'
  },
  {
    id: '4',
    name: 'Sarah Abdullah',
    email: 'sarah@kws.com',
    phone: '+965 6543 2109',
    role: 'WORKER',
    status: 'INACTIVE',
    skills: ['Customer Service', 'Documentation', 'Quality Check'],
    joinedAt: '2024-01-25',
    lastActive: '2 days ago'
  }
];

const roleColors = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  DRIVER: 'bg-purple-100 text-purple-800',
  WORKER: 'bg-green-100 text-green-800',
  SCANNER: 'bg-yellow-100 text-yellow-800',
  PACKER: 'bg-gray-100 text-gray-800',
  LABOR: 'bg-gray-100 text-gray-800'
};

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800'
};

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<any>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      const formattedUsers = response.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        status: (u.isActive ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
        skills: u.skills ? (typeof u.skills === 'string' ? JSON.parse(u.skills) : u.skills) : [],
        joinedAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
        lastActive: new Date(u.updatedAt).toLocaleDateString(),
        avatar: u.avatar || undefined
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersAPI.delete(userId);
      await loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await usersAPI.toggleStatus(userId);
      await loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to toggle user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage team members, roles, and permissions</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckBadgeIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'INACTIVE').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="DRIVER">Driver</option>
              <option value="WORKER">Worker</option>
              <option value="SCANNER">Scanner</option>
              <option value="PACKER">Packer</option>
              <option value="LABOR">Labor</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={user.avatar}
                            alt={user.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {getInitials(user.name)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role]}`}>
                        {user.role}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[user.status]}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.skills.slice(0, 2).map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {user.skills.length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          +{user.skills.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowViewModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAddModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit User"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete User"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Role Permissions Guide</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Admin */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center mb-3">
              <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="font-medium text-red-900">Admin</h4>
            </div>
            <ul className="text-xs text-red-700 space-y-1">
              <li>✅ Full system access</li>
              <li>✅ Manage users</li>
              <li>✅ View all jobs</li>
              <li>✅ Financial reports</li>
              <li>✅ Settings</li>
            </ul>
          </div>

          {/* Manager */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center mb-3">
              <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Manager</h4>
            </div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>✅ Manage jobs</li>
              <li>✅ View reports</li>
              <li>✅ Manage teams</li>
              <li>✅ Scan shipments</li>
              <li>❌ System settings</li>
            </ul>
          </div>

          {/* Driver */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center mb-3">
              <span className="text-purple-600 mr-2">🚗</span>
              <h4 className="font-medium text-purple-900">Driver</h4>
            </div>
            <ul className="text-xs text-purple-700 space-y-1">
              <li>✅ View assigned jobs</li>
              <li>✅ Update job status</li>
              <li>✅ Mobile app access</li>
              <li>❌ View all jobs</li>
              <li>❌ Manage system</li>
            </ul>
          </div>

          {/* Worker */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center mb-3">
              <CheckBadgeIcon className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">Worker</h4>
            </div>
            <ul className="text-xs text-green-700 space-y-1">
              <li>✅ Scan shipments</li>
              <li>✅ View dashboard</li>
              <li>✅ Manage shipments</li>
              <li>❌ Manage jobs</li>
              <li>❌ View reports</li>
            </ul>
          </div>

          {/* Scanner */}
          <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
            <div className="flex items-center mb-3">
              <span className="text-yellow-600 mr-2">📱</span>
              <h4 className="font-medium text-yellow-900">Scanner</h4>
            </div>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>✅ Scan shipments ONLY</li>
              <li>✅ View pending items</li>
              <li>❌ Dashboard access</li>
              <li>❌ Manage anything</li>
              <li>❌ Reports</li>
            </ul>
          </div>

          {/* Packer */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-100">
            <div className="flex items-center mb-3">
              <span className="text-gray-600 mr-2">📦</span>
              <h4 className="font-medium text-gray-900">Packer</h4>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>🔒 Dummy user only</li>
              <li>✅ Job staff assignment</li>
              <li>❌ Cannot login</li>
              <li>❌ No system access</li>
              <li>Used for tracking</li>
            </ul>
          </div>

          {/* Labor */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-100">
            <div className="flex items-center mb-3">
              <span className="text-gray-600 mr-2">🔧</span>
              <h4 className="font-medium text-gray-900">Labor</h4>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>🔒 Dummy user only</li>
              <li>✅ Job staff assignment</li>
              <li>❌ Cannot login</li>
              <li>❌ No system access</li>
              <li>Used for tracking</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> PACKER and LABOR roles are "dummy users" - they can be assigned to Moving Job staff for tracking purposes but cannot login to the system.
          </p>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const userData: any = {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                role: formData.get('role') as string,
              };

              // Only include password for new users or if provided for edit
              const password = formData.get('password') as string;
              if (password && password.trim()) {
                userData.password = password;
              }

              try {
                if (selectedUser) {
                  // Edit existing user
                  await usersAPI.update(selectedUser.id, userData);
                  alert('User updated successfully!');
                } else {
                  // Create new user
                  if (!userData.password) {
                    alert('Password is required for new users');
                    return;
                  }
                  await usersAPI.create(userData);
                  alert('User created successfully!');
                }

                setShowAddModal(false);
                setSelectedUser(null);
                loadUsers();
                e.currentTarget.reset();
              } catch (error: any) {
                alert(error.message || `Failed to ${selectedUser ? 'update' : 'create'} user`);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={selectedUser?.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={selectedUser?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {selectedUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    required={!selectedUser}
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={selectedUser ? "Leave blank to keep current password" : "Minimum 6 characters"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    defaultValue={selectedUser?.role || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select a role</option>
                    <option value="ADMIN">🛡️ Admin - Full system access</option>
                    <option value="MANAGER">👔 Manager - Manage jobs & teams</option>
                    <option value="DRIVER">🚗 Driver - View assigned jobs only</option>
                    <option value="WORKER">👷 Worker - General warehouse work</option>
                    <option value="SCANNER">📱 Scanner - QR scanning only</option>
                    <option value="PACKER">📦 Packer - Staff assignment only</option>
                    <option value="LABOR">🔧 Labor - Staff assignment only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    PACKER/LABOR are dummy users for job staff assignment only
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  {selectedUser ? (
                    <>
                      <PencilIcon className="h-5 w-5" />
                      <span>Update User</span>
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="h-5 w-5" />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">
                    {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <p className="text-gray-600">{selectedUser.phone}</p>
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Role</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${roleColors[selectedUser.role]}`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusColors[selectedUser.status]}`}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              {/* Skills */}
              {selectedUser.skills && selectedUser.skills.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Joined</p>
                  <p className="font-semibold text-gray-900">{selectedUser.joinedAt}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Last Active</p>
                  <p className="font-semibold text-gray-900">{selectedUser.lastActive}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowPermissionsModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>Edit Permissions</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <PencilIcon className="h-5 w-5" />
                  <span>Edit User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Edit Permissions</h3>
                <p className="text-gray-600">{selectedUser.name} - {selectedUser.role}</p>
              </div>
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form data-permissions-form className="space-y-6">
              {/* Dashboard Permissions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <span className="text-2xl mr-2">📊</span> Dashboard Access
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="dashboard_view" className="w-5 h-5" defaultChecked />
                    <span>View Dashboard</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="dashboard_stats" className="w-5 h-5" defaultChecked />
                    <span>View Statistics</span>
                  </label>
                </div>
              </div>

              {/* Shipments Permissions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <span className="text-2xl mr-2">📦</span> Shipments Management
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="shipments_view" className="w-5 h-5" defaultChecked />
                    <span>View Shipments</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="shipments_create" className="w-5 h-5" defaultChecked />
                    <span>Create Shipments</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="shipments_edit" className="w-5 h-5" defaultChecked />
                    <span>Edit Shipments</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="shipments_delete" className="w-5 h-5" />
                    <span>Delete Shipments</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="shipments_print" className="w-5 h-5" defaultChecked />
                    <span>Print Reports</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="shipments_release" className="w-5 h-5" defaultChecked />
                    <span>Release Shipments</span>
                  </label>
                </div>
              </div>

              {/* Racks Permissions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <span className="text-2xl mr-2">🏢</span> Racks Management
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="racks_view" className="w-5 h-5" defaultChecked />
                    <span>View Racks</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="racks_create" className="w-5 h-5" />
                    <span>Create Racks</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="racks_edit" className="w-5 h-5" />
                    <span>Edit Racks</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="racks_delete" className="w-5 h-5" />
                    <span>Delete Racks</span>
                  </label>
                </div>
              </div>

              {/* Scanner Permissions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <span className="text-2xl mr-2">📱</span> Scanner Access
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="scanner_scan" className="w-5 h-5" defaultChecked />
                    <span>Scan QR Codes</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="scanner_assign" className="w-5 h-5" defaultChecked />
                    <span>Assign to Racks</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="scanner_details" className="w-5 h-5" defaultChecked />
                    <span>View Shipment Details</span>
                  </label>
                </div>
              </div>

              {/* Reports Permissions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <span className="text-2xl mr-2">📊</span> Reports & Analytics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="reports_view" className="w-5 h-5" defaultChecked />
                    <span>View Reports</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="reports_export" className="w-5 h-5" />
                    <span>Export Data</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="reports_financial" className="w-5 h-5" />
                    <span>Financial Reports</span>
                  </label>
                </div>
              </div>

              {/* Settings Permissions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <span className="text-2xl mr-2">⚙️</span> Settings Access
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="settings_users" className="w-5 h-5" />
                    <span>Manage Users</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="settings_company" className="w-5 h-5" />
                    <span>Company Settings</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="settings_branding" className="w-5 h-5" />
                    <span>Branding Settings</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="settings_system" className="w-5 h-5" />
                    <span>System Configuration</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
            </form>
            <div className="flex items-center justify-end space-x-3 pt-4 border-t mt-6">
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                  setUserPermissions({});
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Collect all permission checkboxes
                    const form = document.querySelector('form[data-permissions-form]') as HTMLFormElement;
                    if (!form) return;

                    const permissions: any = {};
                    const checkboxes = form.querySelectorAll('input[type="checkbox"]');

                    checkboxes.forEach((checkbox: any) => {
                      const name = checkbox.getAttribute('name');
                      if (name) {
                        permissions[name] = checkbox.checked;
                      }
                    });

                    // Save to backend
                    await usersAPI.update(selectedUser!.id, { permissions });

                    alert('✅ Permissions saved successfully!');
                    setShowPermissionsModal(false);
                    setSelectedUser(null);
                    setUserPermissions({});
                    loadUsers();
                  } catch (error: any) {
                    alert(error.message || 'Failed to save permissions');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <ShieldCheckIcon className="h-5 w-5" />
                <span>Save Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

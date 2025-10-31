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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
                        onClick={() => setSelectedUser(user)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddModal(false)}
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
              const userData = {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                password: formData.get('password') as string,
                role: formData.get('role') as string,
              };

              try {
                const token = localStorage.getItem('authToken');
                const response = await fetch('/api/users', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(userData)
                });

                const data = await response.json();

                if (response.ok) {
                  alert('User created successfully!');
                  setShowAddModal(false);
                  loadUsers(); // Reload the user list
                  e.currentTarget.reset();
                } else {
                  alert(data.error || 'Failed to create user');
                }
              } catch (error: any) {
                alert(error.message || 'Failed to create user');
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
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
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <UserPlusIcon className="h-5 w-5" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

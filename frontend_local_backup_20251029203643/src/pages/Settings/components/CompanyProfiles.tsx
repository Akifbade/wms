import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { companiesAPI } from '../../../services/api';

interface CompanyProfile {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  contactPerson?: string;
  contactPhone?: string;
  contractStatus?: string;
  isActive: boolean;
  createdAt: string;
}

interface FormData {
  name: string;
  description: string;
  contactPerson: string;
  contactPhone: string;
  contractStatus: string;
  isActive: boolean;
}

const CONTRACT_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'INACTIVE', label: 'Inactive', color: 'gray' },
  { value: 'EXPIRED', label: 'Expired', color: 'red' },
  { value: 'PENDING', label: 'Pending', color: 'yellow' }
];

export const CompanyProfiles: React.FC = () => {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    contactPerson: '',
    contactPhone: '',
    contractStatus: 'ACTIVE',
    isActive: true
  });

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await companiesAPI.listProfiles();
      setProfiles(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to load company profiles' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Logo must be less than 2MB' });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (profile: CompanyProfile) => {
    setFormData({
      name: profile.name,
      description: profile.description || '',
      contactPerson: profile.contactPerson || '',
      contactPhone: profile.contactPhone || '',
      contractStatus: profile.contractStatus || 'ACTIVE',
      isActive: profile.isActive
    });
    setLogoPreview(profile.logo || null);
    setLogoFile(null);
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      contactPerson: '',
      contactPhone: '',
      contractStatus: 'ACTIVE',
      isActive: true
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Company name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('contactPerson', formData.contactPerson);
      data.append('contactPhone', formData.contactPhone);
      data.append('contractStatus', formData.contractStatus);
      data.append('isActive', String(formData.isActive));
      
      if (logoFile) {
        data.append('logo', logoFile);
      }

      if (editingId) {
        await companiesAPI.updateProfile(editingId, data);
        setMessage({ type: 'success', text: 'Company profile updated successfully' });
      } else {
        await companiesAPI.createProfile(data);
        setMessage({ type: 'success', text: 'Company profile created successfully' });
      }

      setTimeout(() => {
        handleCancel();
        loadProfiles();
        setMessage(null);
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save company profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    setIsSubmitting(true);
    try {
      await companiesAPI.deleteProfile(profileId);
      setMessage({ type: 'success', text: 'Company profile deleted successfully' });
      setConfirmDelete(null);
      setTimeout(() => {
        loadProfiles();
        setMessage(null);
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete company profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Profiles</h2>
          <p className="text-gray-600 mt-1">Create and manage company profiles (DIOR, JAZEERA, etc.)</p>
        </div>
        <button
          onClick={() => {
            handleCancel();
            setShowForm(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-6 w-6" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Company Profile' : 'Create New Company Profile'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Company Logo</label>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors shadow-lg">
                    <PhotoIcon className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-600">PNG, JPG, SVG up to 2MB</p>
                  {logoFile && (
                    <p className="text-sm text-green-600 mt-2">✓ {logoFile.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., DIOR, JAZEERA, COMPANY_MATERIAL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the company..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <UserIcon className="h-4 w-4" />
                  <span>Contact Person</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <PhoneIcon className="h-4 w-4" />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+965 1234 5678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contract Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contract Status</label>
              <select
                value={formData.contractStatus}
                onChange={(e) => setFormData({ ...formData, contractStatus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {CONTRACT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Active Status</p>
                <p className="text-sm text-gray-500">Enable this company profile for use</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isActive ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingId ? 'Update Profile' : 'Create Profile'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No company profiles yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first company profile to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const statusConfig = CONTRACT_STATUSES.find((s) => s.value === profile.contractStatus);
            const statusColor = statusConfig?.color || 'gray';

            return (
              <div
                key={profile.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                {/* Logo & Name */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    {profile.logo ? (
                      <img
                        src={profile.logo}
                        alt={profile.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{profile.name}</h3>
                      {profile.description && (
                        <p className="text-sm text-gray-500 truncate">{profile.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
                    ${statusColor === 'green' ? 'bg-green-100 text-green-800' : ''}
                    ${statusColor === 'red' ? 'bg-red-100 text-red-800' : ''}
                    ${statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${statusColor === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {statusConfig?.label}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 mb-4 text-sm">
                  {profile.contactPerson && (
                    <p className="text-gray-600">
                      <span className="font-medium">Contact:</span> {profile.contactPerson}
                    </p>
                  )}
                  {profile.contactPhone && (
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {profile.contactPhone}
                    </p>
                  )}
                </div>

                {/* Active Status */}
                <div className="mb-4 flex items-center space-x-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      profile.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className={profile.isActive ? 'text-green-700' : 'text-gray-700'}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions */}
                {confirmDelete === profile.id ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Delete this profile?</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(profile.id)}
                        disabled={isSubmitting}
                        className="flex-1 px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(profile.id)}
                      className="flex-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-1"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

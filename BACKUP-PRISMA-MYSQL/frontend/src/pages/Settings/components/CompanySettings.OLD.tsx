import React, { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon,
  CameraIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { companyAPI } from '../../../services/api';

interface CompanyData {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo: string | null;
  ratePerDay: number;
  currency: string;
  timezone: string;
  businessHours: {
    start: string;
    end: string;
  };
  description: string;
}

export const CompanySettings: React.FC = () => {
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo: null,
    ratePerDay: 2.5,
    currency: 'KWD',
    timezone: 'Asia/Kuwait',
    businessHours: {
      start: '08:00',
      end: '18:00'
    },
    description: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>('');

  // Load company data on mount
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const response = await companyAPI.getInfo();
        const company = response.company;
        
        setCompanyData({
          name: company.name || '',
          email: company.email || '',
          phone: company.phone || '',
          address: company.address || '',
          website: company.website || '',
          logo: company.logo || null,
          ratePerDay: 2.5, // These fields don't exist in Company model yet
          currency: 'KWD',
          timezone: 'Asia/Kuwait',
          businessHours: {
            start: '08:00',
            end: '18:00'
          },
          description: company.description || ''
        });
      } catch (err: any) {
        console.error('Failed to load company data:', err);
        setError('Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await companyAPI.updateInfo({
        name: companyData.name,
        email: companyData.email,
        phone: companyData.phone,
        website: companyData.website,
        address: companyData.address,
        description: companyData.description,
        logo: companyData.logo,
      });
      
      setSaved(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save company information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyData(prev => ({
          ...prev,
          logo: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Information</h2>
          <p className="text-gray-600">Manage your company details and branding</p>
        </div>
        
        {/* Save Button */}
        <div className="flex items-center space-x-3">
          {saved && (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </div>
          )}
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Company Logo Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
        
        <div className="flex items-center space-x-6">
          <div className="relative">
            {companyData.logo ? (
              <img
                src={companyData.logo}
                alt="Company Logo"
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            <label className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
              <CameraIcon className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Upload Company Logo</h4>
            <p className="text-sm text-gray-500 mt-1">
              Upload a square logo (recommended 200x200px)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports: JPG, PNG, SVG (max 2MB)
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter company name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={companyData.email}
                onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="company@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                value={companyData.phone}
                onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+965 XXXX XXXX"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <div className="relative">
              <GlobeAltIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="url"
                value={companyData.website}
                onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Address - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Address
            </label>
            <div className="relative">
              <MapPinIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <textarea
                value={companyData.address}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter complete address with block, area, and city"
              />
            </div>
          </div>

          {/* Description - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Description
            </label>
            <textarea
              value={companyData.description}
              onChange={(e) => setCompanyData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief description of your company and services"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Business Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Storage Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Rate per Day
            </label>
            <div className="relative">
              <CurrencyDollarIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="number"
                step="0.1"
                min="0"
                value={companyData.ratePerDay}
                onChange={(e) => setCompanyData(prev => ({ ...prev, ratePerDay: parseFloat(e.target.value) }))}
                className="w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-3.5 text-sm text-gray-500 font-medium">
                KWD
              </div>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={companyData.currency}
              onChange={(e) => setCompanyData(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="KWD">Kuwaiti Dinar (KWD)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="SAR">Saudi Riyal (SAR)</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={companyData.timezone}
              onChange={(e) => setCompanyData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Asia/Kuwait">Kuwait (GMT+3)</option>
              <option value="Asia/Riyadh">Saudi Arabia (GMT+3)</option>
              <option value="Asia/Dubai">UAE (GMT+4)</option>
              <option value="Asia/Qatar">Qatar (GMT+3)</option>
            </select>
          </div>

          {/* Business Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Time
            </label>
            <input
              type="time"
              value={companyData.businessHours.start}
              onChange={(e) => setCompanyData(prev => ({
                ...prev,
                businessHours: { ...prev.businessHours, start: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Closing Time
            </label>
            <input
              type="time"
              value={companyData.businessHours.end}
              onChange={(e) => setCompanyData(prev => ({
                ...prev,
                businessHours: { ...prev.businessHours, end: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
        <p className="text-red-700 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>
        
        <div className="flex space-x-4">
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Reset All Settings
          </button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Delete Company Account
          </button>
        </div>
      </div>
    </div>
  );
};

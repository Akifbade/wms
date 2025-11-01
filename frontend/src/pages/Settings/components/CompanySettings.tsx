import React, { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon,
  PhotoIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  MapPinIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { companyAPI } from '../../../services/api';

interface CompanyData {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  showCompanyName: boolean;
  logoSize: string;
}

const COLOR_PRESETS = [
  { name: 'Indigo Purple', primary: '#4F46E5', secondary: '#7C3AED', accent: '#10B981' },
  { name: 'Blue Cyan', primary: '#0EA5E9', secondary: '#06B6D4', accent: '#8B5CF6' },
  { name: 'Green', primary: '#10B981', secondary: '#059669', accent: '#F59E0B' },
  { name: 'Amber Red', primary: '#F59E0B', secondary: '#EF4444', accent: '#3B82F6' }
];

export const CompanySettings: React.FC = () => {
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo: null,
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    accentColor: '#10B981',
    showCompanyName: true,
    logoSize: 'medium'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
          primaryColor: company.primaryColor || '#4F46E5',
          secondaryColor: company.secondaryColor || '#7C3AED',
          accentColor: company.accentColor || '#10B981',
          showCompanyName: company.showCompanyName !== false,
          logoSize: company.logoSize || 'medium'
        });

        if (company.logo) {
          setLogoPreview(company.logo);
        }
      } catch (err: any) {
        console.error('Failed to load company data:', err);
        setMessage({ type: 'error', text: 'Failed to load company information' });
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Logo file size must be less than 2MB' });
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

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return data.logoUrl;
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
    }
    return null;
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      let logoUrl = companyData.logo;

      // Upload logo if changed
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Save ALL fields at once to prevent conflicts
      await companyAPI.updateInfo({
        name: companyData.name,
        email: companyData.email,
        phone: companyData.phone,
        website: companyData.website,
        address: companyData.address,
        logo: logoUrl,
        primaryColor: companyData.primaryColor,
        secondaryColor: companyData.secondaryColor,
        accentColor: companyData.accentColor,
        showCompanyName: companyData.showCompanyName,
        logoSize: companyData.logoSize
      });
      
      setMessage({ type: 'success', text: 'Company settings saved successfully!' });
      setLogoFile(null);
      
      // Reload after 1.5 seconds to show updated settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save company information' });
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setCompanyData(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent
    }));
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
          <h2 className="text-2xl font-bold text-gray-900">Company & Branding</h2>
          <p className="text-gray-600">Manage your company details, logo, and brand colors</p>
        </div>
        
        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-6 w-6" />
          ) : (
            <XCircleIcon className="h-6 w-6" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Company Logo Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <PhotoIcon className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="relative">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Company Logo"
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
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
            <h4 className="font-medium text-gray-900">Upload Company Logo</h4>
            <p className="text-sm text-gray-500 mt-1">
              PNG, JPG, SVG up to 2MB. Recommended: 200x200px
            </p>
            {logoFile && (
              <p className="text-sm text-green-600 mt-2">✓ New logo selected: {logoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Demo Warehouse Co."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <EnvelopeIcon className="h-4 w-4" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={companyData.email}
              onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="contact@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <PhoneIcon className="h-4 w-4" />
              <span>Phone Number</span>
            </label>
            <input
              type="tel"
              value={companyData.phone}
              onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+965 1234 5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <GlobeAltIcon className="h-4 w-4" />
              <span>Website</span>
            </label>
            <input
              type="url"
              value={companyData.website}
              onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://company.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <MapPinIcon className="h-4 w-4" />
              <span>Address</span>
            </label>
            <textarea
              value={companyData.address}
              onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Kuwait City, Kuwait"
            />
          </div>
        </div>
      </div>

      {/* Branding Colors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <PaintBrushIcon className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Brand Colors</h3>
        </div>

        {/* Color Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Quick Presets</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }} />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }} />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.accent }} />
                </div>
                <p className="text-sm font-medium text-gray-700">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={companyData.primaryColor}
                onChange={(e) => setCompanyData({ ...companyData, primaryColor: e.target.value })}
                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={companyData.primaryColor}
                onChange={(e) => setCompanyData({ ...companyData, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="#4F46E5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={companyData.secondaryColor}
                onChange={(e) => setCompanyData({ ...companyData, secondaryColor: e.target.value })}
                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={companyData.secondaryColor}
                onChange={(e) => setCompanyData({ ...companyData, secondaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="#7C3AED"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={companyData.accentColor}
                onChange={(e) => setCompanyData({ ...companyData, accentColor: e.target.value })}
                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={companyData.accentColor}
                onChange={(e) => setCompanyData({ ...companyData, accentColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="#10B981"
              />
            </div>
          </div>
        </div>

        {/* Show Company Name Toggle */}
        <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Show Company Name on Login</p>
            <p className="text-sm text-gray-500">Display company name below logo on login page</p>
          </div>
          <button
            onClick={() => setCompanyData({ ...companyData, showCompanyName: !companyData.showCompanyName })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              companyData.showCompanyName ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                companyData.showCompanyName ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Logo Size Selector */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Size on Login Page
          </label>
          <select
            value={companyData.logoSize}
            onChange={(e) => setCompanyData({ ...companyData, logoSize: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="small">Small (48px)</option>
            <option value="medium">Medium (80px)</option>
            <option value="large">Large (128px)</option>
          </select>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Page Preview</h3>
        <div 
          className="relative h-64 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${companyData.primaryColor}15 0%, ${companyData.secondaryColor}15 100%)`
          }}
        >
          <div className="text-center">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-16 w-16 mx-auto mb-4 rounded-lg object-cover" />
            ) : (
              <div 
                className="h-16 w-16 mx-auto mb-4 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${companyData.primaryColor} 0%, ${companyData.secondaryColor} 100%)`
                }}
              >
                <BuildingOfficeIcon className="h-8 w-8 text-white" />
              </div>
            )}
            {companyData.showCompanyName && (
              <p className="text-2xl font-bold text-gray-900">{companyData.name || 'Company Name'}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Sign in to access your account</p>
          </div>
        </div>
      </div>
    </div>
  );
};

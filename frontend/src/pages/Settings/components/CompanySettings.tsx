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
  loginVideoUrl?: string;
  loginVideoEnabled?: boolean;
  loginGlassEffect?: boolean;
  loginBackgroundType?: string;
  loginBackgroundImage?: string;
  loginShowFeatures?: boolean;
  loginEnableCursor?: boolean;
  loginEnable3D?: boolean;
  loginBlurStrength?: string;
  loginThemeMode?: string;
  loginHeroTitle?: string;
  loginHeroSubtitle?: string;
  loginGalleryCsv?: string; // comma-separated image URLs for landing page gallery
  loginServices?: Array<{ title: string; desc: string; iconKey?: string }>;
  loginFeatures?: Array<{ title: string; desc: string; iconKey?: string }>;
  loginPartners?: Array<{ name?: string; logoUrl: string; link?: string }>;
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
    logoSize: 'medium',
    loginVideoUrl: 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4',
    loginVideoEnabled: true,
    loginGlassEffect: true,
    loginBackgroundType: 'video',
    loginBackgroundImage: '',
    loginShowFeatures: true,
    loginEnableCursor: true,
    loginEnable3D: true,
    loginBlurStrength: 'medium',
    loginThemeMode: 'system',
    loginHeroTitle: 'Efficient & Reliable Shipping And Logistics Company',
    loginHeroSubtitle: 'Seamless and dependable logistics solutions designed to keep your business moving forward.',
    loginGalleryCsv: '',
    loginServices: [
      { title: 'Warehouse Storage & Rental', desc: 'Secure climate-controlled storage with 24/7 security and flexible rental terms', iconKey: 'BuildingOffice2Icon' },
      { title: 'Customs Clearance', desc: 'Expert customs brokerage ensuring fast clearance at all Kuwait ports', iconKey: 'ShieldCheckIcon' },
      { title: 'Import & Export Services', desc: 'Complete air & sea freight solutions with door-to-door delivery worldwide', iconKey: 'GlobeAltIcon' },
      { title: 'Local & International Moving', desc: 'Professional moving services for homes and offices with packing & insurance', iconKey: 'TruckIcon' }
    ],
    loginFeatures: [
      { title: 'Photo Documentation', desc: 'Upload & view high-quality photos of your shipments in real-time', iconKey: 'CameraIcon' },
      { title: 'Smart Release Management', desc: 'Request and approve releases digitally with instant notifications', iconKey: 'DocumentTextIcon' },
      { title: 'Complete Visibility', desc: 'Monitor every step with detailed status updates and reporting', iconKey: 'CheckCircleIcon' },
      { title: 'Multi-Company Portal', desc: 'Manage multiple business profiles from one secure dashboard', iconKey: 'BuildingOffice2Icon' }
    ],
    loginPartners: [],
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
          logoSize: company.logoSize || 'medium',
          loginVideoUrl: company.loginVideoUrl || 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4',
          loginVideoEnabled: company.loginVideoEnabled !== false,
          loginGlassEffect: company.loginGlassEffect !== false,
          loginBackgroundType: company.loginBackgroundType || 'video',
          loginBackgroundImage: company.loginBackgroundImage || '',
          loginShowFeatures: company.loginShowFeatures !== false,
          loginEnableCursor: (company as any).loginEnableCursor !== false,
          loginEnable3D: (company as any).loginEnable3D !== false,
          loginBlurStrength: (company as any).loginBlurStrength || 'medium',
          loginThemeMode: (company as any).loginThemeMode || 'system',
          loginHeroTitle: (company as any).loginHeroTitle || 'Efficient & Reliable Shipping And Logistics Company',
          loginHeroSubtitle: (company as any).loginHeroSubtitle || 'Seamless and dependable logistics solutions designed to keep your business moving forward.',
          loginGalleryCsv: (company as any).loginGalleryCsv || '',
          loginServices: (company as any).loginServices || undefined,
          loginFeatures: (company as any).loginFeatures || undefined,
          loginPartners: (company as any).loginPartners || [],
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
        logoSize: companyData.logoSize,
        loginVideoUrl: companyData.loginVideoUrl,
        loginVideoEnabled: companyData.loginVideoEnabled,
        loginGlassEffect: companyData.loginGlassEffect,
        loginBackgroundType: companyData.loginBackgroundType,
        loginBackgroundImage: companyData.loginBackgroundImage,
        loginShowFeatures: companyData.loginShowFeatures,
        loginEnableCursor: companyData.loginEnableCursor,
        loginEnable3D: companyData.loginEnable3D,
        loginBlurStrength: companyData.loginBlurStrength,
        loginThemeMode: companyData.loginThemeMode,
        loginHeroTitle: companyData.loginHeroTitle,
        loginHeroSubtitle: companyData.loginHeroSubtitle,
        loginGalleryCsv: companyData.loginGalleryCsv,
        loginServices: companyData.loginServices,
        loginFeatures: companyData.loginFeatures,
        loginPartners: companyData.loginPartners,
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
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <BuildingOfficeIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Company & Branding</h2>
              <p className="mt-1 text-blue-100">Configure your brand identity for the landing page</p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-white text-blue-600 px-8 py-3 rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 font-semibold flex items-center space-x-2 shadow-lg"
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
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Live Preview */}
        {logoPreview && (
          <div className="mt-6 flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 rounded-lg object-cover bg-white p-2" />
            <div>
              <p className="font-semibold text-white text-lg">{companyData.name || 'Company Name'}</p>
              <p className="text-sm text-blue-100">{companyData.email || 'Email not set'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 shadow-md border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <PhotoIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Company Logo</h3>
            <p className="text-sm text-gray-500">Upload your brand logo for the landing page</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Company Logo"
                className="w-32 h-32 rounded-xl object-cover border-2 border-blue-200 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
              </div>
            )}

            <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-3 rounded-full cursor-pointer hover:bg-blue-700 transition-all shadow-xl hover:scale-110">
              <PhotoIcon className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 text-lg">Upload Your Logo</h4>
            <p className="text-sm text-gray-600 mt-1">
              PNG, JPG, SVG up to 2MB. Recommended: 200x200px
            </p>
            {logoFile && (
              <p className="text-sm text-green-600 mt-2 font-medium">✓ New logo selected: {logoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Basic Information</h3>
            <p className="text-sm text-gray-500">Company contact details and information</p>
          </div>
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <PaintBrushIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Brand Colors</h3>
            <p className="text-sm text-gray-500">Customize your landing page color scheme</p>
          </div>
        </div>

        {/* Color Presets */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-4">🎨 Quick Color Presets</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: preset.primary }} />
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: preset.secondary }} />
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: preset.accent }} />
                </div>
                <p className="text-sm font-semibold text-gray-800">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Primary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={companyData.primaryColor}
                onChange={(e) => setCompanyData({ ...companyData, primaryColor: e.target.value })}
                className="h-12 w-20 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm"
              />
              <input
                type="text"
                value={companyData.primaryColor}
                onChange={(e) => setCompanyData({ ...companyData, primaryColor: e.target.value })}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="#4F46E5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Secondary Color</label>
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


      </div>

      {/* Login Page Customization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PaintBrushIcon className="h-5 w-5 mr-2" />
          Login Page Customization
        </h3>

        {/* Toggles */}
        <div className="space-y-3">
          {/* Show Company Name Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Show Company Name</p>
              <p className="text-sm text-gray-500">Display company name below logo</p>
            </div>
            <button
              onClick={() => setCompanyData({ ...companyData, showCompanyName: !companyData.showCompanyName })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${companyData.showCompanyName ? 'bg-primary-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${companyData.showCompanyName ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {/* Gemini Cursor Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Enable Gemini Cursor</p>
              <p className="text-sm text-gray-500">Show the advanced AI cursor effect</p>
            </div>
            <button
              onClick={() => setCompanyData({ ...companyData, loginEnableCursor: !companyData.loginEnableCursor })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${companyData.loginEnableCursor ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${companyData.loginEnableCursor ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* 3D Effects Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Enable 3D Effects</p>
              <p className="text-sm text-gray-500">Show floating 3D elements and animations</p>
            </div>
            <button
              onClick={() => setCompanyData({ ...companyData, loginEnable3D: !companyData.loginEnable3D })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${companyData.loginEnable3D ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${companyData.loginEnable3D ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Logo Size Selector */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo Size
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

          {/* Blur Strength Selector */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Glass Blur Strength
            </label>
            <select
              value={companyData.loginBlurStrength || 'medium'}
              onChange={(e) => setCompanyData({ ...companyData, loginBlurStrength: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Theme Mode Selector */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Login Theme Mode
            </label>
            <select
              value={companyData.loginThemeMode || 'system'}
              onChange={(e) => setCompanyData({ ...companyData, loginThemeMode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="system">System Default</option>
            </select>
          </div>
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

import React, { useState, useEffect } from 'react';
import {
  PhotoIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface BrandingSettings {
  companyName: string;
  logo?: string;
  logoUrl?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  loginBackground?: string;
  showCompanyName: boolean;
}

export const BrandingSettings: React.FC = () => {
  const [settings, setSettings] = useState<BrandingSettings>({
    companyName: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    accentColor: '#10B981',
    showCompanyName: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.company) {
          const logoPath = data.company.logoPath ?? data.company.logo;
          const logoUrl = data.company.logoUrl ?? (logoPath ? logoPath : undefined);
          setSettings({
            companyName: data.company.name || '',
            logo: logoPath,
            logoUrl,
            primaryColor: data.company.primaryColor || '#4F46E5',
            secondaryColor: data.company.secondaryColor || '#7C3AED',
            accentColor: data.company.accentColor || '#10B981',
            showCompanyName: data.company.showCompanyName !== false
          });
          setLogoPreview(logoUrl || null);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const uploadLogo = async (): Promise<{ path: string; url: string } | null> => {
    if (!logoFile) return null;

    try {
      const formData = new FormData();
      formData.append('logo', logoFile); // Changed from 'file' to 'logo'

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/upload/logo', { // Changed from '/api/upload' to '/api/upload/logo'
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return {
          path: data.logoUrl,
          url: data.fullUrl || data.logoUrl
        };
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      let logoPath = settings.logo;
      let previewUrl = settings.logoUrl || logoPreview;

      // Upload logo if changed
      if (logoFile) {
        const uploaded = await uploadLogo();
        if (uploaded) {
          logoPath = uploaded.path;
          previewUrl = uploaded.url;
        }
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: settings.companyName,
          logo: logoPath,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          accentColor: settings.accentColor,
          showCompanyName: settings.showCompanyName
        })
      });

      if (response.ok) {
        const data = await response.json();
        const company = data.company;
        const updatedLogoPath = company?.logoPath ?? company?.logo ?? logoPath;
        const updatedLogoUrl = company?.logoUrl ?? previewUrl ?? null;

        setSettings(prev => ({
          ...prev,
          companyName: company?.name ?? prev.companyName,
          logo: updatedLogoPath || undefined,
          logoUrl: updatedLogoUrl || undefined,
          primaryColor: company?.primaryColor ?? prev.primaryColor,
          secondaryColor: company?.secondaryColor ?? prev.secondaryColor,
          accentColor: company?.accentColor ?? prev.accentColor,
          showCompanyName: company?.showCompanyName ?? prev.showCompanyName
        }));
        setLogoPreview(updatedLogoUrl || null);

        setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
        setLogoFile(null);
        await loadSettings();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Branding & Appearance</h2>
          <p className="text-gray-600">Customize your company's branding, logo, and colors</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          {saving ? (
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
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Logo & Company Name */}
        <div className="space-y-6">
          {/* Company Name */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Company Name</h3>
            </div>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter company name"
            />
            <div className="mt-3 flex items-center">
              <input
                type="checkbox"
                id="showCompanyName"
                checked={settings.showCompanyName}
                onChange={(e) => setSettings({ ...settings, showCompanyName: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="showCompanyName" className="ml-2 text-sm text-gray-700">
                Show company name on login page
              </label>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <PhotoIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
            </div>

            {/* Logo Preview */}
            {logoPreview && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-600 mb-2">Current Logo:</p>
                <img 
                  src={logoPreview} 
                  alt="Logo Preview" 
                  className="h-24 w-auto object-contain mx-auto"
                />
              </div>
            )}

            {/* Upload Input */}
            <div>
              <label className="block">
                <span className="sr-only">Choose logo file</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                PNG, JPG or SVG. Max 2MB. Recommended size: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Colors */}
        <div className="space-y-6">
          {/* Color Theme */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <PaintBrushIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Color Theme</h3>
            </div>

            <div className="space-y-4">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="#4F46E5"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for buttons, links, and main UI elements</p>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="#7C3AED"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for gradients and secondary elements</p>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="#10B981"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for success states and highlights</p>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <GlobeAltIcon className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
            </div>

            <div 
              className="p-6 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${settings.primaryColor}15 0%, ${settings.secondaryColor}15 100%)`
              }}
            >
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-16 w-auto mx-auto mb-4" />
              )}
              {settings.showCompanyName && (
                <h4 className="text-xl font-bold text-center text-gray-900 mb-4">
                  {settings.companyName || 'Your Company Name'}
                </h4>
              )}
              <button
                className="w-full py-2 px-4 rounded-lg text-white font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`
                }}
              >
                Preview Button
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Color Presets */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setSettings({ ...settings, primaryColor: '#4F46E5', secondaryColor: '#7C3AED' })}
            className="p-3 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors"
          >
            <div className="flex space-x-2 mb-2">
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#4F46E5' }}></div>
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#7C3AED' }}></div>
            </div>
            <p className="text-xs font-medium text-center">Indigo Purple</p>
          </button>

          <button
            onClick={() => setSettings({ ...settings, primaryColor: '#3B82F6', secondaryColor: '#06B6D4' })}
            className="p-3 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors"
          >
            <div className="flex space-x-2 mb-2">
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#06B6D4' }}></div>
            </div>
            <p className="text-xs font-medium text-center">Blue Cyan</p>
          </button>

          <button
            onClick={() => setSettings({ ...settings, primaryColor: '#10B981', secondaryColor: '#059669' })}
            className="p-3 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors"
          >
            <div className="flex space-x-2 mb-2">
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#10B981' }}></div>
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#059669' }}></div>
            </div>
            <p className="text-xs font-medium text-center">Green</p>
          </button>

          <button
            onClick={() => setSettings({ ...settings, primaryColor: '#F59E0B', secondaryColor: '#EF4444' })}
            className="p-3 rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors"
          >
            <div className="flex space-x-2 mb-2">
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#F59E0B' }}></div>
              <div className="h-8 w-full rounded" style={{ backgroundColor: '#EF4444' }}></div>
            </div>
            <p className="text-xs font-medium text-center">Amber Red</p>
          </button>
        </div>
      </div>
    </div>
  );
};

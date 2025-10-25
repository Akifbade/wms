import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PaintBrushIcon,
  Cog6ToothIcon,
  PhotoIcon,
  EyeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export const TemplateSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/template-settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setSettings(data.settings || getDefaultSettings());
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = () => ({
    companyName: 'QGO Cargo',
    companyAddress: 'Kuwait',
    companyPhone: '+965 XXXX XXXX',
    companyEmail: 'info@qgocargo.com',
    companyWebsite: 'www.qgocargo.com',
    invoiceTitle: 'TAX INVOICE',
    releaseNoteTitle: 'SHIPMENT RELEASE NOTE',
    invoicePrimaryColor: '#2563eb',
    releasePrimaryColor: '#1e40af',
    currencySymbol: 'KD',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/template-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(settings)
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.success && data.fullUrl) {
        updateSetting('companyLogo', data.fullUrl);
        setLogoFile(null);
        alert('Logo uploaded successfully!');
      } else {
        alert('Failed to upload logo: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const tabs = [
    { id: 'company', name: 'Company Info', icon: Cog6ToothIcon },
    { id: 'invoice', name: 'Invoice Template', icon: DocumentTextIcon },
    { id: 'release', name: 'Release Note', icon: DocumentTextIcon },
    { id: 'colors', name: 'Colors & Styling', icon: PaintBrushIcon },
    { id: 'advanced', name: 'Advanced', icon: Cog6ToothIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Template Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Customize invoice and release note templates
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Company Information</h2>
            
            {/* Company Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              
              {/* Logo Preview */}
              {settings.companyLogo && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img 
                    src={settings.companyLogo} 
                    alt="Logo" 
                    className="h-20 w-auto"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/150x60?text=Invalid+Image';
                    }}
                  />
                </div>
              )}
              
              {/* File Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={handleLogoUpload}
                    disabled={!logoFile || uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {uploading ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <PhotoIcon className="h-5 w-5 inline mr-2" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
                
                {/* Separator */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                
                {/* URL Input */}
                <input
                  type="url"
                  value={settings.companyLogo || ''}
                  onChange={(e) => updateSetting('companyLogo', e.target.value)}
                  placeholder="Paste logo URL (e.g., https://example.com/logo.png)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                
                <p className="text-xs text-gray-500">
                  Accepted formats: JPG, PNG, GIF, SVG, WebP • Max size: 5MB
                </p>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => updateSetting('companyName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={settings.companyAddress || ''}
                onChange={(e) => updateSetting('companyAddress', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.companyPhone || ''}
                  onChange={(e) => updateSetting('companyPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.companyEmail || ''}
                  onChange={(e) => updateSetting('companyEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="text"
                  value={settings.companyWebsite || ''}
                  onChange={(e) => updateSetting('companyWebsite', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* License */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License/Registration No.
                </label>
                <input
                  type="text"
                  value={settings.companyLicense || ''}
                  onChange={(e) => updateSetting('companyLicense', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Invoice Template Tab */}
        {activeTab === 'invoice' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invoice Template</h2>

            {/* Invoice Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Title
              </label>
              <input
                type="text"
                value={settings.invoiceTitle || 'TAX INVOICE'}
                onChange={(e) => updateSetting('invoiceTitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Template Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Style
              </label>
              <select
                value={settings.invoiceTemplateType || 'STANDARD'}
                onChange={(e) => updateSetting('invoiceTemplateType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="STANDARD">Standard</option>
                <option value="MODERN">Modern</option>
                <option value="MINIMAL">Minimal</option>
                <option value="CLASSIC">Classic</option>
              </select>
            </div>

            {/* Show/Hide Elements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Display Elements
              </label>
              <div className="space-y-2">
                {[
                  { key: 'invoiceShowLogo', label: 'Show Company Logo' },
                  { key: 'invoiceShowAddress', label: 'Show Address' },
                  { key: 'invoiceShowPhone', label: 'Show Phone' },
                  { key: 'invoiceShowEmail', label: 'Show Email' },
                  { key: 'invoiceShowWebsite', label: 'Show Website' },
                  { key: 'invoiceShowLicense', label: 'Show License Number' },
                  { key: 'invoiceShowFooter', label: 'Show Footer' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings[item.key] !== false}
                      onChange={(e) => updateSetting(item.key, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Terms & Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Terms & Conditions
              </label>
              <textarea
                value={settings.invoiceTerms || ''}
                onChange={(e) => updateSetting('invoiceTerms', e.target.value)}
                rows={6}
                placeholder="Enter default terms and conditions for invoices..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer Text
              </label>
              <input
                type="text"
                value={settings.invoiceFooterText || ''}
                onChange={(e) => updateSetting('invoiceFooterText', e.target.value)}
                placeholder="Thank you for your business!"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Release Note Tab */}
        {activeTab === 'release' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Release Note Template</h2>

            {/* Release Note Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Release Note Title
              </label>
              <input
                type="text"
                value={settings.releaseNoteTitle || 'SHIPMENT RELEASE NOTE'}
                onChange={(e) => updateSetting('releaseNoteTitle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Template Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Style
              </label>
              <select
                value={settings.releaseNoteTemplate || 'PROFESSIONAL'}
                onChange={(e) => updateSetting('releaseNoteTemplate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="PROFESSIONAL">Professional</option>
                <option value="COMPACT">Compact</option>
                <option value="DETAILED">Detailed</option>
              </select>
            </div>

            {/* Show/Hide Sections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Display Sections
              </label>
              <div className="space-y-2">
                {[
                  { key: 'releaseNoteShowLogo', label: 'Show Company Logo' },
                  { key: 'releaseShowShipment', label: 'Show Shipment Details' },
                  { key: 'releaseShowStorage', label: 'Show Storage Information' },
                  { key: 'releaseShowItems', label: 'Show Items Released' },
                  { key: 'releaseShowCollector', label: 'Show Collector Information' },
                  { key: 'releaseShowCharges', label: 'Show Charges & Payment' },
                  { key: 'releaseShowPhotos', label: 'Show Release Photos' },
                  { key: 'releaseShowTerms', label: 'Show Terms & Conditions' },
                  { key: 'releaseShowSignatures', label: 'Show Signature Spaces' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings[item.key] !== false}
                      onChange={(e) => updateSetting(item.key, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Release Note Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={settings.releaseTerms || ''}
                onChange={(e) => updateSetting('releaseTerms', e.target.value)}
                rows={6}
                placeholder="Enter terms and conditions for release notes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer Text
              </label>
              <input
                type="text"
                value={settings.releaseFooterText || ''}
                onChange={(e) => updateSetting('releaseFooterText', e.target.value)}
                placeholder="Thank you for choosing our services!"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Colors & Styling Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Colors & Styling</h2>

            {/* Invoice Colors */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Invoice Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.invoicePrimaryColor || '#2563eb'}
                      onChange={(e) => updateSetting('invoicePrimaryColor', e.target.value)}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={settings.invoicePrimaryColor || '#2563eb'}
                      onChange={(e) => updateSetting('invoicePrimaryColor', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Background
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.invoiceHeaderBg || '#2563eb'}
                      onChange={(e) => updateSetting('invoiceHeaderBg', e.target.value)}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={settings.invoiceHeaderBg || '#2563eb'}
                      onChange={(e) => updateSetting('invoiceHeaderBg', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Release Note Colors */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Release Note Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.releasePrimaryColor || '#1e40af'}
                      onChange={(e) => updateSetting('releasePrimaryColor', e.target.value)}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={settings.releasePrimaryColor || '#1e40af'}
                      onChange={(e) => updateSetting('releasePrimaryColor', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Background
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.releaseNoteHeaderBg || '#1e40af'}
                      onChange={(e) => updateSetting('releaseNoteHeaderBg', e.target.value)}
                      className="h-10 w-20"
                    />
                    <input
                      type="text"
                      value={settings.releaseNoteHeaderBg || '#1e40af'}
                      onChange={(e) => updateSetting('releaseNoteHeaderBg', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Font Size
              </label>
              <select
                value={settings.invoiceFontSize || 'MEDIUM'}
                onChange={(e) => updateSetting('invoiceFontSize', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="SMALL">Small</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
              </select>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Advanced Settings</h2>

            {/* Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currencySymbol || 'KD'}
                  onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Position
                </label>
                <select
                  value={settings.currencyPosition || 'AFTER'}
                  onChange={(e) => updateSetting('currencyPosition', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="BEFORE">Before ($ 100)</option>
                  <option value="AFTER">After (100 KD)</option>
                </select>
              </div>
            </div>

            {/* Date Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={settings.dateFormat || 'MMM dd, yyyy'}
                  onChange={(e) => updateSetting('dateFormat', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="MMM dd, yyyy">Oct 13, 2025</option>
                  <option value="dd/MM/yyyy">13/10/2025</option>
                  <option value="yyyy-MM-dd">2025-10-13</option>
                  <option value="dd MMMM yyyy">13 October 2025</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Format
                </label>
                <select
                  value={settings.timeFormat || 'hh:mm a'}
                  onChange={(e) => updateSetting('timeFormat', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="hh:mm a">03:30 PM</option>
                  <option value="HH:mm">15:30</option>
                </select>
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper Size
              </label>
              <select
                value={settings.invoicePaperSize || 'A4'}
                onChange={(e) => updateSetting('invoicePaperSize', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="LETTER">Letter (8.5 × 11 in)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
              </select>
            </div>

            {/* Print Margins */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Print Margins (mm)
              </label>
              <div className="grid grid-cols-4 gap-4">
                {['Top', 'Bottom', 'Left', 'Right'].map((side) => (
                  <div key={side}>
                    <label className="block text-xs text-gray-600 mb-1">{side}</label>
                    <input
                      type="number"
                      value={settings[`printMargin${side}`] || 10}
                      onChange={(e) => updateSetting(`printMargin${side}`, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Signature Settings
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.requireStaffSignature !== false}
                    onChange={(e) => updateSetting('requireStaffSignature', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require Staff Signature</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.requireClientSignature !== false}
                    onChange={(e) => updateSetting('requireClientSignature', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require Client Signature</span>
                </label>
              </div>
            </div>

            {/* QR Code */}
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={settings.showQRCode === true}
                  onChange={(e) => updateSetting('showQRCode', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Show QR Code on Documents</span>
              </label>
              {settings.showQRCode && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Position</label>
                    <select
                      value={settings.qrCodePosition || 'TOP_RIGHT'}
                      onChange={(e) => updateSetting('qrCodePosition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="TOP_RIGHT">Top Right</option>
                      <option value="TOP_LEFT">Top Left</option>
                      <option value="BOTTOM_RIGHT">Bottom Right</option>
                      <option value="BOTTOM_LEFT">Bottom Left</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Size (px)</label>
                    <input
                      type="number"
                      value={settings.qrCodeSize || 100}
                      onChange={(e) => updateSetting('qrCodeSize', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t">
          <button
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <EyeIcon className="h-5 w-5" />
            Preview Templates
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

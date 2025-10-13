import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { invoiceSettingsAPI } from '../../../services/api';

export const InvoiceSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    templateType: 'MODERN',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    showLogo: true,
    showCompanyAddress: true,
    showClientDetails: true,
    footerText: 'Thank you for your business!',
    termsConditions: '',
    invoicePrefix: 'INV',
    invoiceStartNumber: 1001
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await invoiceSettingsAPI.get();
      const s = response.settings;
      setSettings({
        templateType: 'MODERN',
        primaryColor: s.primaryColor || '#2563eb',
        secondaryColor: s.accentColor || '#64748b',
        showLogo: s.showLogo !== undefined ? s.showLogo : true,
        showCompanyAddress: true,
        showClientDetails: true,
        footerText: s.footerText || 'Thank you for your business!',
        termsConditions: s.terms || '',
        invoicePrefix: s.prefix || 'INV',
        invoiceStartNumber: s.nextNumber || 1001
      });
    } catch (error) {
      console.error('Failed to load invoice settings:', error);
      setMessage({ type: 'error', text: 'Failed to load invoice settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      await invoiceSettingsAPI.update({
        prefix: settings.invoicePrefix,
        nextNumber: settings.invoiceStartNumber,
        primaryColor: settings.primaryColor,
        accentColor: settings.secondaryColor,
        showLogo: settings.showLogo,
        footerText: settings.footerText,
        terms: settings.termsConditions,
      });
      
      setMessage({ type: 'success', text: 'Invoice settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save invoice settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice settings...</p>
        </div>
      </div>
    );
  }

  const templates = [
    { id: 'MODERN', name: 'Modern', preview: '📄' },
    { id: 'CLASSIC', name: 'Classic', preview: '📋' },
    { id: 'MINIMAL', name: 'Minimal', preview: '📝' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice & Templates</h2>
          <p className="text-gray-600">Customize invoice appearance and branding</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {message && (
            <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Template Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Template</h3>
        <div className="grid grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSettings(prev => ({ ...prev, templateType: template.id }))}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                settings.templateType === template.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="text-4xl text-center mb-2">{template.preview}</div>
              <div className="text-center font-medium">{template.name}</div>
              {settings.templateType === template.id && (
                <div className="text-center mt-2">
                  <CheckCircleIcon className="h-5 w-5 text-primary-600 mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Settings</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
            <input
              type="text"
              value={settings.invoicePrefix}
              onChange={(e) => setSettings(prev => ({ ...prev, invoicePrefix: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Starting Number</label>
            <input
              type="number"
              value={settings.invoiceStartNumber}
              onChange={(e) => setSettings(prev => ({ ...prev, invoiceStartNumber: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {[
            { key: 'showLogo', label: 'Show Company Logo' },
            { key: 'showCompanyAddress', label: 'Show Company Address' },
            { key: 'showClientDetails', label: 'Show Client Details' }
          ].map((item) => (
            <label key={item.key} className="flex items-center">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings] as boolean}
                onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                className="h-4 w-4 text-primary-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Footer & Terms */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Footer & Terms</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
            <input
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings(prev => ({ ...prev, footerText: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
            <textarea
              value={settings.termsConditions}
              onChange={(e) => setSettings(prev => ({ ...prev, termsConditions: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter your terms and conditions..."
            />
          </div>
        </div>
      </div>

      <button className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
        Save Invoice Settings
      </button>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  BanknotesIcon,
  PaintBrushIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { billingAPI } from '../../../services/api';

interface ChargeType {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: 'STORAGE' | 'RELEASE' | 'SERVICE' | 'OTHER';
  calculationType: 'PER_BOX' | 'FLAT' | 'PERCENTAGE' | 'PER_DAY' | 'PER_KG' | 'PER_HOUR' | 'PER_CUBIC_M' | 'PER_SHIPMENT';
  rate: number;
  minCharge?: number;
  maxCharge?: number;
  applyOnRelease: boolean;
  applyOnStorage: boolean;
  isTaxable: boolean;
  isActive: boolean;
}

interface BillingSettings {
  storageRateType: 'PER_BOX' | 'PER_CUBIC_M';
  storageRatePerBox?: number;
  storageRatePerWeek?: number;
  storageRatePerMonth?: number;
  minimumStorageCharge?: number;
  taxRate?: number;
  gracePeriodDays?: number;
  currency: string;
  invoicePrefix: string;
  invoiceDueDays?: number;
  logoUrl?: string;
  logoPosition: 'LEFT' | 'CENTER' | 'RIGHT';
  primaryColor?: string;
  secondaryColor?: string;
  showCompanyStamp: boolean;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  branchName?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  footerText?: string;
  taxRegistrationNo?: string;
  companyRegistrationNo?: string;
}

type TabId = 'general' | 'invoice' | 'bank' | 'terms' | 'charges';

export const BillingSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadChargeTypes();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await billingAPI.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load billing settings:', error);
      setMessage({ type: 'error', text: 'Failed to load billing settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadChargeTypes = async () => {
    try {
      const data = await billingAPI.getChargeTypes();
      setChargeTypes(data);
    } catch (error) {
      console.error('Failed to load charge types:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    // Validation
    if (!settings.currency || settings.currency.trim() === '') {
      setMessage({ type: 'error', text: 'Currency is required' });
      return;
    }
    
    if (!settings.invoicePrefix || settings.invoicePrefix.trim() === '') {
      setMessage({ type: 'error', text: 'Invoice prefix is required' });
      return;
    }
    
    if (settings.taxRate !== undefined && (settings.taxRate < 0 || settings.taxRate > 100)) {
      setMessage({ type: 'error', text: 'Tax rate must be between 0 and 100' });
      return;
    }
    
    if (settings.invoiceDueDays !== undefined && settings.invoiceDueDays < 0) {
      setMessage({ type: 'error', text: 'Invoice due days must be positive' });
      return;
    }
    
    if (settings.gracePeriodDays !== undefined && settings.gracePeriodDays < 0) {
      setMessage({ type: 'error', text: 'Grace period days must be positive' });
      return;
    }
    
    // Validate IBAN format if provided (basic validation)
    if (settings.iban && settings.iban.trim() !== '') {
      const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
      if (!ibanPattern.test(settings.iban.replace(/\s/g, ''))) {
        setMessage({ type: 'error', text: 'Invalid IBAN format' });
        return;
      }
    }
    
    setSaving(true);
    try {
      await billingAPI.updateSettings(settings);
      setMessage({ type: 'success', text: 'Billing settings updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save billing settings' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general' as TabId, name: 'General Settings', icon: CurrencyDollarIcon },
    { id: 'invoice' as TabId, name: 'Invoice Design', icon: PaintBrushIcon },
    { id: 'bank' as TabId, name: 'Bank Details', icon: BanknotesIcon },
    { id: 'terms' as TabId, name: 'Terms & Conditions', icon: DocumentTextIcon },
    { id: 'charges' as TabId, name: 'Charge Types', icon: CurrencyDollarIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load billing settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Billing Settings</h2>
        <p className="text-gray-600">Configure storage charges, invoice customization, and payment details</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General Billing Settings</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="KWD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="INV"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.taxRate || ''}
                  onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="5.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Due Days</label>
                <input
                  type="number"
                  value={settings.invoiceDueDays || ''}
                  onChange={(e) => setSettings({ ...settings, invoiceDueDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (Days)</label>
                <input
                  type="number"
                  value={settings.gracePeriodDays || ''}
                  onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="3"
                />
                <p className="text-xs text-gray-500 mt-1">Days before storage charges apply</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Storage Charge</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.minimumStorageCharge || ''}
                  onChange={(e) => setSettings({ ...settings, minimumStorageCharge: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Storage Rate Type</label>
                <select
                  value={settings.storageRateType}
                  onChange={(e) => setSettings({ ...settings, storageRateType: e.target.value as 'PER_BOX' | 'PER_CUBIC_M' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="PER_BOX">Per Box</option>
                  <option value="PER_CUBIC_M">Per Cubic Meter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Storage Rate Per Box</label>
                <input
                  type="number"
                  step="0.001"
                  value={settings.storageRatePerBox || ''}
                  onChange={(e) => setSettings({ ...settings, storageRatePerBox: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.500"
                />
                <p className="text-xs text-gray-500 mt-1">Rate per box per day</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'invoice' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Design & Layout</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  type="text"
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
                <select
                  value={settings.logoPosition}
                  onChange={(e) => setSettings({ ...settings, logoPosition: e.target.value as 'LEFT' | 'CENTER' | 'RIGHT' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="LEFT">Left</option>
                  <option value="CENTER">Center</option>
                  <option value="RIGHT">Right</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.showCompanyStamp}
                    onChange={(e) => setSettings({ ...settings, showCompanyStamp: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Show Company Stamp</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor || '#1E40AF'}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor || ''}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="#1E40AF"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.secondaryColor || '#64748B'}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor || ''}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="#64748B"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Registration No.</label>
                <input
                  type="text"
                  value={settings.taxRegistrationNo || ''}
                  onChange={(e) => setSettings({ ...settings, taxRegistrationNo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Registration No.</label>
                <input
                  type="text"
                  value={settings.companyRegistrationNo || ''}
                  onChange={(e) => setSettings({ ...settings, companyRegistrationNo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="CR-123456"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Account Details</h3>
              <p className="text-sm text-gray-600">These details will be shown on invoices for customer payments</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={settings.bankName || ''}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="National Bank of Kuwait"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                <input
                  type="text"
                  value={settings.branchName || ''}
                  onChange={(e) => setSettings({ ...settings, branchName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Salmiya Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  value={settings.accountName || ''}
                  onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={settings.accountNumber || ''}
                  onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                <input
                  type="text"
                  value={settings.iban || ''}
                  onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="KW81CBKU0000000000001234560101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SWIFT Code</label>
                <input
                  type="text"
                  value={settings.swiftCode || ''}
                  onChange={(e) => setSettings({ ...settings, swiftCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="CBKUKWKW"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
              <p className="text-sm text-gray-600">Customize the text shown on your invoices</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Instructions</label>
                <textarea
                  value={settings.paymentInstructions || ''}
                  onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Please make payment within 10 days of invoice date..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms and Conditions</label>
                <textarea
                  value={settings.termsAndConditions || ''}
                  onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="1. Payment is due within the specified period...&#10;2. Late payments may incur additional charges...&#10;3. All charges are in KWD unless otherwise stated..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
                <input
                  type="text"
                  value={settings.footerText || ''}
                  onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Thank you for your business"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'charges' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Charge Types</h3>
                <p className="text-sm text-gray-600">Manage custom charges for storage and release</p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <PlusIcon className="h-5 w-5" />
                Add Charge Type
              </button>
            </div>

            <div className="space-y-3">
              {chargeTypes.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{charge.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        charge.category === 'STORAGE' ? 'bg-blue-100 text-blue-700' :
                        charge.category === 'RELEASE' ? 'bg-green-100 text-green-700' :
                        charge.category === 'SERVICE' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {charge.category}
                      </span>
                      {charge.isActive ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{charge.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-700">
                        <strong>{charge.rate.toFixed(3)} {settings.currency}</strong> ({charge.calculationType.replace('_', ' ').toLowerCase()})
                      </span>
                      {charge.minCharge && (
                        <span className="text-gray-500">Min: {charge.minCharge} {settings.currency}</span>
                      )}
                      {charge.maxCharge && (
                        <span className="text-gray-500">Max: {charge.maxCharge} {settings.currency}</span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded ${charge.isTaxable ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {charge.isTaxable ? 'Taxable' : 'Non-taxable'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {chargeTypes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No charge types configured yet</p>
                <p className="text-sm">Add your first charge type to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
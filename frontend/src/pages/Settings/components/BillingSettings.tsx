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
  XCircleIcon,
  CreditCardIcon
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
  storageRatePerCBM?: number; // NEW: CBM rate field
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

// Prepaid Balance Interfaces
interface CompanyProfile {
  id: string;
  name: string;
  contactPerson?: string;
  contactPhone?: string;
}

interface PrepaidTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT' | 'REFUND';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

interface PrepaidBalance {
  id: string;
  companyProfileId: string;
  companyProfile?: CompanyProfile;
  totalPaid: number;
  balanceRemaining: number;
  monthlyRate?: number;
  validFrom: string;
  validUntil?: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'CANCELLED';
  notes?: string;
  transactions?: PrepaidTransaction[];
}

type TabId = 'general' | 'invoice' | 'bank' | 'terms' | 'charges' | 'prepaid';

export const BillingSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [prepaidBalances, setPrepaidBalances] = useState<PrepaidBalance[]>([]);
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Prepaid form state
  const [showPrepaidForm, setShowPrepaidForm] = useState(false);
  const [prepaidForm, setPrepaidForm] = useState({
    companyProfileId: '',
    amount: 0,
    monthlyRate: 0,
    validUntil: '',
    notes: ''
  });

  useEffect(() => {
    loadSettings();
    loadChargeTypes();
    loadPrepaidBalances();
    loadCompanyProfiles();
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

  const loadPrepaidBalances = async () => {
    try {
      const response = await fetch('/api/prepaid/balances', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPrepaidBalances(data);
      }
    } catch (error) {
      console.error('Failed to load prepaid balances:', error);
    }
  };

  const loadCompanyProfiles = async () => {
    try {
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanyProfiles(data.profiles || data);
      }
    } catch (error) {
      console.error('Failed to load company profiles:', error);
    }
  };

  const handleAddPrepaidPayment = async () => {
    if (!prepaidForm.companyProfileId || prepaidForm.amount <= 0) {
      setMessage({ type: 'error', text: 'Please select a customer and enter a valid amount' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/prepaid/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(prepaidForm)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Prepaid payment added successfully' });
        setShowPrepaidForm(false);
        setPrepaidForm({ companyProfileId: '', amount: 0, monthlyRate: 0, validUntil: '', notes: '' });
        loadPrepaidBalances();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to add prepaid payment' });
      }
    } catch (error) {
      console.error('Failed to add prepaid payment:', error);
      setMessage({ type: 'error', text: 'Failed to add prepaid payment' });
    } finally {
      setSaving(false);
    }
  };

  // Charge Type Handlers
  const handleToggleChargeType = async (charge: ChargeType) => {
    try {
      await billingAPI.updateChargeType(charge.id, { isActive: !charge.isActive });
      setChargeTypes(prev => prev.map(c =>
        c.id === charge.id ? { ...c, isActive: !c.isActive } : c
      ));
      setMessage({ type: 'success', text: `${charge.name} ${!charge.isActive ? 'enabled' : 'disabled'}` });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to toggle charge type:', error);
      setMessage({ type: 'error', text: 'Failed to update charge type' });
    }
  };

  const handleDeleteChargeType = async (charge: ChargeType) => {
    if (!window.confirm(`Are you sure you want to delete "${charge.name}"?`)) return;

    try {
      await billingAPI.deleteChargeType(charge.id);
      setChargeTypes(prev => prev.filter(c => c.id !== charge.id));
      setMessage({ type: 'success', text: `${charge.name} deleted` });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to delete charge type:', error);
      setMessage({ type: 'error', text: 'Failed to delete charge type' });
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
    { id: 'prepaid' as TabId, name: 'Prepaid Balances', icon: CreditCardIcon },
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
        <h2 className="text-2xl font-bold text-gray-900">💰 Pricing & Billing</h2>
        <p className="text-gray-600">Configure storage rates, charge types, invoices, and bank details</p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>📍 All pricing is centralized here.</strong> Storage rates configured here are used for all invoice calculations.
        </div>
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

              {settings.storageRateType === 'PER_BOX' && (
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
                  <p className="text-xs text-gray-500 mt-1">Rate per box per day (KWD)</p>
                </div>
              )}

              {settings.storageRateType === 'PER_CUBIC_M' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Storage Rate Per CBM</label>
                  <input
                    type="number"
                    step="0.001"
                    value={(settings as any).storageRatePerCBM || ''}
                    onChange={(e) => setSettings({ ...settings, storageRatePerCBM: parseFloat(e.target.value) } as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="5.000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Rate per cubic meter per day (KWD/m³/day)</p>
                </div>
              )}
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
                <p className="text-sm text-gray-600">Enable/disable charges applied to shipments</p>
              </div>
            </div>

            <div className="space-y-3">
              {chargeTypes.map((charge) => (
                <div key={charge.id} className={`flex items-center justify-between p-4 border rounded-lg ${charge.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className={`font-semibold ${charge.isActive ? 'text-gray-900' : 'text-gray-500'}`}>{charge.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${charge.category === 'STORAGE' ? 'bg-blue-100 text-blue-700' :
                        charge.category === 'RELEASE' ? 'bg-green-100 text-green-700' :
                          charge.category === 'SERVICE' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {charge.category}
                      </span>
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
                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleChargeType(charge)}
                      className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${charge.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                      title={charge.isActive ? 'Click to disable' : 'Click to enable'}
                    >
                      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${charge.isActive ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteChargeType(charge)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete charge type"
                    >
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

        {/* PREPAID BALANCES TAB */}
        {activeTab === 'prepaid' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">💳 Prepaid Customer Balances</h3>
                <p className="text-sm text-gray-600">Manage advance payments from customers (e.g., 300 KWD/month subscription)</p>
              </div>
              <button
                onClick={() => setShowPrepaidForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <PlusIcon className="h-5 w-5" />
                Add Prepaid Payment
              </button>
            </div>

            {/* Prepaid Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-blue-800">{prepaidBalances.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">Total Prepaid Received</p>
                <p className="text-2xl font-bold text-green-800">
                  {prepaidBalances.reduce((sum, b) => sum + b.totalPaid, 0).toFixed(3)} {settings?.currency || 'KWD'}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-600 font-medium">Balance Remaining</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {prepaidBalances.reduce((sum, b) => sum + b.balanceRemaining, 0).toFixed(3)} {settings?.currency || 'KWD'}
                </p>
              </div>
            </div>

            {/* Add Payment Form */}
            {showPrepaidForm && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-green-800 mb-4">Add Prepaid Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer (Company Profile) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={prepaidForm.companyProfileId}
                      onChange={(e) => setPrepaidForm(prev => ({ ...prev, companyProfileId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Customer...</option>
                      {companyProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>{profile.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount ({settings?.currency || 'KWD'}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={prepaidForm.amount || ''}
                      onChange={(e) => setPrepaidForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      placeholder="300"
                      min="0"
                      step="0.001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rate (Optional)
                    </label>
                    <input
                      type="number"
                      value={prepaidForm.monthlyRate || ''}
                      onChange={(e) => setPrepaidForm(prev => ({ ...prev, monthlyRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      placeholder="300"
                      min="0"
                      step="0.001"
                    />
                    <p className="text-xs text-gray-500 mt-1">Monthly subscription rate if applicable</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until (Optional)
                    </label>
                    <input
                      type="date"
                      value={prepaidForm.validUntil}
                      onChange={(e) => setPrepaidForm(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={prepaidForm.notes}
                      onChange={(e) => setPrepaidForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      placeholder="Payment reference, receipt number, etc."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowPrepaidForm(false);
                      setPrepaidForm({ companyProfileId: '', amount: 0, monthlyRate: 0, validUntil: '', notes: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPrepaidPayment}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Payment'}
                  </button>
                </div>
              </div>
            )}

            {/* Prepaid Balance List */}
            <div className="space-y-3">
              {prepaidBalances.map((balance) => (
                <div key={balance.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{balance.companyProfile?.name || 'Unknown Customer'}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${balance.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        balance.status === 'EXHAUSTED' ? 'bg-red-100 text-red-700' :
                          balance.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {balance.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm">
                      <span className="text-gray-600">
                        Total Paid: <strong className="text-gray-900">{balance.totalPaid.toFixed(3)} {settings?.currency || 'KWD'}</strong>
                      </span>
                      <span className="text-gray-600">
                        Remaining: <strong className={balance.balanceRemaining > 0 ? 'text-green-600' : 'text-red-600'}>
                          {balance.balanceRemaining.toFixed(3)} {settings?.currency || 'KWD'}
                        </strong>
                      </span>
                      {balance.monthlyRate && (
                        <span className="text-gray-600">
                          Monthly Rate: <strong>{balance.monthlyRate.toFixed(3)} {settings?.currency || 'KWD'}</strong>
                        </span>
                      )}
                    </div>
                    {balance.notes && (
                      <p className="text-sm text-gray-500 mt-1">📝 {balance.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p className="text-sm text-gray-700">{new Date(balance.validFrom).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {prepaidBalances.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CreditCardIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No prepaid balances configured yet</p>
                <p className="text-sm">Add your first prepaid payment to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

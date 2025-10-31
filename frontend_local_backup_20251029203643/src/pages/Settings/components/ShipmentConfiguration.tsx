import React, { useState, useEffect } from 'react';
import {
  TruckIcon,
  CogIcon,
  BanknotesIcon,
  BellIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ShipmentSettings {
  // Intake Settings
  requireClientEmail: boolean;
  requireClientPhone: boolean;
  requireEstimatedValue: boolean;
  requirePhotos: boolean;
  autoGenerateQR: boolean;
  qrCodePrefix: string;
  
  // 🚀 Intake Form Field Visibility
  showClientAddress?: boolean;
  requireClientAddress?: boolean;
  showDescription?: boolean;
  requireDescription?: boolean;
  showReferenceId?: boolean;
  requireReferenceId?: boolean;
  showNotes?: boolean;
  requireNotes?: boolean;
  showWarehouseMode?: boolean;
  showShipperDetails?: boolean;
  requireShipperDetails?: boolean;
  showConsigneeDetails?: boolean;
  requireConsigneeDetails?: boolean;
  showWeight?: boolean;
  requireWeight?: boolean;
  showDimensions?: boolean;
  requireDimensions?: boolean;
  showStorageType?: boolean;
  showSpecialInstructions?: boolean;
  showEstimatedDays?: boolean;
  requireEstimatedDays?: boolean;
  defaultEstimatedDays?: number;
  
  // Storage Settings
  defaultStorageType: string;
  allowMultipleRacks: boolean;
  requireRackAssignment: boolean;
  autoAssignRack: boolean;
  notifyOnLowCapacity: boolean;
  lowCapacityThreshold: number;
  
  // Release Settings
  requireReleaseApproval: boolean;
  releaseApproverRole: string;
  requireReleasePhotos: boolean;
  requireIDVerification: boolean;
  generateReleaseInvoice: boolean;
  autoSendInvoiceEmail: boolean;
  
  // Pricing
  storageRatePerDay: number;
  storageRatePerBox: number;
  chargePartialDay: boolean;
  minimumChargeDays: number;
  releaseHandlingFee: number;
  releasePerBoxFee: number;
  releaseTransportFee: number;
  
  // Notifications
  notifyClientOnIntake: boolean;
  notifyClientOnRelease: boolean;
  notifyOnStorageAlert: boolean;
  storageAlertDays: number;
  
  // Custom Fields
  enableCustomFields: boolean;
  
  // Partial Release
  allowPartialRelease: boolean;
  partialReleaseMinBoxes: number;
  requirePartialApproval: boolean;
  
  // Documentation
  requireReleaseSignature: boolean;
  requireCollectorID: boolean;
  allowProxyCollection: boolean;
}

const ShipmentConfiguration: React.FC = () => {
  const [settings, setSettings] = useState<ShipmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/shipment-settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      setSettings(data.settings);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/shipment-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      setSettings(data.settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all shipment settings to defaults? This cannot be undone.')) {
      return;
    }

    setResetting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/shipment-settings/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to reset settings');

      const data = await response.json();
      setSettings(data.settings);
      setMessage({ type: 'success', text: 'Settings reset to defaults successfully!' });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setResetting(false);
    }
  };

  const updateSetting = (key: keyof ShipmentSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load settings</p>
        <button
          onClick={loadSettings}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shipment Configuration</h2>
          <p className="text-gray-600 mt-1">Configure shipment intake, storage, and release workflows</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={resetting || saving}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowPathIcon className="h-5 w-5" />
            {resetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || resetting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircleIcon className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <XCircleIcon className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* 1. Intake Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TruckIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Intake Settings</h3>
            <p className="text-sm text-gray-600">Configure required fields during shipment creation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Client Email</span>
            <input
              type="checkbox"
              checked={settings.requireClientEmail}
              onChange={(e) => updateSetting('requireClientEmail', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Client Phone</span>
            <input
              type="checkbox"
              checked={settings.requireClientPhone}
              onChange={(e) => updateSetting('requireClientPhone', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Estimated Value</span>
            <input
              type="checkbox"
              checked={settings.requireEstimatedValue}
              onChange={(e) => updateSetting('requireEstimatedValue', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Photos</span>
            <input
              type="checkbox"
              checked={settings.requirePhotos}
              onChange={(e) => updateSetting('requirePhotos', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Auto-generate QR Code</span>
            <input
              type="checkbox"
              checked={settings.autoGenerateQR}
              onChange={(e) => updateSetting('autoGenerateQR', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">QR Code Prefix</label>
            <input
              type="text"
              value={settings.qrCodePrefix}
              onChange={(e) => updateSetting('qrCodePrefix', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="SHP"
            />
          </div>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Storage Type</label>
            <select
              value={settings.defaultStorageType}
              onChange={(e) => updateSetting('defaultStorageType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="PERSONAL">Personal</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
        </div>
      </div>

      {/* 🚀 1.5 Intake Form Field Customization */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DocumentTextIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Intake Form Fields</h3>
            <p className="text-sm text-gray-600">Customize which fields appear and are required in shipment intake form</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Fields */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Basic Information Fields
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Client Address</span>
                  <input
                    type="checkbox"
                    checked={settings.showClientAddress !== false}
                    onChange={(e) => updateSetting('showClientAddress', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showClientAddress !== false && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.requireClientAddress === true}
                      onChange={(e) => updateSetting('requireClientAddress', e.target.checked)}
                      className="h-3 w-3 text-purple-600 rounded"
                    />
                    Make Required
                  </label>
                )}
              </div>

              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Reference ID</span>
                  <input
                    type="checkbox"
                    checked={settings.showReferenceId !== false}
                    onChange={(e) => updateSetting('showReferenceId', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showReferenceId !== false && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.requireReferenceId === true}
                      onChange={(e) => updateSetting('requireReferenceId', e.target.checked)}
                      className="h-3 w-3 text-purple-600 rounded"
                    />
                    Make Required
                  </label>
                )}
              </div>

              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Description</span>
                  <input
                    type="checkbox"
                    checked={settings.showDescription !== false}
                    onChange={(e) => updateSetting('showDescription', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showDescription !== false && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.requireDescription === true}
                      onChange={(e) => updateSetting('requireDescription', e.target.checked)}
                      className="h-3 w-3 text-purple-600 rounded"
                    />
                    Make Required
                  </label>
                )}
              </div>

              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Notes</span>
                  <input
                    type="checkbox"
                    checked={settings.showNotes !== false}
                    onChange={(e) => updateSetting('showNotes', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showNotes !== false && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.requireNotes === true}
                      onChange={(e) => updateSetting('requireNotes', e.target.checked)}
                      className="h-3 w-3 text-purple-600 rounded"
                    />
                    Make Required
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Warehouse Mode Fields */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Warehouse Shipment Fields
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Warehouse Mode Toggle</span>
                  <input
                    type="checkbox"
                    checked={settings.showWarehouseMode !== false}
                    onChange={(e) => updateSetting('showWarehouseMode', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Shipper Details</span>
                  <input
                    type="checkbox"
                    checked={settings.showShipperDetails !== false}
                    onChange={(e) => updateSetting('showShipperDetails', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Weight</span>
                  <input
                    type="checkbox"
                    checked={settings.showWeight !== false}
                    onChange={(e) => updateSetting('showWeight', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showWeight !== false && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.requireWeight === true}
                      onChange={(e) => updateSetting('requireWeight', e.target.checked)}
                      className="h-3 w-3 text-purple-600 rounded"
                    />
                    Make Required
                  </label>
                )}
              </div>

              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Dimensions</span>
                  <input
                    type="checkbox"
                    checked={settings.showDimensions !== false}
                    onChange={(e) => updateSetting('showDimensions', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showDimensions !== false && (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={settings.requireDimensions === true}
                      onChange={(e) => updateSetting('requireDimensions', e.target.checked)}
                      className="h-3 w-3 text-purple-600 rounded"
                    />
                    Make Required
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Storage Assignment Fields */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Storage Assignment Fields
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Estimated Storage Days</span>
                  <input
                    type="checkbox"
                    checked={settings.showEstimatedDays !== false}
                    onChange={(e) => updateSetting('showEstimatedDays', e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                </div>
                {settings.showEstimatedDays !== false && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={settings.requireEstimatedDays === true}
                        onChange={(e) => updateSetting('requireEstimatedDays', e.target.checked)}
                        className="h-3 w-3 text-purple-600 rounded"
                      />
                      Make Required
                    </label>
                    <div>
                      <label className="text-xs text-gray-600">Default Value (days)</label>
                      <input
                        type="number"
                        value={settings.defaultEstimatedDays || 30}
                        onChange={(e) => updateSetting('defaultEstimatedDays', parseInt(e.target.value))}
                        className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        min="1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Storage Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <CogIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Storage Settings</h3>
            <p className="text-sm text-gray-600">Configure rack assignment and capacity alerts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Allow Multiple Racks</span>
            <input
              type="checkbox"
              checked={settings.allowMultipleRacks}
              onChange={(e) => updateSetting('allowMultipleRacks', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Rack Assignment</span>
            <input
              type="checkbox"
              checked={settings.requireRackAssignment}
              onChange={(e) => updateSetting('requireRackAssignment', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Auto-assign Rack</span>
            <input
              type="checkbox"
              checked={settings.autoAssignRack}
              onChange={(e) => updateSetting('autoAssignRack', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Low Capacity Alerts</span>
            <input
              type="checkbox"
              checked={settings.notifyOnLowCapacity}
              onChange={(e) => updateSetting('notifyOnLowCapacity', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <div className="p-3 border border-gray-200 rounded-lg md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Capacity Threshold: {settings.lowCapacityThreshold}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.lowCapacityThreshold}
              onChange={(e) => updateSetting('lowCapacityThreshold', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Release Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <DocumentCheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Release Settings</h3>
            <p className="text-sm text-gray-600">Configure release approval and documentation requirements</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Release Approval</span>
            <input
              type="checkbox"
              checked={settings.requireReleaseApproval}
              onChange={(e) => updateSetting('requireReleaseApproval', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Approver Role</label>
            <select
              value={settings.releaseApproverRole}
              onChange={(e) => updateSetting('releaseApproverRole', e.target.value)}
              disabled={!settings.requireReleaseApproval}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Release Photos</span>
            <input
              type="checkbox"
              checked={settings.requireReleasePhotos}
              onChange={(e) => updateSetting('requireReleasePhotos', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require ID Verification</span>
            <input
              type="checkbox"
              checked={settings.requireIDVerification}
              onChange={(e) => updateSetting('requireIDVerification', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Generate Release Invoice</span>
            <input
              type="checkbox"
              checked={settings.generateReleaseInvoice}
              onChange={(e) => updateSetting('generateReleaseInvoice', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Auto-send Invoice Email</span>
            <input
              type="checkbox"
              checked={settings.autoSendInvoiceEmail}
              onChange={(e) => updateSetting('autoSendInvoiceEmail', e.target.checked)}
              disabled={!settings.generateReleaseInvoice}
              className="h-5 w-5 text-blue-600 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Release Signature</span>
            <input
              type="checkbox"
              checked={settings.requireReleaseSignature}
              onChange={(e) => updateSetting('requireReleaseSignature', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Collector ID</span>
            <input
              type="checkbox"
              checked={settings.requireCollectorID}
              onChange={(e) => updateSetting('requireCollectorID', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Allow Proxy Collection</span>
            <input
              type="checkbox"
              checked={settings.allowProxyCollection}
              onChange={(e) => updateSetting('allowProxyCollection', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* 4. Pricing Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <BanknotesIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pricing Configuration</h3>
            <p className="text-sm text-gray-600">Configure storage and release charges</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Rate per Day (KWD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.storageRatePerDay}
              onChange={(e) => updateSetting('storageRatePerDay', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Rate per Box (KWD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.storageRatePerBox}
              onChange={(e) => updateSetting('storageRatePerBox', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Charge Partial Day</span>
            <input
              type="checkbox"
              checked={settings.chargePartialDay}
              onChange={(e) => updateSetting('chargePartialDay', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Charge Days</label>
            <input
              type="number"
              min="0"
              value={settings.minimumChargeDays}
              onChange={(e) => updateSetting('minimumChargeDays', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Release Handling Fee (KWD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.releaseHandlingFee}
              onChange={(e) => updateSetting('releaseHandlingFee', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Release Per-Box Fee (KWD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.releasePerBoxFee}
              onChange={(e) => updateSetting('releasePerBoxFee', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Release Transport Fee (KWD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.releaseTransportFee}
              onChange={(e) => updateSetting('releaseTransportFee', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Partial Release */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DocumentCheckIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Partial Release Settings</h3>
            <p className="text-sm text-gray-600">Configure partial release workflow</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Allow Partial Release</span>
            <input
              type="checkbox"
              checked={settings.allowPartialRelease}
              onChange={(e) => updateSetting('allowPartialRelease', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Boxes per Release</label>
            <input
              type="number"
              min="1"
              value={settings.partialReleaseMinBoxes}
              onChange={(e) => updateSetting('partialReleaseMinBoxes', parseInt(e.target.value))}
              disabled={!settings.allowPartialRelease}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Require Partial Approval</span>
            <input
              type="checkbox"
              checked={settings.requirePartialApproval}
              onChange={(e) => updateSetting('requirePartialApproval', e.target.checked)}
              disabled={!settings.allowPartialRelease}
              className="h-5 w-5 text-blue-600 rounded disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {/* 6. Notifications */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <BellIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
            <p className="text-sm text-gray-600">Configure client and staff notifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Notify Client on Intake</span>
            <input
              type="checkbox"
              checked={settings.notifyClientOnIntake}
              onChange={(e) => updateSetting('notifyClientOnIntake', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Notify Client on Release</span>
            <input
              type="checkbox"
              checked={settings.notifyClientOnRelease}
              onChange={(e) => updateSetting('notifyClientOnRelease', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Storage Alert Notifications</span>
            <input
              type="checkbox"
              checked={settings.notifyOnStorageAlert}
              onChange={(e) => updateSetting('notifyOnStorageAlert', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>

          <div className="p-3 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Alert After (Days)</label>
            <input
              type="number"
              min="1"
              value={settings.storageAlertDays}
              onChange={(e) => updateSetting('storageAlertDays', parseInt(e.target.value))}
              disabled={!settings.notifyOnStorageAlert}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <span className="text-gray-700">Enable Custom Fields</span>
            <input
              type="checkbox"
              checked={settings.enableCustomFields}
              onChange={(e) => updateSetting('enableCustomFields', e.target.checked)}
              className="h-5 w-5 text-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t border-gray-200 -mx-6 -mb-6">
        <button
          onClick={handleReset}
          disabled={resetting || saving}
          className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
        >
          <ArrowPathIcon className="h-5 w-5" />
          {resetting ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || resetting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <CheckCircleIcon className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ShipmentConfiguration;

import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI } from '../services/api';
import RackMapModal from './RackMapModal';
import { parseNumberInput, getSafeNumber } from '../utils/inputHelpers';

interface EditShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shipment: any;
}

interface Rack {
  id: string;
  code: string;
  location: string;
  capacityTotal: number;
  capacityUsed: number;
  status: string;
}

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: string;
  fieldOptions: string | null;
  isRequired: boolean;
  isActive: boolean;
  section: string;
}

export default function EditShipmentModal({ isOpen, onClose, onSuccess, shipment }: EditShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [companyProfiles, setCompanyProfiles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    description: '',
    totalBoxCount: '',
    currentBoxCount: '',
    rackId: '',
    estimatedValue: '',
    notes: '',
    status: '',
    // 🆕 NEW WAREHOUSE FIELDS (Phase 2)
    companyProfileId: '',
    storageType: 'STANDARD',
    isWarehouseShipment: false,
    shipper: '',
    consignee: '',
    shipperAddress: '',
    consigneeAddress: '',
    shipperPhone: '',
    consigneePhone: '',
    specialInstructions: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRackMap, setShowRackMap] = useState(false);

  // 🔒 SECURITY: Check if shipment has boxes assigned to racks (prevent fraud)
  const isRackAssigned = shipment?.status === 'IN_STORAGE' || shipment?.status === 'PARTIAL' || shipment?.currentBoxCount > 0;

  useEffect(() => {
    if (isOpen && shipment) {
      loadRacks();
      loadCompanyProfiles();
      loadCustomFieldsWithValues();
      // Populate form with existing data (including new warehouse fields)
      setFormData({
        clientName: shipment.clientName || '',
        clientPhone: shipment.clientPhone || '',
        clientEmail: shipment.clientEmail || '',
        description: shipment.description || '',
        totalBoxCount: shipment.totalBoxCount || '',
        currentBoxCount: shipment.currentBoxCount || '',
        rackId: shipment.rackId || '',
        estimatedValue: shipment.estimatedValue || '',
        notes: shipment.notes || '',
        status: shipment.status || 'IN_STORAGE',
        // 🆕 Populate new warehouse fields
        companyProfileId: shipment.companyProfileId || '',
        storageType: shipment.storageType || 'STANDARD',
        isWarehouseShipment: shipment.isWarehouseShipment || false,
        shipper: shipment.shipper || '',
        consignee: shipment.consignee || '',
        shipperAddress: shipment.shipperAddress || '',
        consigneeAddress: shipment.consigneeAddress || '',
        shipperPhone: shipment.shipperPhone || '',
        consigneePhone: shipment.consigneePhone || '',
        specialInstructions: shipment.specialInstructions || '',
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen, shipment]);

  const loadCustomFieldsWithValues = async () => {
    try {
      // Load custom field definitions
      const fieldsResponse = await fetch('/api/custom-fields?section=SHIPMENT', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        const fields = fieldsData.customFields || fieldsData;
        const activeFields = Array.isArray(fields) ? fields.filter((f: CustomField) => f.isActive) : [];
        setCustomFields(activeFields);
      }

      // Load existing values for this shipment
      if (shipment?.id) {
        const valuesResponse = await fetch(`/api/custom-field-values/SHIPMENT/${shipment.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (valuesResponse.ok) {
          const valuesData = await valuesResponse.json();
          const values = valuesData.customFieldValues || valuesData;
          const valueMap: Record<string, string> = {};
          if (Array.isArray(values)) {
            values.forEach((v: any) => {
              valueMap[v.customFieldId] = v.fieldValue;
            });
          }
          setCustomFieldValues(valueMap);
        }
      }
    } catch (err) {
      console.error('Failed to load custom fields:', err);
    }
  };

  const loadCompanyProfiles = async () => {
    try {
      const response = await fetch('/api/company-profiles', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanyProfiles(data.companyProfiles || []);
      }
    } catch (err) {
      console.error('Failed to load company profiles:', err);
    }
  };

  const loadRacks = async () => {
    try {
      const response = await racksAPI.getAll();
      // Include current rack even if full, plus other active racks with capacity
      const availableRacks = response.racks.filter(
        (rack: Rack) =>
          rack.id === shipment?.rackId ||
          (rack.status === 'ACTIVE' && rack.capacityUsed < rack.capacityTotal)
      );
      setRacks(availableRacks);
    } catch (err: any) {
      setError('Failed to load racks: ' + err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name.includes('Count') || name === 'estimatedValue') ? parseNumberInput(value, true) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Convert to numbers using getSafeNumber
      const totalBoxCount = getSafeNumber(formData.totalBoxCount);
      const currentBoxCount = getSafeNumber(formData.currentBoxCount);
      const estimatedValue = getSafeNumber(formData.estimatedValue);

      // Validation
      if (!formData.clientName || !formData.clientPhone) {
        throw new Error('Client name and phone are required');
      }
      if (totalBoxCount <= 0) {
        throw new Error('Total box count must be greater than 0');
      }
      if (currentBoxCount > totalBoxCount) {
        throw new Error('Current box count cannot exceed total box count');
      }
      if (!formData.rackId) {
        throw new Error('Please select a rack');
      }

      // Prepare update data with converted numbers + new warehouse fields
      const updateData = {
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        description: formData.description,
        currentBoxCount,
        rackId: formData.rackId,
        estimatedValue,
        notes: formData.notes,
        status: formData.status,
        // 🆕 NEW WAREHOUSE FIELDS (Phase 2)
        companyProfileId: formData.companyProfileId || null,
        storageType: formData.storageType,
        isWarehouseShipment: formData.isWarehouseShipment,
        shipper: formData.shipper || null,
        consignee: formData.consignee || null,
        shipperAddress: formData.shipperAddress || null,
        consigneeAddress: formData.consigneeAddress || null,
        shipperPhone: formData.shipperPhone || null,
        consigneePhone: formData.consigneePhone || null,
        specialInstructions: formData.specialInstructions || null,
      };

      await shipmentsAPI.update(shipment.id, updateData);

      // Save custom field values
      if (customFields.length > 0) {
        const values = Object.entries(customFieldValues)
          .filter(([_, value]) => value !== '')
          .map(([customFieldId, fieldValue]) => ({ customFieldId, fieldValue }));

        try {
          await fetch(`/api/custom-field-values/SHIPMENT/${shipment.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ values })
          });
        } catch (err) {
          console.error('Failed to save custom field values:', err);
        }
      }

      alert(`✅ SUCCESS!\n\nShipment ${shipment.referenceId} has been updated successfully!\n\n📦 Current Boxes: ${currentBoxCount}\n📍 Rack: ${formData.rackId}`);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update shipment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !shipment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">✏️ Edit Shipment</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 🔒 SECURITY WARNING: Show if boxes are assigned */}
          {isRackAssigned && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 font-semibold">
                    🔒 Security Lock: Critical fields are locked because boxes are assigned to racks.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Client Name, Company Profile, Box Count, and Status cannot be changed to prevent fraud.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Client Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                  {isRackAssigned && <span className="ml-2 text-xs text-yellow-600">🔒 Locked</span>}
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRackAssigned ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  placeholder="John Doe"
                  required
                  disabled={isRackAssigned}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+965 1234 5678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value (KWD)
                </label>
                <input
                  type="number"
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* 🆕 NEW: Company Profile & Storage Type */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">📋 Company & Storage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Profile
                  {isRackAssigned && <span className="ml-2 text-xs text-yellow-600">🔒 Locked</span>}
                </label>
                <select
                  name="companyProfileId"
                  value={formData.companyProfileId}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRackAssigned ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  disabled={isRackAssigned}
                >
                  <option value="">-- No Company Profile --</option>
                  {companyProfiles.map((cp: any) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} ({cp.contractStatus || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage Type
                </label>
                <select
                  name="storageType"
                  value={formData.storageType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="STANDARD">🟦 Standard</option>
                  <option value="FRAGILE">🟨 Fragile</option>
                  <option value="HAZMAT">🟥 Hazmat</option>
                </select>
              </div>
            </div>
          </div>

          {/* 🆕 NEW: Warehouse Shipment Toggle & Info */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                name="isWarehouseShipment"
                checked={formData.isWarehouseShipment}
                onChange={(e) => setFormData(prev => ({ ...prev, isWarehouseShipment: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              🏢 Warehouse Shipment (International)
            </h3>

            {formData.isWarehouseShipment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipper Name
                  </label>
                  <input
                    type="text"
                    name="shipper"
                    value={formData.shipper}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Sender/Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consignee Name
                  </label>
                  <input
                    type="text"
                    name="consignee"
                    value={formData.consignee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Receiver/Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipper Address
                  </label>
                  <textarea
                    name="shipperAddress"
                    value={formData.shipperAddress}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full origin address..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consignee Address
                  </label>
                  <textarea
                    name="consigneeAddress"
                    value={formData.consigneeAddress}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full destination address..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipper Phone
                  </label>
                  <input
                    type="tel"
                    name="shipperPhone"
                    value={formData.shipperPhone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+965 XXXX XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consignee Phone
                  </label>
                  <input
                    type="tel"
                    name="consigneePhone"
                    value={formData.consigneePhone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+965 XXXX XXXX"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Shipment Details */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Shipment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Household items, furniture, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Box Count <span className="text-red-500">*</span>
                  {isRackAssigned && <span className="ml-2 text-xs text-yellow-600">🔒 Locked</span>}
                </label>
                <input
                  type="number"
                  name="totalBoxCount"
                  value={formData.totalBoxCount}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRackAssigned ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  placeholder="10"
                  min="1"
                  required
                  disabled={isRackAssigned}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Box Count <span className="text-red-500">*</span>
                  {isRackAssigned && <span className="ml-2 text-xs text-yellow-600">🔒 Auto-Update Only</span>}
                </label>
                <input
                  type="number"
                  name="currentBoxCount"
                  value={formData.currentBoxCount}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRackAssigned ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  placeholder="10"
                  min="0"
                  required
                  disabled={isRackAssigned}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                  {isRackAssigned && <span className="ml-2 text-xs text-yellow-600">🔒 Auto-Update Only</span>}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRackAssigned ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  disabled={isRackAssigned}
                >
                  <option value="IN_STORAGE">In Storage</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="RELEASED">Released</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rack Assignment */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Rack Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Rack
                  {isRackAssigned && <span className="ml-2 text-xs text-yellow-600">🔒 Cannot Change</span>}
                </label>
                <select
                  name="rackId"
                  value={formData.rackId}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRackAssigned ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  disabled={isRackAssigned}
                >
                  <option value="">-- No Rack Assigned --</option>
                  {racks.map(rack => (
                    <option key={rack.id} value={rack.id}>
                      {rack.code} - {rack.location} (Available: {rack.capacityTotal - rack.capacityUsed}/{rack.capacityTotal})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowRackMap(true)}
                  className={`w-full px-4 py-2 rounded-md font-medium border-2 ${isRackAssigned
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300'
                    }`}
                  disabled={isRackAssigned}
                >
                  🗺️ {isRackAssigned ? 'Rack Map Locked' : 'Open Rack Map'}
                </button>
              </div>
            </div>
            {isRackAssigned && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ Rack assignment is locked. Use Scanner or Pending+Racks to move boxes between racks.
              </p>
            )}
          </div>

          {/* 🆕 NEW: Pallet Information Display (Read-Only) */}
          {(shipment?.palletCount > 0 || shipment?.boxesPerPallet > 0) && (
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">📦 Pallet Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Total Pallets</p>
                  <p className="text-2xl font-bold text-blue-700">{shipment.palletCount || 0}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Boxes per Pallet</p>
                  <p className="text-2xl font-bold text-green-700">{shipment.boxesPerPallet || 0}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Total Boxes Calculated</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {(shipment.palletCount || 0) * (shipment.boxesPerPallet || 0)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Pallet information is set during intake and cannot be edited here.
              </p>
            </div>
          )}

          {/* 🆕 NEW: Special Instructions */}
          <div className="border-b pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions
            </label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any special handling, storage requirements, or important notes..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional comments or observations..."
            />
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">✨ Custom Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.fieldName}
                      {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.fieldType === 'TEXT' && (
                      <input
                        type="text"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}

                    {field.fieldType === 'NUMBER' && (
                      <input
                        type="number"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}

                    {field.fieldType === 'DATE' && (
                      <input
                        type="date"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}

                    {field.fieldType === 'DROPDOWN' && field.fieldOptions && (
                      <select
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select --</option>
                        {(() => {
                          if (!field.fieldOptions) return [];
                          try {
                            // Try to parse as JSON array
                            const options = JSON.parse(field.fieldOptions);
                            return Array.isArray(options) ? options.map((option: string) => (
                              <option key={option} value={option}>{option}</option>
                            )) : [];
                          } catch {
                            // Fallback: split by comma if not valid JSON
                            return typeof field.fieldOptions === 'string' ? field.fieldOptions.split(',').map((option: string) => (
                              <option key={option.trim()} value={option.trim()}>{option.trim()}</option>
                            )) : [];
                          }
                        })()}
                      </select>
                    )}

                    {field.fieldType === 'CHECKBOX' && (
                      <div className="flex items-center h-10">
                        <input
                          type="checkbox"
                          checked={customFieldValues[field.id] === 'true'}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked ? 'true' : 'false' }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Yes</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Shipment'}
            </button>
          </div>
        </form>
      </div>

      {/* Rack Map Modal */}
      <RackMapModal
        isOpen={showRackMap}
        onClose={() => setShowRackMap(false)}
        selectedRackId={formData.rackId}
        onSelectRack={(rackId) => {
          setFormData(prev => ({ ...prev, rackId }));
          setShowRackMap(false);
        }}
      />
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI } from '../services/api';
import RackMapModal from './RackMapModal';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  fieldOptions: string[] | null;
  isRequired: boolean;
  isActive: boolean;
  section: string;
}

export default function CreateShipmentModal({ isOpen, onClose, onSuccess }: CreateShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    description: '',
    totalBoxCount: 0,
    currentBoxCount: 0,
    rackId: '',
    assignBoxCount: 0, // How many boxes to assign to selected rack
    estimatedValue: 0,
    notes: '',
    // Warehouse-specific fields
    isWarehouseShipment: false,
    shipper: '',
    consignee: '',
    shipperAddress: '',
    consigneeAddress: '',
    shipperPhone: '',
    consigneePhone: '',
    warehouseNotes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRackMap, setShowRackMap] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRacks();
      loadCustomFields();
      // Reset form
      setFormData({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        description: '',
        totalBoxCount: 0,
        currentBoxCount: 0,
        rackId: '',
        assignBoxCount: 0,
        estimatedValue: 0,
        notes: '',
        // Warehouse-specific fields
        isWarehouseShipment: false,
        shipper: '',
        consignee: '',
        shipperAddress: '',
        consigneeAddress: '',
        shipperPhone: '',
        consigneePhone: '',
        warehouseNotes: '',
      });
      setCustomFieldValues({});
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const loadRacks = async () => {
    try {
      const response = await racksAPI.getAll();
      // Filter only active racks with available capacity
      const availableRacks = response.racks.filter(
        (rack: Rack) => rack.status === 'ACTIVE' && rack.capacityUsed < rack.capacityTotal
      );
      setRacks(availableRacks);
    } catch (err: any) {
      setError('Failed to load racks: ' + err.message);
    }
  };

  const loadCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields?section=SHIPMENT', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns { customFields: [] }, not direct array
        const fields = data.customFields || data;
        const activeFields = Array.isArray(fields) ? fields.filter((field: CustomField) => field.isActive) : [];
        setCustomFields(activeFields);
        // Initialize custom field values as empty
        const initialValues: Record<string, string> = {};
        activeFields.forEach((field: CustomField) => {
          initialValues[field.id] = '';
        });
        setCustomFieldValues(initialValues);
      }
    } catch (err: any) {
      console.error('Failed to load custom fields:', err);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id] || '';
    
    switch (field.fieldType) {
      case 'TEXT':
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${field.fieldName.toLowerCase()}`}
            required={field.isRequired}
          />
        );
      
      case 'NUMBER':
        return (
          <input
            type="number"
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${field.fieldName.toLowerCase()}`}
            required={field.isRequired}
          />
        );
      
      case 'DATE':
        return (
          <input
            type="date"
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );
      
      case 'DROPDOWN':
        return (
          <select
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          >
            <option value="">Select {field.fieldName.toLowerCase()}</option>
            {field.fieldOptions && field.fieldOptions.map((option: string, index: number) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'CHECKBOX':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.id}
              checked={value === 'true'}
              onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked.toString() }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.id} className="ml-2 text-sm text-gray-700">
              Yes, {field.fieldName.toLowerCase()}
            </label>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${field.fieldName.toLowerCase()}`}
            required={field.isRequired}
          />
        );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Count') || name === 'estimatedValue' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.clientName || !formData.clientPhone) {
        throw new Error('Client name and phone are required');
      }
      if (formData.isWarehouseShipment && (!formData.shipper || !formData.consignee)) {
        throw new Error('Shipper and consignee names are required for warehouse shipments');
      }
      if (formData.totalBoxCount <= 0) {
        throw new Error('Total box count must be greater than 0');
      }
      if (formData.currentBoxCount > formData.totalBoxCount) {
        throw new Error('Current box count cannot exceed total box count');
      }

      // Validate required custom fields
      for (const field of customFields) {
        if (field.isRequired && !customFieldValues[field.id]) {
          throw new Error(`${field.fieldName} is required`);
        }
      }

      // Set currentBoxCount = totalBoxCount if not specified
      const dataToSubmit = {
        ...formData,
        currentBoxCount: formData.currentBoxCount > 0 ? formData.currentBoxCount : formData.totalBoxCount,
        status: formData.rackId ? 'IN_STORAGE' : 'PENDING', // PENDING if no rack assigned yet
        rackId: formData.rackId || undefined, // Optional rack assignment
        // Include warehouse data if it's a warehouse shipment
        warehouseData: formData.isWarehouseShipment ? JSON.stringify({
          shipper: formData.shipper,
          consignee: formData.consignee,
          shipperAddress: formData.shipperAddress,
          consigneeAddress: formData.consigneeAddress,
          shipperPhone: formData.shipperPhone,
          consigneePhone: formData.consigneePhone,
          warehouseNotes: formData.warehouseNotes,
        }) : null,
        // Include custom field values
        customFieldValues: JSON.stringify(customFieldValues),
      };

      const response: any = await shipmentsAPI.create(dataToSubmit);
      const shipmentId = response.shipment?.id || response.id;

      // If rack selected with specific box count, assign those boxes
      if (formData.rackId && formData.assignBoxCount > 0) {
        const boxNumbers = Array.from({ length: formData.assignBoxCount }, (_, i) => i + 1);
        try {
          await fetch(`/api/shipments/${shipmentId}/assign-boxes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ 
              rackId: formData.rackId,
              boxNumbers 
            })
          });
        } catch (err) {
          console.error('Failed to assign boxes:', err);
        }
      }

      // Save custom field values if any
      if (customFields.length > 0) {
        const values = Object.entries(customFieldValues)
          .filter(([_, value]) => value !== '') // Only non-empty values
          .map(([customFieldId, fieldValue]) => ({
            customFieldId,
            fieldValue
          }));

        if (values.length > 0) {
          try {
            await fetch(`/api/custom-field-values/SHIPMENT/${shipmentId}`, {
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
      }
      
      if (formData.rackId && formData.assignBoxCount > 0) {
        setSuccess(`✅ Shipment created! ${formData.assignBoxCount} boxes assigned to rack!`);
      } else if (formData.rackId) {
        setSuccess('Shipment created and assigned to rack! ✅');
      } else {
        setSuccess('Shipment created! Worker can scan to assign boxes. 📦');
      }
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">📦 Create New Shipment</h2>
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
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
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

          {/* Shipment Type */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isWarehouseShipment"
                name="isWarehouseShipment"
                checked={formData.isWarehouseShipment}
                onChange={(e) => setFormData(prev => ({ ...prev, isWarehouseShipment: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isWarehouseShipment" className="text-sm font-medium text-gray-700">
                📦 This is a warehouse shipment (import/export with shipper/consignee details)
              </label>
            </div>
          </div>

          {/* Warehouse Details - Only show if warehouse shipment */}
          {formData.isWarehouseShipment && (
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                🏭 Warehouse Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipper Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="shipper"
                    value={formData.shipper}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC Trading Company"
                    required={formData.isWarehouseShipment}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consignee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="consignee"
                    value={formData.consignee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="XYZ Imports LLC"
                    required={formData.isWarehouseShipment}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipper Address
                  </label>
                  <input
                    type="text"
                    name="shipperAddress"
                    value={formData.shipperAddress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Export St, Dubai, UAE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consignee Address
                  </label>
                  <input
                    type="text"
                    name="consigneeAddress"
                    value={formData.consigneeAddress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="456 Import Ave, Kuwait City, Kuwait"
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
                    placeholder="+971 4 123 4567"
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
                    placeholder="+965 2 234 5678"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse Notes
                  </label>
                  <textarea
                    name="warehouseNotes"
                    value={formData.warehouseNotes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Special handling instructions, customs notes, etc."
                  />
                </div>
              </div>
            </div>
          )}

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
                </label>
                <input
                  type="number"
                  name="totalBoxCount"
                  value={formData.totalBoxCount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Box Count
                  <span className="text-xs text-gray-500 ml-2">(Leave 0 for same as total)</span>
                </label>
                <input
                  type="number"
                  name="currentBoxCount"
                  value={formData.currentBoxCount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Rack Assignment */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Rack Assignment (Optional)</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> You can skip rack assignment now. Workers can scan QR codes to assign racks later using the Scanner.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Rack (Optional)
                </label>
                <select
                  name="rackId"
                  value={formData.rackId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Assign Later via Scanner --</option>
                  {racks.map(rack => (
                    <option key={rack.id} value={rack.id}>
                      {rack.code} - {rack.location} (Available: {rack.capacityTotal - rack.capacityUsed}/{rack.capacityTotal})
                    </option>
                  ))}
                </select>
                {racks.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ No available racks. Worker can assign via scanner after creating racks.
                  </p>
                )}
              </div>

              {formData.rackId && formData.totalBoxCount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How Many Boxes to Assign? 📦
                  </label>
                  <input
                    type="number"
                    name="assignBoxCount"
                    min="1"
                    max={formData.totalBoxCount}
                    value={formData.assignBoxCount || formData.totalBoxCount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Max: ${formData.totalBoxCount}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Remaining boxes can go to other racks
                  </p>
                </div>
              )}

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowRackMap(true)}
                  className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 font-medium border-2 border-purple-300"
                >
                  🗺️ Open Rack Map
                </button>
              </div>
            </div>
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
              placeholder="Any special instructions or notes..."
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
                    {renderCustomField(field)}
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
              {loading ? 'Creating...' : 'Create Shipment'}
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


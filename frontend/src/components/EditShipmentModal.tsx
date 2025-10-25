import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI } from '../services/api';
import RackMapModal from './RackMapModal';

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
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    description: '',
    totalBoxCount: 0,
    currentBoxCount: 0,
    rackId: '',
    estimatedValue: 0,
    notes: '',
    status: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRackMap, setShowRackMap] = useState(false);

  useEffect(() => {
    if (isOpen && shipment) {
      loadRacks();
      loadCustomFieldsWithValues();
      // Populate form with existing data
      setFormData({
        clientName: shipment.clientName || '',
        clientPhone: shipment.clientPhone || '',
        clientEmail: shipment.clientEmail || '',
        description: shipment.description || '',
        totalBoxCount: shipment.totalBoxCount || 0,
        currentBoxCount: shipment.currentBoxCount || 0,
        rackId: shipment.rackId || '',
        estimatedValue: shipment.estimatedValue || 0,
        notes: shipment.notes || '',
        status: shipment.status || 'IN_STORAGE',
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
      if (formData.totalBoxCount <= 0) {
        throw new Error('Total box count must be greater than 0');
      }
      if (formData.currentBoxCount > formData.totalBoxCount) {
        throw new Error('Current box count cannot exceed total box count');
      }
      if (!formData.rackId) {
        throw new Error('Please select a rack');
      }

      // Remove totalBoxCount from the data being sent (schema only has currentBoxCount)
      const { totalBoxCount, ...updateData } = formData;
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
      
      alert(`✅ SUCCESS!\n\nShipment ${shipment.referenceId} has been updated successfully!\n\n📦 Current Boxes: ${formData.currentBoxCount}\n📍 Rack: ${formData.rackId}`);
      
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
                  Current Box Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="currentBoxCount"
                  value={formData.currentBoxCount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </label>
                <select
                  name="rackId"
                  value={formData.rackId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          try {
                            // Try to parse as JSON array
                            const options = JSON.parse(field.fieldOptions);
                            return Array.isArray(options) ? options.map((option: string) => (
                              <option key={option} value={option}>{option}</option>
                            )) : [];
                          } catch {
                            // Fallback: split by comma if not valid JSON
                            return field.fieldOptions.split(',').map((option: string) => (
                              <option key={option.trim()} value={option.trim()}>{option.trim()}</option>
                            ));
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


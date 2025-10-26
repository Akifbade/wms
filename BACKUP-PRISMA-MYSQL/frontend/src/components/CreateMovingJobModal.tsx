import React, { useState, useEffect } from 'react';
import { jobsAPI } from '../services/api';

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';
  fieldOptions: string | null;
  isRequired: boolean;
  isActive: boolean;
}

interface CreateMovingJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMovingJobModal({ isOpen, onClose, onSuccess }: CreateMovingJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    jobType: 'LOCAL',
    clientName: '',
    clientPhone: '',
    fromAddress: '',
    toAddress: '',
    scheduledDate: '',
    status: 'SCHEDULED',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Array<{materialId: string; quantity: number}>>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        title: '',
        jobType: 'LOCAL',
        clientName: '',
        clientPhone: '',
        fromAddress: '',
        toAddress: '',
        scheduledDate: today,
        status: 'SCHEDULED',
      });
      setError('');
      setSuccess('');
      setSelectedMaterials([]);
      loadCustomFields();
      loadMaterials();
      setCustomFieldValues({});
    }
  }, [isOpen]);

  const loadMaterials = async () => {
    try {
      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.filter((m: any) => m.totalQuantity > 0));
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const loadCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields?section=JOB', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.title || !formData.clientName || !formData.clientPhone) {
        throw new Error('Title, client name, and phone are required');
      }
      if (!formData.fromAddress) {
        throw new Error('From address is required');
      }
      if (!formData.scheduledDate) {
        throw new Error('Scheduled date is required');
      }
      if (formData.jobType === 'INTERNATIONAL' && !formData.toAddress) {
        throw new Error('To address is required for international moves');
      }

      // Transform frontend fields to backend format
      const dataToSubmit = {
        jobCode: `JOB-${Date.now()}`, // Auto-generate job code
        jobTitle: formData.title,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: '', // Optional
        jobDate: new Date(formData.scheduledDate).toISOString(),
        jobAddress: formData.fromAddress,
        dropoffAddress: formData.toAddress || null,
        teamLeaderId: null,
        driverName: null,
        vehicleNumber: null,
        notes: null,
        status: formData.status,
      };

      const response: any = await jobsAPI.create(dataToSubmit);
      const jobId = response.id; // Backend returns job directly, not wrapped

      // Issue materials if selected
      if (selectedMaterials.length > 0) {
        const validMaterials = selectedMaterials.filter(m => m.materialId && m.quantity > 0);
        for (const material of validMaterials) {
          try {
            await fetch('/api/materials/issue', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                jobId,
                materialId: material.materialId,
                quantity: material.quantity
              })
            });
          } catch (err) {
            console.error('Failed to issue material:', err);
          }
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
            await fetch(`/api/custom-field-values/JOB/${jobId}`, {
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
      
      setSuccess('Moving job created successfully! ✅');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create moving job');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">🚛 Create New Moving Job</h2>
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

          {/* Job Details */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Office Relocation - ABC Company"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="LOCAL">Local Move</option>
                  <option value="INTERNATIONAL">International Move</option>
                  <option value="PACKING_ONLY">Packing Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+965 1234 5678"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Location Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="fromAddress"
                  value={formData.fromAddress}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Full pickup address..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Address {formData.jobType === 'INTERNATIONAL' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  name="toAddress"
                  value={formData.toAddress}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Full delivery address..."
                  required={formData.jobType === 'INTERNATIONAL'}
                />
                {formData.jobType === 'PACKING_ONLY' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for packing-only jobs
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">📦 Materials (Optional)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select materials needed for this job. Stock will be deducted automatically.
            </p>
            
            <div className="space-y-3">
              {selectedMaterials.map((item, index) => {
                const material = materials.find(m => m.id === item.materialId);
                return (
                  <div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded">
                    <select
                      value={item.materialId}
                      onChange={(e) => {
                        const newMaterials = [...selectedMaterials];
                        newMaterials[index].materialId = e.target.value;
                        setSelectedMaterials(newMaterials);
                      }}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">-- Select Material --</option>
                      {materials.map(mat => (
                        <option key={mat.id} value={mat.id}>
                          {mat.sku} - {mat.name} (Stock: {mat.totalQuantity} {mat.unit})
                        </option>
                      ))}
                    </select>
                    
                    <input
                      type="number"
                      min="1"
                      max={material?.totalQuantity || 999}
                      value={item.quantity}
                      onChange={(e) => {
                        const newMaterials = [...selectedMaterials];
                        newMaterials[index].quantity = parseInt(e.target.value) || 0;
                        setSelectedMaterials(newMaterials);
                      }}
                      className="w-24 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Qty"
                    />
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              
              <button
                type="button"
                onClick={() => {
                  setSelectedMaterials([...selectedMaterials, { materialId: '', quantity: 1 }]);
                }}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                + Add Material
              </button>
            </div>
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="border-b pb-4">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                      />
                    )}

                    {field.fieldType === 'NUMBER' && (
                      <input
                        type="number"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                      />
                    )}

                    {field.fieldType === 'DATE' && (
                      <input
                        type="date"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    )}

                    {field.fieldType === 'DROPDOWN' && field.fieldOptions && (
                      <select
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.isRequired}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">-- Select --</option>
                        {(() => {
                          try {
                            const options = JSON.parse(field.fieldOptions);
                            return Array.isArray(options) ? options.map((option: string) => (
                              <option key={option} value={option}>{option}</option>
                            )) : [];
                          } catch {
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
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


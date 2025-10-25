import { useState, useEffect } from 'react';
import { jobsAPI } from '../services/api';
import MaterialReturnModal from './MaterialReturnModal';

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';
  fieldOptions: string | null;
  isRequired: boolean;
  isActive: boolean;
}

interface EditMovingJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  job: any;
}

export default function EditMovingJobModal({ isOpen, onClose, onSuccess, job }: EditMovingJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    jobType: 'LOCAL',
    clientName: '',
    clientPhone: '',
    fromAddress: '',
    toAddress: '',
    scheduledDate: '',
    estimatedHours: 0,
    totalCost: 0,
    status: 'SCHEDULED',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && job) {
      // Map backend fields to frontend format
      const scheduledDate = (job.jobDate || job.scheduledDate)
        ? new Date(job.jobDate || job.scheduledDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      setFormData({
        title: job.jobTitle || job.title || '',
        jobType: job.jobType || 'LOCAL',
        clientName: job.clientName || '',
        clientPhone: job.clientPhone || '',
        fromAddress: job.jobAddress || job.fromAddress || '',
        toAddress: job.dropoffAddress || job.toAddress || '',
        scheduledDate,
        estimatedHours: job.estimatedHours || 0,
        totalCost: job.totalCost || 0,
        status: job.status || 'PLANNED',
      });
      setError('');
      setSuccess('');
      loadCustomFieldsWithValues();
    }
  }, [isOpen, job]);

  const loadCustomFieldsWithValues = async () => {
    if (!job?.id) return;
    
    try {
      // Load custom field definitions
      const fieldsResponse = await fetch('/api/custom-fields?section=JOB', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        const fields = fieldsData.customFields || fieldsData;
        const activeFields = Array.isArray(fields) ? fields.filter((field: CustomField) => field.isActive) : [];
        setCustomFields(activeFields);

        // Load existing values for this job
        const valuesResponse = await fetch(`/api/custom-field-values/JOB/${job.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (valuesResponse.ok) {
          const valuesData = await valuesResponse.json();
          const existingValues = valuesData.customFieldValues || valuesData;
          const valueMap: Record<string, string> = {};
          if (Array.isArray(existingValues)) {
            existingValues.forEach((val: any) => {
              valueMap[val.customFieldId] = val.fieldValue;
            });
          }
          setCustomFieldValues(valueMap);
        }
      }
    } catch (err: any) {
      console.error('Failed to load custom fields:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedHours' || name === 'totalCost' ? Number(value) : value
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
        jobTitle: formData.title,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        jobDate: new Date(formData.scheduledDate).toISOString(),
        jobAddress: formData.fromAddress,
        dropoffAddress: formData.toAddress || null,
        status: formData.status,
      };

      await jobsAPI.update(job.id, dataToSubmit);

      // Update custom field values if any
      if (customFields.length > 0) {
        const values = Object.entries(customFieldValues)
          .filter(([_, value]) => value !== '') // Only non-empty values
          .map(([customFieldId, fieldValue]) => ({
            customFieldId,
            fieldValue
          }));

        if (values.length > 0) {
          try {
            await fetch(`/api/custom-field-values/JOB/${job.id}`, {
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
      
      // Update job successfully
      setSuccess('Moving job updated successfully! ✅');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update moving job');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">✏️ Edit Moving Job</h2>
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
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="PLANNED">Planned</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Use "Complete Job" button to finish job and return materials
                </p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.5"
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

          {/* Cost Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Cost Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost (KWD)
              </label>
              <input
                type="number"
                name="totalCost"
                value={formData.totalCost}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.001"
              />
              <p className="text-xs text-gray-500 mt-1">
                Update cost after job completion or quote approval
              </p>
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
              {loading ? 'Updating...' : 'Update Job'}
            </button>
          </div>
        </form>
      </div>

      {/* Material Return Modal */}
      <MaterialReturnModal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          onSuccess();
          onClose();
        }}
        jobId={job?.id || ''}
        onSuccess={() => {
          setShowReturnModal(false);
          onSuccess();
          onClose();
        }}
      />
    </div>
  );
}


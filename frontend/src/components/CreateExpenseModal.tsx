import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { expensesAPI } from '../services/api';

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';
  fieldOptions: string | null;
  isRequired: boolean;
  isActive: boolean;
}

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'MAINTENANCE',
    amount: '',
    currency: 'KWD',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCustomFields();
    }
  }, [isOpen]);

  const loadCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields?section=EXPENSE', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const fields = data.customFields || data;
        const activeFields = Array.isArray(fields) ? fields.filter((field: CustomField) => field.isActive) : [];
        setCustomFields(activeFields);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Valid amount is required');
      return;
    }

    try {
      setLoading(true);
      const response: any = await expensesAPI.create({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      const expenseId = response.expense?.id || response.id;

      // Save custom field values if any
      if (customFields.length > 0) {
        const values = Object.entries(customFieldValues)
          .filter(([_, value]) => value !== '')
          .map(([customFieldId, fieldValue]) => ({
            customFieldId,
            fieldValue
          }));

        if (values.length > 0) {
          try {
            await fetch(`/api/custom-field-values/EXPENSE/${expenseId}`, {
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

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      category: 'MAINTENANCE',
      amount: '',
      currency: 'KWD',
      description: '',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-primary-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Add New Expense</h3>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Warehouse Rent - October"
                  required
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="FUEL">Fuel</option>
                    <option value="MATERIALS">Materials</option>
                    <option value="SALARIES">Salaries</option>
                    <option value="RENT">Rent</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter amount"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      KWD
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Additional details about this expense..."
                />
              </div>

              {/* Receipt Upload Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt / Attachment
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Photo upload coming soon</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="mt-4 border-t pt-4">
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                        />
                      )}

                      {field.fieldType === 'NUMBER' && (
                        <input
                          type="number"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.isRequired}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                        />
                      )}

                      {field.fieldType === 'DATE' && (
                        <input
                          type="date"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.isRequired}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      )}

                      {field.fieldType === 'DROPDOWN' && field.fieldOptions && (
                        <select
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.isRequired}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">-- Select --</option>
                          {(() => {
                            try {
                              const options = JSON.parse(field.fieldOptions);
                              return Array.isArray(options) ? options.map((option: string) => (
                                <option key={option} value={option}>{option}</option>
                              )) : [];
                            } catch {
                              return field.fieldOptions ? field.fieldOptions.split(',').map((option: string) => (
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
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Yes</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


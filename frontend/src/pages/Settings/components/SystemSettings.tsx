import React, { useState, useEffect } from 'react';
import { 
  CubeIcon,
  QrCodeIcon,
  PlusIcon,
  TrashIcon,
  PrinterIcon,
  MapIcon,
  DocumentPlusIcon,
  TagIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { racksAPI, customFieldsAPI } from '../../../services/api';

interface Rack {
  id: string;
  code: string;
  location: string;
  type: 'STORAGE' | 'MATERIALS' | 'EQUIPMENT';
  capacity: number;
  currentLoad: number;
  qrCode: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

interface CustomField {
  id: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';
  options?: string[];
  required: boolean;
  section: 'SHIPMENT' | 'JOB' | 'EXPENSE';
  order: number;
}



const rackTypeColors = {
  STORAGE: 'bg-blue-100 text-blue-800',
  MATERIALS: 'bg-green-100 text-green-800',
  EQUIPMENT: 'bg-purple-100 text-purple-800'
};

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-red-100 text-red-800'
};

export const SystemSettings: React.FC = () => {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRack, setShowAddRack] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const [newRack, setNewRack] = useState({
    code: '',
    location: '',
    rackType: 'STORAGE',
    capacityTotal: 100
  });

  const [newField, setNewField] = useState({
    fieldName: '',
    fieldType: 'TEXT',
    fieldOptions: [''],
    isRequired: false,
    section: 'SHIPMENT'
  });

  // Load racks and custom fields on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [racksResponse, fieldsResponse] = await Promise.all([
        racksAPI.getAll(),
        customFieldsAPI.getAll()
      ]);
      
      // Transform rack data to match component interface
      const transformedRacks = racksResponse.racks.map((rack: any) => ({
        id: rack.id,
        code: rack.code,
        location: rack.location || '',
        type: rack.rackType,
        capacity: rack.capacityTotal,
        currentLoad: rack.capacityUsed,
        qrCode: rack.qrCode,
        status: rack.status
      }));
      
      // Transform custom field data - handle both formats
      const fields = fieldsResponse.customFields || fieldsResponse;
      const fieldsArray = Array.isArray(fields) ? fields : [];
      const transformedFields = fieldsArray.map((field: any) => ({
        id: field.id,
        name: field.fieldName,
        type: field.fieldType,
        options: field.fieldOptions || undefined,
        required: field.isRequired,
        section: field.section,
        order: 1 // Backend doesn't have order yet
      }));
      
      setRacks(transformedRacks);
      setCustomFields(transformedFields);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      alert('Failed to load racks and custom fields');
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationPercentage = (rack: Rack) => {
    return Math.round((rack.currentLoad / rack.capacity) * 100);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleAddRack = async () => {
    try {
      if (!newRack.code || !newRack.location) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await racksAPI.create(newRack);
      
      // Transform and add to state
      const transformedRack = {
        id: response.rack.id,
        code: response.rack.code,
        location: response.rack.location || '',
        type: response.rack.rackType,
        capacity: response.rack.capacityTotal,
        currentLoad: response.rack.capacityUsed,
        qrCode: response.rack.qrCode,
        status: response.rack.status
      };
      
      setRacks([...racks, transformedRack]);
      setNewRack({ code: '', location: '', rackType: 'STORAGE', capacityTotal: 100 });
      setShowAddRack(false);
    } catch (error: any) {
      console.error('Failed to create rack:', error);
      alert(error.message || 'Failed to create rack');
    }
  };

  const handleAddCustomField = async () => {
    try {
      if (!newField.fieldName) {
        alert('Please provide a field name');
        return;
      }

      const fieldData = {
        ...newField,
        fieldOptions: newField.fieldType === 'DROPDOWN' 
          ? newField.fieldOptions.filter((opt: string) => opt.trim()) 
          : null
      };

      console.log('Creating field with data:', fieldData);
      const response = await customFieldsAPI.create(fieldData);
      console.log('API Response:', response);
      
      // Instead of manual transformation, reload all data from server
      // This ensures we get the exact format the backend returns
      await loadData();
      
      setNewField({ fieldName: '', fieldType: 'TEXT', fieldOptions: [''], isRequired: false, section: 'SHIPMENT' });
      setShowAddField(false);
      alert('Custom field added successfully!');
    } catch (error: any) {
      console.error('Failed to create custom field:', error);
      alert(error.message || 'Failed to create custom field');
    }
  };

  const handleDeleteRack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rack?')) {
      return;
    }

    try {
      await racksAPI.delete(id);
      setRacks(racks.filter(r => r.id !== id));
    } catch (error: any) {
      console.error('Failed to delete rack:', error);
      alert(error.message || 'Failed to delete rack');
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) {
      return;
    }

    try {
      await customFieldsAPI.delete(id);
      setCustomFields(customFields.filter(f => f.id !== id));
    } catch (error: any) {
      console.error('Failed to delete custom field:', error);
      alert(error.message || 'Failed to delete custom field');
    }
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setNewField({
      fieldName: field.name,
      fieldType: field.type,
      fieldOptions: field.options || [''],
      isRequired: field.required,
      section: field.section
    });
    setShowAddField(true);
  };

  const handleUpdateField = async () => {
    if (!editingField) return;

    try {
      if (!newField.fieldName) {
        alert('Please provide a field name');
        return;
      }

      const fieldData = {
        fieldName: newField.fieldName,
        fieldType: newField.fieldType,
        fieldOptions: newField.fieldType === 'DROPDOWN' 
          ? newField.fieldOptions.filter((opt: string) => opt.trim()) 
          : null,
        isRequired: newField.isRequired,
        section: newField.section
      };

      const response = await customFieldsAPI.update(editingField.id, fieldData);
      console.log('Update response:', response);
      
      // Reload all data to ensure consistency
      await loadData();
      
      setNewField({ fieldName: '', fieldType: 'TEXT', fieldOptions: [''], isRequired: false, section: 'SHIPMENT' });
      setEditingField(null);
      setShowAddField(false);
      alert('Custom field updated successfully!');
    } catch (error: any) {
      console.error('Failed to update custom field:', error);
      alert(error.message || 'Failed to update custom field');
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setNewField({ fieldName: '', fieldType: 'TEXT', fieldOptions: [''], isRequired: false, section: 'SHIPMENT' });
    setShowAddField(false);
  };

  // Quick templates for common fields
  const applyFieldTemplate = (template: string) => {
    const templates: Record<string, any> = {
      priority: {
        fieldName: 'Priority Level',
        fieldType: 'DROPDOWN',
        fieldOptions: ['Low', 'Medium', 'High', 'Urgent'],
        isRequired: false,
        section: 'SHIPMENT'
      },
      insurance: {
        fieldName: 'Insurance Value',
        fieldType: 'NUMBER',
        fieldOptions: [''],
        isRequired: true,
        section: 'SHIPMENT'
      },
      customerType: {
        fieldName: 'Customer Type',
        fieldType: 'DROPDOWN',
        fieldOptions: ['Individual', 'Corporate', 'Government'],
        isRequired: false,
        section: 'JOB'
      },
      deliveryInstructions: {
        fieldName: 'Delivery Instructions',
        fieldType: 'TEXT',
        fieldOptions: [''],
        isRequired: false,
        section: 'SHIPMENT'
      },
      fragile: {
        fieldName: 'Fragile Item',
        fieldType: 'CHECKBOX',
        fieldOptions: [''],
        isRequired: false,
        section: 'SHIPMENT'
      }
    };

    if (templates[template]) {
      setNewField(templates[template]);
    }
  };

  const addFieldOption = () => {
    setNewField(prev => ({
      ...prev,
      fieldOptions: [...prev.fieldOptions, '']
    }));
  };

  const updateFieldOption = (index: number, value: string) => {
    setNewField(prev => ({
      ...prev,
      fieldOptions: prev.fieldOptions.map((opt: string, i: number) => i === index ? value : opt)
    }));
  };

  const removeFieldOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      fieldOptions: prev.fieldOptions.filter((_: string, i: number) => i !== index)
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
        <p className="text-gray-600">Configure racks, custom fields, and operational settings</p>
      </div>

      {/* Warehouse Layout Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MapIcon className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Warehouse Layout</h3>
          </div>
          <div className="text-sm text-gray-500">
            Total Capacity: {racks.reduce((sum, rack) => sum + rack.capacity, 0)} units
          </div>
        </div>

        {/* Warehouse Visual */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {racks.map((rack) => {
            const utilizationPercentage = getUtilizationPercentage(rack);
            return (
              <div
                key={rack.id}
                className={`relative border-2 rounded-lg p-4 transition-all hover:shadow-md ${
                  rack.status === 'ACTIVE' ? 'border-green-200 bg-green-50' :
                  rack.status === 'MAINTENANCE' ? 'border-yellow-200 bg-yellow-50' :
                  'border-red-200 bg-red-50'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-lg">{rack.code}</div>
                  <div className="text-xs text-gray-500 mt-1">{rack.location}</div>
                  
                  {/* Utilization Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{rack.currentLoad}</span>
                      <span>{rack.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUtilizationColor(utilizationPercentage)}`}
                        style={{ width: `${utilizationPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{utilizationPercentage}%</div>
                  </div>

                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${rackTypeColors[rack.type]}`}>
                    {rack.type}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Add Rack Button */}
          <div
            onClick={() => setShowAddRack(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            <div className="text-center">
              <PlusIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500">Add Rack</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rack Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CubeIcon className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rack Management</h3>
          </div>
          <div className="flex space-x-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
              <PrinterIcon className="h-4 w-4" />
              <span>Print QR Codes</span>
            </button>
            <button
              onClick={() => setShowAddRack(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Rack</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {racks.map((rack) => (
                <tr key={rack.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{rack.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rack.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rackTypeColors[rack.type]}`}>
                      {rack.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rack.currentLoad} / {rack.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[rack.status]}`}>
                      {rack.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <QrCodeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 font-mono">{rack.qrCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-green-600 hover:text-green-900"
                        title="Print QR Code"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteRack(rack.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Rack"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Fields Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <TagIcon className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
          </div>
          <button
            onClick={() => { setEditingField(null); setShowAddField(true); }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <DocumentPlusIcon className="h-4 w-4" />
            <span>Add Field</span>
          </button>
        </div>

        {/* Field Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {customFields.filter(f => f.section === 'SHIPMENT').length}
            </div>
            <div className="text-sm text-gray-600">Shipment Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {customFields.filter(f => f.section === 'JOB').length}
            </div>
            <div className="text-sm text-gray-600">Job Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {customFields.filter(f => f.section === 'EXPENSE').length}
            </div>
            <div className="text-sm text-gray-600">Expense Fields</div>
          </div>
        </div>

        {/* Custom Fields by Section */}
        {['SHIPMENT', 'JOB', 'EXPENSE'].map((section) => (
          <div key={section} className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">{section} Fields</h4>
            <div className="space-y-2">
              {customFields
                .filter(field => field.section === section)
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">{field.name}</span>
                        <span className="text-sm text-gray-500">({field.type})</span>
                        {field.required && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                        )}
                      </div>
                      {field.options && (
                        <div className="text-sm text-gray-500 mt-1">
                          Options: {field.options.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditField(field)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Field"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Field"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Rack Modal */}
      {showAddRack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Rack</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rack Code</label>
                <input
                  type="text"
                  value={newRack.code}
                  onChange={(e) => setNewRack(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., A1, B2, C3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newRack.location}
                  onChange={(e) => setNewRack(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Section A - Row 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newRack.rackType}
                  onChange={(e) => setNewRack(prev => ({ ...prev, rackType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="STORAGE">Storage</option>
                  <option value="MATERIALS">Materials</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={newRack.capacityTotal}
                  onChange={(e) => setNewRack(prev => ({ ...prev, capacityTotal: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddRack}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Rack
              </button>
              <button
                onClick={() => setShowAddRack(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Custom Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
            </h3>

            {/* Field Templates (only show when adding) */}
            {!editingField && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyFieldTemplate('priority')}
                    className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100"
                  >
                    Priority Level
                  </button>
                  <button
                    onClick={() => applyFieldTemplate('insurance')}
                    className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100"
                  >
                    Insurance Value
                  </button>
                  <button
                    onClick={() => applyFieldTemplate('customerType')}
                    className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100"
                  >
                    Customer Type
                  </button>
                  <button
                    onClick={() => applyFieldTemplate('deliveryInstructions')}
                    className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100"
                  >
                    Delivery Instructions
                  </button>
                  <button
                    onClick={() => applyFieldTemplate('fragile')}
                    className="text-xs bg-white px-2 py-1 rounded border border-blue-300 hover:bg-blue-100"
                  >
                    Fragile Item
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
                <input
                  type="text"
                  value={newField.fieldName}
                  onChange={(e) => setNewField(prev => ({ ...prev, fieldName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Priority Level"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                <select
                  value={newField.fieldType}
                  onChange={(e) => setNewField(prev => ({ ...prev, fieldType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="DROPDOWN">Dropdown</option>
                  <option value="CHECKBOX">Checkbox</option>
                </select>
              </div>
              
              {newField.fieldType === 'DROPDOWN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                  {newField.fieldOptions.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateFieldOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder={`Option ${index + 1}`}
                      />
                      {newField.fieldOptions.length > 1 && (
                        <button
                          onClick={() => removeFieldOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addFieldOption}
                    className="text-primary-600 hover:text-primary-800 text-sm"
                  >
                    + Add Option
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={newField.section}
                  onChange={(e) => setNewField(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="SHIPMENT">Shipment</option>
                  <option value="JOB">Moving Job</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="required"
                  checked={newField.isRequired}
                  onChange={(e) => setNewField(prev => ({ ...prev, isRequired: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="required" className="ml-2 text-sm text-gray-700">Required field</label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingField ? handleUpdateField : handleAddCustomField}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingField ? 'Update Field' : 'Add Field'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

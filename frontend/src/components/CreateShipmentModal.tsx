import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI } from '../services/api';
import RackMapModal from './RackMapModal';

// Multi-dimension entry interface
interface DimensionEntry {
  id?: string;
  label: string;
  itemType: 'PALLET' | 'BOX' | 'CRATE' | 'CONTAINER' | 'LOOSE' | 'OTHER';
  quantity: number;
  length: string;
  width: string;
  height: string;
  cbm: number;
  totalCBM: number;
  weight: string;
  totalWeight: number | null;
  notes: string;
}

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
    palletCount: 0, // NEW: Pallet count
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
    // Dimensions & Pricing fields
    useDirectCBM: false, // NEW: Toggle for direct CBM vs dimensions
    directCBM: 0,        // NEW: Direct CBM input
    length: 0,  // cm
    width: 0,   // cm
    height: 0,  // cm
    weight: 0,  // kg
    customRateEnabled: false,
    customRatePerCBMPerDay: 0,
    customRatePerBoxPerDay: 0,
    customRateNotes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRackMap, setShowRackMap] = useState(false);

  // Multi-dimension state
  const [dimensions, setDimensions] = useState<DimensionEntry[]>([]);

  // Compute dimensions totals
  const dimensionsTotal = dimensions.reduce((acc, d) => ({
    totalCBM: acc.totalCBM + (d.totalCBM || 0),
    totalWeight: acc.totalWeight + (d.totalWeight || 0),
    totalItems: acc.totalItems + (d.quantity || 1)
  }), { totalCBM: 0, totalWeight: 0, totalItems: 0 });

  // Helper function to safely parse fieldOptions
  const parseFieldOptions = (fieldOptions: any): string[] => {
    if (!fieldOptions) return [];
    if (Array.isArray(fieldOptions)) return fieldOptions;
    if (typeof fieldOptions === 'string') {
      try {
        const parsed = JSON.parse(fieldOptions);
        return Array.isArray(parsed) ? parsed : fieldOptions.split(',').map((s: string) => s.trim());
      } catch {
        return fieldOptions.split(',').map((s: string) => s.trim());
      }
    }
    return [];
  };

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
        palletCount: 0, // NEW: Reset pallet count
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
        // Dimensions & Pricing fields
        useDirectCBM: false,
        directCBM: 0,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        customRateEnabled: false,
        customRatePerCBMPerDay: 0,
        customRatePerBoxPerDay: 0,
        customRateNotes: '',
      });
      setCustomFieldValues({});
      setDimensions([]); // Reset multi-dimensions
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // NEW: Auto-generate dimension rows based on pallet count and boxes per pallet
  useEffect(() => {
    const palletCount = Number(formData.palletCount) || 0;
    const boxesPerPallet = Number(formData.totalBoxCount) || 0;


    // Build new dimensions array from scratch based on counts
    const newDimensions: DimensionEntry[] = [];

    // Add pallet entries
    for (let i = 0; i < palletCount; i++) {
      // Check if we already have this pallet with data
      const existingPallet = dimensions.find(d => d.label === `Pallet ${i + 1}`);
      if (existingPallet) {
        newDimensions.push(existingPallet);
      } else {
        newDimensions.push({
          label: `Pallet ${i + 1}`,
          itemType: 'PALLET',
          quantity: 1,
          length: '',
          width: '',
          height: '',
          cbm: 0,
          totalCBM: 0,
          weight: '',
          totalWeight: null,
          notes: ''
        });
      }
    }

    // Keep any manually added custom dimensions (not auto-generated pallets/boxes)
    const customDimensions = dimensions.filter(d =>
      !d.label.startsWith('Pallet ') && !d.label.startsWith('Box ')
    );


    // Only update if actually different
    const finalDimensions = [...newDimensions, ...customDimensions];
    if (JSON.stringify(finalDimensions.map(d => d.label)) !== JSON.stringify(dimensions.map(d => d.label))) {
      setDimensions(finalDimensions);
    }
  }, [formData.palletCount, formData.totalBoxCount]);

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
            {parseFieldOptions(field.fieldOptions).map((option: string, index: number) => (
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

  // Add new dimension row
  const addDimension = () => {
    setDimensions(prev => [...prev, {
      label: `Item ${prev.length + 1}`,
      itemType: 'BOX',
      quantity: 1,
      length: '',
      width: '',
      height: '',
      cbm: 0,
      totalCBM: 0,
      weight: '',
      totalWeight: null,
      notes: ''
    }]);
  };

  // Remove dimension row
  const removeDimension = (index: number) => {
    setDimensions(prev => prev.filter((_, i) => i !== index));
  };

  // Update dimension row
  const updateDimension = (index: number, field: string, value: any) => {
    setDimensions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-calculate CBM when dimensions change
      if (['length', 'width', 'height', 'quantity'].includes(field)) {
        const l = parseFloat(updated[index].length) || 0;
        const w = parseFloat(updated[index].width) || 0;
        const h = parseFloat(updated[index].height) || 0;
        const qty = parseInt(String(updated[index].quantity)) || 1;
        const cbm = (l * w * h) / 1000000; // cm to m³
        updated[index].cbm = parseFloat(cbm.toFixed(4));
        updated[index].totalCBM = parseFloat((cbm * qty).toFixed(4));

        // Update weight too if present
        if (updated[index].weight) {
          updated[index].totalWeight = parseFloat((parseFloat(updated[index].weight) * qty).toFixed(2));
        }
      }

      // Update weight total
      if (field === 'weight') {
        const qty = parseInt(String(updated[index].quantity)) || 1;
        updated[index].totalWeight = value ? parseFloat((parseFloat(value) * qty).toFixed(2)) : null;
      }

      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Count') || name === 'estimatedValue' || name === 'length' || name === 'width' || name === 'height' || name === 'weight' || name === 'directCBM' || name.includes('Rate') ? Number(value) : value
    }));
  };

  // Get CBM value for submission (fallback for single dimension mode)
  const getCBMForSubmit = () => {
    if (formData.useDirectCBM && formData.directCBM > 0) {
      return formData.directCBM;
    }
    if (formData.length > 0 && formData.width > 0 && formData.height > 0) {
      return (formData.length * formData.width * formData.height) / 1000000;
    }
    return undefined;
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

      // Validate custom pricing
      if (formData.customRateEnabled && !formData.customRatePerCBMPerDay && !formData.customRatePerBoxPerDay) {
        throw new Error('Please set at least one custom rate (CBM or Box)');
      }

      // Set currentBoxCount = totalBoxCount if not specified
      const cbmValue = getCBMForSubmit();

      // Debug log
      console.log('📏 CreateShipment: Submitting dimensions:', {
        useDirectCBM: formData.useDirectCBM,
        length: formData.length,
        width: formData.width,
        height: formData.height,
        directCBM: formData.directCBM,
        calculatedCBM: cbmValue,
        multiDimensionsTotal: dimensionsTotal.totalCBM
      });

      // Use multi-dimensions total if dimensions exist, otherwise use single dimension
      const finalCBM = dimensions.length > 0 ? dimensionsTotal.totalCBM : cbmValue;

      const dataToSubmit = {
        ...formData,
        currentBoxCount: formData.currentBoxCount > 0 ? formData.currentBoxCount : formData.totalBoxCount,
        status: formData.rackId ? 'IN_STORAGE' : 'PENDING', // PENDING if no rack assigned yet
        rackId: formData.rackId || undefined, // Optional rack assignment
        // Dimensions - use multi-dimensions total or single dimension
        length: dimensions.length > 0 ? undefined : (formData.length > 0 ? formData.length : undefined),
        width: dimensions.length > 0 ? undefined : (formData.width > 0 ? formData.width : undefined),
        height: dimensions.length > 0 ? undefined : (formData.height > 0 ? formData.height : undefined),
        cbm: finalCBM, // Total CBM from multi-dimensions or single dimension
        weight: dimensions.length > 0 ? dimensionsTotal.totalWeight : (formData.weight > 0 ? formData.weight : undefined),
        customRateEnabled: formData.customRateEnabled,
        customRatePerCBMPerDay: formData.customRateEnabled && formData.customRatePerCBMPerDay > 0 ? formData.customRatePerCBMPerDay : undefined,
        customRatePerBoxPerDay: formData.customRateEnabled && formData.customRatePerBoxPerDay > 0 ? formData.customRatePerBoxPerDay : undefined,
        customRateNotes: formData.customRateEnabled && formData.customRateNotes ? formData.customRateNotes : undefined,
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

      // Save multi-dimensions if any
      if (dimensions.length > 0) {
        try {
          await shipmentsAPI.saveDimensionsBulk(shipmentId, dimensions);
        } catch (err) {
          console.error('Failed to save dimensions:', err);
        }
      }

      if (formData.rackId && formData.assignBoxCount > 0) {
        setSuccess(`✅ Shipment created! ${formData.assignBoxCount} boxes assigned to rack! CBM: ${finalCBM?.toFixed(4) || 0} m³`);
      } else if (formData.rackId) {
        setSuccess(`Shipment created and assigned to rack! ✅ CBM: ${finalCBM?.toFixed(4) || 0} m³`);
      } else {
        setSuccess(`Shipment created! Worker can scan to assign boxes. 📦 CBM: ${finalCBM?.toFixed(4) || 0} m³`);
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-3xl w-[95vw] md:w-auto md:max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200/50">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">New Shipment</h2>
            <p className="text-slate-400 text-sm">Enter shipment details and dimensions</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 min-h-[44px] min-w-[44px]"
            disabled={loading}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 w-full">
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
                  Pallet Count
                </label>
                <input
                  type="number"
                  name="palletCount"
                  value={formData.palletCount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
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

          {/* 📏 Multi-Dimensions Section (Same as Edit Modal) */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Dimensions & Volume</h3>
                <p className="text-sm text-slate-500">Add dimensions for each pallet or item group.</p>
              </div>
              <button
                type="button"
                onClick={addDimension}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Dimension
              </button>
            </div>

            {dimensions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer" onClick={addDimension}>
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                  <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-slate-700 font-medium">No dimensions added yet</p>
                <p className="text-slate-400 text-sm mt-1">Click to add pallets, boxes, or loose items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dimensions.map((dim, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-xs font-bold text-blue-600">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={dim.label}
                          onChange={(e) => updateDimension(index, 'label', e.target.value)}
                          placeholder="Label (e.g., Pallet 1)"
                          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                        />
                        <select
                          value={dim.itemType}
                          onChange={(e) => updateDimension(index, 'itemType', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="BOX">Box</option>
                          <option value="PALLET">Pallet</option>
                          <option value="CRATE">Crate</option>
                          <option value="LOOSE">Loose</option>
                          <option value="CARTON">Carton</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDimension(index)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove dimension"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={dim.quantity}
                          onChange={(e) => updateDimension(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">L (cm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.length}
                          onChange={(e) => updateDimension(index, 'length', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">W (cm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.width}
                          onChange={(e) => updateDimension(index, 'width', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">H (cm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.height}
                          onChange={(e) => updateDimension(index, 'height', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.weight}
                          onChange={(e) => updateDimension(index, 'weight', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Total CBM</label>
                        <div className="px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg font-semibold text-blue-700 text-center">
                          {dim.totalCBM.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Summary */}
                <div className="mt-4 p-4 bg-slate-900 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-400">Total Dimensions:</span>
                      <span className="ml-2 text-sm text-white font-semibold">{dimensions.length} entries</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase">Items</p>
                        <p className="text-lg font-bold text-white">{dimensionsTotal.totalItems}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase">Weight</p>
                        <p className="text-lg font-bold text-white">{dimensionsTotal.totalWeight.toFixed(2)} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase">Volume</p>
                        <p className="text-xl font-bold text-blue-400">{dimensionsTotal.totalCBM.toFixed(4)} m³</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Pricing */}
            <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="customRateEnabled"
                  name="customRateEnabled"
                  checked={formData.customRateEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, customRateEnabled: e.target.checked }))}
                  className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-500"
                />
                <label htmlFor="customRateEnabled" className="text-sm font-medium text-gray-700">
                  Enable Custom Pricing (Different rate for this customer/shipment)
                </label>
              </div>

              {formData.customRateEnabled && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
                  <p className="text-sm text-gray-700 font-medium">
                    Set custom rate (overrides company default):
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate per CBM per Day (KWD)
                      </label>
                      <input
                        type="number"
                        name="customRatePerCBMPerDay"
                        value={formData.customRatePerCBMPerDay || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="5.000"
                        min="0"
                        step="0.001"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Used if dimensions provided
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate per Box per Day (KWD)
                      </label>
                      <input
                        type="number"
                        name="customRatePerBoxPerDay"
                        value={formData.customRatePerBoxPerDay || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="0.500"
                        min="0"
                        step="0.001"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Fallback if no dimensions
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Rate Notes
                    </label>
                    <textarea
                      name="customRateNotes"
                      value={formData.customRateNotes}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="VIP customer special rate, bulk discount, etc."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rack Assignment */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Rack Assignment (Optional)</h3>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">
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
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Custom Fields</h3>
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
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-medium disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 transition-all"
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


import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI, companiesAPI } from '../services/api';
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

// Dimension entry interface
interface DimensionEntry {
  id?: string;
  label: string;
  itemType: string;
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

export default function EditShipmentModal({ isOpen, onClose, onSuccess, shipment }: EditShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [companyProfiles, setCompanyProfiles] = useState<any[]>([]);

  // Multi-dimension state
  const [dimensions, setDimensions] = useState<DimensionEntry[]>([]);
  const [loadingDimensions, setLoadingDimensions] = useState(false);

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
    // 📏 Dimensions - Now managed separately in dimensions array
    length: '',
    width: '',
    height: '',
    cbm: 0, // auto-calculated (m³) - Total from dimensions
    useDirectCBM: false, // Toggle for direct CBM vs dimensions
    directCBM: 0,        // Direct CBM input
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

      // Debug: Log shipment dimensions
      console.log('📏 EditShipment: Loading dimensions from shipment:', {
        length: shipment.length,
        width: shipment.width,
        height: shipment.height,
        cbm: shipment.cbm,
      });

      // Populate form with existing data (including new warehouse fields)
      setFormData({
        clientName: shipment.clientName || '',
        clientPhone: shipment.clientPhone || '',
        clientEmail: shipment.clientEmail || '',
        description: shipment.description || '',
        totalBoxCount: shipment.originalBoxCount || shipment.totalBoxCount || '',
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
        // 📏 Dimensions - convert to string for form inputs
        length: shipment.length ? String(shipment.length) : '',
        width: shipment.width ? String(shipment.width) : '',
        height: shipment.height ? String(shipment.height) : '',
        cbm: shipment.cbm ? Number(shipment.cbm) : 0,
        // Determine if direct CBM mode: has CBM but no dimensions
        useDirectCBM: Boolean(shipment.cbm && shipment.cbm > 0 && (!shipment.length || !shipment.width || !shipment.height)),
        directCBM: shipment.cbm ? Number(shipment.cbm) : 0,
      });
      setError('');
      setSuccess('');

      // Load multi-dimensions for this shipment
      loadDimensions();
    }
  }, [isOpen, shipment]);

  // Load dimensions for this shipment
  const loadDimensions = async () => {
    if (!shipment?.id) {
      console.log('❌ loadDimensions: No shipment ID');
      return;
    }
    try {
      setLoadingDimensions(true);
      console.log(`📦 loadDimensions: Fetching dimensions for shipment ${shipment.id}`);
      const response = await shipmentsAPI.getDimensions(shipment.id);
      console.log('📦 loadDimensions response:', response);
      if (response.dimensions && response.dimensions.length > 0) {
        setDimensions(response.dimensions.map((d: any) => ({
          id: d.id,
          label: d.label || '',
          itemType: d.itemType || 'BOX',
          quantity: d.quantity || 1,
          length: String(d.length || ''),
          width: String(d.width || ''),
          height: String(d.height || ''),
          cbm: d.cbm || 0,
          totalCBM: d.totalCBM || 0,
          weight: String(d.weight || ''),
          totalWeight: d.totalWeight || null,
          notes: d.notes || ''
        })));
        // Summary is computed locally from dimensions array via dimensionsTotal
      } else {
        // No dimensions yet - keep empty or migrate from single dimension
        if (shipment.length && shipment.width && shipment.height) {
          // Migrate existing single dimension to multi-dimension
          setDimensions([{
            label: 'Main',
            itemType: 'BOX',
            quantity: 1,
            length: String(shipment.length || ''),
            width: String(shipment.width || ''),
            height: String(shipment.height || ''),
            cbm: shipment.cbm || 0,
            totalCBM: shipment.cbm || 0,
            weight: '',
            totalWeight: null,
            notes: ''
          }]);
        } else {
          setDimensions([]);
        }
      }
    } catch (err) {
      console.error('Failed to load dimensions:', err);
    } finally {
      setLoadingDimensions(false);
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

  // Calculate dimensions total
  const dimensionsTotal = dimensions.reduce((acc, d) => ({
    totalCBM: acc.totalCBM + (d.totalCBM || 0),
    totalWeight: acc.totalWeight + (d.totalWeight || 0),
    totalItems: acc.totalItems + (d.quantity || 0)
  }), { totalCBM: 0, totalWeight: 0, totalItems: 0 });

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
      const profiles = await companiesAPI.listProfiles();
      const profileListRaw = Array.isArray(profiles)
        ? profiles
        : profiles && Array.isArray((profiles as any).profiles)
          ? (profiles as any).profiles
          : [];
      const activeProfiles = profileListRaw.filter(
        (profile: any) => profile?.isActive !== false
      );
      setCompanyProfiles(activeProfiles);
    } catch (err) {
      console.error('Failed to load company profiles:', err);
      setCompanyProfiles([]);
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
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: (name.includes('Count') || name === 'estimatedValue') ? parseNumberInput(value, true) : value
      };

      // Auto-calculate CBM when dimensions change (only if not using direct CBM)
      if (!updated.useDirectCBM && (name === 'length' || name === 'width' || name === 'height')) {
        const length = getSafeNumber(updated.length, 0);
        const width = getSafeNumber(updated.width, 0);
        const height = getSafeNumber(updated.height, 0);

        // CBM = (Length × Width × Height) / 1,000,000 (cm to m³)
        const cbm = length > 0 && width > 0 && height > 0
          ? (length * width * height) / 1000000
          : 0;

        return {
          ...updated,
          cbm: parseFloat(cbm.toFixed(4)), // Round to 4 decimals
        };
      }

      // Handle direct CBM input
      if (name === 'directCBM') {
        return {
          ...updated,
          cbm: parseFloat(Number(value).toFixed(4)),
        };
      }

      return updated;
    });
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
      // ✅ REMOVED: Box count validation (allow 0 for flexible editing)
      if (currentBoxCount > totalBoxCount && totalBoxCount > 0) {
        throw new Error('Current box count cannot exceed total box count');
      }
      // ✅ REMOVED: Rack validation (allow save without rack selection)
      // if (!formData.rackId) {
      //   throw new Error('Please select a rack');
      // }

      // Calculate CBM based on mode
      const finalCBM = formData.useDirectCBM
        ? (formData.directCBM || formData.cbm)
        : formData.cbm;

      // Debug log
      console.log('📏 EditShipment: Saving dimensions:', {
        useDirectCBM: formData.useDirectCBM,
        length: formData.length,
        width: formData.width,
        height: formData.height,
        cbm: finalCBM,
        directCBM: formData.directCBM
      });

      // Prepare update data with converted numbers + new warehouse fields
      const updateData: any = {
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

      // 📏 Dimensions - Only send if using single dimension mode (not multi-dimensions)
      // If multi-dimensions exist, they will update the CBM via saveDimensionsBulk
      if (dimensions.length === 0) {
        // Single dimension mode - send L×W×H and CBM
        updateData.length = getSafeNumber(formData.length) || null;
        updateData.width = getSafeNumber(formData.width) || null;
        updateData.height = getSafeNumber(formData.height) || null;
        updateData.cbm = finalCBM || null;
      }
      // If dimensions exist, skip dimension fields - they'll be updated by saveDimensionsBulk

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

      // Save dimensions (bulk save - replaces all)
      if (dimensions.length > 0) {
        try {
          const validDimensions = dimensions.filter(d =>
            parseFloat(d.length) > 0 && parseFloat(d.width) > 0 && parseFloat(d.height) > 0
          );
          if (validDimensions.length > 0) {
            console.log('📏 Saving dimensions to API:', validDimensions);
            const dimResult = await shipmentsAPI.saveDimensionsBulk(shipment.id, validDimensions);
            console.log('📏 Dimensions saved successfully:', dimResult);
          } else {
            console.log('📏 No valid dimensions to save (all have 0 values)');
          }
        } catch (err: any) {
          console.error('Failed to save dimensions:', err);
          // Show error to user but don't block shipment save
          alert(`⚠️ Shipment updated but dimensions failed to save: ${err.message || 'Unknown error'}`);
        }
      }

      alert(`✅ SUCCESS!\n\nShipment ${shipment.referenceId} has been updated successfully!\n\n📦 Current Boxes: ${currentBoxCount}\n📐 Total CBM: ${dimensionsTotal.totalCBM.toFixed(4)} m³`);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-[95vw] md:w-auto md:max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold">Edit Shipment</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-2 hover:bg-white/10 transition-all duration-200 min-h-[44px] min-w-[44px]"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 w-full">
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
                </label>
                <select
                  name="companyProfileId"
                  value={formData.companyProfileId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* 📏 Multi-Dimensions Section */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">📏 Dimensions (Multiple)</h3>
              <button
                type="button"
                onClick={addDimension}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                ➕ Add Dimension
              </button>
            </div>

            {loadingDimensions ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500">Loading dimensions...</span>
              </div>
            ) : dimensions.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No dimensions added yet</p>
                <button
                  type="button"
                  onClick={addDimension}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ➕ Add first dimension
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dimensions.map((dim, index) => (
                  <div key={dim.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <input
                          type="text"
                          value={dim.label}
                          onChange={(e) => updateDimension(index, 'label', e.target.value)}
                          placeholder="Label (e.g., Pallet 1)"
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 w-32"
                        />
                        <select
                          value={dim.itemType}
                          onChange={(e) => updateDimension(index, 'itemType', e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="BOX">📦 Box</option>
                          <option value="PALLET">📋 Pallet</option>
                          <option value="CRATE">🪵 Crate</option>
                          <option value="LOOSE">📦 Loose</option>
                          <option value="CARTON">📦 Carton</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDimension(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove dimension"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={dim.quantity}
                          onChange={(e) => updateDimension(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">L (cm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.length}
                          onChange={(e) => updateDimension(index, 'length', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">W (cm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.width}
                          onChange={(e) => updateDimension(index, 'width', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">H (cm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.height}
                          onChange={(e) => updateDimension(index, 'height', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={dim.weight}
                          onChange={(e) => updateDimension(index, 'weight', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">CBM</label>
                        <div className="px-2 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded font-semibold text-blue-700">
                          {dim.totalCBM.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Summary */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Total Dimensions:</span>
                      <span className="ml-2 text-sm text-gray-600">{dimensions.length} entries</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Items</p>
                        <p className="text-lg font-bold text-gray-700">{dimensionsTotal.totalItems}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Weight</p>
                        <p className="text-lg font-bold text-gray-700">{dimensionsTotal.totalWeight.toFixed(2)} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total CBM</p>
                        <p className="text-2xl font-bold text-blue-700">{dimensionsTotal.totalCBM.toFixed(4)} m³</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 CBM is used for storage charge calculation. Add multiple dimensions for pallets, loose boxes, etc.
                  </p>
                </div>
              </div>
            )}
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
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
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


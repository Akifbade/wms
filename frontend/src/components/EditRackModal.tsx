import React, { useState, useEffect } from 'react';
import { racksAPI, companiesAPI } from '../services/api';
import QRCode from 'qrcode';
import IconPickerModal from './IconPickerModal';

interface Category {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  icon?: string;
  description?: string;
  contractStatus?: string;
  contactPerson?: string;
  contactPhone?: string;
}

interface EditRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rack: any;
}

export default function EditRackModal({ isOpen, onClose, onSuccess, rack }: EditRackModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingZones, setExistingZones] = useState<Array<{ zone: string, zoneIcon: string, zoneDescription: string }>>([]);
  const [formData, setFormData] = useState({
    code: '',
    location: '',
    rackType: 'STORAGE',
    categoryId: '',
    companyProfileId: '',
    capacityTotal: 100,
    cbmCapacity: 0,
    status: 'ACTIVE',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'METERS',
    zone: '',
    zoneDescription: '',
    zoneIcon: '📦',
  });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<Category | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [useExistingZone, setUseExistingZone] = useState(false);

  const resolveLogoUrl = (logo?: string | null) => {
    if (!logo) return '';
    if (logo.startsWith('http')) return logo;
    return logo.startsWith('/') ? logo : `/uploads/${logo}`;
  };

  // Load categories and existing zones when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadExistingZones();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const profiles = await companiesAPI.listProfiles();
      const options: Category[] = (profiles || [])
        .filter((profile: any) => profile.isActive !== false)
        .map((profile: any) => ({
          id: profile.id,
          name: profile.name,
          description: profile.description,
          logo: profile.logo,
          contractStatus: profile.contractStatus,
          contactPerson: profile.contactPerson,
          contactPhone: profile.contactPhone,
          color: '#5B21B6',
          icon: '????',
        }));
      setCategories(options);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadExistingZones = async () => {
    try {
      const response = await racksAPI.getAll();
      const racks = response.racks || [];

      // Get unique zones with their icons and descriptions
      const zonesMap = new Map();
      racks.forEach((r: any) => {
        if (r.zone && r.zone !== 'Unassigned') {
          if (!zonesMap.has(r.zone)) {
            zonesMap.set(r.zone, {
              zone: r.zone,
              zoneIcon: r.zoneIcon || '📦',
              zoneDescription: r.zoneDescription || ''
            });
          }
        }
      });

      setExistingZones(Array.from(zonesMap.values()).sort((a, b) => a.zone.localeCompare(b.zone)));
    } catch (err) {
      console.error('Failed to load existing zones:', err);
    }
  };

  const handleZoneSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedZone = e.target.value;
    if (selectedZone === 'current') {
      // Keep current rack's zone
      setUseExistingZone(false);
    } else if (selectedZone === 'new') {
      setUseExistingZone(false);
      setFormData(prev => ({ ...prev, zone: '', zoneIcon: '📦', zoneDescription: '' }));
    } else {
      const zone = existingZones.find(z => z.zone === selectedZone);
      if (zone) {
        setUseExistingZone(true);
        setFormData(prev => ({
          ...prev,
          zone: zone.zone,
          zoneIcon: zone.zoneIcon,
          zoneDescription: zone.zoneDescription,
          location: `Zone ${zone.zone}, Rack ${prev.code}`
        }));
      }
    }
  };

  useEffect(() => {
    if (isOpen && rack) {
      // Populate form with existing data
      setFormData({
        code: rack.code || '',
        location: rack.location || '',
        rackType: rack.rackType || 'STORAGE',
        categoryId: rack.companyProfileId || rack.categoryId || '',
        companyProfileId: rack.companyProfileId || '',
        capacityTotal: rack.capacityTotal || 100,
        status: rack.status || 'ACTIVE',
        length: rack.length || '',
        width: rack.width || '',
        height: rack.height || '',
        dimensionUnit: rack.dimensionUnit || 'METERS',
        zone: rack.zone || '',
        zoneDescription: rack.zoneDescription || '',
        zoneIcon: rack.zoneIcon || '📦',
        cbmCapacity: rack.cbmCapacity || 0,
      });

      // Set selected category info
      if (rack.companyProfile) {
        setSelectedCategoryInfo({
          id: rack.companyProfile.id,
          name: rack.companyProfile.name,
          logo: rack.companyProfile.logo,
          description: rack.companyProfile.description,
          contractStatus: rack.companyProfile.contractStatus,
          contactPerson: rack.companyProfile.contactPerson,
          contactPhone: rack.companyProfile.contactPhone,
          color: '#5B21B6',
          icon: '????',
        });
      } else if (rack.category) {
        setSelectedCategoryInfo(rack.category);
      }

      // Generate QR code for existing rack
      if (rack.code) {
        generateQRCode(rack.code);
      }

      setError('');
      setSuccess('');
    }
  }, [isOpen, rack]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: (name === 'capacityTotal' || name === 'cbmCapacity') ? Number(value) : value
      } as typeof prev;

      if (name === 'categoryId') {
        next.companyProfileId = value;
      }

      return next;
    });

    // If category changed, update the selected category info
    if (name === 'categoryId') {
      const selected = categories.find(c => c.id === value);
      setSelectedCategoryInfo(selected || null);
    }
  };

  const generateQRCode = async (code: string) => {
    try {
      const qrData = `RACK_${code.replace(/-/g, '_')}`;
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, code }));

    // Generate QR code preview if code is not empty
    if (code.length > 0) {
      generateQRCode(code);
    } else {
      setQrCodeUrl('');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `rack-${formData.code}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.code || !formData.location) {
        throw new Error('Rack code and location are required');
      }
      if (formData.capacityTotal <= 0) {
        throw new Error('Capacity must be greater than 0');
      }
      if (formData.capacityTotal < rack.capacityUsed) {
        throw new Error(`Cannot reduce capacity below current usage (${rack.capacityUsed})`);
      }

      const {
        categoryId: _unusedCategoryId,
        companyProfileId: _unusedCompanyProfileId,
        length,
        width,
        height,
        ...rest
      } = formData;

      const dataToSubmit = {
        ...rest,
        length: length ? parseFloat(length as string) : undefined,
        width: width ? parseFloat(width as string) : undefined,
        height: height ? parseFloat(height as string) : undefined,
        categoryId: undefined,
        companyProfileId: (formData.companyProfileId || formData.categoryId) || undefined,
      };

      await racksAPI.update(rack.id, dataToSubmit);

      setSuccess('Rack updated successfully! ???');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update rack');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !rack) return null;

  const utilizationPercent = Math.round((rack.capacityUsed / rack.capacityTotal) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">?????? Edit Rack</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
            disabled={loading}
          >
            ??
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

          {/* Current Usage Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Current Usage</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {rack.capacityUsed} / {rack.capacityTotal} items ({utilizationPercent}%)
              </span>
              <div className="w-32 bg-blue-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${utilizationPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rack Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleCodeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                  placeholder="A1, B2, C3..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use format like A1, A2, B1, etc.
                </p>
              </div>

              {/* Zone Selector - Optional */}
              {existingZones.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    📍 Quick Select Zone (Optional)
                  </label>
                  <select
                    value={useExistingZone ? 'current' : 'new'}
                    onChange={handleZoneSelect}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="current">Keep Current Zone</option>
                    <option value="new">Create New Zone</option>
                    <optgroup label="Existing Zones">
                      {existingZones.map((zone) => (
                        <option key={zone.zone} value={zone.zone}>
                          {zone.zoneIcon ? `${zone.zoneIcon} ` : ''}
                          {zone.zone}
                          {zone.zoneDescription ? ` - ${zone.zoneDescription}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-xs text-blue-700 mt-2">
                    💡 Select an existing zone to auto-fill zone details
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  disabled={useExistingZone}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${useExistingZone ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  placeholder="e.g., Zone A, Warehouse 1, Floor 2..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Main zone identifier (e.g., "Zone A")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Icon
                </label>
                <input
                  type="text"
                  name="zoneIcon"
                  value={formData.zoneIcon || ''}
                  onChange={handleChange}
                  disabled={useExistingZone}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${useExistingZone ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  placeholder="e.g., 📦 🏢 🚚"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional emoji or icon
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Description
                </label>
                <input
                  type="text"
                  name="zoneDescription"
                  value={formData.zoneDescription || ''}
                  onChange={handleChange}
                  disabled={useExistingZone}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${useExistingZone ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  placeholder="e.g., Cold Storage, Main Warehouse..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional description of the zone
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Zone A, Floor 1, Section 2, Row 3..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Physical location in warehouse (e.g., "Zone A, Floor 2")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rack Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="rackType"
                  value={formData.rackType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="STORAGE">Storage</option>
                  <option value="MATERIALS">Materials</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Profile (Owner)
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Company Profile...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      🏢 {cat.name}
                    </option>
                  ))}
                </select>
                {selectedCategoryInfo && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <div className="flex items-center gap-2">
                      {selectedCategoryInfo.logo && (
                        <img
                          src={resolveLogoUrl(selectedCategoryInfo.logo)}
                          alt={`${selectedCategoryInfo.name} logo`}
                          className="h-10 w-10 rounded-md object-contain bg-white border border-blue-200"
                        />
                      )}
                      <div>
                        <p className="font-medium text-blue-900">{selectedCategoryInfo.name}</p>
                        {selectedCategoryInfo.contractStatus && (
                          <p className="text-blue-600 text-xs uppercase font-semibold">
                            {selectedCategoryInfo.contractStatus}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedCategoryInfo.description && (
                      <p className="text-blue-700 text-xs mt-1">{selectedCategoryInfo.description}</p>
                    )}
                    {(selectedCategoryInfo.contactPerson || selectedCategoryInfo.contactPhone) && (
                      <p className="text-blue-700 text-xs mt-1">
                        {selectedCategoryInfo.contactPerson && `Contact: ${selectedCategoryInfo.contactPerson}`}
                        {selectedCategoryInfo.contactPerson && selectedCategoryInfo.contactPhone && ' ?? '}
                        {selectedCategoryInfo.contactPhone && `Phone: ${selectedCategoryInfo.contactPhone}`}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Which company/client owns the items stored in this rack?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="capacityTotal"
                  value={formData.capacityTotal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="100"
                  min={rack.capacityUsed}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: {rack.capacityUsed} (current usage)
                </p>
              </div>

              {/* CBM Capacity - Individual Rack Setting */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <label className="block text-sm font-semibold text-purple-800 mb-1">
                  📦 CBM Capacity (m³)
                </label>
                <input
                  type="number"
                  name="cbmCapacity"
                  value={formData.cbmCapacity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  placeholder="e.g., 5.0 or 40.0"
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-purple-600 mt-1">
                  Max cubic meters this rack can hold (e.g., Ground = 40, Normal = 5)
                </p>
                {rack.cbmUsed > 0 && (
                  <p className="text-xs text-purple-700 mt-1 font-medium">
                    Currently using: {(rack.cbmUsed || 0).toFixed(2)} m³
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="RESERVED">Reserved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">???? Dimensions (Size Information)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length
                </label>
                <input
                  type="number"
                  name="length"
                  value={formData.length}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  name="dimensionUnit"
                  value={formData.dimensionUnit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="METERS">Meters</option>
                  <option value="FEET">Feet</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ???? Optional: Enter rack physical dimensions for detailed tracking
            </p>
          </div>

          {/* QR Code Preview */}
          {qrCodeUrl && (
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">QR Code</h3>
              <div className="flex flex-col items-center space-y-3">
                <img src={qrCodeUrl} alt="QR Code" className="border-2 border-gray-300 rounded p-2" />
                <p className="text-sm text-gray-600">
                  Scan this code to identify rack: <span className="font-bold">{formData.code}</span>
                </p>
                <button
                  type="button"
                  onClick={downloadQRCode}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 font-medium text-sm"
                >
                  ???? Download QR Code
                </button>
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
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Rack'}
            </button>
          </div>
        </form>
      </div>

      {/* Icon Picker Modal */}
      <IconPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(icon) => setFormData(prev => ({ ...prev, zoneIcon: icon }))}
        currentIcon={formData.zoneIcon}
      />
    </div>
  );
}


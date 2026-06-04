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

interface CreateRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRackModal({ isOpen, onClose, onSuccess }: CreateRackModalProps) {
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
      racks.forEach((rack: any) => {
        if (rack.zone && rack.zone !== 'Unassigned') {
          if (!zonesMap.has(rack.zone)) {
            zonesMap.set(rack.zone, {
              zone: rack.zone,
              zoneIcon: rack.zoneIcon || '📦',
              zoneDescription: rack.zoneDescription || ''
            });
          }
        }
      });

      setExistingZones(Array.from(zonesMap.values()).sort((a, b) => a.zone.localeCompare(b.zone)));
    } catch (err) {
      console.error('Failed to load existing zones:', err);
    }
  };

  const handleZoneSelect = (selectedZone: string) => {
    if (selectedZone === 'new') {
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
          zoneDescription: zone.zoneDescription
        }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFormData({
        code: '',
        location: '',
        rackType: 'STORAGE',
        categoryId: '',
        companyProfileId: '',
        capacityTotal: 100,
        status: 'ACTIVE',
        length: '',
        width: '',
        height: '',
        dimensionUnit: 'METERS',
        zone: '',
        zoneDescription: '',
        zoneIcon: '📦',
      });
      setQrCodeUrl('');
      setError('');
      setSuccess('');
      setSelectedCategoryInfo(null);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: name === 'capacityTotal' ? Number(value) : value,
      } as typeof prev;

      if (name === 'categoryId') {
        next.companyProfileId = value;
      }

      // Auto-generate location from zone and rack code
      if (name === 'zone' || name === 'code') {
        const zone = name === 'zone' ? value : prev.zone;
        const code = name === 'code' ? value : prev.code;
        if (zone && code) {
          next.location = `Zone ${zone}, Rack ${code}`;
        }
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

      // Generate unique QR code for the rack
      const qrCode = `RACK-${formData.code}-${Date.now()}`;

      const selectedCompanyProfileId = formData.companyProfileId || formData.categoryId || '';

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
        qrCode,
        capacityUsed: 0,
        zone: formData.zone.trim() || 'Unassigned', // Same as Bulk Add
        zoneDescription: formData.zoneDescription || '',
        zoneIcon: formData.zoneIcon || '📦',
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        height: height ? parseFloat(height) : undefined,
        categoryId: undefined,
        companyProfileId: selectedCompanyProfileId ? selectedCompanyProfileId : undefined,
      };

      await racksAPI.create(dataToSubmit);

      setSuccess('Rack created successfully! ???');

      // Generate final QR code for download
      await generateQRCode(formData.code);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create rack');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-[95vw] md:w-auto md:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">???? Create New Rack</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold min-h-[44px] min-w-[44px]"
            disabled={loading}
          >
            ×
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

          {/* Zone Configuration - SAME AS BULK ADD */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">🏢 Zone Configuration</h3>
            <div className="space-y-4">
              {/* Existing Zone Selector */}
              {existingZones.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Select Existing Zone (Optional)
                  </label>
                  <select
                    onChange={(e) => handleZoneSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="new">➕ Create New Zone</option>
                    {existingZones.map((zone) => (
                      <option key={zone.zone} value={zone.zone}>
                        {zone.zoneIcon} Zone {zone.zone} {zone.zoneDescription ? `- ${zone.zoneDescription}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    ⚡ Quick way to add rack to existing zone
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    placeholder="e.g., 1, 2, A, B..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={useExistingZone}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 {useExistingZone ? 'Auto-filled from selected zone' : 'Physical zone where this rack is located'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Icon
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-3"
                    disabled={useExistingZone}
                  >
                    <span className="text-3xl">{formData.zoneIcon}</span>
                    <span className="text-gray-600">{useExistingZone ? 'From selected zone' : 'Click to change'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone Description
                </label>
                <textarea
                  name="zoneDescription"
                  value={formData.zoneDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, zoneDescription: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Describe this zone's purpose or location..."
                  disabled={useExistingZone}
                />
                {useExistingZone && (
                  <p className="text-xs text-blue-600 mt-1">
                    ℹ️ Using existing zone settings
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Profile (Owner)
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Company Profile...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      🏢 {cat.name}
                    </option>
                  ))}
                </select>
                {selectedCategoryInfo && (
                  <div className="mt-2 p-3 bg-white border border-blue-200 rounded-lg text-sm">
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rack Code & Basic Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">📦 Rack Code & Settings</h3>
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
                  placeholder="e.g., 1A, 2B, 3C..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique rack identifier (e.g., 1A, 2B, 3C)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Auto-generated)
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  placeholder="Will auto-generate from Zone + Rack Code"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-created from zone and rack code
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
                  Total Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="capacityTotal"
                  value={formData.capacityTotal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="100"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of items/boxes
                </p>
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
              <h3 className="text-lg font-semibold mb-4 text-gray-700">QR Code Preview</h3>
              <div className="flex flex-col items-center space-y-3">
                <img src={qrCodeUrl} alt="QR Code" className="border-2 border-gray-300 rounded p-2" />
                <p className="text-sm text-gray-600">
                  Scan this code to identify rack: <span className="font-bold">{formData.code}</span>
                </p>
                {success && (
                  <button
                    type="button"
                    onClick={downloadQRCode}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 font-medium text-sm"
                  >
                    ???? Download QR Code
                  </button>
                )}
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
              className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Rack'}
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


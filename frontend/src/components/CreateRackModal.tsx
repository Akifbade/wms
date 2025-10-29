import React, { useState, useEffect } from 'react';
import { racksAPI, companiesAPI } from '../services/api';
import QRCode from 'qrcode';

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
  });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<Category | null>(null);

  const resolveLogoUrl = (logo?: string | null) => {
    if (!logo) return '';
    if (logo.startsWith('http')) return logo;
    return logo.startsWith('/') ? logo : `/uploads/${logo}`;
  };

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
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
          icon: '🏢',
        }));
      setCategories(options);
    } catch (err) {
      console.error('Failed to load categories:', err);
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
      const qrData = `RACK:${code}`;
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
      
      const selectedCompanyProfileId = formData.categoryId || null;

      const dataToSubmit = {
        ...formData,
        qrCode,
        capacityUsed: 0,
        // Convert dimension strings to numbers or null
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        categoryId: null,
        companyProfileId: selectedCompanyProfileId,
      };

      await racksAPI.create(dataToSubmit);
      
      setSuccess('Rack created successfully! ✅');
      
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">🏪 Create New Rack</h2>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Zone A, Floor 1, Section North..."
                  required
                />
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
                  Category / Company
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Category / Company...</option>
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
                        {selectedCategoryInfo.contactPerson && selectedCategoryInfo.contactPhone && ' · '}
                        {selectedCategoryInfo.contactPhone && `Phone: ${selectedCategoryInfo.contactPhone}`}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select which company/category this rack belongs to
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
            <h3 className="text-lg font-semibold mb-4 text-gray-700">📏 Dimensions (Size Information)</h3>
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
              💡 Optional: Enter rack physical dimensions for detailed tracking
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
                    📥 Download QR Code
                  </button>
                )}
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
              {loading ? 'Creating...' : 'Create Rack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

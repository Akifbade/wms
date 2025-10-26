import React, { useState, useEffect } from 'react';
import { racksAPI } from '../services/api';
import QRCode from 'qrcode';

interface EditRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rack: any;
}

export default function EditRackModal({ isOpen, onClose, onSuccess, rack }: EditRackModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    location: '',
    rackType: 'STORAGE',
    capacityTotal: 100,
    status: 'ACTIVE',
  });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && rack) {
      // Populate form with existing data
      setFormData({
        code: rack.code || '',
        location: rack.location || '',
        rackType: rack.rackType || 'STORAGE',
        capacityTotal: rack.capacityTotal || 100,
        status: rack.status || 'ACTIVE',
      });
      
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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacityTotal' ? Number(value) : value
    }));
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
      if (formData.capacityTotal < rack.capacityUsed) {
        throw new Error(`Cannot reduce capacity below current usage (${rack.capacityUsed})`);
      }

      await racksAPI.update(rack.id, formData);
      
      setSuccess('Rack updated successfully! ✅');
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
          <h2 className="text-xl font-bold">✏️ Edit Rack</h2>
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
                  📥 Download QR Code
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
    </div>
  );
}

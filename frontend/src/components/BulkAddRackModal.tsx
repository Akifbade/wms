import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { racksAPI, companiesAPI } from '../services/api';

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

interface BulkAddRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkAddRackModal: React.FC<BulkAddRackModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({
    zone: '',
    prefix: '',
    startNumber: 1, // 1=A
    endNumber: 6,   // 6=F (creates A, B, C, D, E, F)
    location: '',
    categoryId: '',
    companyProfileId: '',
    capacityMode: 'FLEXIBLE' as 'FIXED' | 'FLEXIBLE' | 'UNLIMITED',
    // Fixed capacity
    capacityTotal: 100,
    // Flexible capacity
    palletCapacity: 3,
    boxCapacity: 50,
    // Unlimited
    capacityNotes: '',
    // Common
    rackType: 'STORAGE' as 'STORAGE' | 'MATERIALS' | 'EQUIPMENT'
  });

  const resolveLogoUrl = (logo?: string | null) => {
    if (!logo) return '';
    if (logo.startsWith('http')) return logo;
    return logo.startsWith('/') ? logo : `/uploads/${logo}`;
  };

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setError('');
      setSuccess('');
      setSelectedCategoryInfo(null);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: name === 'capacityTotal' ? Number(value) : value,
      };

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

  // Convert number to letter (1=A, 2=B, 3=C, etc.)
  const numberToLetter = (num: number): string => {
    return String.fromCharCode(64 + num); // 65 is 'A', so 64+1=A
  };

  const getPreviewRacks = () => {
    const { prefix, startNumber, endNumber } = formData;
    const count = Math.min(endNumber - startNumber + 1, 5); // Show max 5 previews
    return Array.from({ length: count }, (_, i) => {
      const num = startNumber + i;
      const letter = numberToLetter(num);
      return `${prefix}${letter}`;
    });
  };

  const getTotalCount = () => {
    return Math.max(0, formData.endNumber - formData.startNumber + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalCount = getTotalCount();
    if (totalCount <= 0) {
      setError('End number must be greater than or equal to start number');
      return;
    }
    
    if (totalCount > 100) {
      setError('Cannot create more than 100 racks at once. Please reduce the range.');
      return;
    }

    if (!formData.zone.trim() || !formData.prefix.trim()) {
      setError('❌ Zone and prefix are required! Please enter a zone number (e.g., 1, 2, 3)');
      console.error('🚫 BULK ADD VALIDATION FAILED:', {
        zone: formData.zone,
        zoneTrimmed: formData.zone.trim(),
        prefix: formData.prefix,
        prefixTrimmed: formData.prefix.trim()
      });
      return;
    }

    // 🐛 DEBUG: Log form data before creating racks
    console.log('✅ BULK ADD VALIDATION PASSED - Starting rack creation:', {
      zone: formData.zone,
      prefix: formData.prefix,
      startNumber: formData.startNumber,
      endNumber: formData.endNumber,
      totalRacks: formData.endNumber - formData.startNumber + 1
    });

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const racksToCreate = [];
      
      for (let i = formData.startNumber; i <= formData.endNumber; i++) {
        const letter = numberToLetter(i);
        const rackCode = `${formData.prefix}${letter}`;
        const location = formData.location.replace('{n}', letter);
        
        const selectedCompanyProfileId = formData.companyProfileId || formData.categoryId || '';
        
        const rackData: any = {
          code: rackCode,
          zone: formData.zone.trim() || 'Unassigned', // Ensure zone is not empty
          location: location || `Zone ${formData.zone}, Rack ${rackCode}`,
          rackType: formData.rackType,
          capacityMode: formData.capacityMode,
          status: 'ACTIVE'
        };

        // 🐛 DEBUG: Log what we're sending
        if (i === formData.startNumber) { // Only log first rack to avoid spam
          console.log('🎯 BULK ADD - Creating racks with data:', {
            prefix: formData.prefix,
            zone: formData.zone,
            zoneAfterTrim: formData.zone.trim(),
            finalZoneValue: rackData.zone,
            firstRackCode: rackCode
          });
        }

        // Add company profile if selected
        if (selectedCompanyProfileId) {
          rackData.companyProfileId = selectedCompanyProfileId;
        }

        // Set capacity based on mode
        if (formData.capacityMode === 'FIXED') {
          rackData.capacityTotal = formData.capacityTotal;
          rackData.capacityUsed = 0;
        } else if (formData.capacityMode === 'FLEXIBLE') {
          rackData.palletCapacity = formData.palletCapacity;
          rackData.boxCapacity = formData.boxCapacity;
          rackData.currentPallets = 0;
          rackData.currentBoxes = 0;
          rackData.capacityTotal = formData.boxCapacity; // For backwards compatibility
          rackData.capacityNotes = `${formData.palletCapacity} pallets OR ${formData.boxCapacity} boxes`;
        } else if (formData.capacityMode === 'UNLIMITED') {
          rackData.capacityTotal = 999999;
          rackData.capacityUsed = 0;
          rackData.capacityNotes = formData.capacityNotes || 'Unlimited capacity - open warehouse space';
        }

        racksToCreate.push(rackData);
      }

      // Create racks one by one (could be optimized with bulk API endpoint later)
      let successCount = 0;
      let errorCount = 0;

      for (const rackData of racksToCreate) {
        try {
          await racksAPI.create(rackData);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to create rack ${rackData.code}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`✅ Successfully created ${successCount} rack(s)!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(`❌ Failed to create racks. Please check for duplicate codes.`);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create racks');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">⚡ Bulk Add Racks</h2>
              <p className="text-blue-100 text-sm">Create multiple racks at once with auto-numbering</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Zone Configuration */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center gap-2">
              🏢 Zone Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  placeholder="e.g., 1, 2, 3, 4..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Enter zone number like <strong>1</strong>, then create racks <strong>1A, 1B, 1C, 1D</strong> with prefix below
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category / Company
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category / Company...</option>
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

          {/* Numbering System */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center gap-2">
              🔢 Rack Code System
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rack Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="prefix"
                  value={formData.prefix}
                  onChange={handleChange}
                  placeholder="e.g., 1 (creates 1A, 1B, 1C...)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Example: Code "1" creates: <strong>1A, 1B, 1C, 1D</strong> (using A, B, C... below)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Letter (1=A, 2=B...)
                </label>
                <input
                  type="number"
                  name="startNumber"
                  value={formData.startNumber}
                  onChange={handleChange}
                  min="1"
                  max="26"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">1=A, 2=B, 3=C...</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Letter (1=A, 2=B...)
                </label>
                <input
                  type="number"
                  name="endNumber"
                  value={formData.endNumber}
                  onChange={handleChange}
                  min={formData.startNumber}
                  max="26"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">1=A, 4=D, 6=F...</p>
              </div>
            </div>
            
            {/* Preview */}
            <div className="mt-4 p-3 bg-white rounded-lg border-2 border-green-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Preview:</span>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  {getTotalCount()} racks
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {getPreviewRacks().map((code, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-mono font-bold rounded-lg border border-green-300">
                    {code}
                  </span>
                ))}
                {getTotalCount() > 5 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-mono rounded-lg">
                    ... +{getTotalCount() - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Location Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Template (optional)
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Zone 7, Row {n} - Use {n} for auto number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{n}'}</code> for auto-incrementing number
            </p>
          </div>

          {/* Capacity Configuration */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center gap-2">
              📏 Capacity Configuration
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, capacityMode: 'FIXED' }))}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.capacityMode === 'FIXED'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📊 Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, capacityMode: 'FLEXIBLE' }))}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.capacityMode === 'FLEXIBLE'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🔄 Flexible
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, capacityMode: 'UNLIMITED' }))}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.capacityMode === 'UNLIMITED'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  ∞ Unlimited
                </button>
              </div>
            </div>

            {formData.capacityMode === 'FIXED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Capacity (boxes)
                </label>
                <input
                  type="number"
                  name="capacityTotal"
                  value={formData.capacityTotal}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {formData.capacityMode === 'FLEXIBLE' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Pallets
                  </label>
                  <input
                    type="number"
                    name="palletCapacity"
                    value={formData.palletCapacity}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OR Max Boxes
                  </label>
                  <input
                    type="number"
                    name="boxCapacity"
                    value={formData.boxCapacity}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2 p-3 bg-green-100 rounded-lg border border-green-300">
                  <p className="text-sm text-green-800">
                    <strong>Example:</strong> {formData.palletCapacity} pallets OR {formData.boxCapacity} loose boxes OR mixed
                  </p>
                </div>
              </div>
            )}

            {formData.capacityMode === 'UNLIMITED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  name="capacityNotes"
                  value={formData.capacityNotes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g., Open warehouse space, no strict capacity limit"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
              <p className="text-green-800 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading || getTotalCount() <= 0}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  Create {getTotalCount()} Rack{getTotalCount() !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAddRackModal;

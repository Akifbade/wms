import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
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

interface AddRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMode?: 'single' | 'bulk';
}

type ModeType = 'single' | 'bulk';

export default function AddRackModal({ isOpen, onClose, onSuccess, defaultMode = 'single' }: AddRackModalProps) {
  const [mode, setMode] = useState<ModeType>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingZones, setExistingZones] = useState<Array<{ zone: string, zoneIcon: string, zoneDescription: string }>>([]);

  // ─── Single Mode State ───────────────────────────────────────────────
  const [singleFormData, setSingleFormData] = useState({
    code: '',
    location: '',
    rackType: 'STORAGE',
    categoryId: '',
    companyProfileId: '',
    capacityTotal: 100,
    cbmCapacity: 100,
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
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<Category | null>(null);
  const [useExistingZone, setUseExistingZone] = useState(false);

  // ─── Bulk Mode State ─────────────────────────────────────────────────
  const [bulkFormData, setBulkFormData] = useState({
    zone: '',
    zoneDescription: '',
    zoneIcon: '📦',
    prefix: '',
    startNumber: 1,
    endNumber: 6,
    location: '',
    categoryId: '',
    companyProfileId: '',
    capacityMode: 'FLEXIBLE' as 'FIXED' | 'FLEXIBLE' | 'UNLIMITED',
    capacityTotal: 100,
    palletCapacity: 3,
    boxCapacity: 50,
    capacityNotes: '',
    rackType: 'STORAGE' as 'STORAGE' | 'MATERIALS' | 'EQUIPMENT',
  });

  // ─── Shared State ────────────────────────────────────────────────────
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resolveLogoUrl = (logo?: string | null) => {
    if (!logo) return '';
    if (logo.startsWith('http')) return logo;
    return logo.startsWith('/') ? logo : `/uploads/${logo}`;
  };

  // ─── Data Loading ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadExistingZones();
      setError('');
      setSuccess('');
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  useEffect(() => {
    if (isOpen) {
      // Reset all forms when modal opens
      resetForms();
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

  const loadExistingZones = async () => {
    try {
      const response = await racksAPI.getAll();
      const racks = response.racks || [];

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

  // ─── Form Reset ──────────────────────────────────────────────────────
  const resetForms = () => {
    setSingleFormData({
      code: '',
      location: '',
      rackType: 'STORAGE',
      categoryId: '',
      companyProfileId: '',
      capacityTotal: 100,
      cbmCapacity: 100,
      status: 'ACTIVE',
      length: '',
      width: '',
      height: '',
      dimensionUnit: 'METERS',
      zone: '',
      zoneDescription: '',
      zoneIcon: '📦',
    });
    setBulkFormData({
      zone: '',
      zoneDescription: '',
      zoneIcon: '📦',
      prefix: '',
      startNumber: 1,
      endNumber: 6,
      location: '',
      categoryId: '',
      companyProfileId: '',
      capacityMode: 'FLEXIBLE',
      capacityTotal: 100,
      palletCapacity: 3,
      boxCapacity: 50,
      capacityNotes: '',
      rackType: 'STORAGE',
    });
    setQrCodeUrl('');
    setError('');
    setSuccess('');
    setSelectedCategoryInfo(null);
    setUseExistingZone(false);
  };

  // ─── Single Mode Handlers ────────────────────────────────────────────
  const handleSingleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSingleFormData(prev => {
      const next = {
        ...prev,
        [name]: (name === 'capacityTotal' || name === 'cbmCapacity') ? Number(value) : value,
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

    if (name === 'categoryId') {
      const selected = categories.find(c => c.id === value);
      setSelectedCategoryInfo(selected || null);
    }
  };

  const handleZoneSelect = (selectedZone: string) => {
    if (selectedZone === 'new') {
      setUseExistingZone(false);
      if (mode === 'single') {
        setSingleFormData(prev => ({ ...prev, zone: '', zoneIcon: '📦', zoneDescription: '' }));
      } else {
        setBulkFormData(prev => ({ ...prev, zone: '', zoneIcon: '📦', zoneDescription: '' }));
      }
    } else {
      const zone = existingZones.find(z => z.zone === selectedZone);
      if (zone) {
        setUseExistingZone(true);
        if (mode === 'single') {
          setSingleFormData(prev => ({
            ...prev,
            zone: zone.zone,
            zoneIcon: zone.zoneIcon,
            zoneDescription: zone.zoneDescription
          }));
        } else {
          setBulkFormData(prev => ({
            ...prev,
            zone: zone.zone,
            zoneIcon: zone.zoneIcon,
            zoneDescription: zone.zoneDescription
          }));
        }
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setSingleFormData(prev => ({ ...prev, code }));

    if (code.length > 0) {
      generateQRCode(code);
    } else {
      setQrCodeUrl('');
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

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `rack-${singleFormData.code}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Bulk Mode Handlers ──────────────────────────────────────────────
  const handleBulkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBulkFormData(prev => {
      const next = {
        ...prev,
        [name]: name === 'capacityTotal' || name === 'palletCapacity' || name === 'boxCapacity' || name === 'startNumber' || name === 'endNumber' ? Number(value) : value,
      } as typeof prev;

      if (name === 'categoryId') {
        next.companyProfileId = value;
      }

      return next;
    });

    if (name === 'categoryId') {
      const selected = categories.find(c => c.id === value);
      setSelectedCategoryInfo(selected || null);
    }
  };

  const numberToLetter = (num: number): string => {
    return String.fromCharCode(64 + num);
  };

  const getPreviewRacks = () => {
    const { prefix, startNumber, endNumber } = bulkFormData;
    const count = Math.min(endNumber - startNumber + 1, 5);
    return Array.from({ length: count }, (_, i) => {
      const num = startNumber + i;
      const letter = numberToLetter(num);
      return `${prefix}${letter}`;
    });
  };

  const getTotalCount = () => {
    return Math.max(0, bulkFormData.endNumber - bulkFormData.startNumber + 1);
  };

  // ─── Submit Handlers ─────────────────────────────────────────────────
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!singleFormData.code || !singleFormData.location) {
        throw new Error('Rack code and location are required');
      }
      if (singleFormData.capacityTotal <= 0) {
        throw new Error('Capacity must be greater than 0');
      }

      const qrCode = `RACK-${singleFormData.code}-${Date.now()}`;
      const selectedCompanyProfileId = singleFormData.companyProfileId || singleFormData.categoryId || '';

      const {
        categoryId: _unusedCategoryId,
        companyProfileId: _unusedCompanyProfileId,
        length,
        width,
        height,
        ...rest
      } = singleFormData;

      const dataToSubmit = {
        ...rest,
        qrCode,
        capacityUsed: 0,
        cbmUsed: 0,
        cbmCapacity: singleFormData.cbmCapacity || singleFormData.capacityTotal,
        zone: singleFormData.zone.trim() || 'Unassigned',
        zoneDescription: singleFormData.zoneDescription || '',
        zoneIcon: singleFormData.zoneIcon || '📦',
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        height: height ? parseFloat(height) : undefined,
        categoryId: undefined,
        companyProfileId: selectedCompanyProfileId ? selectedCompanyProfileId : undefined,
      };

      await racksAPI.create(dataToSubmit);

      setSuccess('Rack created successfully! ✅');
      await generateQRCode(singleFormData.code);

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

  const handleBulkSubmit = async (e: React.FormEvent) => {
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

    if (!bulkFormData.zone.trim() || !bulkFormData.prefix.trim()) {
      setError('❌ Zone and prefix are required! Please enter a zone number (e.g., 1, 2, 3)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const racksToCreate = [];

      for (let i = bulkFormData.startNumber; i <= bulkFormData.endNumber; i++) {
        const letter = numberToLetter(i);
        const rackCode = `${bulkFormData.prefix}${letter}`;
        const location = bulkFormData.location.replace('{n}', letter);

        const selectedCompanyProfileId = bulkFormData.companyProfileId || bulkFormData.categoryId || '';

        const rackData: any = {
          code: rackCode,
          zone: bulkFormData.zone.trim() || 'Unassigned',
          zoneDescription: bulkFormData.zoneDescription || '',
          zoneIcon: bulkFormData.zoneIcon || '📦',
          location: location || `Zone ${bulkFormData.zone}, Rack ${rackCode}`,
          rackType: bulkFormData.rackType,
          capacityMode: bulkFormData.capacityMode,
          status: 'ACTIVE'
        };

        if (selectedCompanyProfileId) {
          rackData.companyProfileId = selectedCompanyProfileId;
        }

        if (bulkFormData.capacityMode === 'FIXED') {
          rackData.capacityTotal = bulkFormData.capacityTotal;
          rackData.capacityUsed = 0;
        } else if (bulkFormData.capacityMode === 'FLEXIBLE') {
          rackData.palletCapacity = bulkFormData.palletCapacity;
          rackData.boxCapacity = bulkFormData.boxCapacity;
          rackData.currentPallets = 0;
          rackData.currentBoxes = 0;
          rackData.capacityTotal = bulkFormData.boxCapacity;
          rackData.capacityNotes = `${bulkFormData.palletCapacity} pallets OR ${bulkFormData.boxCapacity} boxes`;
        } else if (bulkFormData.capacityMode === 'UNLIMITED') {
          rackData.capacityTotal = 999999;
          rackData.capacityUsed = 0;
          rackData.capacityNotes = bulkFormData.capacityNotes || 'Unlimited capacity - open warehouse space';
        }

        racksToCreate.push(rackData);
      }

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

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'single') {
      return handleSingleSubmit(e);
    }
    return handleBulkSubmit(e);
  };

  // ─── Shared Zone Config Component ────────────────────────────────────
  const renderZoneConfig = () => {
    const zone = mode === 'single' ? singleFormData.zone : bulkFormData.zone;
    const zoneIcon = mode === 'single' ? singleFormData.zoneIcon : bulkFormData.zoneIcon;
    const zoneDescription = mode === 'single' ? singleFormData.zoneDescription : bulkFormData.zoneDescription;
    const categoryId = mode === 'single' ? singleFormData.categoryId : bulkFormData.categoryId;

    const setZone = (val: string) => {
      if (mode === 'single') setSingleFormData(prev => ({ ...prev, zone: val }));
      else setBulkFormData(prev => ({ ...prev, zone: val }));
    };
    const setZoneDescription = (val: string) => {
      if (mode === 'single') setSingleFormData(prev => ({ ...prev, zoneDescription: val }));
      else setBulkFormData(prev => ({ ...prev, zoneDescription: val }));
    };
    const setCategoryId = (val: string) => {
      if (mode === 'single') setSingleFormData(prev => ({ ...prev, categoryId: val, companyProfileId: val }));
      else setBulkFormData(prev => ({ ...prev, categoryId: val, companyProfileId: val }));
    };

    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center gap-2">
          🏢 Zone Configuration
        </h3>
        <div className="space-y-4">
          {/* Existing Zone Selector - shared */}
          {existingZones.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select Existing Zone (Optional)
              </label>
              <select
                onChange={(e) => handleZoneSelect(e.target.value)}
                value={useExistingZone ? zone : 'new'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="new">➕ Create New Zone</option>
                {existingZones.map((z) => (
                  <option key={z.zone} value={z.zone}>
                    {z.zoneIcon} Zone {z.zone} {z.zoneDescription ? `- ${z.zoneDescription}` : ''}
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
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder={mode === 'single' ? "e.g., 1, 2, A, B..." : "e.g., 1, 2, 3, 4..."}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={useExistingZone}
              />
              <p className="text-xs text-gray-500 mt-1">
                {useExistingZone
                  ? 'Auto-filled from selected zone'
                  : mode === 'single'
                    ? 'Physical zone where this rack is located'
                    : '💡 Tip: Enter zone number, then create racks with prefix below'
                }
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
                <span className="text-3xl">{zoneIcon}</span>
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
              value={zoneDescription}
              onChange={(e) => setZoneDescription(e.target.value)}
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
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
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
    );
  };

  if (!isOpen) return null;

  const headerGradient = mode === 'single'
    ? 'bg-gradient-to-r from-purple-600 to-blue-600'
    : 'bg-gradient-to-r from-blue-600 to-purple-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`sticky top-0 ${headerGradient} text-white px-6 py-4 flex items-center justify-between rounded-t-xl`}>
          <div className="flex items-center gap-3">
            {mode === 'single' ? (
              <PlusIcon className="h-8 w-8" />
            ) : (
              <SparklesIcon className="h-8 w-8" />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {mode === 'single' ? '➕ Add New Rack' : '⚡ Bulk Add Racks'}
              </h2>
              <p className="text-blue-100 text-sm">
                {mode === 'single' ? 'Create a single rack with full details' : 'Create multiple racks at once with auto-numbering'}
              </p>
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

        {/* Mode Toggle */}
        <div className="px-6 pt-4">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              type="button"
              onClick={() => { setMode('single'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'single'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <PlusIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Single Rack
            </button>
            <button
              type="button"
              onClick={() => { setMode('bulk'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'bulk'
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <SparklesIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Bulk Add
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 w-full">
          {/* ───────── SINGLE MODE ───────── */}
          {mode === 'single' && (
            <>
              {renderZoneConfig()}

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
                      value={singleFormData.code}
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
                      value={singleFormData.location}
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
                      value={singleFormData.rackType}
                      onChange={handleSingleChange}
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
                      value={singleFormData.capacityTotal}
                      onChange={handleSingleChange}
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
                      value={singleFormData.status}
                      onChange={handleSingleChange}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                    <input
                      type="number"
                      name="length"
                      value={singleFormData.length}
                      onChange={handleSingleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      name="width"
                      value={singleFormData.width}
                      onChange={handleSingleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      name="height"
                      value={singleFormData.height}
                      onChange={handleSingleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      name="dimensionUnit"
                      value={singleFormData.dimensionUnit}
                      onChange={handleSingleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="METERS">Meters</option>
                      <option value="FEET">Feet</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  📐 Optional: Enter rack physical dimensions for detailed tracking
                </p>
              </div>

              {/* QR Code Preview */}
              {qrCodeUrl && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">QR Code Preview</h3>
                  <div className="flex flex-col items-center space-y-3">
                    <img src={qrCodeUrl} alt="QR Code" className="border-2 border-gray-300 rounded p-2" />
                    <p className="text-sm text-gray-600">
                      Scan this code to identify rack: <span className="font-bold">{singleFormData.code}</span>
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
            </>
          )}

          {/* ───────── BULK MODE ───────── */}
          {mode === 'bulk' && (
            <>
              {renderZoneConfig()}

              {/* Numbering System */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center gap-2">
                  🔢 Rack Code System
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rack Code Prefix <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="prefix"
                      value={bulkFormData.prefix}
                      onChange={handleBulkChange}
                      placeholder="e.g., 1 (creates 1A, 1B, 1C...)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Example: Code "1" creates: <strong>1A, 1B, 1C, 1D</strong>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Letter (1=A, 2=B...)
                    </label>
                    <input
                      type="number"
                      name="startNumber"
                      value={bulkFormData.startNumber}
                      onChange={handleBulkChange}
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
                      value={bulkFormData.endNumber}
                      onChange={handleBulkChange}
                      min={bulkFormData.startNumber}
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
                  value={bulkFormData.location}
                  onChange={handleBulkChange}
                  placeholder="e.g., Zone 7, Row {n} - Use {n} for auto number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{n}'}</code> for auto-incrementing number
                </p>
              </div>

              {/* Rack Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rack Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="rackType"
                  value={bulkFormData.rackType}
                  onChange={handleBulkChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="STORAGE">Storage</option>
                  <option value="MATERIALS">Materials</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setBulkFormData(prev => ({ ...prev, capacityMode: 'FIXED' }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${bulkFormData.capacityMode === 'FIXED'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      📊 Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkFormData(prev => ({ ...prev, capacityMode: 'FLEXIBLE' }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${bulkFormData.capacityMode === 'FLEXIBLE'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      🔄 Flexible
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkFormData(prev => ({ ...prev, capacityMode: 'UNLIMITED' }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${bulkFormData.capacityMode === 'UNLIMITED'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      ∞ Unlimited
                    </button>
                  </div>
                </div>

                {bulkFormData.capacityMode === 'FIXED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Capacity (boxes)
                    </label>
                    <input
                      type="number"
                      name="capacityTotal"
                      value={bulkFormData.capacityTotal}
                      onChange={handleBulkChange}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {bulkFormData.capacityMode === 'FLEXIBLE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Pallets
                      </label>
                      <input
                        type="number"
                        name="palletCapacity"
                        value={bulkFormData.palletCapacity}
                        onChange={handleBulkChange}
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
                        value={bulkFormData.boxCapacity}
                        onChange={handleBulkChange}
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2 p-3 bg-green-100 rounded-lg border border-green-300">
                      <p className="text-sm text-green-800">
                        <strong>Example:</strong> {bulkFormData.palletCapacity} pallets OR {bulkFormData.boxCapacity} loose boxes OR mixed
                      </p>
                    </div>
                  </div>
                )}

                {bulkFormData.capacityMode === 'UNLIMITED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      name="capacityNotes"
                      value={bulkFormData.capacityNotes}
                      onChange={handleBulkChange}
                      rows={3}
                      placeholder="e.g., Open warehouse space, no strict capacity limit"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ───────── Error/Success Messages ───────── */}
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

          {/* ───────── Action Buttons ───────── */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                mode === 'single' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : ''
              }`}
              disabled={loading || (mode === 'bulk' && getTotalCount() <= 0)}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : mode === 'single' ? (
                <>
                  <PlusIcon className="h-5 w-5" />
                  Create Rack
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

      {/* Icon Picker Modal */}
      <IconPickerModal
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(icon) => {
          if (mode === 'single') {
            setSingleFormData(prev => ({ ...prev, zoneIcon: icon }));
          } else {
            setBulkFormData(prev => ({ ...prev, zoneIcon: icon }));
          }
        }}
        currentIcon={mode === 'single' ? singleFormData.zoneIcon : bulkFormData.zoneIcon}
      />
    </div>
  );
}

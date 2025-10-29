import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI, companiesAPI } from '../services/api';
import { parseNumberInput, getSafeNumber } from '../utils/inputHelpers';

interface WHMShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

interface PricingSettings {
  storageRate: number;
  minimumCharge: number;
  currency: string;
  taxRate: number;
}

interface Rack {
  id: string;
  code: string;
  location: string;
  capacityTotal: number;
  capacityUsed: number;
  status: string;
}

interface CompanyProfile {
  id: string;
  name: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  logo?: string;
  contractStatus?: string;
  isActive?: boolean;
}

export default function WHMShipmentModal({ isOpen, onClose, onSuccess }: WHMShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Core shipment data (WHM style)
  const [formData, setFormData] = useState({
    // Basic Info
    barcode: '',
    companyProfileId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    arrivalDate: new Date().toISOString().split('T')[0], // Today's date by default
    
    // Shipment Details
    pieces: 1,
    palletCount: 1,
    boxesPerPallet: 1,
    weight: 0,
    dimensions: '',
    length: 0, // in cm
    width: 0,  // in cm
    height: 0, // in cm
    cbm: 0, // auto-calculated (m³)
    description: '',
    value: 0,
    
    // Warehouse Info
    isWarehouseShipment: false,
    shipper: '',
    consignee: '',
    shipperAddress: '',
    consigneeAddress: '',
    shipperPhone: '',
    consigneePhone: '',
    
    // Storage
    rackId: '',
    storageType: 'STANDARD', // STANDARD, FRAGILE, HAZMAT
    specialInstructions: '',
    
    // Pricing
    estimatedDays: 30,
    notes: '',
  });

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [racks, setRacks] = useState<Rack[]>([]);
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [pricing, setPricing] = useState<PricingSettings>({
    storageRate: 0.5,
    minimumCharge: 5.0,
    currency: 'KWD',
    taxRate: 0,
  });

  // 🚀 QR CODE STATE
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [qrCodeValue, setQRCodeValue] = useState('');

  // 🚀 INTAKE MODE STATE (Pallet vs Box mode)
  const [intakeMode, setIntakeMode] = useState<'pallet' | 'box'>('pallet');
  const [palletPhotoMap, setPalletPhotoMap] = useState<Record<number, string[]>>({});
  const [palletUploadState, setPalletUploadState] = useState<Record<number, boolean>>({});
  
  // 🚀 SHIPMENT SETTINGS STATE
  const [shipmentSettings, setShipmentSettings] = useState<any>({
    requireClientEmail: false,
    requireClientPhone: true,
    requireEstimatedValue: false,
    requireRackAssignment: false,
    autoGenerateQR: true,
    qrCodePrefix: 'SHP',
    defaultStorageType: 'PERSONAL',
    formSectionOrder: null, // Will be loaded from settings
  });

  // 🚀 FORM SECTION ORDERING STATE
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'basic',
    'client',
    'warehouse',
    'storage',
    'custom',
    'pricing'
  ]);

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
      loadInitialData();
      generateBarcode();
      resetForm();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCustomFields(),
        loadRacks(),
        loadCompanyProfiles(),
        loadPricingSettings(),
        loadShipmentSettings(), // 🚀 LOAD SETTINGS
      ]);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    }
  };

  const generateBarcode = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const barcode = `WHM${timestamp.toString().slice(-6)}${random}`;
    setFormData(prev => ({ ...prev, barcode }));
  };

  const loadCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields?section=SHIPMENT', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both response formats: { customFields: [] } or direct array
        const fields = data.customFields || data;
        const activeFields = Array.isArray(fields) ? fields.filter((field: CustomField) => field.isActive) : [];
        setCustomFields(activeFields);
        
        // Initialize custom field values
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

  const loadRacks = async () => {
    try {
      const response = await racksAPI.getAll();
      const availableRacks = response.racks.filter(
        (rack: Rack) => rack.status === 'ACTIVE' && rack.capacityUsed < rack.capacityTotal
      );
      setRacks(availableRacks);
    } catch (err: any) {
      console.error('Failed to load racks:', err);
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
      const activeProfiles = (profileListRaw as CompanyProfile[]).filter(
        (profile) => profile?.isActive !== false
      );
      setCompanyProfiles(activeProfiles);
    } catch (err) {
      console.error('Failed to load company profiles:', err);
      setCompanyProfiles([]);
    }
  };

  const loadPricingSettings = async () => {
    try {
      const response = await fetch('/api/billing/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPricing({
          storageRate: data.storageRatePerBox || data.storageRate || 0.5,
          minimumCharge: data.minimumCharge || 5.0,
          currency: data.currency || 'KWD',
          taxRate: data.taxRate || 0,
        });
      } else {
        console.error('Failed to load pricing settings:', response.status);
      }
    } catch (err: any) {
      console.error('Failed to load pricing:', err);
    }
  };

  // 🚀 LOAD SHIPMENT SETTINGS
  const loadShipmentSettings = async () => {
    try {
      const response = await fetch('/api/shipment-settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings || data;
        setShipmentSettings(settings);
        
        // 🚀 LOAD SECTION ORDER FROM SETTINGS
        if (settings.formSectionOrder) {
          try {
            const order = JSON.parse(settings.formSectionOrder);
            setSectionOrder(order);
            console.log('✅ Section order loaded:', order);
          } catch (e) {
            console.log('Using default section order');
          }
        }
        
        console.log('✅ Shipment settings loaded:', settings);
      }
    } catch (err: any) {
      console.error('Failed to load shipment settings:', err);
    }
  };

  const resetForm = () => {
    const defaultPalletCount = 1;
    const defaultBoxesPerPallet = 1;
    setFormData({
      barcode: '',
      companyProfileId: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      arrivalDate: new Date().toISOString().split('T')[0], // ADD MISSING FIELD
      pieces: defaultPalletCount * defaultBoxesPerPallet,
      palletCount: defaultPalletCount,
      boxesPerPallet: defaultBoxesPerPallet,
      length: 0,
      width: 0,
      height: 0,
      cbm: 0,
      weight: 0,
      dimensions: '',
      description: '',
      value: 0,
      isWarehouseShipment: false,
      shipper: '',
      consignee: '',
      shipperAddress: '',
      consigneeAddress: '',
      shipperPhone: '',
      consigneePhone: '',
      rackId: '',
      storageType: 'STANDARD',
      specialInstructions: '',
      estimatedDays: 30,
      notes: '',
    });
    setIntakeMode('pallet');
    setPalletPhotoMap({});
    setPalletUploadState({});
    const initialCustomValues: Record<string, string> = {};
    customFields.forEach(field => {
      initialCustomValues[field.id] = '';
    });
    setCustomFieldValues(initialCustomValues);
    setError('');
    setSuccess('');
    generateBarcode();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const isNumber = type === 'number';
    const parsedValue = isCheckbox
      ? (e.target as HTMLInputElement).checked
      : isNumber
        ? parseNumberInput(value, true)
        : value;

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: parsedValue,
      } as typeof prev;

      if (name === 'palletCount' || name === 'boxesPerPallet') {
        const palletCount = getSafeNumber(updated.palletCount, 0);
        const boxesPerPallet = getSafeNumber(updated.boxesPerPallet, 0);

        return {
          ...updated,
          pieces: palletCount * boxesPerPallet,
        };
      }

      // Auto-calculate CBM when dimensions change
      if (name === 'length' || name === 'width' || name === 'height') {
        const length = getSafeNumber(updated.length, 0);
        const width = getSafeNumber(updated.width, 0);
        const height = getSafeNumber(updated.height, 0);
        
        // CBM = (Length × Width × Height) / 1,000,000 (since input is in cm)
        // Or: (L × W × H in cm) / 1,000,000 = CBM in m³
        const cbm = length > 0 && width > 0 && height > 0 
          ? (length * width * height) / 1000000
          : 0;

        return {
          ...updated,
          cbm: parseFloat(cbm.toFixed(4)), // Round to 4 decimals
        };
      }

      return updated;
    });

    if (name === 'palletCount') {
      const nextCount = getSafeNumber(parsedValue as number | string, 0);
      setPalletPhotoMap(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (Number(key) > nextCount) {
            delete next[Number(key)];
          }
        });
        return next;
      });
      setPalletUploadState(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (Number(key) > nextCount) {
            delete next[Number(key)];
          }
        });
        return next;
      });
    }
  };

  const generateQRPreview = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    let qrValue = '';

    if (intakeMode === 'pallet') {
      const palletCount = getSafeNumber(formData.palletCount, 1);
      const boxesPerPallet = getSafeNumber(formData.boxesPerPallet, 1);
      const totalBoxes = palletCount * boxesPerPallet;
      qrValue = `QR-SH-${timestamp}-P${palletCount}B${boxesPerPallet}T${totalBoxes}`;
    } else {
      // Box mode
      const totalBoxes = getSafeNumber(formData.pieces, 1);
      qrValue = `QR-SH-${timestamp}-BOX-T${totalBoxes}`;
    }

    setQRCodeValue(qrValue);
    setShowQRPreview(true);
  };

  const resolveMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? url : `/${url}`;
  };

  const handlePalletPhotoUpload = async (palletNumber: number, files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    setPalletUploadState(prev => ({ ...prev, [palletNumber]: true }));

    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch('/api/shipments/upload/photo', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || 'Failed to upload pallet photo');
        }

        const payload = await response.json();
        if (payload?.photoUrl) {
          uploadedUrls.push(payload.photoUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setPalletPhotoMap(prev => {
          const next = { ...prev };
          const current = next[palletNumber] || [];
          next[palletNumber] = [...current, ...uploadedUrls];
          return next;
        });
      }
    } catch (uploadError: any) {
      console.error('Pallet photo upload failed:', uploadError);
      setError(uploadError?.message || 'Failed to upload pallet photos');
    } finally {
      setPalletUploadState(prev => ({ ...prev, [palletNumber]: false }));
    }
  };

  const handleRemovePalletPhoto = (palletNumber: number, photoIndex: number) => {
    setPalletPhotoMap(prev => {
      const current = prev[palletNumber] || [];
      const nextPhotos = current.filter((_, idx) => idx !== photoIndex);
      const nextMap = { ...prev };
      if (nextPhotos.length > 0) {
        nextMap[palletNumber] = nextPhotos;
      } else {
        delete nextMap[palletNumber];
      }
      return nextMap;
    });
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            required={field.isRequired}
          />
        );
      
      case 'DROPDOWN':
        return (
          <select
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id={field.id}
              checked={value === 'true'}
              onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked.toString() }))}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
              {field.fieldName}
            </label>
          </div>
        );
      
      default:
        return null;
    }
  };

  const calculateEstimatedCost = () => {
    const baseCost = Math.max(formData.pieces * pricing.storageRate * formData.estimatedDays, pricing.minimumCharge);
    const tax = baseCost * (pricing.taxRate / 100);
    return { baseCost, tax, total: baseCost + tax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 🚀 VALIDATE AGAINST SHIPMENT SETTINGS
      if (!formData.clientName) {
        throw new Error('Client name is required');
      }
      if (shipmentSettings.requireClientPhone && !formData.clientPhone) {
        throw new Error('Client phone is required by company settings');
      }
      if (shipmentSettings.requireClientEmail && !formData.clientEmail) {
        throw new Error('Client email is required by company settings');
      }
      if (shipmentSettings.requireEstimatedValue && !formData.value) {
        throw new Error('Estimated value is required by company settings');
      }
      if (shipmentSettings.requireRackAssignment && !formData.rackId) {
        throw new Error('Rack assignment is required by company settings');
      }
      
      // 🚀 ADDITIONAL CONDITIONAL VALIDATIONS
      if (shipmentSettings.requireClientAddress && !formData.clientAddress) {
        throw new Error('Client address is required by company settings');
      }
      if (shipmentSettings.requireDescription && !formData.description) {
        throw new Error('Description is required by company settings');
      }
      if (shipmentSettings.requireNotes && !formData.notes) {
        throw new Error('Notes are required by company settings');
      }
      if (shipmentSettings.requireEstimatedDays && !formData.estimatedDays) {
        throw new Error('Estimated storage days are required by company settings');
      }
      
      const palletCount = intakeMode === 'pallet'
        ? getSafeNumber(formData.palletCount, 0)
        : 1;
      const boxesPerPallet = intakeMode === 'pallet'
        ? getSafeNumber(formData.boxesPerPallet, 0)
        : getSafeNumber(formData.pieces, 0);
      const computedPieces = palletCount * boxesPerPallet;

      if (palletCount <= 0) {
        throw new Error('Pallet count must be at least 1');
      }
      if (boxesPerPallet <= 0) {
        throw new Error('Boxes per pallet must be at least 1');
      }
      if (computedPieces <= 0) {
        throw new Error('Number of boxes must be greater than 0');
      }
      if (formData.isWarehouseShipment && (!formData.shipper || !formData.consignee)) {
        throw new Error('Shipper and consignee are required for warehouse shipments');
      }

      // Validate required custom fields
      for (const field of customFields) {
        if (field.isRequired && !customFieldValues[field.id]) {
          throw new Error(`${field.fieldName} is required`);
        }
      }

      // Prepare submission data
      const palletPhotosPayload = intakeMode === 'pallet'
        ? Array.from({ length: palletCount }, (_, idx) => palletPhotoMap[idx + 1] || [])
        : [];

      const submissionData = {
        // Map to existing shipment fields
        referenceId: formData.barcode,
        companyProfileId: formData.companyProfileId || undefined,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        clientAddress: formData.clientAddress,
        arrivalDate: formData.arrivalDate,
  palletCount,
        boxesPerPallet,
        description: formData.description,
        originalBoxCount: computedPieces,
        currentBoxCount: computedPieces,
        estimatedValue: formData.value,
        notes: formData.notes,
        rackId: formData.rackId || undefined,
  palletPhotos: palletPhotosPayload.map(photos => photos.filter(url => !!url)),
        // Backend will set: PENDING if no rack, IN_STORAGE if rack assigned
        // status: not needed here, backend handles it
        
        // Warehouse data
        isWarehouseShipment: formData.isWarehouseShipment,
        warehouseData: formData.isWarehouseShipment ? JSON.stringify({
          shipper: formData.shipper,
          consignee: formData.consignee,
          shipperAddress: formData.shipperAddress,
          consigneeAddress: formData.consigneeAddress,
          shipperPhone: formData.shipperPhone,
          consigneePhone: formData.consigneePhone,
          weight: formData.weight,
          dimensions: formData.dimensions,
          storageType: formData.storageType,
          specialInstructions: formData.specialInstructions,
          estimatedDays: formData.estimatedDays,
        }) : null,
        
        // Custom fields
        customFieldValues: JSON.stringify(customFieldValues),
      };

      const response: any = await shipmentsAPI.create(submissionData);
      const shipmentId = response.shipment?.id || response.id;

      // Generate piece QR codes and assign to rack if specified
      if (formData.rackId && formData.pieces > 0) {
        const boxNumbers = Array.from({ length: formData.pieces }, (_, i) => i + 1);
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
      }

      // Show success message
  alert(`✅ SUCCESS!\n\nShipment ${formData.barcode} has been created successfully!\n\n📦 Boxes: ${computedPieces}\n🪵 Pallets: ${palletCount}\n🧱 Boxes per pallet: ${boxesPerPallet}\n👤 Client: ${formData.clientName}${formData.rackId ? `\n📍 Assigned to Rack` : ''}`);
      
      onSuccess();
      onClose();

    } catch (err: any) {
      setError(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const estimatedCost = calculateEstimatedCost();

  // 🚀 SECTION RENDER FUNCTIONS
  const renderBasicSection = () => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center">
          📦 Basic Shipment Info
        </h3>
        
        {/* INTAKE MODE TOGGLE */}
        <div className="bg-white p-3 rounded-lg border-2 border-blue-300 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">📋 Intake Mode:</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIntakeMode('pallet');
                setFormData(prev => ({
                  ...prev,
                  palletCount: 1,
                  boxesPerPallet: 1,
                  pieces: 1
                }));
                setPalletPhotoMap({});
                setPalletUploadState({});
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                intakeMode === 'pallet'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🪵 Pallet Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setIntakeMode('box');
                setFormData(prev => ({
                  ...prev,
                  palletCount: 1,
                  boxesPerPallet: 1,
                  pieces: 1
                }));
                setPalletPhotoMap({});
                setPalletUploadState({});
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                intakeMode === 'box'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📦 Box Mode
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Profile
          </label>
          <select
            name="companyProfileId"
            value={formData.companyProfileId}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select company (optional)</option>
            {companyProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barcode ID
          </label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 font-mono text-lg"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Arrival Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="arrivalDate"
            value={formData.arrivalDate}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* PALLET MODE FIELDS */}
        {intakeMode === 'pallet' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🪵 Pallet Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="palletCount"
                value={formData.palletCount}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🧱 Boxes per Pallet <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="boxesPerPallet"
                value={formData.boxesPerPallet}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                min="1"
                required
              />
            </div>
          </>
        )}

        {/* BOX MODE FIELDS */}
        {intakeMode === 'box' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📦 Total Boxes <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="pieces"
              value={formData.pieces}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setFormData(prev => ({
                  ...prev,
                  pieces: value
                }));
              }}
              className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-green-50"
              min="1"
              required
            />
          </div>
        )}

        {/* AUTO-CALCULATED TOTAL BOXES (for pallet mode) */}
        {intakeMode === 'pallet' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Total Boxes (auto)
            </label>
            <input
              type="number"
              name="pieces"
              value={formData.pieces}
              readOnly
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {intakeMode === 'pallet' && (() => {
          const palletCountValue = Math.max(getSafeNumber(formData.palletCount, 0), 0);
          if (palletCountValue === 0) return null;
          const palletNumbers = Array.from({ length: palletCountValue }, (_, idx) => idx + 1);

          return (
            <div className="md:col-span-3">
              <div className="bg-white border-2 border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    📸 Pallet Photos (optional)
                  </h4>
                  <span className="text-xs text-gray-500">
                    {palletNumbers.length} pallet{palletNumbers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {palletNumbers.map((palletNumber) => {
                    const photos = palletPhotoMap[palletNumber] || [];
                    const isUploading = palletUploadState[palletNumber];
                    return (
                      <div
                        key={`pallet-${palletNumber}`}
                        className="border border-blue-100 rounded-lg p-3 bg-blue-50/60"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold text-blue-700 uppercase">Pallet #{palletNumber}</p>
                            <p className="text-[11px] text-gray-500">Add up to 5 photos for reference</p>
                          </div>
                          {photos.length > 0 && (
                            <span className="text-xs font-medium text-blue-600">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-300 rounded-md py-6 hover:border-blue-500 hover:bg-blue-100/40 transition-colors cursor-pointer text-center text-xs text-blue-700 font-medium">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                handlePalletPhotoUpload(palletNumber, event.target.files);
                                event.target.value = '';
                              }}
                              disabled={isUploading || photos.length >= 5}
                            />
                            {isUploading
                              ? 'Uploading...'
                              : photos.length >= 5
                                ? 'Limit reached'
                                : 'Upload Photos'}
                          </label>
                          {photos.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {photos.map((photoUrl, index) => (
                                <div key={`${palletNumber}-photo-${index}`} className="relative">
                                  <img
                                    src={resolveMediaUrl(photoUrl)}
                                    alt={`Pallet ${palletNumber} photo ${index + 1}`}
                                    className="h-16 w-16 object-cover rounded-md border border-blue-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePalletPhoto(palletNumber, index)}
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow"
                                    title="Remove photo"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DIMENSIONS & CBM SECTION */}
        <div className="md:col-span-3">
          <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
              📏 Shipment Size & Volume
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Length (cm)
                </label>
                <input
                  type="number"
                  name="length"
                  value={formData.length || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Width (cm)
                </label>
                <input
                  type="number"
                  name="width"
                  value={formData.width || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-orange-900 font-bold mb-2">
                  CBM (m³) 📦
                </label>
                <div className="w-full px-3 py-2 border-2 border-orange-400 rounded-lg bg-orange-100 text-orange-900 font-bold text-center">
                  {formData.cbm > 0 ? formData.cbm.toFixed(4) : '0'}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 CBM auto-calculates: (Length × Width × Height) ÷ 1,000,000
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientSection = () => (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        👤 Client Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number {shipmentSettings.requireClientPhone && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            name="clientPhone"
            value={formData.clientPhone}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+965 1234 5678"
            required={shipmentSettings.requireClientPhone}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address {shipmentSettings.requireClientEmail && <span className="text-red-500">*</span>}
          </label>
          <input
            type="email"
            name="clientEmail"
            value={formData.clientEmail}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>
        
        {shipmentSettings.showClientAddress !== false && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address {shipmentSettings.requireClientAddress && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              name="clientAddress"
              value={formData.clientAddress}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Street address, city"
              required={shipmentSettings.requireClientAddress}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderWarehouseSection = () => {
    if (shipmentSettings.showWarehouseMode === false) return null;
    
    return (
      <>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isWarehouseShipment"
              name="isWarehouseShipment"
              checked={formData.isWarehouseShipment}
              onChange={handleChange}
              className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="isWarehouseShipment" className="text-sm font-semibold text-orange-800">
              🏭 This is a warehouse shipment (import/export with shipper/consignee details)
            </label>
          </div>
        </div>

        {formData.isWarehouseShipment && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold mb-4 text-orange-800 flex items-center">
              🏭 Warehouse Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipper Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipper"
                  value={formData.shipper}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="ABC Trading Company"
                  required={formData.isWarehouseShipment}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consignee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="consignee"
                  value={formData.consignee}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="XYZ Imports LLC"
                  required={formData.isWarehouseShipment}
                />
              </div>
              {shipmentSettings.showWeight !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg) {shipmentSettings.requireWeight && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    required={shipmentSettings.requireWeight}
                  />
                </div>
              )}
              {shipmentSettings.showDimensions !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions (L×W×H) {shipmentSettings.requireDimensions && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100×50×30 cm"
                    required={shipmentSettings.requireDimensions}
                  />
                </div>
              )}
              {shipmentSettings.showDescription !== false && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description {shipmentSettings.requireDescription && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the shipment contents..."
                    required={shipmentSettings.requireDescription}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderStorageSection = () => (
    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
      <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center">
        🏪 Storage Assignment
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Rack {shipmentSettings.requireRackAssignment && <span className="text-red-500">*</span>}
          </label>
          <select
            name="rackId"
            value={formData.rackId}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required={shipmentSettings.requireRackAssignment}
          >
            <option value="">{shipmentSettings.requireRackAssignment ? 'Select a rack (required)' : 'Select a rack (optional)'}</option>
            {racks.map(rack => (
              <option key={rack.id} value={rack.id}>
                {rack.code} - {rack.location} ({rack.capacityUsed}/{rack.capacityTotal})
              </option>
            ))}
          </select>
        </div>
        
        {shipmentSettings.showEstimatedDays !== false && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Storage Days {shipmentSettings.requireEstimatedDays && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              name="estimatedDays"
              value={formData.estimatedDays}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="1"
              required={shipmentSettings.requireEstimatedDays}
            />
          </div>
        )}
        
        {shipmentSettings.showSpecialInstructions !== false && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Any special handling or storage requirements..."
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderCustomFieldsSection = () => {
    if (customFields.length === 0) return null;
    
    return (
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold mb-4 text-purple-800 flex items-center">
          ✨ Custom Fields
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customFields.map(field => (
            <div key={field.id} className={field.fieldType === 'TEXTAREA' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.fieldName} {field.isRequired && <span className="text-red-500">*</span>}
              </label>
              {renderCustomField(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPricingSection = () => (
    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center">
        💰 Estimated Cost
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Storage Rate per Day:</span>
          <span className="font-medium">{pricing.storageRate.toFixed(3)} {pricing.currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Estimated Days:</span>
          <span className="font-medium">{formData.estimatedDays} days</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Number of Pieces:</span>
          <span className="font-medium">{formData.pieces} pieces</span>
        </div>
        <div className="border-t border-yellow-300 pt-3 flex justify-between">
          <span className="font-semibold text-yellow-900">Estimated Total:</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-900">
              {estimatedCost.total.toFixed(3)} {pricing.currency}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 🚀 SECTION MAPPING
  const formSections: Record<string, () => JSX.Element | null> = {
    basic: renderBasicSection,
    client: renderClientSection,
    warehouse: renderWarehouseSection,
    storage: renderStorageSection,
    custom: renderCustomFieldsSection,
    pricing: renderPricingSection,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📦 New Shipment Intake</h2>
              <p className="text-blue-100">WHM Warehouse Management System</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Messages */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <span className="mr-2">⚠️</span>
                  {error}
                </div>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <span className="mr-2">✅</span>
                  {success}
                </div>
              </div>
            )}

            {/* QR Code Preview Modal */}
            {showQRPreview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">🎯 Shipment QR Code</h3>
                    <button
                      type="button"
                      onClick={() => setShowQRPreview(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center mb-4">
                    <div className="mb-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">Master QR Code</p>
                      <p className="font-mono bg-white p-4 rounded border border-gray-300 text-sm break-all">
                        {qrCodeValue}
                      </p>
                    </div>
                    <div className="w-full border-t pt-4 mt-4">
                      {intakeMode === 'pallet' ? (
                        <>
                          <h4 className="font-semibold text-gray-700 mb-2">📊 Pallet Details:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-blue-50 p-2 rounded">
                              <p className="text-gray-600">Pallets</p>
                              <p className="text-lg font-bold text-blue-600">{formData.palletCount}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-gray-600">Boxes/Pallet</p>
                              <p className="text-lg font-bold text-green-600">{formData.boxesPerPallet}</p>
                            </div>
                            <div className="bg-purple-50 p-2 rounded col-span-2">
                              <p className="text-gray-600">Total Boxes</p>
                              <p className="text-lg font-bold text-purple-600">{formData.pieces}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="font-semibold text-gray-700 mb-2">📦 Box Details:</h4>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="bg-green-50 p-3 rounded">
                              <p className="text-gray-600">Total Boxes</p>
                              <p className="text-2xl font-bold text-green-600">{formData.pieces}</p>
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              ℹ️ This shipment contains individual boxes (no pallets)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(qrCodeValue);
                      alert('QR Code copied to clipboard!');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    📋 Copy QR Code
                  </button>
                </div>
              </div>
            )}

            {/* Settings Info Banner */}
            {(shipmentSettings.requireClientEmail || shipmentSettings.requireEstimatedValue || shipmentSettings.requireRackAssignment) && (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <span className="mr-2 text-lg">ℹ️</span>
                  <div>
                    <p className="font-semibold mb-1">Company Settings Applied</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {shipmentSettings.requireClientEmail && <li>Client email is required</li>}
                      {shipmentSettings.requireEstimatedValue && <li>Estimated value is required</li>}
                      {shipmentSettings.requireRackAssignment && <li>Rack assignment is required</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 🚀 SECTION ORDERING CONTROLS */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">📋 Form Sections Order:</span>
                  <span className="text-xs text-gray-500">Click ↑↓ to reorder</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sectionOrder.map((section, index) => {
                    const sectionLabels: Record<string, string> = {
                      basic: '📦 Basic',
                      client: '👤 Client',
                      warehouse: '🏭 Warehouse',
                      storage: '🏪 Storage',
                      custom: '⚙️ Custom',
                      pricing: '💰 Pricing'
                    };
                    
                    return (
                      <div key={section} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-300">
                        <span className="text-xs font-medium">{sectionLabels[section]}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              if (index > 0) {
                                const newOrder = [...sectionOrder];
                                [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                setSectionOrder(newOrder);
                              }
                            }}
                            disabled={index === 0}
                            className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-30 leading-none"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (index < sectionOrder.length - 1) {
                                const newOrder = [...sectionOrder];
                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                setSectionOrder(newOrder);
                              }
                            }}
                            disabled={index === sectionOrder.length - 1}
                            className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-30 leading-none"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 🚀 DYNAMIC SECTIONS - RENDER IN ORDER */}
            {sectionOrder.map((sectionId) => {
              const SectionComponent = formSections[sectionId];
              return SectionComponent ? (
                <div key={sectionId}>
                  {SectionComponent()}
                </div>
              ) : null;
            })}

            {/* 🚀 CONDITIONAL: Notes */}
            {shipmentSettings.showNotes !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes {shipmentSettings.requireNotes && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes or comments..."
                  required={shipmentSettings.requireNotes}
                />
              </div>
            )}

            {/* OLD SECTIONS REMOVED - NOW USING DYNAMIC RENDERING ABOVE */}
            {/* Keeping this comment to mark where old sections were */}
            
            <div style={{display: 'none'}} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                🏷️ Shipment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode ID
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 font-mono text-lg"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Pieces <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="pieces"
                    value={formData.pieces}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                👤 Client Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number {shipmentSettings.requireClientPhone && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+965 1234 5678"
                    required={shipmentSettings.requireClientPhone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address {shipmentSettings.requireClientEmail && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
                
                {/* 🚀 CONDITIONAL: Client Address */}
                {shipmentSettings.showClientAddress !== false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address {shipmentSettings.requireClientAddress && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="clientAddress"
                      value={formData.clientAddress}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address, city"
                      required={shipmentSettings.requireClientAddress}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 🚀 CONDITIONAL: Warehouse Toggle */}
            {shipmentSettings.showWarehouseMode !== false && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isWarehouseShipment"
                  name="isWarehouseShipment"
                  checked={formData.isWarehouseShipment}
                  onChange={handleChange}
                  className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="isWarehouseShipment" className="text-sm font-semibold text-orange-800">
                  🏭 This is a warehouse shipment (import/export with shipper/consignee details)
                </label>
              </div>
            </div>
            )}

            {/* Warehouse Details */}
            {formData.isWarehouseShipment && shipmentSettings.showWarehouseMode !== false && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold mb-4 text-orange-800 flex items-center">
                  🏭 Warehouse Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipper Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="shipper"
                      value={formData.shipper}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="ABC Trading Company"
                      required={formData.isWarehouseShipment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignee Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="consignee"
                      value={formData.consignee}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="XYZ Imports LLC"
                      required={formData.isWarehouseShipment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipper Address
                    </label>
                    <input
                      type="text"
                      name="shipperAddress"
                      value={formData.shipperAddress}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="123 Export St, Dubai, UAE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignee Address
                    </label>
                    <input
                      type="text"
                      name="consigneeAddress"
                      value={formData.consigneeAddress}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="456 Import Ave, Kuwait City"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Shipment Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                📦 Shipment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions (L×W×H)
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100×50×30 cm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Value ({pricing.currency}) {shipmentSettings.requireEstimatedValue && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    required={shipmentSettings.requireEstimatedValue}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage Type
                  </label>
                  <select
                    name="storageType"
                    value={formData.storageType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="STANDARD">Standard Storage</option>
                    <option value="FRAGILE">Fragile Items</option>
                    <option value="HAZMAT">Hazardous Materials</option>
                    <option value="COLD">Cold Storage</option>
                    <option value="SECURE">High Security</option>
                  </select>
                </div>
                
                {/* 🚀 CONDITIONAL: Description */}
                {shipmentSettings.showDescription !== false && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description {shipmentSettings.requireDescription && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the shipment contents..."
                      required={shipmentSettings.requireDescription}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Storage Assignment */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center">
                🏪 Storage Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Rack {shipmentSettings.requireRackAssignment && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="rackId"
                    value={formData.rackId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required={shipmentSettings.requireRackAssignment}
                  >
                    <option value="">{shipmentSettings.requireRackAssignment ? 'Select a rack (required)' : 'Select a rack (optional)'}</option>
                    {racks.map(rack => (
                      <option key={rack.id} value={rack.id}>
                        {rack.code} - {rack.location} ({rack.capacityUsed}/{rack.capacityTotal})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* 🚀 CONDITIONAL: Estimated Storage Days */}
                {shipmentSettings.showEstimatedDays !== false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Storage Days {shipmentSettings.requireEstimatedDays && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      name="estimatedDays"
                      value={formData.estimatedDays}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="1"
                      required={shipmentSettings.requireEstimatedDays}
                    />
                  </div>
                )}
                
                {/* 🚀 CONDITIONAL: Special Instructions */}
                {shipmentSettings.showSpecialInstructions !== false && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      name="specialInstructions"
                      value={formData.specialInstructions}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Any special handling or storage requirements..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold mb-4 text-purple-800 flex items-center">
                  ✨ Custom Fields
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.fieldName}
                        {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderCustomField(field)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Estimation */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center">
                💰 Estimated Storage Cost
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Base Cost</div>
                  <div className="text-xl font-bold text-blue-800">
                    {estimatedCost.baseCost.toFixed(3)} {pricing.currency}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formData.pieces} pieces × {formData.estimatedDays} days × {pricing.storageRate} rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Tax ({pricing.taxRate}%)</div>
                  <div className="text-xl font-bold text-blue-800">
                    {estimatedCost.tax.toFixed(3)} {pricing.currency}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Total Estimate</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {estimatedCost.total.toFixed(3)} {pricing.currency}
                  </div>
                </div>
              </div>
            </div>

            {/* 🚀 CONDITIONAL: Notes */}
            {shipmentSettings.showNotes !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes {shipmentSettings.requireNotes && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes or comments..."
                  required={shipmentSettings.requireNotes}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={generateQRPreview}
                className="px-6 py-3 border-2 border-purple-500 text-purple-600 rounded-lg hover:bg-purple-50 font-medium transition-colors flex items-center gap-2"
                disabled={loading || (intakeMode === 'pallet' && (!formData.palletCount || !formData.boxesPerPallet)) || (intakeMode === 'box' && !formData.pieces)}
              >
                {intakeMode === 'pallet' ? '🎯 View Pallet QR' : '📦 View Box QR'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={loading}
              >
                Reset
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? '🔄 Creating...' : '📦 Create Shipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

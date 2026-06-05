import React, { useState, useEffect } from 'react';
import { racksAPI, shipmentsAPI, companiesAPI, getBackendUrl } from '../services/api';
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
  const [useDirectCBM, setUseDirectCBM] = useState(false); // Toggle for direct CBM input

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
    cbm: 0, // auto-calculated or direct input (m³)
    directCBM: 0, // direct CBM input value
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

  // 📦 INTAKE MODE STATE (Pallet vs Box mode)
  const [intakeMode, setIntakeMode] = useState<'pallet' | 'box'>('pallet');
  const [palletPhotoMap, setPalletPhotoMap] = useState<Record<number, string[]>>({});
  const [palletUploadState, setPalletUploadState] = useState<Record<number, boolean>>({});
  // Variable pallet boxes support
  const [variablePerPallet, setVariablePerPallet] = useState(false);
  const [boxesDistribution, setBoxesDistribution] = useState<number[]>([1]);
  const [extraBoxes, setExtraBoxes] = useState<number>(0);

  // 📄 CONTRACT VALIDITY STATE
  const [contractValidity, setContractValidity] = useState<{
    hasContract: boolean;
    isValid: boolean;
    canOperate: boolean;
    isExpired: boolean;
    isSuspended: boolean;
    message: string;
    monthlyRate?: number;
    status?: string;
  } | null>(null);
  const [checkingContract, setCheckingContract] = useState(false);

  // 📦 MULTI-DIMENSION STATE
  interface DimensionItem {
    id: string;
    label?: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    qty: number;
    cbm: number;
  }
  const [dimensions, setDimensions] = useState<DimensionItem[]>([
    { id: '1', label: 'Item 1', length: 0, width: 0, height: 0, weight: 0, qty: 1, cbm: 0 }
  ]);

  // Calculate total CBM and weight from dimensions
  const dimensionsTotal = dimensions.reduce((acc, dim) => {
    const cbm = (dim.length * dim.width * dim.height / 1000000) * dim.qty;
    return {
      cbm: acc.cbm + cbm,
      weight: acc.weight + (dim.weight * dim.qty),
      pieces: acc.pieces + dim.qty
    };
  }, { cbm: 0, weight: 0, pieces: 0 });

  // Dimension management functions
  const addDimension = () => {
    const newId = String(Date.now());
    const label = `📦 Item ${dimensions.length + 1}`;
    setDimensions([...dimensions, { id: newId, label, length: 0, width: 0, height: 0, weight: 0, qty: 1, cbm: 0 }]);
  };

  const removeDimension = (id: string) => {
    if (dimensions.length > 1) {
      setDimensions(dimensions.filter(d => d.id !== id));
    }
  };

  const updateDimension = (id: string, field: keyof DimensionItem, value: number) => {
    setDimensions(dimensions.map(dim => {
      if (dim.id === id) {
        const updated = { ...dim, [field]: value };
        // Auto-calculate CBM for this dimension
        updated.cbm = (updated.length * updated.width * updated.height / 1000000) * updated.qty;
        return updated;
      }
      return dim;
    }));
  };

  // 🎯 AUTO-GENERATE DIMENSION ROWS BASED ON MODE AND COUNTS
  useEffect(() => {
    const palletCount = getSafeNumber(formData.palletCount, 0);
    const pieces = getSafeNumber(formData.pieces, 0);
    const looseBoxes = extraBoxes || 0;


    const newDimensions: DimensionItem[] = [];

    if (intakeMode === 'pallet') {
      // PALLET MODE: One dimension row per pallet + one for loose boxes if any
      for (let i = 0; i < palletCount; i++) {
        const existingDim = dimensions.find(d => d.id === `pallet-${i + 1}`) || dimensions[i];
        if (existingDim && (existingDim.length > 0 || existingDim.width > 0 || existingDim.height > 0)) {
          newDimensions.push({ ...existingDim, id: `pallet-${i + 1}`, label: `📦 P${i + 1}` });
        } else {
          newDimensions.push({
            id: `pallet-${i + 1}`,
            label: `📦 P${i + 1}`,
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
            qty: 1,
            cbm: 0
          });
        }
      }

      // Add loose boxes dimension if any
      if (looseBoxes > 0) {
        const existingLoose = dimensions.find(d => d.id === 'loose-boxes');
        if (existingLoose && (existingLoose.length > 0 || existingLoose.width > 0 || existingLoose.height > 0)) {
          newDimensions.push({ ...existingLoose, label: `📤 Loose (${looseBoxes})`, qty: looseBoxes });
        } else {
          newDimensions.push({
            id: 'loose-boxes',
            label: `📤 Loose (${looseBoxes})`,
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
            qty: looseBoxes,
            cbm: 0
          });
        }
      }
    } else if (intakeMode === 'box') {
      // BOX MODE: One dimension row for all boxes (qty = pieces)
      const existingDim = dimensions.find(d => d.id === 'all-boxes') || dimensions[0];
      if (existingDim && (existingDim.length > 0 || existingDim.width > 0 || existingDim.height > 0)) {
        newDimensions.push({ ...existingDim, id: 'all-boxes', label: `📦 Boxes (${pieces || 1})`, qty: pieces || 1 });
      } else {
        newDimensions.push({
          id: 'all-boxes',
          label: `📦 Boxes (${pieces || 1})`,
          length: 0,
          width: 0,
          height: 0,
          weight: 0,
          qty: pieces || 1,
          cbm: 0
        });
      }
    }

    // Only update if something changed
    const currentIds = dimensions.map(d => d.id).join(',');
    const newIds = newDimensions.map(d => d.id).join(',');
    const currentQtys = dimensions.map(d => d.qty).join(',');
    const newQtys = newDimensions.map(d => d.qty).join(',');

    if (currentIds !== newIds || currentQtys !== newQtys || dimensions.length !== newDimensions.length) {
      setDimensions(newDimensions);
    }
  }, [intakeMode, formData.palletCount, formData.pieces, extraBoxes]);

  // ⚙️ SHIPMENT SETTINGS STATE
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

  // 📋 FORM SECTION ORDERING STATE
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
        loadShipmentSettings(), // ⚙️ LOAD SETTINGS
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

  // ⚙️ LOAD SHIPMENT SETTINGS
  const loadShipmentSettings = async () => {
    try {
      const response = await fetch('/api/shipment-settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings || data;
        setShipmentSettings(settings);

        // 📋 LOAD SECTION ORDER FROM SETTINGS
        if (settings.formSectionOrder) {
          try {
            const order = JSON.parse(settings.formSectionOrder);
            setSectionOrder(order);
          } catch (e) {
          }
        }

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
      directCBM: 0, // Reset direct CBM
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
    setUseDirectCBM(false); // Reset toggle
    setIntakeMode('pallet');
    setPalletPhotoMap({});
    setPalletUploadState({});
    setVariablePerPallet(false);
    setBoxesDistribution([1]);
    setExtraBoxes(0);
    const initialCustomValues: Record<string, string> = {};
    customFields.forEach(field => {
      initialCustomValues[field.id] = '';
    });
    setCustomFieldValues(initialCustomValues);
    setError('');
    setSuccess('');
    generateBarcode();
    setContractValidity(null); // Reset contract validity
  };

  // Check contract validity when company is selected
  const checkContractValidity = async (companyProfileId: string) => {
    if (!companyProfileId) {
      setContractValidity(null);
      return;
    }

    try {
      setCheckingContract(true);
      const response = await fetch(`${getBackendUrl()}/api/contracts/check/${companyProfileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContractValidity(data);

        // If contract is expired/suspended, show error
        if (data.hasContract && !data.canOperate) {
          setError(`⚠️ Cannot receive shipment: ${data.message}`);
        } else {
          // Clear error if contract is valid
          setError('');
        }
      } else {
        setContractValidity(null);
      }
    } catch (err) {
      console.error('Error checking contract validity:', err);
      setContractValidity(null);
    } finally {
      setCheckingContract(false);
    }
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

    // Check contract validity when company profile is selected
    if (name === 'companyProfileId') {
      checkContractValidity(value);
    }

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: parsedValue,
      } as typeof prev;

      if (name === 'palletCount' || name === 'boxesPerPallet') {
        const palletCount = getSafeNumber(updated.palletCount, 0);
        const boxesPerPallet = getSafeNumber(updated.boxesPerPallet, 0);

        // Keep boxesDistribution in sync with palletCount/boxesPerPallet when not in variable mode
        if (!variablePerPallet) {
          const dist = Array.from({ length: Math.max(palletCount, 0) }, () => Math.max(boxesPerPallet, 0));
          setBoxesDistribution(dist.length ? dist : []);
          return {
            ...updated,
            pieces: palletCount * boxesPerPallet,
          };
        }
        // In variable mode, pieces are computed via distribution + extraBoxes (handled by effect below)
        return updated;
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

      // Handle direct CBM input
      if (name === 'directCBM') {
        const directCBM = getSafeNumber(parsedValue as number | string, 0);
        return {
          ...updated,
          cbm: directCBM, // Use direct CBM value
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
      // Resize boxesDistribution when variable mode is on
      if (variablePerPallet) {
        setBoxesDistribution(prev => {
          const count = Math.max(nextCount, 0);
          const next = prev.slice(0, count);
          while (next.length < count) {
            // default new pallets use current boxesPerPallet as hint
            next.push(getSafeNumber((e.target as any).form?.boxesPerPallet?.value ?? 1, 1));
          }
          return next;
        });
      }
    }
  };

  // Recompute total pieces when variable distribution changes
  useEffect(() => {
    if (intakeMode === 'pallet' && variablePerPallet) {
      const sum = boxesDistribution.reduce((acc, n) => acc + (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0), 0);
      setFormData(prev => ({ ...prev, pieces: sum + Math.max(0, Math.trunc(extraBoxes)) }));
    } else if (intakeMode === 'pallet' && !variablePerPallet) {
      const palletCount = getSafeNumber(formData.palletCount, 0);
      const bpp = getSafeNumber(formData.boxesPerPallet, 0);
      if (formData.pieces !== palletCount * bpp) {
        setFormData(prev => ({ ...prev, pieces: palletCount * bpp }));
      }
    }
  }, [boxesDistribution, extraBoxes, variablePerPallet, intakeMode, formData.palletCount, formData.boxesPerPallet]);



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
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80"
            required={field.isRequired}
          />
        );

      case 'DROPDOWN':
        return (
          <select
            id={field.id}
            value={value}
            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80"
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
              className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
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
      // 🔒 CHECK CONTRACT VALIDITY - BLOCK IF EXPIRED/SUSPENDED
      if (formData.companyProfileId && contractValidity?.hasContract && !contractValidity?.canOperate) {
        throw new Error(`Cannot receive shipment: ${contractValidity?.message || 'Contract has expired or is suspended. Please renew the contract.'}`);
      }

      // ✅ VALIDATE AGAINST SHIPMENT SETTINGS
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

      // ✅ ADDITIONAL CONDITIONAL VALIDATIONS
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
        : 0; // ✅ Box mode: NO pallets (0 = all boxes are loose)
      const uniformBoxesPerPallet = intakeMode === 'pallet'
        ? getSafeNumber(formData.boxesPerPallet, 0)
        : 0; // ✅ Box mode: boxes per pallet = 0 (indicating loose boxes)

      const dist = variablePerPallet
        ? boxesDistribution.slice(0, Math.max(palletCount, 0)).map(n => Math.max(0, Math.trunc(n || 0)))
        : [];
      const loose = variablePerPallet ? Math.max(0, Math.trunc(extraBoxes || 0)) : 0;
      const computedPieces = variablePerPallet
        ? dist.reduce((a, b) => a + b, 0) + loose
        : intakeMode === 'box'
          ? getSafeNumber(formData.pieces, 0) // Box mode: use pieces count directly
          : palletCount * uniformBoxesPerPallet; // Pallet mode: multiply pallets × boxes/pallet

      // Validation: Pallet mode specific
      if (intakeMode === 'pallet' && palletCount <= 0) {
        throw new Error('Pallet count must be at least 1');
      }
      if (intakeMode === 'pallet' && !variablePerPallet && uniformBoxesPerPallet <= 0) {
        throw new Error('Boxes per pallet must be at least 1');
      }

      // Common validation
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
        boxesPerPallet: variablePerPallet ? Math.max(0, dist.reduce((m, n) => Math.max(m, n), 0)) : uniformBoxesPerPallet,
        description: formData.description,
        originalBoxCount: computedPieces,
        currentBoxCount: computedPieces,
        estimatedValue: formData.value,
        notes: formData.notes,
        rackId: formData.rackId || undefined,
        palletPhotos: palletPhotosPayload.map(photos => photos.filter(url => !!url)),
        // Variable per-pallet payload (backend optional)
        ...(variablePerPallet ? { boxesDistribution: dist, extraBoxes: loose } : {}),
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

        // Dimensions & CBM - Use multi-dimension totals when not in direct mode
        length: useDirectCBM ? undefined : (dimensions.length > 0 ? dimensions[0].length : undefined),
        width: useDirectCBM ? undefined : (dimensions.length > 0 ? dimensions[0].width : undefined),
        height: useDirectCBM ? undefined : (dimensions.length > 0 ? dimensions[0].height : undefined),
        cbm: useDirectCBM
          ? (formData.directCBM > 0 ? formData.directCBM : undefined)
          : (dimensionsTotal.cbm > 0 ? dimensionsTotal.cbm : undefined),
        weight: useDirectCBM
          ? (formData.weight > 0 ? formData.weight : undefined)
          : (dimensionsTotal.weight > 0 ? dimensionsTotal.weight : undefined),
        // Save multi-dimension data as JSON
        dimensionsData: !useDirectCBM ? JSON.stringify(dimensions) : undefined,
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
      alert(`SUCCESS!\n\nShipment ${formData.barcode} has been created successfully!\n\nBoxes: ${computedPieces}\nPallets: ${palletCount}${variablePerPallet ? '' : `\nBoxes per pallet: ${uniformBoxesPerPallet}`}${variablePerPallet ? `\nVariable pallets: [${dist.join(', ')}]${loose ? ` + ${loose} loose` : ''}` : ''}\nClient: ${formData.clientName}${formData.rackId ? `\nAssigned to Rack` : ''}`);

      onSuccess();
      onClose();

    } catch (err: any) {
      setError(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  // 🎯 STEP WIZARD STATE (must be before early return for hooks ordering)
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 1;
  const stepLabels = [
    { label: 'Client Info', icon: '👤', desc: 'Client & company details' },
    { label: 'Shipment Details', icon: '📋', desc: 'Intake mode, pallets, boxes' },
    { label: 'Dimensions', icon: '📐', desc: 'Size, weight & volume' },
    { label: 'Photos & Notes', icon: '📷', desc: 'Pallet photos & instructions' },
    { label: 'Review', icon: '✅', desc: 'Review & submit' },
  ];

  if (!isOpen) return null;

  const estimatedCost = calculateEstimatedCost();

  // 🎨 RENDER FUNCTIONS

  const renderStepIndicator = () => (
    <div className="relative px-4 py-6">
      {/* Background track */}
      <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-gray-200 -translate-y-1/2" />
      <div
        className="absolute top-1/2 left-10 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 transition-all duration-500 ease-out"
        style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%`, maxWidth: 'calc(100% - 5rem)' }}
      />
      <div className="relative flex justify-between">
        {stepLabels.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                // Allow going back but not forward past completed steps or current
                if (idx <= currentStep) setCurrentStep(idx);
              }}
              className={`flex flex-col items-center gap-1 group transition-all duration-300 ${
                isCurrent ? 'scale-110' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white shadow-lg shadow-blue-200'
                    : isCurrent
                    ? 'bg-white border-blue-500 text-blue-600 shadow-lg shadow-blue-100'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={isCurrent ? 'text-blue-600' : ''}>{idx + 1}</span>
                )}
              </div>
              <div className="hidden sm:flex flex-col items-center">
                <span
                  className={`text-xs font-semibold transition-colors duration-200 ${
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-gray-400 hidden lg:block">{step.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderClientInfoStep = () => (
    <div className="animate-fadeIn space-y-5">
      {/* Company Profile Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <h3 className="text-white font-semibold text-sm">Company Profile</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Company <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <select
                  name="companyProfileId"
                  value={formData.companyProfileId}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white ${
                    contractValidity?.hasContract && !contractValidity?.canOperate
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <option value="">Select company (optional)</option>
                  {companyProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>

              {/* Contract Status Indicators */}
              {checkingContract && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  Checking contract status...
                </div>
              )}

              {contractValidity?.hasContract && !contractValidity?.canOperate && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-shake">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">⛔</span>
                    <div>
                      <p className="text-sm font-bold text-red-700">
                        CONTRACT {contractValidity.isExpired ? 'EXPIRED' : contractValidity.isSuspended ? 'SUSPENDED' : 'BLOCKED'}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {contractValidity.message || 'This customer\'s contract has expired or is suspended. Please renew the contract to receive shipments.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {contractValidity?.hasContract && contractValidity?.canOperate && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Contract Active</p>
                      <p className="text-xs text-emerald-600">{contractValidity.monthlyRate} {pricing.currency}/month</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Client Information Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h3 className="text-white font-semibold text-sm">Client Information</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Client Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number {shipmentSettings.requireClientPhone && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300"
                  placeholder="+965 1234 5678"
                  required={shipmentSettings.requireClientPhone}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address {shipmentSettings.requireClientEmail && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {shipmentSettings.showClientAddress !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address {shipmentSettings.requireClientAddress && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    name="clientAddress"
                    value={formData.clientAddress}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300"
                    placeholder="Street address, city"
                    required={shipmentSettings.requireClientAddress}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderShipmentDetailsStep = () => (
    <div className="animate-fadeIn space-y-5">
      {/* Intake Mode Toggle */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h3 className="text-white font-semibold text-sm">Intake Mode</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="flex gap-4">
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
                setVariablePerPallet(false);
                setBoxesDistribution([1]);
                setExtraBoxes(0);
              }}
              className={`flex-1 relative overflow-hidden rounded-xl px-5 py-4 font-semibold text-sm transition-all duration-300 ${
                intakeMode === 'pallet'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">📦</span>
                <div className="text-left">
                  <div className="font-bold">Pallet Mode</div>
                  <div className={`text-xs ${intakeMode === 'pallet' ? 'text-amber-100' : 'text-gray-400'}`}>
                    Organized by pallets
                  </div>
                </div>
              </div>
              {intakeMode === 'pallet' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIntakeMode('box');
                setFormData(prev => ({
                  ...prev,
                  palletCount: 0,
                  boxesPerPallet: 0,
                  pieces: 1
                }));
                setPalletPhotoMap({});
                setPalletUploadState({});
                setVariablePerPallet(false);
                setBoxesDistribution([]);
                setExtraBoxes(0);
              }}
              className={`flex-1 relative overflow-hidden rounded-xl px-5 py-4 font-semibold text-sm transition-all duration-300 ${
                intakeMode === 'box'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">📋</span>
                <div className="text-left">
                  <div className="font-bold">Box Mode</div>
                  <div className={`text-xs ${intakeMode === 'box' ? 'text-emerald-100' : 'text-gray-400'}`}>
                    Individual boxes
                  </div>
                </div>
              </div>
              {intakeMode === 'box' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Basic Info Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-sky-500 to-cyan-600 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔖</span>
            <h3 className="text-white font-semibold text-sm">Basic Shipment Info</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Barcode ID
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-mono text-sm text-gray-800"
                  readOnly
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Arrival Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="date"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 hover:border-sky-300"
                  required
                />
              </div>
            </div>

            {/* PALLET MODE FIELDS */}
            {intakeMode === 'pallet' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pallet Count <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">
                      📦
                    </span>
                    <input
                      type="number"
                      name="palletCount"
                      value={formData.palletCount || ''}
                      onChange={(e) => {
                        const value = Math.max(1, parseInt(e.target.value) || 1);
                        setFormData(prev => ({
                          ...prev,
                          palletCount: value,
                          pieces: value * (prev.boxesPerPallet || 1)
                        }));
                      }}
                      onBlur={(e) => {
                        // Ensure minimum 1 on blur (when user leaves field)
                        if (!e.target.value || parseInt(e.target.value) < 1) {
                          setFormData(prev => ({ ...prev, palletCount: 1, pieces: 1 * (prev.boxesPerPallet || 1) }));
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-amber-50/50 hover:border-amber-300"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Boxes per Pallet <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">
                      📋
                    </span>
                    <input
                      type="number"
                      name="boxesPerPallet"
                      value={formData.boxesPerPallet || ''}
                      onChange={(e) => {
                        const value = Math.max(1, parseInt(e.target.value) || 1);
                        setFormData(prev => ({
                          ...prev,
                          boxesPerPallet: value,
                          pieces: (prev.palletCount || 1) * value
                        }));
                      }}
                      onBlur={(e) => {
                        // Ensure minimum 1 on blur
                        if (!e.target.value || parseInt(e.target.value) < 1) {
                          setFormData(prev => ({ ...prev, boxesPerPallet: 1, pieces: (prev.palletCount || 1) * 1 }));
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-amber-50/50 hover:border-amber-300"
                      min="1"
                      required
                      disabled={variablePerPallet}
                    />
                  </div>
                </div>
              </>
            )}

            {/* BOX MODE FIELDS */}
            {intakeMode === 'box' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Boxes <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    📋
                  </span>
                  <input
                    type="number"
                    name="pieces"
                    value={formData.pieces || ''}
                    onChange={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1);
                      setFormData(prev => ({
                        ...prev,
                        pieces: value
                      }));
                    }}
                    onBlur={(e) => {
                      // Ensure minimum 1 on blur
                      if (!e.target.value || parseInt(e.target.value) < 1) {
                        setFormData(prev => ({ ...prev, pieces: 1 }));
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-emerald-50/50 hover:border-emerald-300"
                    min="1"
                    required
                  />
                </div>
              </div>
            )}

            {/* AUTO-CALCULATED TOTAL BOXES (for pallet mode) */}
            {intakeMode === 'pallet' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Boxes (auto)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </span>
                  <input
                    type="number"
                    name="pieces"
                    value={formData.pieces}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Variable Per Pallet Section */}
          {intakeMode === 'pallet' && (
            <div className="mt-5 pt-5 border-t border-amber-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="variablePerPallet"
                    type="checkbox"
                    checked={variablePerPallet}
                    onChange={(ev) => {
                      const checked = ev.target.checked;
                      setVariablePerPallet(checked);
                      if (checked) {
                        const count = Math.max(getSafeNumber(formData.palletCount, 0), 0);
                        const dist = Array.from({ length: count }, () => Math.max(getSafeNumber(formData.boxesPerPallet, 0), 0) || 1);
                        setBoxesDistribution(dist);
                      } else {
                        setBoxesDistribution([]);
                        setExtraBoxes(0);
                        // reset pieces to uniform formula
                        const palletCount = getSafeNumber(formData.palletCount, 0);
                        const bpp = getSafeNumber(formData.boxesPerPallet, 0);
                        setFormData(prev => ({ ...prev, pieces: palletCount * bpp }));
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </div>
                <label htmlFor="variablePerPallet" className="text-sm font-medium text-amber-900">
                  Variable boxes per pallet + extra loose boxes
                </label>
              </div>
              {variablePerPallet && (
                <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: Math.max(getSafeNumber(formData.palletCount, 0), 0) }, (_, idx) => idx).map((idx) => (
                      <div key={`bpp-${idx}`} className="bg-white border border-amber-200 rounded-xl p-3">
                        <label className="block text-xs font-semibold text-amber-800 mb-1.5">
                          🎯 Pallet #{idx + 1} boxes
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={boxesDistribution[idx] ?? 0}
                          onChange={(ev) => {
                            const val = parseInt(ev.target.value) || 0;
                            setBoxesDistribution(prev => {
                              const next = prev.slice();
                              next[idx] = Math.max(0, val);
                              return next;
                            });
                          }}
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-amber-800 mb-1.5">
                      📤 Extra loose boxes (not on pallets)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={extraBoxes}
                      onChange={(ev) => setExtraBoxes(Math.max(0, parseInt(ev.target.value) || 0))}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDimensionsStep = () => (
    <div className="animate-fadeIn space-y-5">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📐</span>
              <h3 className="text-white font-semibold text-sm">Shipment Dimensions & Volume</h3>
            </div>
            {/* Toggle for Direct CBM vs Dimensions */}
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
              <span className={`text-xs font-medium ${!useDirectCBM ? 'text-white' : 'text-white/60'}`}>
                Multi-Dim
              </span>
              <button
                type="button"
                onClick={() => setUseDirectCBM(!useDirectCBM)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useDirectCBM ? 'bg-white/80' : 'bg-white/40'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${useDirectCBM ? 'translate-x-[18px]' : 'translate-x-1'}`}
                />
              </button>
              <span className={`text-xs font-medium ${useDirectCBM ? 'text-white' : 'text-white/60'}`}>
                Direct CBM
              </span>
            </div>
          </div>
        </div>
        <div className="p-5">
          {useDirectCBM ? (
            /* Direct CBM Input */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  CBM (m³) - Direct Input
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 font-bold text-sm">m³</span>
                  <input
                    type="number"
                    name="directCBM"
                    value={formData.directCBM || ''}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 hover:border-violet-300"
                    placeholder="0.680"
                    min="0"
                    step="0.001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Weight (kg)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </span>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight || ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 hover:border-violet-300"
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Multi-Dimension Inputs */
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                <div className="col-span-1">Item</div>
                <div className="col-span-2">Length (cm)</div>
                <div className="col-span-2">Width (cm)</div>
                <div className="col-span-2">Height (cm)</div>
                <div className="col-span-1">Weight</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-2">CBM</div>
                <div className="col-span-1"></div>
              </div>

              {/* Dimension Rows */}
              {dimensions.map((dim, index) => {
                // Generate label based on ID
                let label = `#${index + 1}`;
                if (dim.id.startsWith('pallet-')) {
                  label = `📦 P${dim.id.replace('pallet-', '')}`;
                } else if (dim.id === 'loose-boxes') {
                  label = `📤 Loose`;
                } else if (dim.id === 'all-boxes') {
                  label = `📦 Boxes`;
                }

                return (
                  <div key={dim.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center bg-gray-50/70 rounded-xl p-3 md:p-2 border border-gray-100 hover:border-violet-200 transition-all">
                    <div className="col-span-2 md:col-span-1">
                      <span className="inline-block text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-200">
                        {label}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <input
                        type="number"
                        value={dim.length || ''}
                        onChange={(e) => updateDimension(dim.id, 'length', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                        placeholder="L"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <input
                        type="number"
                        value={dim.width || ''}
                        onChange={(e) => updateDimension(dim.id, 'width', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                        placeholder="W"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <input
                        type="number"
                        value={dim.height || ''}
                        onChange={(e) => updateDimension(dim.id, 'height', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                        placeholder="H"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <input
                        type="number"
                        value={dim.weight || ''}
                        onChange={(e) => updateDimension(dim.id, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                        placeholder="kg"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <input
                        type="number"
                        value={dim.qty || 1}
                        onChange={(e) => updateDimension(dim.id, 'qty', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <div className="px-3 py-2 bg-violet-50 rounded-lg text-sm font-semibold text-violet-700 text-center border border-violet-200">
                        {dim.cbm.toFixed(4)}
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-1 flex justify-center">
                      {dimensions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDimension(dim.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove row"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Row Button */}
              <button
                type="button"
                onClick={addDimension}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 transition-all w-full justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Dimension Row
              </button>

              {/* Totals */}
              <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-200 text-center">
                    <div className="text-xs font-medium text-violet-600 mb-1">Total CBM</div>
                    <div className="text-xl font-bold text-violet-800">{dimensionsTotal.cbm.toFixed(4)} m³</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-center">
                    <div className="text-xs font-medium text-blue-600 mb-1">Total Weight</div>
                    <div className="text-xl font-bold text-blue-800">{dimensionsTotal.weight.toFixed(2)} kg</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-xs font-medium text-emerald-600 mb-1">Total Pieces</div>
                    <div className="text-xl font-bold text-emerald-800">{dimensionsTotal.pieces}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPhotosAndNotesStep = () => (
    <div className="animate-fadeIn space-y-5">
      {/* Warehouse Shipment Toggle */}
      {shipmentSettings.showWarehouseMode !== false && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏭</span>
              <h3 className="text-white font-semibold text-sm">Warehouse Mode</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="isWarehouseShipment"
                  name="isWarehouseShipment"
                  checked={formData.isWarehouseShipment}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </div>
              <label htmlFor="isWarehouseShipment" className="text-sm font-medium text-orange-900">
                This is a warehouse shipment (import/export with shipper/consignee details)
              </label>
            </div>

            {formData.isWarehouseShipment && (
              <div className="bg-orange-50/70 rounded-xl p-5 border border-orange-200 space-y-4 animate-slideDown">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Shipper Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="shipper"
                      value={formData.shipper}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white hover:border-orange-300"
                      placeholder="ABC Trading Company"
                      required={formData.isWarehouseShipment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Consignee Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="consignee"
                      value={formData.consignee}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white hover:border-orange-300"
                      placeholder="XYZ Imports LLC"
                      required={formData.isWarehouseShipment}
                    />
                  </div>
                  {shipmentSettings.showWeight !== false && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Weight (kg) {shipmentSettings.requireWeight && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          name="weight"
                          value={formData.weight}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white hover:border-orange-300"
                          placeholder="0.00"
                          step="0.01"
                          required={shipmentSettings.requireWeight}
                        />
                      </div>
                    </div>
                  )}
                  {shipmentSettings.showDimensions !== false && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Dimensions (L×W×H) {shipmentSettings.requireDimensions && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        name="dimensions"
                        value={formData.dimensions}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white hover:border-orange-300"
                        placeholder="100×50×30 cm"
                        required={shipmentSettings.requireDimensions}
                      />
                    </div>
                  )}
                  {shipmentSettings.showDescription !== false && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description {shipmentSettings.requireDescription && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white hover:border-orange-300 resize-none"
                        placeholder="Describe the shipment contents..."
                        required={shipmentSettings.requireDescription}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pallet Photos */}
      {intakeMode === 'pallet' && (() => {
        const palletCountValue = Math.max(getSafeNumber(formData.palletCount, 0), 0);
        if (palletCountValue === 0) return null;
        const palletNumbers = Array.from({ length: palletCountValue }, (_, idx) => idx + 1);

        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📸</span>
                  <h3 className="text-white font-semibold text-sm">Pallet Photos</h3>
                </div>
                <span className="text-xs text-white/80 bg-white/20 px-2.5 py-1 rounded-lg">
                  {palletNumbers.length} pallet{palletNumbers.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {palletNumbers.map((palletNumber) => {
                  const photos = palletPhotoMap[palletNumber] || [];
                  const isUploading = palletUploadState[palletNumber];
                  return (
                    <div
                      key={`pallet-${palletNumber}`}
                      className="border border-sky-200 rounded-xl p-4 bg-gradient-to-br from-sky-50 to-blue-50/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-sky-800">📦 Pallet #{palletNumber}</p>
                          <p className="text-[11px] text-sky-500">Add up to 5 photos</p>
                        </div>
                        {photos.length > 0 && (
                          <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-2 py-1 rounded-lg">
                            {photos.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 transition-all duration-200 cursor-pointer ${
                          photos.length >= 5
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            : 'border-sky-300 hover:border-sky-500 bg-white/60 hover:bg-sky-50'
                        }`}>
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
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs font-medium text-sky-600">Uploading...</span>
                            </div>
                          ) : photos.length >= 5 ? (
                            <>
                              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              <span className="text-xs font-medium text-gray-400">Limit reached</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-10 h-10 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-semibold text-sky-600">Upload Photos</span>
                              <span className="text-[10px] text-gray-400">Click or drag images</span>
                            </>
                          )}
                        </label>
                        {photos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {photos.map((photoUrl, index) => (
                              <div key={`${palletNumber}-photo-${index}`} className="relative group">
                                <img
                                  src={resolveMediaUrl(photoUrl)}
                                  alt={`Pallet ${palletNumber} photo ${index + 1}`}
                                  className="h-16 w-16 object-cover rounded-xl border-2 border-sky-200 shadow-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePalletPhoto(palletNumber, index)}
                                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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

      {/* Notes & Special Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {shipmentSettings.showNotes !== false && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="text-white font-semibold text-sm">
                  Additional Notes {shipmentSettings.requireNotes && <span className="text-red-300">*</span>}
                </h3>
              </div>
            </div>
            <div className="p-4">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                placeholder="Any additional notes or comments..."
                required={shipmentSettings.requireNotes}
              />
            </div>
          </div>
        )}

        {shipmentSettings.showSpecialInstructions !== false && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-white font-semibold text-sm">Special Instructions</h3>
              </div>
            </div>
            <div className="p-4">
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                placeholder="Any special handling or storage requirements..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="animate-fadeIn space-y-5">
      {/* Storage Assignment */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏗️</span>
            <h3 className="text-white font-semibold text-sm">Storage Assignment</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Assign to Rack {shipmentSettings.requireRackAssignment && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </span>
                <select
                  name="rackId"
                  value={formData.rackId}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white appearance-none hover:border-emerald-300"
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
            </div>

            {shipmentSettings.showEstimatedDays !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estimated Storage Days {shipmentSettings.requireEstimatedDays && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <input
                    type="number"
                    name="estimatedDays"
                    value={formData.estimatedDays}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white hover:border-emerald-300"
                    min="1"
                    required={shipmentSettings.requireEstimatedDays}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔧</span>
              <h3 className="text-white font-semibold text-sm">Custom Fields</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.map(field => (
                <div key={field.id} className={field.fieldType === 'TEXTAREA' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.fieldName} {field.isRequired && <span className="text-red-500">*</span>}
                  </label>
                  {renderCustomField(field)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cost Preview Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h3 className="text-white font-semibold text-sm">Estimated Storage Cost</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-amber-50/70 rounded-xl border border-amber-200">
              <div className="text-xs font-medium text-amber-700 mb-1">Base Cost</div>
              <div className="text-2xl font-bold text-amber-900">
                {estimatedCost.baseCost.toFixed(3)}
              </div>
              <div className="text-[10px] text-amber-600 mt-1">
                {pricing.currency}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {formData.pieces} pcs × {formData.estimatedDays}d × {pricing.storageRate} rate
              </div>
            </div>
            <div className="text-center p-4 bg-amber-50/70 rounded-xl border border-amber-200">
              <div className="text-xs font-medium text-amber-700 mb-1">Tax ({pricing.taxRate}%)</div>
              <div className="text-2xl font-bold text-amber-900">
                {estimatedCost.tax.toFixed(3)}
              </div>
              <div className="text-[10px] text-amber-600 mt-1">
                {pricing.currency}
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl border-2 border-amber-300 shadow-sm">
              <div className="text-xs font-bold text-amber-800 mb-1">Total Estimate</div>
              <div className="text-3xl font-black text-amber-900">
                {estimatedCost.total.toFixed(3)}
              </div>
              <div className="text-xs font-semibold text-amber-700 mt-1">
                {pricing.currency}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Requirements Banner */}
      {(shipmentSettings.requireClientEmail || shipmentSettings.requireEstimatedValue || shipmentSettings.requireRackAssignment) && (
        <div className="bg-blue-50/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">ℹ️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1.5">Company Settings Applied</p>
              <ul className="text-xs space-y-1 text-blue-700">
                {shipmentSettings.requireClientEmail && <li>• Client email is required</li>}
                {shipmentSettings.requireEstimatedValue && <li>• Estimated value is required</li>}
                {shipmentSettings.requireRackAssignment && <li>• Rack assignment is required</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-5">
        <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Shipment Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white/70 rounded-xl p-3 border border-indigo-100">
            <span className="text-xs text-indigo-500 block">Mode</span>
            <span className="font-semibold text-indigo-900 capitalize">{intakeMode}</span>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-indigo-100">
            <span className="text-xs text-indigo-500 block">Client</span>
            <span className="font-semibold text-indigo-900 truncate block">{formData.clientName || '—'}</span>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-indigo-100">
            <span className="text-xs text-indigo-500 block">Total Pcs</span>
            <span className="font-semibold text-indigo-900">{formData.pieces}</span>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-indigo-100">
            <span className="text-xs text-indigo-500 block">Barcode</span>
            <span className="font-semibold text-indigo-900 font-mono text-xs">{formData.barcode}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 🎯 MAIN RENDER
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 transform transition-all duration-300 scale-100 animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">New Shipment Intake</h2>
                <p className="text-slate-400 text-xs">Warehouse Management System • New Shipment Intake</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-xl p-2 hover:bg-white/10 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Messages */}
            {error && (
              <div className="bg-red-50/90 backdrop-blur-sm border-2 border-red-200 text-red-700 p-4 rounded-2xl animate-shake">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Error</p>
                    <p className="text-sm text-red-600 mt-0.5">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50/90 backdrop-blur-sm border-2 border-emerald-200 text-emerald-700 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>{success}</span>
                </div>
              </div>
            )}

            {/* All Sections */}
            <div className="space-y-6 animate-fadeIn">
              {renderClientInfoStep()}
              {renderShipmentDetailsStep()}
              {renderDimensionsStep()}
              {renderPhotosAndNotesStep()}
              {renderReviewStep()}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50/80 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}>
              {loading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Creating...</>) : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Create Shipment</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

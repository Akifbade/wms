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

  // ???? INTAKE MODE STATE (Pallet vs Box mode)
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

    console.log('🎯 Generating dimensions - Mode:', intakeMode, 'Pallets:', palletCount, 'Pieces:', pieces, 'Extra:', looseBoxes);

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
      console.log('🎯 Updating dimensions:', newDimensions.length, 'rows');
      setDimensions(newDimensions);
    }
  }, [intakeMode, formData.palletCount, formData.pieces, extraBoxes]);

  // ???? SHIPMENT SETTINGS STATE
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

  // ???? FORM SECTION ORDERING STATE
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
        loadShipmentSettings(), // ???? LOAD SETTINGS
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

  // ???? LOAD SHIPMENT SETTINGS
  const loadShipmentSettings = async () => {
    try {
      const response = await fetch('/api/shipment-settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings || data;
        setShipmentSettings(settings);

        // ???? LOAD SECTION ORDER FROM SETTINGS
        if (settings.formSectionOrder) {
          try {
            const order = JSON.parse(settings.formSectionOrder);
            setSectionOrder(order);
            console.log('??? Section order loaded:', order);
          } catch (e) {
            console.log('Using default section order');
          }
        }

        console.log('??? Shipment settings loaded:', settings);
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
      // 🔒 CHECK CONTRACT VALIDITY - BLOCK IF EXPIRED/SUSPENDED
      if (formData.companyProfileId && contractValidity?.hasContract && !contractValidity?.canOperate) {
        throw new Error(`Cannot receive shipment: ${contractValidity?.message || 'Contract has expired or is suspended. Please renew the contract.'}`);
      }

      // ???? VALIDATE AGAINST SHIPMENT SETTINGS
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

      // ???? ADDITIONAL CONDITIONAL VALIDATIONS
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

  if (!isOpen) return null;

  const estimatedCost = calculateEstimatedCost();

  // ???? SECTION RENDER FUNCTIONS
  const renderBasicSection = () => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center">
          Basic Shipment Info
        </h3>

        {/* INTAKE MODE TOGGLE */}
        <div className="bg-white p-3 rounded-lg border-2 border-blue-300 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Intake Mode:</p>
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
                setVariablePerPallet(false);
                setBoxesDistribution([1]);
                setExtraBoxes(0);
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${intakeMode === 'pallet'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Pallet Mode
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
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${intakeMode === 'box'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Box Mode
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
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${contractValidity?.hasContract && !contractValidity?.canOperate
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300'
              }`}
          >
            <option value="">Select company (optional)</option>
            {companyProfiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>

          {/* Checking Contract Status */}
          {checkingContract && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Checking contract status...
            </div>
          )}

          {/* Contract Expired/Suspended Warning */}
          {contractValidity?.hasContract && !contractValidity?.canOperate && (
            <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">⛔</span>
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    CONTRACT {contractValidity.isExpired ? 'EXPIRED' : contractValidity.isSuspended ? 'SUSPENDED' : 'BLOCKED'} - SHIPMENT BLOCKED
                  </p>
                  <p className="text-xs text-red-600">
                    {contractValidity.message || 'This customer\'s contract has expired or is suspended. Please renew the contract to receive shipments.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contract Valid Badge */}
          {contractValidity?.hasContract && contractValidity?.canOperate && (
            <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="text-sm font-medium text-blue-700">
                  Contract Customer - {contractValidity.monthlyRate} KWD/month ✓
                </span>
              </div>
            </div>
          )}
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
            Arrival Date <span className="text-red-500">*</span>
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
                Pallet Count <span className="text-red-500">*</span>
              </label>
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
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boxes per Pallet <span className="text-red-500">*</span>
              </label>
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
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                min="1"
                required
                disabled={variablePerPallet}
              />
            </div>
            <div className="md:col-span-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-3">
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
                    className="w-5 h-5"
                  />
                  <label htmlFor="variablePerPallet" className="text-sm font-medium text-blue-900">Variable boxes per pallet + extra loose boxes</label>
                </div>
                {variablePerPallet && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Array.from({ length: Math.max(getSafeNumber(formData.palletCount, 0), 0) }, (_, idx) => idx).map((idx) => (
                        <div key={`bpp-${idx}`} className="bg-white border border-blue-200 rounded-md p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Pallet #{idx + 1} boxes</label>
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
                            className="w-full px-2 py-2 border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Extra loose boxes (not on pallets)</label>
                      <input
                        type="number"
                        min={0}
                        value={extraBoxes}
                        onChange={(ev) => setExtraBoxes(Math.max(0, parseInt(ev.target.value) || 0))}
                        className="w-full px-2 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* BOX MODE FIELDS */}
        {intakeMode === 'box' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Boxes <span className="text-red-500">*</span>
            </label>
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
              Total Boxes (auto)
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
                    Pallet Photos (optional)
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

        {/* DIMENSIONS & CBM SECTION - MULTI DIMENSION */}
        <div className="md:col-span-3">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-800">
                📦 Shipment Dimensions & Volume
              </h4>
              <div className="flex items-center gap-3">
                {/* Toggle for Direct CBM vs Dimensions */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${!useDirectCBM ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                    Multi-Dim
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseDirectCBM(!useDirectCBM)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useDirectCBM ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useDirectCBM ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                  </button>
                  <span className={`text-xs ${useDirectCBM ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    Direct CBM
                  </span>
                </div>
              </div>
            </div>

            {useDirectCBM ? (
              /* Direct CBM Input */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    CBM (m³) - Direct Input
                  </label>
                  <input
                    type="number"
                    name="directCBM"
                    value={formData.directCBM || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="0.680"
                    min="0"
                    step="0.001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            ) : (
              /* Multi-Dimension Inputs */
              <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-600 px-1">
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
                    <div key={dim.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {label}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={dim.length || ''}
                          onChange={(e) => updateDimension(dim.id, 'length', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={dim.width || ''}
                          onChange={(e) => updateDimension(dim.id, 'width', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={dim.height || ''}
                          onChange={(e) => updateDimension(dim.id, 'height', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          value={dim.weight || ''}
                          onChange={(e) => updateDimension(dim.id, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          value={dim.qty || 1}
                          onChange={(e) => updateDimension(dim.id, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="px-2 py-1.5 bg-slate-100 rounded text-sm font-medium text-slate-700 text-center">
                          {dim.cbm.toFixed(4)}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {dimensions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDimension(dim.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
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
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Dimension Row
                </button>

                {/* Totals */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-600 mb-1">Total CBM</div>
                      <div className="text-lg font-bold text-blue-700">{dimensionsTotal.cbm.toFixed(4)} m³</div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-600 mb-1">Total Weight</div>
                      <div className="text-lg font-bold text-slate-700">{dimensionsTotal.weight.toFixed(2)} kg</div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-600 mb-1">Total Pieces</div>
                      <div className="text-lg font-bold text-slate-700">{dimensionsTotal.pieces}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientSection = () => (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        Client Information
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
              This is a warehouse shipment (import/export with shipper/consignee details)
            </label>
          </div>
        </div>

        {formData.isWarehouseShipment && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold mb-4 text-orange-800 flex items-center">
              Warehouse Details
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
                    Dimensions (L??W??H) {shipmentSettings.requireDimensions && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100??50??30 cm"
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
        Storage Assignment
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
          Custom Fields
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
        Estimated Cost
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

  // ???? SECTION MAPPING
  const formSections: Record<string, () => JSX.Element | null> = {
    basic: renderBasicSection,
    client: renderClientSection,
    warehouse: renderWarehouseSection,
    storage: renderStorageSection,
    custom: renderCustomFieldsSection,
    pricing: renderPricingSection,
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 transform transition-all duration-300 scale-100">
        {/* Header - Clean Professional */}
        <div className="bg-slate-900 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">New Shipment Intake</h2>
              <p className="text-slate-400 text-sm">Warehouse Management System</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-lg p-2 hover:bg-white/10 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6 w-full">

            {/* Messages */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <span className="mr-2">!</span>
                  {error}
                </div>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  {success}
                </div>
              </div>
            )}

            {/* Settings Info Banner */}
            {(shipmentSettings.requireClientEmail || shipmentSettings.requireEstimatedValue || shipmentSettings.requireRackAssignment) && (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <span className="mr-2 text-lg">i</span>
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

            {/* ???? SECTION ORDERING CONTROLS */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Form Sections Order:</span>
                  <span className="text-xs text-gray-500">Click arrows to reorder</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sectionOrder.map((section, index) => {
                    const sectionLabels: Record<string, string> = {
                      basic: 'Basic',
                      client: 'Client',
                      warehouse: 'Warehouse',
                      storage: 'Storage',
                      custom: 'Custom',
                      pricing: 'Pricing'
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
                            Up
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
                            Down
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ???? DYNAMIC SECTIONS - RENDER IN ORDER */}
            {sectionOrder.map((sectionId) => {
              const SectionComponent = formSections[sectionId];
              return SectionComponent ? (
                <div key={sectionId}>
                  {SectionComponent()}
                </div>
              ) : null;
            })}

            {/* ???? CONDITIONAL: Notes */}
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

            {/* ✅ Storage Assignment - Now using renderStorageSection() component above to avoid duplication */}
            {renderStorageSection()}

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold mb-4 text-purple-800 flex items-center">
                  ??? Custom Fields
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
                Estimated Storage Cost
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Base Cost</div>
                  <div className="text-xl font-bold text-blue-800">
                    {estimatedCost.baseCost.toFixed(3)} {pricing.currency}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formData.pieces} pieces x {formData.estimatedDays} days x {pricing.storageRate} rate
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

            {/* Action Buttons */}
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
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={loading}
              >
                Reset
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { billingAPI } from '../services/api';
import { ReleaseNoteModal } from './ReleaseNoteModal';

interface ChargeType {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  calculationType: string;
  rate: number;
  minCharge?: number;
  maxCharge?: number;
  applyOnRelease: boolean;
  isTaxable: boolean;
}

interface LineItem {
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

interface ReleaseShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any;
  onSuccess: () => void;
}

type QuantityType = 'BOXES' | 'PALLETS' | 'PIECES' | 'CARTONS' | 'BAGS' | 'CONTAINERS' | 'CRATES' | 'UNITS' | 'CUSTOM';

export const ReleaseShipmentModal: React.FC<ReleaseShipmentModalProps> = ({
  isOpen,
  onClose,
  shipment,
  onSuccess,
}) => {
  const [releaseType, setReleaseType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [boxesToRelease, setBoxesToRelease] = useState(shipment?.currentBoxCount || 0);
  const [quantityType, setQuantityType] = useState<QuantityType>('BOXES');
  const [customQuantityType, setCustomQuantityType] = useState('');
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());
  const [customCharge, setCustomCharge] = useState({ description: '', amount: 0 });
  const [addingCustom, setAddingCustom] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [collectorID, setCollectorID] = useState('');
  const [releasePhotos, setReleasePhotos] = useState<string[]>([]);
  const [showReleaseNote, setShowReleaseNote] = useState(false);
  const [releaseNoteData, setReleaseNoteData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && shipment) {
      loadData();
      setBoxesToRelease(shipment.currentBoxCount || 0);
    }
  }, [isOpen, shipment]);

  useEffect(() => {
    if (shipment && chargeTypes.length > 0 && settings) {
      calculateCharges();
    }
  }, [boxesToRelease, selectedCharges, chargeTypes, settings, releaseType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, chargesData] = await Promise.all([
        billingAPI.getSettings(),
        billingAPI.getChargeTypes({ category: 'RELEASE', active: true }),
      ]);

      setSettings(settingsData);
      setChargeTypes(chargesData);

      // Auto-select charges that apply on release
      const autoCharges = new Set<string>();
      chargesData.forEach((charge: ChargeType) => {
        if (charge.applyOnRelease) {
          autoCharges.add(charge.id);
        }
      });
      setSelectedCharges(autoCharges);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCharges = () => {
    const items: LineItem[] = [];
    const taxRate = settings?.taxRate || 0;

    // Get display label for quantity type
    const getQuantityLabel = () => {
      if (quantityType === 'CUSTOM' && customQuantityType) {
        return customQuantityType.toLowerCase();
      }
      return quantityType.toLowerCase();
    };

    const quantityLabel = getQuantityLabel();

    // Calculate storage charges
    const receivedDate = new Date(shipment.receivedDate);
    const today = new Date();
    const daysStored = Math.max(0, Math.ceil((today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)));
    const gracePeriod = settings?.gracePeriodDays || 0;
    const chargeableDays = Math.max(0, daysStored - gracePeriod);

    if (chargeableDays > 0) {
      const storageRate = settings?.storageRatePerBox || 0;
      const storageAmount = chargeableDays * boxesToRelease * storageRate;
      const storageTax = (storageAmount * taxRate) / 100;

      items.push({
        description: `Storage Fee (${chargeableDays} days × ${boxesToRelease} ${quantityLabel} × ${storageRate.toFixed(3)} ${settings.currency})`,
        category: 'STORAGE',
        quantity: chargeableDays * boxesToRelease,
        unitPrice: storageRate,
        amount: storageAmount,
        taxRate,
        taxAmount: storageTax,
      });
    }

    // Add selected charge types
    selectedCharges.forEach((chargeId) => {
      const charge = chargeTypes.find((c) => c.id === chargeId);
      if (!charge) return;

      let amount = 0;

      switch (charge.calculationType) {
        case 'PER_BOX':
          amount = charge.rate * boxesToRelease;
          break;
        case 'FLAT':
          amount = charge.rate;
          break;
        case 'PERCENTAGE':
          // Calculate percentage of current subtotal
          const currentSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
          amount = (currentSubtotal * charge.rate) / 100;
          break;
        case 'PER_SHIPMENT':
          amount = charge.rate;
          break;
        default:
          amount = charge.rate;
      }

      // Apply min/max constraints
      if (charge.minCharge && amount < charge.minCharge) {
        amount = charge.minCharge;
      }
      if (charge.maxCharge && amount > charge.maxCharge) {
        amount = charge.maxCharge;
      }

      const chargeTax = charge.isTaxable ? (amount * taxRate) / 100 : 0;

      // Build description based on calculation type
      let chargeDescription = charge.name;
      if (charge.calculationType === 'PER_BOX') {
        chargeDescription += ` (${boxesToRelease} ${quantityLabel} × ${charge.rate.toFixed(3)} ${settings.currency})`;
      } else if (charge.calculationType === 'PERCENTAGE') {
        chargeDescription += ` (${charge.rate}% of charges)`;
      } else if (charge.calculationType === 'FLAT') {
        chargeDescription += ` (flat fee)`;
      }
      if (charge.description) {
        chargeDescription += ` - ${charge.description}`;
      }

      items.push({
        description: chargeDescription,
        category: charge.category,
        quantity: charge.calculationType === 'PER_BOX' ? boxesToRelease : 1,
        unitPrice: charge.rate,
        amount,
        taxRate: charge.isTaxable ? taxRate : 0,
        taxAmount: chargeTax,
      });
    });

    // Add custom charge if added
    if (addingCustom && customCharge.amount > 0) {
      const customTax = (customCharge.amount * taxRate) / 100;
      items.push({
        description: customCharge.description || 'Custom Charge',
        category: 'OTHER',
        quantity: 1,
        unitPrice: customCharge.amount,
        amount: customCharge.amount,
        taxRate,
        taxAmount: customTax,
      });
    }

    setLineItems(items);
  };

  const handleGenerateInvoice = async () => {
    if (!shipment || lineItems.length === 0) return;

    // Validate required fields based on settings
    if (settings?.requireIDVerification && !collectorID.trim()) {
      alert('Collector ID verification is required by company settings');
      return;
    }

    if (settings?.requireReleasePhotos && releasePhotos.length === 0) {
      alert('Release photos are required by company settings');
      return;
    }

    setGenerating(true);
    try {
      const quantityLabel = quantityType === 'CUSTOM' && customQuantityType 
        ? customQuantityType.toLowerCase() 
        : quantityType.toLowerCase();

      const invoice = {
        shipmentId: shipment.id,
        clientName: shipment.clientName,
        clientPhone: shipment.clientPhone,
        clientAddress: shipment.clientAddress,
        lineItems,
        notes: `Release ${releaseType.toLowerCase()} shipment - ${boxesToRelease} ${quantityLabel}`,
        isWarehouseInvoice: shipment.isWarehouseShipment || false,
        warehouseData: shipment.warehouseData || null,
      };

      console.log('Creating invoice with data:', invoice);
      const invoiceResult = await billingAPI.createInvoice(invoice);
      console.log('Invoice created successfully:', invoiceResult);

      // Release boxes using proper API endpoint that handles rack capacity
      if (releaseType === 'FULL') {
        const releaseResponse = await fetch(`/api/shipments/${shipment.id}/release-boxes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            releaseAll: true,
            collectorID: collectorID || undefined,
            releasePhotos: releasePhotos.length > 0 ? releasePhotos : undefined
          })
        });
        
        if (!releaseResponse.ok) {
          const errorData = await releaseResponse.json();
          console.error('Release API Error (Full):', errorData);
          throw new Error(errorData.error || 'Failed to release boxes');
        }
      } else {
        // For partial release, we need to get the first N boxes in storage
        const boxesResponse = await fetch(`/api/shipments/${shipment.id}/boxes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const boxesData = await boxesResponse.json();
        const inStorageBoxes = boxesData.boxes.filter((b: any) => b.status === 'IN_STORAGE');
        const boxNumbers = inStorageBoxes.slice(0, boxesToRelease).map((b: any) => b.boxNumber);
        
        const releaseResponse = await fetch(`/api/shipments/${shipment.id}/release-boxes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            boxNumbers,
            collectorID: collectorID || undefined,
            releasePhotos: releasePhotos.length > 0 ? releasePhotos : undefined
          })
        });
        
        if (!releaseResponse.ok) {
          const errorData = await releaseResponse.json();
          console.error('Release API Error (Partial):', errorData);
          throw new Error(errorData.error || 'Failed to release boxes');
        }
      }

      // Prepare release note data
      const releaseData = {
        shipment,
        invoice: invoiceResult.invoice,
        releaseDate: new Date(),
        releasedBy: 'Admin User', // TODO: Get from auth context
        collectorID,
        releaseType,
        boxesReleased: releaseType === 'FULL' ? shipment.currentBoxCount : boxesToRelease,
      };
      
      setReleaseNoteData(releaseData);
      setShowReleaseNote(true);

      onSuccess();
    } catch (error: any) {
      console.error('Failed to generate invoice:', error);
      console.error('Error details:', error.message, error.stack);
      alert(error.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal + totalTax;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Release Shipment</h2>
            <p className="text-sm text-gray-600 mt-1">
              {shipment?.referenceId} - {shipment?.clientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading billing data...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Shipment & Rack Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Current Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Available to Release</p>
                  <p className="text-lg font-bold text-gray-900">{shipment?.currentBoxCount || 0} / {shipment?.originalBoxCount || 0} boxes</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Assigned Rack</p>
                  <p className="text-lg font-bold text-blue-600">{shipment?.rack?.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Rack Location</p>
                  <p className="text-sm font-medium text-gray-700">{shipment?.rack?.location || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">After Release</p>
                  {releaseType === 'FULL' ? (
                    <p className="text-lg font-bold text-green-600">0 / {shipment?.originalBoxCount || 0} ✓</p>
                  ) : (
                    <p className="text-lg font-bold text-orange-600">{(shipment?.currentBoxCount || 0) - boxesToRelease} / {shipment?.originalBoxCount || 0} boxes</p>
                  )}
                </div>
              </div>
              {shipment?.rack && (
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Rack Capacity Impact:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, ((shipment.rack.capacityUsed || 0) / (shipment.rack.capacityTotal || 1)) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {shipment.rack.capacityUsed}/{shipment.rack.capacityTotal}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Will free {releaseType === 'FULL' ? shipment.currentBoxCount : boxesToRelease} units of space
                  </p>
                </div>
              )}
            </div>

            {/* Release Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Release Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setReleaseType('FULL');
                    setBoxesToRelease(shipment.currentBoxCount || 0);
                  }}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    releaseType === 'FULL'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Full Release</div>
                  <div className="text-sm text-gray-600 mt-1">
                    All {shipment?.currentBoxCount} {quantityType === 'CUSTOM' && customQuantityType ? customQuantityType.toLowerCase() : quantityType.toLowerCase()}
                  </div>
                </button>
                <button
                  onClick={() => setReleaseType('PARTIAL')}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    releaseType === 'PARTIAL'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Partial Release</div>
                  <div className="text-sm text-gray-600 mt-1">Select box count</div>
                </button>
              </div>
            </div>

            {/* Quantity Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['BOXES', 'PALLETS', 'PIECES', 'CARTONS', 'BAGS', 'CONTAINERS', 'CRATES', 'UNITS'] as QuantityType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setQuantityType(type)}
                    className={`px-3 py-2 text-sm border rounded-lg transition-all ${
                      quantityType === type
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              
              {/* Custom Quantity Type */}
              <div className="mt-3">
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={quantityType === 'CUSTOM'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setQuantityType('CUSTOM' as QuantityType);
                      } else {
                        setQuantityType('BOXES');
                        setCustomQuantityType('');
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                  />
                  Custom Type
                </label>
                {quantityType === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customQuantityType}
                    onChange={(e) => setCustomQuantityType(e.target.value)}
                    placeholder="e.g., Drums, Rolls, Sets"
                    className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>

            {/* Quantity to Release */}
            {releaseType === 'PARTIAL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of {quantityType === 'CUSTOM' && customQuantityType ? customQuantityType : quantityType.charAt(0) + quantityType.slice(1).toLowerCase()} to Release
                </label>
                <input
                  type="number"
                  min="1"
                  max={shipment?.currentBoxCount || 1}
                  value={boxesToRelease}
                  onChange={(e) => setBoxesToRelease(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: {shipment?.currentBoxCount} {quantityType === 'CUSTOM' && customQuantityType ? customQuantityType.toLowerCase() : quantityType.toLowerCase()} available
                </p>
              </div>
            )}

            {/* Collector ID Verification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collector ID Verification
                {settings?.requireIDVerification && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                type="text"
                value={collectorID}
                onChange={(e) => setCollectorID(e.target.value)}
                placeholder="Enter collector's ID number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required={settings?.requireIDVerification}
              />
              {settings?.requireIDVerification && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ ID verification is required by company settings
                </p>
              )}
            </div>

            {/* Release Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Release Photos
                {settings?.requireReleasePhotos && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                type="text"
                value={releasePhotos.join(', ')}
                onChange={(e) => setReleasePhotos(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Enter photo URLs (comma-separated)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required={settings?.requireReleasePhotos}
              />
              {settings?.requireReleasePhotos && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Release photos are required by company settings
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Upload photos and paste URLs here, separated by commas
              </p>
            </div>

            {/* Charge Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Additional Charges
              </label>
              <div className="space-y-2">
                {chargeTypes.map((charge) => (
                  <label
                    key={charge.id}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedCharges.has(charge.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCharges.has(charge.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedCharges);
                        if (e.target.checked) {
                          newSelected.add(charge.id);
                        } else {
                          newSelected.delete(charge.id);
                        }
                        setSelectedCharges(newSelected);
                      }}
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{charge.name}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {charge.rate.toFixed(3)} {settings.currency}
                          {charge.calculationType === 'PERCENTAGE' && '%'}
                        </span>
                      </div>
                      {charge.description && (
                        <p className="text-sm text-gray-600 mt-0.5">{charge.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {charge.calculationType.replace('_', ' ').toLowerCase()}
                        {charge.minCharge && ` • Min: ${charge.minCharge} ${settings.currency}`}
                        {charge.maxCharge && ` • Max: ${charge.maxCharge} ${settings.currency}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Charge */}
            <div>
              <button
                onClick={() => setAddingCustom(!addingCustom)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {addingCustom ? '- Remove Custom Charge' : '+ Add Custom Charge'}
              </button>

              {addingCustom && (
                <div className="mt-3 p-4 border border-gray-200 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={customCharge.description}
                    onChange={(e) =>
                      setCustomCharge({ ...customCharge, description: e.target.value })
                    }
                    placeholder="Description (e.g., Special handling)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={customCharge.amount || ''}
                    onChange={(e) =>
                      setCustomCharge({ ...customCharge, amount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Invoice Preview */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5" />
                Invoice Preview
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} × {item.unitPrice.toFixed(3)} {settings.currency}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {item.amount.toFixed(3)} {settings.currency}
                      </div>
                      {item.taxAmount > 0 && (
                        <div className="text-xs text-gray-500">
                          +{item.taxAmount.toFixed(3)} tax
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {lineItems.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No charges calculated yet
                  </div>
                )}

                {lineItems.length > 0 && (
                  <>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium text-gray-900">
                          {subtotal.toFixed(3)} {settings.currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Tax ({settings.taxRate}%):</span>
                        <span className="font-medium text-gray-900">
                          {totalTax.toFixed(3)} {settings.currency}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-gray-400 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-xl font-bold text-primary-600">
                          {total.toFixed(3)} {settings.currency}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={generating}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={
                  generating || 
                  lineItems.length === 0 || 
                  (settings?.requireIDVerification && !collectorID.trim()) ||
                  (settings?.requireReleasePhotos && releasePhotos.length === 0)
                }
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Generate Invoice & Release
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Release Note Modal */}
      {showReleaseNote && releaseNoteData && (
        <ReleaseNoteModal
          isOpen={showReleaseNote}
          onClose={() => {
            setShowReleaseNote(false);
            onClose();
          }}
          releaseData={releaseNoteData}
        />
      )}
    </div>
  );
};


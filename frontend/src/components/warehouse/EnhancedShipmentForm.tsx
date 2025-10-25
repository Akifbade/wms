import React, { useState, useEffect } from 'react';
import { shipmentsAPI } from '../../services/api';

interface EnhancedShipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shipmentId?: string; // For editing existing shipment
}

const SHIPMENT_CATEGORIES = [
  { value: 'CUSTOMER_STORAGE', label: 'Customer Storage', icon: '📦' },
  { value: 'AIRPORT_CARGO', label: 'Airport Cargo', icon: '✈️' },
  { value: 'WAREHOUSE_STOCK', label: 'Warehouse Stock', icon: '🏭' },
];

const ITEM_CATEGORIES = [
  'BAGS',
  'SHOES',
  'ELECTRONICS',
  'FURNITURE',
  'CLOTHING',
  'DOCUMENTS',
  'FRAGILE',
  'GENERAL',
];

export default function EnhancedShipmentForm({
  isOpen,
  onClose,
  onSuccess,
  shipmentId,
}: EnhancedShipmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'items' | 'details'>('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    referenceId: '',
    originalBoxCount: 1,
    type: 'COMMERCIAL' as 'PERSONAL' | 'COMMERCIAL',
    arrivalDate: new Date().toISOString().split('T')[0],
    description: '',
    estimatedValue: 0,
    notes: '',

    // Warehouse Fields
    isWarehouseShipment: true,
    category: 'CUSTOMER_STORAGE',
    customerName: '',
    shipper: '',
    consignee: '',
    
    // Airport Specific
    awbNumber: '',
    flightNumber: '',
    origin: '',
    destination: '',

    // Contact Info
    clientName: '',
    clientPhone: '',
    clientEmail: '',
  });

  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    itemName: '',
    itemDescription: '',
    category: 'GENERAL',
    quantity: 1,
    weight: 0,
    value: 0,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (shipmentId) {
      loadShipment();
    } else {
      resetForm();
    }
  }, [isOpen, shipmentId]);

  const resetForm = () => {
    setFormData({
      name: '',
      referenceId: '',
      originalBoxCount: 1,
      type: 'COMMERCIAL',
      arrivalDate: new Date().toISOString().split('T')[0],
      description: '',
      estimatedValue: 0,
      notes: '',
      isWarehouseShipment: true,
      category: 'CUSTOMER_STORAGE',
      customerName: '',
      shipper: '',
      consignee: '',
      awbNumber: '',
      flightNumber: '',
      origin: '',
      destination: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
    });
    setItems([]);
    setError('');
    setSuccess('');
    setActiveTab('basic');
  };

  const loadShipment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(data.shipment);
        
        // Load items
        const itemsResponse = await fetch(`/api/shipments/${shipmentId}/items`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setItems(itemsData.items || []);
        }
      }
    } catch (err: any) {
      setError('Failed to load shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    if (!newItem.itemName) {
      setError('Item name is required');
      return;
    }

    setItems(prev => [...prev, { ...newItem, id: Date.now().toString() }]);
    setNewItem({
      itemName: '',
      itemDescription: '',
      category: 'GENERAL',
      quantity: 1,
      weight: 0,
      value: 0,
    });
    setError('');
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create or update shipment
      const response = await fetch(
        shipmentId ? `/api/shipments/${shipmentId}` : '/api/shipments',
        {
          method: shipmentId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save shipment');
      }

      const data = await response.json();
      const createdShipmentId = shipmentId || data.shipment.id;

      // If we have items, bulk create them
      if (items.length > 0 && !shipmentId) {
        const itemsResponse = await fetch(
          `/api/shipments/${createdShipmentId}/items/bulk`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({ items }),
          }
        );

        if (!itemsResponse.ok) {
          console.error('Failed to add items');
        }
      }

      setSuccess('Shipment saved successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isAirportShipment = formData.category === 'AIRPORT_CARGO';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {shipmentId ? 'Edit Shipment' : 'Create New Shipment'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-4 px-6">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Basic Info
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'items'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Items ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Additional Details
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
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

            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipment Category *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {SHIPMENT_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleInputChange('category', cat.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.category === cat.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <div className="text-3xl mb-2">{cat.icon}</div>
                        <div className="font-medium text-sm">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipment Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., Dior Shipment #001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference ID *
                    </label>
                    <input
                      type="text"
                      value={formData.referenceId}
                      onChange={e => handleInputChange('referenceId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., REF-2025-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={e => handleInputChange('customerName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="e.g., Dior, Boodai Trading"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Boxes/Pallets *
                    </label>
                    <input
                      type="number"
                      value={formData.originalBoxCount}
                      onChange={e =>
                        handleInputChange('originalBoxCount', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arrival Date *
                    </label>
                    <input
                      type="date"
                      value={formData.arrivalDate}
                      onChange={e => handleInputChange('arrivalDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Value (KWD)
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={e =>
                        handleInputChange('estimatedValue', parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Airport Shipment Fields */}
                {isAirportShipment && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                      ✈️ Airport Cargo Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          AWB Number *
                        </label>
                        <input
                          type="text"
                          value={formData.awbNumber}
                          onChange={e => handleInputChange('awbNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          required={isAirportShipment}
                          placeholder="e.g., 020-12345678"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Flight Number
                        </label>
                        <input
                          type="text"
                          value={formData.flightNumber}
                          onChange={e => handleInputChange('flightNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., EK123"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Origin
                        </label>
                        <input
                          type="text"
                          value={formData.origin}
                          onChange={e => handleInputChange('origin', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Dubai (DXB)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Destination
                        </label>
                        <input
                          type="text"
                          value={formData.destination}
                          onChange={e => handleInputChange('destination', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Kuwait (KWI)"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipper/Consignee */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipper
                    </label>
                    <input
                      type="text"
                      value={formData.shipper}
                      onChange={e => handleInputChange('shipper', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Sender name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consignee
                    </label>
                    <input
                      type="text"
                      value={formData.consignee}
                      onChange={e => handleInputChange('consignee', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Receiver name"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Add New Item</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newItem.itemName}
                        onChange={e =>
                          setNewItem(prev => ({ ...prev, itemName: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Item name (e.g., Louis Vuitton Bags)"
                      />
                    </div>

                    <select
                      value={newItem.category}
                      onChange={e =>
                        setNewItem(prev => ({ ...prev, category: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {ITEM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={e =>
                        setNewItem(prev => ({
                          ...prev,
                          quantity: parseInt(e.target.value),
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Quantity"
                      min="1"
                    />

                    <input
                      type="number"
                      value={newItem.weight}
                      onChange={e =>
                        setNewItem(prev => ({
                          ...prev,
                          weight: parseFloat(e.target.value),
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Weight (KG)"
                      step="0.1"
                      min="0"
                    />

                    <input
                      type="number"
                      value={newItem.value}
                      onChange={e =>
                        setNewItem(prev => ({ ...prev, value: parseFloat(e.target.value) }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Value (KWD)"
                      step="0.01"
                      min="0"
                    />

                    <button
                      type="button"
                      onClick={addItem}
                      className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      ➕ Add Item
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Items in Shipment</h3>
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-gray-600">
                            {item.category} • Qty: {item.quantity}
                            {item.weight > 0 && ` • ${item.weight} KG`}
                            {item.value > 0 && ` • ${item.value} KWD`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 ml-4"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Total Items</div>
                          <div className="text-xl font-bold text-blue-900">{items.length}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Total Quantity</div>
                          <div className="text-xl font-bold text-blue-900">
                            {items.reduce((sum, item) => sum + item.quantity, 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Total Value</div>
                          <div className="text-xl font-bold text-blue-900">
                            {items.reduce((sum, item) => sum + item.value, 0).toFixed(2)} KWD
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional shipment description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Internal notes..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={e => handleInputChange('clientName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={e => handleInputChange('clientPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={e => handleInputChange('clientEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : shipmentId ? 'Update Shipment' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

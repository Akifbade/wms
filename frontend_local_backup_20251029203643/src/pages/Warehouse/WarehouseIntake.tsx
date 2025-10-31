import React, { useState, useEffect } from 'react';
import { 
  TruckIcon, 
  QrCodeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface WarehouseIntakeProps {}

interface IntakeFormData {
  shipper: string;
  consignee: string;
  weight: number;
  pieces: number;
  notes: string;
  rackId: string;
}

interface Rack {
  id: string;
  code: string;
  qrCode: string;
  capacityTotal: number;
  capacityUsed: number;
}

interface BillingSettings {
  storageRatePerBox: number;
  gracePeriodDays: number;
  minimumCharge: number;
  currency: string;
}

export const WarehouseIntake: React.FC<WarehouseIntakeProps> = () => {
  const [formData, setFormData] = useState<IntakeFormData>({
    shipper: '',
    consignee: '',
    weight: 0,
    pieces: 1,
    notes: '',
    rackId: ''
  });
  
  const [racks, setRacks] = useState<Rack[]>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedBarcode, setGeneratedBarcode] = useState<string>('');

  useEffect(() => {
    loadIntakeData();
  }, []);

  const loadIntakeData = async () => {
    try {
      const response = await fetch('/api/warehouse/intake', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load intake data');
      
      const data = await response.json();
      setRacks(data.racks || []);
      setBillingSettings(data.billingSettings);
    } catch (err) {
      setError('Failed to load intake data');
      console.error('Error loading intake data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateBarcode = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    const barcode = `WH${year}${month}${day}${random}`;
    setGeneratedBarcode(barcode);
    return barcode;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shipper || !formData.consignee || !formData.weight || !formData.pieces) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/warehouse/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create shipment');
      }

      const result = await response.json();
      setSuccess(`Warehouse shipment created successfully! Barcode: ${result.shipment.referenceId}`);
      setGeneratedBarcode(result.shipment.referenceId);
      
      // Reset form
      setFormData({
        shipper: '',
        consignee: '',
        weight: 0,
        pieces: 1,
        notes: '',
        rackId: ''
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableRacks = racks.filter(rack => rack.capacityUsed < rack.capacityTotal);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Warehouse Intake</h1>
              <p className="text-sm text-gray-600">Register new shipment for warehouse storage</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                  {generatedBarcode && (
                    <div className="mt-2 p-3 bg-gray-100 rounded font-mono text-lg text-center">
                      {generatedBarcode}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {billingSettings && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-medium text-blue-900 mb-2">Storage Rates</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Storage Rate: {billingSettings.storageRatePerBox} {billingSettings.currency}/box/day</p>
                <p>• Grace Period: {billingSettings.gracePeriodDays} free days</p>
                <p>• Minimum Charge: {billingSettings.minimumCharge} {billingSettings.currency}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipper Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipper (Sender) *
                </label>
                <input
                  type="text"
                  value={formData.shipper}
                  onChange={(e) => setFormData({ ...formData, shipper: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter shipper name"
                  required
                />
              </div>

              {/* Consignee Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consignee (Receiver) *
                </label>
                <input
                  type="text"
                  value={formData.consignee}
                  onChange={(e) => setFormData({ ...formData, consignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter consignee name"
                  required
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight === 0 ? '' : formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter weight"
                  required
                />
              </div>

              {/* Pieces */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Pieces *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.pieces === 0 ? '' : formData.pieces}
                  onChange={(e) => setFormData({ ...formData, pieces: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number of pieces"
                  required
                />
              </div>
            </div>

            {/* Rack Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Rack
              </label>
              <select
                value={formData.rackId}
                onChange={(e) => setFormData({ ...formData, rackId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a rack (optional)</option>
                {availableRacks.map(rack => (
                  <option key={rack.id} value={rack.id}>
                    {rack.code} - Available: {rack.capacityTotal - rack.capacityUsed}/{rack.capacityTotal}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes or special instructions"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={generateBarcode}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Preview Barcode
              </button>
              
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Create Shipment
                  </>
                )}
              </button>
            </div>
          </form>

          {generatedBarcode && !success && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Preview Barcode:</h3>
              <div className="font-mono text-lg text-center py-2 bg-white border rounded">
                {generatedBarcode}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseIntake;

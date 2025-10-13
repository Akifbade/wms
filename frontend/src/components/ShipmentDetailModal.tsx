import { useState, useEffect } from 'react';
import { shipmentsAPI } from '../services/api';

interface ShipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
}

interface Shipment {
  id: string;
  name: string;
  referenceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  description?: string;
  originalBoxCount: number;
  currentBoxCount: number;
  type: string;
  status: string;
  estimatedValue?: number;
  notes?: string;
  qrCode: string;
  arrivalDate: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  rack?: {
    id: string;
    code: string;
    location: string;
  };
  withdrawals?: Withdrawal[];
}

interface Withdrawal {
  id: string;
  withdrawnBoxCount: number;
  withdrawalDate: string;
  withdrawnBy: string;
  notes?: string;
}

interface CustomFieldValue {
  id: string;
  customField: {
    fieldName: string;
    fieldType: string;
  };
  fieldValue: string;
}

export default function ShipmentDetailModal({ isOpen, onClose, shipmentId }: ShipmentDetailModalProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && shipmentId) {
      loadShipmentDetails();
      loadCustomFieldValues();
    }
  }, [isOpen, shipmentId]);

  const loadShipmentDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await shipmentsAPI.getById(shipmentId);
      setShipment(response.shipment);
    } catch (err: any) {
      setError('Failed to load shipment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFieldValues = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/custom-field-values/SHIPMENT/${shipmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomFieldValues(data.values || []);
      }
    } catch (err) {
      console.error('Failed to load custom field values:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; emoji: string; text: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🟡', text: 'Pending' },
      IN_TRANSIT: { color: 'bg-blue-100 text-blue-800 border-blue-300', emoji: '🚚', text: 'In Transit' },
      IN_STORAGE: { color: 'bg-green-100 text-green-800 border-green-300', emoji: '🟢', text: 'In Storage' },
      RELEASED: { color: 'bg-gray-100 text-gray-800 border-gray-300', emoji: '🔵', text: 'Released' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${badge.color}`}>
        {badge.emoji} {badge.text}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">📦 Shipment Details</h2>
            <p className="text-blue-100 text-sm mt-1">Reference: {shipment?.referenceId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading shipment details...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          ) : shipment ? (
            <div className="space-y-6">
              {/* Status & Basic Info */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{shipment.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">QR Code: {shipment.qrCode}</p>
                  </div>
                  {getStatusBadge(shipment.status)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="font-semibold text-gray-800">{shipment.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Boxes</p>
                    <p className="font-semibold text-gray-800">{shipment.originalBoxCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Current Boxes</p>
                    <p className="font-semibold text-gray-800">{shipment.currentBoxCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Arrival Date</p>
                    <p className="font-semibold text-gray-800">{new Date(shipment.arrivalDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                  <span className="text-xl mr-2">👤</span> Client Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-semibold text-gray-800">{shipment.clientName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-800">{shipment.clientPhone}</p>
                  </div>
                  {shipment.clientEmail && (
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-semibold text-gray-800">{shipment.clientEmail}</p>
                    </div>
                  )}
                  {shipment.estimatedValue && (
                    <div>
                      <p className="text-gray-600">Estimated Value</p>
                      <p className="font-semibold text-gray-800">KWD {shipment.estimatedValue.toFixed(3)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rack Information */}
              {shipment.rack && (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">🗄️</span> Storage Location
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Rack Code</p>
                      <p className="font-semibold text-gray-800">{shipment.rack.code}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-semibold text-gray-800">{shipment.rack.location}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description & Notes */}
              {(shipment.description || shipment.notes) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">📝</span> Additional Information
                  </h4>
                  {shipment.description && (
                    <div className="mb-3">
                      <p className="text-gray-600 text-sm">Description</p>
                      <p className="text-gray-800">{shipment.description}</p>
                    </div>
                  )}
                  {shipment.notes && (
                    <div>
                      <p className="text-gray-600 text-sm">Notes</p>
                      <p className="text-gray-800">{shipment.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Fields */}
              {customFieldValues.length > 0 && (
                <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">✨</span> Custom Fields
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {customFieldValues.map(cfv => (
                      <div key={cfv.id}>
                        <p className="text-gray-600">{cfv.customField.fieldName}</p>
                        <p className="font-semibold text-gray-800">
                          {cfv.customField.fieldType === 'CHECKBOX' 
                            ? (cfv.fieldValue === 'true' ? '✅ Yes' : '❌ No')
                            : cfv.fieldValue}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Withdrawal History */}
              {shipment.withdrawals && shipment.withdrawals.length > 0 && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">📤</span> Withdrawal History
                  </h4>
                  <div className="space-y-2">
                    {shipment.withdrawals.map(w => (
                      <div key={w.id} className="bg-white p-3 rounded border border-orange-200 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold">{w.withdrawnBoxCount} boxes withdrawn</span>
                          <span className="text-gray-600">{new Date(w.withdrawalDate).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 mt-1">Collected by: {w.withdrawnBy}</p>
                        {w.notes && <p className="text-gray-600 text-xs mt-1">{w.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                  <span className="text-xl mr-2">🕐</span> Audit Trail
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-semibold text-gray-800">{new Date(shipment.createdAt).toLocaleString()}</p>
                    {shipment.createdBy && <p className="text-xs text-gray-500">By: User ID {shipment.createdBy}</p>}
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated</p>
                    <p className="font-semibold text-gray-800">{new Date(shipment.updatedAt).toLocaleString()}</p>
                    {shipment.updatedBy && <p className="text-xs text-gray-500">By: User ID {shipment.updatedBy}</p>}
                  </div>
                  {shipment.releasedAt && (
                    <div>
                      <p className="text-gray-600">Released</p>
                      <p className="font-semibold text-gray-800">{new Date(shipment.releasedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

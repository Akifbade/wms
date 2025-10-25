import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  QrCodeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface WarehouseReleaseProps {}

interface WarehouseShipment {
  id: string;
  referenceId: string;
  shipper: string;
  consignee: string;
  originalBoxCount: number;
  status: string;
  createdAt: string;
  rack?: {
    code: string;
    qrCode: string;
  };
  boxes: Array<{
    id: string;
    boxNumber: number;
    qrCode: string;
    status: string;
    pieceQR?: string;
  }>;
  warehouseData?: {
    weight: number;
    pieces: number;
    notes?: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paymentStatus: string;
  }>;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  warehouseData: {
    storageDays: number;
    chargeableDays: number;
    storageCharges: number;
    handlingCharges: number;
    totalCharges: number;
  };
}

export const WarehouseRelease: React.FC<WarehouseReleaseProps> = () => {
  const [shipments, setShipments] = useState<WarehouseShipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<WarehouseShipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadShipments();
  }, [statusFilter]);

  useEffect(() => {
    filterShipments();
  }, [shipments, searchTerm]);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/warehouse/shipments?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load shipments');
      
      const data = await response.json();
      setShipments(data);
    } catch (err) {
      setError('Failed to load warehouse shipments');
      console.error('Error loading shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterShipments = () => {
    if (!searchTerm) {
      setFilteredShipments(shipments);
      return;
    }

    const filtered = shipments.filter(shipment =>
      shipment.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.consignee.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredShipments(filtered);
  };

  const handleRelease = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to release this shipment? This will calculate charges and generate an invoice.')) {
      return;
    }

    setReleasing(shipmentId);
    setError(null);

    try {
      const response = await fetch(`/api/warehouse/release/${shipmentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to release shipment');
      }

      const result = await response.json();
      setCurrentInvoice({
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        totalAmount: result.invoice.totalAmount,
        warehouseData: result.charges
      });
      setShowInvoiceModal(true);
      setSuccess(`Shipment released successfully! Invoice #${result.invoice.invoiceNumber} generated.`);
      
      // Reload shipments
      await loadShipments();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReleasing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const getStorageDays = (createdAt: string) => {
    const days = Math.ceil((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'ACTIVE':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'RELEASED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Warehouse Release</h1>
                <p className="text-sm text-gray-600">Release shipments and generate invoices</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''}
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
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by barcode, shipper, or consignee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active Shipments</option>
                <option value="RELEASED">Released Shipments</option>
                <option value="all">All Shipments</option>
              </select>
            </div>
          </div>

          {/* Shipments List */}
          <div className="space-y-4">
            {filteredShipments.length === 0 ? (
              <div className="text-center py-12">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No shipments found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'No warehouse shipments available.'}
                </p>
              </div>
            ) : (
              filteredShipments.map((shipment) => (
                <div key={shipment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {shipment.referenceId}
                        </h3>
                        <span className={getStatusBadge(shipment.status)}>
                          {shipment.status}
                        </span>
                        {shipment.invoices.length > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            📄 Invoiced
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Shipper:</span>
                          <p>{shipment.shipper}</p>
                        </div>
                        <div>
                          <span className="font-medium">Consignee:</span>
                          <p>{shipment.consignee}</p>
                        </div>
                        <div>
                          <span className="font-medium">Pieces:</span>
                          <p>{shipment.originalBoxCount} pieces</p>
                        </div>
                        <div>
                          <span className="font-medium">Storage Days:</span>
                          <p>{getStorageDays(shipment.createdAt)} days</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(shipment.createdAt)}
                        </div>
                        {shipment.rack && (
                          <div className="flex items-center">
                            <QrCodeIcon className="h-4 w-4 mr-1" />
                            Rack {shipment.rack.code}
                          </div>
                        )}
                        {shipment.warehouseData?.weight && (
                          <div>
                            Weight: {shipment.warehouseData.weight} kg
                          </div>
                        )}
                      </div>

                      {shipment.warehouseData?.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {shipment.warehouseData.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {shipment.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRelease(shipment.id)}
                          disabled={releasing === shipment.id}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {releasing === shipment.id ? (
                            <>
                              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              Releasing...
                            </>
                          ) : (
                            <>
                              <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                              Generate Invoice & Release
                            </>
                          )}
                        </button>
                      )}
                      
                      {shipment.invoices.length > 0 && (
                        <button
                          onClick={() => window.open(`/invoices/${shipment.invoices[0].id}`, '_blank')}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-2" />
                          View Invoice
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && currentInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Invoice Generated</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="font-medium">Invoice Number:</span>
                  <p className="font-mono">{currentInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Storage Days:</span>
                  <p>{currentInvoice.warehouseData.storageDays} days ({currentInvoice.warehouseData.chargeableDays} chargeable)</p>
                </div>
                <div>
                  <span className="font-medium">Storage Charges:</span>
                  <p>{formatCurrency(currentInvoice.warehouseData.storageCharges)}</p>
                </div>
                <div>
                  <span className="font-medium">Handling Charges:</span>
                  <p>{formatCurrency(currentInvoice.warehouseData.handlingCharges)}</p>
                </div>
                <div className="border-t pt-2">
                  <span className="font-medium">Total Amount:</span>
                  <p className="text-lg font-semibold">{formatCurrency(currentInvoice.totalAmount)}</p>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => window.open(`/invoices/${currentInvoice.id}`, '_blank')}
                  className="flex-1 inline-flex justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  View Invoice
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 inline-flex justify-center px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseRelease;

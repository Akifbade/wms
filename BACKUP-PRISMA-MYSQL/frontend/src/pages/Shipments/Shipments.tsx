import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon,
  HomeIcon,
  FunnelIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { shipmentsAPI } from '../../services/api';
import { ReleaseNoteModal } from '../../components/ReleaseNoteModal';
import { WithdrawalModal } from '../../components/WithdrawalModal';
import WHMShipmentModal from '../../components/WHMShipmentModal';
import EditShipmentModal from '../../components/EditShipmentModal';
import ShipmentDetailModal from '../../components/ShipmentDetailModal';
import BoxQRModal from '../../components/BoxQRModal';

export const Shipments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_storage' | 'partial' | 'released'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | 'regular' | 'warehouse'>('all');
  const [shipments, setShipments] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, in_storage: 0, partial: 0, released: 0 });
  const [warehouseCounts, setWarehouseCounts] = useState({ all: 0, regular: 0, warehouse: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [releaseNoteModalOpen, setReleaseNoteModalOpen] = useState(false);
  const [releaseNoteData, setReleaseNoteData] = useState<any>(null);

  useEffect(() => {
    loadShipments();
  }, [activeTab, warehouseFilter, searchTerm]);

  const loadShipments = async () => {
    try {
      setLoading(true);
      
      // Load all shipments first for counts (without filters)
      const allData = await shipmentsAPI.getAll({});
      const allShipments = allData.shipments || [];
      
      // Calculate status counts (Schema: PENDING, IN_STORAGE, PARTIAL, RELEASED)
      const counts = {
        all: allShipments.length,
        pending: allShipments.filter((s: any) => s.status === 'PENDING').length,
        in_storage: allShipments.filter((s: any) => s.status === 'IN_STORAGE' || s.status === 'ACTIVE').length, // Support both
        partial: allShipments.filter((s: any) => s.status === 'PARTIAL').length,
        released: allShipments.filter((s: any) => s.status === 'RELEASED').length
      };
      setStatusCounts(counts);

      // Calculate warehouse counts
      const warehouseCounts = {
        all: allShipments.length,
        regular: allShipments.filter((s: any) => !s.isWarehouseShipment).length,
        warehouse: allShipments.filter((s: any) => s.isWarehouseShipment).length
      };
      setWarehouseCounts(warehouseCounts);

      // Now load filtered shipments for display
      const params: any = {};
      if (activeTab !== 'all') {
        params.status = activeTab === 'in_storage' ? 'IN_STORAGE' : activeTab.toUpperCase();
      }
      if (warehouseFilter === 'regular') {
        params.isWarehouseShipment = false;
      } else if (warehouseFilter === 'warehouse') {
        params.isWarehouseShipment = true;
      }
      if (searchTerm) params.search = searchTerm;

      const data = await shipmentsAPI.getAll(params);
      const loadedShipments = data.shipments || [];
      
      // 🔍 DEBUG: Log status values to help debug button visibility
      console.log('📦 Shipments loaded:', loadedShipments.map((s: any) => ({
        id: s.referenceId,
        status: s.status,
        boxes: s.currentBoxCount
      })));
      
      setShipments(loadedShipments);
    } catch (err: any) {
      setError(err.message);
      console.error('Load shipments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    const confirmMsg = `🚨 DELETE SHIPMENT\n\n` +
      `Reference: ${shipment?.referenceId || 'N/A'}\n` +
      `Client: ${shipment?.clientName || 'N/A'}\n` +
      `Boxes: ${shipment?.currentBoxCount || 0}\n\n` +
      `⚠️ This action CANNOT be undone!\n\n` +
      `Are you sure you want to delete this shipment?`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
      await shipmentsAPI.delete(id);
      alert('✅ Shipment deleted successfully!');
      loadShipments(); // Reload list
    } catch (err: any) {
      alert('❌ Error deleting shipment: ' + err.message);
    }
  };

  const handleReleaseClick = (shipment: any) => {
    setSelectedShipment(shipment);
    setWithdrawalModalOpen(true); // Opens WithdrawalModal → PaymentBeforeReleaseModal
  };

  const handlePrintReleaseNote = (shipment: any) => {
    // Calculate storage duration
    const arrivalDate = new Date(shipment.arrivalDate);
    const releaseDate = shipment.releasedAt ? new Date(shipment.releasedAt) : new Date();
    const storageDays = Math.ceil((releaseDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

    // Prepare release note data
    const releaseData = {
      shipment,
      invoice: null, // Will fetch if needed
      releaseDate: shipment.releasedAt || new Date(),
      releasedBy: 'Admin User', // TODO: Get from auth context
      collectorID: 'N/A', // Not stored, would need to add to shipment model
      releaseType: shipment.currentBoxCount === 0 ? 'FULL' : 'PARTIAL',
      boxesReleased: shipment.originalBoxCount - shipment.currentBoxCount,
    };

    setReleaseNoteData(releaseData);
    setReleaseNoteModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Pending' };
      case 'IN_STORAGE':
        return { color: 'bg-green-100 text-green-800', icon: '✅', label: 'In Storage' };
      case 'ACTIVE': // Legacy support
        return { color: 'bg-green-100 text-green-800', icon: '✅', label: 'In Storage' };
      case 'PARTIAL':
        return { color: 'bg-orange-100 text-orange-800', icon: '⚠', label: 'Partial' };
      case 'RELEASED':
        return { color: 'bg-blue-100 text-blue-800', icon: '🔵', label: 'Released' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: '⚪', label: status };
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Warehouse Shipments</h1>
          <p className="text-gray-600 mt-1">Complete warehouse management with intake, tracking, and release</p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          📦 New Shipment Intake
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Warehouse Type Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Shipment Type</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWarehouseFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              warehouseFilter === 'all'
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Types ({warehouseCounts.all})
          </button>
          <button
            onClick={() => setWarehouseFilter('regular')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              warehouseFilter === 'regular'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <HomeIcon className="h-4 w-4" />
            Regular Shipments ({warehouseCounts.regular})
          </button>
          <button
            onClick={() => setWarehouseFilter('warehouse')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              warehouseFilter === 'warehouse'
                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BuildingStorefrontIcon className="h-4 w-4" />
            Warehouse Shipments ({warehouseCounts.warehouse})
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>All Shipments</span>
                {statusCounts.all > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {statusCounts.all}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-b-2 border-yellow-500 text-yellow-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>⏳ Pending</span>
                {statusCounts.pending > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {statusCounts.pending}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('in_storage')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                activeTab === 'in_storage'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>✅ In Storage</span>
                {statusCounts.in_storage > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {statusCounts.in_storage}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                activeTab === 'partial'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>� Partial</span>
                {statusCounts.partial > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {statusCounts.partial}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('released')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                activeTab === 'released'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>🔵 Released</span>
                {statusCounts.released > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {statusCounts.released}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-gray-50">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client name, phone, or shipment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pieces</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Stored</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.map((shipment: any) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <QrCodeIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{shipment.referenceId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{shipment.clientName}</div>
                    <div className="text-xs text-gray-500">{new Date(shipment.receivedDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.clientPhone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      📦 {shipment.currentBoxCount} / {shipment.originalBoxCount} pieces
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {shipment.isWarehouseShipment ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          <BuildingStorefrontIcon className="h-3 w-3" />
                          Warehouse
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          <HomeIcon className="h-3 w-3" />
                          Regular
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-primary-600">{shipment.rackLocations || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold">
                      {shipment.receivedDate ? Math.ceil((new Date().getTime() - new Date(shipment.receivedDate).getTime()) / (1000 * 3600 * 24)) : 0} days
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const badge = getStatusBadge(shipment.status);
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setQrModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View QR Codes"
                      >
                        <QrCodeIcon className="h-5 w-5" />
                      </button>
                      {/* Release button - check multiple status values and always show for debugging */}
                      {((shipment.status === 'IN_STORAGE' || 
                         shipment.status === 'PARTIAL' || 
                         shipment.status === 'ACTIVE' ||
                         shipment.status === 'IN STORAGE') && 
                        shipment.currentBoxCount > 0) && (
                        <button 
                          onClick={() => {
                            console.log('🔍 Release button clicked:', { status: shipment.status, boxes: shipment.currentBoxCount });
                            handleReleaseClick(shipment);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title={`Generate Invoice & Release (Status: ${shipment.status})`}
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                      )}
                      {shipment.status === 'RELEASED' && (
                        <button 
                          onClick={() => handlePrintReleaseNote(shipment)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Print Release Note"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setDetailModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setEditModalOpen(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Shipment"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(shipment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No shipments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHM Shipment Modal */}
      <WHMShipmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadShipments}
      />

      {/* Edit Shipment Modal */}
      <EditShipmentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        shipment={selectedShipment}
        onSuccess={loadShipments}
      />

      {/* Shipment Detail Modal */}
      <ShipmentDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        shipmentId={selectedShipment?.id || ''}
      />

      {/* Withdrawal Modal with Payment Integration */}
      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        shipment={selectedShipment}
        onSuccess={loadShipments}
      />

      {/* Box QR Codes Modal */}
      <BoxQRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        shipmentId={selectedShipment?.id || ''}
        shipmentRef={selectedShipment?.referenceId || ''}
      />

      {/* Release Note Modal (for reprinting) */}
      {releaseNoteModalOpen && releaseNoteData && (
        <ReleaseNoteModal
          isOpen={releaseNoteModalOpen}
          onClose={() => setReleaseNoteModalOpen(false)}
          releaseData={releaseNoteData}
        />
      )}
    </div>
  );
};

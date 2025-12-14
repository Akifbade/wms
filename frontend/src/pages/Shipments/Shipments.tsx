import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  ClockIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { shipmentsAPI } from '../../services/api';
import { WithdrawalModal } from '../../components/WithdrawalModal';
import WHMShipmentModal from '../../components/WHMShipmentModal';
import EditShipmentModal from '../../components/EditShipmentModal';
import ShipmentDetailModal from '../../components/ShipmentDetailModal';
import BoxQRModal from '../../components/BoxQRModal';
import ShipmentsPrintReport from '../../components/ShipmentsPrintReport';

export const Shipments: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [shipments, setShipments] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, in_storage: 0, partial: 0, released: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Folder view state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadShipments();
  }, [activeStatus, searchTerm]);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const allData = await shipmentsAPI.getAll({ limit: 2000 });
      const allShipments = allData.shipments || [];

      // Calculate status counts
      const counts = {
        all: allShipments.length,
        pending: allShipments.filter((s: any) => s.status === 'PENDING').length,
        in_storage: allShipments.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length,
        partial: allShipments.filter((s: any) => s.status === 'PARTIAL').length,
        released: allShipments.filter((s: any) => s.status === 'RELEASED').length
      };
      setStatusCounts(counts);

      // Filter by status
      let filtered = allShipments;
      if (activeStatus !== 'all') {
        const statusMap: Record<string, string[]> = {
          pending: ['PENDING'],
          in_storage: ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'],
          partial: ['PARTIAL'],
          released: ['RELEASED']
        };
        filtered = allShipments.filter((s: any) => statusMap[activeStatus]?.includes(s.status));
      }

      // Filter by search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter((s: any) =>
          s.clientName?.toLowerCase().includes(q) ||
          s.referenceId?.toLowerCase().includes(q) ||
          s.clientPhone?.toLowerCase().includes(q) ||
          s.companyProfile?.name?.toLowerCase().includes(q) ||
          s.rackLocation?.toLowerCase().includes(q)
        );
      }

      setShipments(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    if (!confirm(`Delete shipment ${shipment?.referenceId}?\n\nThis cannot be undone.`)) return;
    try {
      await shipmentsAPI.delete(id);
      loadShipments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleReleaseClick = (shipment: any) => {
    setSelectedShipment(shipment);
    setWithdrawalModalOpen(true);
  };

  // Helper functions
  const getDaysStored = (shipment: any) => {
    const src = shipment?.arrivalDate || shipment?.receivedDate || shipment?.createdAt;
    if (!src) return 0;
    const start = new Date(src);
    if (isNaN(start.getTime())) return 0;
    const days = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'IN_WAREHOUSE': case 'IN_STORAGE': case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIAL': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'RELEASED': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'IN_WAREHOUSE': case 'IN_STORAGE': case 'ACTIVE': return 'Stored';
      case 'PARTIAL': return 'Partial';
      case 'RELEASED': return 'Released';
      default: return status;
    }
  };

  const getDaysStyle = (days: number) => {
    if (days < 30) return 'text-slate-500';
    if (days < 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Group by company
  const groupedByCompany = shipments.reduce((acc: any, shipment: any) => {
    const company = shipment.companyProfile?.name || 'Unassigned';
    if (!acc[company]) acc[company] = [];
    acc[company].push(shipment);
    return acc;
  }, {});

  const toggleFolder = (name: string) => {
    const next = new Set(expandedFolders);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedFolders(next);
  };

  // Status tabs config
  const tabs = [
    { key: 'all', label: 'All', count: statusCounts.all },
    { key: 'pending', label: 'Pending', count: statusCounts.pending },
    { key: 'in_storage', label: 'Stored', count: statusCounts.in_storage },
    { key: 'partial', label: 'Partial', count: statusCounts.partial },
    { key: 'released', label: 'Released', count: statusCounts.released },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Clean Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-slate-900">Shipments</h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">{shipments.length} total</p>
            </div>
            <div className="flex items-center gap-2">
              <ShipmentsPrintReport
                shipments={shipments}
                searchTerm={searchTerm}
                activeTab={activeStatus}
                warehouseFilter="all"
              />
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 md:px-6 border-t border-slate-100">
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeStatus === tab.key
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  activeStatus === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client, reference, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Folder List */}
        {Object.keys(groupedByCompany).length === 0 ? (
          <div className="text-center py-12">
            <CubeIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No shipments found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedByCompany).sort((a, b) => a[0].localeCompare(b[0])).map(([company, items]: [string, any]) => {
              const isOpen = expandedFolders.has(company);
              const stored = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length;
              const totalBoxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);

              return (
                <div key={company} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {/* Folder Header */}
                  <button
                    onClick={() => toggleFolder(company)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        {isOpen ? (
                          <ChevronDownIcon className="h-4 w-4 text-slate-600" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">{company}</p>
                        <p className="text-xs text-slate-500">{items.length} shipments · {totalBoxes} boxes</p>
                      </div>
                    </div>
                    {stored > 0 && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        {stored} active
                      </span>
                    )}
                  </button>

                  {/* Folder Content */}
                  {isOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {items.map((shipment: any) => {
                        const days = getDaysStored(shipment);
                        const canRelease = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(shipment.status) && shipment.currentBoxCount > 0;

                        return (
                          <div key={shipment.id} className="px-4 py-3 hover:bg-slate-50/50">
                            {/* Shipment Row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900">{shipment.referenceId}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getStatusStyle(shipment.status)}`}>
                                    {getStatusLabel(shipment.status)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5 truncate">{shipment.clientName}</p>
                                
                                {/* Info Row */}
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <CubeIcon className="h-3 w-3" />
                                    {shipment.currentBoxCount}/{shipment.originalBoxCount}
                                  </span>
                                  {shipment.cbm > 0 && (
                                    <span>{Number(shipment.cbm).toFixed(1)} CBM</span>
                                  )}
                                  <span className={`flex items-center gap-1 ${getDaysStyle(days)}`}>
                                    <ClockIcon className="h-3 w-3" />
                                    {days}d
                                  </span>
                                  {shipment.rackLocations && shipment.rackLocations !== 'N/A' && (
                                    <span className="flex items-center gap-1">
                                      <MapPinIcon className="h-3 w-3" />
                                      {shipment.rackLocations.split(',')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => { setSelectedShipment(shipment); setDetailModalOpen(true); }}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                  title="View"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => { setSelectedShipment(shipment); setQrModalOpen(true); }}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                  title="QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => { setSelectedShipment(shipment); setEditModalOpen(true); }}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                {canRelease && (
                                  <button
                                    onClick={() => handleReleaseClick(shipment)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                    title="Release"
                                  >
                                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => navigate(`/shipment/${shipment.id}`)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                  title="Report"
                                >
                                  <DocumentTextIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(shipment.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center z-20"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* Modals */}
      <WHMShipmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadShipments}
      />
      <EditShipmentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        shipment={selectedShipment}
        onSuccess={loadShipments}
      />
      <ShipmentDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        shipmentId={selectedShipment?.id || ''}
      />
      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        shipment={selectedShipment}
        onSuccess={loadShipments}
      />
      <BoxQRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        shipmentId={selectedShipment?.id || ''}
        shipmentRef={selectedShipment?.referenceId || ''}
      />
    </div>
  );
};

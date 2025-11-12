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
import ShipmentsPrintReport from '../../components/ShipmentsPrintReport';

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

      // Calculate status counts (Schema: PENDING, IN_WAREHOUSE, PARTIAL, RELEASED)
      const counts = {
        all: allShipments.length,
        pending: allShipments.filter((s: any) => s.status === 'PENDING').length,
        in_storage: allShipments.filter((s: any) => s.status === 'IN_WAREHOUSE' || s.status === 'IN_STORAGE' || s.status === 'ACTIVE').length, // Support all variants
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
        params.status = activeTab === 'in_storage' ? 'IN_WAREHOUSE' : activeTab.toUpperCase();
      }
      if (warehouseFilter === 'regular') {
        params.isWarehouseShipment = false;
      } else if (warehouseFilter === 'warehouse') {
        params.isWarehouseShipment = true;
      }
      if (searchTerm) params.search = searchTerm;

      const data = await shipmentsAPI.getAll(params);
      const loadedShipments = data.shipments || [];

      // 🔍 DEBUG: Log pallet breakdown data
      console.log('📦 Shipments loaded with pallet data:', loadedShipments.map((s: any) => ({
        id: s.referenceId,
        status: s.status,
        boxes: s.boxes?.length || 0,
        photos: s.shipmentPhotos?.length || 0,
        sampleBox: s.boxes?.[0] ? {
          boxNum: s.boxes[0].boxNumber,
          pieceQR: s.boxes[0].pieceQR
        } : null
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
      case 'IN_WAREHOUSE':
        return { color: 'bg-green-100 text-green-800', icon: '🏢', label: 'In Warehouse' };
      case 'IN_STORAGE': // Legacy support
        return { color: 'bg-green-100 text-green-800', icon: '🏢', label: 'In Warehouse' };
      case 'ACTIVE': // Legacy support
        return { color: 'bg-green-100 text-green-800', icon: '🏢', label: 'In Warehouse' };
      case 'PARTIAL':
        return { color: 'bg-orange-100 text-orange-800', icon: '⚠', label: 'Partial' };
      case 'RELEASED':
        return { color: 'bg-blue-100 text-blue-800', icon: '🔵', label: 'Released' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: '⚪', label: status };
    }
  };

  // Determine intake type based on pallet metadata
  const getIntakeType = (shipment: any) => {
    const palletCount = Number(shipment?.palletCount) || 0;
    const boxesPerPallet = Number(shipment?.boxesPerPallet) || 0;
    // Heuristic: any pallet structure => Pallet; otherwise Box
    if (palletCount > 1) return 'PALLET';
    if (palletCount === 1 && boxesPerPallet > 1) return 'PALLET';
    return 'BOX';
  };

  // Compute days stored from arrivalDate (fallback to createdAt)
  const getDaysStored = (shipment: any) => {
    const src = shipment?.arrivalDate || shipment?.receivedDate || shipment?.createdAt;
    if (!src) return 0;
    const start = new Date(src);
    if (Number.isNaN(start.getTime())) return 0;
    const now = new Date();
    const ms = now.getTime() - start.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  // 🎯 NEW SAFE HELPER FUNCTIONS (UI only - no logic changes)
  const getFormattedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const getPalletInfo = (shipment: any) => {
    const assigned = shipment.originalBoxCount - shipment.currentBoxCount;
    const remaining = shipment.currentBoxCount;

    if (shipment.status === 'PARTIAL' && assigned > 0) {
      // Show clear assignment status for partial shipments
      return `✅ ${assigned} assigned, ⏳ ${remaining} pending`;
    }

    if (shipment.palletCount > 0 && shipment.boxesPerPallet > 0) {
      return `${shipment.palletCount} pallets × ${shipment.boxesPerPallet} boxes`;
    }

    return `${shipment.currentBoxCount || 0} boxes total`;
  };

  const getStorageBadge = (days: number) => {
    if (days < 30) return { badge: `${days}d`, color: 'green', icon: '🟢', text: 'text-green-700', bg: 'bg-green-100' };
    if (days < 60) return { badge: `${days}d`, color: 'yellow', icon: '🟡', text: 'text-yellow-700', bg: 'bg-yellow-100' };
    return { badge: `${days}d`, color: 'red', icon: '🔴', text: 'text-red-700', bg: 'bg-red-100' };
  };

  // Calculate long-stay shipments for warning badges
  const longStayCounts = {
    warning: shipments.filter(s => {
      const days = getDaysStored(s);
      return days >= 30 && days < 60;
    }).length,
    urgent: shipments.filter(s => {
      const days = getDaysStored(s);
      return days >= 60;
    }).length
  };

  // Track selected company filter
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  // Client-side advanced filtering for instant search
  const filteredShipments = shipments.filter((shipment: any) => {
    // Company filter (if set)
    if (selectedCompany && shipment.companyProfile?.name !== selectedCompany) {
      return false;
    }

    // Search filter
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search across multiple fields
    return (
      shipment.clientName?.toLowerCase().includes(searchLower) ||
      shipment.referenceId?.toLowerCase().includes(searchLower) ||
      shipment.clientPhone?.toLowerCase().includes(searchLower) ||
      shipment.companyProfile?.name?.toLowerCase().includes(searchLower) ||
      shipment.barcode?.toLowerCase().includes(searchLower) ||
      shipment.clientAddress?.toLowerCase().includes(searchLower) ||
      shipment.status?.toLowerCase().includes(searchLower) ||
      shipment.rackLocation?.toLowerCase().includes(searchLower)
    );
  });

  // Group shipments by company for folder view
  const groupedByCompany = filteredShipments.reduce((acc: any, shipment: any) => {
    const companyName = shipment.companyProfile?.name || 'No Company';
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(shipment);
    return acc;
  }, {});

  // Track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'folders'>('folders'); // Default to folder view

  const toggleFolder = (companyName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(companyName)) {
      newExpanded.delete(companyName);
    } else {
      newExpanded.add(companyName);
    }
    setExpandedFolders(newExpanded);
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
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Print Report Buttons */}
          <ShipmentsPrintReport
            shipments={filteredShipments}
            searchTerm={searchTerm}
            activeTab={activeTab}
            warehouseFilter={warehouseFilter}
          />

          {/* New Shipment Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            📦 New Shipment Intake
          </button>
        </div>
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${warehouseFilter === 'all'
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            All Types ({warehouseCounts.all})
          </button>
          <button
            onClick={() => setWarehouseFilter('regular')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${warehouseFilter === 'regular'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <HomeIcon className="h-4 w-4" />
            Regular Shipments ({warehouseCounts.regular})
          </button>
          <button
            onClick={() => setWarehouseFilter('warehouse')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${warehouseFilter === 'warehouse'
              ? 'bg-orange-100 text-orange-700 border border-orange-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <BuildingStorefrontIcon className="h-4 w-4" />
            Warehouse Shipments ({warehouseCounts.warehouse})
          </button>
          {longStayCounts.warning > 0 && (
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 flex items-center gap-2"
              title="Shipments stored 30-60 days"
            >
              🟡 Warning: {longStayCounts.warning}
            </button>
          )}
          {longStayCounts.urgent > 0 && (
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 border border-red-300 flex items-center gap-2 animate-pulse"
              title="Shipments stored over 60 days"
            >
              🔴 Urgent: {longStayCounts.urgent}
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${activeTab === 'all'
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
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${activeTab === 'pending'
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
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${activeTab === 'in_storage'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>🏢 In Warehouse</span>
                {statusCounts.in_storage > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {statusCounts.in_storage}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${activeTab === 'partial'
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
              className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${activeTab === 'released'
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

        {/* Advanced Search & Filters */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('folders')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm ${viewMode === 'folders'
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Folder View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm ${viewMode === 'table'
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table View
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative md:col-span-2">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search client name, reference ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Company Filter */}
            <div className="relative">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
              >
                <option value="">All Companies</option>
                {[...new Set(shipments.map((s: any) => s.companyProfile?.name).filter(Boolean))].sort().map((company: any) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Folder View */}
      {viewMode === 'folders' ? (
        <div className="space-y-3">
          {Object.entries(groupedByCompany).map(([companyName, companyShipments]: [string, any]) => {
            const isExpanded = expandedFolders.has(companyName);
            const shipmentCount = companyShipments.length;
            const totalBoxes = companyShipments.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);
            const inWarehouse = companyShipments.filter((s: any) => s.status === 'IN_WAREHOUSE').length;
            const partial = companyShipments.filter((s: any) => s.status === 'PARTIAL').length;
            const released = companyShipments.filter((s: any) => s.status === 'RELEASED').length;

            return (
              <div key={companyName} className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden hover:shadow-md transition-shadow">
                {/* Clean Folder Header */}
                <button
                  onClick={() => toggleFolder(companyName)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-700 p-2.5 rounded-lg group-hover:bg-gray-800 transition-colors">
                      {isExpanded ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">{companyName}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <span className="font-semibold">{shipmentCount} shipments</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold">{totalBoxes} boxes</span>
                        {inWarehouse > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-green-600 font-semibold">{inWarehouse} active</span>
                          </>
                        )}
                        {partial > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-orange-600 font-semibold">{partial} partial</span>
                          </>
                        )}
                        {released > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 font-semibold">{released} released</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center gap-2 text-xs">
                      {inWarehouse > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                          {inWarehouse} Active
                        </span>
                      )}
                      {partial > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-semibold">
                          {partial} Partial
                        </span>
                      )}
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Clean Folder Contents */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4 space-y-3">
                      {companyShipments.map((shipment: any) => {
                        const badge = getStatusBadge(shipment.status);
                        const days = getDaysStored(shipment);
                        const storageBadge = getStorageBadge(days);

                        return (
                          <div key={shipment.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between gap-4">
                              {/* Left: Shipment Info */}
                              <div className="flex-1 space-y-3">
                                {/* Header Row */}
                                <div className="flex items-center gap-3 pb-2 border-b">
                                  <span className="text-base font-bold text-gray-900">{shipment.referenceId}</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                                    {badge.icon} {badge.label}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${storageBadge.bg} ${storageBadge.text}`}>
                                    {storageBadge.icon} {storageBadge.badge}
                                  </span>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                      <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Client</p>
                                      <p className="font-bold text-gray-900">{shipment.clientName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-green-100 p-2 rounded-lg">
                                      <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Contact</p>
                                      <p className="font-bold text-gray-900">{shipment.clientPhone || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-purple-100 p-2 rounded-lg">
                                      <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Boxes</p>
                                      <p className="font-bold text-gray-900">{shipment.currentBoxCount} / {shipment.originalBoxCount}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                      <svg className="w-4 h-4 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Weight</p>
                                      <p className="font-bold text-gray-900">{shipment.totalWeight ? `${shipment.totalWeight} kg` : '-'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-indigo-100 p-2 rounded-lg">
                                      <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Arrival Date</p>
                                      <p className="font-bold text-gray-900">
                                        {shipment.arrivalDate && !isNaN(new Date(shipment.arrivalDate).getTime())
                                          ? new Date(shipment.arrivalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                          : shipment.receivedAt && !isNaN(new Date(shipment.receivedAt).getTime())
                                            ? new Date(shipment.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '-'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-gray-200 p-2 rounded-lg">
                                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Stored On</p>
                                      <p className="font-bold text-gray-900">
                                        {shipment.receivedAt && !isNaN(new Date(shipment.receivedAt).getTime())
                                          ? new Date(shipment.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                          : '-'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Rack Locations */}
                                {shipment.rackLocations && shipment.rackLocations !== 'N/A' && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-xs text-gray-600 font-semibold">Racks:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {shipment.rackLocations.split(',').map((rack: string, idx: number) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-700 text-white text-xs font-semibold">
                                          📍 {rack.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Pallet & Loose Box Breakdown */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                  {(() => {
                                    // 🔧 DEBUG: Log boxes data
                                    if (!shipment.boxes || shipment.boxes.length === 0) {
                                      console.warn(`⚠️ No boxes data for shipment ${shipment.referenceId}`, shipment);
                                    }

                                    const palletBoxes = shipment.boxes?.filter((b: any) => b.pieceQR?.palletNumber > 0) || [];
                                    const looseBoxes = shipment.boxes?.filter((b: any) => !b.pieceQR?.palletNumber || b.pieceQR?.palletNumber === 0) || [];
                                    const uniquePallets = [...new Set(palletBoxes.map((b: any) => b.pieceQR?.palletNumber))].sort((a, b) => a - b);

                                    return (
                                      <>
                                        {uniquePallets.length > 0 && uniquePallets.map((palletNum, idx) => {
                                          const count = palletBoxes.filter((b: any) => b.pieceQR?.palletNumber === palletNum).length;
                                          return (
                                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-900 rounded-lg text-xs font-bold border-2 border-blue-300">
                                              📦 Pallet #{palletNum} ({count} pcs)
                                            </span>
                                          );
                                        })}
                                        {looseBoxes.length > 0 && (
                                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-900 rounded-lg text-xs font-bold border-2 border-orange-300">
                                            📦 Loose ({looseBoxes.length} pcs)
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Shipment Photos - Direct Display */}
                                {shipment.shipmentPhotos && shipment.shipmentPhotos.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <span className="text-xs text-gray-600 font-semibold">Shipment Photos ({shipment.shipmentPhotos.length}):</span>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                      {shipment.shipmentPhotos.map((photo: string, idx: number) => {
                                        // Fix: Prepend backend URL if photo path is relative
                                        const photoUrl = photo.startsWith('http') ? photo : `http://localhost:5000${photo}`;
                                        return (
                                          <div key={idx} className="relative group">
                                            <img
                                              src={photoUrl}
                                              alt={`Photo ${idx + 1}`}
                                              className="w-full h-20 object-cover rounded-lg border-2 border-gray-300 hover:border-indigo-500 cursor-pointer transition-all hover:scale-105"
                                              onClick={() => window.open(photoUrl, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                                              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                              </svg>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-xs px-1 py-0.5 rounded-b-lg text-center">
                                              {idx + 1}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Notes Preview */}
                                {shipment.notes && (
                                  <div className="text-xs text-gray-600 bg-yellow-50 border-l-2 border-yellow-400 px-2 py-1">
                                    <span className="font-semibold">Note:</span> {shipment.notes.substring(0, 100)}{shipment.notes.length > 100 ? '...' : ''}
                                  </div>
                                )}
                              </div>

                              {/* Right: Action Buttons */}
                              <div className="flex flex-col gap-1.5 min-w-[100px]">
                                <button
                                  onClick={() => {
                                    window.open(`/shipment-report/${shipment.id}`, '_blank');
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold"
                                  title="View Full Report"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Report
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setDetailModalOpen(true);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
                                  title="View Details"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setQrModalOpen(true);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-xs font-semibold"
                                  title="View QR Codes"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                  </svg>
                                  QR Codes
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setEditModalOpen(true);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-semibold"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                {(shipment.status === 'IN_WAREHOUSE' || shipment.status === 'PARTIAL') && (
                                  <button
                                    onClick={() => handleReleaseClick(shipment)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
                                    title="Release"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Release
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(shipment.id)}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reference ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Company</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Pieces</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rack Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Storage Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No shipments found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment: any) => (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <QrCodeIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{shipment.referenceId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{shipment.clientName}</div>
                        <div className="text-xs text-gray-500">{getFormattedDate(shipment.receivedDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {shipment.companyProfile?.name ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            🏢 {shipment.companyProfile.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No company</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.clientPhone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📦 {shipment.currentBoxCount} / {shipment.originalBoxCount} pieces
                          </span>
                          <span className="text-xs text-gray-500">{getPalletInfo(shipment)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getIntakeType(shipment) === 'PALLET' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                              🪵 Pallet
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              📦 Box
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {shipment.status === 'RELEASED' ? (
                          shipment.rackLocations && shipment.rackLocations !== 'N/A' ? (
                            <span className="text-sm text-gray-500 italic">
                              🚪 Was in: {shipment.rackLocations}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )
                        ) : shipment.rackLocations && shipment.rackLocations !== 'N/A' ? (
                          (() => {
                            const racks = shipment.rackLocations.split(',').map((r: string) => r.trim()).filter(Boolean);
                            if (racks.length > 1) {
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {racks.map((rack: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                      📍 {rack}
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return <span className="text-sm font-medium text-primary-600">{racks[0]}</span>;
                          })()
                        ) : (
                          <span className="text-sm text-gray-400">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const days = getDaysStored(shipment);
                          const storageBadge = getStorageBadge(days);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${storageBadge.bg} ${storageBadge.text}`}>
                              {storageBadge.icon} {storageBadge.badge}
                            </span>
                          );
                        })()}
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
                          {/* QR Code button - show for ALL shipments */}
                          <button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setQrModalOpen(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="View/Print QR Codes"
                          >
                            <QrCodeIcon className="h-5 w-5" />
                          </button>

                          {/* Release button - only for stored shipments with boxes */}
                          {(shipment.status === 'IN_STORAGE' ||
                            shipment.status === 'IN_WAREHOUSE' ||
                            shipment.status === 'PARTIAL' ||
                            shipment.status === 'STORED' ||
                            shipment.status === 'ACTIVE') &&
                            shipment.currentBoxCount > 0 && (
                              <button
                                onClick={() => handleReleaseClick(shipment)}
                                className="text-green-600 hover:text-green-900"
                                title="Generate Invoice & Release"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

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
  BuildingStorefrontIcon,
  HomeIcon,
  FunnelIcon,
  PrinterIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { shipmentsAPI, getBackendUrl } from '../../services/api';
import { ReleaseNoteModal } from '../../components/ReleaseNoteModal';
import { WithdrawalModal } from '../../components/WithdrawalModal';
import WHMShipmentModal from '../../components/WHMShipmentModal';
import EditShipmentModal from '../../components/EditShipmentModal';
import ShipmentDetailModal from '../../components/ShipmentDetailModal';
import BoxQRModal from '../../components/BoxQRModal';
import ShipmentsPrintReport from '../../components/ShipmentsPrintReport';
import { ShipmentPhoto } from '../../components/ShipmentPhoto';

export const Shipments: React.FC = () => {
  const navigate = useNavigate();
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
      // 🔧 FIX: Request high limit to get ALL shipments, not just first 50
      const allData = await shipmentsAPI.getAll({ limit: 2000 });
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
      // 🔧 FIX: Request high limit to get ALL shipments for Folder View
      const params: any = { limit: 2000 };
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
    // Open release receipt page with shipment ID
    window.open(`/release-receipt.html?shipmentId=${shipment.id}`, '_blank');
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
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            📦 Warehouse Shipments
          </h1>
          <p className="text-slate-600 mt-2">Complete warehouse management with intake, tracking, and release</p>
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
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Shipment Intake
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Warehouse Type Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-900 rounded-lg">
            <FunnelIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-800">Shipment Type</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setWarehouseFilter('all')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${warehouseFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            All Types ({warehouseCounts.all})
          </button>
          <button
            onClick={() => setWarehouseFilter('regular')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${warehouseFilter === 'regular'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            <HomeIcon className="h-4 w-4" />
            Regular ({warehouseCounts.regular})
          </button>
          <button
            onClick={() => setWarehouseFilter('warehouse')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${warehouseFilter === 'warehouse'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            <BuildingStorefrontIcon className="h-4 w-4" />
            Warehouse ({warehouseCounts.warehouse})
          </button>
          {longStayCounts.warning > 0 && (
            <button
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-yellow-500 text-white flex items-center gap-2 transition-colors"
              title="Shipments stored 30-60 days"
            >
              🟡 Warning: {longStayCounts.warning}
            </button>
          )}
          {longStayCounts.urgent > 0 && (
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white border border-red-700 flex items-center gap-2"
              title="Shipments stored over 60 days"
            >
              🔴 Urgent: {longStayCounts.urgent}
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`group flex-1 py-5 px-6 text-center font-bold text-sm transition-all duration-300 ${activeTab === 'all'
                ? 'border-b-4 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-base">All Shipments</span>
                {statusCounts.all > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
                    {statusCounts.all}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`group flex-1 py-5 px-6 text-center font-bold text-sm transition-all duration-300 ${activeTab === 'pending'
                ? 'border-b-4 border-yellow-600 text-yellow-600 bg-yellow-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-base">⏳ Pending</span>
                {statusCounts.pending > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md">
                    {statusCounts.pending}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('in_storage')}
              className={`group flex-1 py-5 px-6 text-center font-bold text-sm transition-all duration-300 ${activeTab === 'in_storage'
                ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-base">🏢 In Warehouse</span>
                {statusCounts.in_storage > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md">
                    {statusCounts.in_storage}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`group flex-1 py-5 px-6 text-center font-bold text-sm transition-all duration-300 ${activeTab === 'partial'
                ? 'border-b-4 border-orange-600 text-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-base">⚠️ Partial</span>
                {statusCounts.partial > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-md">
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
                <span className="text-base">✅ Released</span>
                {statusCounts.released > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
                    {statusCounts.released}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Advanced Search & Filters */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('folders')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-300 text-sm transform hover:scale-105 ${viewMode === 'folders'
                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-300 shadow-sm'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Folder View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-300 text-sm transform hover:scale-105 ${viewMode === 'table'
                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-300 shadow-sm'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table View
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative md:col-span-2">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                <MagnifyingGlassIcon className="h-5 w-5 text-white" />
              </div>
              <input
                type="text"
                placeholder="🔍 Search client name, reference ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-12 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300 font-bold shadow-md"
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
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium appearance-none bg-white shadow-sm hover:shadow-md transition-all duration-300"
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Created By</p>
                                      <p className="font-bold text-gray-900">
                                        {shipment.createdBy
                                          ? (typeof shipment.createdBy === 'object'
                                            ? shipment.createdBy.name || shipment.createdBy.email
                                            : shipment.createdBy)
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  {shipment.assignedBy && (
                                    <div className="flex items-center gap-2">
                                      <div className="bg-indigo-100 p-2 rounded-lg">
                                        <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Assigned By</p>
                                        <p className="font-bold text-gray-900">
                                          {typeof shipment.assignedBy === 'object'
                                            ? shipment.assignedBy.name || shipment.assignedBy.email
                                            : shipment.assignedBy}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Rack Locations with Move Indicator */}
                                {shipment.rackLocations && shipment.rackLocations !== 'N/A' && (
                                  <div className="flex items-center gap-2 text-sm flex-wrap">
                                    <span className="text-xs text-gray-600 font-semibold">Racks:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {shipment.rackLocations.split(',').map((rack: string, idx: number) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-700 text-white text-xs font-semibold">
                                          📍 {rack.trim()}
                                        </span>
                                      ))}
                                    </div>
                                    {/* Move History Indicator */}
                                    {shipment.hasMoveHistory && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-300">
                                        🔄 Moved
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Original Rack if Moved */}
                                {shipment.originalRack && shipment.originalRack !== shipment.rackLocations && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                    <span>📦 Originally in:</span>
                                    <span className="font-semibold text-amber-700">{shipment.originalRack}</span>
                                    <span>→</span>
                                    <span className="font-semibold text-green-700">{shipment.rackLocations}</span>
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

                                {/* Shipment Photos - Direct Display with RELEASED Stamp */}
                                {shipment.shipmentPhotos && shipment.shipmentPhotos.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <span className="text-xs text-gray-600 font-semibold">
                                      Shipment Photos ({shipment.shipmentPhotos.length})
                                      {shipment.status === 'RELEASED' && (
                                        <span className="ml-2 text-red-600 font-bold">● RELEASED</span>
                                      )}
                                    </span>
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                      {shipment.shipmentPhotos.map((photo: string, idx: number) => (
                                        <ShipmentPhoto
                                          key={idx}
                                          photoUrl={photo}
                                          index={idx}
                                          status={shipment.status}
                                          showStamp={true}
                                        />
                                      ))}
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
                              <div className="flex flex-col gap-2 min-w-[140px]">
                                <button
                                  onClick={() => {
                                    window.open(`/shipment-report/${shipment.id}`, '_blank');
                                  }}
                                  className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                  title="View Full Report"
                                >
                                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                  <DocumentTextIcon className="w-5 h-5 relative z-10" />
                                  <span className="relative z-10">Report</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setDetailModalOpen(true);
                                  }}
                                  className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                  title="View Details"
                                >
                                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                  <EyeIcon className="w-5 h-5 relative z-10" />
                                  <span className="relative z-10">View</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setQrModalOpen(true);
                                  }}
                                  className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                  title="View QR Codes"
                                >
                                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                  <QrCodeIcon className="w-5 h-5 relative z-10" />
                                  <span className="relative z-10">QR Codes</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setEditModalOpen(true);
                                  }}
                                  className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                  title="Edit"
                                >
                                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                  <PencilIcon className="w-5 h-5 relative z-10" />
                                  <span className="relative z-10">Edit</span>
                                </button>
                                {(shipment.status === 'IN_WAREHOUSE' || shipment.status === 'PARTIAL') && (
                                  <button
                                    onClick={() => handleReleaseClick(shipment)}
                                    className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                    title="Release"
                                  >
                                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                    <ArrowRightOnRectangleIcon className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">Release</span>
                                  </button>
                                )}
                                {shipment.status === 'RELEASED' && (
                                  <button
                                    onClick={() => handlePrintReleaseNote(shipment)}
                                    className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                    title="Download Release Receipt"
                                  >
                                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                    <ArrowDownTrayIcon className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">Release Receipt</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(shipment.id)}
                                  className="group relative flex items-center justify-start gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm font-semibold overflow-hidden"
                                  title="Delete"
                                >
                                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                                  <TrashIcon className="w-5 h-5 relative z-10" />
                                  <span className="relative z-10">Delete</span>
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
                        <div className="flex items-center gap-2">
                          {/* QR Code button - show for ALL shipments */}
                          <button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setQrModalOpen(true);
                            }}
                            className="group relative p-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
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
                                className="group relative p-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                                title="Generate Invoice & Release"
                              >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                              </button>
                            )}
                          {shipment.status === 'RELEASED' && (
                            <button
                              onClick={() => handlePrintReleaseNote(shipment)}
                              className="group relative p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
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
                            className="group relative p-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setEditModalOpen(true);
                            }}
                            className="group relative p-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                            title="Edit Shipment"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(shipment.id)}
                            className="group relative p-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                            title="Delete"
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

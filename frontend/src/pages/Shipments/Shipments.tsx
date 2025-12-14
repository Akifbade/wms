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
  PhotoIcon,
  ChevronLeftIcon,
  UserIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { shipmentsAPI, getBackendUrl } from '../../services/api';
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
  const [viewMode, setViewMode] = useState<'folders' | 'table'>('folders');
  const [sortBy, setSortBy] = useState<string>('date_desc');
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

  // Photo lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    loadShipments();
  }, [activeStatus, searchTerm, sortBy]);

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

      // Sort shipments (default: newest first) - Create new array to trigger React re-render
      const sorted = [...filtered].sort((a: any, b: any) => {
        const getDate = (s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime();
        const getDays = (s: any) => {
          const src = s.arrivalDate || s.receivedDate || s.createdAt;
          if (!src) return 0;
          return Math.ceil((Date.now() - new Date(src).getTime()) / (1000 * 60 * 60 * 24));
        };
        
        switch (sortBy) {
          case 'date_desc': return getDate(b) - getDate(a); // Newest first
          case 'date_asc': return getDate(a) - getDate(b); // Oldest first
          case 'name_asc': return (a.clientName || '').localeCompare(b.clientName || '');
          case 'name_desc': return (b.clientName || '').localeCompare(a.clientName || '');
          case 'cbm_desc': return (Number(b.cbm) || 0) - (Number(a.cbm) || 0);
          case 'cbm_asc': return (Number(a.cbm) || 0) - (Number(b.cbm) || 0);
          case 'duration_desc': return getDays(b) - getDays(a); // Longest first
          case 'duration_asc': return getDays(a) - getDays(b); // Shortest first
          case 'pieces_desc': return (b.currentBoxCount || 0) - (a.currentBoxCount || 0);
          case 'pieces_asc': return (a.currentBoxCount || 0) - (b.currentBoxCount || 0);
          default: return getDate(b) - getDate(a);
        }
      });

      setShipments(sorted);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_WAREHOUSE': case 'IN_STORAGE': case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PARTIAL': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RELEASED': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // --- RENDER HELPERS ---

  const ReleasedStamp = () => (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-red-600 text-red-600 font-bold text-2xl px-4 py-2 rounded opacity-40 pointer-events-none z-0 whitespace-nowrap select-none">
      RELEASED
    </div>
  );

  const ContractBadge = () => (
    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm z-10">
      CONTRACT
    </div>
  );

  const PrepaidBadge = () => (
    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm z-10">
      PREPAID
    </div>
  );

  const ShipmentCard = ({ shipment }: { shipment: any }) => {
    const days = getDaysStored(shipment);
    const canRelease = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(shipment.status) && shipment.currentBoxCount > 0;
    const photos = shipment.shipmentPhotos || [];
    const firstRackId = shipment.boxes?.find((b: any) => b.rackId)?.rackId;
    const isReleased = shipment.status === 'RELEASED';
    const isContract = shipment.companyProfile?.hasContract; // Assuming this field exists or logic
    
    return (
      <div className="relative bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all p-2 md:p-4 overflow-hidden group">
        {/* Stamps & Badges */}
        {isReleased && <ReleasedStamp />}
        {isContract ? <ContractBadge /> : <PrepaidBadge />}

        <div className="flex flex-col md:flex-row gap-2 md:gap-4 relative z-10">
          {/* Left: Photo & Basic Info */}
          <div className="flex gap-2 md:gap-4 md:w-1/3">
            {/* Photo Thumbnail */}
            <button
              onClick={() => {
                if (photos.length > 0) {
                  setLightboxPhotos(photos);
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }
              }}
              className="relative flex-shrink-0 w-14 h-14 md:w-24 md:h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-blue-400 transition-colors group/photo"
            >
              {photos.length > 0 ? (
                <>
                  <img
                    src={photos[0].startsWith('http') ? photos[0] : `${getBackendUrl()}${photos[0]}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                      +{photos.length - 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 flex items-center justify-center transition-colors">
                    <PhotoIcon className="h-6 w-6 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <PhotoIcon className="h-8 w-8" />
                </div>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-lg font-bold text-blue-900 truncate" title={shipment.clientName}>
                {shipment.clientName}
              </h3>
              <p className="text-[10px] md:text-xs font-mono text-slate-500 mt-0.5">{shipment.referenceId}</p>
              
              {shipment.companyProfile && (
                <div className="flex items-center gap-1 mt-1 md:mt-2 text-[10px] md:text-xs text-blue-600 font-medium bg-blue-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md w-fit">
                  <BuildingOfficeIcon className="h-3 w-3" />
                  {shipment.companyProfile.name}
                </div>
              )}
            </div>
          </div>

          {/* Middle: Detailed Stats Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-1.5 md:gap-y-3 gap-x-2 md:gap-x-4 text-[10px] md:text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4">
            {/* Row 1 */}
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><CubeIcon className="h-3 w-3" /> Pieces</p>
              <p className="font-semibold text-slate-700">{shipment.currentBoxCount} / {shipment.originalBoxCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><ScaleIcon className="h-3 w-3" /> CBM / Wgt</p>
              <p className="font-semibold text-slate-700">
                {shipment.cbm ? `${Number(shipment.cbm).toFixed(2)} m³` : '-'} 
                <span className="text-slate-300 mx-1">|</span> 
                {shipment.weight ? `${shipment.weight} kg` : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><MapPinIcon className="h-3 w-3" /> Location</p>
              {shipment.rackLocations && shipment.rackLocations !== 'N/A' ? (
                <button
                  onClick={() => firstRackId && navigate(`/racks?highlight=${firstRackId}`)}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {shipment.rackLocations}
                </button>
              ) : (
                <p className="text-slate-400 italic">Unassigned</p>
              )}
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3" /> Arrival</p>
              <p className="font-medium text-slate-700">{formatDate(shipment.arrivalDate || shipment.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><ClockIcon className="h-3 w-3" /> Duration</p>
              <p className={`font-medium ${days > 60 ? 'text-red-600' : days > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {days} days
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><UserIcon className="h-3 w-3" /> Created By</p>
              <p className="font-medium text-slate-700 truncate">{shipment.createdBy?.name || 'System'}</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1.5 md:gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4 min-w-[140px]">
            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold border ${getStatusStyle(shipment.status)}`}>
              {getStatusLabel(shipment.status)}
            </span>

            <div className="flex items-center gap-0.5 md:gap-1">
              <button onClick={() => { setSelectedShipment(shipment); setDetailModalOpen(true); }} className="p-1 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                <EyeIcon className="h-4 md:h-5 w-4 md:w-5" />
              </button>
              <button onClick={() => { setSelectedShipment(shipment); setQrModalOpen(true); }} className="p-1 md:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="QR Codes">
                <QrCodeIcon className="h-4 md:h-5 w-4 md:w-5" />
              </button>
              <button onClick={() => { setSelectedShipment(shipment); setEditModalOpen(true); }} className="p-1 md:p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                <PencilIcon className="h-4 md:h-5 w-4 md:w-5" />
              </button>
              {canRelease && (
                <button onClick={() => handleReleaseClick(shipment)} className="p-1 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Release">
                  <ArrowRightOnRectangleIcon className="h-4 md:h-5 w-4 md:w-5" />
                </button>
              )}
              <button onClick={() => navigate(`/shipment/${shipment.id}`)} className="p-1 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Report">
                <DocumentTextIcon className="h-4 md:h-5 w-4 md:w-5" />
              </button>
              <button onClick={() => handleDelete(shipment.id)} className="p-1 md:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                <TrashIcon className="h-4 md:h-5 w-4 md:w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-blue-600 font-medium">Loading Shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 sticky top-0 z-20 shadow-sm">
        <div className="px-2 py-2 md:px-6 md:py-4">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-blue-900">Shipments</h1>
              <p className="text-xs md:text-sm text-slate-500 hidden md:block">Manage intake, storage, and release operations</p>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-3">
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-0.5 md:p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode('folders')}
                  className={`p-1.5 md:p-2 rounded-md transition-all ${viewMode === 'folders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Folder View"
                >
                  <FolderIcon className="h-4 md:h-5 w-4 md:w-5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 md:p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table View"
                >
                  <TableCellsIcon className="h-4 md:h-5 w-4 md:w-5" />
                </button>
              </div>

              {/* Hide on mobile - only show on desktop */}
              <div className="hidden md:block">
                <ShipmentsPrintReport
                  shipments={shipments}
                  searchTerm={searchTerm}
                  activeTab={activeStatus}
                  warehouseFilter="all"
                />
              </div>
              
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2.5 bg-blue-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <PlusIcon className="h-4 md:h-5 w-4 md:w-5" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>

          {/* Search & Sort Bar */}
          <div className="mt-2 md:mt-6 flex flex-row gap-2 md:gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-blue-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 md:pl-10 pr-8 md:pr-10 py-2 md:py-3 text-sm bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2">
                  <XMarkIcon className="h-4 md:h-5 w-4 md:w-5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-2 md:pl-3 pr-7 md:pr-8 py-2 md:py-3 text-xs md:text-sm bg-white border border-slate-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="date_desc">📅 Newest</option>
                <option value="date_asc">📅 Oldest</option>
                <option value="name_asc">🔤 A-Z</option>
                <option value="name_desc">🔤 Z-A</option>
                <option value="duration_desc">⏱️ Longest</option>
                <option value="duration_asc">⏱️ Shortest</option>
                <option value="cbm_desc">📦 CBM ↓</option>
                <option value="cbm_asc">📦 CBM ↑</option>
                <option value="pieces_desc">🔢 Pieces ↓</option>
                <option value="pieces_asc">🔢 Pieces ↑</option>
              </select>
              <ArrowsUpDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3 md:h-4 w-3 md:w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mt-2 md:mt-6 flex gap-1 md:gap-2 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  activeStatus === tab.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span className={`px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${
                  activeStatus === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-2 md:p-6 pb-24">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
            <XMarkIcon className="h-5 w-5" />
            {error}
          </div>
        )}

        {viewMode === 'folders' ? (
          /* FOLDER VIEW */
          <div className="space-y-2 md:space-y-4">
            {Object.keys(groupedByCompany).length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CubeIcon className="h-10 w-10 text-blue-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No shipments found</h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              Object.entries(groupedByCompany).sort((a, b) => a[0].localeCompare(b[0])).map(([company, items]: [string, any]) => {
                const isOpen = expandedFolders.has(company);
                const stored = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length;
                const totalBoxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);

                return (
                  <div key={company} className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleFolder(company)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                          {isOpen ? <ChevronDownIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-800 transition-colors">{company}</h3>
                          <p className="text-sm text-slate-500">{items.length} shipments · {totalBoxes} pieces</p>
                        </div>
                      </div>
                      {stored > 0 && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                          {stored} Active
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-blue-50 bg-slate-50/50 p-2 md:p-4 space-y-2 md:space-y-4">
                        {items.map((shipment: any) => (
                          <ShipmentCard key={shipment.id} shipment={shipment} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="space-y-2 md:space-y-4">
             {shipments.map((shipment: any) => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
             ))}
             {shipments.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CubeIcon className="h-10 w-10 text-blue-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No shipments found</h3>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-30 hover:bg-blue-700 active:scale-95 transition-all"
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

      {/* Photo Lightbox */}
      {lightboxOpen && lightboxPhotos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>

          {lightboxPhotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length); }}
              className="absolute left-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
            >
              <ChevronLeftIcon className="h-8 w-8" />
            </button>
          )}

          <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhotos[lightboxIndex].startsWith('http') ? lightboxPhotos[lightboxIndex] : `${getBackendUrl()}${lightboxPhotos[lightboxIndex]}`}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full backdrop-blur-md">
              {lightboxIndex + 1} / {lightboxPhotos.length}
            </div>
          </div>

          {lightboxPhotos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length); }}
              className="absolute right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
            >
              <ChevronRightIcon className="h-8 w-8" />
            </button>
          )}

          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/40 rounded-xl backdrop-blur-md overflow-x-auto max-w-[90vw]">
              {lightboxPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${idx === lightboxIndex ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <img
                    src={photo.startsWith('http') ? photo : `${getBackendUrl()}${photo}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

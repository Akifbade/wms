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
import PhotoLightbox from '../../components/PhotoLightbox';
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

  // Rack popup state
  const [rackPopup, setRackPopup] = useState<any>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounced search - wait 500ms after user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadShipments();
  }, [activeStatus, debouncedSearch, sortBy]);

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

      // Filter by search (using debounced value)
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter((s: any) =>
          s.clientName?.toLowerCase().includes(q) ||
          s.referenceId?.toLowerCase().includes(q) ||
          s.clientPhone?.toLowerCase().includes(q) ||
          s.companyProfile?.name?.toLowerCase().includes(q) ||
          s.rackLocation?.toLowerCase().includes(q)
        );
      }

      // Sort shipments (default: newest first by createdAt) - Create new array to trigger React re-render
      const sorted = [...filtered].sort((a: any, b: any) => {
        // Use createdAt as primary (when shipment was added to system)
        const getCreatedAt = (s: any) => new Date(s.createdAt || 0).getTime();
        // Use arrivalDate for "arrival" sorting if needed
        const getArrivalDate = (s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime();
        const getDays = (s: any) => {
          const src = s.arrivalDate || s.receivedDate || s.createdAt;
          if (!src) return 0;
          return Math.ceil((Date.now() - new Date(src).getTime()) / (1000 * 60 * 60 * 24));
        };

        switch (sortBy) {
          case 'date_desc': return getCreatedAt(b) - getCreatedAt(a); // Newest added first
          case 'date_asc': return getCreatedAt(a) - getCreatedAt(b); // Oldest added first
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

  // Group by company - sort by latest arrival date first
  // First sort shipments by arrivalDate descending for folder view
  const sortedForFolders = [...shipments].sort((a: any, b: any) => {
    const dateA = new Date(a.arrivalDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.arrivalDate || b.createdAt || 0).getTime();
    return dateB - dateA; // Latest arrival first
  });

  const groupedByCompany = sortedForFolders.reduce((acc: any, shipment: any) => {
    const company = shipment.companyProfile?.name || 'Unassigned';
    if (!acc[company]) acc[company] = [];
    acc[company].push(shipment);
    return acc;
  }, {}) as Record<string, any[]>;

  // Sort folders by their latest shipment's arrival date
  const sortedFolderNames = Object.keys(groupedByCompany).sort((a, b) => {
    const latestA = Math.max(...groupedByCompany[a].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime()));
    const latestB = Math.max(...groupedByCompany[b].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime()));
    return latestB - latestA; // Folders with latest arrivals first
  });

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

  // Indeterminate checkbox component for select-all
  const IndeterminateCheckbox = ({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) => {
    const ref = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
      if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
    );
  };

  const ShipmentCard = ({ shipment }: { shipment: any }) => {
    const days = getDaysStored(shipment);
    // ✅ FIX: Check if boxes exist for moved shipments (backend now updates status properly)
    const canRelease = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(shipment.status) &&
      (shipment.currentBoxCount > 0 || (shipment.boxes && shipment.boxes.length > 0));
    const photos = shipment.shipmentPhotos || [];
    const isReleased = shipment.status === 'RELEASED';
    const isContract = shipment.companyProfile?.hasContract; // Assuming this field exists or logic

    return (
      <div className={`relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-2 md:p-4 overflow-hidden group ${days > 60 ? 'border-red-300 bg-red-50/30' : days > 30 ? 'border-amber-300 bg-amber-50/30' : 'border-blue-100'}`}>
        {/* Stamps & Badges */}
        {isReleased && <ReleasedStamp />}
        {isContract ? <ContractBadge /> : <PrepaidBadge />}

        <div className="flex flex-col md:flex-row gap-2 md:gap-4 relative z-10">
          {/* Bulk select checkbox — table view only */}
          {viewMode === 'table' && (
            <div className="flex items-center pl-1">
              <input
                type="checkbox"
                checked={selectedIds.has(shipment.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  const next = new Set(selectedIds);
                  if (next.has(shipment.id)) next.delete(shipment.id);
                  else next.add(shipment.id);
                  setSelectedIds(next);
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          )}
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
                {shipment.weight != null ? `${shipment.weight} kg` : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 flex items-center gap-1"><MapPinIcon className="h-3 w-3" /> Location</p>
              {shipment.rackLocations && shipment.rackLocations !== 'N/A' ? (
                <button
                  onClick={() => setRackPopup(shipment)}
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
              <button onClick={() => window.open(`/shipment-report/${shipment.id}`, '_blank')} className="p-1 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Report">
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
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeStatus === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
                <span className={`px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${activeStatus === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
              sortedFolderNames.map((company) => {
                const items = groupedByCompany[company];
                const isOpen = expandedFolders.has(company);
                const stored = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length;
                const totalBoxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);

                return (
                  <div key={company} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${company === 'Unassigned' ? 'border-slate-200' : 'border-blue-100'}`}>
                    <button
                      onClick={() => toggleFolder(company)}
                      className={`w-full px-6 py-4 flex items-center justify-between transition-colors group ${company === 'Unassigned' ? 'hover:bg-slate-50/50' : 'hover:bg-blue-50/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          company === 'Unassigned'
                            ? (isOpen ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200')
                            : (isOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100')
                        }`}>
                          {isOpen ? <ChevronDownIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
                        </div>
                        <div className="text-left">
                          <h3 className={`text-lg font-bold transition-colors ${company === 'Unassigned' ? 'text-slate-500 group-hover:text-slate-700' : 'text-slate-800 group-hover:text-blue-800'}`}>
                            {company === 'Unassigned' ? '🚫 Unassigned' : company}
                          </h3>
                          <p className="text-sm text-slate-500">{items.length} shipments · {totalBoxes} pieces</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {company === 'Unassigned' && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            {items.length}
                          </span>
                        )}
                        {stored > 0 && company !== 'Unassigned' && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                            {stored} Active
                          </span>
                        )}
                      </div>
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
            {/* Table header — bulk select column label */}
            {shipments.length > 0 && (
              <div className="flex items-center gap-2 md:gap-4 px-2 py-2 text-xs text-slate-500 font-medium border-b border-slate-100">
                <IndeterminateCheckbox
                  checked={selectedIds.size === shipments.length}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < shipments.length}
                  onChange={() => {
                    if (selectedIds.size === shipments.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(shipments.map(s => s.id)));
                    }
                  }}
                />
                <span>Select All</span>
                {selectedIds.size > 0 && (
                  <span className="text-blue-600 font-semibold">{selectedIds.size} selected</span>
                )}
              </div>
            )}
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

      {/* Floating action bar for bulk select */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                alert(`Release ${selectedIds.size} shipment(s) - bulk release coming soon`);
              }}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Release Selected
            </button>
          </div>
        </div>
      )}

      {/* Rack Info Popup */}
      {rackPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setRackPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800">Rack Details</h3>
              <button
                onClick={() => setRackPopup(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Rack Code</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{rackPopup.rackLocations || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Zone</p>
                <p className="text-base font-semibold text-slate-700 mt-0.5">{rackPopup.zone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Boxes on Rack</p>
                <p className="text-base font-semibold text-slate-700 mt-0.5">
                  {rackPopup.currentBoxCount || 0} / {rackPopup.originalBoxCount || 0}
                </p>
              </div>
              {rackPopup.rackLocations && (
                <a
                  href={`/racks?highlight=${rackPopup.boxes?.find((b: any) => b.rackId)?.rackId || ''}`}
                  className="block w-full text-center mt-2 px-4 py-2.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View in Racks →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxOpen && lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos.map(p => p.startsWith('http') ? p : `${getBackendUrl()}${p}`)}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
};

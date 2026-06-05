import React, { useState, useEffect } from 'react';
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
  UserIcon,
  TableCellsIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TruckIcon,
  InboxArrowDownIcon,
  SquaresPlusIcon,
  FireIcon,
  ShieldExclamationIcon,
  CalendarDaysIcon,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'folders' | 'table'>('folders');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [shipments, setShipments] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, in_storage: 0, partial: 0, released: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animReady, setAnimReady] = useState(false);

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

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Trigger mount animation
  useEffect(() => {
    requestAnimationFrame(() => setAnimReady(true));
  }, []);

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
      const allData: any = await shipmentsAPI.getAll({ limit: 2000 });
      const allShipments = allData.shipments || [];

      const counts = {
        all: allShipments.length,
        pending: allShipments.filter((s: any) => s.status === 'PENDING').length,
        in_storage: allShipments.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length,
        partial: allShipments.filter((s: any) => s.status === 'PARTIAL').length,
        released: allShipments.filter((s: any) => s.status === 'RELEASED').length
      };
      setStatusCounts(counts);

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

      const sorted = [...filtered].sort((a: any, b: any) => {
        const getCreatedAt = (s: any) => new Date(s.createdAt || 0).getTime();
        const getDays = (s: any) => {
          const src = s.arrivalDate || s.receivedDate || s.createdAt;
          if (!src) return 0;
          return Math.ceil((Date.now() - new Date(src).getTime()) / (1000 * 60 * 60 * 24));
        };

        switch (sortBy) {
          case 'date_desc': return getCreatedAt(b) - getCreatedAt(a);
          case 'date_asc': return getCreatedAt(a) - getCreatedAt(b);
          case 'name_asc': return (a.clientName || '').localeCompare(b.clientName || '');
          case 'name_desc': return (b.clientName || '').localeCompare(a.clientName || '');
          case 'cbm_desc': return (Number(b.cbm) || 0) - (Number(a.cbm) || 0);
          case 'cbm_asc': return (Number(a.cbm) || 0) - (Number(b.cbm) || 0);
          case 'duration_desc': return getDays(b) - getDays(a);
          case 'duration_asc': return getDays(a) - getDays(b);
          case 'pieces_desc': return (b.currentBoxCount || 0) - (a.currentBoxCount || 0);
          case 'pieces_asc': return (a.currentBoxCount || 0) - (b.currentBoxCount || 0);
          default: return getCreatedAt(b) - getCreatedAt(a);
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
      case 'PENDING': return 'bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-700 border-amber-200';
      case 'IN_WAREHOUSE': case 'IN_STORAGE': case 'ACTIVE': return 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200';
      case 'PARTIAL': return 'bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 border-orange-200';
      case 'RELEASED': return 'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 border-blue-200';
      default: return 'bg-gradient-to-r from-gray-50 to-gray-100/50 text-gray-700 border-gray-200';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <ClockIcon className="h-3.5 w-3.5" />;
      case 'IN_WAREHOUSE': case 'IN_STORAGE': case 'ACTIVE': return <CheckCircleIcon className="h-3.5 w-3.5" />;
      case 'PARTIAL': return <ExclamationCircleIcon className="h-3.5 w-3.5" />;
      case 'RELEASED': return <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" />;
      default: return <CubeIcon className="h-3.5 w-3.5" />;
    }
  };

  // Group by company
  const sortedForFolders = [...shipments].sort((a: any, b: any) => {
    const dateA = new Date(a.arrivalDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.arrivalDate || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const groupedByCompany = sortedForFolders.reduce((acc: any, shipment: any) => {
    const company = shipment.companyProfile?.name || 'Unassigned';
    if (!acc[company]) acc[company] = [];
    acc[company].push(shipment);
    return acc;
  }, {}) as Record<string, any[]>;

  const sortedFolderNames = Object.keys(groupedByCompany).sort((a, b) => {
    const latestA = Math.max(...groupedByCompany[a].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime()));
    const latestB = Math.max(...groupedByCompany[b].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime()));
    return latestB - latestA;
  });

  const toggleFolder = (name: string) => {
    const next = new Set(expandedFolders);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedFolders(next);
  };

  // Stats for header cards
  const getStats = () => [
    { label: 'Total', value: statusCounts.all, icon: CubeIcon, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 text-blue-600', ring: 'ring-blue-200' },
    { label: 'In Storage', value: statusCounts.in_storage, icon: CheckCircleIcon, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-200' },
    { label: 'Pending', value: statusCounts.pending, icon: ClockIcon, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 text-amber-600', ring: 'ring-amber-200' },
    { label: 'Released', value: statusCounts.released, icon: TruckIcon, color: 'from-slate-500 to-slate-600', bg: 'bg-slate-50 text-slate-600', ring: 'ring-slate-200' },
  ];

  // Tabs config
  const tabs = [
    { key: 'all', label: 'All', count: statusCounts.all, icon: CubeIcon },
    { key: 'pending', label: 'Pending', count: statusCounts.pending, icon: ClockIcon },
    { key: 'in_storage', label: 'Stored', count: statusCounts.in_storage, icon: CheckCircleIcon },
    { key: 'partial', label: 'Partial', count: statusCounts.partial, icon: ExclamationCircleIcon },
    { key: 'released', label: 'Released', count: statusCounts.released, icon: TruckIcon },
  ];

  // ---------- SUB-COMPONENTS ----------

  const Badge = ({ shipment }: { shipment: any }) => {
    const status = getStatusStyle(shipment.status);
    const label = getStatusLabel(shipment.status);
    const icon = getStatusIcon(shipment.status);
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm ${status}`}>
        {icon}
        {label}
      </span>
    );
  };

  const DaysBadge = ({ days }: { days: number }) => {
    if (days > 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
          <FireIcon className="h-3 w-3" />
          {days}d
        </span>
      );
    }
    if (days > 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
          <ClockIcon className="h-3 w-3" />
          {days}d
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <CheckCircleIcon className="h-3 w-3" />
        {days}d
      </span>
    );
  };

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

  const AgeBar = ({ days }: { days: number }) => {
    // 90-day scale
    const pct = Math.min(100, (days / 90) * 100);
    const color = days > 60 ? 'bg-red-400' : days > 30 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  const ShipmentCard = ({ shipment, index = 0 }: { shipment: any; index?: number }) => {
    const days = getDaysStored(shipment);
    const canRelease = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(shipment.status) &&
      (shipment.currentBoxCount > 0 || (shipment.boxes && shipment.boxes.length > 0));
    const photos = shipment.shipmentPhotos || [];
    const isReleased = shipment.status === 'RELEASED';
    const isPartial = shipment.status === 'PARTIAL';
    const isPending = shipment.status === 'PENDING';
    const hasRack = shipment.rackLocations && shipment.rackLocations !== 'N/A';

    // Card accent color based on status
    const cardBorder = isReleased
      ? 'border-blue-200 bg-gradient-to-br from-white to-blue-50/40'
      : isPending
        ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/30'
        : isPartial
          ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50/30'
          : days > 60
            ? 'border-red-200 bg-gradient-to-br from-white to-red-50/30'
            : days > 30
              ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/20'
              : 'border-slate-200 bg-gradient-to-br from-white to-slate-50/30';

    const cardHover = isReleased
      ? 'hover:border-blue-300 hover:shadow-blue-200/30'
      : isPending
        ? 'hover:border-amber-300 hover:shadow-amber-200/30'
        : 'hover:border-blue-300 hover:shadow-blue-200/30';

    return (
      <div
        className={`relative rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group animate-fadeIn ${cardBorder} ${cardHover}`}
        style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
      >
        {/* Aging timeline bar at top */}
        {!isReleased && (
          <div className="absolute top-0 left-0 right-0 h-1 z-10">
            <AgeBar days={days} />
          </div>
        )}

        {/* RELEASED watermark */}
        {isReleased && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none">
            <div className="transform -rotate-12 opacity-[0.06]">
              <span className="text-6xl font-black text-blue-600 tracking-[0.3em]">RELEASED</span>
            </div>
          </div>
        )}

        <div className="relative z-10 p-3 md:p-5">
          {/* Top row: checkbox + client info + status */}
          <div className="flex items-start gap-3 mb-3">
            {viewMode === 'table' && (
              <div className="flex items-center pt-0.5">
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

            {/* Photo thumbnail */}
            <button
              onClick={() => {
                if (photos.length > 0) {
                  setLightboxPhotos(photos);
                  setLightboxIndex(0);
                  setLightboxOpen(true);
                }
              }}
              className="relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50 hover:border-blue-400 transition-all group/photo shadow-sm"
            >
              {photos.length > 0 ? (
                <>
                  <img
                    src={photos[0].startsWith('http') ? photos[0] : `${getBackendUrl()}${photos[0]}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-tl-md font-bold">
                      +{photos.length - 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/30 flex items-center justify-center transition-all rounded-xl">
                    <PhotoIcon className="h-5 w-5 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <PhotoIcon className="h-6 w-6" />
                </div>
              )}
            </button>

            {/* Client info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-bold text-slate-800 truncate max-w-[200px] md:max-w-[300px]" title={shipment.clientName}>
                  {shipment.clientName}
                </h3>
                <Badge shipment={shipment} />
                <DaysBadge days={days} />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{shipment.referenceId}</p>
              {shipment.companyProfile && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    {shipment.companyProfile.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-100 p-2.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <CubeIcon className="h-3 w-3" /> Pieces
              </p>
              <p className="text-sm font-bold text-slate-700">
                {shipment.currentBoxCount}
                <span className="text-slate-300 font-normal"> / {shipment.originalBoxCount}</span>
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-100 p-2.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <ScaleIcon className="h-3 w-3" /> CBM / Wgt
              </p>
              <p className="text-sm font-bold text-slate-700">
                {shipment.cbm ? `${Number(shipment.cbm).toFixed(2)}` : '-'}
                <span className="text-slate-300 mx-1">|</span>
                {shipment.weight != null ? `${shipment.weight}kg` : '-'}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-100 p-2.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <MapPinIcon className="h-3 w-3" /> Location
              </p>
              {hasRack ? (
                <button
                  onClick={() => setRackPopup(shipment)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                >
                  {shipment.rackLocations}
                </button>
              ) : (
                <p className="text-sm text-slate-400 italic">—</p>
              )}
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-100 p-2.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                <CalendarDaysIcon className="h-3 w-3" /> Arrival
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {formatDate(shipment.arrivalDate || shipment.createdAt)}
              </p>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {shipment.createdBy?.name || 'System'}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSelectedShipment(shipment); setDetailModalOpen(true); }}
                className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                title="View Details"
              >
                <EyeIcon className="h-4 md:h-4.5 w-4 md:w-4.5" />
              </button>
              <button
                onClick={() => { setSelectedShipment(shipment); setQrModalOpen(true); }}
                className="p-1.5 md:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                title="QR Codes"
              >
                <QrCodeIcon className="h-4 md:h-4.5 w-4 md:w-4.5" />
              </button>
              <button
                onClick={() => { setSelectedShipment(shipment); setEditModalOpen(true); }}
                className="p-1.5 md:p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                title="Edit"
              >
                <PencilIcon className="h-4 md:h-4.5 w-4 md:w-4.5" />
              </button>
              {canRelease && (
                <button
                  onClick={() => handleReleaseClick(shipment)}
                  className="p-1.5 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                  title="Release"
                >
                  <ArrowRightOnRectangleIcon className="h-4 md:h-4.5 w-4 md:w-4.5" />
                </button>
              )}
              <button
                onClick={() => window.open(`/shipment-report/${shipment.id}`, '_blank')}
                className="p-1.5 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                title="Report"
              >
                <DocumentTextIcon className="h-4 md:h-4.5 w-4 md:w-4.5" />
              </button>
              <button
                onClick={() => handleDelete(shipment.id)}
                className="p-1.5 md:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                title="Delete"
              >
                <TrashIcon className="h-4 md:h-4.5 w-4 md:w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Skeleton loader
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-16 h-16 bg-slate-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="h-2 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="h-8 bg-slate-50 rounded-lg" />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 bg-slate-100 rounded-lg w-48 animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-lg w-32 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ===== HEADER WITH GRADIENT ===== */}
      <div className="relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
          {/* Title + Actions row */}
          <div className={`flex items-center justify-between mb-4 md:mb-6 transition-all duration-500 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-200/50">
                  <InboxArrowDownIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Shipments</h1>
                  <p className="text-xs md:text-sm text-slate-400">Manage intake, storage, and release operations</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* View Toggle */}
              <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                <button
                  onClick={() => setViewMode('folders')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'folders' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Folder View"
                >
                  <FolderIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table View"
                >
                  <TableCellsIcon className="h-4 w-4" />
                </button>
              </div>

              <ShipmentsPrintReport shipments={shipments} searchTerm={searchTerm} activeTab={activeStatus} warehouseFilter="all" />

              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs md:text-sm font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200/50 hover:shadow-blue-300/60 active:scale-95"
              >
                <PlusIcon className="h-4 md:h-5 w-4 md:w-5" />
                <span className="hidden sm:inline">New Shipment</span>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6 transition-all duration-500 delay-100 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {getStats().map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="relative bg-white rounded-xl border border-slate-100 p-3 md:p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                      <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5">{stat.value}</p>
                    </div>
                    <div className={`p-2 md:p-2.5 rounded-xl ${stat.bg} ring-2 ${stat.ring} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-4 md:h-5 w-4 md:w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search, Sort + Status Tabs */}
          <div className={`transition-all duration-500 delay-200 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Search + Sort row */}
            <div className="flex gap-2 md:gap-4 mb-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, company, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer shadow-sm"
                >
                  <option value="date_desc">📅 Newest</option>
                  <option value="date_asc">📅 Oldest</option>
                  <option value="name_asc">🔤 A-Z</option>
                  <option value="name_desc">🔤 Z-A</option>
                  <option value="duration_desc">⏱️ Longest stored</option>
                  <option value="duration_asc">⏱️ Shortest stored</option>
                  <option value="cbm_desc">📦 CBM ↓</option>
                  <option value="cbm_asc">📦 CBM ↑</option>
                  <option value="pieces_desc">🔢 Pieces ↓</option>
                  <option value="pieces_asc">🔢 Pieces ↑</option>
                </select>
                <ArrowsUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Animated Underline Tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveStatus(tab.key)}
                    className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-all whitespace-nowrap rounded-lg ${
                      isActive
                        ? 'text-blue-700 bg-blue-50 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                    {tab.label}
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 pb-24 md:pb-10">
        {error && (
          <div className="mb-4 md:mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2 animate-fadeIn shadow-sm">
            <ShieldExclamationIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {!loading && shipments.length === 0 && (
          <div className="text-center py-16 md:py-24 animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center shadow-inner">
              <CubeIcon className="h-10 w-10 text-blue-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No shipments found</h3>
            <p className="text-slate-400 text-sm mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200/50"
            >
              <PlusIcon className="h-4 w-4" />
              Create Shipment
            </button>
          </div>
        )}

        {/* FOLDER VIEW */}
        {viewMode === 'folders' && shipments.length > 0 && (
          <div className="space-y-3 md:space-y-4 animate-fadeIn">
            {sortedFolderNames.map((company, folderIdx) => {
              const items = groupedByCompany[company];
              const isOpen = expandedFolders.has(company);
              const activeItems = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status));
              const pendingItems = items.filter((s: any) => s.status === 'PENDING');
              const partialItems = items.filter((s: any) => s.status === 'PARTIAL');
              const totalBoxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);
              const isUnassigned = company === 'Unassigned';
              const totalCbm = items.reduce((sum: number, s: any) => sum + (Number(s.cbm) || 0), 0);

              return (
                <div
                  key={company}
                  className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
                    isUnassigned
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-white border-slate-200 hover:border-blue-200'
                  } ${isOpen ? 'shadow-md' : 'hover:shadow-md'}`}
                  style={{ animationDelay: `${folderIdx * 80}ms`, animationFillMode: 'both' }}
                >
                  {/* Folder Header */}
                  <button
                    onClick={() => toggleFolder(company)}
                    className={`w-full flex items-center justify-between transition-all duration-200 group ${
                      isUnassigned
                        ? isOpen ? 'bg-gradient-to-r from-slate-100 to-slate-50' : 'hover:bg-slate-50/50'
                        : isOpen ? 'bg-gradient-to-r from-blue-50 to-blue-50/50' : 'hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 p-3 md:px-5 md:py-4 min-w-0">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                        isUnassigned
                          ? isOpen ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                          : isOpen ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200/40' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                      }`}>
                        {isOpen ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                      </div>
                      {/* Company avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${
                        isUnassigned ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'
                      }`}>
                        {isUnassigned ? '?' : company.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className={`text-sm md:text-base font-bold transition-colors truncate ${
                          isUnassigned ? 'text-slate-500 group-hover:text-slate-700' : 'text-slate-800 group-hover:text-blue-800'
                        }`}>
                          {isUnassigned ? '🚫 Unassigned' : company}
                        </h3>
                        <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">
                          {items.length} shipment{items.length !== 1 ? 's' : ''} · {totalBoxes} piece{totalBoxes !== 1 ? 's' : ''}
                          {totalCbm > 0 && ` · ${totalCbm.toFixed(1)} m³`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2 pr-3 md:pr-5">
                      {activeItems.length > 0 && !isUnassigned && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] md:text-xs font-bold rounded-full border border-emerald-200">
                          <CheckCircleIcon className="h-3 w-3" />
                          {activeItems.length} stored
                        </span>
                      )}
                      {pendingItems.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] md:text-xs font-bold rounded-full border border-amber-200">
                          <ClockIcon className="h-3 w-3" />
                          {pendingItems.length}
                        </span>
                      )}
                      {partialItems.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-[10px] md:text-xs font-bold rounded-full border border-orange-200">
                          <ExclamationCircleIcon className="h-3 w-3" />
                          {partialItems.length}
                        </span>
                      )}
                      <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                        isUnassigned ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {items.length}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-2 md:p-4 space-y-2 md:space-y-3 animate-slideDown">
                      {items.map((shipment: any, idx: number) => (
                        <ShipmentCard key={shipment.id} shipment={shipment} index={idx} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === 'table' && shipments.length > 0 && (
          <div className="space-y-2 md:space-y-3 animate-fadeIn">
            {/* Bulk select header */}
            {shipments.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
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
                <span className="text-xs font-medium text-slate-500">Select All</span>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
            )}
            <div className="space-y-2 md:space-y-3">
              {shipments.map((shipment: any, idx: number) => (
                <ShipmentCard key={shipment.id} shipment={shipment} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-xl flex items-center justify-center z-30 hover:from-blue-700 hover:to-blue-800 active:scale-90 transition-all shadow-blue-300/40"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* ===== MODALS ===== */}
      <WHMShipmentModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={loadShipments} />
      <EditShipmentModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} shipment={selectedShipment} onSuccess={loadShipments} />
      <ShipmentDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} shipmentId={selectedShipment?.id || ''} />
      <WithdrawalModal isOpen={withdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} shipment={selectedShipment} onSuccess={loadShipments} />
      <BoxQRModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} shipmentId={selectedShipment?.id || ''} shipmentRef={selectedShipment?.referenceId || ''} />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl z-40 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <CheckCircleIcon className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-slate-700">
              <span className="text-blue-600">{selectedIds.size}</span> selected
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                alert(`Release ${selectedIds.size} shipment(s) - bulk release coming soon`);
              }}
              className="flex items-center gap-1.5 px-4 md:px-5 py-2 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-lg shadow-emerald-200/50 transition-all active:scale-95"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Release Selected
            </button>
          </div>
        </div>
      )}

      {/* Rack Info Popup */}
      {rackPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
          onClick={() => setRackPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 md:p-6 max-w-sm w-full mx-auto animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-200/50">
                  <MapPinIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Rack Location</h3>
              </div>
              <button
                onClick={() => setRackPopup(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 rounded-xl p-4 border border-blue-100">
                <p className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold mb-1">Rack Code</p>
                <p className="text-lg font-bold text-blue-800">{rackPopup.rackLocations || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Zone</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">{rackPopup.zone || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Boxes</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">
                    {rackPopup.currentBoxCount || 0} / {rackPopup.originalBoxCount || 0}
                  </p>
                </div>
              </div>
              {rackPopup.rackLocations && (
                <a
                  href={`/racks?highlight=${rackPopup.boxes?.find((b: any) => b.rackId)?.rackId || ''}`}
                  className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm font-semibold rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all border border-blue-100"
                >
                  <SquaresPlusIcon className="h-4 w-4" />
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

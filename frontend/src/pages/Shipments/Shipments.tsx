import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CalendarDaysIcon,
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
} from '@heroicons/react/24/outline';
import { shipmentsAPI, getBackendUrl } from '../../services/api';
import { WithdrawalModal } from '../../components/WithdrawalModal';
import WHMShipmentModal from '../../components/WHMShipmentModal';
import EditShipmentModal from '../../components/EditShipmentModal';
import ShipmentDetailModal from '../../components/ShipmentDetailModal';
import PhotoLightbox from '../../components/PhotoLightbox';
import BoxQRModal from '../../components/BoxQRModal';
import ShipmentsPrintReport from '../../components/ShipmentsPrintReport';

// ─── Animated Counter ────────────────────────────────────────
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <>{display}{suffix}</>;
};

// ─── Main Component ──────────────────────────────────────────
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

  // Folder / Lightbox / Popup / Bulk
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [rackPopup, setRackPopup] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sort dropdown
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setAnimReady(true)); }, []);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchTerm), 500); return () => clearTimeout(t); }, [searchTerm]);
  useEffect(() => { loadShipments(); }, [activeStatus, debouncedSearch, sortBy]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

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
        released: allShipments.filter((s: any) => s.status === 'RELEASED').length,
      };
      setStatusCounts(counts);
      let filtered = allShipments;
      if (activeStatus !== 'all') {
        const m: Record<string, string[]> = { pending: ['PENDING'], in_storage: ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'], partial: ['PARTIAL'], released: ['RELEASED'] };
        filtered = allShipments.filter((s: any) => m[activeStatus]?.includes(s.status));
      }
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter((s: any) =>
          s.clientName?.toLowerCase().includes(q) || s.referenceId?.toLowerCase().includes(q) ||
          s.clientPhone?.toLowerCase().includes(q) || s.companyProfile?.name?.toLowerCase().includes(q) ||
          s.rackLocation?.toLowerCase().includes(q));
      }
      const sorted = [...filtered].sort((a: any, b: any) => {
        const gc = (s: any) => new Date(s.createdAt || 0).getTime();
        const gd = (s: any) => { const src = s.arrivalDate || s.receivedDate || s.createdAt; if (!src) return 0; return Math.ceil((Date.now() - new Date(src).getTime()) / 86400000); };
        switch (sortBy) {
          case 'date_desc': return gc(b) - gc(a);
          case 'date_asc': return gc(a) - gc(b);
          case 'name_asc': return (a.clientName || '').localeCompare(b.clientName || '');
          case 'name_desc': return (b.clientName || '').localeCompare(a.clientName || '');
          case 'cbm_desc': return (Number(b.cbm) || 0) - (Number(a.cbm) || 0);
          case 'cbm_asc': return (Number(a.cbm) || 0) - (Number(b.cbm) || 0);
          case 'duration_desc': return gd(b) - gd(a);
          case 'duration_asc': return gd(a) - gd(b);
          case 'pieces_desc': return (b.currentBoxCount || 0) - (a.currentBoxCount || 0);
          case 'pieces_asc': return (a.currentBoxCount || 0) - (b.currentBoxCount || 0);
          default: return gc(b) - gc(a);
        }
      });
      setShipments(sorted);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    const s = shipments.find(s => s.id === id);
    if (!confirm(`Delete shipment ${s?.referenceId}?\n\nThis cannot be undone.`)) return;
    try { await shipmentsAPI.delete(id); loadShipments(); } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleReleaseClick = (shipment: any) => { setSelectedShipment(shipment); setWithdrawalModalOpen(true); };

  const getDaysStored = (shipment: any) => {
    const src = shipment?.arrivalDate || shipment?.receivedDate || shipment?.createdAt;
    if (!src) return 0;
    return Math.max(0, Math.ceil((Date.now() - new Date(src).getTime()) / 86400000));
  };

  const formatDate = (dateString: string) => !dateString ? 'N/A' : new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'PENDING': return { label: 'Pending', icon: ClockIcon, bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' };
      case 'IN_WAREHOUSE': case 'IN_STORAGE': case 'ACTIVE': return { label: 'Stored', icon: CheckCircleIcon, bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' };
      case 'PARTIAL': return { label: 'Partial', icon: ExclamationCircleIcon, bg: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' };
      case 'RELEASED': return { label: 'Released', icon: TruckIcon, bg: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' };
      default: return { label: status, icon: CubeIcon, bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
    }
  };

  const accentColors: Record<string, string> = {
    all: 'from-blue-600 to-indigo-600',
    pending: 'from-amber-500 to-orange-500',
    in_storage: 'from-emerald-500 to-teal-500',
    partial: 'from-orange-500 to-red-500',
    released: 'from-slate-500 to-gray-600',
  };
  const accentColor = accentColors[activeStatus] || accentColors.all;
  const accentBg = activeStatus === 'all' ? 'bg-blue-500' : activeStatus === 'pending' ? 'bg-amber-500' : activeStatus === 'in_storage' ? 'bg-emerald-500' : activeStatus === 'partial' ? 'bg-orange-500' : 'bg-slate-500';

  const getStats = () => [
    { label: 'Total', value: statusCounts.all, icon: CubeIcon, color: 'from-blue-500 to-indigo-600', ring: 'ring-blue-200' },
    { label: 'In Storage', value: statusCounts.in_storage, icon: CheckCircleIcon, color: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200' },
    { label: 'Pending', value: statusCounts.pending, icon: ClockIcon, color: 'from-amber-500 to-orange-500', ring: 'ring-amber-200' },
    { label: 'Released', value: statusCounts.released, icon: TruckIcon, color: 'from-slate-500 to-gray-600', ring: 'ring-slate-200' },
  ];

  const tabs = [
    { key: 'all', label: 'All', count: statusCounts.all, icon: CubeIcon },
    { key: 'pending', label: 'Pending', count: statusCounts.pending, icon: ClockIcon },
    { key: 'in_storage', label: 'Stored', count: statusCounts.in_storage, icon: CheckCircleIcon },
    { key: 'partial', label: 'Partial', count: statusCounts.partial, icon: ExclamationCircleIcon },
    { key: 'released', label: 'Released', count: statusCounts.released, icon: TruckIcon },
  ];

  // Group by company
  const groupedByCompany = [...shipments].sort((a, b) => new Date(b.arrivalDate || b.createdAt || 0).getTime() - new Date(a.arrivalDate || a.createdAt || 0).getTime())
    .reduce((acc: any, s: any) => { const c = s.companyProfile?.name || 'Unassigned'; if (!acc[c]) acc[c] = []; acc[c].push(s); return acc; }, {} as Record<string, any[]>);
  const sortedFolderNames = Object.keys(groupedByCompany).sort((a, b) => Math.max(...groupedByCompany[b].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime())) - Math.max(...groupedByCompany[a].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime())));
  const toggleFolder = (name: string) => { const n = new Set(expandedFolders); n.has(name) ? n.delete(name) : n.add(name); setExpandedFolders(n); };

  // ═══════════════════════════════════════════════
  // SUB-COMPONENTS
  // ═══════════════════════════════════════════════

  // ── Photo Gallery Strip ────────────────────────
  const PhotoStrip = ({ photos, onPhotoClick, maxShow = 4 }: { photos: string[]; onPhotoClick: (photos: string[], index: number) => void; maxShow?: number }) => {
    if (!photos || photos.length === 0) return null;
    const shown = photos.slice(0, maxShow);
    const remaining = photos.length - maxShow;
    return (
      <div className="flex gap-1.5">
        {shown.map((photo, idx) => (
          <button key={idx} onClick={() => onPhotoClick(photos, idx)}
            className="relative group/thumb flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 border-white/60 shadow-sm hover:shadow-md hover:border-blue-400 transition-all hover:scale-105 active:scale-95"
          >
            <img
              src={photo.startsWith('http') ? photo : `${getBackendUrl()}${photo}`}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/30 transition-all rounded-xl flex items-center justify-center">
              <PhotoIcon className="h-4 w-4 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow" />
            </div>
            {/* Number badge */}
            <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] font-bold px-1 py-0.5 rounded-md backdrop-blur-sm">
              {idx + 1}
            </div>
          </button>
        ))}
        {remaining > 0 && (
          <button onClick={() => onPhotoClick(photos, maxShow)}
            className="flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-500 text-xs font-bold hover:border-blue-400 hover:bg-blue-50 transition-all hover:scale-105 cursor-pointer"
          >
            +{remaining}
          </button>
        )}
      </div>
    );
  };

  // ── Day Ring ───────────────────────────────────
  const DayRing = ({ days, size = 40 }: { days: number; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(100, (days / 90) * 100);
    const strokeColor = days > 60 ? '#ef4444' : days > 30 ? '#f59e0b' : '#10b981';
    return (
      <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0 drop-shadow-sm">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (pct / 100) * circumference}
          className="transition-all duration-1000 ease-out" />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700"
          fill={days > 60 ? '#ef4444' : days > 30 ? '#d97706' : '#059669'}
          className="transform rotate-90" transform-origin="center">
          {days}d
        </text>
      </svg>
    );
  };

  // ── Age Bar ───────────────────────────────────
  const AgeBar = ({ days }: { days: number }) => {
    const pct = Math.min(100, (days / 90) * 100);
    const color = days > 60 ? 'bg-red-400' : days > 30 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  // ── Status Badge ───────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const meta = getStatusMeta(status);
    const Icon = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm ${meta.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse-soft`} />
        <Icon className="h-3 w-3" />
        {meta.label}
      </span>
    );
  };

  // ── Indeterminate Checkbox ─────────────────────
  const IndeterminateCheckbox = ({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
    return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />;
  };

  // ── Shipment Card ──────────────────────────────
  const ShipmentCard = ({ shipment }: { shipment: any }) => {
    const days = getDaysStored(shipment);
    const canRelease = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(shipment.status) && (shipment.currentBoxCount > 0 || (shipment.boxes && shipment.boxes.length > 0));
    const photos = shipment.shipmentPhotos || [];
    const isReleased = shipment.status === 'RELEASED';
    const hasRack = shipment.rackLocations && shipment.rackLocations !== 'N/A';
    const cardRef = useRef<HTMLDivElement>(null);

    // 3D tilt
    const handleMouseMove = (e: React.MouseEvent) => {
      if (!cardRef.current || window.innerWidth < 768) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      cardRef.current.style.transform = `perspective(800px) rotateX(${((y - cy) / cy) * -6}deg) rotateY(${((x - cx) / cx) * 6}deg) scale3d(1.015, 1.015, 1.015)`;
    };
    const handleMouseLeave = () => { if (cardRef.current) cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'; };

    const statusTheme = isReleased
      ? 'border-blue-200 bg-white'
      : days > 60
        ? 'border-red-200 bg-gradient-to-br from-white to-red-50/40'
        : days > 30
          ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/30'
          : 'border-slate-200 bg-white';

    const handlePhotoClick = (allPhotos: string[], idx: number) => {
      setLightboxPhotos(allPhotos);
      setLightboxIndex(idx);
      setLightboxOpen(true);
    };

    return (
      <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        className={`relative rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group animate-fadeIn ${statusTheme}`}
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.2s ease, box-shadow 0.3s ease' }}
      >
        {/* Hover glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-emerald-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/5 group-hover:to-emerald-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

        {/* Age bar */}
        {!isReleased && <div className="absolute top-0 left-0 right-0 h-1 z-10 rounded-t-2xl overflow-hidden"><AgeBar days={days} /></div>}

        {/* RELEASED watermark */}
        {isReleased && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none">
            <div className="transform -rotate-12 opacity-[0.04]">
              <span className="text-6xl font-black text-blue-600 tracking-[0.3em]">RELEASED</span>
            </div>
          </div>
        )}

        <div className="relative z-10 p-4 md:p-5">
          {/* ── TOP ROW: Checkbox + Client Info ── */}
          <div className="flex items-start gap-3 mb-3">
            {viewMode === 'table' && (
              <div className="flex items-center pt-0.5" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selectedIds.has(shipment.id)}
                  onChange={() => { const n = new Set(selectedIds); n.has(shipment.id) ? n.delete(shipment.id) : n.add(shipment.id); setSelectedIds(n); }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-bold text-slate-800 truncate max-w-[200px] md:max-w-[280px]" title={shipment.clientName}>
                  {shipment.clientName}
                </h3>
                <StatusBadge status={shipment.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] font-mono text-slate-400">{shipment.referenceId}</p>
                <span className="text-slate-300">·</span>
                <DayRing days={days} size={32} />
              </div>
              {shipment.companyProfile && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    {shipment.companyProfile.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PHOTO STRIP ── */}
          {photos.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <PhotoIcon className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Photos ({photos.length})
                </span>
              </div>
              <PhotoStrip photos={photos} onPhotoClick={handlePhotoClick} maxShow={5} />
            </div>
          )}

          {/* ── INFO GRID ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3">
            {[
              { icon: CubeIcon, label: 'Pieces', value: `${shipment.currentBoxCount}`, sub: `/ ${shipment.originalBoxCount}`, onClick: undefined },
              { icon: ScaleIcon, label: 'CBM / Wgt', value: shipment.cbm ? `${Number(shipment.cbm).toFixed(2)}` : '-', sub: shipment.weight != null ? `${shipment.weight}kg` : '', onClick: undefined },
              { icon: MapPinIcon, label: 'Location', value: hasRack ? shipment.rackLocations : '—', isBtn: hasRack, onClick: () => setRackPopup(shipment) },
              { icon: CalendarDaysIcon, label: 'Arrival', value: formatDate(shipment.arrivalDate || shipment.createdAt), sub: undefined, onClick: undefined },
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 p-2.5 bg-white/60 hover:bg-white/90 transition-colors">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </p>
                {item.isBtn ? (
                  <button onClick={item.onClick} className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors">
                    {item.value}
                  </button>
                ) : (
                  <p className="text-sm font-bold text-slate-700">
                    {item.value}
                    {item.sub && <span className="text-slate-300 font-normal">{item.sub}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── ACTIONS ── */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {shipment.createdBy?.name || 'System'}
            </p>
            <div className="flex items-center gap-0.5">
              <ActionBtn icon={EyeIcon} color="blue" onClick={() => { setSelectedShipment(shipment); setDetailModalOpen(true); }} title="Details" />
              <ActionBtn icon={QrCodeIcon} color="purple" onClick={() => { setSelectedShipment(shipment); setQrModalOpen(true); }} title="QR" />
              <ActionBtn icon={PencilIcon} color="amber" onClick={() => { setSelectedShipment(shipment); setEditModalOpen(true); }} title="Edit" />
              {canRelease && <ActionBtn icon={ArrowRightOnRectangleIcon} color="emerald" onClick={() => handleReleaseClick(shipment)} title="Release" />}
              <ActionBtn icon={DocumentTextIcon} color="indigo" onClick={() => window.open(`/shipment-report/${shipment.id}`, '_blank')} title="Report" />
              <ActionBtn icon={TrashIcon} color="red" onClick={() => handleDelete(shipment.id)} title="Delete" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Action Button ──────────────────────────────
  const ActionBtn = ({ icon: Icon, color, onClick, title }: { icon: any; color: string; onClick: () => void; title: string }) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-600 hover:bg-blue-50',
      purple: 'text-purple-600 hover:bg-purple-50',
      amber: 'text-amber-600 hover:bg-amber-50',
      emerald: 'text-emerald-600 hover:bg-emerald-50',
      indigo: 'text-indigo-600 hover:bg-indigo-50',
      red: 'text-red-400 hover:text-red-600 hover:bg-red-50',
    };
    return (
      <button onClick={onClick}
        className={`p-1.5 md:p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-90 ${colors[color]} relative overflow-hidden group/btn`}
        title={title}>
        <Icon className="h-4 md:h-4.5 w-4 md:w-4.5 relative z-10" />
        <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity rounded-xl" />
      </button>
    );
  };

  // ── Skeleton ───────────────────────────────────
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="h-2 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="h-8 bg-slate-50 rounded-xl" />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 bg-slate-100 rounded-xl w-48 animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-xl w-32 animate-pulse" />
          </div>
          <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">

      {/* ═══ ANIMATED GRADIENT HEADER ═══ */}
      <div className="relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-blob bg-gradient-to-r ${accentColor}`} />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000 bg-gradient-to-r from-amber-500 to-pink-500" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
          {/* Title + Actions */}
          <div className={`flex items-center justify-between mb-4 md:mb-6 transition-all duration-700 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${accentColor} shadow-lg shadow-blue-200/30 ring-1 ring-white/20`}>
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
              <div className="flex p-0.5 rounded-xl border shadow-sm bg-white border-slate-200">
                <button onClick={() => setViewMode('folders')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'folders' ? `${accentBg} text-white shadow-md` : 'text-slate-400 hover:text-slate-600'}`}
                  title="Folder View">
                  <FolderIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? `${accentBg} text-white shadow-md` : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table View">
                  <TableCellsIcon className="h-4 w-4" />
                </button>
              </div>

              <ShipmentsPrintReport shipments={shipments} searchTerm={searchTerm} activeTab={activeStatus} warehouseFilter="all" />

              <button onClick={() => setCreateModalOpen(true)}
                className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r ${accentColor} text-white text-xs md:text-sm font-bold rounded-xl hover:shadow-lg active:scale-95 transition-all shadow-md hover:shadow-xl`}>
                <PlusIcon className="h-4 md:h-5 w-4 md:w-5" />
                <span className="hidden sm:inline">New Shipment</span>
              </button>
            </div>
          </div>

          {/* ═══ STATS ROW ═══ */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6 transition-all duration-700 delay-100 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {getStats().map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="relative group rounded-2xl border p-3 md:p-4 shadow-sm hover:shadow-lg transition-all duration-300 bg-white/70 border-slate-100 hover:bg-white/90">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                      <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5">
                        <AnimatedCounter value={stat.value} />
                      </p>
                    </div>
                    <div className={`p-2 md:p-2.5 rounded-2xl bg-gradient-to-br ${stat.color} text-white ring-2 ${stat.ring} group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shadow-md`}>
                      <Icon className="h-4 md:h-5 w-4 md:w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ SEARCH + SORT + TABS ═══ */}
          <div className={`transition-all duration-700 delay-200 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex gap-2 md:gap-4 mb-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search by name, ID, company, location..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm placeholder:text-slate-400" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  </button>
                )}
              </div>
              {/* Sort */}
              <div className="relative" ref={filterRef}>
                <button onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-2xl border transition-all shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                  <ArrowsUpDownIcon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Sort</span>
                </button>
                {filterOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-2xl border shadow-xl z-30 backdrop-blur-xl overflow-hidden bg-white/95 border-slate-200">
                    {[
                      { v: 'date_desc', l: '📅 Newest First' },
                      { v: 'date_asc', l: '📅 Oldest First' },
                      { v: 'name_asc', l: '🔤 Name A-Z' },
                      { v: 'name_desc', l: '🔤 Name Z-A' },
                      { v: 'duration_desc', l: '⏱️ Longest Stored' },
                      { v: 'duration_asc', l: '⏱️ Shortest Stored' },
                      { v: 'cbm_desc', l: '📦 CBM ↓' },
                      { v: 'cbm_asc', l: '📦 CBM ↑' },
                      { v: 'pieces_desc', l: '🔢 Pieces ↓' },
                      { v: 'pieces_asc', l: '🔢 Pieces ↑' },
                    ].map(opt => (
                      <button key={opt.v} onClick={() => { setSortBy(opt.v); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${sortBy === opt.v ? `${accentBg} text-white` : 'text-slate-600 hover:bg-slate-50'}`}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeStatus === tab.key;
                return (
                  <button key={tab.key} onClick={() => { setActiveStatus(tab.key); setSelectedIds(new Set()); }}
                    className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-all whitespace-nowrap rounded-xl ${
                      isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                    {tab.label}
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      <AnimatedCounter value={tab.count} />
                    </span>
                    {isActive && <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${accentBg}`} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 pb-24 md:pb-10">
        {error && (
          <div className="mb-4 md:mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2 animate-fadeIn shadow-sm">
            <ShieldExclamationIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {!loading && shipments.length === 0 && (
          <div className="text-center py-16 md:py-24 animate-fadeIn">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-inner bg-gradient-to-br ${accentColor}`}>
              <CubeIcon className="h-10 w-10 text-white/60" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No shipments found</h3>
            <p className="text-sm text-slate-400 mb-6">Try adjusting your search or filters</p>
            <button onClick={() => setCreateModalOpen(true)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${accentColor} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md active:scale-95`}>
              <PlusIcon className="h-4 w-4" />
              Create Shipment
            </button>
          </div>
        )}

        {/* ══ FOLDER VIEW ══ */}
        {viewMode === 'folders' && shipments.length > 0 && (
          <div className="space-y-3 md:space-y-4 animate-fadeIn">
            {sortedFolderNames.map((company, folderIdx) => {
              const items = groupedByCompany[company];
              const isOpen = expandedFolders.has(company);
              const activeItems = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status));
              const pendingItems = items.filter((s: any) => s.status === 'PENDING');
              const totalBoxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);
              const isUnassigned = company === 'Unassigned';
              const totalCbm = items.reduce((sum: number, s: any) => sum + (Number(s.cbm) || 0), 0);

              return (
                <div key={company}
                  className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-lg' : 'hover:shadow-md'} bg-white border-slate-200`}
                  style={{ animationDelay: `${folderIdx * 80}ms`, animationFillMode: 'both' }}>
                  
                  <button onClick={() => toggleFolder(company)}
                    className={`w-full flex items-center justify-between transition-all duration-200 group ${isOpen ? 'bg-gradient-to-r from-slate-50 via-white to-slate-50' : 'hover:bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3 md:gap-4 p-3 md:px-5 md:py-4 min-w-0">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                        isUnassigned
                          ? isOpen ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                          : isOpen ? `bg-gradient-to-br ${accentColor} text-white` : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                      }`}>
                        {isOpen ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                      </div>
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
                        {isUnassigned ? '?' : company.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className={`text-sm md:text-base font-bold transition-colors truncate ${isUnassigned ? 'text-slate-500' : 'text-slate-800 group-hover:text-blue-800'}`}>
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
                          {activeItems.length}
                        </span>
                      )}
                      {pendingItems.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] md:text-xs font-bold rounded-full border border-amber-200">
                          <ClockIcon className="h-3 w-3" />
                          {pendingItems.length}
                        </span>
                      )}
                      <span className={`flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold ${isUnassigned ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                        {items.length}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-2 md:p-4 space-y-2 md:space-y-3 animate-slideDown">
                      {items.map((shipment: any) => (
                        <ShipmentCard key={shipment.id} shipment={shipment} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TABLE VIEW ══ */}
        {viewMode === 'table' && shipments.length > 0 && (
          <div className="space-y-2 md:space-y-3 animate-fadeIn">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm bg-white/70 border-slate-100">
              <IndeterminateCheckbox checked={selectedIds.size === shipments.length}
                indeterminate={selectedIds.size > 0 && selectedIds.size < shipments.length}
                onChange={() => selectedIds.size === shipments.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(shipments.map(s => s.id)))} />
              <span className="text-xs font-medium text-slate-500">Select All</span>
              {selectedIds.size > 0 && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{selectedIds.size} selected</span>
              )}
            </div>
            <div className="space-y-2 md:space-y-3">
              {shipments.map((shipment: any) => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button onClick={() => setCreateModalOpen(true)}
        className={`md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 active:scale-90 transition-all shadow-xl bg-gradient-to-r ${accentColor} text-white shadow-lg`}>
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* ═══ MODALS ═══ */}
      <WHMShipmentModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={loadShipments} />
      <EditShipmentModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} shipment={selectedShipment} onSuccess={loadShipments} />
      <ShipmentDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} shipmentId={selectedShipment?.id || ''} />
      <WithdrawalModal isOpen={withdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} shipment={selectedShipment} onSuccess={loadShipments} />
      <BoxQRModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} shipmentId={selectedShipment?.id || ''} shipmentRef={selectedShipment?.referenceId || ''} />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-40 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-blue-50"><CheckCircleIcon className="h-4 w-4 text-blue-600" /></div>
            <span className="text-sm font-bold text-slate-700">
              <span className="text-blue-600">{selectedIds.size}</span> selected
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setSelectedIds(new Set())}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
              Clear
            </button>
            <button onClick={() => alert(`Release ${selectedIds.size} shipment(s) - bulk release coming soon`)}
              className="flex items-center gap-1.5 px-4 md:px-5 py-2 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-lg shadow-emerald-200/30 transition-all active:scale-95">
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Release Selected
            </button>
          </div>
        </div>
      )}

      {/* ═══ RACK POPUP ═══ */}
      {rackPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn" onClick={() => setRackPopup(null)}>
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl p-5 md:p-6 max-w-sm w-full mx-auto animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl shadow-lg bg-gradient-to-br ${accentColor} ring-1 ring-white/20`}>
                  <MapPinIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Rack Location</h3>
              </div>
              <button onClick={() => setRackPopup(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl p-4 border bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-100">
                <p className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold mb-1">Rack Code</p>
                <p className="text-lg font-bold text-blue-800">{rackPopup.rackLocations || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3.5 border bg-slate-50 border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Zone</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">{rackPopup.zone || '—'}</p>
                </div>
                <div className="rounded-2xl p-3.5 border bg-slate-50 border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Boxes</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">{rackPopup.currentBoxCount || 0} / {rackPopup.originalBoxCount || 0}</p>
                </div>
              </div>
              {rackPopup.rackLocations && (
                <a href={`/racks?highlight=${rackPopup.boxes?.find((b: any) => b.rackId)?.rackId || ''}`}
                  className={`flex items-center justify-center gap-2 w-full mt-1 px-4 py-3 font-semibold rounded-2xl transition-all border bg-gradient-to-r ${accentColor} text-white shadow-md hover:shadow-lg`}>
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

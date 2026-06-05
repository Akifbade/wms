import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PlusIcon, MagnifyingGlassIcon, QrCodeIcon, EyeIcon, PencilIcon, TrashIcon,
  ArrowRightOnRectangleIcon, DocumentTextIcon, ChevronDownIcon, ChevronRightIcon,
  CubeIcon, ClockIcon, MapPinIcon, XMarkIcon, PhotoIcon, CalendarDaysIcon,
  UserIcon, TableCellsIcon, FolderIcon, BuildingOfficeIcon, ScaleIcon,
  ArrowsUpDownIcon, CheckCircleIcon, ExclamationCircleIcon, TruckIcon,
  InboxArrowDownIcon, SquaresPlusIcon, FireIcon, ShieldExclamationIcon,
  StarIcon, DocumentDuplicateIcon, PrinterIcon, AdjustmentsHorizontalIcon,
  ArrowPathIcon, PencilSquareIcon, CameraIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { shipmentsAPI, getBackendUrl } from '../../services/api';
import { WithdrawalModal } from '../../components/WithdrawalModal';
import WHMShipmentModal from '../../components/WHMShipmentModal';
import EditShipmentModal from '../../components/EditShipmentModal';
import ShipmentDetailModal from '../../components/ShipmentDetailModal';
import PhotoLightbox from '../../components/PhotoLightbox';
import BoxQRModal from '../../components/BoxQRModal';
import ShipmentsPrintReport from '../../components/ShipmentsPrintReport';

// ── HELPERS ─────────────────────────────────
const AnimatedCounter = ({ value }: { value: number }) => {
  const [d, setD] = useState(0); const r = useRef<number | null>(null);
  useEffect(() => {
    const start = d; const diff = value - start; if (diff === 0) return;
    const dur = 600, st = performance.now();
    const anim = (now: number) => { const p = Math.min((now - st) / dur, 1), e = 1 - Math.pow(1 - p, 3); setD(Math.round(start + diff * e)); if (p < 1) r.current = requestAnimationFrame(anim); };
    r.current = requestAnimationFrame(anim);
    return () => { if (r.current) cancelAnimationFrame(r.current); };
  }, [value]);
  return <>{d}</>;
};

const formatDate = (ds: string) => !ds ? 'N/A' : new Date(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const getDaysStored = (s: any) => { const src = s?.arrivalDate || s?.receivedDate || s?.createdAt; if (!src) return 0; return Math.max(0, Math.ceil((Date.now() - new Date(src).getTime()) / 86400000)); };
const getBackendPhoto = (p: string) => p.startsWith('http') ? p : `${getBackendUrl()}${p}`;

const authFetch = async (url: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  return fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
};

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════
export const Shipments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'folders' | 'table'>('folders');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [shipments, setShipments] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, in_storage: 0, partial: 0, released: 0 });
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animReady, setAnimReady] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('wms-pinned') || '[]')); } catch { return new Set<string>(); } });
  const [columnFields, setColumnFields] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('wms-columns') || '["pieces","cbm","location","arrival"]'); } catch { return ['pieces', 'cbm', 'location', 'arrival']; } });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDaysMin, setFilterDaysMin] = useState(0);
  const [filterDaysMax, setFilterDaysMax] = useState(999);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [rackPopup, setRackPopup] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [notesEditing, setNotesEditing] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [activityOpen, setActivityOpen] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<Record<string, any[]>>({});
  const [activityLoading, setActivityLoading] = useState<string | null>(null);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [storageRate, setStorageRate] = useState(() => { try { return Number(localStorage.getItem('wms-storage-rate')) || 5; } catch { return 5; } });

  useEffect(() => { requestAnimationFrame(() => setAnimReady(true)); }, []);
  useEffect(() => { localStorage.setItem('wms-pinned', JSON.stringify([...pinnedIds])); }, [pinnedIds]);
  useEffect(() => { localStorage.setItem('wms-columns', JSON.stringify(columnFields)); }, [columnFields]);
  useEffect(() => { localStorage.setItem('wms-storage-rate', String(storageRate)); }, [storageRate]);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchTerm), 500); return () => clearTimeout(t); }, [searchTerm]);
  useEffect(() => { loadShipments(); }, [activeStatus, debouncedSearch, sortBy, filterDateFrom, filterDateTo, filterZone, filterCompany, filterDaysMin, filterDaysMax]);
  useEffect(() => { const h = (e: MouseEvent) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setColumnPickerOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const allData: any = await shipmentsAPI.getAll({ limit: 2000 });
      const allShips = allData.shipments || [];
      setAllShipments(allShips);
      const counts = { all: allShips.length, pending: allShips.filter((s: any) => s.status === 'PENDING').length, in_storage: allShips.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length, partial: allShips.filter((s: any) => s.status === 'PARTIAL').length, released: allShips.filter((s: any) => s.status === 'RELEASED').length };
      setStatusCounts(counts);
      let filtered = allShips;
      if (activeStatus !== 'all') { const m: Record<string, string[]> = { pending: ['PENDING'], in_storage: ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'], partial: ['PARTIAL'], released: ['RELEASED'] }; filtered = allShips.filter((s: any) => m[activeStatus]?.includes(s.status)); }
      if (debouncedSearch.trim()) { const q = debouncedSearch.toLowerCase(); filtered = filtered.filter((s: any) => s.clientName?.toLowerCase().includes(q) || s.referenceId?.toLowerCase().includes(q) || s.clientPhone?.toLowerCase().includes(q) || s.companyProfile?.name?.toLowerCase().includes(q) || s.rackLocation?.toLowerCase().includes(q)); }
      if (filterDateFrom) filtered = filtered.filter((s: any) => new Date(s.arrivalDate || s.createdAt) >= new Date(filterDateFrom));
      if (filterDateTo) filtered = filtered.filter((s: any) => new Date(s.arrivalDate || s.createdAt) <= new Date(filterDateTo + 'T23:59:59'));
      if (filterZone) filtered = filtered.filter((s: any) => s.zone?.toLowerCase().includes(filterZone.toLowerCase()));
      if (filterCompany) filtered = filtered.filter((s: any) => s.companyProfile?.name?.toLowerCase().includes(filterCompany.toLowerCase()));
      filtered = filtered.filter((s: any) => { const d = getDaysStored(s); return d >= filterDaysMin && d <= filterDaysMax; });
      const pinned = filtered.filter((s: any) => pinnedIds.has(s.id));
      const unpinned = filtered.filter((s: any) => !pinnedIds.has(s.id));
      const sorted = [...pinned, ...unpinned].sort((a: any, b: any) => { const gc = (s: any) => new Date(s.createdAt || 0).getTime(); const gd = (s: any) => getDaysStored(s);
        switch (sortBy) { case 'date_desc': return gc(b) - gc(a); case 'date_asc': return gc(a) - gc(b); case 'name_asc': return (a.clientName || '').localeCompare(b.clientName || ''); case 'name_desc': return (b.clientName || '').localeCompare(a.clientName || ''); case 'cbm_desc': return (Number(b.cbm) || 0) - (Number(a.cbm) || 0); case 'cbm_asc': return (Number(a.cbm) || 0) - (Number(b.cbm) || 0); case 'duration_desc': return gd(b) - gd(a); case 'duration_asc': return gd(a) - gd(b); case 'pieces_desc': return (b.currentBoxCount || 0) - (a.currentBoxCount || 0); case 'pieces_asc': return (a.currentBoxCount || 0) - (b.currentBoxCount || 0); default: return gc(b) - gc(a); }
      });
      setShipments(sorted); setPage(1);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm(`Delete shipment?`)) return; try { await shipmentsAPI.delete(id); loadShipments(); } catch (err: any) { alert('Error: ' + err.message); } };
  const handleDuplicate = async (id: string) => { try { const r = await authFetch(`/api/shipments/${id}/duplicate`, { method: 'POST' }); const d = await r.json(); if (d.success) loadShipments(); else alert('Error: ' + (d.message || 'Failed')); } catch (err: any) { alert('Error: ' + err.message); } };
  const handleTogglePin = async (id: string) => { const n = new Set(pinnedIds); n.has(id) ? n.delete(id) : n.add(id); setPinnedIds(n); try { await authFetch(`/api/shipments/${id}/pin`, { method: 'PUT' }); } catch {} };
  const handleSaveNote = async (id: string) => { try { await authFetch(`/api/shipments/${id}/notes`, { method: 'PUT', body: JSON.stringify({ notes: notesText }) }); setNotesEditing(null); loadShipments(); } catch (err: any) { alert('Error: ' + err.message); } };
  const handleBatchRelease = async () => { if (!confirm(`Release ${selectedIds.size} shipment(s)?`)) return; try { const r = await authFetch('/api/shipments/batch/release', { method: 'POST', body: JSON.stringify({ ids: [...selectedIds] }) }); const d = await r.json(); if (d.success) { setSelectedIds(new Set()); loadShipments(); } else alert('Error: ' + (d.message || 'Failed')); } catch (err: any) { alert('Error: ' + err.message); } };
  const handleLoadActivity = async (id: string) => { if (activityOpen === id) { setActivityOpen(null); return; } setActivityOpen(id); if (activityData[id]) return; setActivityLoading(id); try { const r = await authFetch(`/api/shipments/${id}/activity`); const d = await r.json(); if (d.success) setActivityData(prev => ({ ...prev, [id]: d.activity || [] })); } catch {} finally { setActivityLoading(null); } };
  const handlePrintLabel = (shipment: any) => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<html><head><title>Label - ${shipment.referenceId}</title><style>body{font-family:sans-serif;padding:20px}.label{border:2px solid #000;padding:20px;margin-bottom:20px;text-align:center}h1{font-size:24px;margin:0 0 10px}</style></head><body><div class="label"><h1>📦 SHIPMENT LABEL</h1><p><strong>Ref:</strong> ${shipment.referenceId}</p><p><strong>Client:</strong> ${shipment.clientName || 'N/A'}</p><p><strong>Company:</strong> ${shipment.companyProfile?.name || 'N/A'}</p><p><strong>Boxes:</strong> ${shipment.currentBoxCount || 0} / ${shipment.originalBoxCount || 0}</p><p><strong>Location:</strong> ${shipment.rackLocations || 'Unassigned'}</p><p><strong>Arrival:</strong> ${formatDate(shipment.arrivalDate)}</p>${shipment.qrCode ? `<p><strong>QR:</strong> ${shipment.qrCode}</p>` : ''}<p style="margin-top:20px;font-size:10px;color:#999">Generated ${new Date().toLocaleString()}</p></div><script>window.print();window.close();</script></body></html>`); w.document.close(); };
  const handleExportCSV = () => { const h = ['Reference ID', 'Client Name', 'Company', 'Status', 'Boxes', 'CBM', 'Weight', 'Location', 'Arrival Date', 'Days Stored', 'Created By']; const rows = shipments.map((s: any) => [s.referenceId, s.clientName, s.companyProfile?.name || '', s.status, `${s.currentBoxCount}/${s.originalBoxCount}`, s.cbm ? Number(s.cbm).toFixed(2) : '', s.weight || '', s.rackLocations || '', formatDate(s.arrivalDate || s.createdAt), getDaysStored(s), s.createdBy?.name || 'System']); const csv = [h.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n'); const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `shipments_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(u); };

  const totalPages = Math.ceil(shipments.length / PAGE_SIZE);
  const paginatedShipments = shipments.slice(0, page * PAGE_SIZE);
  const hasMore = page < totalPages;

  const accentColors: Record<string, string> = { all: 'from-blue-600 to-indigo-600', pending: 'from-amber-500 to-orange-500', in_storage: 'from-emerald-500 to-teal-500', partial: 'from-orange-500 to-red-500', released: 'from-slate-500 to-gray-600' };
  const accentColor = accentColors[activeStatus] || accentColors.all;
  const accentBg = activeStatus === 'all' ? 'bg-blue-500' : activeStatus === 'pending' ? 'bg-amber-500' : activeStatus === 'in_storage' ? 'bg-emerald-500' : activeStatus === 'partial' ? 'bg-orange-500' : 'bg-slate-500';
  const getStats = () => [
    { label: 'Total', value: statusCounts.all, icon: CubeIcon, color: 'from-blue-500 to-indigo-600', ring: 'ring-blue-200' },
    { label: 'Stored', value: statusCounts.in_storage, icon: CheckCircleIcon, color: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200' },
    { label: 'Pending', value: statusCounts.pending, icon: ClockIcon, color: 'from-amber-500 to-orange-500', ring: 'ring-amber-200' },
    { label: 'Released', value: statusCounts.released, icon: TruckIcon, color: 'from-slate-500 to-gray-600', ring: 'ring-slate-200' },
  ];
  const tabs = [
    { key: 'all', label: 'All', count: statusCounts.all, icon: CubeIcon }, { key: 'pending', label: 'Pending', count: statusCounts.pending, icon: ClockIcon },
    { key: 'in_storage', label: 'Stored', count: statusCounts.in_storage, icon: CheckCircleIcon }, { key: 'partial', label: 'Partial', count: statusCounts.partial, icon: ExclamationCircleIcon },
    { key: 'released', label: 'Released', count: statusCounts.released, icon: TruckIcon },
  ];
  const allFieldOptions = [
    { key: 'pieces', label: 'Pieces', icon: CubeIcon }, { key: 'cbm', label: 'CBM / Weight', icon: ScaleIcon }, { key: 'location', label: 'Location', icon: MapPinIcon },
    { key: 'arrival', label: 'Arrival Date', icon: CalendarDaysIcon }, { key: 'createdBy', label: 'Created By', icon: UserIcon }, { key: 'company', label: 'Company', icon: BuildingOfficeIcon }, { key: 'duration', label: 'Duration', icon: ClockIcon },
  ];
  const groupedByCompany = useMemo(() => {
    const s = [...shipments].sort((a, b) => new Date(b.arrivalDate || b.createdAt || 0).getTime() - new Date(a.arrivalDate || a.createdAt || 0).getTime());
    return s.reduce((acc: any, s: any) => { const c = s.companyProfile?.name || 'Unassigned'; if (!acc[c]) acc[c] = []; acc[c].push(s); return acc; }, {} as Record<string, any[]>);
  }, [shipments]);
  const sortedFolderNames = Object.keys(groupedByCompany).sort((a, b) => Math.max(...groupedByCompany[b].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime())) - Math.max(...groupedByCompany[a].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime())));
  const toggleFolder = (name: string) => { const n = new Set(expandedFolders); n.has(name) ? n.delete(name) : n.add(name); setExpandedFolders(n); };

  // ═══════════════════════════════════════════════
  // COMPONENTS
  // ═══════════════════════════════════════════════

  // ── Photo Gallery ──────────────────────────
  const PhotoGrid = ({ photos, onPhotoClick }: { photos: string[]; onPhotoClick: (photos: string[], index: number) => void }) => {
    if (!photos || photos.length === 0) return null;
    const c = photos.length;
    if (c === 1) return (
      <button onClick={() => onPhotoClick(photos, 0)} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all shadow-sm">
        <img src={getBackendPhoto(photos[0])} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><CameraIcon className="h-6 w-6 text-white drop-shadow-lg" /></div>
        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">1/1</span>
      </button>
    );
    if (c === 2) return (
      <div className="grid grid-cols-2 gap-2">{photos.map((p, i) => (
        <button key={i} onClick={() => onPhotoClick(photos, i)} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all shadow-sm">
          <img src={getBackendPhoto(p)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"><CameraIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" /></div>
          <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg backdrop-blur-sm">{i + 1}/{c}</span>
        </button>
      ))}</div>
    );
    // 3+ grid
    return (
      <div className="grid grid-cols-2 gap-2">
        {photos.slice(0, 4).map((p, i) => {
          const isLast = i === 3 && c > 4;
          return (<button key={i} onClick={() => onPhotoClick(photos, i)} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all shadow-sm">
            <img src={getBackendPhoto(p)} alt="" className={`w-full h-full object-cover ${isLast ? 'opacity-50' : ''} group-hover:scale-110 transition-transform duration-500`} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"><CameraIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" /></div>
            {isLast && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="text-white text-lg font-black drop-shadow-lg">+{c - 4}</span></div>}
            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg backdrop-blur-sm">{i + 1}/{c}</span>
          </button>);
        })}
      </div>
    );
  };

  // ── Status Badge ───────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const m: Record<string, any> = { PENDING: { label: 'Pending', icon: ClockIcon, bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' }, IN_WAREHOUSE: { label: 'Stored', icon: CheckCircleIcon, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' }, IN_STORAGE: { label: 'Stored', icon: CheckCircleIcon, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' }, ACTIVE: { label: 'Stored', icon: CheckCircleIcon, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' }, PARTIAL: { label: 'Partial', icon: ExclamationCircleIcon, bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' }, RELEASED: { label: 'Released', icon: TruckIcon, bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' } };
    const s = m[status] || { label: status, icon: CubeIcon, bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' }; const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${s.bg}`}><span className={`w-2 h-2 rounded-full ${s.dot}`} /><Icon className="h-3.5 w-3.5" />{s.label}</span>;
  };

  // ── Health Badge ───────────────────────────
  const HealthBadge = ({ days }: { days: number }) => {
    if (days > 60) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-200 bg-red-50 text-red-600 shadow-sm"><FireIcon className="h-3 w-3" />Critical</span>;
    if (days > 30) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-600 shadow-sm"><ExclamationCircleIcon className="h-3 w-3" />Warning</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm"><CheckCircleIcon className="h-3 w-3" />Good</span>;
  };

  // ── Day Ring ───────────────────────────────
  const DayRing = ({ days, size = 28 }: { days: number; size?: number }) => {
    const r = (size - 8) / 2, circ = 2 * Math.PI * r;
    const pct = Math.min(100, (days / 90) * 100);
    const stroke = days > 60 ? '#ef4444' : days > 30 ? '#f59e0b' : '#10b981';
    return <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} className="transition-all duration-1000 ease-out" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill={days > 60 ? '#ef4444' : days > 30 ? '#d97706' : '#059669'} className="transform rotate-90" transform-origin="center">{days}d</text>
    </svg>;
  };

  const IndeterminateCheckbox = ({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
    return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />;
  };

  // ── Info Chip ──────────────────────────────
  const InfoChip = ({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: string; onClick?: () => void }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-slate-100 shadow-sm ${onClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all' : ''}`} onClick={onClick}>
      <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400"><Icon className="h-3.5 w-3.5" /></div>
      <div><p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{label}</p><p className="text-xs font-bold text-slate-700">{value}</p></div>
    </div>
  );

  // ── Activity Timeline ──────────────────────
  const ActivityTimeline = ({ shipmentId }: { shipmentId: string }) => {
    const items = activityData[shipmentId] || []; const loading = activityLoading === shipmentId;
    if (loading) return <div className="text-xs text-slate-400 py-2 text-center animate-pulse">Loading...</div>;
    if (items.length === 0) return <div className="text-xs text-slate-400 py-2 text-center">No recent activity</div>;
    return <div className="space-y-1.5 py-1">{items.map((item: any, idx: number) => (
      <div key={idx} className="flex items-start gap-2 text-xs"><div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${item.type === 'move' ? 'bg-amber-400' : item.type === 'photo' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
        <div><p className="font-medium text-slate-700">{item.description}</p><p className="text-[10px] text-slate-400">{item.timestamp ? formatDate(item.timestamp) : ''}</p></div>
      </div>
    ))}</div>;
  };

  // ── SHIPMENT CARD ──────────────────────────
  const ShipmentCard = ({ shipment }: { shipment: any }) => {
    const days = getDaysStored(shipment);
    const canRelease = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(shipment.status) && (shipment.currentBoxCount > 0);
    const photos = shipment.shipmentPhotos || [];
    const isReleased = shipment.status === 'RELEASED';
    const hasRack = shipment.rackLocations && shipment.rackLocations !== 'N/A';
    const isPinned = pinnedIds.has(shipment.id);

    const handlePhotoClick = (allPhotos: string[], idx: number) => { setLightboxPhotos(allPhotos); setLightboxIndex(idx); setLightboxOpen(true); };

    // Status-specific top border
    const borderColor = isReleased ? 'border-l-blue-400' : days > 60 ? 'border-l-red-400' : days > 30 ? 'border-l-amber-400' : 'border-l-emerald-400';

    return (
      <div className={`relative bg-white rounded-2xl border border-slate-200 border-l-4 ${borderColor} shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden`}>
        {/* Hover glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-emerald-500/0 group-hover:from-blue-500/[0.04] group-hover:via-blue-500/[0.04] group-hover:to-emerald-500/[0.04] rounded-2xl blur-xl pointer-events-none transition-all duration-500" />

        {/* RELEASED watermark */}
        {isReleased && <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"><div className="transform -rotate-12 opacity-[0.03]"><span className="text-5xl font-black text-blue-600 tracking-[0.2em]">RELEASED</span></div></div>}

        <div className="relative z-10 p-4">
          {/* ── HEADER ROW ── */}
          <div className="flex items-center gap-2 mb-3">
            {viewMode === 'table' && <input type="checkbox" checked={selectedIds.has(shipment.id)} onChange={() => { const n = new Set(selectedIds); n.has(shipment.id) ? n.delete(shipment.id) : n.add(shipment.id); setSelectedIds(n); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0" />}
            {isPinned && <StarIconSolid className="h-4 w-4 text-amber-400 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-800 truncate max-w-[180px]" title={shipment.clientName}>{shipment.clientName}</h3>
                <StatusBadge status={shipment.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-slate-400">{shipment.referenceId}</span>
                <span className="text-slate-200">|</span>
                <DayRing days={days} size={28} />
                <HealthBadge days={days} />
              </div>
            </div>
          </div>

          {/* ── PHOTO GALLERY ── */}
          {photos.length > 0 && (
            <div className="mb-3">
              <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
            </div>
          )}

          {/* ── INFO CHIPS ── */}
          <div className="flex flex-wrap gap-2 mb-3">
            <InfoChip icon={CubeIcon} label="Pieces" value={`${shipment.currentBoxCount} / ${shipment.originalBoxCount}`} />
            <InfoChip icon={ScaleIcon} label="CBM / Wgt" value={`${shipment.cbm ? Number(shipment.cbm).toFixed(2) : '-'} ${shipment.weight ? `· ${shipment.weight}kg` : ''}`} />
            <InfoChip icon={MapPinIcon} label="Location" value={hasRack ? shipment.rackLocations : 'Unassigned'} onClick={hasRack ? () => setRackPopup(shipment) : undefined} />
            <InfoChip icon={CalendarDaysIcon} label="Arrival" value={formatDate(shipment.arrivalDate || shipment.createdAt)} />
            {shipment.companyProfile && <InfoChip icon={BuildingOfficeIcon} label="Company" value={shipment.companyProfile.name} />}
          </div>

          {/* ── NOTES ── */}
          {notesEditing === shipment.id ? (
            <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={2} className="w-full text-xs p-2.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white" placeholder="Add a note..." />
              <div className="flex gap-2 mt-2"><button onClick={() => handleSaveNote(shipment.id)} className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save</button><button onClick={() => setNotesEditing(null)} className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button></div>
            </div>
          ) : shipment.notes ? (
            <div className="mb-3 flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <PencilSquareIcon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 flex-1 leading-relaxed">{shipment.notes}</p>
              <button onClick={() => { setNotesEditing(shipment.id); setNotesText(shipment.notes || ''); }} className="text-blue-600 hover:text-blue-800 text-[10px] font-semibold flex-shrink-0 whitespace-nowrap">Edit</button>
            </div>
          ) : null}

          {/* ── ACTIVITY ── */}
          <button onClick={() => handleLoadActivity(shipment.id)} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors mb-2">
            <ArrowPathIcon className={`h-3 w-3 ${activityOpen === shipment.id ? 'rotate-180' : ''} transition-transform`} />
            {activityOpen === shipment.id ? 'Hide Activity' : 'Activity'}
          </button>
          {activityOpen === shipment.id && <div className="mb-2"><ActivityTimeline shipmentId={shipment.id} /></div>}

          {/* ── DIVIDER ── */}
          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400"><UserIcon className="h-3 w-3" />{shipment.createdBy?.name || 'System'}</div>
              {days > 0 && <div className="text-[10px] text-slate-300">· ₹{(days * storageRate).toLocaleString()}</div>}
            </div>
            <div className="flex items-center gap-0.5">
              <ActionBtn icon={isPinned ? StarIconSolid : StarIcon} color="amber" onClick={() => handleTogglePin(shipment.id)} title={isPinned ? 'Unpin' : 'Pin'} />
              <ActionBtn icon={EyeIcon} color="blue" onClick={() => { setSelectedShipment(shipment); setDetailModalOpen(true); }} title="Details" />
              <ActionBtn icon={QrCodeIcon} color="purple" onClick={() => { setSelectedShipment(shipment); setQrModalOpen(true); }} title="QR" />
              <ActionBtn icon={PencilIcon} color="amber" onClick={() => { setSelectedShipment(shipment); setEditModalOpen(true); }} title="Edit" />
              {canRelease && <ActionBtn icon={ArrowRightOnRectangleIcon} color="emerald" onClick={() => { setSelectedShipment(shipment); setWithdrawalModalOpen(true); }} title="Release" />}
              <ActionBtn icon={DocumentDuplicateIcon} color="indigo" onClick={() => handleDuplicate(shipment.id)} title="Duplicate" />
              <ActionBtn icon={PrinterIcon} color="slate" onClick={() => handlePrintLabel(shipment)} title="Print Label" />
              <ActionBtn icon={PencilSquareIcon} color="blue" onClick={() => { setNotesEditing(shipment.id); setNotesText(shipment.notes || ''); }} title="Add Note" />
              <ActionBtn icon={TrashIcon} color="red" onClick={() => handleDelete(shipment.id)} title="Delete" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ActionBtn = ({ icon: Icon, color, onClick, title }: { icon: any; color: string; onClick: () => void; title: string }) => {
    const colors: Record<string, string> = { blue: 'text-blue-600 hover:bg-blue-50', purple: 'text-purple-600 hover:bg-purple-50', amber: 'text-amber-600 hover:bg-amber-50', emerald: 'text-emerald-600 hover:bg-emerald-50', indigo: 'text-indigo-600 hover:bg-indigo-50', red: 'text-red-400 hover:text-red-600 hover:bg-red-50', slate: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' };
    return <button onClick={onClick} className={`p-1.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-90 ${colors[color]}`} title={title}><Icon className="h-4 w-4" /></button>;
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
      <div className="flex gap-3 mb-3"><div className="w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-2/3" /><div className="h-3 bg-slate-100 rounded w-1/3" /></div></div>
      <div className="flex gap-2 mb-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-slate-50 rounded-xl flex-1" />)}</div>
      <div className="h-8 bg-slate-50 rounded-xl w-1/3" />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="flex items-center justify-between mb-6"><div className="h-8 bg-slate-100 rounded-xl w-48 animate-pulse" /><div className="h-10 bg-slate-100 rounded-xl w-32 animate-pulse" /></div>
        <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-blob bg-gradient-to-r ${accentColor}`} />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000 bg-gradient-to-r from-amber-500 to-pink-500" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
          <div className={`flex items-center justify-between mb-3 transition-all duration-700 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${accentColor} shadow-lg shadow-blue-200/30 ring-1 ring-white/20`}><InboxArrowDownIcon className="h-5 md:h-6 w-5 md:w-6 text-white" /></div>
              <div><h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Shipments</h1><p className="text-xs md:text-sm text-slate-400">Manage intake, storage, and release</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 rounded-xl border shadow-sm bg-white border-slate-200">
                <button onClick={() => setViewMode('folders')} className={`p-2 rounded-lg transition-all ${viewMode === 'folders' ? `${accentBg} text-white shadow-md` : 'text-slate-400 hover:text-slate-600'}`} title="Folders"><FolderIcon className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? `${accentBg} text-white shadow-md` : 'text-slate-400 hover:text-slate-600'}`} title="Table"><TableCellsIcon className="h-4 w-4" /></button>
              </div>
              <ShipmentsPrintReport shipments={shipments} searchTerm={searchTerm} activeTab={activeStatus} warehouseFilter="all" />
              <button onClick={() => setCreateModalOpen(true)} className={`flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r ${accentColor} text-white text-xs md:text-sm font-bold rounded-xl hover:shadow-lg active:scale-95 transition-all shadow-md`}><PlusIcon className="h-4 md:h-5 w-4 md:w-5" /><span className="hidden sm:inline">New</span></button>
            </div>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 transition-all duration-700 delay-100 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {getStats().map(stat => { const Icon = stat.icon; return (
              <div key={stat.label} className="rounded-2xl border p-3 md:p-4 shadow-sm hover:shadow-lg transition-all bg-white/70 border-slate-100 hover:bg-white/90">
                <div className="flex items-center justify-between">
                  <div><p className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p><p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5"><AnimatedCounter value={stat.value} /></p></div>
                  <div className={`p-2 md:p-2.5 rounded-2xl bg-gradient-to-br ${stat.color} text-white ring-2 ${stat.ring} shadow-md`}><Icon className="h-4 md:h-5 w-4 md:w-5" /></div>
                </div>
              </div>
            );})}
          </div>

          <div className={`transition-all duration-700 delay-200 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-[180px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm placeholder:text-slate-400" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2"><XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
              </div>
              <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-2xl border transition-all shadow-sm ${filtersOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <AdjustmentsHorizontalIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">Filters</span>
              </button>
              <div className="relative" ref={filterRef}>
                <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-2xl border transition-all shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                  <ArrowsUpDownIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">Sort</span>
                </button>
                {filterOpen && <div className="absolute right-0 mt-1 w-44 rounded-2xl border shadow-xl z-30 backdrop-blur-xl overflow-hidden bg-white/95 border-slate-200">
                  {[{ v: 'date_desc', l: '📅 Newest' }, { v: 'date_asc', l: '📅 Oldest' }, { v: 'name_asc', l: '🔤 A-Z' }, { v: 'name_desc', l: '🔤 Z-A' }, { v: 'duration_desc', l: '⏱️ Longest' }, { v: 'duration_asc', l: '⏱️ Shortest' }, { v: 'cbm_desc', l: '📦 CBM ↓' }, { v: 'cbm_asc', l: '📦 CBM ↑' }].map(opt => (
                    <button key={opt.v} onClick={() => { setSortBy(opt.v); setFilterOpen(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${sortBy === opt.v ? `${accentBg} text-white` : 'text-slate-600 hover:bg-slate-50'}`}>{opt.l}</button>
                  ))}
                </div>}
              </div>
              <div className="relative" ref={colPickerRef}>
                <button onClick={() => setColumnPickerOpen(!columnPickerOpen)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-2xl border transition-all shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                  <TableCellsIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">Fields</span>
                </button>
                {columnPickerOpen && <div className="absolute right-0 mt-1 w-48 rounded-2xl border shadow-xl z-30 backdrop-blur-xl overflow-hidden bg-white/95 border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Visible Fields</p>
                  <div className="space-y-1.5">{allFieldOptions.map(f => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={columnFields.includes(f.key)} onChange={() => setColumnFields(prev => prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key])} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><f.icon className="h-3.5 w-3.5 text-slate-400" /><span className="text-xs text-slate-700">{f.label}</span></label>
                  ))}</div>
                </div>}
              </div>
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-2xl border transition-all shadow-sm bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <DocumentTextIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">CSV</span>
              </button>
            </div>

            {filtersOpen && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 mb-3 shadow-sm animate-slideDown">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div><label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">From</label><input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" /></div>
                  <div><label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">To</label><input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" /></div>
                  <div><label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Zone</label><input type="text" placeholder="e.g. A" value={filterZone} onChange={e => setFilterZone(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" /></div>
                  <div><label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Company</label><input type="text" placeholder="Name" value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" /></div>
                  <div><label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Days: {filterDaysMin}–{filterDaysMax === 999 ? '∞' : filterDaysMax}</label><input type="range" min={0} max={180} value={filterDaysMin} onChange={e => setFilterDaysMin(Number(e.target.value))} className="w-full accent-blue-500" /><input type="range" min={0} max={180} value={filterDaysMax === 999 ? 180 : filterDaysMax} onChange={e => setFilterDaysMax(e.target.value === '180' ? 999 : Number(e.target.value))} className="w-full accent-blue-500" /></div>
                </div>
                <div className="flex gap-2 mt-3"><button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterZone(''); setFilterCompany(''); setFilterDaysMin(0); setFilterDaysMax(999); }} className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Clear</button><div className="flex items-center gap-1 ml-auto"><label className="text-[10px] text-slate-500 uppercase tracking-wider">Rate ₹/day:</label><input type="number" value={storageRate} onChange={e => setStorageRate(Math.max(1, Number(e.target.value)))} className="w-16 px-2 py-1 text-xs rounded-xl border border-slate-200 bg-white text-center" /></div></div>
              </div>
            )}

            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {tabs.map(tab => { const Icon = tab.icon; const isActive = activeStatus === tab.key; return (
                <button key={tab.key} onClick={() => { setActiveStatus(tab.key); setSelectedIds(new Set()); }} className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-all whitespace-nowrap rounded-xl ${isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />{tab.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><AnimatedCounter value={tab.count} /></span>
                  {isActive && <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${accentBg}`} />}
                </button>
              );})}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-6 pb-24 md:pb-10">
        {error && <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2 animate-fadeIn shadow-sm"><ShieldExclamationIcon className="h-5 w-5 flex-shrink-0" /><span className="text-sm">{error}</span><button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg"><XMarkIcon className="h-4 w-4" /></button></div>}

        {!loading && shipments.length === 0 && (
          <div className="text-center py-16 animate-fadeIn">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-inner bg-gradient-to-br ${accentColor}`}><CubeIcon className="h-10 w-10 text-white/60" /></div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No shipments found</h3>
            <p className="text-sm text-slate-400 mb-6">Try adjusting your search or filters</p>
            <button onClick={() => setCreateModalOpen(true)} className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${accentColor} text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all shadow-md active:scale-95`}><PlusIcon className="h-4 w-4" />Create Shipment</button>
          </div>
        )}

        {viewMode === 'folders' && shipments.length > 0 && (
          <div className="space-y-3 animate-fadeIn">
            {sortedFolderNames.map((company, fidx) => {
              const items = groupedByCompany[company]; const isOpen = expandedFolders.has(company);
              const activeCount = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length;
              const pendingCount = items.filter((s: any) => s.status === 'PENDING').length;
              const totalBoxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);
              const isUnassigned = company === 'Unassigned';
              return (
                <div key={company} className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${isOpen ? 'shadow-lg' : 'hover:shadow-md'} bg-white border-slate-200`} style={{ animationDelay: `${fidx * 80}ms`, animationFillMode: 'both' }}>
                  <button onClick={() => toggleFolder(company)} className={`w-full flex items-center justify-between transition-all group py-3 px-4 md:px-5 ${isOpen ? 'bg-gradient-to-r from-slate-50 via-white to-slate-50' : 'hover:bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${isUnassigned ? 'bg-slate-100 text-slate-500' : isOpen ? `bg-gradient-to-br ${accentColor} text-white` : 'bg-blue-50 text-blue-600'}`}>
                        {isOpen ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${isUnassigned ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'}`}>{isUnassigned ? '?' : company.charAt(0)}</div>
                        <div className="text-left min-w-0">
                          <h3 className={`text-sm font-bold truncate ${isUnassigned ? 'text-slate-500' : 'text-slate-800'}`}>{isUnassigned ? '🚫 Unassigned' : company}</h3>
                          <p className="text-[11px] text-slate-400">{items.length} shipment{items.length !== 1 ? 's' : ''} · {totalBoxes} piece{totalBoxes !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeCount > 0 && !isUnassigned && <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200"><CheckCircleIcon className="h-3 w-3" />{activeCount}</span>}
                      {pendingCount > 0 && <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200"><ClockIcon className="h-3 w-3" />{pendingCount}</span>}
                      <span className={`flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold ${isUnassigned ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>{items.length}</span>
                    </div>
                  </button>
                  {isOpen && <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-2 md:p-3 space-y-2 animate-slideDown">{items.map((shipment: any) => <ShipmentCard key={shipment.id} shipment={shipment} />)}</div>}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'table' && shipments.length > 0 && (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm bg-white/70 border-slate-100">
              <IndeterminateCheckbox checked={selectedIds.size === shipments.length} indeterminate={selectedIds.size > 0 && selectedIds.size < shipments.length}
                onChange={() => selectedIds.size === shipments.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(shipments.map(s => s.id)))} />
              <span className="text-xs font-medium text-slate-500">Select All</span>
              {selectedIds.size > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{selectedIds.size} selected</span>}
            </div>
            <div className="space-y-2">{paginatedShipments.map(shipment => <ShipmentCard key={shipment.id} shipment={shipment} />)}</div>
            {hasMore && <div className="text-center py-4"><button onClick={() => setPage(p => p + 1)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm">Show More ({shipments.length - paginatedShipments.length})</button></div>}
          </div>
        )}
      </div>

      <button onClick={() => setCreateModalOpen(true)} className={`md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 active:scale-90 transition-all shadow-xl bg-gradient-to-r ${accentColor} text-white shadow-lg`}><PlusIcon className="h-6 w-6" /></button>

      <WHMShipmentModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={loadShipments} />
      <EditShipmentModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} shipment={selectedShipment} onSuccess={loadShipments} />
      <ShipmentDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} shipmentId={selectedShipment?.id || ''} />
      <WithdrawalModal isOpen={withdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} shipment={selectedShipment} onSuccess={loadShipments} />
      <BoxQRModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} shipmentId={selectedShipment?.id || ''} shipmentRef={selectedShipment?.referenceId || ''} />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-40 px-4 py-3 flex items-center justify-between animate-slideUp shadow-2xl">
          <span className="text-sm font-bold text-slate-700"><span className="text-blue-600">{selectedIds.size}</span> selected</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl">Clear</button>
            <button onClick={handleBatchRelease} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-lg transition-all active:scale-95"><ArrowRightOnRectangleIcon className="h-4 w-4" />Release</button>
          </div>
        </div>
      )}

      {rackPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn" onClick={() => setRackPopup(null)}>
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full mx-auto animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3"><div className={`p-2.5 rounded-2xl shadow-lg bg-gradient-to-br ${accentColor} ring-1 ring-white/20`}><MapPinIcon className="h-5 w-5 text-white" /></div><h3 className="font-bold text-lg text-slate-800">Rack Location</h3></div>
              <button onClick={() => setRackPopup(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl p-3.5 border bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-100"><p className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold mb-0.5">Code</p><p className="text-base font-bold text-blue-800">{rackPopup.rackLocations || 'N/A'}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 border bg-slate-50 border-slate-100"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Zone</p><p className="text-sm font-semibold text-slate-700 mt-0.5">{rackPopup.zone || '—'}</p></div>
                <div className="rounded-xl p-3 border bg-slate-50 border-slate-100"><p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Boxes</p><p className="text-sm font-semibold text-slate-700 mt-0.5">{rackPopup.currentBoxCount || 0} / {rackPopup.originalBoxCount || 0}</p></div>
              </div>
              {rackPopup.rackLocations && <a href={`/racks?highlight=${rackPopup.boxes?.find((b: any) => b.rackId)?.rackId || ''}`} className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 font-semibold rounded-xl bg-gradient-to-r ${accentColor} text-white shadow-md hover:shadow-lg transition-all text-sm`}><SquaresPlusIcon className="h-4 w-4" />View in Racks →</a>}
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && lightboxPhotos.length > 0 && (
        <PhotoLightbox photos={lightboxPhotos.map(p => getBackendPhoto(p))} currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)} onIndexChange={(idx) => setLightboxIndex(idx)} />
      )}
    </div>
  );
};

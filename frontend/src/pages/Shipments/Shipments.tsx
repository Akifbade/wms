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

const formatDate = (ds: string) => !ds ? 'N/A' : new Date(ds).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const getDays = (s: any) => { const src = s?.arrivalDate || s?.receivedDate || s?.createdAt; if (!src) return 0; return Math.max(0, Math.ceil((Date.now() - new Date(src).getTime()) / 86400000)); };
const gbp = (p: string) => p.startsWith('http') ? p : `${getBackendUrl()}${p}`;
const af = async (url: string, opts: RequestInit = {}) => { const t = localStorage.getItem('authToken'); return fetch(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } }); };

export const Shipments: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [view, setView] = useState<'folders' | 'table'>('folders');
  const [sort, setSort] = useState('date_desc');
  const [shipments, setShipments] = useState<any[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, in_storage: 0, partial: 0, released: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [pinned, setPinned] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('wms-pinned') || '[]')); } catch { return new Set(); } });
  const [fields, setFields] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('wms-columns') || '["pieces","cbm","location","arrival"]'); } catch { return ['pieces', 'cbm', 'location', 'arrival']; } });
  const [fOpen, setFOpen] = useState(false);
  const [fdFrom, setFdFrom] = useState(''); const [fdTo, setFdTo] = useState('');
  const [fZone, setFZone] = useState(''); const [fCo, setFCo] = useState('');
  const [fDMin, setFDMin] = useState(0); const [fDMax, setFDMax] = useState(999);
  const [wModal, setWModal] = useState(false);
  const [selS, setSelS] = useState<any>(null);
  const [cModal, setCModal] = useState(false);
  const [eModal, setEModal] = useState(false);
  const [dModal, setDModal] = useState(false);
  const [qModal, setQModal] = useState(false);
  const [expFolders, setExpFolders] = useState<Set<string>>(new Set());
  const [lbOpen, setLbOpen] = useState(false);
  const [lbPhotos, setLbPhotos] = useState<string[]>([]);
  const [lbIdx, setLbIdx] = useState(0);
  const [rPopup, setRPopup] = useState<any>(null);
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [dSearch, setDSearch] = useState('');
  const [nEdit, setNEdit] = useState<string | null>(null);
  const [nText, setNText] = useState('');
  const [aOpen, setAOpen] = useState<string | null>(null);
  const [aData, setAData] = useState<Record<string, any[]>>({});
  const [aLoad, setALoad] = useState<string | null>(null);
  const [cpOpen, setCpOpen] = useState(false);
  const cpRef = useRef<HTMLDivElement>(null);
  const [sOpen, setSOpen] = useState(false);
  const sRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const PS = 50;

  useEffect(() => { localStorage.setItem('wms-pinned', JSON.stringify([...pinned])); }, [pinned]);
  useEffect(() => { localStorage.setItem('wms-columns', JSON.stringify(fields)); }, [fields]);
  useEffect(() => { const t = setTimeout(() => setDSearch(search), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { loadShipments(); }, [status, dSearch, sort, fdFrom, fdTo, fZone, fCo, fDMin, fDMax]);
  useEffect(() => { const h = (e: MouseEvent) => { if (cpRef.current && !cpRef.current.contains(e.target as Node)) setCpOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { const h = (e: MouseEvent) => { if (sRef.current && !sRef.current.contains(e.target as Node)) setSOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const d: any = await shipmentsAPI.getAll({ limit: 2000 });
      const a = d.shipments || [];
      const c = { all: a.length, pending: a.filter((s: any) => s.status === 'PENDING').length, in_storage: a.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length, partial: a.filter((s: any) => s.status === 'PARTIAL').length, released: a.filter((s: any) => s.status === 'RELEASED').length };
      setCounts(c);
      let f = a;
      if (status !== 'all') { const m: Record<string, string[]> = { pending: ['PENDING'], in_storage: ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'], partial: ['PARTIAL'], released: ['RELEASED'] }; f = a.filter((s: any) => m[status]?.includes(s.status)); }
      if (dSearch.trim()) { const q = dSearch.toLowerCase(); f = f.filter((s: any) => s.clientName?.toLowerCase().includes(q) || s.referenceId?.toLowerCase().includes(q) || s.clientPhone?.toLowerCase().includes(q) || s.companyProfile?.name?.toLowerCase().includes(q) || s.rackLocation?.toLowerCase().includes(q)); }
      if (fdFrom) f = f.filter((s: any) => new Date(s.arrivalDate || s.createdAt) >= new Date(fdFrom));
      if (fdTo) f = f.filter((s: any) => new Date(s.arrivalDate || s.createdAt) <= new Date(fdTo + 'T23:59:59'));
      if (fZone) f = f.filter((s: any) => s.zone?.toLowerCase().includes(fZone.toLowerCase()));
      if (fCo) f = f.filter((s: any) => s.companyProfile?.name?.toLowerCase().includes(fCo.toLowerCase()));
      f = f.filter((s: any) => { const d = getDays(s); return d >= fDMin && d <= fDMax; });
      const p = f.filter((s: any) => pinned.has(s.id)), u = f.filter((s: any) => !pinned.has(s.id));
      const sorted = [...p, ...u].sort((a: any, b: any) => {
        const gc = (s: any) => new Date(s.createdAt || 0).getTime(), gd = (s: any) => getDays(s);
        switch (sort) { case 'date_desc': return gc(b) - gc(a); case 'date_asc': return gc(a) - gc(b); case 'name_asc': return (a.clientName || '').localeCompare(b.clientName || ''); case 'name_desc': return (b.clientName || '').localeCompare(a.clientName || ''); case 'cbm_desc': return (Number(b.cbm) || 0) - (Number(a.cbm) || 0); case 'cbm_asc': return (Number(a.cbm) || 0) - (Number(b.cbm) || 0); case 'duration_desc': return gd(b) - gd(a); case 'duration_asc': return gd(a) - gd(b); case 'pieces_desc': return (b.currentBoxCount || 0) - (a.currentBoxCount || 0); case 'pieces_asc': return (a.currentBoxCount || 0) - (b.currentBoxCount || 0); default: return gc(b) - gc(a); }
      });
      setShipments(sorted); setPage(1);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; try { await shipmentsAPI.delete(id); loadShipments(); } catch (e: any) { alert(e.message); } };
  const handleDup = async (id: string) => { try { const r = await af(`/api/shipments/${id}/duplicate`, { method: 'POST' }); const d = await r.json(); if (d.success) loadShipments(); else alert(d.message || 'Failed'); } catch (e: any) { alert(e.message); } };
  const handlePin = async (id: string) => { const n = new Set(pinned); n.has(id) ? n.delete(id) : n.add(id); setPinned(n); try { await af(`/api/shipments/${id}/pin`, { method: 'PUT' }); } catch {} };
  const handleNote = async (id: string) => { try { await af(`/api/shipments/${id}/notes`, { method: 'PUT', body: JSON.stringify({ notes: nText }) }); setNEdit(null); loadShipments(); } catch (e: any) { alert(e.message); } };
  const handleBatch = async () => { if (!confirm(`Release ${selIds.size}?`)) return; try { const r = await af('/api/shipments/batch/release', { method: 'POST', body: JSON.stringify({ ids: [...selIds] }) }); const d = await r.json(); if (d.success) { setSelIds(new Set()); loadShipments(); } else alert(d.message || 'Failed'); } catch (e: any) { alert(e.message); } };
  const handleAct = async (id: string) => { if (aOpen === id) { setAOpen(null); return; } setAOpen(id); if (aData[id]) return; setALoad(id); try { const r = await af(`/api/shipments/${id}/activity`); const d = await r.json(); if (d.success) setAData(prev => ({ ...prev, [id]: d.activity || [] })); } catch {} finally { setALoad(null); } };
  const handleCSV = () => {
    const h = ['Reference ID', 'Client Name', 'Company', 'Status', 'Boxes', 'CBM', 'Weight', 'Location', 'Arrival Date', 'Days', 'Created By'];
    const rows = shipments.map((s: any) => [s.referenceId, s.clientName, s.companyProfile?.name || '', s.status, `${s.currentBoxCount}/${s.originalBoxCount}`, s.cbm ? Number(s.cbm).toFixed(2) : '', s.weight || '', s.rackLocations || '', formatDate(s.arrivalDate || s.createdAt), getDays(s), s.createdBy?.name || 'System']);
    const csv = [h.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `shipments_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(u);
  };
  const handlePrint = (s: any) => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<html><body style="font-family:sans-serif;padding:20px"><h1>📦 SHIPMENT LABEL</h1><p><b>Ref:</b> ${s.referenceId}</p><p><b>Client:</b> ${s.clientName || 'N/A'}</p><p><b>Boxes:</b> ${s.currentBoxCount || 0} / ${s.originalBoxCount || 0}</p><p><b>Location:</b> ${s.rackLocations || 'Unassigned'}</p><p><b>Arrival:</b> ${formatDate(s.arrivalDate)}</p><script>window.print();window.close();</script></body></html>`); w.document.close(); };

  const TP = Math.ceil(shipments.length / PS);
  const pageS = shipments.slice(0, page * PS);
  const hasMore = page < TP;

  const tabs = [
    { k: 'all', l: 'All', c: counts.all, i: CubeIcon }, { k: 'pending', l: 'Pending', c: counts.pending, i: ClockIcon },
    { k: 'in_storage', l: 'Stored', c: counts.in_storage, i: CheckCircleIcon }, { k: 'partial', l: 'Partial', c: counts.partial, i: ExclamationCircleIcon },
    { k: 'released', l: 'Released', c: counts.released, i: TruckIcon },
  ];
  const fieldOpts = [
    { k: 'pieces', l: 'Pieces', i: CubeIcon }, { k: 'cbm', l: 'CBM / Weight', i: ScaleIcon }, { k: 'location', l: 'Location', i: MapPinIcon },
    { k: 'arrival', l: 'Arrival Date', i: CalendarDaysIcon }, { k: 'createdBy', l: 'Created By', i: UserIcon }, { k: 'company', l: 'Company', i: BuildingOfficeIcon }, { k: 'duration', l: 'Duration', i: ClockIcon },
  ];

  const grouped = useMemo(() => {
    const s = [...shipments].sort((a, b) => new Date(b.arrivalDate || b.createdAt || 0).getTime() - new Date(a.arrivalDate || a.createdAt || 0).getTime());
    return s.reduce((acc: any, s: any) => { const c = s.companyProfile?.name || 'Unassigned'; if (!acc[c]) acc[c] = []; acc[c].push(s); return acc; }, {} as Record<string, any[]>);
  }, [shipments]);
  const folderNames = Object.keys(grouped).sort((a, b) => Math.max(...grouped[b].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime())) - Math.max(...grouped[a].map((s: any) => new Date(s.arrivalDate || s.createdAt || 0).getTime())));
  const toggleF = (name: string) => { const n = new Set(expFolders); n.has(name) ? n.delete(name) : n.add(name); setExpFolders(n); };

  // ── Photo Grid ────────────────────────────
  const PhotoGrid = ({ photos, onClick }: { photos: string[]; onClick: (ps: string[], i: number) => void }) => {
    if (!photos || photos.length === 0) return null;
    const c = photos.length;
    const img = (p: string, i: number, cls = '') => (
      <button key={i} onClick={() => onClick(photos, i)} className={`relative group overflow-hidden ${cls}`}>
        <img src={gbp(p)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center"><CameraIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded text-xs font-medium">{i + 1}/{c}</span>
      </button>
    );
    if (c === 1) return <div className="grid grid-cols-1 gap-2">{img(photos[0], 0, 'aspect-video rounded-xl border border-slate-200')}</div>;
    if (c === 2) return <div className="grid grid-cols-2 gap-2">{photos.map((p, i) => img(p, i, 'aspect-square rounded-xl border border-slate-200'))}</div>;
    return <div className="grid grid-cols-2 gap-2">{photos.slice(0, 4).map((p, i) => {
      const last = i === 3 && c > 4;
      return <div key={i} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden">
        <img src={gbp(p)} alt="" className={`w-full h-full object-cover ${last ? 'opacity-40' : ''}`} />
        <button onClick={() => onClick(photos, i)} className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center"><CameraIcon className="h-5 w-5 text-white opacity-0 hover:opacity-100 transition-opacity" /></button>
        {last && <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-lg font-bold drop-shadow">+{c - 4}</span></div>}
        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">{i + 1}/{c}</span>
      </div>;
    })}</div>;
  };

  // ── Status Badge ──────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const m: Record<string, any> = { PENDING: { l: 'Pending', i: ClockIcon, c: 'text-amber-700 bg-amber-50' }, IN_WAREHOUSE: { l: 'Stored', i: CheckCircleIcon, c: 'text-emerald-700 bg-emerald-50' }, IN_STORAGE: { l: 'Stored', i: CheckCircleIcon, c: 'text-emerald-700 bg-emerald-50' }, ACTIVE: { l: 'Stored', i: CheckCircleIcon, c: 'text-emerald-700 bg-emerald-50' }, PARTIAL: { l: 'Partial', i: ExclamationCircleIcon, c: 'text-orange-700 bg-orange-50' }, RELEASED: { l: 'Released', i: TruckIcon, c: 'text-blue-700 bg-blue-50' } };
    const s = m[status] || { l: status, i: CubeIcon, c: 'text-slate-700 bg-slate-50' }; const Icon = s.i;
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.c}`}><Icon className="h-3.5 w-3.5" />{s.l}</span>;
  };

  const Ind = ({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
    return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />;
  };

  const ABtn = ({ icon: Icon, color, onClick, title }: { icon: any; color: string; onClick: () => void; title: string }) => {
    const cs: Record<string, string> = { blue: 'hover:bg-blue-50 text-blue-600', purple: 'hover:bg-purple-50 text-purple-600', amber: 'hover:bg-amber-50 text-amber-600', emerald: 'hover:bg-emerald-50 text-emerald-600', indigo: 'hover:bg-indigo-50 text-indigo-600', red: 'hover:bg-red-50 text-red-400 hover:text-red-600', slate: 'hover:bg-slate-100 text-slate-500' };
    return <button onClick={onClick} className={`p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 ${cs[color]}`} title={title}><Icon className="h-4 w-4" /></button>;
  };

  // ── Activity ──────────────────────────────
  const ActTimeline = ({ id }: { id: string }) => {
    const items = aData[id] || []; const loading = aLoad === id;
    if (loading) return <div className="text-xs text-slate-400 py-2 animate-pulse">Loading...</div>;
    if (!items.length) return <div className="text-xs text-slate-400 py-2">No recent activity</div>;
    return <div className="space-y-1.5 py-1">{items.map((item: any, i: number) => (
      <div key={i} className="flex items-start gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${item.type === 'move' ? 'bg-amber-400' : item.type === 'photo' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
        <div><p className="text-slate-700 font-medium">{item.description}</p><p className="text-slate-400 text-[10px]">{item.timestamp ? formatDate(item.timestamp) : ''}</p></div>
      </div>
    ))}</div>;
  };

  // ── CARD ──────────────────────────────────
  const Card = ({ s }: { s: any }) => {
    const days = getDays(s);
    const canRel = ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE', 'PARTIAL'].includes(s.status) && (s.currentBoxCount > 0);
    const photos = s.shipmentPhotos || [];
    const isRel = s.status === 'RELEASED';
    const hasRack = s.rackLocations && s.rackLocations !== 'N/A';
    const isPin = pinned.has(s.id);

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {view === 'table' && <input type="checkbox" checked={selIds.has(s.id)} onChange={() => { const n = new Set(selIds); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSelIds(n); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isPin && <StarIconSolid className="h-4 w-4 text-amber-400" />}
                <h3 className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">{s.clientName}</h3>
                <StatusBadge status={s.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="font-mono">{s.referenceId}</span>
                <span>·</span>
                <span>{days}d</span>
                {days > 60 && <FireIcon className="h-3 w-3 text-red-400" />}
                {s.companyProfile && <><span>·</span><span>{s.companyProfile.name}</span></>}
              </div>
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && <div className="mb-3"><PhotoGrid photos={photos} onClick={(ps, i) => { setLbPhotos(ps); setLbIdx(i); setLbOpen(true); }} /></div>}

          {/* Info row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs text-slate-600"><CubeIcon className="h-3.5 w-3.5 text-slate-400" />{s.currentBoxCount}/{s.originalBoxCount}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs text-slate-600"><ScaleIcon className="h-3.5 w-3.5 text-slate-400" />{s.cbm ? Number(s.cbm).toFixed(2) : '-'}{s.weight ? ` · ${s.weight}kg` : ''}</span>
            {hasRack ? <button onClick={() => setRPopup(s)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 rounded-lg text-xs text-blue-600 hover:bg-blue-100 transition-colors"><MapPinIcon className="h-3.5 w-3.5" />{s.rackLocations}</button>
              : <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs text-slate-400"><MapPinIcon className="h-3.5 w-3.5" />—</span>}
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs text-slate-600"><CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />{formatDate(s.arrivalDate || s.createdAt)}</span>
          </div>

          {/* Notes */}
          {nEdit === s.id ? (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <textarea value={nText} onChange={e => setNText(e.target.value)} rows={2} className="w-full text-xs p-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white" placeholder="Add a note..." />
              <div className="flex gap-2 mt-1.5"><button onClick={() => handleNote(s.id)} className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button><button onClick={() => setNEdit(null)} className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button></div>
            </div>
          ) : s.notes ? (
            <div className="mb-3 flex items-start gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
              <PencilSquareIcon className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 flex-1">{s.notes}</p>
              <button onClick={() => { setNEdit(s.id); setNText(s.notes || ''); }} className="text-blue-600 text-xs font-medium flex-shrink-0">Edit</button>
            </div>
          ) : null}

          {/* Activity toggle */}
          <button onClick={() => handleAct(s.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2">
            <ArrowPathIcon className={`h-3 w-3 ${aOpen === s.id ? 'rotate-180' : ''} transition-transform`} />{aOpen === s.id ? 'Hide' : 'Show'} Activity
          </button>
          {aOpen === s.id && <div className="mb-2"><ActTimeline id={s.id} /></div>}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">{s.createdBy?.name || 'System'}</span>
            <div className="flex items-center gap-0.5">
              <ABtn icon={isPin ? StarIconSolid : StarIcon} color="amber" onClick={() => handlePin(s.id)} title={isPin ? 'Unpin' : 'Pin'} />
              <ABtn icon={EyeIcon} color="blue" onClick={() => { setSelS(s); setDModal(true); }} title="Details" />
              <ABtn icon={QrCodeIcon} color="purple" onClick={() => { setSelS(s); setQModal(true); }} title="QR" />
              <ABtn icon={PencilIcon} color="blue" onClick={() => { setSelS(s); setEModal(true); }} title="Edit" />
              {canRel && <ABtn icon={ArrowRightOnRectangleIcon} color="emerald" onClick={() => { setSelS(s); setWModal(true); }} title="Release" />}
              <ABtn icon={DocumentDuplicateIcon} color="indigo" onClick={() => handleDup(s.id)} title="Duplicate" />
              <ABtn icon={PrinterIcon} color="slate" onClick={() => handlePrint(s)} title="Print Label" />
              <ABtn icon={PencilSquareIcon} color="blue" onClick={() => { setNEdit(s.id); setNText(s.notes || ''); }} title="Note" />
              <ABtn icon={TrashIcon} color="red" onClick={() => handleDelete(s.id)} title="Delete" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Skel = () => (
    <div className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
      <div className="flex gap-3 mb-3"><div className="w-10 h-10 bg-slate-100 rounded-lg flex-shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-2/3" /><div className="h-3 bg-slate-100 rounded w-1/3" /></div></div>
      <div className="flex gap-2 mb-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg flex-1" />)}</div>
      <div className="h-6 bg-slate-50 rounded-lg w-1/3" />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex items-center justify-between mb-6"><div className="h-8 bg-slate-100 rounded-lg w-40 animate-pulse" /><div className="h-9 bg-slate-100 rounded-lg w-28 animate-pulse" /></div>
        <div className="space-y-3">{[1, 2, 3].map(i => <Skel key={i} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Shipments</h1>
              <p className="text-sm text-slate-400">Manage intake, storage, and release</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setView('folders')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'folders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FolderIcon className="h-4 w-4 inline mr-1" />Folders</button>
                <button onClick={() => setView('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TableCellsIcon className="h-4 w-4 inline mr-1" />Table</button>
              </div>
              <ShipmentsPrintReport shipments={shipments} searchTerm={search} activeTab={status} warehouseFilter="all" />
              <button onClick={() => setCModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><PlusIcon className="h-4 w-4" />New</button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { l: 'Total', v: counts.all, i: CubeIcon }, { l: 'In Storage', v: counts.in_storage, i: CheckCircleIcon },
              { l: 'Pending', v: counts.pending, i: ClockIcon }, { l: 'Released', v: counts.released, i: TruckIcon },
            ].map(stat => {
              const Icon = stat.i;
              return (
                <div key={stat.l} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-slate-400 font-medium">{stat.l}</p><p className="text-xl font-bold text-slate-800">{stat.v}</p></div>
                    <Icon className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search + Toolbar */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
            </div>
            <button onClick={() => setFOpen(!fOpen)} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${fOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <AdjustmentsHorizontalIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">Filters</span>
            </button>
            <div className="relative" ref={sRef}>
              <button onClick={() => setSOpen(!sOpen)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <ArrowsUpDownIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">Sort</span>
              </button>
              {sOpen && <div className="absolute right-0 mt-1 w-40 rounded-lg border shadow-lg z-30 bg-white border-slate-200 overflow-hidden">
                {[{ v: 'date_desc', l: '📅 Newest' }, { v: 'date_asc', l: '📅 Oldest' }, { v: 'name_asc', l: '🔤 A-Z' }, { v: 'name_desc', l: '🔤 Z-A' }, { v: 'duration_desc', l: '⏱️ Longest' }, { v: 'duration_asc', l: '⏱️ Shortest' }].map(opt => (
                  <button key={opt.v} onClick={() => { setSort(opt.v); setSOpen(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${sort === opt.v ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>{opt.l}</button>
                ))}
              </div>}
            </div>
            <div className="relative" ref={cpRef}>
              <button onClick={() => setCpOpen(!cpOpen)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <TableCellsIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">Fields</span>
              </button>
              {cpOpen && <div className="absolute right-0 mt-1 w-44 rounded-lg border shadow-lg z-30 bg-white border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Visible Fields</p>
                <div className="space-y-1.5">{fieldOpts.map(f => (
                  <label key={f.k} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={fields.includes(f.k)} onChange={() => setFields(prev => prev.includes(f.k) ? prev.filter(k => k !== f.k) : [...prev, f.k])} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><f.i className="h-3.5 w-3.5 text-slate-400" /><span className="text-xs text-slate-700">{f.l}</span></label>
                ))}</div>
              </div>}
            </div>
            <button onClick={handleCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
              <DocumentTextIcon className="h-4 w-4" /><span className="hidden sm:inline text-xs">CSV</span>
            </button>
          </div>

          {/* Filters */}
          {fOpen && <div className="bg-white rounded-lg border border-slate-200 p-4 mb-3 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><label className="text-xs text-slate-500 font-medium block mb-1">From</label><input type="date" value={fdFrom} onChange={e => setFdFrom(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50" /></div>
              <div><label className="text-xs text-slate-500 font-medium block mb-1">To</label><input type="date" value={fdTo} onChange={e => setFdTo(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50" /></div>
              <div><label className="text-xs text-slate-500 font-medium block mb-1">Zone</label><input type="text" placeholder="e.g. A" value={fZone} onChange={e => setFZone(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50" /></div>
              <div><label className="text-xs text-slate-500 font-medium block mb-1">Company</label><input type="text" placeholder="Name" value={fCo} onChange={e => setFCo(e.target.value)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50" /></div>
              <div><label className="text-xs text-slate-500 font-medium block mb-1">Days: {fDMin}–{fDMax === 999 ? '∞' : fDMax}</label><input type="range" min={0} max={180} value={fDMin} onChange={e => setFDMin(Number(e.target.value))} className="w-full accent-blue-500" /><input type="range" min={0} max={180} value={fDMax === 999 ? 180 : fDMax} onChange={e => setFDMax(e.target.value === '180' ? 999 : Number(e.target.value))} className="w-full accent-blue-500" /></div>
            </div>
            <button onClick={() => { setFdFrom(''); setFdTo(''); setFZone(''); setFCo(''); setFDMin(0); setFDMax(999); }} className="mt-2 text-xs text-slate-500 hover:text-slate-700 font-medium">Clear filters</button>
          </div>}

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-100">
            {tabs.map(tab => {
              const Icon = tab.i; const active = status === tab.k;
              return (
                <button key={tab.k} onClick={() => { setStatus(tab.k); setSelIds(new Set()); }}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${active ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Icon className="h-4 w-4" />{tab.l}<span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{tab.c}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 pb-24">
        {err && <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2"><ShieldExclamationIcon className="h-5 w-5 flex-shrink-0" /><span className="text-sm">{err}</span><button onClick={() => setErr('')} className="ml-auto p-1 hover:bg-red-100 rounded"><XMarkIcon className="h-4 w-4" /></button></div>}

        {!loading && !shipments.length && (
          <div className="text-center py-16"><CubeIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-slate-700 mb-1">No shipments found</h3><p className="text-sm text-slate-400 mb-4">Try adjusting your search or filters</p><button onClick={() => setCModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"><PlusIcon className="h-4 w-4 inline mr-1" />Create Shipment</button></div>
        )}

        {/* FOLDER VIEW */}
        {view === 'folders' && !!shipments.length && (
          <div className="space-y-2">
            {folderNames.map((company, i) => {
              const items = grouped[company]; const open = expFolders.has(company);
              const active = items.filter((s: any) => ['IN_WAREHOUSE', 'IN_STORAGE', 'ACTIVE'].includes(s.status)).length;
              const pending = items.filter((s: any) => s.status === 'PENDING').length;
              const boxes = items.reduce((sum: number, s: any) => sum + (s.currentBoxCount || 0), 0);
              const unassigned = company === 'Unassigned';
              return (
                <div key={company} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <button onClick={() => toggleF(company)} className={`w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50 ${open ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronRightIcon className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${unassigned ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>{unassigned ? '?' : company.charAt(0)}</div>
                        <div className="text-left min-w-0">
                          <h3 className={`text-sm font-semibold truncate ${unassigned ? 'text-slate-500' : 'text-slate-700'}`}>{unassigned ? 'Unassigned' : company}</h3>
                          <p className="text-xs text-slate-400">{items.length} shipment{items.length !== 1 ? 's' : ''} · {boxes} piece{boxes !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!!active && !unassigned && <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full border border-emerald-100"><CheckCircleIcon className="h-3 w-3" />{active}</span>}
                      {!!pending && <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full border border-amber-100"><ClockIcon className="h-3 w-3" />{pending}</span>}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${unassigned ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>{items.length}</span>
                    </div>
                  </button>
                  {open && <div className="p-3 space-y-2 bg-slate-50/50">{items.map((s: any) => <Card key={s.id} s={s} />)}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {view === 'table' && !!shipments.length && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-slate-100">
              <Ind checked={selIds.size === shipments.length} indeterminate={selIds.size > 0 && selIds.size < shipments.length}
                onChange={() => selIds.size === shipments.length ? setSelIds(new Set()) : setSelIds(new Set(shipments.map(s => s.id)))} />
              <span className="text-xs text-slate-500">Select All</span>
              {!!selIds.size && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selIds.size} selected</span>}
            </div>
            <div className="space-y-2">{pageS.map((s: any) => <Card key={s.id} s={s} />)}</div>
            {hasMore && <div className="text-center py-4"><button onClick={() => setPage(p => p + 1)} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Show More ({shipments.length - pageS.length})</button></div>}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button onClick={() => setCModal(true)} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-30 hover:bg-blue-700 active:scale-90 transition-all"><PlusIcon className="h-6 w-6" /></button>

      <WHMShipmentModal isOpen={cModal} onClose={() => setCModal(false)} onSuccess={loadShipments} />
      <EditShipmentModal isOpen={eModal} onClose={() => setEModal(false)} shipment={selS} onSuccess={loadShipments} />
      <ShipmentDetailModal isOpen={dModal} onClose={() => setDModal(false)} shipmentId={selS?.id || ''} />
      <WithdrawalModal isOpen={wModal} onClose={() => setWModal(false)} shipment={selS} onSuccess={loadShipments} />
      <BoxQRModal isOpen={qModal} onClose={() => setQModal(false)} shipmentId={selS?.id || ''} shipmentRef={selS?.referenceId || ''} />

      {/* Bulk bar */}
      {!!selIds.size && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm font-medium text-slate-700"><span className="text-blue-600 font-semibold">{selIds.size}</span> selected</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelIds(new Set())} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">Clear</button>
            <button onClick={handleBatch} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"><ArrowRightOnRectangleIcon className="h-4 w-4" />Release</button>
          </div>
        </div>
      )}

      {/* Rack popup */}
      {rPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setRPopup(null)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-5 max-w-sm w-full mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2"><MapPinIcon className="h-5 w-5 text-blue-500" />Rack Location</h3>
              <button onClick={() => setRPopup(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100"><p className="text-xs text-slate-500 font-medium mb-0.5">Code</p><p className="text-base font-semibold text-slate-800">{rPopup.rackLocations || 'N/A'}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100"><p className="text-xs text-slate-500 font-medium mb-0.5">Zone</p><p className="text-sm font-medium text-slate-700">{rPopup.zone || '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100"><p className="text-xs text-slate-500 font-medium mb-0.5">Boxes</p><p className="text-sm font-medium text-slate-700">{rPopup.currentBoxCount || 0} / {rPopup.originalBoxCount || 0}</p></div>
              </div>
              {rPopup.rackLocations && <a href={`/racks?highlight=${rPopup.boxes?.find((b: any) => b.rackId)?.rackId || ''}`} className="block w-full text-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"><SquaresPlusIcon className="h-4 w-4 inline mr-1" />View in Racks →</a>}
            </div>
          </div>
        </div>
      )}

      {lbOpen && !!lbPhotos.length && <PhotoLightbox photos={lbPhotos.map(p => gbp(p))} currentIndex={lbIdx} onClose={() => setLbOpen(false)} onIndexChange={i => setLbIdx(i)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Shipments – List, search, filter, detail slide-over
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Building2,
  Box,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  Inbox,
  User,
  Hash,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { fetchShipments, fetchShipment, fetchShipmentBoxes } from '../api/client';
import type { Shipment, ShipmentBox, Pagination } from '../api/client';

// ── Types ──────────────────────────────────────

type SortField = 'name' | 'arrivalDate' | 'cbm' | 'currentBoxCount';
type SortDir = 'asc' | 'desc';

interface DetailPanelProps {
  shipmentId: string;
  onClose: () => void;
  onRefresh: () => void;
}

// ── Constants ──────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:       'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IN_WAREHOUSE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  IN_STORAGE:   'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  PARTIAL:      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  RELEASED:     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  PENDING:      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:       'Active',
  IN_WAREHOUSE: 'In Warehouse',
  IN_STORAGE:   'In Storage',
  PARTIAL:      'Partial',
  RELEASED:     'Released',
  PENDING:      'Pending',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_WAREHOUSE', label: 'In Warehouse' },
  { value: 'IN_STORAGE', label: 'In Storage' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'PENDING', label: 'Pending' },
];

// ── Helpers ────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// ── Detail Slide-Over Panel ────────────────────

function DetailPanel({ shipmentId, onClose, onRefresh }: DetailPanelProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [boxes, setBoxes] = useState<ShipmentBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [s, b] = await Promise.all([
          fetchShipment(shipmentId),
          fetchShipmentBoxes(shipmentId),
        ]);
        if (!cancelled) {
          setShipment(s);
          setBoxes(b);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Failed to load details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [shipmentId]);

  // Group boxes by rack
  const rackGroups = boxes.reduce<Record<string, ShipmentBox[]>>((acc, box) => {
    const key = box.rack?.code ?? 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(box);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg animate-slide-in-right bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Shipment Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => { setError(''); setLoading(true); /* re-trigger via key hack */ }}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && shipment && (
            <>
              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Reference" value={shipment.referenceId} icon={<Hash className="h-4 w-4" />} />
                <InfoCard label="Customer" value={shipment.customerName || shipment.clientName} icon={<User className="h-4 w-4" />} />
                <InfoCard label="Company" value={shipment.companyProfile?.name ?? '—'} icon={<Building2 className="h-4 w-4" />} />
                <InfoCard label="Phone" value={shipment.clientPhone || '—'} icon={<Building2 className="h-4 w-4" />} />
                <InfoCard label="Status" value={STATUS_LABELS[shipment.status] ?? shipment.status} icon={<Layers className="h-4 w-4" />} />
                <InfoCard label="Created" value={formatDate(shipment.createdAt)} icon={<Calendar className="h-4 w-4" />} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Boxes" value={`${shipment.currentBoxCount} / ${shipment.originalBoxCount}`} />
                <StatCard label="CBM" value={shipment.cbm ? `${Number(shipment.cbm).toFixed(2)}` : '—'} />
                <StatCard label="Weight" value={shipment.weight ? `${shipment.weight} kg` : '—'} />
              </div>

              {shipment.rackLocations && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Locations:</span>
                  <span className="text-gray-600 dark:text-gray-400">{shipment.rackLocations}</span>
                </div>
              )}

              {shipment.notes && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Notes:</span>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{shipment.notes}</p>
                </div>
              )}

              {/* Boxes */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Boxes ({boxes.length})
                </h3>

                {boxes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No box data available.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(rackGroups).map(([rackCode, rackBoxes]) => (
                      <div
                        key={rackCode}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {rackCode}
                          </span>
                          <span className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-400">
                            {rackBoxes.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 p-2">
                          {rackBoxes.map((b) => (
                            <span
                              key={b.id}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                                b.status === 'RELEASED'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : b.status === 'IN_STORAGE'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}
                              title={`Box #${b.boxNumber ?? '?'} – ${STATUS_LABELS[b.status] ?? b.status}`}
                            >
                              #{b.boxNumber ?? '?'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh List
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ── Table component ────────────────────────────

function ShipmentsTable({
  shipments,
  onRowClick,
  sortField,
  sortDir,
  onSort,
}: {
  shipments: Shipment[];
  onRowClick: (id: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const active = sortField === field;
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none ${
          active ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
        } hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${className ?? ''}`}
        onClick={() => onSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {active && (
            <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
          )}
        </span>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <SortHeader field="name">Name / Ref</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Customer
            </th>
            <SortHeader field="currentBoxCount" className="text-right">Boxes</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </th>
            <SortHeader field="cbm" className="text-right">CBM</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Rack
            </th>
            <SortHeader field="arrivalDate" className="text-right">Date</SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {shipments.map((s) => (
            <tr
              key={s.id}
              onClick={() => onRowClick(s.id)}
              className="group cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-900/10"
            >
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {s.customerName || s.clientName || s.name || '—'}
                  </span>
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{s.referenceId}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.clientName || '—'}</span>
                  {s.companyProfile?.name && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{s.companyProfile.name}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {s.currentBoxCount}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  / {s.originalBoxCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {s.cbm ? Number(s.cbm).toFixed(1) : '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  {s.rackLocations && s.rackLocations !== 'N/A' ? s.rackLocations : '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(s.arrivalDate || s.createdAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ─────────────────────────────────

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium">{(page - 1) * pagination.limit + 1}</span>
        –<span className="font-medium">{Math.min(page * pagination.limit, total)}</span>
        {' '}of <span className="font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page Export ───────────────────────────

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('arrivalDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Detail panel
  const [detailShipmentId, setDetailShipmentId] = useState<string | null>(null);

  // Create modal (placeholder)
  const [createOpen, setCreateOpen] = useState(false);

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Load data
  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetchShipments({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setShipments(resp.shipments);
      setPagination(resp.pagination);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    load(1);
  }, [load]);

  // Pagination
  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    load(page);
  };

  // Sort handler – resets to page 1
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    // Note: in a real app you'd pass sort to API; here we sort client-side
  };

  // Client-side sort of loaded data
  const sorted = [...shipments].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    let cmp = 0;
    switch (sortField) {
      case 'name':
        cmp = (a.clientName || a.customerName || '').localeCompare(b.clientName || b.customerName || '');
        break;
      case 'arrivalDate':
        cmp = (a.arrivalDate || a.createdAt || '').localeCompare(b.arrivalDate || b.createdAt || '');
        break;
      case 'cbm':
        cmp = (a.cbm ?? 0) - (b.cbm ?? 0);
        break;
      case 'currentBoxCount':
        cmp = (a.currentBoxCount ?? 0) - (b.currentBoxCount ?? 0);
        break;
    }
    return cmp * dir;
  });

  const refresh = () => load(pagination.page);

  // ── Render ──

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                Shipments
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage intake, storage, and release operations
              </p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Shipment</span>
            </button>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-3 pb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, reference, customer…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-9 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Layers className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Results count */}
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {pagination.total} shipment{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={refresh}
              className="flex items-center gap-1 rounded-lg bg-red-100 dark:bg-red-900/40 px-3 py-1.5 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading shipments…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 rounded-full bg-gray-100 dark:bg-gray-800 p-6">
              <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">No shipments found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              {search || statusFilter
                ? 'Try adjusting your search or filters above.'
                : 'Create your first shipment to get started.'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Shipment
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && sorted.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <ShipmentsTable
              shipments={sorted}
              onRowClick={(id) => setDetailShipmentId(id)}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <PaginationBar pagination={pagination} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      {/* ── Detail Slide-Over ── */}
      {detailShipmentId && (
        <DetailPanel
          shipmentId={detailShipmentId}
          onClose={() => setDetailShipmentId(null)}
          onRefresh={refresh}
        />
      )}

      {/* ── Create modal placeholder ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-2xl text-center">
            <Inbox className="h-16 w-16 text-blue-200 dark:text-blue-800 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create Shipment</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              The full create-shipment form is available in the existing codebase.
            </p>
            <button
              onClick={() => setCreateOpen(false)}
              className="rounded-lg bg-gray-100 dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

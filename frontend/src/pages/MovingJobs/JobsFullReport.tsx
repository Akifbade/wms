import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiFetch, getAuthToken } from '../../services/api';

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type MaterialLine = {
  issueId: string;
  materialId: string;
  sku: string;
  name: string;
  unit: string;
  issued: number;
  used: number;
  returnedGood: number;
  damaged: number;
  unitCost: number;
  lineCost: number;
  hasReturn: boolean;
  issuedAt?: string;
};

type JobRow = {
  id: string;
  jobCode: string;
  jobTitle: string;
  clientName: string;
  clientPhone?: string;
  jobDate: string;
  status: string;
  driverName?: string;
  vehicleNumber?: string;
  fromAddress?: string;
  toAddress?: string;
  materials: MaterialLine[];
  totals: {
    issued: number;
    used: number;
    returnedGood: number;
    damaged: number;
    cost: number;
  };
  hasPhysicalReport?: boolean;
};

type MaterialSummary = {
  materialId: string;
  sku: string;
  name: string;
  unit: string;
  issued: number;
  used: number;
  returnedGood: number;
  damaged: number;
  cost: number;
  jobCount: number;
};

type ReportPayload = {
  summary: {
    jobCount: number;
    completed: number;
    inProgress: number;
    scheduled: number;
    cancelled: number;
    withMaterials: number;
    totalIssued: number;
    totalUsed: number;
    totalReturned: number;
    totalDamaged: number;
    totalCost: number;
    materialTypes: number;
  };
  jobs: JobRow[];
  materialsSummary: MaterialSummary[];
};

type MaterialOption = { id: string; name: string; sku?: string };

function defaultRange() {
  const now = new Date();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const toInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { start: toInput(prevStart), end: toInput(prevEnd) };
}

function money(n: number) {
  return `${(n || 0).toFixed(3)} KWD`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB');
}

function statusClass(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'CLOSED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'IN_PROGRESS') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

const JobsFullReport: React.FC = () => {
  const range0 = useMemo(() => defaultRange(), []);
  const [startDate, setStartDate] = useState(range0.start);
  const [endDate, setEndDate] = useState(range0.end);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [tab, setTab] = useState<'jobs' | 'materials' | 'tally'>('jobs');
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tallyMaterialId, setTallyMaterialId] = useState(''); // '' = All materials
  const [tally, setTally] = useState<any>(null);
  const [tallyAll, setTallyAll] = useState<any>(null);
  const [tallyLoading, setTallyLoading] = useState(false);
  const [tallyError, setTallyError] = useState('');
  const [tallySub, setTallySub] = useState<'jobs' | 'purchases' | 'ledger'>('jobs');
  const [tallySearch, setTallySearch] = useState('');
  const [tallyOnlyActive, setTallyOnlyActive] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/materials', { headers: authHeaders() });
        if (res.ok) {
          const list = await res.json();
          const arr = Array.isArray(list) ? list : list?.materials || list?.data || [];
          setMaterials(
            arr.map((m: any) => ({ id: m.id, name: m.name, sku: m.sku })).filter((m: MaterialOption) => m.id)
          );
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status && status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      if (materialId) params.set('materialId', materialId);

      const res = await apiFetch(`/moving-jobs/reports/full?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      // expand first few by default empty
      setExpanded({});
    } catch (e: any) {
      setError(e.message || 'Report load fail');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, status, search, materialId]);

  const loadTally = async (mid?: string) => {
    const id = mid !== undefined ? mid : tallyMaterialId;
    setTallyLoading(true);
    setTallyError('');
    try {
      if (!id) {
        // All materials summary
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (tallySearch.trim()) params.set('search', tallySearch.trim());
        const res = await apiFetch(`/materials/reports/tally-all?${params.toString()}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${res.status})`);
        }
        setTallyAll(await res.json());
        setTally(null);
      } else {
        const params = new URLSearchParams({ materialId: id });
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const res = await apiFetch(`/materials/reports/tally?${params.toString()}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${res.status})`);
        }
        setTally(await res.json());
        setTallyAll(null);
      }
    } catch (e: any) {
      setTally(null);
      setTallyAll(null);
      setTallyError(e.message || 'Tally load failed');
    } finally {
      setTallyLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'tally') {
      loadTally(tallyMaterialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tallyMaterialId, startDate, endDate]);

  const openSingleTally = (mid: string) => {
    setTallyMaterialId(mid);
    setTallySub('jobs');
  };

  const backToAllTally = () => {
    setTallyMaterialId('');
    setTally(null);
  };

  const setPreset = (preset: 'prev' | 'this' | '30' | 'all') => {
    const now = new Date();
    const toInput = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    if (preset === 'prev') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toInput(s));
      setEndDate(toInput(e));
    } else if (preset === 'this') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toInput(s));
      setEndDate(toInput(now));
    } else if (preset === '30') {
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      setStartDate(toInput(s));
      setEndDate(toInput(now));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const downloadCsv = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push('Jobs Full Report');
    lines.push(`From,${startDate || 'ALL'},To,${endDate || 'ALL'}`);
    lines.push(
      `Jobs,${data.summary.jobCount},Material Cost,${data.summary.totalCost.toFixed(3)},Used Qty,${data.summary.totalUsed}`
    );
    lines.push('');
    lines.push('=== MATERIALS SUMMARY ===');
    lines.push('SKU,Material,Unit,Jobs,Issued,Used,Returned,Damaged,Cost (KWD)');
    data.materialsSummary.forEach((m) => {
      lines.push(
        [
          m.sku,
          `"${(m.name || '').replace(/"/g, '""')}"`,
          m.unit,
          m.jobCount,
          m.issued,
          m.used,
          m.returnedGood,
          m.damaged,
          m.cost.toFixed(3),
        ].join(',')
      );
    });
    lines.push('');
    lines.push('=== JOB DETAILS ===');
    lines.push(
      'Job Code,Title,Client,Phone,Date,Status,From,To,Material,SKU,Unit,Issued,Used,Returned,Damaged,Unit Cost,Line Cost'
    );
    data.jobs.forEach((j) => {
      const base = [
        j.jobCode,
        `"${(j.jobTitle || '').replace(/"/g, '""')}"`,
        `"${(j.clientName || '').replace(/"/g, '""')}"`,
        j.clientPhone || '',
        fmtDate(j.jobDate),
        j.status,
        `"${(j.fromAddress || '').replace(/"/g, '""')}"`,
        `"${(j.toAddress || '').replace(/"/g, '""')}"`,
      ];
      if (!j.materials.length) {
        lines.push([...base, '', '', '', '', '', '', '', '', j.totals.cost.toFixed(3)].join(','));
      } else {
        j.materials.forEach((m) => {
          lines.push(
            [
              ...base,
              `"${(m.name || '').replace(/"/g, '""')}"`,
              m.sku,
              m.unit,
              m.issued,
              m.used,
              m.returnedGood,
              m.damaged,
              m.unitCost.toFixed(3),
              m.lineCost.toFixed(3),
            ].join(',')
          );
        });
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs-materials-report-${startDate || 'all'}-to-${endDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 print:px-0 print:py-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 print:mb-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Jobs & Materials Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Full breakdown of jobs, locations, and materials used — with filters
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link
              to="/moving-jobs"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50"
            >
              ← Moving Jobs
            </Link>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-3 print:border-0 print:p-0 print:mb-3">
          <div className="flex flex-wrap gap-2 print:hidden">
            {[
              { id: 'prev', label: 'Last month' },
              { id: 'this', label: 'This month' },
              { id: '30', label: 'Last 30 days' },
              { id: 'all', label: 'All time' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id as any)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">All status</option>
                <option value="scheduled">Scheduled / Planned</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Material</label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">All materials</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.sku ? ` (${m.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Search job / client</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Code, client, phone, address…"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 print:block">
            Range: <span className="font-medium text-slate-700">{startDate || 'ALL'}</span>
            {' → '}
            <span className="font-medium text-slate-700">{endDate || 'ALL'}</span>
            {status !== 'all' && (
              <>
                {' · '}Status: <span className="font-medium text-slate-700">{status}</span>
              </>
            )}
            {search && (
              <>
                {' · '}Search: <span className="font-medium text-slate-700">{search}</span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {[
            { label: 'Jobs', value: s?.jobCount ?? '—' },
            { label: 'Completed', value: s?.completed ?? '—' },
            { label: 'With materials', value: s?.withMaterials ?? '—' },
            { label: 'Used qty', value: s ? s.totalUsed.toLocaleString() : '—' },
            { label: 'Returned', value: s ? s.totalReturned.toLocaleString() : '—' },
            { label: 'Material cost', value: s ? money(s.totalCost) : '—' },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-3 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{c.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mb-4 print:hidden overflow-x-auto">
          {(
            [
              { id: 'jobs', label: `By Job (${data?.jobs.length ?? 0})` },
              { id: 'materials', label: `By Material (${data?.materialsSummary.length ?? 0})` },
              { id: 'tally', label: 'Material Tally' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && !data && (
          <div className="py-16 text-center text-slate-500 text-sm">Loading report…</div>
        )}

        {/* JOBS TAB */}
        {tab === 'jobs' && data && (
          <div className="space-y-2">
            {data.jobs.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center text-slate-500 text-sm">
                No jobs found for these filters.
              </div>
            )}
            {data.jobs.map((job) => {
              const open = !!expanded[job.id];
              return (
                <div key={job.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(job.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50/80 print:hover:bg-transparent"
                  >
                    <span className="mt-0.5 text-slate-400 print:hidden">
                      {open ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{job.jobCode}</span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass(job.status)}`}
                        >
                          {job.status}
                        </span>
                        <span className="text-xs text-slate-500">{fmtDate(job.jobDate)}</span>
                      </div>
                      <div className="text-sm text-slate-800 mt-0.5 truncate">
                        {job.clientName}
                        {job.jobTitle ? ` · ${job.jobTitle}` : ''}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {job.fromAddress || '—'}
                        {job.toAddress ? ` → ${job.toAddress}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-slate-900 tabular-nums">
                        {money(job.totals.cost)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {job.materials.length} items · used {job.totals.used}
                      </div>
                      <Link
                        to={`/moving-jobs/${job.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-slate-600 underline mt-1 inline-block print:hidden"
                      >
                        Open job
                      </Link>
                    </div>
                  </button>

                  {(open || true) && (
                    <div className={`${open ? 'block' : 'hidden'} print:block border-t border-slate-100`}>
                      {job.materials.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-400">No materials issued on this job.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                <th className="text-left font-medium px-4 py-2">Material</th>
                                <th className="text-right font-medium px-3 py-2">Issued</th>
                                <th className="text-right font-medium px-3 py-2">Used</th>
                                <th className="text-right font-medium px-3 py-2">Returned</th>
                                <th className="text-right font-medium px-3 py-2">Damaged</th>
                                <th className="text-right font-medium px-3 py-2">Unit</th>
                                <th className="text-right font-medium px-4 py-2">Cost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {job.materials.map((m) => (
                                <tr key={m.issueId}>
                                  <td className="px-4 py-2">
                                    <div className="font-medium text-slate-800">{m.name}</div>
                                    <div className="text-slate-400">
                                      {m.sku} · {m.unit}
                                      {!m.hasReturn && ' · pending return'}
                                    </div>
                                  </td>
                                  <td className="text-right px-3 py-2 tabular-nums">{m.issued}</td>
                                  <td className="text-right px-3 py-2 tabular-nums font-medium text-slate-800">
                                    {m.used}
                                  </td>
                                  <td className="text-right px-3 py-2 tabular-nums text-emerald-700">
                                    {m.returnedGood}
                                  </td>
                                  <td className="text-right px-3 py-2 tabular-nums text-rose-600">
                                    {m.damaged || '—'}
                                  </td>
                                  <td className="text-right px-3 py-2 tabular-nums">{m.unitCost.toFixed(3)}</td>
                                  <td className="text-right px-4 py-2 tabular-nums font-medium">
                                    {m.lineCost.toFixed(3)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50 font-semibold text-slate-800">
                                <td className="px-4 py-2 text-left">Job total</td>
                                <td className="text-right px-3 py-2 tabular-nums">{job.totals.issued}</td>
                                <td className="text-right px-3 py-2 tabular-nums">{job.totals.used}</td>
                                <td className="text-right px-3 py-2 tabular-nums">{job.totals.returnedGood}</td>
                                <td className="text-right px-3 py-2 tabular-nums">{job.totals.damaged}</td>
                                <td />
                                <td className="text-right px-4 py-2 tabular-nums">{job.totals.cost.toFixed(3)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MATERIALS TAB */}
        {tab === 'materials' && data && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {data.materialsSummary.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-500 text-sm">No material usage in this range.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Material</th>
                      <th className="text-right font-medium px-3 py-3">Jobs</th>
                      <th className="text-right font-medium px-3 py-3">Issued</th>
                      <th className="text-right font-medium px-3 py-3">Used</th>
                      <th className="text-right font-medium px-3 py-3">Returned</th>
                      <th className="text-right font-medium px-3 py-3">Damaged</th>
                      <th className="text-right font-medium px-4 py-3">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.materialsSummary.map((m) => (
                      <tr
                        key={m.materialId}
                        className="hover:bg-slate-50/60 cursor-pointer"
                        onClick={() => {
                          setTallyMaterialId(m.materialId);
                          setTab('tally');
                        }}
                        title="Open full material tally"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 underline decoration-slate-300">{m.name}</div>
                          <div className="text-xs text-slate-400">
                            {m.sku} · {m.unit} · click for full tally
                          </div>
                        </td>
                        <td className="text-right px-3 py-3 tabular-nums">{m.jobCount}</td>
                        <td className="text-right px-3 py-3 tabular-nums">{m.issued}</td>
                        <td className="text-right px-3 py-3 tabular-nums font-medium">{m.used}</td>
                        <td className="text-right px-3 py-3 tabular-nums text-emerald-700">{m.returnedGood}</td>
                        <td className="text-right px-3 py-3 tabular-nums text-rose-600">{m.damaged || '—'}</td>
                        <td className="text-right px-4 py-3 tabular-nums font-semibold">{money(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>
                        Total ({data.summary.materialTypes} types)
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums">{data.summary.totalIssued}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{data.summary.totalUsed}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{data.summary.totalReturned}</td>
                      <td className="text-right px-3 py-3 tabular-nums">{data.summary.totalDamaged}</td>
                      <td className="text-right px-4 py-3 tabular-nums">{money(data.summary.totalCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MATERIAL TALLY TAB — all materials + single drill-down */}
        {tab === 'tally' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Material</label>
                  <select
                    value={tallyMaterialId}
                    onChange={(e) => setTallyMaterialId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">All materials</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.sku ? ` (${m.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {!tallyMaterialId && (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Search name / SKU</label>
                    <input
                      value={tallySearch}
                      onChange={(e) => setTallySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') loadTally('');
                      }}
                      placeholder="Filter materials…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => loadTally()}
                  disabled={tallyLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {tallyLoading ? 'Loading…' : tallyMaterialId ? 'Load full tally' : 'Load all materials'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {tallyMaterialId
                  ? 'Full detail for one material: purchases (Direct + PO), where used, who, stock remaining.'
                  : 'All materials overview for the date range. Click a row for full detail.'}
              </p>
            </div>

            {tallyError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                {tallyError}
              </div>
            )}

            {tallyLoading && !tally && !tallyAll && (
              <div className="py-12 text-center text-sm text-slate-500">Loading material tally…</div>
            )}

            {/* ALL MATERIALS VIEW */}
            {!tallyMaterialId && tallyAll && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {[
                    { label: 'Materials', value: tallyAll.totals.materialCount },
                    { label: 'With activity', value: tallyAll.totals.activeMaterials },
                    {
                      label: 'Purchased',
                      value: tallyAll.totals.purchased,
                      sub: `D ${tallyAll.totals.purchasedDirect || 0} · PO ${tallyAll.totals.purchasedPO || 0}`,
                    },
                    { label: 'Issued', value: tallyAll.totals.issued },
                    { label: 'Used', value: tallyAll.totals.used },
                    { label: 'Returned', value: tallyAll.totals.returnedGood },
                    { label: 'Damaged', value: tallyAll.totals.damaged },
                    { label: 'Usage cost', value: money(tallyAll.totals.usageCost) },
                  ].map((c: any) => (
                    <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</div>
                      <div className="mt-1 text-base font-semibold text-slate-900 tabular-nums">{c.value}</div>
                      {c.sub && <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={tallyOnlyActive}
                      onChange={(e) => setTallyOnlyActive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Only materials with activity in this period
                  </label>
                  <div className="text-xs text-slate-500">
                    Click any material for full tally (purchases, jobs, ledger)
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {(() => {
                    const list = (tallyAll.materials || []).filter((m: any) =>
                      tallyOnlyActive ? m.hasActivity : true
                    );
                    if (!list.length) {
                      return (
                        <div className="px-4 py-10 text-center text-sm text-slate-500">
                          No materials with activity in this date range.
                        </div>
                      );
                    }
                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-xs">
                            <tr>
                              <th className="text-left font-medium px-4 py-3">Material</th>
                              <th className="text-right font-medium px-3 py-3">Stock now</th>
                              <th className="text-right font-medium px-3 py-3">Purchased</th>
                              <th className="text-right font-medium px-3 py-3">Issued</th>
                              <th className="text-right font-medium px-3 py-3">Used</th>
                              <th className="text-right font-medium px-3 py-3">Returned</th>
                              <th className="text-right font-medium px-3 py-3">Damaged</th>
                              <th className="text-right font-medium px-3 py-3">Jobs</th>
                              <th className="text-right font-medium px-4 py-3">Usage cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {list.map((m: any) => (
                              <tr
                                key={m.materialId}
                                className="hover:bg-slate-50/80 cursor-pointer"
                                onClick={() => openSingleTally(m.materialId)}
                                title="Open full tally"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900 underline-offset-2 group-hover:underline">
                                    {m.name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {m.sku} · {m.unit}
                                    {m.purchasedDirect || m.purchasedPO
                                      ? ` · D ${m.purchasedDirect || 0} / PO ${m.purchasedPO || 0}`
                                      : ''}
                                  </div>
                                </td>
                                <td className="text-right px-3 py-3 tabular-nums">
                                  <span
                                    className={
                                      m.currentStock <= (m.minStockLevel || 0)
                                        ? 'text-rose-600 font-semibold'
                                        : ''
                                    }
                                  >
                                    {m.currentStock}
                                  </span>
                                </td>
                                <td className="text-right px-3 py-3 tabular-nums">{m.purchased || '—'}</td>
                                <td className="text-right px-3 py-3 tabular-nums">{m.issued || '—'}</td>
                                <td className="text-right px-3 py-3 tabular-nums font-medium">{m.used || '—'}</td>
                                <td className="text-right px-3 py-3 tabular-nums">{m.returnedGood || '—'}</td>
                                <td className="text-right px-3 py-3 tabular-nums">{m.damaged || '—'}</td>
                                <td className="text-right px-3 py-3 tabular-nums">{m.jobCount || '—'}</td>
                                <td className="text-right px-4 py-3 tabular-nums font-medium">
                                  {m.usageCost ? money(m.usageCost) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 font-semibold text-sm">
                              <td className="px-4 py-2">
                                Totals ({list.length} materials)
                              </td>
                              <td className="text-right px-3 py-2 tabular-nums">—</td>
                              <td className="text-right px-3 py-2 tabular-nums">
                                {list.reduce((s: number, m: any) => s + (m.purchased || 0), 0)}
                              </td>
                              <td className="text-right px-3 py-2 tabular-nums">
                                {list.reduce((s: number, m: any) => s + (m.issued || 0), 0)}
                              </td>
                              <td className="text-right px-3 py-2 tabular-nums">
                                {list.reduce((s: number, m: any) => s + (m.used || 0), 0)}
                              </td>
                              <td className="text-right px-3 py-2 tabular-nums">
                                {list.reduce((s: number, m: any) => s + (m.returnedGood || 0), 0)}
                              </td>
                              <td className="text-right px-3 py-2 tabular-nums">
                                {list.reduce((s: number, m: any) => s + (m.damaged || 0), 0)}
                              </td>
                              <td className="text-right px-3 py-2">—</td>
                              <td className="text-right px-4 py-2 tabular-nums">
                                {money(list.reduce((s: number, m: any) => s + (m.usageCost || 0), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* SINGLE MATERIAL VIEW */}
            {tally && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={backToAllTally}
                        className="text-xs text-slate-500 hover:text-slate-800 mb-1 print:hidden"
                      >
                        ← Back to all materials
                      </button>
                      <h2 className="text-lg font-semibold text-slate-900">{tally.material.name}</h2>
                      <p className="text-sm text-slate-500">
                        {tally.material.sku} · {tally.material.unit} · Unit cost{' '}
                        {Number(tally.material.unitCost || 0).toFixed(3)} KWD
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase text-slate-400">Stock now</div>
                      <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {tally.material.currentStock}
                      </div>
                      {tally.material.currentStock <= tally.material.minStockLevel && (
                        <div className="text-xs text-rose-600 mt-0.5">
                          At / below min ({tally.material.minStockLevel})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-mono">
                    {tally.tally.equation}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {[
                    { label: 'Opening', value: tally.tally.openingStock },
                    {
                      label: 'Purchased',
                      value: tally.tally.purchased,
                      sub:
                        tally.tally.purchasedDirect || tally.tally.purchasedPO
                          ? `D ${tally.tally.purchasedDirect || 0} · PO ${tally.tally.purchasedPO || 0}`
                          : null,
                    },
                    { label: 'Issued', value: tally.tally.issued },
                    { label: 'Used', value: tally.tally.used },
                    { label: 'Returned', value: tally.tally.returnedGood },
                    { label: 'Damaged', value: tally.tally.damaged },
                    { label: 'Jobs', value: tally.tally.jobCount },
                    { label: 'Usage cost', value: money(tally.tally.usageCost) },
                  ].map((c: any) => (
                    <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</div>
                      <div className="mt-1 text-base font-semibold text-slate-900 tabular-nums">{c.value}</div>
                      {c.sub && <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 border-b border-slate-200 print:hidden">
                  {(
                    [
                      { id: 'jobs', label: `Where used (${tally.jobUsage?.length || 0})` },
                      {
                        id: 'purchases',
                        label: `Purchases (${tally.purchases?.length || 0}${
                          tally.tally.purchaseCountAllTime
                            ? ` / all ${tally.tally.purchaseCountAllTime}`
                            : ''
                        })`,
                      },
                      { id: 'ledger', label: `Full ledger (${tally.ledger?.length || 0})` },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTallySub(t.id)}
                      className={`pb-2 text-sm font-medium border-b-2 -mb-px ${
                        tallySub === t.id
                          ? 'border-slate-900 text-slate-900'
                          : 'border-transparent text-slate-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {tallySub === 'jobs' && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {(tally.jobUsage || []).length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No job usage for this material in the selected range.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="text-left font-medium px-4 py-2">Job / Client</th>
                              <th className="text-left font-medium px-3 py-2">Where</th>
                              <th className="text-left font-medium px-3 py-2">Who</th>
                              <th className="text-right font-medium px-3 py-2">Issued</th>
                              <th className="text-right font-medium px-3 py-2">Used</th>
                              <th className="text-right font-medium px-3 py-2">Returned</th>
                              <th className="text-right font-medium px-3 py-2">Damaged</th>
                              <th className="text-right font-medium px-4 py-2">Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tally.jobUsage.map((j: any) => (
                              <tr key={j.issueId} className="hover:bg-slate-50/60">
                                <td className="px-4 py-2">
                                  <Link
                                    to={`/moving-jobs/${j.jobId}`}
                                    className="font-semibold text-slate-900 underline"
                                  >
                                    {j.jobCode}
                                  </Link>
                                  <div className="text-slate-700">{j.clientName}</div>
                                  <div className="text-slate-400">{fmtDate(j.jobDate || j.issuedAt)}</div>
                                </td>
                                <td className="px-3 py-2 text-slate-600 max-w-[220px]">
                                  <div className="truncate">{j.fromAddress || '—'}</div>
                                  {j.toAddress && <div className="truncate text-slate-400">→ {j.toAddress}</div>}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-slate-800">{j.issuedBy}</div>
                                  {j.returnedBy && (
                                    <div className="text-slate-400">Return: {j.returnedBy}</div>
                                  )}
                                </td>
                                <td className="text-right px-3 py-2 tabular-nums">{j.issued}</td>
                                <td className="text-right px-3 py-2 tabular-nums font-medium">{j.used}</td>
                                <td className="text-right px-3 py-2 tabular-nums text-emerald-700">{j.returnedGood}</td>
                                <td className="text-right px-3 py-2 tabular-nums text-rose-600">{j.damaged || '—'}</td>
                                <td className="text-right px-4 py-2 tabular-nums font-medium">{j.cost.toFixed(3)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tallySub === 'purchases' && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
                      <div className="font-medium text-slate-800 mb-1">Two purchase types (both counted)</div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full border border-slate-200 bg-white mr-1">
                          Direct Stock Entry
                        </span>
                        Materials → Add Stock
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="inline-block px-2 py-0.5 rounded-full border border-slate-200 bg-white mr-1">
                          Purchase Order
                        </span>
                        PO received into warehouse
                      </div>
                    </div>

                    {(() => {
                      const periodRows = tally.purchases || [];
                      const allRows = tally.purchasesAllTime || [];
                      const showAllNote = periodRows.length === 0 && allRows.length > 0;
                      const rows = showAllNote ? allRows : periodRows;

                      const renderTable = (list: any[], footerLabel: string, footerQty: number, footerCost: number) => (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-50 text-slate-500 text-xs">
                                <tr>
                                  <th className="text-left font-medium px-4 py-3">Date</th>
                                  <th className="text-left font-medium px-3 py-3">Type</th>
                                  <th className="text-left font-medium px-3 py-3">Reference</th>
                                  <th className="text-left font-medium px-3 py-3">Vendor</th>
                                  <th className="text-right font-medium px-3 py-3">Qty</th>
                                  <th className="text-right font-medium px-3 py-3">Unit</th>
                                  <th className="text-right font-medium px-4 py-3">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {list.map((p: any) => (
                                  <tr key={`${p.source}-${p.id}`}>
                                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(p.date)}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                          p.source === 'direct_stock'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : 'border-sky-200 bg-sky-50 text-sky-800'
                                        }`}
                                      >
                                        {p.typeLabel || (p.source === 'direct_stock' ? 'Direct Stock Entry' : 'Purchase Order')}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">{p.reference}</td>
                                    <td className="px-3 py-2">{p.vendor}</td>
                                    <td className="text-right px-3 py-2 tabular-nums">{p.quantity}</td>
                                    <td className="text-right px-3 py-2 tabular-nums">{Number(p.unitCost).toFixed(3)}</td>
                                    <td className="text-right px-4 py-2 tabular-nums font-medium">
                                      {Number(p.totalCost).toFixed(3)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-50 font-semibold">
                                  <td className="px-4 py-2" colSpan={4}>
                                    {footerLabel}
                                  </td>
                                  <td className="text-right px-3 py-2 tabular-nums">{footerQty}</td>
                                  <td />
                                  <td className="text-right px-4 py-2 tabular-nums">{money(footerCost)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );

                      if (rows.length === 0) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center text-sm text-slate-500">
                            No purchase history found for this material (neither Direct Stock Entry nor Purchase Order).
                          </div>
                        );
                      }

                      if (showAllNote) {
                        const allQty = allRows.reduce((s: number, p: any) => s + (p.quantity || 0), 0);
                        const allCost = allRows.reduce((s: number, p: any) => s + (p.totalCost || 0), 0);
                        return (
                          <>
                            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                              No purchases in the selected date range. Showing full purchase history instead (
                              {allRows.length} entries · Direct + PO).
                            </div>
                            {renderTable(allRows, 'All-time purchases (Direct + PO)', allQty, allCost)}
                          </>
                        );
                      }

                      return renderTable(
                        periodRows,
                        `Period purchases (Direct ${tally.tally.purchasedDirect || 0} + PO ${tally.tally.purchasedPO || 0})`,
                        tally.tally.purchased,
                        tally.tally.purchasedCost
                      );
                    })()}
                  </div>
                )}

                {tallySub === 'ledger' && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {(tally.ledger || []).length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">No movements in this range.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="text-left font-medium px-4 py-2">Date</th>
                              <th className="text-left font-medium px-3 py-2">Type</th>
                              <th className="text-left font-medium px-3 py-2">Detail</th>
                              <th className="text-left font-medium px-3 py-2">Person</th>
                              <th className="text-right font-medium px-3 py-2">In</th>
                              <th className="text-right font-medium px-4 py-2">Out</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tally.ledger.map((row: any, idx: number) => (
                              <tr key={`${row.type}-${idx}-${row.date}`}>
                                <td className="px-4 py-2 whitespace-nowrap">{fmtDate(row.date)}</td>
                                <td className="px-3 py-2">
                                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">
                                    {row.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {row.jobId ? (
                                    <Link to={`/moving-jobs/${row.jobId}`} className="underline text-slate-800">
                                      {row.description}
                                    </Link>
                                  ) : (
                                    row.description
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-600">{row.person}</td>
                                <td className="text-right px-3 py-2 tabular-nums text-emerald-700">
                                  {row.stockIn ? `+${row.stockIn}` : '—'}
                                </td>
                                <td className="text-right px-4 py-2 tabular-nums text-rose-600">
                                  {row.stockOut ? `−${row.stockOut}` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsFullReport;

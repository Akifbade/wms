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
  const [tallyMaterialId, setTallyMaterialId] = useState('');
  const [tally, setTally] = useState<any>(null);
  const [tallyLoading, setTallyLoading] = useState(false);
  const [tallyError, setTallyError] = useState('');
  const [tallySub, setTallySub] = useState<'jobs' | 'purchases' | 'ledger'>('jobs');

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
    const id = mid || tallyMaterialId;
    if (!id) {
      setTally(null);
      setTallyError('Select a material to see full tally.');
      return;
    }
    setTallyLoading(true);
    setTallyError('');
    try {
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
    } catch (e: any) {
      setTally(null);
      setTallyError(e.message || 'Tally load failed');
    } finally {
      setTallyLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'tally' && tallyMaterialId) {
      loadTally(tallyMaterialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tallyMaterialId, startDate, endDate]);

  // Auto-pick first material if opening tally empty
  useEffect(() => {
    if (tab === 'tally' && !tallyMaterialId && materials.length) {
      // Prefer MEDIUM CARTON if present
      const medium = materials.find((m) => /medium/i.test(m.name));
      setTallyMaterialId(medium?.id || materials[0].id);
    }
  }, [tab, tallyMaterialId, materials]);

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

        {/* MATERIAL TALLY TAB — full single-material flow */}
        {tab === 'tally' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Material (example: Medium Carton)</label>
                  <select
                    value={tallyMaterialId}
                    onChange={(e) => setTallyMaterialId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select material…</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.sku ? ` (${m.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => loadTally()}
                  disabled={!tallyMaterialId || tallyLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {tallyLoading ? 'Loading…' : 'Load full tally'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Shows purchases, where it was used (job / client / address), who issued it, used vs returned, and stock remaining for the date range above.
              </p>
            </div>

            {tallyError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                {tallyError}
              </div>
            )}

            {tallyLoading && !tally && (
              <div className="py-12 text-center text-sm text-slate-500">Loading material tally…</div>
            )}

            {tally && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{tally.material.name}</h2>
                      <p className="text-sm text-slate-500">
                        {tally.material.sku} · {tally.material.unit} · Unit cost {Number(tally.material.unitCost || 0).toFixed(3)} KWD
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase text-slate-400">Stock now</div>
                      <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {tally.material.currentStock}
                      </div>
                      {tally.material.currentStock <= tally.material.minStockLevel && (
                        <div className="text-xs text-rose-600 mt-0.5">At / below min ({tally.material.minStockLevel})</div>
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
                    { label: 'Purchased', value: tally.tally.purchased },
                    { label: 'Issued', value: tally.tally.issued },
                    { label: 'Used', value: tally.tally.used },
                    { label: 'Returned', value: tally.tally.returnedGood },
                    { label: 'Damaged', value: tally.tally.damaged },
                    { label: 'Jobs', value: tally.tally.jobCount },
                    { label: 'Usage cost', value: money(tally.tally.usageCost) },
                  ].map((c) => (
                    <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</div>
                      <div className="mt-1 text-base font-semibold text-slate-900 tabular-nums">{c.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 border-b border-slate-200 print:hidden">
                  {(
                    [
                      { id: 'jobs', label: `Where used (${tally.jobUsage?.length || 0})` },
                      { id: 'purchases', label: `Purchases (${tally.purchases?.length || 0})` },
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
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {(tally.purchases || []).length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No purchases in this range.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-xs">
                            <tr>
                              <th className="text-left font-medium px-4 py-3">Date</th>
                              <th className="text-left font-medium px-3 py-3">Reference</th>
                              <th className="text-left font-medium px-3 py-3">Vendor</th>
                              <th className="text-right font-medium px-3 py-3">Qty</th>
                              <th className="text-right font-medium px-3 py-3">Unit</th>
                              <th className="text-right font-medium px-4 py-3">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tally.purchases.map((p: any) => (
                              <tr key={p.id}>
                                <td className="px-4 py-2">{fmtDate(p.date)}</td>
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
                              <td className="px-4 py-2" colSpan={3}>
                                Period purchases
                              </td>
                              <td className="text-right px-3 py-2 tabular-nums">{tally.tally.purchased}</td>
                              <td />
                              <td className="text-right px-4 py-2 tabular-nums">
                                {money(tally.tally.purchasedCost)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
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

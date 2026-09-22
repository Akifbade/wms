import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { matV3 } from '../../services/materialsV3';

type View = 'jobs' | 'changes';

interface Activity {
  id: string;
  date: string;
  entryType: string;
  direction: string;
  quantity: number;
  dayNumber?: number;
  materialName: string;
  materialSku: string;
  unit: string;
  jobCode?: string;
  jobTitle?: string;
  clientName?: string;
  performedBy?: string;
  notes?: string;
  reason?: string;
}

interface AuditRow {
  id: string;
  createdAt: string;
  entityType: string;
  action: string;
  reason?: string;
  userName?: string;
  beforeJson?: string;
  afterJson?: string;
}

const ENTRY: Record<string, { label: string; cls: string }> = {
  ISSUE: { label: 'Issued', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  RETURN: { label: 'Returned', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  PURCHASE: { label: 'Purchase', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ADJUST: { label: 'Adjust', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  VOID_PURCHASE: { label: 'Void', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const ACTION: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  CLOSE: 'bg-blue-50 text-blue-700 border-blue-200',
  REOPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  VOID: 'bg-red-50 text-red-700 border-red-200',
  EMAIL: 'bg-slate-100 text-slate-600 border-slate-200',
  ADJUST: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function AuditTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [view, setView] = useState<View>('jobs');
  const [startDate, setStartDate] = useState(today.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState<Activity[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        matV3.jobActivity({ startDate, endDate }),
        matV3.audit({ startDate, endDate }),
      ]);
      setActivity(Array.isArray(a) ? a : []);
      setAuditRows(Array.isArray(b) ? b : []);
      setErr('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredActivity = useMemo(
    () =>
      activity.filter((a) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (a.materialName || '').toLowerCase().includes(q) ||
          (a.jobCode || '').toLowerCase().includes(q) ||
          (a.jobTitle || '').toLowerCase().includes(q) ||
          (a.clientName || '').toLowerCase().includes(q) ||
          (a.performedBy || '').toLowerCase().includes(q)
        );
      }),
    [activity, search]
  );

  const filteredAudit = useMemo(
    () =>
      auditRows.filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (r.entityType || '').toLowerCase().includes(q) ||
          (r.action || '').toLowerCase().includes(q) ||
          (r.userName || '').toLowerCase().includes(q) ||
          (r.reason || '').toLowerCase().includes(q)
        );
      }),
    [auditRows, search]
  );

  const exportCsv = () => {
    const rows =
      view === 'jobs'
        ? [
            ['Date', 'Type', 'Day', 'Material', 'SKU', 'Qty', 'Job', 'Client', 'By', 'Notes'],
            ...filteredActivity.map((a) => [
              new Date(a.date).toLocaleString(),
              a.entryType,
              a.dayNumber ?? '',
              a.materialName,
              a.materialSku,
              (a.direction === 'OUT' ? '-' : '+') + a.quantity,
              a.jobCode || '',
              a.clientName || '',
              a.performedBy || '',
              a.notes || '',
            ]),
          ]
        : [
            ['Date', 'Entity', 'Action', 'By', 'Reason'],
            ...filteredAudit.map((r) => [
              new Date(r.createdAt).toLocaleString(),
              r.entityType,
              r.action,
              r.userName || '',
              r.reason || '',
            ]),
          ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `materials-audit_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </Field>
          <Field label="To">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </Field>
          <Field label="Search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Material, job, client, user…"
              className="input min-w-[220px]"
            />
          </Field>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>

        <div className="mt-4 border-b border-slate-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setView('jobs')}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                view === 'jobs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Job Activity ({activity.length})
            </button>
            <button
              onClick={() => setView('changes')}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                view === 'changes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All Changes ({auditRows.length})
            </button>
          </nav>
        </div>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{err}</div>}

      {view === 'jobs' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filteredActivity.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No job material movements in this range.
                    </td>
                  </tr>
                )}
                {filteredActivity.map((a) => {
                  const e = ENTRY[a.entryType] || { label: a.entryType, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(a.date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${e.cls}`}>
                          {e.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {a.materialName}
                        <span className="ml-1.5 font-mono text-xs text-slate-400">{a.materialSku}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${a.direction === 'OUT' ? 'text-blue-700' : 'text-teal-700'}`}>
                        {a.direction === 'OUT' ? '−' : '+'}
                        {a.quantity} <span className="text-xs font-normal text-slate-400">{a.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono text-xs">{a.jobCode || '—'}</span>
                        {a.clientName && <span className="block text-xs text-slate-400">{a.clientName}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{a.dayNumber ? `Day ${a.dayNumber}` : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{a.performedBy || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'changes' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">By</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filteredAudit.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No changes in this range.
                    </td>
                  </tr>
                )}
                {filteredAudit.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.entityType}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                          ACTION[r.action] || 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.userName || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

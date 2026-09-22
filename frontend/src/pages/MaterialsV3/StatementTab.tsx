import { useEffect, useMemo, useState } from 'react';
import { Search, Printer, Download } from 'lucide-react';
import { matV3 } from '../../services/materialsV3';

interface Txn {
  id: string;
  date: string;
  type: string;
  direction: string;
  inQty: number;
  outQty: number;
  stockBefore: number;
  stockAfter: number;
  amount: number;
  jobId?: string;
  jobCode?: string;
  jobTitle?: string;
  dayNumber?: number;
  purchaseNumber?: string;
  vendorName?: string;
  notes?: string;
  reason?: string;
}
interface Stmt {
  materialId: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  minStockLevel: number;
  purchaseUnitCost: number;
  chargeUnitPrice: number;
  opening: number;
  purchased: number;
  issued: number;
  returned: number;
  damaged: number;
  adjusted: number;
  closing: number;
  stockNow: number;
  closingValue: number;
  lowStock: boolean;
  transactions: Txn[];
}

const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  PURCHASE: { label: 'Purchase', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ISSUE: { label: 'Issued', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  RETURN: { label: 'Returned', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  ADJUST: { label: 'Adjust', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  VOID_PURCHASE: { label: 'Void', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function StatementTab() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [data, setData] = useState<{ statements: Stmt[]; totals: any; lowStockCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState<Stmt | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await matV3.statement({ startDate, endDate });
      setData(res);
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

  const statements = data?.statements || [];
  const filtered = useMemo(
    () =>
      statements.filter((s) => {
        if (onlyLow && !s.lowStock) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q);
      }),
    [statements, search, onlyLow]
  );

  const totals = data?.totals || { opening: 0, purchased: 0, issued: 0, returned: 0, damaged: 0, closing: 0, closingValue: 0 };

  const exportCsv = () => {
    const header = [
      'SKU', 'Material', 'Unit', 'Opening', 'Purchased', 'Issued', 'Returned', 'Damaged', 'Closing', 'Stock Now',
      'Purchase Rate', 'Job Rate', 'Value',
    ];
    const rows = filtered.map((s) => [
      s.sku, s.name, s.unit, s.opening, s.purchased, s.issued, s.returned, s.damaged, s.closing, s.stockNow,
      s.purchaseUnitCost.toFixed(3), s.chargeUnitPrice.toFixed(3), s.closingValue.toFixed(3),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-statement_${startDate}_to_${endDate}.csv`;
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
          <div className="relative flex-1 min-w-[200px]">
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Search</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 bottom-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Material or SKU…"
              className="input pl-9"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="rounded" />
            Low stock only
          </label>
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Period movement bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Period Movement (all materials)
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Chip label="Opening" value={totals.opening} />
          <Arrow />
          <Chip label="Purchased" value={totals.purchased} tone="emerald" />
          <Arrow />
          <Chip label="Returned" value={totals.returned} tone="teal" />
          <Arrow />
          <Chip label="Issued" value={totals.issued} tone="blue" minus />
          <Arrow />
          <Chip label="Closing" value={totals.closing} tone="slate" bold />
          <span className="ml-auto text-xs text-slate-500">
            Stock value: <strong className="text-slate-800">{totals.closingValue.toFixed(3)} KWD</strong>
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Closing = Opening + Purchased + Returned ± Adjust − Issued. Damaged stock never returns to stock.
        </p>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{err}</div>}

      {/* Summary table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-sheet">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide">
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Material</th>
                <th className="px-3 py-3 text-right">Opening</th>
                <th className="px-3 py-3 text-right">Purchased</th>
                <th className="px-3 py-3 text-right">Issued</th>
                <th className="px-3 py-3 text-right">Returned</th>
                <th className="px-3 py-3 text-right">Damaged</th>
                <th className="px-3 py-3 text-right">Closing</th>
                <th className="px-3 py-3 text-right">Stock Now</th>
                <th className="px-3 py-3 text-right">Value</th>
                <th className="px-3 py-3 text-center no-print">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                    No materials in this range.
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.materialId} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{s.sku}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    {s.name}
                    {s.lowStock && (
                      <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        LOW
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{s.opening}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-700">{s.purchased || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-blue-700">{s.issued || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-teal-700">{s.returned || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-red-600">{s.damaged || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{s.closing}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{s.stockNow}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{s.closingValue.toFixed(3)}</td>
                  <td className="px-3 py-2.5 text-center no-print">
                    <button
                      onClick={() => setDetail(s)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-800">
                <tr>
                  <td className="px-3 py-3" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-3 text-right">{totals.opening}</td>
                  <td className="px-3 py-3 text-right">{totals.purchased}</td>
                  <td className="px-3 py-3 text-right">{totals.issued}</td>
                  <td className="px-3 py-3 text-right">{totals.returned}</td>
                  <td className="px-3 py-3 text-right">{totals.damaged}</td>
                  <td className="px-3 py-3 text-right">{totals.closing}</td>
                  <td className="px-3 py-3 text-right"></td>
                  <td className="px-3 py-3 text-right">{totals.closingValue.toFixed(3)}</td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Drill-down */}
      {detail && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900">{detail.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{detail.sku} • {detail.unit}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700 text-sm">
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 print-sheet">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <Mini label="Opening" value={detail.opening} />
                <Mini label="Purchased" value={detail.purchased} tone="emerald" />
                <Mini label="Issued" value={detail.issued} tone="blue" />
                <Mini label="Returned" value={detail.returned} tone="teal" />
                <Mini label="Damaged" value={detail.damaged} tone="red" />
                <Mini label="Closing" value={detail.closing} bold />
                <Mini label="Stock Now" value={detail.stockNow} bold />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Reference</th>
                      <th className="px-3 py-2.5 text-right">In</th>
                      <th className="px-3 py-2.5 text-right">Out</th>
                      <th className="px-3 py-2.5 text-right">Before</th>
                      <th className="px-3 py-2.5 text-right">After</th>
                      <th className="px-3 py-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.transactions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                          No transactions in this range.
                        </td>
                      </tr>
                    )}
                    {detail.transactions.map((t) => {
                      const st = TYPE_STYLE[t.type] || { label: t.type, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {t.purchaseNumber && (
                              <span className="font-mono text-xs">
                                {t.purchaseNumber}
                                {t.vendorName ? ` • ${t.vendorName}` : ''}
                              </span>
                            )}
                            {t.jobCode && (
                              <span>
                                <span className="font-mono text-xs">{t.jobCode}</span>
                                {t.dayNumber ? ` • Day ${t.dayNumber}` : ''}
                                {t.jobTitle ? ` • ${t.jobTitle}` : ''}
                              </span>
                            )}
                            {!t.purchaseNumber && !t.jobCode && (
                              <span className="text-slate-400">{t.notes || t.reason || '—'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-emerald-700 font-medium">
                            {t.inQty || ''}
                          </td>
                          <td className="px-3 py-2.5 text-right text-blue-700 font-medium">{t.outQty || ''}</td>
                          <td className="px-3 py-2.5 text-right text-slate-400">{t.stockBefore}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-800">{t.stockAfter}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{t.amount.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, tone = 'slate', minus, bold }: { label: string; value: number; tone?: string; minus?: boolean; bold?: boolean }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${tones[tone]} ${bold ? 'font-semibold' : ''}`}>
      <span className="text-xs opacity-80">{label}</span>
      <span>{minus ? '−' : ''}{value}</span>
    </span>
  );
}
const Arrow = () => <span className="text-slate-300">→</span>;

function Mini({ label, value, tone = 'slate', bold }: { label: string; value: number; tone?: string; bold?: boolean }) {
  const t: Record<string, string> = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    teal: 'text-teal-700',
    red: 'text-red-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg mt-0.5 ${bold ? 'font-semibold' : 'font-medium'} ${t[tone]}`}>{value}</p>
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

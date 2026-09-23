import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Printer, Paperclip, Lock, Unlock, Trash2, Pencil, X, Save, AlertTriangle, FileText, BarChart3,
} from 'lucide-react';
import { matV3 } from '../../services/materialsV3';

interface JobMaterialsV3Props {
  jobId: string;
  jobStatus?: string;
  onUpdate?: () => void;
}

interface Line {
  id: string;
  dayNumber: number;
  workDate: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  unit: string;
  qtyIssued: number;
  qtyReturned: number;
  qtyDamaged: number;
  usedQty: number;
  chargeUnitPrice: number;
  chargeRate: number;
  usedAmount: number;
  notes?: string;
}

export default function JobMaterialsV3({ jobId, onUpdate }: JobMaterialsV3Props) {
  const [data, setData] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [role, setRole] = useState('');
  const [activeDay, setActiveDay] = useState<number | 'all'>('all');
  const [showLine, setShowLine] = useState(false);
  const [editing, setEditing] = useState<Line | null>(null);
  const [showFinance, setShowFinance] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'blank' | 'filled'>('blank');
  const fileRef = useRef<HTMLInputElement>(null);
  const printedRef = useRef<HTMLDivElement>(null);

  const canEdit = role === 'ADMIN' || role === 'MANAGER';
  const isAdmin = role === 'ADMIN';
  const locked = !!data?.materialsLocked;
  /** the sheet has been printed -> out quantities are frozen (admin can override with a reason) */
  const issuedLockedNow = !!data?.issuedLocked;

  const blankLine = (day: number) => ({
    materialId: '',
    dayNumber: day,
    workDate: new Date().toISOString().slice(0, 10),
    qtyIssued: 0,
    qtyReturned: 0,
    qtyDamaged: 0,
    chargeUnitPrice: 0,
    notes: '',
  });
  const [form, setForm] = useState<any>(blankLine(1));

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [jm, mats, rep] = await Promise.all([
        matV3.jobMaterials(jobId),
        matV3.listMaterials(),
        matV3.jobReport(jobId),
      ]);
      setData(jm);
      setMaterials(Array.isArray(mats) ? mats : []);
      setReport(rep);
      setJob(rep?.job || null);
      setErr('');
      // stay on the full "All Days" view so the whole history is always visible
      const days: number[] = (jm?.days || []).map((d: any) => d.dayNumber);
      if (days.length) setActiveDay((prev) => (typeof prev === 'number' && days.includes(prev) ? prev : 'all'));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      setRole(JSON.parse(localStorage.getItem('user') || '{}').role || '');
    } catch {
      /* ignore */
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const allLines: Line[] = data?.lines || [];
  const days: any[] = data?.days || [];
  const materialSummary: any[] = data?.materialSummary || [];
  const unreported: any[] = data?.unreported || [];
  const dayNumbers = useMemo(() => {
    const s = new Set<number>();
    allLines.forEach((l) => s.add(l.dayNumber));
    days.forEach((d) => s.add(d.dayNumber));
    // only keep an empty day tab alive while the user is actually adding to it
    if (showLine && typeof activeDay === 'number') s.add(activeDay);
    return Array.from(s).sort((a, b) => a - b);
  }, [days, allLines, activeDay, showLine]);

  /** Day number to add/edit into when the view is on All Days. */
  const currentDay: number =
    typeof activeDay === 'number'
      ? activeDay
      : dayNumbers.length > 0
        ? dayNumbers[dayNumbers.length - 1]
        : 1;

  const activeLines =
    activeDay === 'all'
      ? [...allLines].sort(
          (a, b) => a.dayNumber - b.dayNumber || (a.materialName || '').localeCompare(b.materialName || '')
        )
      : allLines.filter((l) => l.dayNumber === activeDay);
  const totals = data?.totals || { issued: 0, returned: 0, damaged: 0, used: 0, outside: 0, chargeAmount: 0, purchaseCost: 0 };
  const finance = data?.finance || {};

  /** How much of a material is still out on site for this job. */
  const outstandingFor = (materialId: string) =>
    allLines
      .filter((l) => l.materialId === materialId)
      .reduce((s, l) => s + (l.qtyIssued - l.qtyReturned - l.qtyDamaged), 0);

  const openAdd = () => {
    setEditing(null);
    setForm(blankLine(currentDay));
    setShowLine(true);
  };
  const openEdit = (l: Line) => {
    setEditing(l);
    setForm({
      materialId: l.materialId,
      dayNumber: l.dayNumber,
      workDate: (l.workDate || '').slice(0, 10),
      qtyIssued: l.qtyIssued,
      qtyReturned: l.qtyReturned,
      qtyDamaged: l.qtyDamaged,
      chargeUnitPrice: l.chargeRate,
      notes: l.notes || '',
    });
    setShowLine(true);
  };

  const saveLine = async () => {
    try {
      if (!form.materialId) {
        alert('Select a material');
        return;
      }
      if (editing) {
        const body: any = {
          dayNumber: form.dayNumber,
          workDate: form.workDate,
          qtyIssued: form.qtyIssued,
          qtyReturned: form.qtyReturned,
          qtyDamaged: form.qtyDamaged,
          chargeUnitPrice: form.chargeUnitPrice,
          notes: form.notes,
        };
        if (locked) {
          const reason = window.prompt('Job materials are CLOSED. Admin reason for this change (required):');
          if (!reason || !reason.trim()) return;
          body.reason = reason.trim();
        } else if (issuedLockedNow && form.qtyIssued !== editing.qtyIssued) {
          const reason = window.prompt(
            `The packing list sheet has already been printed.\n\n` +
              `Changing the OUT quantity for ${editing.materialName} (${editing.qtyIssued} → ${form.qtyIssued}) ` +
              `will be recorded against your name.\n\nAdmin reason (required):`
          );
          if (!reason || !reason.trim()) return;
          body.reason = reason.trim();
        }
        await matV3.updateJobLine(jobId, editing.id, body);
      } else {
        await matV3.addJobLine(jobId, form);
      }
      setShowLine(false);
      await load(true);
      onUpdate?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const removeLine = async (l: Line) => {
    const title = locked ? 'Job materials are CLOSED. Reason (admin, required):' : 'Reason for removing this line (required):';
    const reason = window.prompt(`Remove ${l.materialName} (${l.qtyIssued} issued) from Day ${l.dayNumber}?\n\n${title}`);
    if (!reason || !reason.trim()) return;
    try {
      await matV3.deleteJobLine(jobId, l.id, reason.trim());
      await load(true);
      onUpdate?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const saveFinance = async (patch: any) => {
    try {
      await matV3.saveJobFinance(jobId, patch);
      await load(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const closeJob = async () => {
    let force = false;
    if (unreported.length > 0) {
      const list = unreported.map((u) => `${u.materialName} (${u.issued} ${u.unit} issued)`).join(', ');
      const ok = window.confirm(
        `No returns recorded yet for: ${list}.\n\nClose anyway? Those materials will count as fully used.`
      );
      if (!ok) return;
      force = true;
    }
    if (!window.confirm('Close materials for this job?\n\nStock entries will lock and the completion report email will be sent.')) return;
    try {
      const res = await matV3.closeJob(jobId, { force });
      alert(res.emailSent ? 'Job materials closed. Completion email sent.' : 'Job materials closed. (Email could not be sent — check email settings.)');
      await load(true);
      onUpdate?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const reopen = async () => {
    const reason = window.prompt('Reopen job materials? Reason (required):');
    if (!reason || !reason.trim()) return;
    try {
      await matV3.reopenJob(jobId, reason.trim());
      await load(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const attachFile = async (f: File | null) => {
    if (!f) return;
    try {
      await matV3.attachPackingList(jobId, f);
      alert('Packing list attached to this job.');
      await load(true);
    } catch (e: any) {
      alert(e.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  /**
   * Print the packing list sheet.
   *
   * 'blank'  = the sheet that goes out with the crew (everything written by hand).
   *            This is the one that is recorded: copy 1 = ORIGINAL, copy 2+ =
   *            DUPLICATE, so a hand-made replacement sheet has no log entry.
   * 'filled' = a record of what was entered, for the file. Not logged.
   */
  const printPackingList = async (mode: 'blank' | 'filled') => {
    setPrintMode(mode);

    if (mode === 'filled') {
      setTimeout(() => window.print(), 150);
      return;
    }

    const already = data?.printCount || 0;
    let reason = '';
    if (already > 0) {
      const r = window.prompt(
        `This sheet was already printed ${already} time(s).\n\n` +
          `Copy #${already + 1} will be stamped "DUPLICATE" and recorded against your name.\n\n` +
          `Reason for reprint (required):`
      );
      if (!r || !r.trim()) return;
      reason = r.trim();
    }
    try {
      const rec = await matV3.printPackingList(jobId, reason);
      await load(true);
      setTimeout(() => window.print(), 150);
      if (rec?.isDuplicate) {
        setTimeout(() => alert(`Printed as DUPLICATE copy #${rec.printNumber}. This is recorded in the job.`), 300);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  /** The paper comes back before anything is entered — so the photo comes first. */
  const sheetAttached = !!data?.packingList?.attachmentUrl;
  const blockForSheet = () => {
    alert(
      'Attach the photo of the signed packing list sheet first.\n\n' +
        'That paper is the proof for these numbers — nothing can be entered until it is attached.'
    );
  };

  if (loading && !data) {
    return <div className="py-16 text-center text-slate-400 text-sm">Loading job materials…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Packing List</span>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {data?.packingList?.listNumber || '—'}
                </span>
                {locked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <Lock className="w-3 h-3" /> Closed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Unlock className="w-3 h-3" /> Open
                  </span>
                )}
                {(data?.printCount || 0) > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      data.printCount > 1
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Printer className="w-3 h-3" />
                    Printed {data.printCount}×
                    {data.printCount > 1 ? ' — duplicates exist' : ''}
                  </span>
                )}
                {data?.issuedLocked && !locked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <Lock className="w-3 h-3" /> Out locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {job?.jobCode} • {job?.clientName}
              </p>
              {(data?.prints || []).length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {(data.prints as any[])
                    .map(
                      (p) =>
                        `#${p.printNumber} ${new Date(p.createdAt).toLocaleDateString()} ${
                          p.printedByName || ''
                        }${p.reason ? ` (${p.reason})` : ''}`
                    )
                    .join('  ·  ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => attachFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <Paperclip className="w-4 h-4" />
              {data?.packingList?.attachmentUrl ? 'Replace List' : 'Attach Signed List'}
            </button>
            <button
              onClick={() => printPackingList('blank')}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              title="The sheet the crew takes to the warehouse and writes on by hand"
            >
              <Printer className="w-4 h-4" /> Print Blank Sheet
            </button>
            {(data?.lines || []).length > 0 && (
              <button
                onClick={() => printPackingList('filled')}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-50"
                title="A copy of what has been entered, for the file"
              >
                <Printer className="w-4 h-4" /> Print Record
              </button>
            )}
            <button
              onClick={() => setShowFinance(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <FileText className="w-4 h-4" /> Job Price
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <BarChart3 className="w-4 h-4" /> Report
            </button>
            {locked && isAdmin && (
              <button
                onClick={reopen}
                className="inline-flex items-center gap-2 px-3 py-2 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50"
              >
                <Unlock className="w-4 h-4" /> Reopen
              </button>
            )}
            {!locked && canEdit && (
              <button
                onClick={closeJob}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900"
              >
                <Lock className="w-4 h-4" /> Close Job
              </button>
            )}
          </div>
        </div>

        {data?.packingList?.attachmentUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Paperclip className="w-3.5 h-3.5" />
            Signed list attached:&nbsp;
            <a
              href={data.packingList.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              {data.packingList.attachmentName || 'view file'}
            </a>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
        <Mini label="Issued" value={totals.issued} tone="blue" />
        <Mini label="Returned" value={totals.returned} tone="teal" />
        <Mini label="Damaged" value={totals.damaged} tone="red" />
        <Mini label="Used" value={totals.used} tone="slate" bold />
        <Mini label="Job Charge" value={`${(finance.materialsTotal ?? totals.chargeAmount).toFixed(3)} KWD`} tone="slate" bold />
      </div>

      {!sheetAttached && canEdit && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Signed packing list sheet not attached yet
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              The crew's hand-written sheet is the proof behind every number. Attach its photo first — then the material
              details can be entered.
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
          >
            <Paperclip className="w-4 h-4" /> Attach Signed Sheet
          </button>
        </div>
      )}

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 no-print">{err}</div>}

      {/* Day tabs */}
      <div className="bg-white border border-slate-200 rounded-xl no-print">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 pt-3">
          <nav className="flex gap-4 overflow-x-auto">
            {allLines.length > 0 && (
              <button
                onClick={() => setActiveDay('all')}
                className={`whitespace-nowrap pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeDay === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                All Days
                <span className="ml-2 text-xs text-slate-400">
                  {allLines.length} entr{allLines.length === 1 ? 'y' : 'ies'} · {totals.used} used
                </span>
              </button>
            )}
            {dayNumbers.map((d) => {
              const active = d === activeDay;
              const daySum = days.find((x) => x.dayNumber === d)?.summary;
              const dayRows = allLines.filter((l) => l.dayNumber === d);
              return (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  className={`whitespace-nowrap pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Day {d}
                  <span className="ml-2 text-xs text-slate-400">
                    {dayRows.length} entr{dayRows.length === 1 ? 'y' : 'ies'}
                    {daySum ? ` · ${daySum.used} used` : ''}
                  </span>
                </button>
              );
            })}
            {canEdit && !locked && (
              <button
                onClick={() => {
                  if (!sheetAttached) return blockForSheet();
                  const next = dayNumbers.length > 0 ? Math.max(...dayNumbers) + 1 : 1;
                  setActiveDay(next);
                  setEditing(null);
                  setForm(blankLine(next));
                  setShowLine(true);
                }}
                className="whitespace-nowrap pb-3 px-1 text-sm font-medium text-slate-400 hover:text-blue-600 border-b-2 border-transparent inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Day
              </button>
            )}
          </nav>

          {canEdit && !locked && (
            <button
              onClick={() => (sheetAttached ? openAdd() : blockForSheet())}
              className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Material
            </button>
          )}
        </div>

        {/* Lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {activeDay === 'all' && <th className="px-4 py-3">Day</th>}
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Issued</th>
                <th className="px-4 py-3 text-right">Returned</th>
                <th className="px-4 py-3 text-right">Damaged</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeLines.length === 0 && (
                <tr>
                  <td colSpan={(canEdit ? 8 : 7) + (activeDay === 'all' ? 1 : 0)} className="px-4 py-10 text-center text-slate-400">
                    {activeDay === 'all'
                      ? 'No materials recorded for this job yet.'
                      : `Nothing recorded for Day ${activeDay} yet.`}
                  </td>
                </tr>
              )}

              {(() => {
                const rowFor = (l: Line) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    {activeDay === 'all' && (
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Day {l.dayNumber}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{l.materialName}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{l.materialSku}</span>
                      <span className="ml-2 text-xs text-slate-400">{l.unit}</span>
                      {l.workDate && (
                        <span className="ml-2 text-xs text-slate-400">
                          {String(l.workDate).slice(0, 10)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{l.qtyIssued || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-teal-700">{l.qtyReturned || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{l.qtyDamaged || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{l.usedQty}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{l.chargeRate.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{l.usedAmount.toFixed(3)}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {locked ? (
                          <span className="text-xs text-slate-400">locked</span>
                        ) : (
                          <>
                            <button
                              onClick={() => (sheetAttached ? openEdit(l) : blockForSheet())}
                              title="Edit"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => (sheetAttached ? removeLine(l) : blockForSheet())}
                              title="Remove"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );

                if (activeDay !== 'all') return activeLines.map(rowFor);

                // All Days: group by day, with a subtotal line per day
                return dayNumbers
                  .filter((d) => activeLines.some((l) => l.dayNumber === d))
                  .map((d) => {
                    const rows = activeLines.filter((l) => l.dayNumber === d);
                    const sub = rows.reduce(
                      (a, l) => ({
                        issued: a.issued + (l.qtyIssued || 0),
                        returned: a.returned + (l.qtyReturned || 0),
                        damaged: a.damaged + (l.qtyDamaged || 0),
                        amount: a.amount + (l.usedAmount || 0),
                      }),
                      { issued: 0, returned: 0, damaged: 0, amount: 0 }
                    );
                    return (
                      <Fragment key={`day-${d}`}>
                        <tr className="bg-slate-50/80">
                          <td colSpan={(canEdit ? 8 : 7) + 1} className="px-4 py-2">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              Day {d}
                            </span>
                            <span className="ml-3 text-xs text-slate-500">
                              {sub.issued} out · {sub.returned} back · {sub.damaged} damaged ·{' '}
                              {sub.issued - sub.returned - sub.damaged} used
                            </span>
                            <span className="ml-3 text-xs font-semibold text-slate-700">
                              {sub.amount.toFixed(3)} KWD
                            </span>
                          </td>
                        </tr>
                        {rows.map(rowFor)}
                      </Fragment>
                    );
                  });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Material summary — what was used and what it costs */}
      {materialSummary.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden no-print">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Job Material Summary</p>
            <p className="text-xs text-slate-400">
              Used = Issued − Returned − Damaged · Our cost {(totals.purchaseCost || 0).toFixed(3)} KWD
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Issued</th>
                  <th className="px-4 py-3 text-right">Returned</th>
                  <th className="px-4 py-3 text-right">Damaged</th>
                  <th className="px-4 py-3 text-right">Used</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materialSummary.map((m: any) => (
                  <tr key={m.materialId} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{m.materialName}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{m.materialSku}</span>
                      {m.unreported && (
                        <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          no returns recorded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 font-medium">{m.issued || '—'}</td>
                    <td className="px-4 py-3 text-right text-teal-700 font-medium">{m.returned || '—'}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{m.damaged || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{m.used}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{(m.chargeRate || 0).toFixed(3)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{m.amount.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-800">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{totals.issued}</td>
                  <td className="px-4 py-3 text-right">{totals.returned}</td>
                  <td className="px-4 py-3 text-right">{totals.damaged}</td>
                  <td className="px-4 py-3 text-right">{totals.used}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">{totals.chargeAmount.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Reminder: issued but no returns entered yet */}
      {unreported.length > 0 && !locked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 no-print">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Returns not entered yet</strong> for:{' '}
            {unreported.map((u: any) => `${u.materialName} (${u.issued} ${u.unit})`).join(', ')}. Enter what the crew
            brought back before closing.
          </div>
        </div>
      )}

      {/* ---------- Line form ---------- */}
      {showLine && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {editing ? `Edit ${editing.materialName}` : `Add Material — Day ${form.dayNumber}`}
              </h3>
              <button onClick={() => setShowLine(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editing && (
                <Field label="Material">
                  <select
                    value={form.materialId}
                    onChange={(e) => {
                      const m = materials.find((x) => x.id === e.target.value);
                      setForm({ ...form, materialId: e.target.value, chargeUnitPrice: m?.chargeUnitPrice || 0 });
                    }}
                    className="input"
                  >
                    <option value="">Select material…</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.onHand <= 0}>
                        {m.name} ({m.sku}) — stock {m.onHand}
                        {m.onHand <= 0 ? ' — none' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Day Number">
                  <input
                    type="number"
                    min="1"
                    value={form.dayNumber}
                    onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
                <Field label="Work Date">
                  <input
                    type="date"
                    value={form.workDate}
                    onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label={issuedLockedNow ? 'Issued (frozen)' : 'Issued'}>
                  <input
                    type="number"
                    min="0"
                    value={form.qtyIssued}
                    onChange={(e) => setForm({ ...form, qtyIssued: Number(e.target.value) })}
                    className={`input ${issuedLockedNow && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                    disabled={issuedLockedNow && !isAdmin}
                    title={
                      issuedLockedNow && !isAdmin
                        ? 'The sheet has been printed — the out quantity is frozen. Ask admin.'
                        : ''
                    }
                  />
                </Field>
                <Field label="Returned (good)">
                  <input
                    type="number"
                    min="0"
                    value={form.qtyReturned}
                    onChange={(e) => setForm({ ...form, qtyReturned: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
                <Field label="Damaged">
                  <input
                    type="number"
                    min="0"
                    value={form.qtyDamaged}
                    onChange={(e) => setForm({ ...form, qtyDamaged: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
              </div>

              {form.materialId && (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  Still out on site for this material:{' '}
                  <strong className="text-slate-800">
                    {editing
                      ? outstandingFor(form.materialId) - editing.qtyIssued + editing.qtyReturned + editing.qtyDamaged
                      : outstandingFor(form.materialId)}
                  </strong>
                  . You can return up to that much (plus what you issue now).
                </div>
              )}

              {issuedLockedNow && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This sheet has already been printed{data?.printCount > 1 ? ` (${data.printCount} copies exist)` : ''}.
                  The <strong>Issued (out)</strong> quantity is frozen — only the return can be filled in. An admin can
                  still change it, with a reason.
                </div>
              )}

              <Field label="Job Rate (we charge per unit)">
                <input
                  type="number"
                  step="0.001"
                  value={form.chargeUnitPrice}
                  onChange={(e) => setForm({ ...form, chargeUnitPrice: Number(e.target.value) })}
                  className="input"
                />
              </Field>

              <Field label="Notes">
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input"
                  placeholder="Optional"
                />
              </Field>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-slate-600">Used = Issued − Returned − Damaged</span>
                <strong className="text-slate-900">
                  {Math.max(0, (form.qtyIssued || 0) - (form.qtyReturned || 0) - (form.qtyDamaged || 0))}
                </strong>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setShowLine(false)} className="px-4 py-2 text-sm font-medium text-slate-600">
                Cancel
              </button>
              <button
                onClick={saveLine}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Finance modal ---------- */}
      {showFinance && (
        <FinanceModal
          finance={finance}
          totals={totals}
          locked={locked}
          isAdmin={isAdmin}
          onClose={() => setShowFinance(false)}
          onSave={async (patch) => {
            await saveFinance(patch);
            setShowFinance(false);
          }}
        />
      )}

      {/* ---------- Report modal ---------- */}
      {showReport && report && (
        <ReportModal report={report} onClose={() => setShowReport(false)} />
      )}

      {/* Print-only packing list sheet */}
      <div className="hidden print:block print-sheet" ref={printedRef}>
        <PackingListPrint data={data} job={job} lines={allLines} blank={printMode === 'blank'} />
      </div>
    </div>
  );
}

/* ============ sub components ============ */

function FinanceModal({ finance, totals, locked, isAdmin, onClose, onSave }: {
  finance: any; totals: any; locked: boolean; isAdmin: boolean;
  onClose: () => void; onSave: (patch: any) => void;
}) {
  const initialAuto = finance.materialsTotal ?? totals.chargeAmount;
  const [mode, setMode] = useState<string>(finance.materialsChargeMode || 'AUTO');
  const [manual, setManual] = useState<number>(finance.manualMaterialsTotal ?? initialAuto);
  const [labor, setLabor] = useState<number>(finance.laborCost || 0);
  const [transport, setTransport] = useState<number>(finance.transportCost || 0);
  const [other, setOther] = useState<number>(finance.otherCost || 0);
  const [discount, setDiscount] = useState<number>(finance.discount || 0);
  const [notes, setNotes] = useState<string>(finance.notes || '');

  const materialsTotal = mode === 'MANUAL' ? manual : totals.chargeAmount;
  const grand = materialsTotal + labor + transport + other - discount;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Job Price</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-2">Materials charge</span>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('AUTO')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border ${
                  mode === 'AUTO' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                Auto (used × rate)
              </button>
              <button
                onClick={() => setMode('MANUAL')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border ${
                  mode === 'MANUAL' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                Manual total
              </button>
            </div>
          </div>

          <Field label="Materials Total (KWD)">
            <input
              type="number"
              step="0.001"
              value={mode === 'MANUAL' ? manual : totals.chargeAmount}
              disabled={mode === 'AUTO'}
              onChange={(e) => setManual(Number(e.target.value))}
              className={`input ${mode === 'AUTO' ? 'bg-slate-50 text-slate-500' : ''}`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Labor (KWD)">
              <input type="number" step="0.001" value={labor} onChange={(e) => setLabor(Number(e.target.value))} className="input" />
            </Field>
            <Field label="Transport (KWD)">
              <input type="number" step="0.001" value={transport} onChange={(e) => setTransport(Number(e.target.value))} className="input" />
            </Field>
            <Field label="Other (KWD)">
              <input type="number" step="0.001" value={other} onChange={(e) => setOther(Number(e.target.value))} className="input" />
            </Field>
            <Field label="Discount (KWD)">
              <input type="number" step="0.001" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="input" />
            </Field>
          </div>

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
          </Field>

          <div className="flex items-center justify-between bg-slate-800 text-white rounded-lg px-4 py-3">
            <span className="text-sm">Job Total</span>
            <span className="text-lg font-semibold">{grand.toFixed(3)} KWD</span>
          </div>

          <p className="text-xs text-slate-400">
            Material cost to us for used items: {totals.purchaseCost.toFixed(3)} KWD. Margin on materials:{' '}
            {(materialsTotal - totals.purchaseCost).toFixed(3)} KWD.
          </p>

          {locked && !isAdmin && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Job is closed — only admin can change pricing.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                materialsChargeMode: mode,
                manualMaterialsTotal: manual,
                laborCost: labor,
                transportCost: transport,
                otherCost: other,
                discount,
                notes,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" /> Save Price
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({ report, onClose }: { report: any; onClose: () => void }) {
  const c = report.calculation || {};
  const totals = report.totals || {};
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 no-print">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Job Material Report</h3>
            <p className="text-xs text-slate-500">
              {report.job?.jobCode} • {report.job?.jobTitle}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-sm rounded-lg hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">
              Close
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Issued" value={totals.issued} tone="blue" />
            <Mini label="Returned" value={totals.returned} tone="teal" />
            <Mini label="Damaged" value={totals.damaged} tone="red" />
            <Mini label="Used" value={totals.used} bold />
          </div>

          {(report.days || []).map((d: any) => (
            <div key={d.dayNumber} className="border border-slate-200 rounded-lg overflow-hidden print-avoid-break">
              <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Day {d.dayNumber}</span>
                <span className="text-xs text-slate-500">
                  {d.workDate ? new Date(d.workDate).toLocaleDateString() : ''} • {d.summary.used} used •{' '}
                  {d.summary.amount.toFixed(3)} KWD
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-4 py-2">Material</th>
                    <th className="px-4 py-2 text-right">Issued</th>
                    <th className="px-4 py-2 text-right">Returned</th>
                    <th className="px-4 py-2 text-right">Damaged</th>
                    <th className="px-4 py-2 text-right">Used</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.lines.map((l: any) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2 text-slate-800">{l.materialName}</td>
                      <td className="px-4 py-2 text-right">{l.qtyIssued || '—'}</td>
                      <td className="px-4 py-2 text-right">{l.qtyReturned || '—'}</td>
                      <td className="px-4 py-2 text-right">{l.qtyDamaged || '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">{l.usedQty}</td>
                      <td className="px-4 py-2 text-right">{l.chargeRate.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right font-medium">{l.usedAmount.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="border border-slate-200 rounded-lg p-4 space-y-2">
            <Row label="Materials (used × rate)" value={c.materialsTotal} />
            <Row label="Labor" value={c.laborCost} />
            <Row label="Transport" value={c.transportCost} />
            <Row label="Other" value={c.otherCost} />
            <Row label="Discount" value={-(c.discount || 0)} />
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Job Total</span>
              <span className="text-lg font-semibold text-slate-900">{(c.grandTotal || 0).toFixed(3)} KWD</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Our cost of used materials</span>
              <span>{(c.purchaseCostOfUsed || 0).toFixed(3)} KWD</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Material margin</span>
              <span>{(c.materialProfit || 0).toFixed(3)} KWD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackingListPrint({ data, job, lines, blank = false }: any) {
  const byDay: Record<number, any[]> = {};
  lines.forEach((l: Line) => {
    (byDay[l.dayNumber] ||= []).push(l);
  });
  const dayKeys = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  const printCount = data?.printCount || 0;
  const lastPrint = (data?.prints || []).slice(-1)[0];
  const isDuplicate = printCount > 1;

  return (
    <div className="text-slate-900">
      {isDuplicate && (
        <div className="border-2 border-slate-900 text-center py-2 mb-3">
          <p className="text-lg font-bold tracking-widest">DUPLICATE — COPY #{printCount}</p>
          <p className="text-xs">
            NOT THE ORIGINAL SHEET. Original issued {data?.packingList?.firstPrintedAt
              ? new Date(data.packingList.firstPrintedAt).toLocaleString()
              : '—'}
            {lastPrint?.reason ? ` · Reason: ${lastPrint.reason}` : ''}
          </p>
        </div>
      )}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold">QGO CARGO — PACKING LIST</h1>
        <p className="text-sm">
          List No: <strong>{data?.packingList?.listNumber}</strong>
          {printCount > 0 && (
            <>
              {'  ·  '}
              <strong>PRINT #{printCount}</strong>
              {lastPrint?.createdAt && <> ({new Date(lastPrint.createdAt).toLocaleString()})</>}
              {lastPrint?.printedByName && <> — {lastPrint.printedByName}</>}
            </>
          )}
        </p>
        {printCount === 0 && <p className="text-xs text-slate-500">Not yet printed from the system</p>}
      </div>
      <table className="w-full text-xs mb-4">
        <tbody>
          <tr>
            <td className="py-1 w-1/2">
              <strong>Job:</strong> {job?.jobCode}
            </td>
            <td className="py-1">
              <strong>Client:</strong> {job?.clientName}
            </td>
          </tr>
          <tr>
            <td className="py-1">
              <strong>Address:</strong> {job?.jobAddress}
            </td>
            <td className="py-1">
              <strong>Date:</strong> {job?.jobDate ? new Date(job.jobDate).toLocaleDateString() : ''}
            </td>
          </tr>
        </tbody>
      </table>

      {blank ? (
        /* The sheet that goes out with the crew: everything is written by hand */
        <div className="mb-4 print-avoid-break">
          <h3 className="font-semibold text-sm mb-1">
            1. OUT — material taken from warehouse (write by hand, one line per material per day)
          </h3>
          <table className="w-full text-xs border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 text-left w-12">Day</th>
                <th className="border border-slate-300 px-2 py-1 text-left">Material</th>
                <th className="border border-slate-300 px-2 py-1 text-right w-16">Qty</th>
                <th className="border border-slate-300 px-2 py-1 text-left w-20">Unit</th>
                <th className="border border-slate-300 px-2 py-1 text-left w-32">Remark</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 16 }).map((_, i) => (
                <tr key={`out-${i}`}>
                  <td className="border border-slate-300 px-2 py-2.5"></td>
                  <td className="border border-slate-300 px-2 py-2.5"></td>
                  <td className="border border-slate-300 px-2 py-2.5"></td>
                  <td className="border border-slate-300 px-2 py-2.5"></td>
                  <td className="border border-slate-300 px-2 py-2.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        dayKeys.map((d) => (
          <div key={d} className="mb-4 print-avoid-break">
            <h3 className="font-semibold text-sm mb-1">Day {d}</h3>
            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">Material</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-20">Issued</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-20">Returned</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-20">Damaged</th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-16">Used</th>
                  <th className="border border-slate-300 px-2 py-1 w-28">Crew Note</th>
                </tr>
              </thead>
              <tbody>
                {byDay[d].map((l) => (
                  <tr key={l.id}>
                    <td className="border border-slate-300 px-2 py-1">
                      {l.materialName} <span className="text-slate-400">({l.unit})</span>
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{l.qtyIssued || ''}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{l.qtyReturned || ''}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{l.qtyDamaged || ''}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{l.usedQty}</td>
                    <td className="border border-slate-300 px-2 py-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Return sheet — the crew writes what actually came back on this same paper */}
      <div className="mt-6 print-avoid-break">
        <h3 className="font-semibold text-sm mb-1">
          {blank
            ? '2. RETURN to warehouse (write by hand when the material comes back — 3 signatures below)'
            : 'Return to Warehouse (filled by crew on site)'}
        </h3>
        <table className="w-full text-xs border border-slate-300">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-left">Material</th>
              <th className="border border-slate-300 px-2 py-1 text-right w-20">Out</th>
              <th className="border border-slate-300 px-2 py-1 text-right w-20">Returned</th>
              <th className="border border-slate-300 px-2 py-1 text-right w-20">Damaged</th>
              <th className="border border-slate-300 px-2 py-1 text-left w-32">Remark</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={`ret-${i}`}>
                <td className="border border-slate-300 px-2 py-3"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
                <td className="border border-slate-300 px-2 py-3"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 text-xs">
        <div>
          <p className="mb-8">Packer / Crew: ______________________</p>
          <p>Name: ______________________</p>
        </div>
        <div>
          <p className="mb-8">Supervisor: ______________________</p>
          <p>Name: ______________________</p>
        </div>
        <div>
          <p className="mb-8">Warehouse In-charge: ______________________</p>
          <p>Date: ______________________</p>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
        <span>
          {data?.packingList?.listNumber} · {job?.jobCode}
        </span>
        <span>
          PRINT #{printCount}
          {isDuplicate ? ` (DUPLICATE — copy ${printCount})` : ' (ORIGINAL)'}
        </span>
      </div>
    </div>
  );
}

function Mini({ label, value, tone = 'slate', bold }: { label: string; value: any; tone?: string; bold?: boolean }) {
  const t: Record<string, string> = {
    slate: 'text-slate-900',
    blue: 'text-blue-700',
    teal: 'text-teal-700',
    red: 'text-red-600',
    amber: 'text-amber-700',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg mt-0.5 ${bold ? 'font-semibold' : 'font-medium'} ${t[tone]}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-800 font-medium">{(value || 0).toFixed(3)} KWD</span>
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

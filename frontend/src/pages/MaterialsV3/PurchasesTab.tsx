import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Save, Ban, Pencil, Boxes, Package } from 'lucide-react';
import { matV3 } from '../../services/materialsV3';

interface Item {
  materialId: string;
  mode: 'unit' | 'pack';
  quantity: number; // unit mode: base units
  unitCost: number; // unit mode: per base unit
  packUnit: string; // 'BOX'
  packQty: number; // how many boxes
  unitsPerPack: number; // pieces inside one box
  packCost: number; // price per box
}
interface Purchase {
  id: string;
  purchaseNumber: string;
  vendorName: string;
  invoiceNumber?: string;
  purchaseDate: string;
  notes?: string;
  totalAmount: number;
  status: string;
  voidReason?: string;
  items: any[];
}

const PACK_UNITS = ['BOX', 'CARTON', 'PACK', 'CASE', 'ROLL', 'SET', 'BUNDLE', 'PALLET'];

const blankLine = (): Item => ({
  materialId: '',
  mode: 'unit',
  quantity: 1,
  unitCost: 0,
  packUnit: 'BOX',
  packQty: 1,
  unitsPerPack: 0,
  packCost: 0,
});

/** What this line actually adds to stock, and at what per-unit cost. */
function lineTotals(l: Item) {
  if (l.mode === 'pack' && l.packQty > 0 && l.unitsPerPack > 0) {
    const units = l.packQty * l.unitsPerPack;
    const total = l.packCost > 0 ? l.packQty * l.packCost : 0;
    return { units, total, perUnit: units > 0 ? total / units : 0 };
  }
  const units = l.quantity || 0;
  const total = (l.quantity || 0) * (l.unitCost || 0);
  return { units, total, perUnit: l.unitCost || 0 };
}

export default function PurchasesTab() {
  const [list, setList] = useState<Purchase[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [role, setRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);

  const isAdmin = role === 'ADMIN';
  const canEdit = role === 'ADMIN' || role === 'MANAGER';

  const blankForm = () => ({
    vendorName: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [blankLine()] as Item[],
  });
  const [form, setForm] = useState<any>(blankForm());

  const load = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([matV3.listPurchases(), matV3.listMaterials()]);
      setList(Array.isArray(p) ? p : []);
      setMaterials(Array.isArray(m) ? m : []);
      setErr('');
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
  }, []);

  const setLine = (idx: number, patch: Partial<Item>) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], ...patch };

    // Auto-fill from the material: unit cost, and how it was bought last time
    if (patch.materialId) {
      const mat = materials.find((m) => m.id === patch.materialId);
      if (mat) {
        if (!items[idx].unitCost) items[idx].unitCost = mat.purchaseUnitCost || 0;
        if (mat.lastPack) {
          items[idx].mode = 'pack';
          items[idx].packUnit = items[idx].packUnit || mat.lastPack.packUnit || 'BOX';
          items[idx].unitsPerPack = items[idx].unitsPerPack || mat.lastPack.unitsPerPack || 0;
          items[idx].packCost = items[idx].packCost || mat.lastPack.packCost || 0;
        }
      }
    }
    setForm({ ...form, items });
  };

  const addLine = () => setForm({ ...form, items: [...form.items, blankLine()] });
  const dupLine = (i: number) => setForm({ ...form, items: [...form.items, { ...form.items[i] }] });
  const delLine = (i: number) => setForm({ ...form, items: form.items.filter((_: any, x: number) => x !== i) });

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setShowForm(true);
  };

  const openEdit = (p: Purchase) => {
    setEditing(p);
    setForm({
      vendorName: p.vendorName,
      invoiceNumber: p.invoiceNumber || '',
      purchaseDate: (p.purchaseDate || '').slice(0, 10),
      notes: p.notes || '',
      items: p.items.map((i: any) => ({
        materialId: i.materialId,
        mode: i.packUnit && i.unitsPerPack ? 'pack' : 'unit',
        quantity: i.quantity,
        unitCost: i.unitCost,
        packUnit: i.packUnit || 'BOX',
        packQty: i.packQty || 1,
        unitsPerPack: i.unitsPerPack || 0,
        packCost: i.packCost || 0,
      })),
    });
    setShowForm(true);
  };

  const payloadItems = () =>
    form.items
      .map((l: Item) => {
        if (l.mode === 'pack') {
          const t = lineTotals(l);
          return {
            materialId: l.materialId,
            packUnit: l.packUnit,
            packQty: l.packQty,
            unitsPerPack: l.unitsPerPack,
            packCost: l.packCost,
            quantity: t.units,
            unitCost: t.perUnit,
          };
        }
        return { materialId: l.materialId, quantity: l.quantity, unitCost: l.unitCost };
      })
      .filter((i: any) => i.materialId && (i.quantity > 0 || (i.packQty > 0 && i.unitsPerPack > 0)));

  const save = async () => {
    try {
      if (!form.vendorName.trim()) {
        alert('Vendor name is required');
        return;
      }
      const items = payloadItems();
      if (items.length === 0) {
        alert('Add at least one material with a quantity');
        return;
      }
      if (editing) {
        const reason = window.prompt('Reason for editing purchase ' + editing.purchaseNumber + ' (required):');
        if (!reason || !reason.trim()) return;
        await matV3.updatePurchase(editing.id, { ...form, items, reason: reason.trim() });
      } else {
        await matV3.createPurchase({ ...form, items });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const voidPurchase = async (p: Purchase) => {
    const reason = window.prompt(
      'Void purchase ' + p.purchaseNumber + ' (' + p.vendorName + ')?\n\nThis removes the stock. Type reason (required):'
    );
    if (!reason || !reason.trim()) return;
    try {
      await matV3.voidPurchase(p.id, reason.trim());
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formTotal = form.items.reduce((s: number, l: Item) => s + lineTotals(l).total, 0);
  const formUnits = form.items.reduce((s: number, l: Item) => s + lineTotals(l).units, 0);
  const active = list.filter((p) => p.status !== 'VOID');
  const totalSpend = active.reduce((s, p) => s + (p.totalAmount || 0), 0);

  const describeItem = (i: any) => {
    if (i.packUnit && i.unitsPerPack) {
      return `${i.packQty} ${i.packUnit} × ${i.unitsPerPack} = ${i.quantity}`;
    }
    return `${i.quantity}`;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Purchases" value={String(active.length)} />
        <Stat label="Total Spend" value={`${totalSpend.toFixed(3)} KWD`} />
        <Stat label="Vendors" value={String(new Set(active.map((p) => p.vendorName)).size)} />
        <Stat
          label="This Month"
          value={String(
            active.filter((p) => (p.purchaseDate || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length
          )}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          One purchase, <strong className="text-slate-700">many materials</strong>. Buy by piece, or by box/pack with
          the per-unit cost worked out automatically.
        </p>
        {canEdit && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Purchase
          </button>
        )}
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{err}</div>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
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
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No purchases yet.
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50/70 ${p.status === 'VOID' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.purchaseNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{(p.purchaseDate || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.vendorName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.items.slice(0, 3).map((i: any) => (
                        <span
                          key={i.id || i.materialId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          {i.materialName} — {describeItem(i)}
                        </span>
                      ))}
                      {p.items.length > 3 && <span className="text-xs text-slate-400">+{p.items.length - 3} more</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{(p.totalAmount || 0).toFixed(3)}</td>
                  <td className="px-4 py-3 text-center">
                    {p.status === 'VOID' ? (
                      <span
                        title={p.voidReason || ''}
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                      >
                        Void
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isAdmin && p.status !== 'VOID' && (
                        <>
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit (admin)"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => voidPurchase(p)}
                            title="Void (admin)"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {editing ? `Edit Purchase ${editing.purchaseNumber}` : 'New Purchase'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Vendor *">
                  <input
                    value={form.vendorName}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    className="input"
                    placeholder="Supplier name"
                  />
                </Field>
                <Field label="Invoice #">
                  <input
                    value={form.invoiceNumber}
                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Purchase Date">
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Materials ({form.items.length})
                  </span>
                </div>

                <div className="space-y-3">
                  {form.items.map((line: Item, idx: number) => {
                    const t = lineTotals(line);
                    const mat = materials.find((m) => m.id === line.materialId);
                    return (
                      <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Material {idx + 1}
                            </label>
                            <select
                              value={line.materialId}
                              onChange={(e) => setLine(idx, { materialId: e.target.value })}
                              className="input bg-white"
                            >
                              <option value="">Select material…</option>
                              {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.sku}) — stock {m.onHand}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                            <button
                              onClick={() => setLine(idx, { mode: 'unit' })}
                              className={`px-3 py-2 text-xs font-medium inline-flex items-center gap-1 ${
                                line.mode === 'unit' ? 'bg-blue-600 text-white' : 'text-slate-600'
                              }`}
                            >
                              <Package className="w-3.5 h-3.5" /> By {mat?.unit || 'unit'}
                            </button>
                            <button
                              onClick={() => setLine(idx, { mode: 'pack' })}
                              className={`px-3 py-2 text-xs font-medium inline-flex items-center gap-1 border-l border-slate-200 ${
                                line.mode === 'pack' ? 'bg-blue-600 text-white' : 'text-slate-600'
                              }`}
                            >
                              <Boxes className="w-3.5 h-3.5" /> By box/pack
                            </button>
                          </div>

                          <button
                            onClick={() => delLine(idx)}
                            className="p-2 text-slate-400 hover:text-red-600"
                            disabled={form.items.length === 1}
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {line.mode === 'unit' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                            <Field label={`Qty (${mat?.unit || 'unit'})`}>
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                                className="input bg-white"
                              />
                            </Field>
                            <Field label="Rate per unit (KWD)">
                              <input
                                type="number"
                                step="0.001"
                                value={line.unitCost}
                                onChange={(e) => setLine(idx, { unitCost: Number(e.target.value) })}
                                className="input bg-white"
                              />
                            </Field>
                            <div className="col-span-2 flex items-end">
                              <div className="text-xs text-slate-500 pb-2">
                                Stock + <strong className="text-slate-800">{t.units}</strong> · Total{' '}
                                <strong className="text-slate-800">{t.total.toFixed(3)} KWD</strong>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                              <Field label="Pack type">
                                <select
                                  value={line.packUnit}
                                  onChange={(e) => setLine(idx, { packUnit: e.target.value })}
                                  className="input bg-white"
                                >
                                  {PACK_UNITS.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="How many packs">
                                <input
                                  type="number"
                                  min="1"
                                  value={line.packQty}
                                  onChange={(e) => setLine(idx, { packQty: Number(e.target.value) })}
                                  className="input bg-white"
                                />
                              </Field>
                              <Field label={`Pieces in 1 ${line.packUnit}`}>
                                <input
                                  type="number"
                                  min="0"
                                  value={line.unitsPerPack}
                                  onChange={(e) => setLine(idx, { unitsPerPack: Number(e.target.value) })}
                                  className="input bg-white"
                                  placeholder="e.g. 24"
                                />
                              </Field>
                              <Field label={`Price per ${line.packUnit} (KWD)`}>
                                <input
                                  type="number"
                                  step="0.001"
                                  value={line.packCost}
                                  onChange={(e) => setLine(idx, { packCost: Number(e.target.value) })}
                                  className="input bg-white"
                                />
                              </Field>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <span className="text-slate-500">
                                Stock +{' '}
                                <strong className="text-slate-800">
                                  {t.units} {mat?.unit || ''}
                                </strong>{' '}
                                ({line.packQty} {line.packUnit} × {line.unitsPerPack})
                              </span>
                              <span className="text-slate-500">
                                Total <strong className="text-slate-800">{t.total.toFixed(3)} KWD</strong>
                              </span>
                              <span className="text-emerald-700 font-medium">
                                Auto cost per {mat?.unit || 'unit'}: {t.perUnit.toFixed(4)} KWD
                              </span>
                            </div>
                          </>
                        )}

                        {form.items.length > 1 && (
                          <button
                            onClick={() => dupLine(idx)}
                            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            + Duplicate this line
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={addLine}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" /> Add Another Material to This Purchase
                </button>
              </div>

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="input"
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <span className="text-sm text-slate-600">
                  {form.items.length} material(s) · stock + <strong className="text-slate-800">{formUnits}</strong>
                </span>
                <span className="text-lg font-semibold text-slate-900">{formTotal.toFixed(3)} KWD</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600">
                Cancel
              </button>
              <button
                onClick={save}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" /> Save Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold mt-1 text-slate-900">{value}</p>
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

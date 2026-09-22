import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Search, X, Save } from 'lucide-react';
import { matV3 } from '../../services/materialsV3';

interface MatRow {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  minStockLevel: number;
  purchaseUnitCost: number;
  chargeUnitPrice: number;
  onHand: number;
  stockValue: number;
  lowStock: boolean;
  isActive: boolean;
}

const empty = {
  sku: '',
  name: '',
  unit: 'PCS',
  category: 'General',
  minStockLevel: 0,
  purchaseUnitCost: 0,
  chargeUnitPrice: 0,
  openingQty: 0,
};

export default function MaterialsTab() {
  const [rows, setRows] = useState<MatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MatRow | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [role, setRole] = useState('');

  const isAdmin = role === 'ADMIN';
  const canEdit = role === 'ADMIN' || role === 'MANAGER';

  const load = async () => {
    setLoading(true);
    try {
      const data = await matV3.listMaterials();
      setRows(Array.isArray(data) ? data : []);
      setErr('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setRole(u.role || '');
    } catch {
      /* ignore */
    }
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setShowForm(true);
  };

  const openEdit = (r: MatRow) => {
    setEditing(r);
    setForm({
      sku: r.sku,
      name: r.name,
      unit: r.unit,
      category: r.category,
      minStockLevel: r.minStockLevel,
      purchaseUnitCost: r.purchaseUnitCost,
      chargeUnitPrice: r.chargeUnitPrice,
      openingQty: 0,
    });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (!form.sku.trim() || !form.name.trim()) {
        alert('SKU and name are required');
        return;
      }
      if (editing) {
        await matV3.updateMaterial(editing.id, {
          sku: form.sku,
          name: form.name,
          unit: form.unit,
          category: form.category,
          minStockLevel: form.minStockLevel,
          purchaseUnitCost: form.purchaseUnitCost,
          chargeUnitPrice: form.chargeUnitPrice,
        });
      } else {
        await matV3.createMaterial(form);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (r: MatRow) => {
    const reason = window.prompt(
      'Delete material "' + r.name + '"?\n\nType reason for audit log (required):'
    );
    if (!reason || !reason.trim()) return;
    try {
      await matV3.deleteMaterial(r.id, reason.trim());
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = rows.reduce((s, r) => s + (r.stockValue || 0), 0);
  const lowCount = rows.filter((r) => r.lowStock).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Materials" value={String(rows.length)} />
        <Stat label="Low Stock" value={String(lowCount)} tone={lowCount ? 'amber' : 'slate'} />
        <Stat label="Stock Value" value={`${totalValue.toFixed(3)} KWD`} />
        <Stat label="Units" value={String(rows.reduce((s, r) => s + (r.onHand || 0), 0))} />
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material or SKU…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Material
          </button>
        )}
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{err}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Min</th>
                <th className="px-4 py-3 text-right">Purchase Rate</th>
                <th className="px-4 py-3 text-right">Job Rate</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-center">Status</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    No materials yet. Add your first one.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.sku}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.unit}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{r.onHand}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{r.minStockLevel || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{(r.purchaseUnitCost || 0).toFixed(3)}</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">{(r.chargeUnitPrice || 0).toFixed(3)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{(r.stockValue || 0).toFixed(3)}</td>
                  <td className="px-4 py-3 text-center">
                    {r.lowStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Low
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        OK
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(r)}
                        title="Edit"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => remove(r)}
                          title="Delete"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">{editing ? 'Edit Material' : 'New Material'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="SKU / Code">
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="input"
                  placeholder="e.g. TAPE-1"
                />
              </Field>
              <Field label="Material Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="e.g. PACKING TAPE"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unit">
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="input"
                  >
                    {['PCS', 'BOX', 'ROLL', 'KG', 'METER', 'PACK', 'SET'].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category">
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Purchase Rate (cost)">
                  <input
                    type="number"
                    step="0.001"
                    value={form.purchaseUnitCost}
                    onChange={(e) => setForm({ ...form, purchaseUnitCost: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
                <Field label="Job Rate (we charge)">
                  <input
                    type="number"
                    step="0.001"
                    value={form.chargeUnitPrice}
                    onChange={(e) => setForm({ ...form, chargeUnitPrice: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Min Stock Level">
                  <input
                    type="number"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
                {!editing && (
                  <Field label="Opening Stock (optional)">
                    <input
                      type="number"
                      value={form.openingQty}
                      onChange={(e) => setForm({ ...form, openingQty: Number(e.target.value) })}
                      className="input"
                    />
                  </Field>
                )}
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Purchase rate = what you pay the supplier (stock value). Job rate = what you charge on jobs.
                Keep them separate.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'slate' }: { label: string; value: string; tone?: string }) {
  const toneCls =
    tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${toneCls}`}>{value}</p>
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

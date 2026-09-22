import { useState } from 'react';
import { LayoutGrid, ShoppingCart, BarChart3, History } from 'lucide-react';
import MaterialsTab from './MaterialsTab';
import PurchasesTab from './PurchasesTab';
import StatementTab from './StatementTab';
import AuditTab from './AuditTab';

type Tab = 'materials' | 'purchases' | 'statement' | 'audit';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'materials', label: 'Materials', icon: LayoutGrid },
  { key: 'purchases', label: 'Purchases', icon: ShoppingCart },
  { key: 'statement', label: 'Stock Statement', icon: BarChart3 },
  { key: 'audit', label: 'History / Audit', icon: History },
];

/**
 * QGO Materials — simple stock system.
 * One stock number. One purchase flow. One statement.
 */
export default function MaterialsV3() {
  const [tab, setTab] = useState<Tab>('materials');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Materials</h1>
          <p className="text-sm text-slate-500 mt-1">
            Stock, purchases, job issue &amp; return — one simple record.
          </p>
        </div>

        {/* Underline tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex gap-6 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 whitespace-nowrap pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div>
          {tab === 'materials' && <MaterialsTab />}
          {tab === 'purchases' && <PurchasesTab />}
          {tab === 'statement' && <StatementTab />}
          {tab === 'audit' && <AuditTab />}
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';

interface RackAnalyticsProps {
  racks: any[];
}

type AgingBand = '0-7d' | '7-30d' | '30-60d' | '60-90d' | '90d+';

const calcDays = (rack: any): number => {
  if (rack.assignedDate) return Math.floor((Date.now() - new Date(rack.assignedDate).getTime()) / (1000 * 60 * 60 * 24));
  return 0;
};

const calcUtilization = (rack: any): number => {
  const mode = rack.capacityMode || 'FIXED';
  if (mode === 'FLEXIBLE' || mode === 'both') {
    const palletPct = rack.palletCapacity > 0 ? ((rack.currentPallets || 0) / rack.palletCapacity) * 100 : 0;
    const boxPct = rack.boxCapacity > 0 ? ((rack.currentBoxes || 0) / rack.boxCapacity) * 100 : 0;
    const maxPct = Math.max(palletPct, boxPct);
    if (maxPct > 0) return Math.min(Math.round(maxPct), 100);
  }
  if (rack.cbmCapacity && rack.cbmCapacity > 0 && rack.cbmUsed > 0) return Math.min(Math.round((rack.cbmUsed / rack.cbmCapacity) * 100), 200);
  if (mode === 'FLEXIBLE' || mode === 'both') return rack.capacityUsed > 0 ? 50 : 0;
  if (mode === 'UNLIMITED') {
    if (rack.cbmUsed > 0 && rack.cbmCapacity > 0) return Math.min(Math.round((rack.cbmUsed / rack.cbmCapacity) * 100), 200);
    return rack.capacityUsed > 0 ? 50 : 0;
  }
  return Math.min(Math.round((rack.capacityUsed / (rack.capacityTotal || 1)) * 100), 100);
};

const getUtilColor = (pct: number): string => {
  if (pct >= 100) return '#ef4444';
  if (pct >= 90) return '#f97316';
  if (pct >= 70) return '#eab308';
  if (pct >= 50) return '#84cc16';
  if (pct > 0) return '#22c55e';
  return '#d1d5db';
};

const getAgingBand = (days: number): AgingBand => {
  if (days >= 90) return '90d+';
  if (days >= 60) return '60-90d';
  if (days >= 30) return '30-60d';
  if (days >= 7) return '7-30d';
  return '0-7d';
};

const agingColors: Record<AgingBand, string> = {
  '0-7d': '#22c55e',
  '7-30d': '#84cc16',
  '30-60d': '#eab308',
  '60-90d': '#f97316',
  '90d+': '#ef4444',
};

const agingLabels: Record<AgingBand, string> = {
  '0-7d': '< 7 days',
  '7-30d': '7–30 days',
  '30-60d': '30–60 days',
  '60-90d': '60–90 days',
  '90d+': '90+ days',
};

export const RackAnalytics: React.FC<RackAnalyticsProps> = ({ racks }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'aging' | 'cleanup'>('overview');
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = racks.length;
    const occupied = racks.filter((r) => r.capacityUsed > 0).length;
    const empty = total - occupied;
    const full = racks.filter((r) => calcUtilization(r) >= 100).length;
    const totalCbm = racks.reduce((s, r) => s + (r.cbmCapacity || 0), 0);
    const usedCbm = racks.reduce((s, r) => s + (r.cbmUsed || 0), 0);
    const totalBoxes = racks.reduce((s, r) => s + (r.currentBoxes || 0), 0);
    const totalPallets = racks.reduce((s, r) => s + (r.currentPallets || 0), 0);
    return { total, occupied, empty, full, totalCbm, usedCbm, totalBoxes, totalPallets };
  }, [racks]);

  // Utilization distribution
  const utilBands = useMemo(() => {
    const bands = { '0% (empty)': 0, '1–25%': 0, '25–50%': 0, '50–75%': 0, '75–99%': 0, '100% (full)': 0 };
    racks.forEach((r) => {
      const u = calcUtilization(r);
      if (u === 0) bands['0% (empty)']++;
      else if (u <= 25) bands['1–25%']++;
      else if (u <= 50) bands['25–50%']++;
      else if (u <= 75) bands['50–75%']++;
      else if (u < 100) bands['75–99%']++;
      else bands['100% (full)']++;
    });
    return bands;
  }, [racks]);

  // Zone breakdown
  const zoneData = useMemo(() => {
    const zoneMap: Record<string, { total: number; used: number; cbm: number; cbmUsed: number; boxes: number }> = {};
    racks.forEach((r) => {
      const z = r.zone || 'Unassigned';
      if (!zoneMap[z]) zoneMap[z] = { total: 0, used: 0, cbm: 0, cbmUsed: 0, boxes: 0 };
      zoneMap[z].total++;
      if (r.capacityUsed > 0) zoneMap[z].used++;
      zoneMap[z].cbm += r.cbmCapacity || 0;
      zoneMap[z].cbmUsed += r.cbmUsed || 0;
      zoneMap[z].boxes += r.currentBoxes || 0;
    });
    return Object.entries(zoneMap)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([name, data]) => ({ name, ...data }));
  }, [racks]);

  // Aging data
  const agingData = useMemo(() => {
    const bands: Record<AgingBand, number> = { '0-7d': 0, '7-30d': 0, '30-60d': 0, '60-90d': 0, '90d+': 0 };
    const over30: any[] = [];
    racks.forEach((r) => {
      if (r.capacityUsed > 0) {
        const days = calcDays(r);
        const band = getAgingBand(days);
        bands[band]++;
        if (days >= 30) over30.push({ code: r.code, zone: r.zone || 'Unassigned', days, company: r.companyProfile?.name || '', cbm: r.cbmUsed || 0 });
      }
    });
    over30.sort((a, b) => b.days - a.days);
    return { bands, over30: over30.slice(0, 20) };
  }, [racks]);

  // Cleanup suggestions
  const cleanupSuggestions = useMemo(() => {
    const suggestions: { type: string; message: string; racks: string[]; severity: 'high' | 'medium' | 'low' }[] = [];

    // 1. Racks with very low utilization but assigned
    const lowUtil = racks.filter((r) => r.capacityUsed > 0 && calcUtilization(r) < 20 && r.companyProfile?.name && r.capacityTotal > 0);
    if (lowUtil.length > 3) {
      suggestions.push({
        type: 'consolidation',
        message: `${lowUtil.length} racks are <20% utilized — consider consolidating into fewer racks`,
        racks: lowUtil.slice(0, 5).map((r) => r.code),
        severity: 'medium',
      });
    }

    // 2. Racks over 90 days
    const over90 = racks.filter((r) => r.capacityUsed > 0 && calcDays(r) >= 90 && r.companyProfile?.name);
    if (over90.length > 0) {
      suggestions.push({
        type: 'aging',
        message: `${over90.length} racks have items stored for 90+ days — may need review`,
        racks: over90.slice(0, 5).map((r) => r.code),
        severity: 'high',
      });
    }

    // 3. Full racks
    const fullRacks = racks.filter((r) => calcUtilization(r) >= 100);
    if (fullRacks.length > 0) {
      suggestions.push({
        type: 'capacity',
        message: `${fullRacks.length} racks are FULL — plan space or redistribute contents`,
        racks: fullRacks.slice(0, 5).map((r) => r.code),
        severity: 'high',
      });
    }

    // 4. Empty racks in high-demand zones
    const zoneUsage = zoneData.filter((z) => z.total > 5).map((z) => ({ name: z.name, pct: z.total > 0 ? (z.used / z.total) * 100 : 0 }));
    const highDemandZones = zoneUsage.filter((z) => z.pct > 80).map((z) => z.name);
    if (highDemandZones.length > 0) {
      const emptyInDemandZones = racks.filter((r) => r.capacityUsed === 0 && highDemandZones.includes(r.zone || 'Unassigned'));
      if (emptyInDemandZones.length > 0) {
        suggestions.push({
          type: 'optimization',
          message: `${emptyInDemandZones.length} empty racks in high-demand zones (${highDemandZones.join(', ')}) — prioritize new storage here`,
          racks: emptyInDemandZones.slice(0, 5).map((r) => r.code),
          severity: 'low',
        });
      }
    }

    return suggestions;
  }, [racks, zoneData]);

  // ─── Bar Chart Component ──────────────────────────────────────────
  const Bar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-right text-gray-600 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-bold" style={{ color }}>{value}</span>
    </div>
  );

  const maxBarValue = Math.max(...Object.values(utilBands), 1);

  return (
    <div className={`space-y-4 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* ─── Tab Bar ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 flex flex-wrap gap-1">
        {([
          { id: 'overview' as const, label: '📊 Overview', icon: '📊' },
          { id: 'zones' as const, label: '🏢 Zones', icon: '🏢' },
          { id: 'aging' as const, label: '📅 Aging', icon: '📅' },
          { id: 'cleanup' as const, label: '🧹 Suggestions', icon: '🧹' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────── OVERVIEW TAB ─────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* KPI Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">📊 Utilization Distribution</h3>
            <div className="space-y-2">
              {Object.entries(utilBands).map(([label, count]) => (
                <Bar key={label} label={label} value={count} max={maxBarValue} color={getUtilColor(label === '0% (empty)' ? 0 : label === '1–25%' ? 12 : label === '25–50%' ? 37 : label === '50–75%' ? 62 : label === '75–99%' ? 87 : 100)} />
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">📈 Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Racks', value: stats.total, color: 'text-gray-900' },
                { label: 'Occupied', value: stats.occupied, color: 'text-blue-600' },
                { label: 'Empty', value: stats.empty, color: 'text-green-600' },
                { label: 'Full', value: stats.full, color: 'text-red-600' },
                { label: 'Total Boxes', value: stats.totalBoxes, color: 'text-amber-600' },
                { label: 'Total Pallets', value: stats.totalPallets, color: 'text-purple-600' },
                { label: 'CBM Used', value: `${stats.usedCbm.toFixed(1)} m³`, color: 'text-indigo-600' },
                { label: 'Available CBM', value: `${(stats.totalCbm - stats.usedCbm).toFixed(1)} m³`, color: 'text-emerald-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CBM Gauge */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">📦 CBM Utilization</h3>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 120 120" className="w-28 h-28">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={stats.totalCbm > 0 && (stats.usedCbm / stats.totalCbm) > 0.8 ? '#ef4444' : '#6366f1'}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - (stats.totalCbm > 0 ? stats.usedCbm / stats.totalCbm : 0))}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">
                  {stats.totalCbm > 0 ? Math.round((stats.usedCbm / stats.totalCbm) * 100) : 0}%
                </text>
                <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#6b7280">Utilized</text>
              </svg>
              <div className="space-y-2 text-sm">
                <p><span className="font-bold text-gray-900">{stats.usedCbm.toFixed(1)} m³</span> <span className="text-gray-500">used</span></p>
                <p><span className="font-bold text-gray-900">{(stats.totalCbm - stats.usedCbm).toFixed(1)} m³</span> <span className="text-gray-500">free</span></p>
                <p><span className="font-bold text-gray-900">{stats.totalCbm.toFixed(0)} m³</span> <span className="text-gray-500">total</span></p>
              </div>
            </div>
          </div>

          {/* Occupancy Pie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">🎯 Occupancy Ratio</h3>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 120 120" className="w-28 h-28">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="#22c55e"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - stats.empty / stats.total)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">{stats.occupied}</text>
                <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#6b7280">Occupied</text>
              </svg>
              <div className="space-y-2 text-sm">
                <p><span className="font-bold text-green-600">{stats.empty}</span> <span className="text-gray-500">empty racks</span></p>
                <p><span className="font-bold text-blue-600">{stats.occupied - stats.full}</span> <span className="text-gray-500">partially used</span></p>
                <p><span className="font-bold text-red-600">{stats.full}</span> <span className="text-gray-500">full racks</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────── ZONES TAB ───────────────────────── */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">🏢 Zone Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Zone</th>
                  <th className="pb-2 pr-4">Racks</th>
                  <th className="pb-2 pr-4">Occupied</th>
                  <th className="pb-2 pr-4">Utilization</th>
                  <th className="pb-2 pr-4">CBM Used</th>
                  <th className="pb-2 pr-4">CBM Total</th>
                  <th className="pb-2 pr-4">CBM %</th>
                  <th className="pb-2">Boxes</th>
                </tr>
              </thead>
              <tbody>
                {zoneData.map((z) => {
                  const utilPct = z.total > 0 ? Math.round((z.used / z.total) * 100) : 0;
                  const cbmPct = z.cbm > 0 ? Math.round((z.cbmUsed / z.cbm) * 100) : 0;
                  return (
                    <tr key={z.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{z.name}</td>
                      <td className="py-2 pr-4">{z.total}</td>
                      <td className="py-2 pr-4">{z.used}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${utilPct}%`, backgroundColor: getUtilColor(utilPct) }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: getUtilColor(utilPct) }}>{utilPct}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">{z.cbmUsed.toFixed(1)}</td>
                      <td className="py-2 pr-4">{z.cbm.toFixed(0)}</td>
                      <td className="py-2 pr-4">
                        <span className={`font-bold ${cbmPct >= 90 ? 'text-red-600' : cbmPct >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {cbmPct}%
                        </span>
                      </td>
                      <td className="py-2">{z.boxes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────── AGING TAB ────────────────────────── */}
      {activeTab === 'aging' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Aging distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">📅 Storage Duration Breakdown</h3>
            <div className="space-y-3">
              {(Object.entries(agingData.bands) as [AgingBand, number][]).map(([band, count]) => {
                const maxAging = Math.max(...Object.values(agingData.bands), 1);
                return (
                  <div key={band} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agingColors[band] }} />
                    <span className="text-xs text-gray-600 w-24">{agingLabels[band]}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / maxAging) * 100}%`, backgroundColor: agingColors[band] }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            {racks.filter((r) => r.capacityUsed > 0).length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No occupied racks to age</p>
            )}
          </div>

          {/* Over 30 days list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">
              ⚠️ Long-Stored Items (30d+)
              {agingData.over30.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">— top {agingData.over30.length}</span>
              )}
            </h3>
            {agingData.over30.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No items stored longer than 30 days 🎉</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {agingData.over30.map((r) => (
                  <div key={r.code} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.code}</span>
                      <span className="text-xs text-gray-400">{r.zone}</span>
                      {r.company && <span className="text-xs text-purple-500">🏢 {r.company}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.cbm > 0 && <span className="text-xs text-gray-400">{r.cbm.toFixed(1)} m³</span>}
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.days >= 90 ? 'bg-red-100 text-red-700' :
                          r.days >= 60 ? 'bg-orange-100 text-orange-700' :
                          r.days >= 30 ? 'bg-yellow-100 text-yellow-700' : ''
                        }`}
                      >
                        {r.days}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────── CLEANUP TAB ────────────────────────── */}
      {activeTab === 'cleanup' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">🧹 Cleanup Suggestions</h3>
          {cleanupSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">✨</p>
              <p className="text-gray-500 text-sm">No cleanup suggestions — everything looks good!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cleanupSuggestions.map((s, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border-2 p-4 ${
                    s.severity === 'high' ? 'border-red-200 bg-red-50' :
                    s.severity === 'medium' ? 'border-amber-200 bg-amber-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">
                      {s.severity === 'high' ? '🔴' : s.severity === 'medium' ? '🟡' : '🔵'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{s.message}</p>
                      {s.racks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.racks.map((code) => (
                            <span key={code} className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 font-mono">
                              {code}
                            </span>
                          ))}
                          {s.racks.length >= 5 && <span className="text-xs text-gray-400 self-center">…and more</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-[10px] font-medium uppercase ${
                          s.severity === 'high' ? 'text-red-600' :
                          s.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {s.severity} priority
                        </span>
                        <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full border">
                          {s.type === 'consolidation' ? 'Consolidation' :
                           s.type === 'aging' ? 'Aging Review' :
                           s.type === 'capacity' ? 'Capacity Alert' : 'Optimization'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

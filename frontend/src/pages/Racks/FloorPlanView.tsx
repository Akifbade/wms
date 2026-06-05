import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface FloorPlanViewProps {
  racks: any[];
  onRackClick: (rack: any) => void;
}

interface RackLayout {
  id: string;
  code: string;
  zone: string;
  aisle: string;
  bay: number;
  level: number;
  utilization: number;
  cbmPct: number;
  status: string;
  cbmUsed: number;
  cbmCapacity: number;
  daysOccupied: number;
  companyName: string;
  boxes: number;
  pallets: number;
  raw: any;
}

// ─── Location Parser ───────────────────────────────────────────────
const parseLocation = (rack: any): { aisle: string; bay: number; level: number } => {
  const loc = (rack.location || rack.code || '').trim();

  // "A-01-02" or "A 01 02" or "A-1-2"
  const m1 = loc.match(/^([A-Za-z0-9]+)[\s-](\d+)[\s-](\d+)$/);
  if (m1) return { aisle: m1[1], bay: parseInt(m1[2]), level: parseInt(m1[3]) };

  // "A1L2R3" or "A1R02C03"
  const m2 = loc.match(/^([A-Za-z]+\d*)(?:[-\s]?[RC](\d+))?(?:[-\s]?[LCR](\d+))?$/i);
  if (m2) {
    const aisle = m2[1] || 'Z';
    const bay = m2[2] ? parseInt(m2[2]) : 1;
    const level = m2[3] ? parseInt(m2[3]) : 1;
    return { aisle, bay, level };
  }

  // "R01-C02-L03"
  const m3 = loc.match(/R(\d+)[-\s]C(\d+)(?:[-\s]L(\d+))?/i);
  if (m3) {
    return { aisle: `Zone${m3[1]}`, bay: parseInt(m3[2]), level: m3[3] ? parseInt(m3[3]) : 1 };
  }

  // Just numbers
  const nums = loc.match(/\d+/g);
  if (nums && nums.length > 0) {
    return {
      aisle: (loc.match(/[A-Za-z]/)?.[0]) || rack.zone || 'X',
      bay: parseInt(nums[0]),
      level: nums.length > 1 ? parseInt(nums[1]) : 1,
    };
  }

  return { aisle: rack.zone || 'Unassigned', bay: 1, level: 1 };
};

// ─── Utilization ────────────────────────────────────────────────────
const calcUtilization = (rack: any): number => {
  const mode = rack.capacityMode || 'FIXED';
  if (mode === 'FLEXIBLE' || mode === 'both') {
    const palletPct = rack.palletCapacity > 0 ? ((rack.currentPallets || 0) / rack.palletCapacity) * 100 : 0;
    const boxPct = rack.boxCapacity > 0 ? ((rack.currentBoxes || 0) / rack.boxCapacity) * 100 : 0;
    const maxPct = Math.max(palletPct, boxPct);
    if (maxPct > 0) return Math.min(Math.round(maxPct), 100);
  }
  if (rack.cbmCapacity && rack.cbmCapacity > 0 && rack.cbmUsed > 0) {
    return Math.min(Math.round((rack.cbmUsed / rack.cbmCapacity) * 100), 200);
  }
  if (mode === 'FLEXIBLE') return rack.capacityUsed > 0 ? 50 : 0;
  if (mode === 'UNLIMITED') {
    if (rack.cbmUsed > 0 && rack.cbmCapacity > 0) return Math.min(Math.round((rack.cbmUsed / rack.cbmCapacity) * 100), 200);
    return rack.capacityUsed > 0 ? 50 : 0;
  }
  const total = rack.capacityTotal || 1;
  return Math.min(Math.round((rack.capacityUsed / total) * 100), 100);
};

const getUtilColor = (pct: number): string => {
  if (pct >= 100) return '#ef4444';
  if (pct >= 90) return '#f97316';
  if (pct >= 70) return '#eab308';
  if (pct >= 50) return '#84cc16';
  return '#22c55e';
};

const getUtilBg = (pct: number): string => {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 90) return 'bg-orange-500';
  if (pct >= 70) return 'bg-yellow-500';
  if (pct >= 50) return 'bg-lime-500';
  return 'bg-green-500';
};

// ─── Days Since First Assign ────────────────────────────────────────
const calcDays = (rack: any): number => {
  if (rack.assignedDate) {
    return Math.floor((Date.now() - new Date(rack.assignedDate).getTime()) / (1000 * 60 * 60 * 24));
  }
  return 0;
};

// ─── Mini 3D Rack SVG ──────────────────────────────────────────────
const Rack3DIcon: React.FC<{ utilization: number; width?: number; height?: number }> = ({
  utilization,
  width = 24,
  height = 36,
}) => {
  const levels = 4;
  const levelH = height / levels;
  const filledLevels = Math.ceil((utilization / 100) * levels);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Rack frame */}
      <rect x="0" y="0" width={width} height={height} rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
      {/* Level dividers */}
      {Array.from({ length: levels - 1 }).map((_, i) => (
        <line key={`div-${i}`} x1="1" y1={(i + 1) * levelH} x2={width - 1} y2={(i + 1) * levelH} stroke="#d1d5db" strokeWidth="0.5" />
      ))}
      {/* Filled levels */}
      {Array.from({ length: filledLevels }).map((_, i) => (
        <rect
          key={`fill-${i}`}
          x="2"
          y={height - (i + 1) * levelH + 1}
          width={width - 4}
          height={levelH - 2}
          rx="1"
          fill={getUtilColor(utilization)}
          opacity="0.8"
        >
          <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
        </rect>
      ))}
    </svg>
  );
};

// ─── Floor Plan Component ──────────────────────────────────────────
type HeatmapMode = 'utilization' | 'cbm' | 'days' | 'boxes';

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ racks, onRackClick }) => {
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('utilization');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedRack, setSelectedRack] = useState<RackLayout | null>(null);
  const [visible, setVisible] = useState(false);
  const [showHeatmapMenu, setShowHeatmapMenu] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // ── Process racks into layout data ──
  const layoutData = useMemo(() => {
    return racks
      .map((r: any): RackLayout => {
        const pos = parseLocation(r);
        return {
          id: r.id,
          code: r.code || 'N/A',
          zone: r.zone || 'Unassigned',
          aisle: pos.aisle,
          bay: pos.bay,
          level: pos.level,
          utilization: calcUtilization(r),
          cbmPct: r.cbmCapacity > 0 ? Math.round((r.cbmUsed / r.cbmCapacity) * 100) : 0,
          status: r.status || 'ACTIVE',
          cbmUsed: r.cbmUsed || 0,
          cbmCapacity: r.cbmCapacity || 0,
          daysOccupied: calcDays(r),
          companyName: r.companyProfile?.name || '',
          boxes: r.currentBoxes || 0,
          pallets: r.currentPallets || 0,
          raw: r,
        };
      })
      .sort((a, b) => a.aisle.localeCompare(b.aisle) || a.bay - b.bay);
  }, [racks]);

  // ── Group by aisle, lay out positions ──
  const floorPlan = useMemo(() => {
    const filtered = searchQuery
      ? layoutData.filter(
          (r) =>
            r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.aisle.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : layoutData;

    // Group by aisle
    const groups: { [aisle: string]: RackLayout[] } = {};
    for (const rack of filtered) {
      if (!groups[rack.aisle]) groups[rack.aisle] = [];
      groups[rack.aisle].push(rack);
    }

    // Build layout with coordinates
    const AISLE_WIDTH = 60;
    const RACK_W = 48;
    const RACK_H = 32;
    const AISLE_GAP = 20;
    const SECTION_GAP = 40;
    const BAYS_PER_ROW = 8;

    type RackWithPos = RackLayout & { x: number; y: number; w: number; h: number; row: number; col: number };
    const positioned: RackWithPos[] = [];
    const aisles: { name: string; x: number; y: number; count: number; used: number }[] = [];

    let currentY = 30;
    const sortedAisles = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    for (const [aisleName, aisleRacks] of sortedAisles) {
      const rows = Math.ceil(aisleRacks.length / BAYS_PER_ROW);
      const totalWidth = Math.min(aisleRacks.length, BAYS_PER_ROW) * (RACK_W + 4) + 20;
      const startX = 40;
      const aisleCenterY = currentY + rows * (RACK_H + 4) / 2 + AISLE_WIDTH / 2;

      let usedCount = 0;
      aisleRacks.forEach((rack, idx) => {
        if (rack.utilization > 0) usedCount++;
        const row = Math.floor(idx / BAYS_PER_ROW);
        const col = idx % BAYS_PER_ROW;
        const x = startX + col * (RACK_W + 4);
        const y = currentY + row * (RACK_H + 4) + 15;

        positioned.push({
          ...rack,
          x,
          y,
          w: RACK_W,
          h: RACK_H,
          row,
          col,
        });
      });

      aisles.push({
        name: aisleName,
        x: startX,
        y: currentY + 15,
        count: aisleRacks.length,
        used: usedCount,
      });

      // Add aisle gangway
      currentY += rows * (RACK_H + 4) + AISLE_GAP + AISLE_WIDTH;

      // Add section gap after each aisle
      currentY += SECTION_GAP;
    }

    return {
      positioned,
      aisles,
      totalHeight: currentY + 40,
      totalWidth: Math.min(BAYS_PER_ROW, Math.max(...Object.values(groups).map(g => g.length))) * (RACK_W + 4) + 80,
      totalRacks: filtered.length,
      occupiedRacks: filtered.filter((r) => r.utilization > 0).length,
      totalCbm: filtered.reduce((s, r) => s + r.cbmCapacity, 0),
      usedCbm: filtered.reduce((s, r) => s + r.cbmUsed, 0),
    };
  }, [layoutData, searchQuery]);

  // ── Get heatmap value & color ──
  const getHeatmapValue = useCallback(
    (rack: RackLayout): { value: number; label: string; color: string; pct: number } => {
      let value: number;
      let label: string;
      let pct: number;

      switch (heatmapMode) {
        case 'cbm':
          value = rack.cbmUsed;
          label = `${rack.cbmUsed.toFixed(1)} m³`;
          pct = rack.cbmPct;
          break;
        case 'days':
          value = rack.daysOccupied;
          label = `${rack.daysOccupied}d`;
          pct = rack.daysOccupied > 90 ? 100 : rack.daysOccupied > 60 ? 75 : rack.daysOccupied > 30 ? 50 : rack.daysOccupied > 7 ? 25 : 0;
          break;
        case 'boxes':
          value = rack.boxes;
          label = `${rack.boxes} boxes`;
          pct = rack.boxes > 50 ? 100 : rack.boxes > 20 ? 75 : rack.boxes > 5 ? 50 : rack.boxes > 0 ? 25 : 0;
          break;
        default:
          value = rack.utilization;
          label = `${rack.utilization}%`;
          pct = rack.utilization;
      }

      let color: string;
      if (heatmapMode === 'days') {
        color = pct >= 100 ? '#7c3aed' : pct >= 75 ? '#a855f7' : pct >= 50 ? '#f59e0b' : pct >= 25 ? '#84cc16' : '#22c55e';
      } else {
        color = getUtilColor(pct);
      }

      return { value, label, color, pct };
    },
    [heatmapMode]
  );

  // ── Zoom / Pan handlers ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.3), 5));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && !(e.target as HTMLElement).closest('.rack-tile')) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }
    },
    [panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch handlers for mobile
  const lastTouchRef = useRef<{ dist?: number; cx?: number; cy?: number }>({});

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && !(e.target as HTMLElement).closest('.rack-tile')) {
        // Single finger pan
        setIsPanning(true);
        setPanStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
      } else if (e.touches.length === 2) {
        // Two finger pinch
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
        lastTouchRef.current = {
          dist,
          cx: (t1.clientX + t2.clientX) / 2,
          cy: (t1.clientY + t2.clientY) / 2,
        };
      }
    },
    [panOffset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isPanning) {
        setPanOffset({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
      } else if (e.touches.length === 2 && lastTouchRef.current.dist) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const newDist = Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
        const scale = newDist / lastTouchRef.current.dist;
        setZoom((prev) => Math.min(Math.max(prev * scale, 0.3), 5));
        lastTouchRef.current.dist = newDist;
      }
    },
    [isPanning, panStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    lastTouchRef.current = {};
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // ── Rack click ──
  const handleRackClick = useCallback(
    (layout: RackLayout) => {
      setSelectedRack(layout);
      onRackClick(layout.raw);
    },
    [onRackClick]
  );

  // ── Heatmap config ──
  const heatmapOptions: { mode: HeatmapMode; label: string; icon: string }[] = [
    { mode: 'utilization', label: 'Utilization %', icon: '📊' },
    { mode: 'cbm', label: 'CBM Usage', icon: '📦' },
    { mode: 'days', label: 'Days Occupied', icon: '📅' },
    { mode: 'boxes', label: 'Box Density', icon: '🎯' },
  ];

  // ── Render ──
  const svgWidth = Math.max(floorPlan.totalWidth, 400);
  const svgHeight = Math.max(floorPlan.totalHeight, 400);

  return (
    <div
      ref={containerRef}
      className={`space-y-3 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* ─── Controls Bar ─── */}
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search racks, zone, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Heatmap Toggle */}
          <div className="relative">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {heatmapOptions.map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => setHeatmapMode(opt.mode)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    heatmapMode === opt.mode
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title={opt.label}
                >
                  {opt.icon} <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-800">{floorPlan.totalRacks}</span> racks
            </span>
            <span className="w-px h-4 bg-gray-200" />
            <span className="flex items-center gap-1">
              <span className="font-bold text-blue-600">{floorPlan.occupiedRacks}</span> used
            </span>
            <span className="w-px h-4 bg-gray-200" />
            <span className="flex items-center gap-1">
              <span className="font-bold text-green-600">{floorPlan.totalRacks - floorPlan.occupiedRacks}</span> free
            </span>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={resetView}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
            title="Reset zoom & pan"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* ─── Warehouse Floor Plan SVG ─── */}
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-500 delay-100 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="relative overflow-hidden"
          style={{
            height: 'clamp(400px, 60vh, 700px)',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.1s ease',
            }}
          >
            <defs>
              {/* Grid pattern */}
              <pattern id="floorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
              </pattern>

              {/* Glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Shadow */}
              <filter id="shadow">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Background */}
            <rect width={svgWidth} height={svgHeight} fill="#f8fafc" />
            <rect width={svgWidth} height={svgHeight} fill="url(#floorGrid)" />

            {/* Aisle gangways */}
            {floorPlan.aisles.map((aisle) => (
              <g key={`gangway-${aisle.name}`}>
                <rect
                  x={aisle.x - 10}
                  y={aisle.y + 5}
                  width={Math.min(8, floorPlan.positioned.filter((p) => p.aisle === aisle.name).length) * 52 + 20}
                  height={18}
                  rx="4"
                  fill="#e2e8f0"
                  opacity="0.6"
                />
                {/* Aisle label */}
                <text
                  x={aisle.x - 5}
                  y={aisle.y + 17}
                  fontSize="10"
                  fontWeight="bold"
                  fill="#94a3b8"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {aisle.name}
                </text>
              </g>
            ))}

            {/* Rack tiles */}
            {floorPlan.positioned.map((rack) => {
              const hv = getHeatmapValue(rack);
              const isSelected = selectedRack?.id === rack.id;
              const isSearchMatch =
                searchQuery &&
                (rack.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rack.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rack.zone.toLowerCase().includes(searchQuery.toLowerCase()));

              return (
                <g
                  key={rack.id}
                  className="rack-tile"
                  onClick={() => handleRackClick(rack)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Rack body */}
                  <rect
                    x={rack.x}
                    y={rack.y}
                    width={rack.w}
                    height={rack.h}
                    rx="4"
                    fill={hv.color}
                    opacity={rack.utilization > 0 ? 0.85 : 0.35}
                    stroke={
                      isSelected ? '#3b82f6' : isSearchMatch ? '#f59e0b' : rack.utilization > 0 ? hv.color : '#d1d5db'
                    }
                    strokeWidth={isSelected || isSearchMatch ? 2.5 : 1}
                    filter={isSelected ? 'url(#glow)' : 'url(#shadow)'}
                  >
                    {/* Pulse animation for full racks */}
                    {rack.utilization >= 100 && (
                      <animate
                        attributeName="opacity"
                        values="0.85;0.65;0.85"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    )}
                    {/* Pulse animation for search matches */}
                    {isSearchMatch && !isSelected && (
                      <animate
                        attributeName="stroke-opacity"
                        values="1;0.5;1"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    )}
                  </rect>

                  {/* Rack code label */}
                  <text
                    x={rack.x + rack.w / 2}
                    y={rack.y + rack.h / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill={rack.utilization > 0 ? '#ffffff' : '#6b7280'}
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    {rack.code.length > 6 ? rack.code.substring(0, 5) + '…' : rack.code}
                  </text>

                  {/* Heatmap value badge */}
                  <rect
                    x={rack.x + rack.w - 14}
                    y={rack.y + 2}
                    width="12"
                    height="10"
                    rx="2"
                    fill="rgba(0,0,0,0.4)"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={rack.x + rack.w - 8}
                    y={rack.y + 9}
                    textAnchor="middle"
                    fontSize="6"
                    fontWeight="bold"
                    fill="#ffffff"
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    {hv.label.length > 5 ? hv.label.substring(0, 4) : hv.label}
                  </text>

                  {/* Status indicator */}
                  {rack.status === 'MAINTENANCE' && (
                    <text
                      x={rack.x + 4}
                      y={rack.y + 9}
                      fontSize="8"
                      fill="#f59e0b"
                      style={{ pointerEvents: 'none' }}
                    >
                      🔧
                    </text>
                  )}
                  {rack.status === 'RESERVED' && (
                    <text
                      x={rack.x + 4}
                      y={rack.y + 9}
                      fontSize="8"
                      fill="#3b82f6"
                      style={{ pointerEvents: 'none' }}
                    >
                      📌
                    </text>
                  )}
                </g>
              );
            })}

            {/* Section divider labels */}
            {floorPlan.aisles.map((aisle, idx) => {
              // Only show if next aisle exists and gap is big enough
              const nextAisle = floorPlan.aisles[idx + 1];
              if (!nextAisle) return null;
              const midY = (aisle.y + nextAisle.y) / 2;
              return (
                <g key={`divider-${idx}`}>
                  <line
                    x1="20"
                    y1={midY - 10}
                    x2={svgWidth - 20}
                    y2={midY - 10}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                </g>
              );
            })}
          </svg>

          {/* Zoom indicator */}
          <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-mono text-gray-500 shadow-sm border border-gray-200">
            {Math.round(zoom * 100)}%
          </div>

          {/* Search counter */}
          {searchQuery && (
            <div className="absolute top-3 right-3 bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 text-xs font-medium border border-blue-200 shadow-sm">
              {floorPlan.positioned.length} matches
            </div>
          )}
        </div>

        {/* ─── Legend ─── */}
        <div className="flex flex-wrap items-center gap-3 md:gap-5 text-xs px-4 py-2.5 border-t border-gray-100">
          {/* Heatmap color scale */}
          <span className="text-gray-500 font-medium">
            {heatmapOptions.find((o) => o.mode === heatmapMode)?.label}:
          </span>
          {heatmapMode === 'days' ? (
            <>
              {[
                { color: '#22c55e', label: '<7d' },
                { color: '#84cc16', label: '7-30d' },
                { color: '#f59e0b', label: '30-60d' },
                { color: '#a855f7', label: '60-90d' },
                { color: '#7c3aed', label: '90d+' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.label}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { color: '#22c55e', label: '<50%' },
                { color: '#84cc16', label: '50-70%' },
                { color: '#eab308', label: '70-90%' },
                { color: '#f97316', label: '90-99%' },
                { color: '#ef4444', label: '100%+' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.label}</span>
                </div>
              ))}
            </>
          )}
          <span className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-300 opacity-50" />
            <span className="text-gray-600">Empty</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px]">🔧</span>
            <span className="text-gray-600">Maintenance</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px]">📌</span>
            <span className="text-gray-600">Reserved</span>
          </div>

          {/* Instructions */}
          <span className="text-gray-400 ml-auto hidden sm:block">
            🖱️ Scroll to zoom · Drag to pan · Click rack for details
          </span>
        </div>
      </div>

      {/* ─── Quick Details Popup ─── */}
      {selectedRack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-popup">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" style={{ backgroundColor: getUtilColor(selectedRack.utilization) + '20' }}>
                  <Rack3DIcon utilization={selectedRack.utilization} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedRack.code}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedRack.zone} · {selectedRack.aisle}-{String(selectedRack.bay).padStart(2, '0')}-{selectedRack.level}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRack(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedRack.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800' :
                  selectedRack.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                  selectedRack.utilization >= 100 ? 'bg-red-100 text-red-800' :
                  selectedRack.utilization > 0 ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedRack.status === 'MAINTENANCE' ? '🔧 Maintenance' :
                   selectedRack.status === 'RESERVED' ? '📌 Reserved' :
                   selectedRack.utilization >= 100 ? '🔴 Full' :
                   selectedRack.utilization > 0 ? '🟢 In Use' : '⚪ Empty'}
                </span>
                {selectedRack.companyName && (
                  <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full">
                    🏢 {selectedRack.companyName}
                  </span>
                )}
              </div>

              {/* Utilization & CBM */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Utilization</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(selectedRack.utilization, 100)}%`,
                          backgroundColor: getUtilColor(selectedRack.utilization),
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold" style={{ color: getUtilColor(selectedRack.utilization) }}>
                      {selectedRack.utilization}%
                    </span>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">CBM</p>
                  <p className="text-sm font-bold text-purple-700">
                    {selectedRack.cbmUsed.toFixed(1)} / {selectedRack.cbmCapacity.toFixed(1)} m³
                  </p>
                  {selectedRack.cbmCapacity > 0 && (
                    <div className="mt-1 bg-purple-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-600 transition-all duration-700"
                        style={{ width: `${Math.min(selectedRack.cbmPct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center bg-blue-50 rounded-lg p-2.5">
                  <p className="text-lg font-bold text-blue-700">{selectedRack.boxes}</p>
                  <p className="text-[10px] text-blue-500">📦 Boxes</p>
                </div>
                <div className="text-center bg-amber-50 rounded-lg p-2.5">
                  <p className="text-lg font-bold text-amber-700">{selectedRack.pallets}</p>
                  <p className="text-[10px] text-amber-500">🚚 Pallets</p>
                </div>
                <div className={`text-center rounded-lg p-2.5 ${
                  selectedRack.daysOccupied > 30 ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <p className={`text-lg font-bold ${selectedRack.daysOccupied > 30 ? 'text-red-700' : 'text-green-700'}`}>
                    {selectedRack.daysOccupied}
                  </p>
                  <p className="text-[10px] text-gray-500">📅 Days</p>
                </div>
              </div>

              {/* 3D Rack Visualization */}
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">Rack Stack View</p>
                <div className="flex items-end justify-center gap-1.5 h-24">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const levelUtil = Math.min(selectedRack.utilization - i * 10, 10) / 10;
                    return (
                      <div
                        key={i}
                        className="w-6 transition-all duration-500 rounded-t-sm"
                        style={{
                          height: `${Math.max(levelUtil * 100, levelUtil > 0 ? 8 : 0)}%`,
                          backgroundColor: levelUtil > 0 ? getUtilColor(selectedRack.utilization) : '#e5e7eb',
                          opacity: levelUtil > 0 ? 0.7 + levelUtil * 0.3 : 0.3,
                          animation: levelUtil > 0 ? `rackFadeIn 0.3s ease-out ${i * 0.05}s both` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* View full details button */}
              <button
                onClick={() => {
                  setSelectedRack(null);
                  setTimeout(() => onRackClick(selectedRack.raw), 100);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition-colors shadow-md"
              >
                View Full Rack Details →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup animation style */}
      <style>{`
        @keyframes popup {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popup {
          animation: popup 0.2s ease-out;
        }
        @keyframes rackFadeIn {
          from { opacity: 0; transform: scaleY(0.5); }
          to { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

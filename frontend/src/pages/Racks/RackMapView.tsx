import React, { useState, useEffect, useRef } from 'react';

interface RackMapViewProps {
  racks: any[];
  zones: string[];
  onRackClick: (rack: any) => void;
}

const calcUtilization = (rack: any): number => {
  const mode = rack.capacityMode || 'FIXED';

  // FLEXIBLE or BOTH: use max of pallet% and box%
  if (mode === 'FLEXIBLE' || mode === 'both') {
    const palletPct = rack.palletCapacity > 0 ? ((rack.currentPallets || 0) / rack.palletCapacity) * 100 : 0;
    const boxPct = rack.boxCapacity > 0 ? ((rack.currentBoxes || 0) / rack.boxCapacity) * 100 : 0;
    const maxPct = Math.max(palletPct, boxPct);
    if (maxPct > 0) return Math.min(Math.round(maxPct), 100);
  }

  // Try CBM when available and used > 0
  if (rack.cbmCapacity && rack.cbmCapacity > 0 && rack.cbmUsed > 0) {
    return Math.min(Math.round((rack.cbmUsed / rack.cbmCapacity) * 100), 200);
  }

  // FLEXIBLE/BOTH without pallet/box ratio
  if (mode === 'FLEXIBLE' || mode === 'both') {
    return rack.capacityUsed > 0 ? 50 : 0;
  }

  // UNLIMITED
  if (mode === 'UNLIMITED') {
    if (rack.cbmUsed > 0 && rack.cbmCapacity > 0) {
      return Math.min(Math.round((rack.cbmUsed / rack.cbmCapacity) * 100), 200);
    }
    return rack.capacityUsed > 0 ? 50 : 0;
  }

  // FIXED (default)
  const total = rack.capacityTotal || 1;
  return Math.min(Math.round((rack.capacityUsed / total) * 100), 100);
};

const getUtilizationBg = (percentage: number) => {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 90) return 'bg-orange-500';
  if (percentage >= 70) return 'bg-yellow-500';
  if (percentage >= 50) return 'bg-lime-500';
  return 'bg-green-500';
};

const getStatusLabel = (rack: any, utilization: number) => {
  if (rack.status === 'MAINTENANCE') return '\u{1F527}';
  if (rack.status === 'RESERVED') return '\u{1F4CC}';
  if (utilization >= 100) return 'FULL';
  if (utilization > 0) return `${utilization}%`;
  return '\u{1F7E2}';
};

const animationStyles = `
@keyframes rackFadeIn {
  from { opacity: 0; transform: scale(0.8) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes zoneSlideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulseUrgent {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}
@keyframes pulseWarning {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(234, 179, 8, 0); }
}
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.animate-pulse-urgent {
  animation: pulseUrgent 2s ease-in-out infinite;
}
.animate-pulse-warning {
  animation: pulseWarning 2s ease-in-out infinite;
}
`;

export const RackMapView: React.FC<RackMapViewProps> = ({ racks, zones, onRackClick }) => {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const totalRacks = racks.length;
  const occupiedRacks = racks.filter((r: any) => r.capacityUsed > 0).length;
  const emptyRacks = racks.filter((r: any) => r.capacityUsed === 0).length;
  const fullRacks = racks.filter((r: any) => {
    const total = r.capacityTotal || 1;
    return r.capacityUsed >= total;
  }).length;

  const racksByZone = zones.reduce((acc: any, zone: string) => {
    acc[zone] = racks.filter((r: any) => (r.zone || 'Unassigned') === zone);
    return acc;
  }, {} as any);

  const occPct = totalRacks > 0 ? Math.round((occupiedRacks / totalRacks) * 100) : 0;

  return (
    <div ref={containerRef} className="space-y-4">
      <style>{animationStyles}</style>

      {/* Health Summary Bar */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex flex-wrap items-center gap-4 md:gap-8">
          <div className="text-center min-w-[60px]">
            <p className="text-xs font-medium text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{totalRacks}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center min-w-[60px]">
            <p className="text-xs font-medium text-gray-500">Empty</p>
            <p className="text-2xl font-bold text-green-600">{emptyRacks}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center min-w-[60px]">
            <p className="text-xs font-medium text-gray-500">In Use</p>
            <p className="text-2xl font-bold text-blue-600">{occupiedRacks - fullRacks}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center min-w-[60px]">
            <p className="text-xs font-medium text-gray-500">Full</p>
            <p className={`text-2xl font-bold ${fullRacks > 0 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
              {fullRacks}
            </p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs font-medium text-gray-500 mb-1">Occupancy</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${occPct}%`,
                    background: occPct >= 80
                      ? 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)'
                      : 'linear-gradient(90deg, #22c55e, #3b82f6)',
                  }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 min-w-[3rem]">{occPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className={`flex flex-wrap items-center gap-3 md:gap-5 text-xs px-1 transition-all duration-500 delay-100 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {[
          { color: 'bg-green-500', label: '<50%' },
          { color: 'bg-lime-500', label: '50-70%' },
          { color: 'bg-yellow-500', label: '70-90%' },
          { color: 'bg-orange-500', label: '90-99%' },
          { color: 'bg-red-500', label: '100%+ Full' },
          { color: 'bg-blue-300', label: 'Reserved' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${item.color} transition-transform hover:scale-125`} />
            <span className="text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Zone Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(racksByZone).sort(([a]: any, [b]: any) => {
          if (a === 'Unassigned') return 1;
          if (b === 'Unassigned') return -1;
          return a.localeCompare(b);
        }).map(([zoneName, zoneRacks]: [string, any], zoneIdx) => {
          const zOccupied = zoneRacks.filter((r: any) => r.capacityUsed > 0).length;
          const zTotal = zoneRacks.length;
          const zUtil = zTotal > 0 ? Math.round((zOccupied / zTotal) * 100) : 0;

          const zoneStyle = {
            animation: 'zoneSlideIn 0.5s ease-out both',
            animationDelay: `${zoneIdx * 0.1}s`,
          };

          return (
            <div
              key={zoneName}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
              style={zoneStyle}
            >
              {/* Zone Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {zoneName === 'Unassigned' ? '\u{1F4E6}' : '\u{1F3E2}'}
                    <span>{zoneName === 'Unassigned' ? 'Unassigned' : `Zone ${zoneName}`}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium">{zTotal}</span> racks &middot;
                    <span className="text-blue-600 font-medium"> {zOccupied}</span> occupied &middot;
                    <span className="text-green-600 font-medium"> {zTotal - zOccupied}</span> free
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mini utilization ring */}
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        stroke={zUtil >= 90 ? '#ef4444' : zUtil >= 70 ? '#eab308' : '#22c55e'}
                        strokeWidth="3"
                        strokeDasharray={`${2 * Math.PI * 15}`}
                        strokeDashoffset={`${2 * Math.PI * 15 * (1 - zUtil / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${zUtil >= 90 ? 'text-red-600' : zUtil >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {zUtil}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Rack Grid with Staggered Animation */}
              <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {zoneRacks.map((rack: any, rackIdx: number) => {
                  const utilization = calcUtilization(rack);
                  const colorClass = getUtilizationBg(utilization);
                  const isReserved = rack.status === 'RESERVED';
                  const isMaintenance = rack.status === 'MAINTENANCE';
                  const isFull = utilization >= 100;
                  const isHighUtil = utilization >= 90 && utilization < 100;

                  let tileClasses = 'border-green-300 bg-green-50';
                  if (isReserved) tileClasses = 'border-blue-300 bg-blue-50';
                  else if (isMaintenance) tileClasses = 'border-amber-300 bg-amber-50';
                  else if (isFull) tileClasses = 'border-red-300 bg-red-50';
                  else if (isHighUtil) tileClasses = 'border-orange-300 bg-orange-50';
                  else if (utilization >= 70) tileClasses = 'border-yellow-300 bg-yellow-50';
                  else if (utilization >= 50) tileClasses = 'border-lime-300 bg-lime-50';

                  return (
                    <button
                      key={rack.id}
                      onClick={() => onRackClick(rack)}
                      className={`group relative flex flex-col items-center justify-center p-1.5 rounded-lg border-2
                        transition-all duration-300 ease-out
                        hover:shadow-lg hover:scale-110 hover:z-10 hover:border-gray-400
                        ${isFull ? 'animate-pulse-urgent' : isHighUtil ? 'animate-pulse-warning' : ''}
                        min-h-[3.5rem] md:min-h-[4rem]
                        ${tileClasses}
                      `}
                      style={{
                        animation: 'rackFadeIn 0.4s ease-out both',
                        animationDelay: `${rackIdx * 30}ms`,
                      }}
                      title={`${rack.code} - ${utilization}% full${rack.location ? ' - ' + rack.location : ''}`}
                    >
                      {/* Status dot */}
                      <div className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full
                        ${isReserved ? 'bg-blue-500' :
                          isMaintenance ? 'bg-amber-500' :
                          isFull ? 'bg-red-500' :
                          colorClass}`}
                      />
                      <span className="text-[10px] md:text-xs font-bold text-gray-800 leading-tight text-center">
                        {rack.code}
                      </span>
                      {utilization > 0 && (
                        <div className="w-full bg-gray-200/60 rounded-full h-1 mt-0.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      )}
                      <span className={`text-[8px] md:text-[10px] font-semibold mt-0.5
                        ${isFull ? 'text-red-600' :
                          isHighUtil ? 'text-orange-600' :
                          utilization > 0 ? 'text-gray-500' : 'text-green-600'}`}>
                        {getStatusLabel(rack, utilization)}
                      </span>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full
                        bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        whitespace-nowrap pointer-events-none z-20">
                        {rack.code} &mdash; {utilization}% used
                        {rack.cbmUsed > 0 && ` \u2022 ${rack.cbmUsed.toFixed(1)} m\u00B3`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

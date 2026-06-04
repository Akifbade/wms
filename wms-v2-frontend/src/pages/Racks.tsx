import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Warehouse, X, Box, Ruler, Package, Layers,
  ChevronDown, LayoutGrid, List, AlertCircle,
  Building2, HardDrive, RefreshCw,
} from 'lucide-react'
import {
  PageHeader, Card, Button, SearchInput, StatusBadge,
  DataTable, EmptyState, ProgressBar, Spinner,
} from '../components/ui'
import { fetchRacks } from '../api/client'
import type { Rack } from '../api/types'

// ===== STATUS CONFIG =====
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', label: 'Active' },
  OCCUPIED: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Occupied' },
  MAINTENANCE: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', label: 'Maintenance' },
  RESERVED: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', label: 'Reserved' },
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', dot: 'bg-gray-400', label: status }
}

// ===== CBM UTILIZATION HELPERS =====
function utilizationColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-amber-500'
  if (pct >= 40) return 'bg-indigo-500'
  return 'bg-green-500'
}

function calcUtil(rack: Rack): number {
  if (rack.cbmCapacity && rack.cbmCapacity > 0) {
    return Math.round((rack.cbmUsed / rack.cbmCapacity) * 100)
  }
  return rack.capacityTotal > 0 ? Math.round((rack.capacityUsed / rack.capacityTotal) * 100) : 0
}

function formatCBM(val: number | undefined | null): string {
  if (val == null || isNaN(val)) return '—'
  return val.toFixed(1)
}

// ===== RACK DETAIL MODAL =====
function RackDetailModal({ rack, onClose }: { rack: Rack; onClose: () => void }) {
  const utilPct = calcUtil(rack)
  const statusStyle = getStatusStyle(rack.status)
  const boxes = rack.boxes || []

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-24 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Warehouse className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Rack {rack.code}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Zone {rack.zone || '—'} {rack.zoneDescription ? `· ${rack.zoneDescription}` : ''} · {rack.rackType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + Utilization Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                {statusStyle.label}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                CBM Utilization
              </label>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCBM(rack.cbmUsed)} / {formatCBM(rack.cbmCapacity)} CBM ({utilPct}%)
              </div>
              <div className="mt-1.5">
                <ProgressBar value={rack.cbmUsed} max={rack.cbmCapacity || rack.capacityTotal || 1} color={utilizationColor(utilPct)} height={2} />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Capacity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Box className="w-3.5 h-3.5" />
                  Boxes
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {rack.currentBoxes ?? 0} / {rack.boxCapacity ?? '—'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  Pallets
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {rack.currentPallets ?? 0} / {rack.palletCapacity ?? '—'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  Capacity
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {rack.capacityUsed} / {rack.capacityTotal}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Ruler className="w-3.5 h-3.5" />
                  Utilization
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {utilPct}%
                </div>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          {(rack.length || rack.width || rack.height) && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Dimensions
              </label>
              <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                {rack.length && <span>L: {rack.length} cm</span>}
                {rack.width && <span>W: {rack.width} cm</span>}
                {rack.height && <span>H: {rack.height} cm</span>}
              </div>
            </div>
          )}

          {/* Customer */}
          {rack.companyProfile && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Customer
                </div>
              </label>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {rack.companyProfile.name}
              </p>
            </div>
          )}

          {/* Boxes on this Rack */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Boxes on Rack ({boxes.length})
              </div>
            </label>
            {boxes.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Box #</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Shipment</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map(box => (
                      <tr key={box.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                          #{box.boxNumber}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {box.shipment?.id || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={box.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No boxes assigned to this rack</p>
            )}
          </div>

          {/* Capacity Notes */}
          {rack.capacityNotes && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3">
              <span className="font-medium">Notes:</span> {rack.capacityNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== RACK CARD (Grid Item) =====
function RackCard({ rack, onClick }: { rack: Rack; onClick: () => void }) {
  const utilPct = calcUtil(rack)
  const statusStyle = getStatusStyle(rack.status)
  const boxes = rack.boxes || []
  const boxesInStorage = boxes.filter(b => b.status === 'IN_STORAGE').length

  return (
    <button
      onClick={onClick}
      className="group bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all text-left w-full"
    >
      {/* Header: Code + Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
            <Warehouse className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {rack.code}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Zone {rack.zone || '—'} · {rack.rackType}
            </div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {statusStyle.label}
        </div>
      </div>

      {/* CBM Progress Bar */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>CBM</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatCBM(rack.cbmUsed)} / {formatCBM(rack.cbmCapacity)}
          </span>
        </div>
        <ProgressBar
          value={rack.cbmUsed}
          max={rack.cbmCapacity || rack.capacityTotal || 1}
          color={utilizationColor(utilPct)}
          height={1.75}
        />
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2.5 border-t border-gray-50 dark:border-gray-800">
        <span className="flex items-center gap-1">
          <Box className="w-3 h-3" />
          {boxes.length} boxes
          {boxesInStorage > 0 && (
            <span className="text-green-600 dark:text-green-400 ml-0.5">({boxesInStorage} stored)</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <Ruler className="w-3 h-3" />
          {utilPct}%
        </span>
      </div>
    </button>
  )
}

// ===== MAIN PAGE COMPONENT =====
export default function Racks() {
  const [racks, setRacks] = useState<Rack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null)

  // Load racks from API
  const loadRacks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { page?: number; limit?: number; status?: string } = { limit: 100 }
      if (statusFilter) params.status = statusFilter
      const data = await fetchRacks(params)
      setRacks(data.racks || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load racks')
      setRacks([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadRacks()
  }, [loadRacks])

  // Derive unique zones and statuses from data
  const zones = useMemo(() => {
    const zs = new Set<string>()
    racks.forEach(r => { if (r.zone) zs.add(r.zone) })
    return Array.from(zs).sort()
  }, [racks])

  const statuses = useMemo(() => {
    const ss = new Set<string>()
    racks.forEach(r => { if (r.status) ss.add(r.status) })
    return Array.from(ss).sort()
  }, [racks])

  // Filtered racks (client-side search + zone filter)
  const filtered = useMemo(() => {
    return racks.filter(r => {
      if (zoneFilter && r.zone !== zoneFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchCode = r.code.toLowerCase().includes(q)
        const matchZone = (r.zone || '').toLowerCase().includes(q)
        const matchDesc = (r.zoneDescription || '').toLowerCase().includes(q)
        const matchType = r.rackType.toLowerCase().includes(q)
        const matchCust = r.companyProfile?.name?.toLowerCase().includes(q) ?? false
        if (!matchCode && !matchZone && !matchDesc && !matchType && !matchCust) return false
      }
      return true
    })
  }, [racks, zoneFilter, search])

  // Table columns for table view
  const tableColumns = useMemo(() => [
    {
      key: 'code',
      label: 'Rack',
      render: (r: Rack) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
            <Warehouse className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{r.code}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{r.rackType}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'zone',
      label: 'Zone',
      render: (r: Rack) => (
        <span className="text-gray-700 dark:text-gray-300">Zone {r.zone || '—'}</span>
      ),
    },
    {
      key: 'cbm',
      label: 'CBM',
      render: (r: Rack) => {
        const pct = calcUtil(r)
        return (
          <div className="flex items-center gap-2 min-w-28">
            <div className="flex-1">
              <ProgressBar value={r.cbmUsed} max={r.cbmCapacity || r.capacityTotal || 1} color={utilizationColor(pct)} height={1.5} />
            </div>
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-9 text-right">{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'boxes',
      label: 'Boxes',
      render: (r: Rack) => (
        <span className="text-gray-700 dark:text-gray-300 font-mono">
          {(r.boxes || []).length}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: Rack) => <StatusBadge status={r.status} />,
    },
  ], [])

  // Reset zone filter if it becomes invalid
  useEffect(() => {
    if (zoneFilter && !zones.includes(zoneFilter)) {
      setZoneFilter('')
    }
  }, [zoneFilter, zones])

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      <PageHeader
        title="Racks"
        description="Manage warehouse racking, capacity, and stored inventory"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadRacks}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="w-full sm:w-auto sm:min-w-56">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search racks by code, zone, customer..."
            />
          </div>

          {/* Zone Filter */}
          <div className="relative">
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="">All Zones</option>
              {zones.map(z => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="">All Statuses</option>
              {statuses.map(st => (
                <option key={st} value={st}>{st.replace('_', ' ')}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* View Toggle */}
          <div className="ml-auto flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Clear Filters */}
          {(search || zoneFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setZoneFilter(''); setStatusFilter('') }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {/* Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {loading ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Loading racks...
          </span>
        ) : (
          <>Showing {filtered.length}{racks.length !== filtered.length ? ` of ${racks.length}` : ''} racks</>
        )}
      </div>

      {/* Loading State */}
      {loading && racks.length === 0 && (
        <Card>
          <Spinner />
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">Failed to Load Racks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <Button variant="secondary" onClick={loadRacks}>
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <Card>
          <EmptyState
            icon={<Warehouse className="w-full h-full" />}
            title={racks.length === 0 ? 'No racks found' : 'No matching racks'}
            message={racks.length === 0 ? 'No racks have been created yet' : 'Try adjusting your filters'}
          />
        </Card>
      )}

      {/* Grid View */}
      {!loading && !error && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(rack => (
            <RackCard
              key={rack.id}
              rack={rack}
              onClick={() => setSelectedRack(rack)}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {!loading && !error && filtered.length > 0 && viewMode === 'table' && (
        <Card className="!p-0 overflow-hidden">
          <DataTable
            columns={tableColumns}
            data={filtered}
            onRowClick={(r: Rack) => setSelectedRack(r)}
          />
        </Card>
      )}

      {/* Detail Modal */}
      {selectedRack && (
        <RackDetailModal
          rack={selectedRack}
          onClose={() => setSelectedRack(null)}
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Search, X, MapPin, ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react'
import { fetchShipments } from '../api/client'
import type { Shipment } from '../api/types'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_WAREHOUSE: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  IN_STORAGE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PARTIAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors}`}>{status}</span>
}

function ShipmentDetail({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white dark:bg-gray-800 h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{shipment.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <StatusBadge status={shipment.status} />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{shipment.referenceId}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{shipment.customerName || shipment.clientName || '-'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Boxes</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{shipment.inStorageBoxes || 0} / {shipment.originalBoxCount}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">CBM</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{shipment.cbm?.toFixed(2) || '-'} m³</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Rack</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{shipment.rackLocations || '-'}</p>
            </div>
          </div>
          {shipment.notes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-900 dark:text-white">{shipment.notes}</p>
            </div>
          )}
          {shipment.boxes && shipment.boxes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Boxes ({shipment.boxes.length})</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {shipment.boxes.map(box => (
                  <div key={box.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded px-3 py-1.5 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Box #{box.boxNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{box.rack?.code || '-'}</span>
                      <StatusBadge status={box.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Shipments() {
  const [data, setData] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Shipment | null>(null)
  const limit = 15

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchShipments({ page, limit, status: statusFilter || undefined })
      setData(res.shipments)
      setTotalPages(res.pagination?.totalPages || 1)
      setTotal(res.pagination?.total || 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, statusFilter])

  const filtered = search
    ? data.filter(s => 
        (s.name?.toLowerCase().includes(search.toLowerCase()) ||
         s.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
         s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
         s.clientName?.toLowerCase().includes(search.toLowerCase()))
      )
    : data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage warehouse shipments</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search shipments..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_WAREHOUSE">In Warehouse</option>
          <option value="IN_STORAGE">In Storage</option>
          <option value="PARTIAL">Partial</option>
          <option value="RELEASED">Released</option>
          <option value="PENDING">Pending</option>
        </select>
        <span className="text-xs text-gray-500">{total} total shipments</span>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No shipments found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name / Ref</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Boxes</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">CBM</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Rack</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(ship => (
                  <tr
                    key={ship.id}
                    onClick={() => setSelected(ship)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{ship.name}</p>
                      <p className="text-xs text-gray-400">{ship.referenceId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{ship.customerName || ship.clientName || '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{ship.inStorageBoxes || 0}/{ship.originalBoxCount}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{ship.cbm?.toFixed(2) || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {ship.rackLocations ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          <MapPin className="w-3 h-3" />{ship.rackLocations}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={ship.status} /></td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{new Date(ship.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pn = page <= 3 ? i + 1 : page - 2 + i
                  if (pn > totalPages) return null
                  return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded text-xs font-medium ${pn === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{pn}</button>
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && <ShipmentDetail shipment={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

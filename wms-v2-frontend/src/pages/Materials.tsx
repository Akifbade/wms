import { useState, useEffect } from 'react'
import { Package, Search, Loader2 } from 'lucide-react'
import { fetchMaterials } from '../api/client'
import type { Material } from '../api/types'

export default function Materials() {
  const [data, setData] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try { const r = await fetchMaterials({ limit: 100 }); setData(r.materials || []) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = search ? data.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase())
  ) : data

  const totalStock = data.reduce((s, m) => s + m.totalQuantity, 0)
  const lowStock = data.filter(m => m.minStockLevel > 0 && m.totalQuantity <= m.minStockLevel)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materials</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inventory tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Materials</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStock.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Stock</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-amber-600">{lowStock.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error} <button onClick={load} className="underline ml-2">Retry</button></div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><Package className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">No materials found</p></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Unit</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Min Level</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Unit Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{m.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium font-mono ${m.totalQuantity <= m.minStockLevel ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                      {m.totalQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{m.minStockLevel}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{m.unitCost?.toFixed(3) || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{m.sellingPrice?.toFixed(3) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

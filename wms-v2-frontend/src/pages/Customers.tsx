import { useState, useEffect } from 'react'
import { Users, Search, Loader2, Building2 } from 'lucide-react'
import { fetchCustomers } from '../api/client'

export default function Customers() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try { const r = await fetchCustomers({ limit: 100 }); setData(r.profiles || []) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = search ? data.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson?.toLowerCase().includes(search.toLowerCase())
  ) : data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.length} company profiles</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">No customers found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                  {c.contactPerson && <p className="text-xs text-gray-500 mt-0.5">{c.contactPerson}</p>}
                  {c.contactPhone && <p className="text-xs text-gray-400 mt-0.5">{c.contactPhone}</p>}
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                    c.contractStatus === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : c.contractStatus === 'EXPIRED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {c.contractStatus || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

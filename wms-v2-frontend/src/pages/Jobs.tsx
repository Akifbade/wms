import { useState, useEffect } from 'react'
import { Truck, Loader2, Calendar, User, Wrench } from 'lucide-react'

export default function Jobs() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('wms_v2_token')
      const res = await fetch('/api/moving-jobs?limit=20', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json.jobs || json.movingJobs || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const statusColors: Record<string, string> = {
    PLANNED: 'bg-blue-100 text-blue-700',
    DISPATCHED: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moving Jobs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Job management and tracking</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : error ? (
        <div className="text-center py-20 text-gray-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={load} className="mt-2 text-indigo-600 hover:underline text-sm">Retry</button>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No moving jobs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((job: any) => (
            <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg mt-0.5">
                    <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{job.jobTitle || job.jobCode}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{job.jobCode} • {job.clientName}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(job.jobDate || job.createdAt).toLocaleDateString()}</span>
                      {job.teamLeader?.name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.teamLeader.name}</span>}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>{job.status}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-4 text-xs text-gray-500">
                <span>Driver: {job.driverName || '-'}</span>
                <span>Vehicle: {job.vehicleNumber || '-'}</span>
                <span>Address: {job.jobAddress || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

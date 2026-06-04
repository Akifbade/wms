import { StatCard, ProgressBar, StatusBadge, Spinner } from '../../components/ui'
import { Package, Ruler, DollarSign, Users, TrendingUp, ChevronRight, AlertTriangle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardStats } from '../../shared/types'
import { PageHeader, Card } from '../../components/ui'

export default function Dashboard({ data, loading }: { data: DashboardStats | null; loading: boolean }) {
  if (loading) return <Spinner />
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-gray-500">Could not load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of warehouse operations"
        action={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Active Shipments"
          value={data.activeShipments}
          sub={`${data.totalShipments} total • ${data.totalBoxes.toLocaleString()} boxes`}
          color="bg-indigo-500"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          icon={<Ruler className="w-5 h-5" />}
          label="Rack Utilization"
          value={`${data.cbmUtilization}%`}
          sub={`${data.usedCBM.toFixed(1)} / ${data.totalCBM.toFixed(1)} CBM`}
          color="bg-violet-500"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Pending Collection"
          value={`${data.totalPendingAmount.toLocaleString()} KWD`}
          sub={`${data.collectionRate}% collected`}
          color={data.collectionRate < 50 ? 'bg-red-500' : 'bg-amber-500'}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Customers"
          value={data.totalCustomers}
          sub={`${data.activeJobs} active jobs`}
          color="bg-emerald-500"
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* Rack Utilization */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rack CBM Utilization</h3>
        <ProgressBar value={data.usedCBM} max={data.totalCBM} color="bg-violet-500" />
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500">{data.usedCBM.toFixed(1)} CBM used</span>
          <span className="text-gray-500">{data.totalCBM.toFixed(1)} CBM total</span>
          <span className="font-medium text-violet-600">{data.cbmUtilization}%</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{data.activeRacks}</p>
            <p className="text-xs text-gray-500">Active Racks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{data.totalRacks}</p>
            <p className="text-xs text-gray-500">Total Racks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{data.totalBoxes.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Boxes</p>
          </div>
        </div>
      </Card>

      {/* Finance + Recent Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Finance Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Pending Amount</span>
              <span className="font-semibold text-gray-900">{data.totalPendingAmount.toLocaleString()} KWD</span>
            </div>
            <ProgressBar value={data.collectedAmount} max={data.totalPendingAmount + data.collectedAmount} color="bg-emerald-500" />
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">{data.collectedAmount.toLocaleString()} KWD collected</span>
              <span className="text-gray-500">{data.collectionRate}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Pending Invoices</p>
                <p className="text-lg font-bold text-gray-900">{data.pendingInvoices}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Customers</p>
                <p className="text-lg font-bold text-gray-900">{data.totalCustomers}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Shipments</h3>
            <Link to="/shipments" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {data.recentShipments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent shipments</p>
          ) : (
            <div className="space-y-3">
              {data.recentShipments.map(ship => (
                <div key={ship.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{ship.name}</p>
                    <p className="text-xs text-gray-500">{ship.customer} • {ship.boxes} boxes • {ship.cbm.toFixed(2)} CBM</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <StatusBadge status={ship.status} />
                    <span className="text-xs text-gray-400">{ship.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Customer {
  customerName: string;
  shipper: string | null;
  consignee: string | null;
  totalShipments: number;
  totalBoxes: number;
  assignedBoxes: number;
  inStorageBoxes: number;
  releasedBoxes: number;
  categories: string[];
  items: Array<{
    category: string;
    totalQuantity: number;
    totalWeight: number;
    totalValue: number;
    itemNames: string[];
  }>;
  locations: string[];
  shipments: Array<{
    id: string;
    name: string;
    referenceId: string;
    category: string;
    awbNumber: string | null;
    status: string;
    boxCount: number;
    arrivalDate: string;
  }>;
}

export default function CustomerMaterialsView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalBoxes: 0,
    totalShipments: 0,
    categoryBreakdown: [] as Array<{ category: string; count: number }>,
  });

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, [categoryFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/customers/materials?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        setError('Failed to load customers');
      }
    } catch (err: any) {
      setError('Failed to load customers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/customers/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CUSTOMER_STORAGE':
        return 'bg-blue-100 text-blue-800';
      case 'AIRPORT_CARGO':
        return 'bg-purple-100 text-purple-800';
      case 'WAREHOUSE_STOCK':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CUSTOMER_STORAGE':
        return '📦';
      case 'AIRPORT_CARGO':
        return '✈️';
      case 'WAREHOUSE_STOCK':
        return '🏭';
      default:
        return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Materials</h1>
              <p className="text-gray-600 mt-1">
                View all customer shipments and their stored materials
              </p>
            </div>
            <Link
              to="/shipments"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Shipments
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Total Customers</div>
              <div className="text-3xl font-bold mt-1">{stats.totalCustomers}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Total Boxes</div>
              <div className="text-3xl font-bold mt-1">{stats.totalBoxes}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Total Shipments</div>
              <div className="text-3xl font-bold mt-1">{stats.totalShipments}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Categories</div>
              <div className="text-3xl font-bold mt-1">{stats.categoryBreakdown.length}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadCustomers()}
              placeholder="Search customer name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="CUSTOMER_STORAGE">📦 Customer Storage</option>
              <option value="AIRPORT_CARGO">✈️ Airport Cargo</option>
              <option value="WAREHOUSE_STOCK">🏭 Warehouse Stock</option>
            </select>
            <button
              onClick={loadCustomers}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        )}

        {/* Customers List */}
        {!loading && customers.length > 0 && (
          <div className="space-y-4">
            {customers.map((customer, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                {/* Customer Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {customer.customerName}
                      </h2>
                      {customer.categories.map(cat => (
                        <span
                          key={cat}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                            cat
                          )}`}
                        >
                          {getCategoryIcon(cat)} {cat.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    {customer.shipper && (
                      <p className="text-sm text-gray-600">Shipper: {customer.shipper}</p>
                    )}
                    {customer.consignee && (
                      <p className="text-sm text-gray-600">Consignee: {customer.consignee}</p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setSelectedCustomer(
                        selectedCustomer?.customerName === customer.customerName
                          ? null
                          : customer
                      )
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {selectedCustomer?.customerName === customer.customerName
                      ? 'Hide Details'
                      : 'View Details'}
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Shipments</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {customer.totalShipments}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Total Boxes</div>
                    <div className="text-2xl font-bold text-blue-600">{customer.totalBoxes}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">In Storage</div>
                    <div className="text-2xl font-bold text-green-600">
                      {customer.inStorageBoxes}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Released</div>
                    <div className="text-2xl font-bold text-gray-600">
                      {customer.releasedBoxes}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Locations</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {customer.locations.length}
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                {customer.items.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      📦 Items Breakdown
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {customer.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200"
                        >
                          <div className="font-semibold text-blue-900">{item.category}</div>
                          <div className="text-sm text-blue-700 mt-1">
                            Qty: {item.totalQuantity}
                            {item.totalWeight > 0 && ` • ${item.totalWeight.toFixed(2)} KG`}
                          </div>
                          {item.totalValue > 0 && (
                            <div className="text-sm text-blue-700">
                              Value: {item.totalValue.toFixed(2)} KWD
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {item.itemNames.slice(0, 2).join(', ')}
                            {item.itemNames.length > 2 && ` +${item.itemNames.length - 2} more`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rack Locations */}
                {customer.locations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">📍 Locations</h3>
                    <div className="flex flex-wrap gap-2">
                      {customer.locations.map((location, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                        >
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {selectedCustomer?.customerName === customer.customerName && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Shipment Details</h3>
                    <div className="space-y-3">
                      {customer.shipments.map(shipment => (
                        <div
                          key={shipment.id}
                          className="bg-gray-50 p-4 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{shipment.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              Ref: {shipment.referenceId} • {shipment.boxCount} boxes •{' '}
                              {new Date(shipment.arrivalDate).toLocaleDateString()}
                              {shipment.awbNumber && ` • AWB: ${shipment.awbNumber}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                                shipment.category
                              )}`}
                            >
                              {shipment.category.replace('_', ' ')}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                shipment.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {shipment.status}
                            </span>
                            <Link
                              to={`/shipments/${shipment.id}`}
                              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && customers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Customers Found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria, or create a new shipment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

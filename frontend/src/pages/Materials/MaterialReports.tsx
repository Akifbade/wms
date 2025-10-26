import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  DollarSign, ShoppingCart, Users, Activity,
  Download, Calendar, Filter
} from 'lucide-react';

interface StockSummary {
  summary: any[];
  totals: {
    totalMaterials: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
  };
}

const MaterialReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Report Data States
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [consumptionData, setConsumptionData] = useState<any>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any>(null);
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);

  useEffect(() => {
    loadReportData();
  }, [activeReport, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      switch (activeReport) {
        case 'overview':
        case 'stock':
          const stockRes = await fetch('/api/materials/reports/stock-summary', { headers });
          const stockData = await stockRes.json();
          setStockSummary(stockData);
          break;

        case 'low-stock':
          const lowStockRes = await fetch('/api/materials/reports/low-stock', { headers });
          const lowStockData = await lowStockRes.json();
          setLowStockAlerts(lowStockData.lowStockAlerts || []);
          break;

        case 'consumption':
          const consumptionUrl = `/api/materials/reports/consumption?startDate=${dateRange.start}&endDate=${dateRange.end}`;
          const consumptionRes = await fetch(consumptionUrl, { headers });
          const consumptionData = await consumptionRes.json();
          setConsumptionData(consumptionData);
          break;

        case 'purchases':
          const purchaseUrl = `/api/materials/reports/purchase-history?startDate=${dateRange.start}&endDate=${dateRange.end}`;
          const purchaseRes = await fetch(purchaseUrl, { headers });
          const purchaseData = await purchaseRes.json();
          setPurchaseHistory(purchaseData);
          break;

        case 'vendors':
          const vendorRes = await fetch('/api/materials/reports/vendor-performance', { headers });
          const vendorData = await vendorRes.json();
          setVendorPerformance(vendorData.vendors || []);
          break;

        case 'valuation':
          const valuationRes = await fetch('/api/materials/reports/valuation', { headers });
          const valuationData = await valuationRes.json();
          setValuation(valuationData);
          break;
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Material Reports & Analytics</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={loadReportData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'stock', label: 'Stock Summary', icon: Package },
          { id: 'low-stock', label: 'Low Stock Alerts', icon: AlertTriangle },
          { id: 'consumption', label: 'Consumption', icon: TrendingDown },
          { id: 'purchases', label: 'Purchase History', icon: ShoppingCart },
          { id: 'vendors', label: 'Vendor Performance', icon: Users },
          { id: 'valuation', label: 'Stock Valuation', icon: DollarSign }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap ${
              activeReport === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading report data...</div>
      ) : (
        <>
          {/* Overview Report */}
          {activeReport === 'overview' && stockSummary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total Materials</p>
                      <p className="text-2xl font-bold">{stockSummary.totals.totalMaterials}</p>
                    </div>
                    <Package className="w-10 h-10 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Low Stock Items</p>
                      <p className="text-2xl font-bold text-orange-600">{stockSummary.totals.lowStockItems}</p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Out of Stock</p>
                      <p className="text-2xl font-bold text-red-600">{stockSummary.totals.outOfStockItems}</p>
                    </div>
                    <TrendingDown className="w-10 h-10 text-red-600" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total Value</p>
                      <p className="text-2xl font-bold">{stockSummary.totals.totalValue.toFixed(2)} KWD</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-bold mb-4">Stock by Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stockSummary.summary.reduce((acc: any[], item: any) => {
                          const existing = acc.find(a => a.category === item.category);
                          if (existing) {
                            existing.value += item.totalQuantity;
                          } else {
                            acc.push({ category: item.category, value: item.totalQuantity });
                          }
                          return acc;
                        }, [])}
                        dataKey="value"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {stockSummary.summary.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-bold mb-4">Stock Value by Material</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockSummary.summary.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sku" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalValue" fill="#4F46E5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Stock Summary Report */}
          {activeReport === 'stock' && stockSummary && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 flex justify-between items-center border-b">
                <h2 className="text-xl font-bold">Stock Summary Report</h2>
                <button
                  onClick={() => exportToCSV(stockSummary.summary, 'stock-summary')}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value (KWD)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockSummary.summary.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.totalQuantity} {item.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.minStockLevel}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.stockStatus === 'ADEQUATE' ? 'bg-green-100 text-green-800' :
                            item.stockStatus === 'LOW' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.stockStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.totalValue.toFixed(2)} KWD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low Stock Alerts */}
          {activeReport === 'low-stock' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-red-600">Low Stock Alerts ({lowStockAlerts.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shortfall</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lowStockAlerts.map((alert: any) => (
                      <tr key={alert.id} className="bg-red-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{alert.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{alert.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                          {alert.currentStock} {alert.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{alert.minStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{alert.shortfall}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {alert.suggestedReorderQty} {alert.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other reports similar structure... */}
          {activeReport === 'consumption' && consumptionData && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Material Consumption Report</h2>
              <p className="text-gray-600">Total Usage Records: {consumptionData.totalRecords}</p>
              {/* Add consumption table/charts here */}
            </div>
          )}

          {activeReport === 'purchases' && purchaseHistory && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Purchase History</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border p-4 rounded">
                  <p className="text-gray-500 text-sm">Total Purchases</p>
                  <p className="text-2xl font-bold">{purchaseHistory.summary.totalPurchases}</p>
                </div>
                <div className="border p-4 rounded">
                  <p className="text-gray-500 text-sm">Total Quantity</p>
                  <p className="text-2xl font-bold">{purchaseHistory.summary.totalQuantity}</p>
                </div>
                <div className="border p-4 rounded">
                  <p className="text-gray-500 text-sm">Total Amount</p>
                  <p className="text-2xl font-bold">{purchaseHistory.summary.totalAmount.toFixed(2)} KWD</p>
                </div>
              </div>
              {/* Add purchase history table here */}
            </div>
          )}

          {activeReport === 'vendors' && vendorPerformance.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">Vendor Performance Report</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Purchases</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorPerformance.map((vendor: any) => (
                      <tr key={vendor.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{vendor.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          ⭐ {vendor.rating.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{vendor.totalPurchases}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{vendor.totalAmount.toFixed(2)} KWD</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{vendor.avgUnitCost.toFixed(2)} KWD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReport === 'valuation' && valuation && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Stock Valuation Report ({valuation.valuationMethod})</h2>
                <div className="text-right">
                  <p className="text-gray-500 text-sm">Total Inventory Value</p>
                  <p className="text-3xl font-bold text-green-600">{valuation.totalValue.toFixed(2)} KWD</p>
                </div>
              </div>
              {/* Add valuation details here */}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MaterialReports;

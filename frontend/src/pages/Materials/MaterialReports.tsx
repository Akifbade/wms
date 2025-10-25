import React, { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';
import { getAuthToken } from '../../services/api';

interface MaterialReport {
  materialId: string;
  materialName: string;
  sku: string;
  totalPurchased: number;
  totalUsed: number;
  currentStock: number;
  damageCount: number;
  costValue: number;
}

const MaterialReports: React.FC = () => {
  const [reports, setReports] = useState<MaterialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, lowstock, highusage, damaged

  useEffect(() => {
    fetchReports();
  }, [filterType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`/api/materials`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const materials = await response.json();

      // Transform to report format
      const reportData = materials.map((m: any) => ({
        materialId: m.id,
        materialName: m.name,
        sku: m.sku,
        totalPurchased: m.stockBatches?.reduce((sum: number, b: any) => sum + b.quantityPurchased, 0) || 0,
        totalUsed: m.stockBatches?.reduce((sum: number, b: any) => sum + (b.quantityPurchased - b.quantityRemaining), 0) || 0,
        currentStock: m.totalQuantity || 0,
        damageCount: 0,
        costValue: (m.totalQuantity || 0) * (m.unitCost || 0),
      }));

      setReports(reportData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReports = () => {
    let filtered = reports;

    if (filterType === 'lowstock') {
      filtered = reports.filter((r) => r.currentStock <= 10);
    } else if (filterType === 'highusage') {
      filtered = reports.filter((r) => r.totalUsed > 50);
    } else if (filterType === 'damaged') {
      filtered = reports.filter((r) => r.damageCount > 0);
    }

    return filtered;
  };

  const downloadReport = () => {
    const data = getFilteredReports();
    const csv = [
      ['SKU', 'Material Name', 'Purchased', 'Used', 'Current Stock', 'Damaged', 'Cost Value'],
      ...data.map((r) => [
        r.sku,
        r.materialName,
        r.totalPurchased,
        r.totalUsed,
        r.currentStock,
        r.damageCount,
        `Rs. ${r.costValue.toFixed(2)}`,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredReports = getFilteredReports();

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Material Reports</h1>
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All Materials ({reports.length})
        </button>
        <button
          onClick={() => setFilterType('lowstock')}
          className={`px-4 py-2 rounded ${filterType === 'lowstock' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Low Stock ({reports.filter((r) => r.currentStock <= 10).length})
        </button>
        <button
          onClick={() => setFilterType('highusage')}
          className={`px-4 py-2 rounded ${filterType === 'highusage' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          High Usage ({reports.filter((r) => r.totalUsed > 50).length})
        </button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Material Name</th>
              <th className="p-3 text-center">Purchased</th>
              <th className="p-3 text-center">Used</th>
              <th className="p-3 text-center">Current Stock</th>
              <th className="p-3 text-center">Damaged</th>
              <th className="p-3 text-right">Cost Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.materialId} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-sm">{report.sku}</td>
                <td className="p-3">{report.materialName}</td>
                <td className="p-3 text-center">{report.totalPurchased}</td>
                <td className="p-3 text-center">{report.totalUsed}</td>
                <td className="p-3 text-center">
                  {report.currentStock <= 10 ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-semibold">
                      {report.currentStock}
                    </span>
                  ) : (
                    <span className="font-semibold">{report.currentStock}</span>
                  )}
                </td>
                <td className="p-3 text-center">{report.damageCount}</td>
                <td className="p-3 text-right">Rs. {report.costValue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Materials</p>
          <p className="text-2xl font-bold">{reports.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Purchased</p>
          <p className="text-2xl font-bold">{reports.reduce((sum, r) => sum + r.totalPurchased, 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Used</p>
          <p className="text-2xl font-bold">{reports.reduce((sum, r) => sum + r.totalUsed, 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Stock Value</p>
          <p className="text-2xl font-bold">Rs. {reports.reduce((sum, r) => sum + r.costValue, 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default MaterialReports;

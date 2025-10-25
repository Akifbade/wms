import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Package, MapPin, Camera, FileText, Download, Printer } from 'lucide-react';

interface DamageRecord {
  id: string;
  material: {
    sku: string;
    name: string;
    unit: string;
  };
  quantity: number;
  reason: string;
  photoUrls: string[];
  recordedAt: string;
  job: {
    jobCode: string;
    jobTitle: string;
    jobAddress: string;
  };
  recordedBy: {
    name: string;
  };
  estimatedValue: number;
}

interface DamageSummary {
  totalItems: number;
  totalValue: number;
  mostDamagedMaterial: string;
  recentDamageDate: string;
}

export const DamageReport: React.FC = () => {
  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [summary, setSummary] = useState<DamageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    materialId: ''
  });

  useEffect(() => {
    loadDamageReport();
  }, []);

  const loadDamageReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.materialId) params.append('materialId', filters.materialId);

      const response = await fetch(`/api/reports/damages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setDamages(data.damages);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load damage report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Job Code', 'Material', 'SKU', 'Quantity', 'Reason', 'Value', 'Recorded By'];
    const rows = damages.map(d => [
      new Date(d.recordedAt).toLocaleDateString(),
      d.job.jobCode,
      d.material.name,
      d.material.sku,
      d.quantity,
      d.reason,
      d.estimatedValue.toFixed(2),
      d.recordedBy.name
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `damage-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 print:mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              Damage Report
            </h1>
            <p className="text-gray-600 mt-1">Complete record of damaged materials with photos and job details</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6 print:mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium mb-1">Total Damaged Items</p>
            <p className="text-3xl font-bold text-red-600">{summary.totalItems}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-700 font-medium mb-1">Estimated Value Loss</p>
            <p className="text-3xl font-bold text-orange-600">₹{summary.totalValue.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700 font-medium mb-1">Most Damaged</p>
            <p className="text-lg font-bold text-yellow-600">{summary.mostDamagedMaterial}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">Recent Damage</p>
            <p className="text-lg font-bold text-blue-600">
              {new Date(summary.recentDamageDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6 print:hidden">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadDamageReport}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Damage Records */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading damage records...</p>
          </div>
        ) : damages.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No damage records found</p>
          </div>
        ) : (
          <div className="divide-y">
            {damages.map((damage) => (
              <div key={damage.id} className="p-6 hover:bg-gray-50">
                <div className="flex gap-6">
                  {/* Left: Details */}
                  <div className="flex-1">
                    {/* Material Info */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Package className="w-5 h-5 text-red-600" />
                          {damage.material.name}
                        </h3>
                        <p className="text-sm text-gray-600">SKU: {damage.material.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">{damage.quantity} {damage.material.unit}</p>
                        <p className="text-sm text-gray-600">₹{damage.estimatedValue.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                      <p className="font-semibold text-blue-900 mb-1">Job Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Job Code:</span>
                          <span className="ml-2 font-medium text-blue-700">{damage.job.jobCode}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Title:</span>
                          <span className="ml-2 font-medium">{damage.job.jobTitle}</span>
                        </div>
                        <div className="col-span-2">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          <span className="text-gray-700">{damage.job.jobAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Damage Reason */}
                    <div className="mb-3">
                      <p className="font-semibold text-gray-700 mb-1">Damage Reason:</p>
                      <p className="text-gray-800 bg-yellow-50 border border-yellow-200 rounded p-2">
                        {damage.reason}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(damage.recordedAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Recorded by: {damage.recordedBy.name}
                      </span>
                    </div>
                  </div>

                  {/* Right: Photos */}
                  <div className="w-64">
                    <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Damage Photos ({damage.photoUrls.length})
                    </p>
                    {damage.photoUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {damage.photoUrls.map((url, idx) => (
                          <div
                            key={idx}
                            className="aspect-square border rounded overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => setSelectedPhoto(url)}
                          >
                            <img
                              src={url}
                              alt={`Damage ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No photos available</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 print:hidden"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-[90vh] p-4">
            <img
              src={selectedPhoto}
              alt="Damage"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};

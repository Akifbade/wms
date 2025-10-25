import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';

interface JobMaterialReportProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

interface MaterialIssue {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  issuedAt: string;
  material: {
    sku: string;
    name: string;
    unit: string;
  };
  returns: Array<{
    quantityUsed: number;
    quantityGood: number;
    quantityDamaged: number;
    recordedAt: string;
  }>;
  damages: Array<{
    quantity: number;
    reason: string;
    photoUrls: string;
  }>;
}

interface JobData {
  jobCode: string;
  jobTitle: string;
  clientName: string;
  jobDate: string;
  status: string;
}

export default function JobMaterialReport({ isOpen, onClose, jobId }: JobMaterialReportProps) {
  const [job, setJob] = useState<JobData | null>(null);
  const [materials, setMaterials] = useState<MaterialIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadData();
    }
  }, [isOpen, jobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Load job details
      const jobResponse = await fetch(`/api/moving-jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jobData = await jobResponse.json();
      setJob(jobData);

      // Load issued materials
      const materialsResponse = await fetch(`/api/materials/job-materials/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const materialsData = await materialsResponse.json();
      setMaterials(materialsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalIssued = materials.reduce((sum, m) => sum + m.quantity, 0);
    const totalUsed = materials.reduce((sum, m) => {
      const returned = m.returns?.[0];
      return sum + (returned?.quantityUsed || 0);
    }, 0);
    const totalReturned = materials.reduce((sum, m) => {
      const returned = m.returns?.[0];
      return sum + (returned?.quantityGood || 0);
    }, 0);
    const totalDamaged = materials.reduce((sum, m) => {
      const returned = m.returns?.[0];
      return sum + (returned?.quantityDamaged || 0);
    }, 0);
    const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);

    return { totalIssued, totalUsed, totalReturned, totalDamaged, totalCost };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const totals = calculateTotals();
    let csv = 'Material SKU,Material Name,Issued Qty,Used Qty,Returned Good,Damaged,Unit Cost,Total Cost,Status\n';
    
    materials.forEach(material => {
      const returned = material.returns?.[0];
      const status = returned ? 'Returned' : 'Pending';
      csv += `${material.material.sku},${material.material.name},${material.quantity},${returned?.quantityUsed || 0},${returned?.quantityGood || 0},${returned?.quantityDamaged || 0},${material.unitCost},${material.totalCost},${status}\n`;
    });

    csv += `\nTotals:,,,${totals.totalIssued},${totals.totalUsed},${totals.totalReturned},${totals.totalDamaged},,${totals.totalCost}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Job-${job?.jobCode}-Material-Report.csv`;
    a.click();
  };

  if (!isOpen) return null;

  const totals = calculateTotals();

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center no-print">
            <h2 className="text-2xl font-bold">📊 Job Material Report</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div ref={printRef} id="printable-report" className="p-6">
            {loading ? (
              <p className="text-center py-8">Loading...</p>
            ) : (
              <>
                {/* Job Header */}
                <div className="mb-6 border-b pb-4">
                  <h1 className="text-3xl font-bold mb-2">Material Usage Report</h1>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Job Code:</strong> {job?.jobCode}</p>
                      <p><strong>Job Title:</strong> {job?.jobTitle}</p>
                    </div>
                    <div>
                      <p><strong>Client:</strong> {job?.clientName}</p>
                      <p><strong>Date:</strong> {new Date(job?.jobDate || '').toLocaleDateString()}</p>
                      <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${
                        job?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>{job?.status}</span></p>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Total Issued</p>
                    <p className="text-2xl font-bold text-blue-600">{totals.totalIssued}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Total Used</p>
                    <p className="text-2xl font-bold text-purple-600">{totals.totalUsed}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Returned Good</p>
                    <p className="text-2xl font-bold text-green-600">{totals.totalReturned}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Damaged</p>
                    <p className="text-2xl font-bold text-red-600">{totals.totalDamaged}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-yellow-600">₹{totals.totalCost.toFixed(2)}</p>
                  </div>
                </div>

                {/* Materials Table */}
                <table className="min-w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">SKU</th>
                      <th className="border px-4 py-2 text-left">Material Name</th>
                      <th className="border px-4 py-2 text-center">Issued</th>
                      <th className="border px-4 py-2 text-center">Used</th>
                      <th className="border px-4 py-2 text-center">Returned</th>
                      <th className="border px-4 py-2 text-center">Damaged</th>
                      <th className="border px-4 py-2 text-right">Unit Cost</th>
                      <th className="border px-4 py-2 text-right">Total Cost</th>
                      <th className="border px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map(material => {
                      const returned = material.returns?.[0];
                      return (
                        <tr key={material.id}>
                          <td className="border px-4 py-2">{material.material.sku}</td>
                          <td className="border px-4 py-2">{material.material.name}</td>
                          <td className="border px-4 py-2 text-center">{material.quantity} {material.material.unit}</td>
                          <td className="border px-4 py-2 text-center">{returned?.quantityUsed || '-'}</td>
                          <td className="border px-4 py-2 text-center text-green-600">{returned?.quantityGood || '-'}</td>
                          <td className="border px-4 py-2 text-center text-red-600">{returned?.quantityDamaged || '-'}</td>
                          <td className="border px-4 py-2 text-right">₹{material.unitCost.toFixed(2)}</td>
                          <td className="border px-4 py-2 text-right font-bold">₹{material.totalCost.toFixed(2)}</td>
                          <td className="border px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              returned ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {returned ? 'Returned' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={2} className="border px-4 py-2">TOTALS</td>
                      <td className="border px-4 py-2 text-center">{totals.totalIssued}</td>
                      <td className="border px-4 py-2 text-center">{totals.totalUsed}</td>
                      <td className="border px-4 py-2 text-center text-green-600">{totals.totalReturned}</td>
                      <td className="border px-4 py-2 text-center text-red-600">{totals.totalDamaged}</td>
                      <td className="border px-4 py-2"></td>
                      <td className="border px-4 py-2 text-right">₹{totals.totalCost.toFixed(2)}</td>
                      <td className="border px-4 py-2"></td>
                    </tr>
                  </tbody>
                </table>

                {/* Damage Details */}
                {materials.some(m => m.returns?.[0]?.quantityDamaged > 0) && (
                  <div className="mt-6">
                    <h3 className="text-xl font-bold mb-3">🔴 Damage Details</h3>
                    {materials
                      .filter(m => m.returns?.[0]?.quantityDamaged > 0)
                      .map(material => {
                        const damage = material.damages?.[0];
                        return (
                          <div key={material.id} className="border rounded p-4 mb-3">
                            <p className="font-bold">{material.material.name}</p>
                            <p className="text-sm text-gray-600">Damaged Quantity: {material.returns[0].quantityDamaged} {material.material.unit}</p>
                            {damage && (
                              <>
                                <p className="text-sm mt-2"><strong>Reason:</strong> {damage.reason}</p>
                                {damage.photoUrls && (
                                  <div className="flex gap-2 mt-2">
                                    {damage.photoUrls.split(',').map((url, idx) => (
                                      <img key={idx} src={url} alt={`Damage ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                  <p>Generated on {new Date().toLocaleString()}</p>
                  <p>Warehouse Management System</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

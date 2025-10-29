import React, { useState, useEffect } from 'react';

interface CostSnapshot {
  id: string;
  jobId: string;
  materialsCost: number;
  laborCost: number;
  damageLoss: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

interface ProfitabilityReport {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  avgProfitMargin: number;
  jobCount: number;
  breakdown: {
    materials: number;
    labor: number;
    damage: number;
    other: number;
  };
}

const JobReportsDashboard: React.FC = () => {
  const [report, setReport] = useState<ProfitabilityReport | null>(null);
  const [snapshots, setSnapshots] = useState<CostSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'costs'>('summary');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [reportRes, snapshotsRes] = await Promise.all([
        fetch('/api/reports/profitability', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/reports/material-costs', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      if (reportRes.ok) {
        const data = await reportRes.json();
        setReport(data);
      }

      if (snapshotsRes.ok) {
        const data = await snapshotsRes.json();
        setSnapshots(data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} KWD`;
  };

  return (
    <div className="p-4">
      <h2 className="mb-4">Job Reports & Financial Analytics</h2>

      {/* Tabs */}
      <div className="mb-4" style={{ borderBottom: '1px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'summary' ? '#007bff' : 'transparent',
            color: activeTab === 'summary' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Profitability Summary
        </button>
        <button
          onClick={() => setActiveTab('details')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'details' ? '#007bff' : 'transparent',
            color: activeTab === 'details' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Cost Breakdown
        </button>
        <button
          onClick={() => setActiveTab('costs')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'costs' ? '#007bff' : 'transparent',
            color: activeTab === 'costs' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Material Costs
        </button>
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <>
          {/* Summary Tab */}
          {activeTab === 'summary' && report && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
                  <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Total Revenue</h6>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    {formatCurrency(report.totalRevenue)}
                  </h3>
                </div>

                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
                  <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Total Costs</h6>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                    {formatCurrency(report.totalCosts)}
                  </h3>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${report.totalProfit >= 0 ? '#28a745' : '#dc3545'}`,
                  }}
                >
                  <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Total Profit</h6>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: report.totalProfit >= 0 ? '#28a745' : '#dc3545' }}>
                    {formatCurrency(report.totalProfit)}
                  </h3>
                </div>

                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #007bff' }}>
                  <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Avg Profit Margin</h6>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                    {report.avgProfitMargin.toFixed(1)}%
                  </h3>
                </div>

                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
                  <h6 style={{ color: '#6c757d', marginBottom: '10px' }}>Jobs Tracked</h6>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>{report.jobCount}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown Tab */}
          {activeTab === 'details' && report && (
            <div>
              <h5 style={{ marginBottom: '20px' }}>Cost Breakdown</h5>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Cost Category</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>Materials</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(report.breakdown.materials)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {report.totalCosts > 0 ? ((report.breakdown.materials / report.totalCosts) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>Labor</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(report.breakdown.labor)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {report.totalCosts > 0 ? ((report.breakdown.labor / report.totalCosts) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>Damage Loss</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(report.breakdown.damage)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {report.totalCosts > 0 ? ((report.breakdown.damage / report.totalCosts) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>Other</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(report.breakdown.other)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {report.totalCosts > 0 ? ((report.breakdown.other / report.totalCosts) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                    <td style={{ padding: '12px' }}>Total Costs</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(report.totalCosts)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Material Costs Tab */}
          {activeTab === 'costs' && (
            <div>
              <h5 style={{ marginBottom: '20px' }}>Material Cost Details</h5>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Material</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>SKU</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Cost</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Job</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((item: any, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>{item.materialName}</td>
                      <td style={{ padding: '12px' }}>{item.materialSku}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.totalCost)}</td>
                      <td style={{ padding: '12px' }}>{item.jobCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {snapshots.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6c757d', marginTop: '20px' }}>
                  No material costs recorded yet.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JobReportsDashboard;

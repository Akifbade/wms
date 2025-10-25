import React, { useState, useEffect } from 'react';

interface MaterialIssue {
  id: string;
  material: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  quantity: number;
  rack?: {
    id: string;
    code: string;
    location: string;
  };
}

interface Rack {
  id: string;
  code: string;
  location: string;
}

interface MaterialReturn {
  materialId: string;
  issueId: string;
  quantityGood: number;
  quantityDamaged: number;
  rackId: string;
}

interface Props {
  jobId: string;
  onComplete?: () => void;
}

const MaterialReturnForm: React.FC<Props> = ({ jobId, onComplete }) => {
  const [jobMaterials, setJobMaterials] = useState<MaterialIssue[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [returns, setReturns] = useState<MaterialReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [materialsRes, racksRes] = await Promise.all([
        fetch(`/api/materials/job-materials/${jobId}`, { headers }),
        fetch('/api/materials/available-racks', { headers }),
      ]);

      const materialsData = await materialsRes.json();
      const racksData = await racksRes.json();

      setJobMaterials(materialsData);
      setRacks(racksData);

      // Initialize returns array
      const initialReturns = materialsData.map((m: MaterialIssue) => ({
        materialId: m.material.id,
        issueId: m.id,
        quantityGood: 0,
        quantityDamaged: 0,
        rackId: m.rack?.id || '',
      }));
      setReturns(initialReturns);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const updateReturn = (issueId: string, field: string, value: any) => {
    const updated = returns.map((r) =>
      r.issueId === issueId ? { ...r, [field]: value } : r
    );
    setReturns(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (returns.every(r => r.quantityGood === 0 && r.quantityDamaged === 0)) {
      alert('Please enter return quantities');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      for (const ret of returns) {
        if (ret.quantityGood > 0 || ret.quantityDamaged > 0) {
          const issue = jobMaterials.find(m => m.id === ret.issueId);
          if (issue) {
            const response = await fetch('/api/materials/returns', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jobId,
                materialId: ret.materialId,
                issueId: ret.issueId,
                quantityGood: ret.quantityGood,
                quantityDamaged: ret.quantityDamaged,
                rackId: ret.rackId,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to record return');
            }
          }
        }
      }

      alert('Materials returned successfully!');
      setReturns(returns.map(r => ({ ...r, quantityGood: 0, quantityDamaged: 0 })));
      onComplete?.();
    } catch (error) {
      console.error('Error recording return:', error);
      alert('Failed to record material return');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">Material Return & Damage Report</h2>

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Material</th>
                <th className="p-3 text-center">Issued Qty</th>
                <th className="p-3 text-center">Good Return</th>
                <th className="p-3 text-center text-red-600">Damaged</th>
                <th className="p-3 text-left">Return to Rack</th>
              </tr>
            </thead>
            <tbody>
              {jobMaterials.map((issue) => {
                const ret = returns.find(r => r.issueId === issue.id);
                if (!ret) return null;

                const totalReturned = ret.quantityGood + ret.quantityDamaged;
                const discrepancy = totalReturned > issue.quantity;

                return (
                  <tr key={issue.id} className={`border-b ${discrepancy ? 'bg-red-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-semibold">{issue.material.name}</div>
                      <div className="text-sm text-gray-600">{issue.material.sku}</div>
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {issue.quantity} {issue.material.unit}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        max={issue.quantity}
                        value={ret.quantityGood}
                        onChange={(e) =>
                          updateReturn(issue.id, 'quantityGood', parseInt(e.target.value) || 0)
                        }
                        className="border p-2 rounded w-full text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        value={ret.quantityDamaged}
                        onChange={(e) =>
                          updateReturn(issue.id, 'quantityDamaged', parseInt(e.target.value) || 0)
                        }
                        className="border p-2 rounded w-full text-center bg-red-50"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={ret.rackId}
                        onChange={(e) => updateReturn(issue.id, 'rackId', e.target.value)}
                        className="border p-2 rounded w-full text-sm"
                      >
                        <option value="">Select Rack</option>
                        {racks.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code} - {r.location}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-semibold mb-2">Return Summary</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Total Materials Issued:</span>{' '}
              {jobMaterials.reduce((sum, m) => sum + m.quantity, 0)} items
            </div>
            <div>
              <span className="font-medium">Total Good Returns:</span>{' '}
              {returns.reduce((sum, r) => sum + r.quantityGood, 0)} items
            </div>
            <div className="text-red-600">
              <span className="font-medium">Total Damaged:</span>{' '}
              {returns.reduce((sum, r) => sum + r.quantityDamaged, 0)} items
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Record Return'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialReturnForm;

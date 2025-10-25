import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface MaterialOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
  totalQuantity: number;
}

interface RackOption {
  id: string;
  code: string;
  location: string;
}

interface SelectedMaterial {
  materialId: string;
  quantity: number;
  rackId: string;
}

interface Props {
  jobId: string;
  onComplete?: () => void;
}

const JobMaterialsForm: React.FC<Props> = ({ jobId, onComplete }) => {
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [racks, setRacks] = useState<RackOption[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
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
        fetch('/api/materials', { headers }),
        fetch('/api/materials/available-racks', { headers }),
      ]);

      const materialsData = await materialsRes.json();
      const racksData = await racksRes.json();

      setMaterials(materialsData.filter((m: MaterialOption) => m.totalQuantity > 0));
      setRacks(racksData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load materials and racks');
    } finally {
      setLoading(false);
    }
  };

  const addMaterialRow = () => {
    setSelectedMaterials([...selectedMaterials, { materialId: '', quantity: 0, rackId: '' }]);
  };

  const removeMaterialRow = (index: number) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index: number, field: string, value: any) => {
    const updated = [...selectedMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMaterials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMaterials.length === 0) {
      alert('Please add at least one material');
      return;
    }

    if (selectedMaterials.some(m => !m.materialId || !m.rackId || m.quantity <= 0)) {
      alert('Please fill all fields including rack');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      for (const item of selectedMaterials) {
        const material = materials.find(m => m.id === item.materialId);
        if (material) {
          const res = await fetch('/api/materials/issues', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, materialId: item.materialId, quantity: item.quantity, rackId: item.rackId }),
          });
          if (!res.ok) throw new Error('Failed');
        }
      }

      alert('Materials allocated!');
      setSelectedMaterials([]);
      onComplete?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to allocate materials');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-4">Add Materials to Job</h2>
      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Material</th>
                <th className="p-3 text-center">Available</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3 text-left">Storage Rack *</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedMaterials.map((item, index) => {
                const mat = materials.find(m => m.id === item.materialId);
                return (
                  <tr key={index} className="border-b">
                    <td className="p-3">
                      <select value={item.materialId} onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)} className="border p-2 rounded w-full">
                        <option value="">Select Material</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">{mat ? `${mat.totalQuantity} ${mat.unit}` : '-'}</td>
                    <td className="p-3">
                      <input type="number" min="1" value={item.quantity || ''} onChange={(e) => updateMaterialRow(index, 'quantity', parseInt(e.target.value) || 0)} className="border p-2 rounded w-full text-center" />
                    </td>
                    <td className="p-3">
                      <select value={item.rackId} onChange={(e) => updateMaterialRow(index, 'rackId', e.target.value)} className={`border p-2 rounded w-full ${!item.rackId ? 'border-red-500' : ''}`}>
                        <option value="">Select Rack</option>
                        {racks.map((r) => (
                          <option key={r.id} value={r.id}>{r.code} - {r.location}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button type="button" onClick={() => removeMaterialRow(index)} className="text-red-600 hover:text-red-700">
                        <X size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addMaterialRow} className="flex items-center gap-2 mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
          <Plus size={20} />
          Add Material
        </button>

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={submitting} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Saving...' : 'Allocate Materials'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobMaterialsForm;

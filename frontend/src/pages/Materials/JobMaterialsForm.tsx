import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import axiosInstance from '../../services/axios';

interface Material {
  id: string;
  sku: string;
  name: string;
  totalQuantity: number;
  unit: string;
  category: string;
}

interface Rack {
  id: string;
  code: string;
  location: string;
  capacityTotal: number;
  capacityUsed: number;
}

interface JobMaterial {
  materialId: string;
  quantity: number;
  rackId: string;
}

interface Props {
  jobId: string;
  onComplete?: () => void;
}

const JobMaterialsForm: React.FC<Props> = ({ jobId, onComplete }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<JobMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [materialsRes, racksRes] = await Promise.all([
        axiosInstance.get('/materials'),
        axiosInstance.get('/materials/available-racks'),
      ]);
      setMaterials(materialsRes.data.filter((m: Material) => m.totalQuantity > 0));
      setRacks(racksRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load materials and racks');
    } finally {
      setLoading(false);
    }
  };

  const addMaterialRow = () => {
    setSelectedMaterials([
      ...selectedMaterials,
      { materialId: '', quantity: 0, rackId: '' },
    ]);
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
      alert('Please fill all material details');
      return;
    }

    try {
      setSubmitting(true);
      
      // Issue each material to the job
      for (const item of selectedMaterials) {
        const material = materials.find(m => m.id === item.materialId);
        if (material) {
          await axiosInstance.post('/materials/issues', {
            jobId,
            materialId: item.materialId,
            quantity: item.quantity,
            rackId: item.rackId,
            notes: `Allocated for job materials`,
          });
        }
      }

      alert('Materials allocated to job successfully!');
      setSelectedMaterials([]);
      onComplete?.();
    } catch (error) {
      console.error('Error allocating materials:', error);
      alert('Failed to allocate materials');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

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
                <th className="p-3 text-left">Storage Rack</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedMaterials.map((item, index) => {
                const selectedMaterial = materials.find(m => m.id === item.materialId);
                const selectedRack = racks.find(r => r.id === item.rackId);

                return (
                  <tr key={index} className="border-b">
                    <td className="p-3">
                      <select
                        value={item.materialId}
                        onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)}
                        className="border p-2 rounded w-full"
                      >
                        <option value="">Select Material</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      {selectedMaterial ? `${selectedMaterial.totalQuantity} ${selectedMaterial.unit}` : '-'}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="1"
                        max={selectedMaterial?.totalQuantity || 0}
                        value={item.quantity || ''}
                        onChange={(e) => updateMaterialRow(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="border p-2 rounded w-full text-center"
                        placeholder="Qty"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={item.rackId}
                        onChange={(e) => updateMaterialRow(index, 'rackId', e.target.value)}
                        className="border p-2 rounded w-full"
                      >
                        <option value="">Select Rack</option>
                        {racks.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code} - {r.location}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeMaterialRow(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addMaterialRow}
          className="flex items-center gap-2 mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          <Plus size={20} />
          Add Material
        </button>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Allocate Materials'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobMaterialsForm;

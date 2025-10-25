import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { getAuthToken } from '../../services/api';

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

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

interface JobMaterial {
  materialId: string;
  quantity: number;
  rackId: string;
  tempId?: string;
}

interface Props {
  jobId: string;
  onMaterialsChange?: (materials: JobMaterial[]) => void;
  readOnly?: boolean;
}

const JobMaterialsForm: React.FC<Props> = ({ jobId, onMaterialsChange, readOnly = false }) => {
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [racks, setRacks] = useState<RackOption[]>([]);
  const [jobMaterials, setJobMaterials] = useState<JobMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [materialsRes, racksRes] = await Promise.all([
        axiosInstance.get('/materials'),
        axiosInstance.get('/materials/available-racks'),
      ]);
      setMaterials(materialsRes.data);
      setRacks(racksRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = () => {
    setJobMaterials([
      ...jobMaterials,
      {
        materialId: '',
        quantity: 1,
        rackId: '',
        tempId: Date.now().toString(),
      },
    ]);
  };

  const updateMaterial = (tempId: string, field: string, value: any) => {
    const updated = jobMaterials.map((m) =>
      m.tempId === tempId ? { ...m, [field]: value } : m
    );
    setJobMaterials(updated);
    onMaterialsChange?.(updated);
  };

  const removeMaterial = (tempId: string) => {
    const updated = jobMaterials.filter((m) => m.tempId !== tempId);
    setJobMaterials(updated);
    onMaterialsChange?.(updated);
  };

  const getMaterialInfo = (materialId: string) => materials.find((m) => m.id === materialId);
  const getTotalAvailable = (materialId: string) => getMaterialInfo(materialId)?.totalQuantity || 0;

  if (loading) return <div className="p-4 text-gray-600">Loading...</div>;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Materials for Job</h3>
        {!readOnly && (
          <button
            onClick={addMaterial}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
          >
            <Plus size={16} />
            Add Material
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left">Material</th>
              <th className="p-2 text-center">Available</th>
              <th className="p-2 text-center">Quantity</th>
              <th className="p-2 text-left">Storage Rack</th>
              {!readOnly && <th className="p-2 text-center">Action</th>}
            </tr>
          </thead>
          <tbody>
            {jobMaterials.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="p-4 text-center text-gray-600">
                  {readOnly ? 'No materials' : 'No materials added'}
                </td>
              </tr>
            ) : (
              jobMaterials.map((jm) => {
                const material = getMaterialInfo(jm.materialId);
                const available = getTotalAvailable(jm.materialId);
                const isOver = jm.quantity > available;

                return (
                  <tr key={jm.tempId} className={`border-b ${isOver ? 'bg-red-50' : ''}`}>
                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-medium">{material?.name || 'N/A'}</span>
                      ) : (
                        <select
                          value={jm.materialId}
                          onChange={(e) => updateMaterial(jm.tempId!, 'materialId', e.target.value)}
                          className="border p-1 rounded w-full text-sm"
                        >
                          <option value="">Select</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.sku} - {m.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-2 text-center">{available}</td>
                    <td className="p-2 text-center">
                      {readOnly ? (
                        <span>{jm.quantity}</span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={jm.quantity}
                          onChange={(e) =>
                            updateMaterial(jm.tempId!, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className={`border p-1 rounded w-16 text-center ${
                            isOver ? 'bg-red-100' : ''
                          }`}
                        />
                      )}
                      {isOver && (
                        <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> Over
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <span>{racks.find((r) => r.id === jm.rackId)?.code || 'N/A'}</span>
                      ) : (
                        <select
                          value={jm.rackId}
                          onChange={(e) => updateMaterial(jm.tempId!, 'rackId', e.target.value)}
                          className="border p-1 rounded w-full text-sm"
                        >
                          <option value="">Choose</option>
                          {racks.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.code}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeMaterial(jm.tempId!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && jobMaterials.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-blue-800">
              <strong>Note:</strong> Materials will be allocated and deducted from stock.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMaterialsForm;

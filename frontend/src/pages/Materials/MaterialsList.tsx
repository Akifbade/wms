import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';

interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  minStockLevel: number;
  unitCost?: number;
  sellingPrice?: number;
  isActive: boolean;
  stockBatches: Array<{ id: string; quantityRemaining: number }>;
}

const MaterialsList: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'BOX',
    unit: 'PCS',
    minStockLevel: 5,
    unitCost: 0,
    sellingPrice: 0,
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
      alert('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to add material');
      alert('Material added successfully!');
      setFormData({
        sku: '',
        name: '',
        category: 'BOX',
        unit: 'PCS',
        minStockLevel: 5,
        unitCost: 0,
        sellingPrice: 0,
      });
      setShowAddForm(false);
      fetchMaterials();
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Failed to add material');
    }
  };

  if (loading) {
    return <div className="p-4">Loading materials...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Material Stock</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Material
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-4 rounded-lg border mb-6">
          <form onSubmit={handleAddMaterial}>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="Material Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="BOX">Box</option>
                <option value="TAPE">Tape</option>
                <option value="WRAPPING">Bubble Wrap</option>
                <option value="PADDING">Padding</option>
                <option value="OTHER">Other</option>
              </select>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="PCS">Pieces</option>
                <option value="ROLL">Roll</option>
                <option value="KG">Kg</option>
                <option value="METER">Meter</option>
              </select>
              <input
                type="number"
                placeholder="Unit Cost"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                className="border p-2 rounded"
              />
              <input
                type="number"
                placeholder="Selling Price"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                className="border p-2 rounded"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Save Material
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-semibold">SKU</th>
              <th className="p-3 text-left font-semibold">Name</th>
              <th className="p-3 text-left font-semibold">Category</th>
              <th className="p-3 text-center font-semibold">Stock</th>
              <th className="p-3 text-center font-semibold">Min Level</th>
              <th className="p-3 text-right font-semibold">Unit Cost</th>
              <th className="p-3 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const totalBatchQty = material.stockBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
              const isLowStock = material.totalQuantity < material.minStockLevel;

              return (
                <tr key={material.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm">{material.sku}</td>
                  <td className="p-3">{material.name}</td>
                  <td className="p-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                      {material.category}
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold">
                    {material.totalQuantity} {material.unit}
                  </td>
                  <td className="p-3 text-center">{material.minStockLevel}</td>
                  <td className="p-3 text-right">Rs. {material.unitCost?.toFixed(2) || '0.00'}</td>
                  <td className="p-3 text-center">
                    {isLowStock ? (
                      <div className="flex items-center justify-center gap-1 text-red-600">
                        <AlertCircle size={16} />
                        <span className="text-sm">Low</span>
                      </div>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">Active</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsList;

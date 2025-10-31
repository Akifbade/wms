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

      if (!token) {
        alert('Please login first');
        setMaterials([]);
        return;
      }

      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error:', error);
      setMaterials([]);
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

      if (!response.ok) throw new Error('Failed');
      alert('Material added!');
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
      console.error('Error:', error);
      alert('Failed to add material');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['minStockLevel', 'unitCost', 'sellingPrice'].includes(name) ? parseFloat(value) : value
    }));
  };

  if (loading) {
    return <div className="p-6">Loading materials...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Material Inventory</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Material
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h2 className="text-lg font-bold">Add New Material</h2>
          <form onSubmit={handleAddMaterial} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="sku"
              placeholder="SKU"
              value={formData.sku}
              onChange={handleInputChange}
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="name"
              placeholder="Material Name"
              value={formData.name}
              onChange={handleInputChange}
              className="border p-2 rounded"
              required
            />
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="border p-2 rounded"
            >
              <option value="BOX">Box</option>
              <option value="TAPE">Tape</option>
              <option value="WRAPPING">Wrapping</option>
              <option value="PADDING">Padding</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="border p-2 rounded"
            >
              <option value="PCS">PCS</option>
              <option value="ROLL">Roll</option>
              <option value="KG">KG</option>
              <option value="METER">Meter</option>
            </select>
            <input
              type="number"
              name="minStockLevel"
              placeholder="Min Stock"
              value={formData.minStockLevel}
              onChange={handleInputChange}
              className="border p-2 rounded"
            />
            <input
              type="number"
              name="unitCost"
              placeholder="Unit Cost"
              step="0.01"
              value={formData.unitCost}
              onChange={handleInputChange}
              className="border p-2 rounded"
            />
            <input
              type="number"
              name="sellingPrice"
              placeholder="Selling Price"
              step="0.01"
              value={formData.sellingPrice}
              onChange={handleInputChange}
              className="border p-2 rounded col-span-2"
            />
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save Material
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-center">Stock</th>
              <th className="p-3 text-center">Unit</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No materials yet. Add one to get started!
                </td>
              </tr>
            ) : (
              materials.map((material) => {
                const isLowStock = material.totalQuantity <= material.minStockLevel;
                return (
                  <tr key={material.id} className={`border-b ${isLowStock ? 'bg-yellow-50' : ''}`}>
                    <td className="p-3 font-mono text-sm">{material.sku}</td>
                    <td className="p-3">{material.name}</td>
                    <td className="p-3">{material.category}</td>
                    <td className="p-3 text-center font-bold">{material.totalQuantity}</td>
                    <td className="p-3 text-center">{material.unit}</td>
                    <td className="p-3 text-right">{material.unitCost?.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-right">{material.sellingPrice?.toFixed(2) || '0.00'}</td>
                    <td className="p-3">
                      {isLowStock ? (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle size={16} />
                          Low Stock
                        </div>
                      ) : (
                        <span className="text-green-600">✓ OK</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsList;

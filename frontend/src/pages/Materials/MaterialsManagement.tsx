import { useState, useEffect } from 'react';
import { Plus, Package, FolderTree, Archive, AlertCircle, Search, Edit, Trash2, Save, X } from 'lucide-react';

interface MaterialCategory {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
  children?: MaterialCategory[];
  _count?: { materials: number };
}

interface Material {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  category?: MaterialCategory;
  unit: string;
  totalQuantity: number;
  minStockLevel: number;
  unitCost?: number;
  sellingPrice?: number;
  isActive: boolean;
}

interface StockBatch {
  id: string;
  materialId: string;
  batchNumber: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  sellingPrice: number;
  receivedDate: string;
}

const MaterialsManagement = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'materials' | 'stock'>('materials');
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Category Form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    parentId: '',
    description: ''
  });
  
  // Material Form
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    unit: 'PCS',
    minStockLevel: 5,
    unitCost: 0,
    sellingPrice: 0,
  });
  
  // Stock Form
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({
    materialId: '',
    batchNumber: '',
    quantityReceived: 0,
    unitCost: 0,
    sellingPrice: 0,
  });

  useEffect(() => {
    // Check if token exists before making API calls
    const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
    if (!token) {
      console.warn('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }
    
    fetchCategories();
    fetchMaterials();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
    if (!token) {
      return null;
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchCategories = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch('/api/materials/categories', { headers });
      
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed - invalid or expired token');
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        console.error('Failed to fetch categories:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      if (!headers) {
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch('/api/materials', { headers });
      
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed - invalid or expired token');
        alert('Your session has expired. Please login again.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      } else {
        console.error('Failed to fetch materials:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockBatches = async (materialId?: string) => {
    try {
      const url = materialId 
        ? `/api/materials/${materialId}/stock` 
        : '/api/materials/stock/all';
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setStockBatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/materials/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(categoryForm)
      });
      
      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        alert('Category added successfully!');
        setShowCategoryForm(false);
        setCategoryForm({ name: '', parentId: '', description: '' });
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add category');
      }
    } catch (error) {
      alert('Failed to add category');
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(materialForm)
      });
      
      if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        alert('Material added successfully!');
        setShowMaterialForm(false);
        setMaterialForm({
          sku: '',
          name: '',
          description: '',
          categoryId: '',
          unit: 'PCS',
          minStockLevel: 5,
          unitCost: 0,
          sellingPrice: 0,
        });
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add material');
      }
    } catch (error) {
      alert('Failed to add material');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/materials/stock', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(stockForm)
      });
      
      if (response.ok) {
        alert('Stock added successfully!');
        setShowStockForm(false);
        setStockForm({
          materialId: '',
          batchNumber: '',
          quantityReceived: 0,
          unitCost: 0,
          sellingPrice: 0,
        });
        fetchMaterials();
        fetchStockBatches();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add stock');
      }
    } catch (error) {
      alert('Failed to add stock');
    }
  };

  const renderCategoryTree = (cats: MaterialCategory[], level = 0) => {
    return cats.map(cat => (
      <div key={cat.id} style={{ marginLeft: `${level * 20}px` }} className="border-l-2 border-gray-200 pl-4 my-2">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <FolderTree className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold">{cat.name}</h3>
              <p className="text-sm text-gray-500">{cat.description}</p>
              {cat._count && (
                <span className="text-xs text-gray-400">{cat._count.materials} materials</span>
              )}
            </div>
          </div>
        </div>
        {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, level + 1)}
      </div>
    ));
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Material Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'categories'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FolderTree className="w-5 h-5 inline mr-2" />
          Categories
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'materials'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Package className="w-5 h-5 inline mr-2" />
          Materials
        </button>
        <button
          onClick={() => {
            setActiveTab('stock');
            fetchStockBatches();
          }}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'stock'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Archive className="w-5 h-5 inline mr-2" />
          Stock Batches
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Material Categories</h2>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Category
            </button>
          </div>

          {showCategoryForm && (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">New Category</h3>
                <button onClick={() => setShowCategoryForm(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Boxes, Tape, Bubble Wrap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Parent Category</label>
                  <select
                    value={categoryForm.parentId}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Root Category --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderTree className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No categories yet. Add your first category to organize materials.</p>
              </div>
            ) : (
              renderCategoryTree(categories)
            )}
          </div>
        </div>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1 mr-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={() => setShowMaterialForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Material
            </button>
          </div>

          {showMaterialForm && (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">New Material</h3>
                <button onClick={() => setShowMaterialForm(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddMaterial} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={materialForm.sku}
                    onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="MAT-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Material Name *</label>
                  <input
                    type="text"
                    required
                    value={materialForm.name}
                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Large Moving Box"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={materialForm.description}
                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    required
                    value={materialForm.categoryId}
                    onChange={(e) => setMaterialForm({ ...materialForm, categoryId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    value={materialForm.unit}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="PCS">Pieces</option>
                    <option value="ROLL">Roll</option>
                    <option value="BOX">Box</option>
                    <option value="KG">Kilogram</option>
                    <option value="METER">Meter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock Level *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={materialForm.minStockLevel}
                    onChange={(e) => setMaterialForm({ 
                      ...materialForm, 
                      minStockLevel: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialForm.unitCost}
                    onChange={(e) => setMaterialForm({ 
                      ...materialForm, 
                      unitCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="col-span-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 w-full">
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Material
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No materials found. Add your first material to get started.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map(material => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{material.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{material.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{material.materialCategory?.name || 'Uncategorized'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-bold ${material.totalQuantity < material.minStockLevel ? 'text-red-600' : 'text-green-600'}`}>
                          {material.totalQuantity}
                        </span>
                        {material.totalQuantity < material.minStockLevel && (
                          <AlertCircle className="w-4 h-4 inline ml-2 text-red-600" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{material.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${material.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {material.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Stock Management</h2>
            <button
              onClick={() => setShowStockForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Stock
            </button>
          </div>

          {showStockForm && (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Add Stock Batch</h3>
                <button onClick={() => setShowStockForm(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddStock} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Material *</label>
                  <select
                    required
                    value={stockForm.materialId}
                    onChange={(e) => setStockForm({ ...stockForm, materialId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map(mat => (
                      <option key={mat.id} value={mat.id}>{mat.sku} - {mat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={stockForm.batchNumber}
                    onChange={(e) => setStockForm({ ...stockForm, batchNumber: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="BATCH-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stockForm.quantityReceived}
                    onChange={(e) => setStockForm({ 
                      ...stockForm, 
                      quantityReceived: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockForm.unitCost}
                    onChange={(e) => setStockForm({ 
                      ...stockForm, 
                      unitCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="col-span-2">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 w-full">
                    <Save className="w-4 h-4 inline mr-2" />
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No stock batches found.
                    </td>
                  </tr>
                ) : (
                  stockBatches.map(batch => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{batch.batchNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {batch.material?.name || materials.find(m => m.id === batch.materialId)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{batch.quantityPurchased || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={batch.quantityRemaining === 0 ? 'text-red-600' : 'text-green-600'}>
                          {batch.quantityRemaining}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">₹{batch.unitCost.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(batch.purchaseDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsManagement;

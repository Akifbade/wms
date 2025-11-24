import { useState, useEffect } from 'react';
import { Plus, Package, FolderTree, Archive, AlertCircle, Search, Edit, Trash2, Save, X, History } from 'lucide-react';
import { MaterialTransactionHistory } from '../../components/MaterialTransactionHistory';
import { apiFetch } from '../../services/api';

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

interface StockPurchase {
  id: string;
  materialId: string;
  orderNumber: string;
  invoiceNumber: string;
  vendorName: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  sellingPrice: number;
  orderDate: string;
  receivedDate: string;
}

const MaterialsManagement = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'materials' | 'stock'>('materials');
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  // Material History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Category Form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    parentId: '',
    description: ''
  });

  // Material Form
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    unit: 'PCS',
    minStockLevel: 5,
    unitCost: 0,
    sellingPrice: 0,
    isActive: true,
  });

  // Stock Form
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({
    orderNumber: '',
    invoiceNumber: '',
    vendorName: '',
    materialId: '',
    quantity: 0,
    unitCost: 0,
    orderDate: new Date().toISOString().split('T')[0],
    receivedDate: '',
    status: 'PENDING',
    notes: '',
  });

  useEffect(() => {
    // Check if token exists before making API calls
    const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
    if (!token) {
      console.warn('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }

    // Get user role
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUserRole(userData.role || '');
      } catch (e) {
        console.error('Failed to parse user data');
      }
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

      const response = await apiFetch('/materials/categories', { headers });

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

      const response = await apiFetch('/materials', { headers });

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

  const fetchStockPurchases = async (materialId?: string) => {
    try {
      const url = materialId
        ? `/api/materials/${materialId}/purchase-orders`
        : '/api/materials/purchase-orders';
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setStockPurchases(data);
      }
    } catch (error) {
      console.error('Failed to fetch stock purchases:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategoryId
        ? `/api/materials/categories/${editingCategoryId}`
        : '/api/materials/categories';

      const method = editingCategoryId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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
        alert(`Category ${editingCategoryId ? 'updated' : 'added'} successfully!`);
        setShowCategoryForm(false);
        setEditingCategoryId(null);
        setCategoryForm({ name: '', parentId: '', description: '' });
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save category');
      }
    } catch (error) {
      alert('Failed to save category');
    }
  };

  const handleEditCategory = (category: MaterialCategory) => {
    setCategoryForm({
      name: category.name,
      parentId: category.parentId || '',
      description: category.description || ''
    });
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (category: MaterialCategory) => {
    if (userRole !== 'ADMIN') {
      alert('Only admins can delete categories');
      return;
    }

    if (category._count?.materials && category._count.materials > 0) {
      alert('Cannot delete category containing materials. Please remove materials first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/materials/categories/${category.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        alert('Category deleted successfully');
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      alert('Failed to delete category');
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMaterialId
        ? `/api/materials/${editingMaterialId}`
        : '/api/materials';

      const method = editingMaterialId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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
        alert(`Material ${editingMaterialId ? 'updated' : 'added'} successfully!`);
        setShowMaterialForm(false);
        setEditingMaterialId(null);
        setMaterialForm({
          sku: '',
          name: '',
          description: '',
          categoryId: '',
          unit: 'PCS',
          minStockLevel: 5,
          unitCost: 0,
          sellingPrice: 0,
          isActive: true,
        });
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save material');
      }
    } catch (error) {
      alert('Failed to save material');
    }
  };

  const handleEditMaterial = (material: Material) => {
    setMaterialForm({
      sku: material.sku,
      name: material.name,
      description: '', // Description might not be in the list view, would need to fetch or include it
      categoryId: material.categoryId,
      unit: material.unit,
      minStockLevel: material.minStockLevel,
      unitCost: material.unitCost || 0,
      sellingPrice: material.sellingPrice || 0,
      isActive: material.isActive
    });
    setEditingMaterialId(material.id);
    setShowMaterialForm(true);
  };

  const handleDeleteMaterial = async (material: Material) => {
    if (userRole !== 'ADMIN') {
      alert('Only admins can delete materials');
      return;
    }

    if (material.totalQuantity > 0) {
      alert('Cannot delete material with existing stock. Please clear stock first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete material "${material.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        alert('Material deleted successfully');
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete material');
      }
    } catch (error) {
      alert('Failed to delete material');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/materials/purchase-orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(stockForm)
      });

      if (response.ok) {
        alert('Stock added successfully!');
        setShowStockForm(false);
        setStockForm({
          orderNumber: '',
          invoiceNumber: '',
          vendorName: '',
          materialId: '',
          quantity: 0,
          unitCost: 0,
          orderDate: new Date().toISOString().split('T')[0],
          receivedDate: '',
          status: 'PENDING',
          notes: '',
        });
        fetchMaterials();
        fetchStockPurchases();
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
          <div className="flex gap-2">
            <button
              onClick={() => handleEditCategory(cat)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Category"
            >
              <Edit className="w-4 h-4" />
            </button>
            {userRole === 'ADMIN' && (!cat._count?.materials || cat._count.materials === 0) && (
              <button
                onClick={() => handleDeleteCategory(cat)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Delete Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
          className={`px-6 py-3 font-semibold transition ${activeTab === 'categories'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-600 hover:text-gray-800'
            }`}
        >
          <FolderTree className="w-5 h-5 inline mr-2" />
          Categories
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-6 py-3 font-semibold transition ${activeTab === 'materials'
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
            fetchStockPurchases();
          }}
          className={`px-6 py-3 font-semibold transition ${activeTab === 'stock'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-600 hover:text-gray-800'
            }`}
        >
          <Archive className="w-5 h-5 inline mr-2" />
          Stock Purchases
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Material Categories</h2>
            <button
              onClick={() => {
                setEditingCategoryId(null);
                setCategoryForm({ name: '', parentId: '', description: '' });
                setShowCategoryForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Category
            </button>
          </div>

          {showCategoryForm && (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{editingCategoryId ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategoryId(null);
                  setCategoryForm({ name: '', parentId: '', description: '' });
                }}>
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
              onClick={() => {
                setEditingMaterialId(null);
                setMaterialForm({
                  sku: '',
                  name: '',
                  description: '',
                  categoryId: '',
                  unit: 'PCS',
                  minStockLevel: 5,
                  unitCost: 0,
                  sellingPrice: 0,
                  isActive: true,
                });
                setShowMaterialForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Material
            </button>
          </div>

          {showMaterialForm && (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{editingMaterialId ? 'Edit Material' : 'New Material'}</h3>
                <button onClick={() => {
                  setShowMaterialForm(false);
                  setEditingMaterialId(null);
                  setMaterialForm({
                    sku: '',
                    name: '',
                    description: '',
                    categoryId: '',
                    unit: 'PCS',
                    minStockLevel: 5,
                    unitCost: 0,
                    sellingPrice: 0,
                    isActive: true,
                  });
                }}>
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
                    value={materialForm.minStockLevel === 0 ? '' : materialForm.minStockLevel}
                    onChange={(e) => setMaterialForm({
                      ...materialForm,
                      minStockLevel: e.target.value === '' ? 0 : parseInt(e.target.value)
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Enter minimum stock"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Cost (KWD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.unitCost === 0 ? '' : materialForm.unitCost}
                    onChange={(e) => setMaterialForm({
                      ...materialForm,
                      unitCost: e.target.value === '' ? 0 : parseFloat(e.target.value)
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Enter unit cost"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedMaterial(material);
                              setHistoryModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditMaterial(material)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                            title="Edit Material"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {userRole === 'ADMIN' && material.totalQuantity === 0 && (
                            <button
                              onClick={() => handleDeleteMaterial(material)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                              title="Delete Material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Stock Purchase</h3>
                <button onClick={() => setShowStockForm(false)}>
                  <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <form onSubmit={handleAddStock} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                    <input
                      type="text"
                      required
                      value={stockForm.orderNumber}
                      onChange={(e) => setStockForm({ ...stockForm, orderNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="PO-2024-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={stockForm.invoiceNumber}
                      onChange={(e) => setStockForm({ ...stockForm, invoiceNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="INV-123456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      required
                      value={stockForm.vendorName}
                      onChange={(e) => setStockForm({ ...stockForm, vendorName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Acme Supplies"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                    <select
                      required
                      value={stockForm.materialId}
                      onChange={(e) => setStockForm({ ...stockForm, materialId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select material</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.sku} - {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (KWD) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={stockForm.unitCost}
                      onChange={(e) => setStockForm({ ...stockForm, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                    <input
                      type="date"
                      required
                      value={stockForm.orderDate}
                      onChange={(e) => setStockForm({ ...stockForm, orderDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                    <input
                      type="date"
                      value={stockForm.receivedDate}
                      onChange={(e) => setStockForm({ ...stockForm, receivedDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={stockForm.status}
                    onChange={(e) => setStockForm({ ...stockForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={stockForm.notes}
                    onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Additional purchase details..."
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors w-full justify-center"
                >
                  <Save className="w-4 h-4" />
                  Add Stock Purchase
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No stock purchases found.
                    </td>
                  </tr>
                ) : (
                  stockPurchases.map((purchase: any, idx: number) => (
                    <tr key={purchase.id} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">{purchase.orderNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{purchase.invoiceNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{purchase.vendorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {purchase.material?.name || materials.find(m => m.id === purchase.materialId)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{purchase.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{purchase.unitCost.toFixed(3)} KWD</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {(purchase.quantity * purchase.unitCost).toFixed(3)} KWD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${purchase.status === 'RECEIVED'
                            ? 'bg-green-100 text-green-700'
                            : purchase.status === 'ORDERED'
                              ? 'bg-blue-100 text-blue-700'
                              : purchase.status === 'APPROVED'
                                ? 'bg-yellow-100 text-yellow-700'
                                : purchase.status === 'PENDING'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-red-100 text-red-700'
                          }`}>
                          {purchase.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(purchase.orderDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Transaction History Modal */}
      <MaterialTransactionHistory
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        materialId={selectedMaterial?.id || ''}
        materialName={selectedMaterial?.name || ''}
      />
    </div>
  );
};

export default MaterialsManagement;

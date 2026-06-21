import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, X, Save, ArrowLeftRight, Camera, Trash2, Edit2, Upload
} from 'lucide-react';

interface JobMaterialsManagerProps {
  jobId: string;
  jobStatus: string;
  onUpdate?: () => void;
}

interface Material {
  id: string;
  sku: string;
  name: string;
  unit: string;
  totalQuantity: number;
}

interface Rack {
  id: string;
  code: string;
  location: string;
}

interface IssuedMaterial {
  id: string;
  material: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  quantity: number;
  unitCost: number;
  totalCost: number;
  issuedAt: string;
  notes?: string;
  rack?: {
    code: string;
    location: string;
  };
  returns?: Array<{
    id: string;
    quantityUsed: number;
    quantityGood: number;
    quantityDamaged: number;
    recordedAt: string;
  }>;
}

const JobMaterialsManager: React.FC<JobMaterialsManagerProps> = ({ jobId, jobStatus, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'issued' | 'return'>('issued');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [stockPurchases, setStockPurchases] = useState<any[]>([]);
  const [issuedMaterials, setIssuedMaterials] = useState<IssuedMaterial[]>([]);

  // Issue Material State — multi-row (one-shot batch)
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueRows, setIssueRows] = useState<Array<{
    id: string;
    materialId: string;
    quantity: number;
    rackId: string;
    stockPurchaseId: string;
    notes: string;
  }>>([]);

  const addIssueRow = () => {
    setIssueRows(prev => [...prev, {
      id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      materialId: '',
      quantity: 0,
      rackId: '',
      stockPurchaseId: '',
      notes: ''
    }]);
  };

  const removeIssueRow = (id: string) => {
    setIssueRows(prev => prev.filter(r => r.id !== id));
  };

  const updateIssueRow = (id: string, field: string, value: any) => {
    setIssueRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Edit Material State
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssuedMaterial | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    notes: '',
    reason: ''
  });

  // Delete Material State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingIssue, setDeletingIssue] = useState<IssuedMaterial | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Return Material State
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssuedMaterial | null>(null);
  const [returnForm, setReturnForm] = useState({
    issueId: '',
    quantityUsed: 0,
    quantityGood: 0,
    quantityDamaged: 0,
    damageReason: '',
    notes: '',
    photos: [] as File[],
    generateQR: false
  });

  // Edit Return State
  const [showEditReturnForm, setShowEditReturnForm] = useState(false);
  const [editingReturn, setEditingReturn] = useState<any | null>(null);
  const [editReturnForm, setEditReturnForm] = useState({
    quantityGood: 0,
    quantityDamaged: 0,
    notes: ''
  });

  // Physical Report Upload State
  const [physicalReportFile, setPhysicalReportFile] = useState<File | null>(null);
  const [physicalReportPreview, setPhysicalReportPreview] = useState<string | null>(null);
  const physicalReportInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // Load materials list
      const materialsRes = await fetch('/api/materials', { headers });
      const materialsData = await materialsRes.json();
      // Ensure materials is always an array
      setMaterials(Array.isArray(materialsData) ? materialsData : []);

      // Load stock purchases
      const purchasesRes = await fetch('/api/materials/purchase-orders', { headers });
      const purchasesData = await purchasesRes.json();
      setStockPurchases(Array.isArray(purchasesData) ? purchasesData : []);

      // Load racks
      const racksRes = await fetch('/api/materials/available-racks', { headers });
      const racksData = await racksRes.json();
      setRacks(Array.isArray(racksData) ? racksData : []);

      // Load issued materials for this job
      const issuedRes = await fetch(`/api/materials/job-materials/${jobId}`, { headers });
      const issuedData = await issuedRes.json();
      setIssuedMaterials(Array.isArray(issuedData) ? issuedData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleBatchIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('authToken');

    // Filter out incomplete rows
    const validRows = issueRows.filter(r => r.materialId && r.quantity > 0);
    if (validRows.length === 0) {
      alert('Koi material add nahi kiya. Pehle at least ek material select karo.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/materials/issues/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          issues: validRows.map(r => ({
            materialId: r.materialId,
            quantity: r.quantity,
            rackId: r.rackId || null,
            notes: r.notes || null
          }))
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(`${data.count} material(s) successfully issued! Stock updated.`);
        setShowIssueForm(false);
        setIssueRows([]);
        loadData();
        onUpdate?.();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to batch issue materials:', error);
      alert('Failed to issue materials. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('authToken');
    const formData = new FormData();

    formData.append('jobId', jobId);
    formData.append('materialId', selectedIssue?.material.id || '');
    formData.append('issueId', returnForm.issueId);
    formData.append('quantityGood', returnForm.quantityGood.toString());
    formData.append('quantityDamaged', returnForm.quantityDamaged.toString());
    formData.append('notes', returnForm.notes);
    if (returnForm.damageReason) {
      formData.append('damageReason', returnForm.damageReason);
    }

    // Add damage photos
    returnForm.photos.forEach((photo) => {
      formData.append(`photos`, photo);
    });

    // Add physical report file if selected
    if (physicalReportFile) {
      formData.append('physicalReport', physicalReportFile);
    }

    try {
      const response = await fetch('/api/materials/returns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        alert('Material return recorded successfully!');
        setShowReturnForm(false);
        setReturnForm({
          issueId: '',
          quantityUsed: 0,
          quantityGood: 0,
          quantityDamaged: 0,
          damageReason: '',
          notes: '',
          photos: [],
          generateQR: false
        });
        
        // Reset physical report upload
        setPhysicalReportFile(null);
        setPhysicalReportPreview(null);

        setSelectedIssue(null);
        loadData();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(`Failed to record return: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to record return:', error);
      alert('Failed to record material return');
    } finally {
      setLoading(false);
    }
  };

  const openEditReturnForm = (ret: any) => {
    setEditingReturn(ret);
    setEditReturnForm({
      quantityGood: ret.quantityGood,
      quantityDamaged: ret.quantityDamaged,
      notes: ret.notes || ''
    });
    setShowEditReturnForm(true);
  };

  const handleEditReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReturn) return;

    setLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/materials/returns/${editingReturn.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantityGood: editReturnForm.quantityGood,
          quantityDamaged: editReturnForm.quantityDamaged,
          notes: editReturnForm.notes
        })
      });

      if (response.ok) {
        alert('Return updated successfully!');
        setShowEditReturnForm(false);
        setEditingReturn(null);
        loadData();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(`Failed to update return: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update return:', error);
      alert('Failed to update return');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm('Are you sure you want to delete this return? Stock will be adjusted.')) return;

    setLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/materials/returns/${returnId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Return deleted successfully!');
        loadData();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(`Failed to delete return: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete return:', error);
      alert('Failed to delete return');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setReturnForm({ ...returnForm, photos: [...returnForm.photos, ...files] });
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = returnForm.photos.filter((_, i) => i !== index);
    setReturnForm({ ...returnForm, photos: newPhotos });
  };

  const openReturnForm = (issue: IssuedMaterial) => {
    setSelectedIssue(issue);
    setReturnForm({
      issueId: issue.id,
      quantityUsed: 0,
      quantityGood: 0,
      quantityDamaged: 0,
      damageReason: '',
      notes: '',
      photos: []
    });
    setShowReturnForm(true);
  };

  const getTotalIssued = () => {
    return issuedMaterials.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const getPendingReturns = () => {
    return issuedMaterials.filter(item => !item.returns || item.returns.length === 0).length;
  };

  // Open Edit Form
  const openEditForm = (issue: IssuedMaterial) => {
    setEditingIssue(issue);
    setEditForm({
      quantity: issue.quantity,
      notes: issue.notes || '',
      reason: ''
    });
    setShowEditForm(true);
  };

  // Handle Edit Material Issue
  const handleEditIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIssue) return;

    setLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/materials/issues/${editingIssue.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: editForm.quantity,
          notes: editForm.notes,
          reason: editForm.reason
        })
      });

      if (response.ok) {
        alert('Material issue updated successfully!');
        setShowEditForm(false);
        setEditingIssue(null);
        loadData();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(`Failed to update: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update material issue:', error);
      alert('Failed to update material issue');
    } finally {
      setLoading(false);
    }
  };

  // Open Delete Confirmation
  const openDeleteConfirm = (issue: IssuedMaterial) => {
    setDeletingIssue(issue);
    setDeleteReason('');
    setShowDeleteConfirm(true);
  };

  // Handle Delete Material Issue
  const handleDeleteIssue = async () => {
    if (!deletingIssue) return;

    setLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/materials/issues/${deletingIssue.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: deleteReason || 'No reason provided'
        })
      });

      if (response.ok) {
        alert('Material issue deleted and stock restored!');
        setShowDeleteConfirm(false);
        setDeletingIssue(null);
        loadData();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete material issue:', error);
      alert('Failed to delete material issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Job Materials
          </h2>
          <p className="text-gray-600 mt-1">
            Track materials issued and returned for this job
          </p>
        </div>

        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-xl font-bold">{getTotalIssued().toFixed(2)} KWD</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Pending Returns</p>
            <p className="text-xl font-bold text-orange-600">{getPendingReturns()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('issued')}
          className={`px-4 py-2 font-medium ${activeTab === 'issued'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-500'
            }`}
        >
          Issued Materials ({issuedMaterials.length})
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2 font-medium ${activeTab === 'return'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-500'
            }`}
        >
          Returns & Damages
        </button>
      </div>

      {/* Issued Materials Tab */}
      {activeTab === 'issued' && (
        <div>
          {jobStatus !== 'COMPLETED' && jobStatus !== 'CANCELLED' && (
            <button
              onClick={() => setShowIssueForm(true)}
              className="mb-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Issue Material
            </button>
          )}

          {/* Issue Material Form — Multi-Row (One-Shot) */}
          {showIssueForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">🚀 Issue Materials — Ek Saath</h3>
                <button onClick={() => { setShowIssueForm(false); setIssueRows([]); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBatchIssueMaterial}>
                {/* Rows */}
                {issueRows.length === 0 && (
                  <p className="text-gray-500 text-sm mb-4">Abhi tak koi material add nahi kiya. Neeche "+ Add Material Row" button dabao.</p>
                )}

                {issueRows.map((row, idx) => (
                  <div key={row.id} className="border border-gray-200 bg-white rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-600">Material #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeIssueRow(row.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove this row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Material *</label>
                        <select
                          required
                          value={row.materialId}
                          onChange={(e) => updateIssueRow(row.id, 'materialId', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">-- Select --</option>
                          {materials.map(mat => (
                            <option key={mat.id} value={mat.id}>
                              {mat.sku} - {mat.name} (Stock: {mat.totalQuantity} {mat.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Qty *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={row.quantity || ''}
                          onChange={(e) => updateIssueRow(row.id, 'quantity', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Rack (Optional)</label>
                        <select
                          value={row.rackId}
                          onChange={(e) => updateIssueRow(row.id, 'rackId', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">-- No Rack --</option>
                          {racks.map(rack => (
                            <option key={rack.id} value={rack.id}>
                              {rack.code} - {rack.location}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Notes</label>
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateIssueRow(row.id, 'notes', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder="Optional..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add / Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    type="button"
                    onClick={addIssueRow}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Material Row
                  </button>
                  <button
                    type="submit"
                    disabled={loading || issueRows.length === 0}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Issuing...' : `Issue All (${issueRows.filter(r => r.materialId && r.quantity > 0).length})`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Issued Materials List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rack</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuedMaterials.map(issue => (
                  <tr key={issue.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium">{issue.material.name}</p>
                        <p className="text-sm text-gray-500">{issue.material.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.quantity} {issue.material.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{issue.unitCost.toFixed(2)} KWD</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">{issue.totalCost.toFixed(2)} KWD</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {issue.rack ? `${issue.rack.code} - ${issue.rack.location}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {issue.returns && issue.returns.length > 0 ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Returned
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                          Pending Return
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Edit/Delete only if not returned */}
                        {(!issue.returns || issue.returns.length === 0) && (
                          <>
                            <button
                              onClick={() => openEditForm(issue)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit Issue"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(issue)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete Issue"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {/* Record Return - only for completed jobs */}
                        {jobStatus === 'COMPLETED' && (
                          <button
                            onClick={() => openReturnForm(issue)}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
                            title="Record Return"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Material Issue Modal */}
      {showEditForm && editingIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">✏️ Edit Material Issue</h3>
              <button onClick={() => setShowEditForm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded mb-4">
              <p className="font-medium">{editingIssue.material.name}</p>
              <p className="text-sm text-gray-600">SKU: {editingIssue.material.sku}</p>
              <p className="text-sm text-gray-600">Current Qty: {editingIssue.quantity} {editingIssue.material.unit}</p>
            </div>

            <form onSubmit={handleEditIssue} className="space-y-4 w-full">
              <div>
                <label className="block text-sm font-medium mb-1">New Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason for Change *</label>
                <input
                  type="text"
                  required
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Correction, quantity adjustment..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="w-full sm:w-auto flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-red-600">🗑️ Delete Material Issue</h3>
              <button onClick={() => setShowDeleteConfirm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 p-4 rounded mb-4">
              <p className="font-medium">{deletingIssue.material.name}</p>
              <p className="text-sm text-gray-600">Quantity: {deletingIssue.quantity} {deletingIssue.material.unit}</p>
              <p className="text-sm text-gray-600">Cost: {deletingIssue.totalCost.toFixed(2)} KWD</p>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              ⚠️ This will restore the material back to stock. This action is recorded in history.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason for Deletion *</label>
              <input
                type="text"
                required
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Wrong material, duplicate entry..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteIssue}
                disabled={loading || !deleteReason.trim()}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                {loading ? 'Deleting...' : 'Delete & Restore Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Material Form Modal */}
      {showReturnForm && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Record Material Return</h3>
              <button onClick={() => setShowReturnForm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded mb-4">
              <p className="font-medium">{selectedIssue.material.name}</p>
              <p className="text-sm text-gray-600">
                Issued Quantity: {selectedIssue.quantity} {selectedIssue.material.unit}
              </p>
            </div>

            <form onSubmit={handleReturnMaterial} className="space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity Used *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={selectedIssue.quantity}
                    value={returnForm.quantityUsed}
                    onChange={(e) => {
                      const used = parseInt(e.target.value) || 0;
                      setReturnForm({
                        ...returnForm,
                        quantityUsed: used
                      });
                    }}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Good Condition *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={returnForm.quantityGood}
                    onChange={(e) => setReturnForm({
                      ...returnForm,
                      quantityGood: parseInt(e.target.value) || 0
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Damaged *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={returnForm.quantityDamaged}
                    onChange={(e) => setReturnForm({
                      ...returnForm,
                      quantityDamaged: parseInt(e.target.value) || 0
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              {returnForm.quantityDamaged > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Damage Reason *</label>
                    <textarea
                      required
                      value={returnForm.damageReason}
                      onChange={(e) => setReturnForm({ ...returnForm, damageReason: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                      placeholder="Explain what happened..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Damage Photos (Required for damaged items)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="w-full border rounded px-3 py-2"
                    />
                    {returnForm.photos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {returnForm.photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Damage ${index + 1}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Physical Report Upload */}
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-3">
                  <Upload className="w-5 h-5" />
                  <div className="font-semibold">📄 Upload Physical Report (Optional)</div>
                </div>
                
                <input
                  type="file"
                  ref={physicalReportInputRef}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhysicalReportFile(file);
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setPhysicalReportPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      } else {
                        setPhysicalReportPreview(null);
                      }
                    }
                  }}
                />
                
                {!physicalReportFile ? (
                  <button
                    type="button"
                    onClick={() => physicalReportInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-blue-400 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors"
                  >
                    <Camera className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-blue-700 font-medium">Click to select photo or PDF</p>
                    <p className="text-sm text-blue-500">JPEG, PNG, PDF (max 10MB)</p>
                  </button>
                ) : (
                  <div className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {physicalReportPreview ? (
                          <img src={physicalReportPreview} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-2xl">📄</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{physicalReportFile.name}</p>
                          <p className="text-sm text-gray-500">{(physicalReportFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicalReportFile(null);
                          setPhysicalReportPreview(null);
                          if (physicalReportInputRef.current) physicalReportInputRef.current.value = '';
                        }}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-blue-600 mt-2">This file will be shown in the Approval Manager and emailed to approvers.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnForm(false);
                    setPhysicalReportFile(null);
                    setPhysicalReportPreview(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Record Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'return' && (
        <div className="space-y-4">
          {issuedMaterials
            .filter(issue => issue.returns && issue.returns.length > 0)
            .map(issue => (
              <div key={issue.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{issue.material.name}</p>
                    <p className="text-sm text-gray-600">
                      Issued: {issue.quantity} {issue.material.unit}
                    </p>
                  </div>
                </div>
                {issue.returns?.map(ret => (
                  <div key={ret.id} className="bg-gray-50 p-3 rounded mt-2 relative group">
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditReturnForm(ret)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit Return"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReturn(ret.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete Return"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Used</p>
                        <p className="font-medium">{ret.quantityUsed}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Returned (Good)</p>
                        <p className="font-medium text-green-600">{ret.quantityGood}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Damaged</p>
                        <p className="font-medium text-red-600">{ret.quantityDamaged}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium">
                          {new Date(ret.recordedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {issuedMaterials.filter(issue => issue.returns && issue.returns.length > 0).length === 0 && (
            <p className="text-center text-gray-500 py-8">No returns recorded yet</p>
          )}
        </div>
      )}

      {/* Edit Return Modal */}
      {showEditReturnForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Return</h3>
              <button onClick={() => setShowEditReturnForm(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditReturn} className="space-y-4 w-full">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity Good</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editReturnForm.quantityGood}
                  onChange={(e) => setEditReturnForm({ ...editReturnForm, quantityGood: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity Damaged</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editReturnForm.quantityDamaged}
                  onChange={(e) => setEditReturnForm({ ...editReturnForm, quantityDamaged: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editReturnForm.notes}
                  onChange={(e) => setEditReturnForm({ ...editReturnForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditReturnForm(false)}
                  className="w-full sm:w-auto px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Update Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMaterialsManager;

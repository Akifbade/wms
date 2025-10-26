import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, X, Save, ArrowLeftRight, Camera, Trash2, Users
} from 'lucide-react';
import StaffAssignmentDialog from '../StaffAssignmentDialog';

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
  const [issuedMaterials, setIssuedMaterials] = useState<IssuedMaterial[]>([]);
  
  // Issue Material State
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({
    materialId: '',
    quantity: 0,
    rackId: '',
    notes: ''
  });

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
    photos: [] as File[]
  });

  const [loading, setLoading] = useState(false);
  
  // Staff Assignment Dialog State
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [selectedMaterialIssueId, setSelectedMaterialIssueId] = useState<string | null>(null);

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
      setMaterials(materialsData);

      // Load racks
      const racksRes = await fetch('/api/materials/available-racks', { headers });
      const racksData = await racksRes.json();
      setRacks(racksData);

      // Load issued materials for this job
      const issuedRes = await fetch(`/api/materials/job-materials/${jobId}`, { headers });
      const issuedData = await issuedRes.json();
      setIssuedMaterials(issuedData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/materials/issue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          materialId: issueForm.materialId,
          quantity: issueForm.quantity,
          rackId: issueForm.rackId || null,
          notes: issueForm.notes
        })
      });

      if (response.ok) {
        alert('Material issued successfully! Stock updated.');
        setShowIssueForm(false);
        setIssueForm({ materialId: '', quantity: 0, rackId: '', notes: '' });
        loadData();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(`Failed to issue material: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to issue material:', error);
      alert('Failed to issue material');
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
    formData.append('issueId', returnForm.issueId);
    formData.append('quantityUsed', returnForm.quantityUsed.toString());
    formData.append('quantityGood', returnForm.quantityGood.toString());
    formData.append('quantityDamaged', returnForm.quantityDamaged.toString());
    formData.append('damageReason', returnForm.damageReason);
    formData.append('notes', returnForm.notes);
    
    // Add photos
    returnForm.photos.forEach((photo) => {
      formData.append(`photos`, photo);
    });

    try {
      const response = await fetch('/api/materials/return', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Material return recorded! Stock updated.');
        setShowReturnForm(false);
        setReturnForm({ 
          issueId: '', 
          quantityUsed: 0, 
          quantityGood: 0, 
          quantityDamaged: 0, 
          damageReason: '', 
          notes: '',
          photos: []
        });
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
            <p className="text-xl font-bold">₹{getTotalIssued().toFixed(2)}</p>
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
          className={`px-4 py-2 font-medium ${
            activeTab === 'issued'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          Issued Materials ({issuedMaterials.length})
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'return'
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
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setShowIssueForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Issue Material
              </button>
              <button
                onClick={() => {
                  setSelectedMaterialIssueId(null);
                  setShowStaffDialog(true);
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <Users className="w-4 h-4" />
                Assign Staff
              </button>
            </div>
          )}

          {/* Issue Material Form */}
          {showIssueForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Issue Material to Job</h3>
                <button onClick={() => setShowIssueForm(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleIssueMaterial} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Material *</label>
                  <select
                    required
                    value={issueForm.materialId}
                    onChange={(e) => setIssueForm({ ...issueForm, materialId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map(mat => (
                      <option key={mat.id} value={mat.id}>
                        {mat.sku} - {mat.name} (Stock: {mat.totalQuantity} {mat.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ 
                      ...issueForm, 
                      quantity: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 
                    })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Storage Rack (Optional)</label>
                  <select
                    value={issueForm.rackId}
                    onChange={(e) => setIssueForm({ ...issueForm, rackId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- No Specific Rack --</option>
                    {racks.map(rack => (
                      <option key={rack.id} value={rack.id}>
                        {rack.code} - {rack.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input
                    type="text"
                    value={issueForm.notes}
                    onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Any special notes..."
                  />
                </div>

                <div className="col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Issuing...' : 'Issue Material'}
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
                    <td className="px-6 py-4 whitespace-nowrap">₹{issue.unitCost.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">₹{issue.totalCost.toFixed(2)}</td>
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
                      {(!issue.returns || issue.returns.length === 0) && jobStatus === 'COMPLETED' && (
                        <button
                          onClick={() => openReturnForm(issue)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          Record Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

            <form onSubmit={handleReturnMaterial} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReturnForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
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
                  <div key={ret.id} className="bg-gray-50 p-3 rounded mt-2">
                    <div className="grid grid-cols-4 gap-4 text-sm">
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
      
      {/* Staff Assignment Dialog */}
      {showStaffDialog && (
        <StaffAssignmentDialog
          open={showStaffDialog}
          onClose={() => {
            setShowStaffDialog(false);
            setSelectedMaterialIssueId(null);
          }}
          jobId={jobId}
          materialIssueId={selectedMaterialIssueId || undefined}
          onSuccess={() => {
            setShowStaffDialog(false);
            setSelectedMaterialIssueId(null);
            loadData(); // Reload data after assignment
          }}
        />
      )}
    </div>
  );
};

export default JobMaterialsManager;

import React, { useState, useEffect } from 'react';

interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minStockLevel: number;
}

interface MaterialIssue {
  id: string;
  jobId: string;
  quantity: number;
  totalCost: number;
  material: Material;
}

const MaterialsManager: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [activeTab, setActiveTab] = useState<'materials' | 'issues' | 'returns'>('materials');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    unit: 'PCS',
    minStockLevel: 0,
  });

  useEffect(() => {
    fetchMaterials();
    fetchIssues();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  const fetchIssues = async () => {
    try {
      const response = await fetch('/api/materials/issues', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowForm(false);
        setFormData({ sku: '', name: '', category: '', unit: 'PCS', minStockLevel: 0 });
        fetchMaterials();
      }
    } catch (error) {
      console.error('Failed to add material:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="mb-4">Materials Management</h2>

      {/* Tabs */}
      <div className="mb-4" style={{ borderBottom: '1px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('materials')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'materials' ? '#007bff' : 'transparent',
            color: activeTab === 'materials' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Materials Catalog
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'issues' ? '#007bff' : 'transparent',
            color: activeTab === 'issues' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Material Issues
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'returns' ? '#007bff' : 'transparent',
            color: activeTab === 'returns' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Material Returns & Damage
        </button>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="overflow-x-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            {showForm ? 'Cancel' : 'Add Material'}
          </button>

          {showForm && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '4px', marginBottom: '20px' }}>
              <form onSubmit={handleAddMaterial}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Create Material
                </button>
              </form>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>SKU</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Unit</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Min Stock</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{material.sku}</td>
                  <td style={{ padding: '12px' }}>{material.name}</td>
                  <td style={{ padding: '12px' }}>{material.category}</td>
                  <td style={{ padding: '12px' }}>{material.unit}</td>
                  <td style={{ padding: '12px' }}>{material.minStockLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {materials.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6c757d', marginTop: '20px' }}>
              No materials found. Create one to get started!
            </p>
          )}
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="overflow-x-auto">
          <h5 style={{ marginBottom: '20px' }}>Material Issues (Allocations)</h5>

          {/* Issue Form */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '4px', marginBottom: '20px' }}>
            <h6>New Issue</h6>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const data = {
                materialId: formData.get('materialId'),
                quantity: Number(formData.get('quantity')),
                issueType: formData.get('issueType'),
                jobId: formData.get('jobId'),
                reference: formData.get('reference'),
              };

              try {
                const response = await fetch('/api/materials/issues', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                  body: JSON.stringify(data),
                });
                if (response.ok) {
                  fetchIssues();
                  form.reset();
                }
              } catch (error) {
                console.error('Failed to issue material:', error);
              }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Material</label>
                  <select name="materialId" required style={{ width: '100%', padding: '8px' }}>
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <input type="number" name="quantity" required min="1" style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Issue Type</label>
                <select
                  name="issueType"
                  style={{ width: '100%', padding: '8px' }}
                  onChange={(e) => {
                    const jobInput = document.getElementById('jobIdInput');
                    const refInput = document.getElementById('refInput');
                    if (e.target.value === 'JOB') {
                      if (jobInput) jobInput.style.display = 'block';
                      if (refInput) refInput.style.display = 'none';
                    } else {
                      if (jobInput) jobInput.style.display = 'none';
                      if (refInput) refInput.style.display = 'block';
                    }
                  }}
                >
                  <option value="JOB">Job Allocation</option>
                  <option value="INTERNAL">Internal Use</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div id="jobIdInput" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Job ID</label>
                <input type="text" name="jobId" style={{ width: '100%', padding: '8px' }} />
              </div>

              <div id="refInput" style={{ marginBottom: '15px', display: 'none' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Reference / Department</label>
                <input type="text" name="reference" placeholder="e.g. Office Kitchen, Truck 1" style={{ width: '100%', padding: '8px' }} />
              </div>

              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Issue Material
              </button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Material</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Quantity</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Total Cost</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Reference / Job</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue: any) => (
                <tr key={issue.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{issue.material?.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: issue.issueType === 'JOB' ? '#e3f2fd' : '#fff3cd',
                      color: issue.issueType === 'JOB' ? '#0d47a1' : '#856404',
                      fontSize: '0.85em'
                    }}>
                      {issue.issueType || 'JOB'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{issue.quantity}</td>
                  <td style={{ padding: '12px' }}>{issue.totalCost.toFixed(2)} KWD</td>
                  <td style={{ padding: '12px' }}>{issue.jobId || issue.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {issues.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6c757d', marginTop: '20px' }}>
              No material issues recorded yet.
            </p>
          )}
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div>
          <h5 style={{ marginBottom: '20px' }}>Material Returns & Damage Tracking</h5>
          <p style={{ color: '#6c757d' }}>Track material returns after job completion and record damage.</p>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              marginTop: '20px',
            }}
          >
            <p>📋 Coming soon: Return request form and damage photo upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsManager;

import React, { useState, useEffect } from 'react';

interface MaterialApproval {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  category: string;
  quantity: number;
  estimatedCost: number;
  approvalType: 'DAMAGE' | 'PREMIUM_MATERIAL' | 'QUANTITY_VARIATION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  decisionNotes?: string;
  jobId?: string;
  jobCode?: string;
}

const ApprovalManager: React.FC = () => {
  const [approvals, setApprovals] = useState<MaterialApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<MaterialApproval[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DAMAGE' | 'PREMIUM_MATERIAL' | 'QUANTITY_VARIATION'>('ALL');
  const [selectedApproval, setSelectedApproval] = useState<MaterialApproval | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [approvals, statusFilter, typeFilter]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials/approvals', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = approvals;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((a) => a.approvalType === typeFilter);
    }

    setFilteredApprovals(filtered);
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/materials/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          decision: 'APPROVED',
          notes: decisionNotes,
        }),
      });

      if (res.ok) {
        alert('Approval recorded successfully');
        setSelectedApproval(null);
        setDecisionNotes('');
        fetchApprovals();
      } else {
        alert('Failed to record approval');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/materials/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          decision: 'REJECTED',
          notes: decisionNotes,
        }),
      });

      if (res.ok) {
        alert('Rejection recorded successfully');
        setSelectedApproval(null);
        setDecisionNotes('');
        fetchApprovals();
      } else {
        alert('Failed to record rejection');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getApprovalTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      DAMAGE: '#dc3545',
      PREMIUM_MATERIAL: '#007bff',
      QUANTITY_VARIATION: '#ffc107',
    };
    return colors[type] || '#6c757d';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#ffc107',
      APPROVED: '#28a745',
      REJECTED: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="p-4">
      <h2 className="mb-4">Approval Workflow Management</h2>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          >
            <option value="ALL">All Types</option>
            <option value="DAMAGE">Damage Claims</option>
            <option value="PREMIUM_MATERIAL">Premium Materials</option>
            <option value="QUANTITY_VARIATION">Quantity Variations</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={fetchApprovals}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading approvals...</p>
      ) : filteredApprovals.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No approvals found.</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                borderLeft: `4px solid ${getStatusBadge(approval.status)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <h5 style={{ marginBottom: '5px' }}>{approval.materialName}</h5>
                  <small style={{ color: '#6c757d' }}>
                    SKU: {approval.materialSku} • Category: {approval.category}
                    {approval.jobCode && ` • Job: ${approval.jobCode}`}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span
                    style={{
                      backgroundColor: getApprovalTypeBadge(approval.approvalType),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {approval.approvalType.replace(/_/g, ' ')}
                  </span>
                  <span
                    style={{
                      backgroundColor: getStatusBadge(approval.status),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {approval.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <small style={{ color: '#6c757d' }}>Quantity</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{approval.quantity} units</p>
                </div>
                <div>
                  <small style={{ color: '#6c757d' }}>Estimated Cost</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{approval.estimatedCost.toFixed(2)} KWD</p>
                </div>
                <div>
                  <small style={{ color: '#6c757d' }}>Requested By</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{approval.requestedBy}</p>
                </div>
                <div>
                  <small style={{ color: '#6c757d' }}>Requested At</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>
                    {new Date(approval.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {approval.status === 'PENDING' && (
                <button
                  onClick={() => setSelectedApproval(approval)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  Review & Decide
                </button>
              )}

              {approval.status !== 'PENDING' && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                  <small style={{ color: '#6c757d' }}>
                    <strong>Decision:</strong> {approval.status} by {approval.approvedBy} on{' '}
                    {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : 'N/A'}
                  </small>
                  {approval.decisionNotes && (
                    <p style={{ margin: '5px 0', color: '#495057' }}>
                      <strong>Notes:</strong> {approval.decisionNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selectedApproval && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedApproval(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ marginBottom: '15px' }}>Review Approval Request</h4>

            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <small style={{ color: '#6c757d' }}>
                <strong>{selectedApproval.materialName}</strong> ({selectedApproval.materialSku})
              </small>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                {selectedApproval.quantity} units • {selectedApproval.estimatedCost.toFixed(2)} KWD
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Decision Notes
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                }}
                placeholder="Enter approval or rejection notes..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedApproval(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedApproval.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedApproval.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalManager;

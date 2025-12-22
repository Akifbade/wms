import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ApprovalUser {
  id: string;
  name: string;
  email?: string;
}

interface ApprovalJob {
  id: string;
  jobCode: string;
  jobTitle?: string;
  clientName?: string;
  status?: string;
}

interface MaterialApproval {
  id: string;
  jobId: string;
  approvalType: string;
  status: ApprovalStatus;
  requestedAt: string;
  requestedBy?: ApprovalUser | null;
  decidedAt?: string | null;
  decisionBy?: ApprovalUser | null;
  decisionNotes?: string | null;
  notifyEmails?: string | null;
  reminderCount?: number;
  lastReminderAt?: string | null;
  job?: ApprovalJob | null;
}

type ApprovalDetailResponse =
  | { approval: MaterialApproval }
  | {
    approval: MaterialApproval;
    materials: Array<{ name: string; unit: string; issued: number; used: number; returnedGood: number; damaged: number; totalCost: number }>;
    totals: { issued: number; used: number; returnedGood: number; damaged: number; totalCost: number };
    physicalReports?: string[];
  };

const ApprovalManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const approvalIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('approvalId');
  }, [location.search]);

  const [approvals, setApprovals] = useState<MaterialApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<MaterialApproval[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL');
  const [selectedApproval, setSelectedApproval] = useState<MaterialApproval | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApprovalDetailResponse | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifications, setVerifications] = useState<Record<string, { status: 'CORRECT' | 'ISSUE' | null; remarks: string }>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    if (!approvalIdFromQuery) return;
    // Deep-link from email: open approval detail modal
    fetchApprovalDetail(approvalIdFromQuery);
  }, [approvalIdFromQuery]);

  useEffect(() => {
    applyFilters();
  }, [approvals, statusFilter, typeFilter]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials/approvals', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
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

  const fetchApprovalDetail = async (approvalId: string) => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const res = await fetch(`/api/materials/approvals/${approvalId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = (await res.json()) as ApprovalDetailResponse;
        setSelectedDetail(data);
        setSelectedApproval((data as any).approval);
      } else {
        console.error('Failed to fetch approval detail');
      }
    } catch (error) {
      console.error('Failed to fetch approval detail:', error);
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
    const combinedNotes = JSON.stringify({ notes: decisionNotes, verifications });
    try {
      const res = await fetch(`/api/materials/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          status: 'APPROVED',
          notes: combinedNotes,
        }),
      });

      if (res.ok) {
        alert('Approval recorded successfully');
        setSelectedApproval(null);
        setSelectedDetail(null);
        setDecisionNotes('');
        fetchApprovals();
        // Remove query param if this was opened from an email deep-link
        if (approvalIdFromQuery) navigate('/approvals', { replace: true });
      } else {
        alert('Failed to record approval');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReject = async (approvalId: string) => {
    const combinedNotes = JSON.stringify({ notes: decisionNotes, verifications });
    try {
      const res = await fetch(`/api/materials/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          status: 'REJECTED',
          notes: combinedNotes,
        }),
      });

      if (res.ok) {
        alert('Rejection recorded successfully');
        setSelectedApproval(null);
        setSelectedDetail(null);
        setDecisionNotes('');
        fetchApprovals();
        if (approvalIdFromQuery) navigate('/approvals', { replace: true });
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
      RETURN: '#0ea5e9',
      STOCK_IN: '#8b5cf6',
      JOB_COMPLETION_REPORT: '#111827',
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
            <option value="JOB_COMPLETION_REPORT">Job Completion Report</option>
            <option value="RETURN">Returns</option>
            <option value="DAMAGE">Damages</option>
            <option value="STOCK_IN">Stock In</option>
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
                  <h5 style={{ marginBottom: '5px' }}>{approval.job?.jobCode || approval.jobId}</h5>
                  <small style={{ color: '#6c757d' }}>
                    Type: {approval.approvalType.replace(/_/g, ' ')}
                    {approval.job?.clientName ? ` • Customer: ${approval.job.clientName}` : ''}
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
                  <small style={{ color: '#6c757d' }}>Job</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{approval.job?.jobTitle || 'N/A'}</p>
                </div>
                <div>
                  <small style={{ color: '#6c757d' }}>Requested At</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{new Date(approval.requestedAt).toLocaleString()}</p>
                </div>
                <div>
                  <small style={{ color: '#6c757d' }}>Requested By</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{approval.requestedBy?.name || 'System'}</p>
                </div>
                <div>
                  <small style={{ color: '#6c757d' }}>Reminders</small>
                  <p style={{ fontWeight: 'bold', margin: '3px 0' }}>{approval.reminderCount ?? 0}</p>
                </div>
              </div>

              {approval.status === 'PENDING' && (
                <button
                  onClick={() => {
                    setSelectedApproval(approval);
                    fetchApprovalDetail(approval.id);
                  }}
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
                    <strong>Decision:</strong> {approval.status} by {approval.decisionBy?.name || 'N/A'} on{' '}
                    {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : 'N/A'}
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
          onClick={() => {
            setSelectedApproval(null);
            setSelectedDetail(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '1400px',
              width: '95vw',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ marginBottom: '15px' }}>Review Approval Request • Requested by {selectedApproval.requestedBy?.name || selectedApproval.requestedBy?.email || 'System'}</h4>

            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <small style={{ color: '#6c757d' }}>
                <strong>{selectedApproval.job?.jobCode || selectedApproval.jobId}</strong> • {selectedApproval.approvalType.replace(/_/g, ' ')}
              </small>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                {selectedApproval.job?.clientName ? `Customer: ${selectedApproval.job.clientName}` : ''}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '20px', marginBottom: '20px' }}>
              {/* LEFT: Physical Reports */}
              <div>
                {selectedDetail && (selectedDetail as any).physicalReports && (selectedDetail as any).physicalReports.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ marginBottom: '10px', color: '#16a34a' }}>📄 Physical Reports Uploaded</h5>
                    
                    {expandedImage ? (
                      // Show expanded single image
                      <div style={{ position: 'relative', border: '2px solid #16a34a', borderRadius: '8px', overflow: 'hidden' }}>
                        <img 
                          src={expandedImage} 
                          alt="Expanded Report" 
                          style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                        />
                        <button
                          onClick={() => setExpandedImage(null)}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: 'rgba(220, 38, 38, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}
                        >
                          ✕
                        </button>
                        <div style={{ padding: '10px', backgroundColor: '#f0fdf4', textAlign: 'center', fontWeight: 'bold', color: '#166534' }}>
                          Click ✕ to see all images again
                        </div>
                      </div>
                    ) : (
                      // Show thumbnail grid
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                  {(selectedDetail as any).physicalReports.map((reportUrl: string, idx: number) => {
                    const normalizeReportUrl = (rawUrl: string) => {
                      if (!rawUrl) return rawUrl;

                      // Prefer current origin for relative paths.
                      if (!rawUrl.startsWith('http')) {
                        return `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                      }

                      // If backend returned a Docker-internal hostname (e.g. wms-backend), rewrite to current origin.
                      try {
                        const parsed = new URL(rawUrl);
                        if (parsed.hostname === 'wms-backend' && parsed.pathname) {
                          return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
                        }
                      } catch {
                        // ignore
                      }

                      return rawUrl;
                    };

                    const fullUrl = normalizeReportUrl(reportUrl);
                    const isPdf = /\.pdf($|\?)/i.test(fullUrl);
                    return (
                      <div
                        key={idx}
                        style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '2px solid #16a34a', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        onClick={() => {
                          if (isPdf) {
                            window.open(fullUrl, '_blank');
                          } else {
                            setExpandedImage(fullUrl);
                          }
                        }}
                      >
                        {isPdf ? (
                          <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', color: '#166534', fontWeight: 'bold' }}>
                            PDF Report
                          </div>
                        ) : (
                          <img
                            src={fullUrl}
                            alt={`Physical Report ${idx + 1}`}
                            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                            onError={(e) => {
                              console.error('Failed to load image:', fullUrl);
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23fee2e2" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23dc2626" font-family="Arial" font-size="11"%3EImage Error%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        )}
                        <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(22, 163, 74, 0.9)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          Report #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
                    )}
                    <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px', fontWeight: 'bold' }}>✅ Click image to expand, PDF opens in new tab</p>
                  </div>
                )}
              </div>

              {/* RIGHT: Material Verification */}
              <div>
                {selectedDetail && (selectedDetail as any).materials && (
                  <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ marginBottom: '10px', color: '#0ea5e9' }}>🔍 Material Verification</h5>
                <div style={{ maxHeight: '500px', overflow: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '10px' }}>
                  {(selectedDetail as any).materials.map((m: any, idx: number) => {
                    const materialKey = m.name || `material-${idx}`;
                    const verification = verifications[materialKey] || { status: null, remarks: '' };
                    return (
                      <div key={idx} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: verification.status === 'CORRECT' ? '#f0fdf4' : verification.status === 'ISSUE' ? '#fef2f2' : '#fff' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1e293b' }}>{m.name || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                          Issued: {m.issued || 0} • Used: {m.used || 0} • Returned: {m.returnedGood || 0} • Damaged: {m.damaged || 0}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <button
                            onClick={() => setVerifications({ ...verifications, [materialKey]: { ...verification, status: 'CORRECT' } })}
                            style={{ flex: 1, padding: '6px', backgroundColor: verification.status === 'CORRECT' ? '#16a34a' : '#e2e8f0', color: verification.status === 'CORRECT' ? 'white' : '#64748b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            ✓ Correct
                          </button>
                          <button
                            onClick={() => setVerifications({ ...verifications, [materialKey]: { ...verification, status: 'ISSUE' } })}
                            style={{ flex: 1, padding: '6px', backgroundColor: verification.status === 'ISSUE' ? '#dc2626' : '#e2e8f0', color: verification.status === 'ISSUE' ? 'white' : '#64748b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            ✗ Issue
                          </button>
                        </div>
                        {verification.status && (
                          <textarea
                            placeholder="Add remarks..."
                            value={verification.remarks}
                            onChange={(e) => setVerifications({ ...verifications, [materialKey]: { ...verification, remarks: e.target.value } })}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box', minHeight: '50px' }}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Totals:</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Issued: {(selectedDetail as any).totals?.issued || 0} • Used: {(selectedDetail as any).totals?.used || 0} • Returned: {(selectedDetail as any).totals?.returnedGood || 0} • Damaged: {(selectedDetail as any).totals?.damaged || 0}
                    </div>
                  </div>
                </div>
              </div>
                )}
              </div>
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
                onClick={() => {
                  setSelectedApproval(null);
                  setSelectedDetail(null);
                }}
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

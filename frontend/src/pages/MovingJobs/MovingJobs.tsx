import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TruckIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  FolderIcon,
  ArrowRightIcon,
  PhoneIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import { jobsAPI } from '../../services/api';
import CreateMovingJobModal from '../../components/CreateMovingJobModal';
import EditMovingJobModal from '../../components/EditMovingJobModal';
import JobDetailsModal from '../../components/moving-jobs/JobDetailsModal';
import JobMaterialReport from '../../components/moving-jobs/JobMaterialReport';
import MaterialReturnModal from '../../components/MaterialReturnModal';
import JobFileManager from '../../components/moving-jobs/JobFileManager';

export const MovingJobs: React.FC = () => {
  const { jobId } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    loadJobs();
  }, [filterStatus]);

  // Auto-open job report if jobId is in URL
  useEffect(() => {
    if (jobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
        setReportModalOpen(true);
        navigate('/moving-jobs', { replace: true });
      }
    }
  }, [jobId, jobs, navigate]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') {
        const statusMap: Record<string, string> = {
          'scheduled': 'SCHEDULED,PLANNED',
          'inprogress': 'IN_PROGRESS,DISPATCHED',
          'completed': 'COMPLETED,CLOSED'
        };
        params.status = statusMap[filterStatus] || filterStatus.toUpperCase();
      }

      const data = await jobsAPI.getAll(params);
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Load jobs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'SCHEDULED': 'bg-blue-100 text-blue-800 border-blue-200',
      'PLANNED': 'bg-purple-100 text-purple-800 border-purple-200',
      'IN_PROGRESS': 'bg-amber-100 text-amber-800 border-amber-200',
      'DISPATCHED': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'COMPLETED': 'bg-green-100 text-green-800 border-green-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
    };

    const labels: Record<string, string> = {
      'SCHEDULED': 'Scheduled',
      'PLANNED': 'Planned',
      'IN_PROGRESS': 'In Progress',
      'DISPATCHED': 'Dispatched',
      'PENDING_APPROVAL': 'Approval Pending',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moving Jobs</h1>
          <p className="text-sm text-gray-500">Manage your moving operations</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          <PlusIcon className="h-5 w-5 mr-1.5" />
          New Job
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Jobs', value: jobs.length, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Active', value: jobs.filter(j => j.status === 'IN_PROGRESS').length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Scheduled', value: jobs.filter(j => ['SCHEDULED', 'PLANNED'].includes(j.status)).length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: jobs.filter(j => j.status === 'COMPLETED').length, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.bg} rounded-lg p-3 border border-gray-200/60`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {['all', 'scheduled', 'inprogress', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterStatus === status
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const latestApproval = job.approvals?.[0];
            const isRejected = latestApproval?.status === 'REJECTED';
            const isPending = job.status === 'PENDING_APPROVAL';
            
            // Debug: Log approval data to console
            if (isRejected && latestApproval) {
              console.log('🔴 REJECTED JOB - Full Approval Data:', {
                jobId: job.id,
                jobCode: job.jobCode,
                approvalId: latestApproval.id,
                status: latestApproval.status,
                decidedAt: latestApproval.decidedAt,
                decisionBy: latestApproval.decisionBy,
                hasDecisionBy: !!latestApproval.decisionBy,
                decisionByName: latestApproval.decisionBy?.name,
                decisionByEmail: latestApproval.decisionBy?.email
              });
            }

            // Get physical report files
            const physicalReports = job.materialReturns
              ?.filter((mr: any) => mr.physicalReportUrl)
              .map((mr: any) => mr.physicalReportUrl) || [];

            return (
              <div
                key={job.id}
                className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow flex flex-col relative group ${isRejected ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                  }`}
              >
                {/* Delete Button - Absolute Top Right */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete job "${job.title || job.jobTitle}"?`)) {
                      try {
                        await jobsAPI.delete(job.id);
                        loadJobs();
                      } catch (err) {
                        console.error('Delete error:', err);
                        alert('Failed to delete job');
                      }
                    }
                  }}
                  className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                  title="Delete Job"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>

                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 pr-10">
                  <div className="flex flex-col gap-1 mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1 text-lg" title={job.jobTitle || job.title}>
                      {job.jobTitle || job.title || 'Untitled Job'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{job.jobCode || 'NO-CODE'}</span>
                      {getStatusBadge(job.status)}
                    </div>
                  </div>

                  {/* Rejection Alert */}
                  {isRejected && (
                    <div className="mt-2 bg-red-50 border border-red-100 rounded-md p-2.5">
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-xs font-bold text-red-800">REJECTED</p>
                            {latestApproval?.decisionBy && (
                              <span className="text-xs text-red-600 font-semibold">
                                by {latestApproval.decisionBy.name || latestApproval.decisionBy.email || 'Manager'}
                              </span>
                            )}
                            {latestApproval?.decidedAt && (
                              <span className="text-xs text-red-500">
                                • {new Date(latestApproval.decidedAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          
                          {/* Parse and display verification details */}
                          {(() => {
                            try {
                              const parsed = JSON.parse(latestApproval?.decisionNotes || '{}');
                              const hasVerifications = parsed.verifications && Object.keys(parsed.verifications).length > 0;
                              
                              return (
                                <>
                                  {/* Overall Notes */}
                                  {parsed.notes && (
                                    <p className="text-xs text-red-700 mb-2 whitespace-pre-wrap break-words">
                                      {parsed.notes}
                                    </p>
                                  )}
                                  
                                  {/* Material Verification Checklist */}
                                  {hasVerifications && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-xs font-semibold text-red-800 mb-1">Material Issues:</p>
                                      {Object.entries(parsed.verifications).map(([material, data]: [string, any]) => {
                                        if (!data.status) return null;
                                        
                                        const isCorrect = data.status === 'CORRECT';
                                        return (
                                          <div 
                                            key={material} 
                                            className={`flex items-start gap-1.5 text-xs p-1.5 rounded ${
                                              isCorrect ? 'bg-green-50' : 'bg-red-100'
                                            }`}
                                          >
                                            <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                              {isCorrect ? '✓' : '✗'}
                                            </span>
                                            <div className="flex-1">
                                              <span className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                                {material}
                                              </span>
                                              {data.remarks && (
                                                <span className="text-gray-600"> - {data.remarks}</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* Fallback for old format (plain text) */}
                                  {!parsed.notes && !hasVerifications && latestApproval?.decisionNotes && (
                                    <p className="text-xs text-red-700 whitespace-pre-wrap break-words">
                                      {latestApproval.decisionNotes}
                                    </p>
                                  )}
                                </>
                              );
                            } catch (e) {
                              // If JSON parse fails, show as plain text
                              return (
                                <p className="text-xs text-red-700 whitespace-pre-wrap break-words">
                                  {latestApproval?.decisionNotes || 'No reason provided'}
                                </p>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approval Info (for approved/completed jobs) */}
                  {!isRejected && latestApproval?.status === 'APPROVED' && (
                    <div className="mt-2 bg-green-50 border border-green-100 rounded-md p-2.5">
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-green-800">APPROVED</p>
                            {latestApproval?.decisionBy && (
                              <span className="text-xs text-green-700 font-semibold">
                                by {latestApproval.decisionBy.name || latestApproval.decisionBy.email || 'Manager'}
                              </span>
                            )}
                            {latestApproval?.decidedAt && (
                              <span className="text-xs text-green-600">
                                • {new Date(latestApproval.decidedAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          
                          {/* Show approval notes if any */}
                          {(() => {
                            try {
                              const parsed = JSON.parse(latestApproval?.decisionNotes || '{}');
                              if (parsed.notes) {
                                return (
                                  <p className="text-xs text-green-700 mt-1.5 whitespace-pre-wrap break-words">
                                    {parsed.notes}
                                  </p>
                                );
                              }
                            } catch (e) {
                              // If JSON parse fails and there are notes, show them
                              if (latestApproval?.decisionNotes) {
                                return (
                                  <p className="text-xs text-green-700 mt-1.5 whitespace-pre-wrap break-words">
                                    {latestApproval.decisionNotes}
                                  </p>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1">
                  {/* Client */}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <UserGroupIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium truncate">{job.clientName}</span>
                    {job.clientPhone && (
                      <>
                        <span className="text-gray-300">|</span>
                        <PhoneIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-500 text-xs">{job.clientPhone}</span>
                      </>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>
                      {job.jobDate ? new Date(job.jobDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      }) : 'No Date'}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-start gap-2 text-sm">
                    <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-gray-700" title={job.jobAddress || job.fromAddress}>
                          {job.jobAddress || job.fromAddress || 'No Origin'}
                        </span>
                        {(job.dropoffAddress || job.toAddress) && (
                          <>
                            <ArrowRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-gray-700" title={job.dropoffAddress || job.toAddress}>
                              {job.dropoffAddress || job.toAddress}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Physical Reports Preview */}
                  {physicalReports.length > 0 && (
                    <div className="pt-2 border-t border-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <PaperClipIcon className="h-3 w-3" />
                        Physical Reports ({physicalReports.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {physicalReports.map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                            title="View Report"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DocumentTextIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer - Actions */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { setSelectedJob(job); setDetailsModalOpen(true); }}
                    className="flex flex-col items-center justify-center py-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                    title="View Details"
                  >
                    <EyeIcon className="h-5 w-5" />
                    <span className="text-[10px] font-medium mt-0.5">View</span>
                  </button>

                  <button
                    onClick={() => { setSelectedJob(job); setEditModalOpen(true); }}
                    className="flex flex-col items-center justify-center py-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                    title="Edit Job"
                  >
                    <PencilIcon className="h-5 w-5" />
                    <span className="text-[10px] font-medium mt-0.5">Edit</span>
                  </button>

                  <button
                    onClick={() => { setSelectedJob(job); setFileManagerOpen(true); }}
                    className="flex flex-col items-center justify-center py-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                    title="Files"
                  >
                    <FolderIcon className="h-5 w-5" />
                    <span className="text-[10px] font-medium mt-0.5">Files</span>
                  </button>

                  <button
                    onClick={() => { setSelectedJob(job); setReportModalOpen(true); }}
                    className="flex flex-col items-center justify-center py-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                    title="Report"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span className="text-[10px] font-medium mt-0.5">Report</span>
                  </button>

                  {/* Full Width Action Button */}
                  {(!isPending && !job.status.includes('COMPLETED')) && (
                    <button
                      onClick={() => { setSelectedJob(job); setReturnModalOpen(true); }}
                      className={`col-span-4 mt-1 py-2 px-3 rounded-md text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-colors ${isRejected
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                        }`}
                    >
                      {isRejected ? (
                        <>
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                          RESUBMIT FOR APPROVAL
                        </>
                      ) : (
                        <>
                          <TruckIcon className="h-3.5 w-3.5" />
                          COMPLETE JOB / RETURN MATERIALS
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateMovingJobModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadJobs}
      />

      <EditMovingJobModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        job={selectedJob}
        onSuccess={loadJobs}
      />

      <JobDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        job={selectedJob}
        onUpdate={loadJobs}
      />

      <JobMaterialReport
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        jobId={selectedJob?.id || ''}
      />

      <MaterialReturnModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        jobId={selectedJob?.id || ''}
        jobsAPI={jobsAPI}
        onSuccess={async () => {
          await loadJobs();
        }}
      />

      <JobFileManager
        isOpen={fileManagerOpen}
        onClose={() => setFileManagerOpen(false)}
        job={selectedJob}
      />
    </div>
  );
};

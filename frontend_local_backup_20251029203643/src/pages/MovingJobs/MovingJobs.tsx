import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TruckIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { jobsAPI } from '../../services/api';
import CreateMovingJobModal from '../../components/CreateMovingJobModal';
import EditMovingJobModal from '../../components/EditMovingJobModal';
import JobDetailsModal from '../../components/moving-jobs/JobDetailsModal';
import JobMaterialReport from '../../components/moving-jobs/JobMaterialReport';
import MaterialReturnModal from '../../components/MaterialReturnModal';
import JobFileManager from '../../components/moving-jobs/JobFileManager';

export const MovingJobs: React.FC = () => {
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

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') {
        // Map filter names to actual DB status values
        const statusMap: Record<string, string> = {
          'scheduled': 'SCHEDULED,PLANNED',  // Include both
          'inprogress': 'IN_PROGRESS,DISPATCHED',  // Include both  
          'completed': 'COMPLETED,CLOSED'  // Include both
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Moving Jobs</h1>
          <p className="text-gray-600 mt-1">Schedule and manage moving operations</p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{jobs.length}</p>
            </div>
            <TruckIcon className="h-10 w-10 text-primary-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {jobs.filter((j: any) => j.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {jobs.filter((j: any) => j.status === 'SCHEDULED' || j.status === 'PLANNED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-xl font-bold text-gray-900 mt-2">
                {jobs.filter((j: any) => j.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Jobs
          </button>
          <button
            onClick={() => setFilterStatus('scheduled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'scheduled' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilterStatus('inprogress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'inprogress' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'completed' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobs.map((job: any) => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all">
              {/* Header with Status Badge */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{job.jobTitle || job.title || 'Untitled Job'}</h3>
                    <p className="text-blue-100 text-sm">{job.jobCode || 'No Code'}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              </div>

              {/* Job Details */}
              <div className="p-6 space-y-4">
                {/* Client Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-sm mb-2">
                    <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-bold text-gray-700">Client Details</span>
                  </div>
                  <div className="ml-7 space-y-1">
                    <p className="text-sm font-medium text-gray-900">{job.clientName}</p>
                    <p className="text-sm text-gray-600">{job.clientPhone}</p>
                    {job.clientEmail && <p className="text-sm text-gray-600">{job.clientEmail}</p>}
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-2">
                  <div className="flex items-start text-sm">
                    <MapPinIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-700">From:</p>
                      <p className="text-gray-600 text-xs mt-1">{job.jobAddress || job.fromAddress || 'Not specified'}</p>
                    </div>
                  </div>
                  {(job.dropoffAddress || job.toAddress) && (
                    <div className="flex items-start text-sm ml-7">
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">To:</p>
                        <p className="text-gray-600 text-xs mt-1">{job.dropoffAddress || job.toAddress}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date & Type */}
                <div className="flex items-center justify-between text-sm bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {job.jobDate ? new Date(job.jobDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : 'No Date'}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {job.jobType || 'LOCAL'}
                  </span>
                </div>

                {/* Team Members */}
                {job.assignments && job.assignments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">ASSIGNED TEAM</p>
                    <div className="flex flex-wrap gap-2">
                      {job.assignments.map((assignment: any) => (
                        <span key={assignment.id} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          👤 {assignment.user.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials Issued */}
                {job.materialIssues && job.materialIssues.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-700 mb-1">
                      📦 Materials: {job.materialIssues.length} items issued
                    </p>
                  </div>
                )}

                {/* Notes Preview */}
                {job.notes && (
                  <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                    <span className="font-medium">Note:</span> {job.notes.substring(0, 50)}{job.notes.length > 50 ? '...' : ''}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-6 pb-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setDetailsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setEditModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setReportModalOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    Report
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setFileManagerOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    📁 Files
                  </button>
                  {job.status !== 'COMPLETED' && (
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setReturnModalOpen(true);
                      }}
                      className="px-4 py-2 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      ✅ Complete Job
                    </button>
                  )}
                  <button
                    onClick={async () => {
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
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      <CreateMovingJobModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadJobs}
      />

      {/* Edit Job Modal */}
      <EditMovingJobModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        job={selectedJob}
        onSuccess={loadJobs}
      />

      {/* Job Details Modal with Materials */}
      <JobDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        job={selectedJob}
        onUpdate={loadJobs}
      />

      {/* Job Material Report Modal */}
      <JobMaterialReport
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        jobId={selectedJob?.id || ''}
      />

      {/* Material Return Modal - Complete Job */}
      <MaterialReturnModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        jobId={selectedJob?.id || ''}
        onSuccess={async () => {
          // Update job status to COMPLETED after materials returned
          try {
            await jobsAPI.update(selectedJob.id, { status: 'COMPLETED' });
            await loadJobs(); // Reload jobs to get updated data
          } catch (error) {
            console.error('Failed to update job status:', error);
            throw error; // Re-throw so MaterialReturnModal can handle it
          }
        }}
      />

      {/* File Manager Modal */}
      <JobFileManager
        isOpen={fileManagerOpen}
        onClose={() => setFileManagerOpen(false)}
        job={selectedJob}
      />
    </div>
  );
};

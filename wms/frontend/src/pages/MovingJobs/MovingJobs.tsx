import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TruckIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { jobsAPI } from '../../services/api';
import CreateMovingJobModal from '../../components/CreateMovingJobModal';
import EditMovingJobModal from '../../components/EditMovingJobModal';

export const MovingJobs: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    loadJobs();
  }, [filterStatus]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus.toUpperCase().replace(' ', '_');
      
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
              <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
            </div>
            <TruckIcon className="h-10 w-10 text-primary-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-3xl font-bold text-green-600 mt-2">3</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-xl font-bold text-gray-900 mt-2">12,500 KWD</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job: any) => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{job.clientName}</p>
                </div>
                <div className={`text-sm font-semibold ${getPriorityColor(job.priority)}`}>
                  {job.priority} Priority
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <TruckIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <span className="font-medium">{job.jobType}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium">From:</span>
                      <span className="ml-2">{job.fromAddress}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">To:</span>
                      <span className="ml-2">{job.toAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <div className="flex items-center space-x-1">
                    {job.assignments?.map((assignment: any) => (
                      <span key={assignment.id} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {assignment.user.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Estimated Cost</span>
                  <span className="text-lg font-bold text-gray-900">{job.totalCost || 0} KWD</span>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-200 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setEditModalOpen(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete job "${job.title}"?`)) {
                        try {
                          await jobsAPI.delete(job.id);
                          loadJobs();
                        } catch (err) {
                          console.error('Delete error:', err);
                          alert('Failed to delete job');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
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
    </div>
  );
};

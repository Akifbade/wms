import React, { useState } from 'react';
import { X } from 'lucide-react';
import JobMaterialsManager from './JobMaterialsManager';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onUpdate?: () => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ isOpen, onClose, job, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'materials'>('details');

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{job.title || job.jobTitle}</h2>
            <p className="text-gray-600">{job.jobCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Job Details
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Materials
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-3">Client Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{job.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{job.clientPhone}</p>
                  </div>
                  {job.clientEmail && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{job.clientEmail}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3">Job Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Job Date</p>
                    <p className="font-medium">
                      {new Date(job.jobDate).toLocaleDateString()}
                    </p>
                  </div>
                  {job.driverName && (
                    <div>
                      <p className="text-sm text-gray-500">Driver</p>
                      <p className="font-medium">{job.driverName}</p>
                    </div>
                  )}
                  {job.vehicleNumber && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle</p>
                      <p className="font-medium">{job.vehicleNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <h3 className="font-bold text-lg mb-3">Addresses</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Pickup Address</p>
                    <p className="font-medium">{job.jobAddress}</p>
                  </div>
                  {job.dropoffAddress && (
                    <div>
                      <p className="text-sm text-gray-500">Dropoff Address</p>
                      <p className="font-medium">{job.dropoffAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              {job.notes && (
                <div className="col-span-2">
                  <h3 className="font-bold text-lg mb-3">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded">{job.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <JobMaterialsManager 
              jobId={job.id} 
              jobStatus={job.status}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;

import React, { useMemo } from 'react';
import { JobFile } from '../../types';

interface PodManagerViewProps {
    jobs: JobFile[];
    onAssign: (job: JobFile | null) => void;
    onComplete: (job: JobFile) => void;
    onViewReceipt: (job: JobFile) => void;
    onShare: (job: JobFile) => void;
    onEditDetails: (job: JobFile) => void;
    onViewDetails: (job: JobFile) => void;
}

const PodManagerView: React.FC<PodManagerViewProps> = ({ jobs, onAssign, onComplete, onViewReceipt, onShare, onEditDetails, onViewDetails }) => {
    
    const { pendingJobs, completedJobs } = useMemo(() => {
        const pending: JobFile[] = [];
        const completed: JobFile[] = [];
        
        jobs.forEach(job => {
            if (job.deliveryAssigned) {
                if (job.deliveryStatus === 'Delivered') {
                    completed.push(job);
                } else {
                    pending.push(job);
                }
            }
        });
        
        pending.sort((a, b) => new Date(b.deliveryAssignedAt || 0).getTime() - new Date(a.deliveryAssignedAt || 0).getTime());
        completed.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

        return { pendingJobs: pending, completedJobs: completed };
    }, [jobs]);

    const DeliveryCard: React.FC<{ job: JobFile }> = ({ job }) => (
        <div className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50">
            <div className="flex-grow">
                <p className="font-bold text-primary-700">{job.jfn}</p>
                <p className="text-sm text-slate-600"><strong>To:</strong> {job.deliveryLocation || 'N/A'}</p>
                <p className="text-xs text-slate-500"><strong>Driver:</strong> {job.driverName || 'N/A'} {job.isExternal ? '(External)' : ''}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
                {job.deliveryStatus === 'Pending' && (
                    <>
                        <button onClick={() => onViewDetails(job)} className="btn btn-secondary text-sm">View Details</button>
                        <button onClick={() => onEditDetails(job)} className="btn btn-secondary text-sm">Edit</button>
                        <button onClick={() => onComplete(job)} className="btn bg-green-500 hover:bg-green-600 text-white text-sm">Complete</button>
                        {job.isExternal && <button onClick={() => onShare(job)} className="btn bg-cyan-500 hover:bg-cyan-600 text-white text-sm">Share Link</button>}
                    </>
                )}
                 {job.deliveryStatus === 'Delivered' && (
                    <button onClick={() => onViewReceipt(job)} className="btn btn-secondary text-sm">View Receipt</button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">POD Management</h1>
                <button onClick={() => onAssign(null)} className="btn btn-primary">
                    + Assign New Delivery
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-xl font-bold mb-4">Pending Deliveries ({pendingJobs.length})</h3>
                    <div className="space-y-3 max-h-[65vh] overflow-y-auto p-1">
                        {pendingJobs.length > 0 
                            ? pendingJobs.map(job => <DeliveryCard key={job.id} job={job} />)
                            : <p className="text-center text-slate-500 py-8">No pending deliveries.</p>
                        }
                    </div>
                </div>
                <div className="card">
                    <h3 className="text-xl font-bold mb-4">Completed Deliveries ({completedJobs.length})</h3>
                    <div className="space-y-3 max-h-[65vh] overflow-y-auto p-1">
                        {completedJobs.length > 0
                            ? completedJobs.map(job => <DeliveryCard key={job.id} job={job} />)
                            : <p className="text-center text-slate-500 py-8">No completed deliveries yet.</p>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PodManagerView;
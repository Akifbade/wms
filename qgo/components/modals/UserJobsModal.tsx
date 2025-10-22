import React from 'react';
import { JobFile, PermissionSet } from '../../types';
import Modal from './Modal';

interface UserJobsModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobs: JobFile[];
    title: string;
    onEdit: (job: JobFile) => void;
    onPreview: (job: JobFile) => void;
    permissions: PermissionSet;
    onCheck: (job: JobFile) => void;
    onApprove: (job: JobFile) => void;
    onReject: (job: JobFile) => void;
    onDelete: (job: JobFile) => void;
}

const UserJobsModal: React.FC<UserJobsModalProps> = ({ isOpen, onClose, jobs, title, onEdit, onPreview, permissions, onCheck, onApprove, onReject, onDelete }) => {
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-5xl">
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {jobs.length > 0 ? jobs.map(job => (
                    <div key={job.id} className="p-3 border rounded-lg flex flex-col sm:flex-row justify-between items-center gap-2">
                        <div>
                            <p className="font-bold">{job.jfn}</p>
                            <p className="text-sm">Shipper: {job.sh} | Consignee: {job.co}</p>
                            <p className="text-xs text-gray-500">Last Updated: {new Date(job.updatedAt).toLocaleString()}</p>
                        </div>
                        <div className="space-x-2 flex-shrink-0">
                             <button onClick={() => onPreview(job)} className="btn btn-secondary text-xs p-2">Preview</button>
                             {permissions.canEditJob && <button onClick={() => { onEdit(job); onClose(); }} className="btn btn-primary text-xs p-2">Load</button>}
                             {permissions.canCheckJob && job.status === 'pending' && <button onClick={() => onCheck(job)} className="btn bg-blue-500 hover:bg-blue-600 text-white text-xs p-2">Check</button>}
                             {permissions.canApproveJob && job.status === 'checked' && <button onClick={() => onApprove(job)} className="btn bg-green-500 hover:bg-green-600 text-white text-xs p-2">Approve</button>}
                             {permissions.canApproveJob && job.status === 'checked' && <button onClick={() => onReject(job)} className="btn bg-orange-500 hover:bg-orange-600 text-white text-xs p-2">Reject</button>}
                             {permissions.canDeleteJob && <button onClick={() => onDelete(job)} className="btn btn-danger text-xs p-2">Delete</button>}
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500">No jobs found for this category.</p>
                )}
            </div>
        </Modal>
    );
};

export default UserJobsModal;

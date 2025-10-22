import React from 'react';
import { JobFile, User } from '../../../types';

interface ActionCenterProps {
    jobFiles: JobFile[];
    currentUser: User;
    onPreviewJob: (job: JobFile) => void;
    onEditJob: (job: JobFile) => void;
}

const ActionItem: React.FC<{job: JobFile, onClick: () => void, actionText: string}> = ({job, onClick, actionText}) => (
    <div className="p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors flex justify-between items-center">
        <div>
            <p className="font-semibold text-primary-700 text-sm">{job.jfn}</p>
            <p className="text-xs text-slate-500">Shipper: {job.sh || 'N/A'}</p>
        </div>
        <button onClick={onClick} className="text-xs font-semibold text-indigo-600 hover:underline">{actionText}</button>
    </div>
);

const ActionCenter: React.FC<ActionCenterProps> = ({ jobFiles, currentUser, onPreviewJob, onEditJob }) => {
    const canCheck = ['admin', 'checker'].includes(currentUser.role);
    
    const needsChecking = canCheck 
        ? jobFiles.filter(j => j.status === 'pending').slice(0, 5)
        : [];
        
    const rejectedForUser = jobFiles.filter(j => j.status === 'rejected' && j.createdBy === currentUser.displayName).slice(0, 5);

    if (needsChecking.length === 0 && rejectedForUser.length === 0) {
        return null; // Don't render if there's nothing to do
    }

    return (
        <div className="card h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Action Center</h3>
            <div className="space-y-4">
                {needsChecking.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm text-slate-600 mb-2">Needs Checking</h4>
                        <div className="space-y-2">
                            {needsChecking.map(job => (
                                <ActionItem key={job.id} job={job} onClick={() => onPreviewJob(job)} actionText="Preview" />
                            ))}
                        </div>
                    </div>
                )}
                {rejectedForUser.length > 0 && (
                     <div>
                        <h4 className="font-semibold text-sm text-slate-600 mb-2">My Rejected Files</h4>
                         <div className="space-y-2">
                            {rejectedForUser.map(job => (
                                <ActionItem key={job.id} job={job} onClick={() => onEditJob(job)} actionText="Edit" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionCenter;

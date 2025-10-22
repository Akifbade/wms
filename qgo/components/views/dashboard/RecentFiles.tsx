import React, { useMemo } from 'react';
import { JobFile, User } from '../../../types';

interface RecentFilesProps {
    jobs: JobFile[];
    onEdit: (job: JobFile) => void;
    onPreview: (job: JobFile) => void;
    currentUser: User;
}

const RecentFiles: React.FC<RecentFilesProps> = ({ jobs, onEdit, onPreview, currentUser }) => {

    const recentJobs = useMemo(() => {
        return jobs
            .filter(j => j.lastUpdatedBy === currentUser.displayName || j.createdBy === currentUser.displayName)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5);
    }, [jobs, currentUser]);

    return (
        <div className="card h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">My Recent Files</h3>
            <div className="space-y-3">
                {recentJobs.length > 0 ? recentJobs.map(job => (
                    <div key={job.id} className="p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-primary-700">{job.jfn}</p>
                                <p className="text-xs text-slate-500">Shipper: {job.sh || 'N/A'}</p>
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => onPreview(job)} className="text-xs font-semibold text-blue-600 hover:underline">Preview</button>
                                <button onClick={() => onEdit(job)} className="text-xs font-semibold text-indigo-600 hover:underline">Load</button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-slate-500 text-center pt-8">You haven't worked on any files recently.</p>
                )}
            </div>
        </div>
    );
};

export default RecentFiles;

import React from 'react';
import { JobFile, User, PermissionSet } from '../../types';
import JobFileList from '../JobFileList';

interface FileManagerViewProps {
    jobs: JobFile[];
    onEdit: (job: JobFile) => void;
    onPreview: (job: JobFile) => void;
    onDelete: (id: string) => void;
    currentUser: User;
    permissions: PermissionSet;
}

const FileManagerView: React.FC<FileManagerViewProps> = ({ jobs, onEdit, onPreview, onDelete, permissions }) => {
    return (
        <div className="card">
            <h2 className="text-xl font-bold mb-4">File Manager</h2>
            <JobFileList 
                jobs={jobs}
                onEdit={onEdit}
                onPreview={onPreview}
                onDelete={onDelete}
                canDelete={permissions.canDeleteJob}
            />
        </div>
    );
};

export default FileManagerView;
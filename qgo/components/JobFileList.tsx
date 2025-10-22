import React, { useState, useMemo } from 'react';
import { JobFile } from '../types';

interface JobFileListProps {
    jobs: JobFile[];
    onEdit: (job: JobFile) => void;
    onPreview: (job: JobFile) => void;
    onDelete: (id: string) => void;
    canDelete: boolean;
}

const JobFileList: React.FC<JobFileListProps> = ({ jobs, onEdit, onPreview, onDelete, canDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchLower || 
                job.jfn.toLowerCase().includes(searchLower) ||
                job.sh.toLowerCase().includes(searchLower) ||
                job.co.toLowerCase().includes(searchLower);
            
            const matchesStatus = !statusFilter || job.status === statusFilter;

            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }, [jobs, searchTerm, statusFilter]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="md:col-span-2">
                    <label htmlFor="search-bar" className="text-sm font-medium text-gray-700">Search</label>
                    <input 
                        type="text" 
                        id="search-bar" 
                        className="input-field mt-1" 
                        placeholder="Job No, Shipper, etc."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="filter-status" className="text-sm font-medium text-gray-700">Status</label>
                    <select 
                        id="filter-status" 
                        className="input-field mt-1"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="checked">Checked</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow max-h-[60vh] overflow-y-auto">
                {filteredJobs.length > 0 ? (
                    <table className="w-full whitespace-nowrap">
                        <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredJobs.map(job => (
                                <tr key={job.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-indigo-700">{job.jfn}</div>
                                        <div className="text-sm text-gray-600">Shipper: {job.sh || 'N/A'}</div>
                                        <div className="text-sm text-gray-600">Consignee: {job.co || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            job.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            job.status === 'checked' ? 'bg-blue-100 text-blue-800' :
                                            job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                                        <button onClick={() => onPreview(job)} className="text-blue-600 hover:text-blue-900 font-medium">Preview</button>
                                        <button onClick={() => onEdit(job)} className="text-indigo-600 hover:text-indigo-900 font-medium">Load</button>
                                        {canDelete && (
                                            <button onClick={() => onDelete(job.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-16">
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No job files found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobFileList;
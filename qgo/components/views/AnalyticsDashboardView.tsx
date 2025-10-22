import React from 'react';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard';
import { JobFile, User } from '../../types';

interface AnalyticsDashboardViewProps {
    jobFiles: JobFile[];
    onLoadJob: (job: JobFile) => void;
    onPreview: (job: JobFile) => void;
    setJobToDelete: (job: JobFile | null) => void;
    currentUser: User;
    onViewJobs: (title: string, jobs: JobFile[]) => void;
}

const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = (props) => {
    // This component serves as a wrapper for the main analytics dashboard,
    // fitting it into the new view-based application structure.
    return (
         <div className="card">
            <AnalyticsDashboard
                jobFiles={props.jobFiles}
                onLoadJob={props.onLoadJob}
                onPreview={props.onPreview}
                setJobToDelete={props.setJobToDelete}
                currentUser={props.currentUser}
                onViewJobs={props.onViewJobs}
            />
        </div>
    );
};

export default AnalyticsDashboardView;
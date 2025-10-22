import React from 'react';
import { JobFile, User } from '../../types';
import KPICards from './dashboard/StatusSummary';
import RecentFiles from './dashboard/RecentFiles';
import DashboardCharts from './dashboard/DashboardChart';
import ActionCenter from './dashboard/ActionCenter';
import DeliveryActivity from './dashboard/DeliveryActivity';

interface DashboardViewProps {
    jobFiles: JobFile[];
    onViewJobs: (title: string, jobs: JobFile[]) => void;
    onEditJob: (job: JobFile) => void;
    onPreviewJob: (job: JobFile) => void;
    currentUser: User;
    onViewDeliveryDetails: (job: JobFile) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ jobFiles, onViewJobs, onEditJob, onPreviewJob, currentUser, onViewDeliveryDetails }) => {
    return (
        <div className="space-y-6">
            <div className="animate-fade-in-up">
                <KPICards jobFiles={jobFiles} onViewJobs={onViewJobs} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <DashboardCharts jobFiles={jobFiles} onViewJobs={onViewJobs} />
                </div>
                <div className="space-y-6">
                    <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                       <ActionCenter jobFiles={jobFiles} onPreviewJob={onPreviewJob} onEditJob={onEditJob} currentUser={currentUser} />
                    </div>
                    <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <DeliveryActivity jobs={jobFiles} onViewDelivery={onViewDeliveryDetails} />
                    </div>
                     <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        <RecentFiles jobs={jobFiles} onEdit={onEditJob} onPreview={onPreviewJob} currentUser={currentUser} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
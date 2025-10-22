import React, { useMemo } from 'react';
import { JobFile } from '../../../types';
import { TruckIcon, CheckCircleIcon } from '../../Icons';

interface DeliveryActivityProps {
    jobs: JobFile[];
    onViewDelivery: (job: JobFile) => void;
}

type Activity = {
    job: JobFile;
    timestamp: string;
    type: 'assigned' | 'completed';
};

const DeliveryActivity: React.FC<DeliveryActivityProps> = ({ jobs, onViewDelivery }) => {

    const recentActivity = useMemo(() => {
        const activities: Activity[] = [];
        jobs.forEach(job => {
            if (job.deliveryAssignedAt) {
                activities.push({ job, timestamp: job.deliveryAssignedAt, type: 'assigned' });
            }
            if (job.completedAt) {
                activities.push({ job, timestamp: job.completedAt, type: 'completed' });
            }
        });

        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }, [jobs]);
    
    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "m ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }

    return (
        <div className="card h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Deliveries</h3>
            <div className="space-y-3">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                    <button key={`${activity.job.id}-${activity.type}-${index}`} onClick={() => onViewDelivery(activity.job)} className="w-full text-left p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors flex items-start gap-3">
                        <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${activity.type === 'assigned' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {activity.type === 'assigned' ? <TruckIcon /> : <CheckCircleIcon />}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-700 text-sm">
                                {activity.type === 'assigned' ? 'POD Assigned' : 'Delivery Completed'}
                                <span className="text-primary-600 ml-2">{activity.job.jfn}</span>
                            </p>
                            <p className="text-xs text-slate-500">
                                {activity.type === 'assigned' 
                                    ? `To: ${activity.job.driverName}`
                                    : `By: ${activity.job.driverName}`
                                }
                                <span className="mx-1">•</span>
                                {timeAgo(activity.timestamp)}
                            </p>
                        </div>
                    </button>
                )) : (
                    <p className="text-sm text-slate-500 text-center pt-8">No recent delivery activity.</p>
                )}
            </div>
        </div>
    );
};

export default DeliveryActivity;
import React, { useMemo } from 'react';
import { JobFile, User, Feedback } from '../../types';

interface DriverDashboardViewProps {
    jobs: JobFile[];
    currentUser: User;
    feedback: Feedback[];
    onCompleteDelivery: (job: JobFile) => void;
    onViewReceipt: (job: JobFile) => void;
    onViewFeedback: () => void;
    isStandalone?: boolean;
    onLogout?: () => void;
}

const DriverDashboardView: React.FC<DriverDashboardViewProps> = ({ jobs, currentUser, feedback, onCompleteDelivery, onViewReceipt, onViewFeedback, isStandalone = false, onLogout }) => {
    
    const { myJobs, performance } = useMemo(() => {
        const filteredJobs = jobs.filter(job => job.driverUid === currentUser.uid && job.deliveryAssigned);
        
        const myFeedback = feedback.filter(f => f.driverUid === currentUser.uid);
        const totalRatings = myFeedback.length;
        const averageRating = totalRatings > 0 ? (myFeedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings) : 0;
        const starRating = '★'.repeat(Math.round(averageRating)) + '☆'.repeat(5 - Math.round(averageRating));

        const completed = filteredJobs.filter(j => j.deliveryStatus === 'Delivered').length;
        const pending = filteredJobs.filter(j => j.deliveryStatus === 'Pending').length;

        const sortedJobs = filteredJobs.sort((a,b) => {
            if (a.deliveryStatus === 'Pending' && b.deliveryStatus !== 'Pending') return -1;
            if (a.deliveryStatus !== 'Pending' && b.deliveryStatus === 'Pending') return 1;
            return new Date(b.deliveryAssignedAt || 0).getTime() - new Date(a.deliveryAssignedAt || 0).getTime();
        });

        return {
            myJobs: sortedJobs,
            performance: { averageRating, totalRatings, starRating, completed, pending }
        };
    }, [jobs, currentUser.uid, feedback]);
    
    const StandaloneWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
        isStandalone ? (
            <div className="p-6 h-full flex flex-col">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Driver Dashboard</h1>
                        <p className="text-sm text-slate-500">Welcome, {currentUser.displayName}</p>
                    </div>
                    {onLogout && <button onClick={onLogout} className="btn btn-danger">Logout</button>}
                </header>
                <div className="flex-grow card">{children}</div>
            </div>
        ) : (
            <div className="card">{children}</div>
        )
    );
    
    return (
        <StandaloneWrapper>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold text-gray-800">My Dashboard</h2>
                <button onClick={onViewFeedback} className="btn btn-primary text-sm mt-3 sm:mt-0">My Feedback & Ratings</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                <div className="bg-yellow-100 p-4 rounded-lg" title={`Average Rating: ${performance.averageRating.toFixed(2)} (${performance.totalRatings} ratings)`}>
                    <p className="text-sm text-yellow-800">My Average Rating</p>
                    <p className="text-3xl font-bold text-yellow-500 mt-1">{performance.starRating}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-sm text-green-800">Completed Deliveries</p>
                    <p className="text-3xl font-bold text-green-900">{performance.completed}</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">Pending Deliveries</p>
                    <p className="text-3xl font-bold text-blue-900">{performance.pending}</p>
                </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-4">My Assigned Deliveries</h3>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {myJobs.length > 0 ? myJobs.map(job => (
                    <div key={job.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50">
                        <div>
                            <p className="font-bold text-lg text-primary-700">{job.jfn}</p>
                            <p className="text-sm"><span className="font-semibold">To:</span> {job.deliveryLocation}</p>
                            <p className="text-xs text-slate-500">Assigned: {new Date(job.deliveryAssignedAt || 0).toLocaleString()}</p>
                        </div>
                        {job.deliveryStatus === 'Pending' && (
                            <button className="btn btn-primary w-full sm:w-auto" onClick={() => onCompleteDelivery(job)}>
                                Complete Delivery
                            </button>
                        )}
                        {job.deliveryStatus === 'Delivered' && (
                            <button className="btn btn-secondary w-full sm:w-auto" onClick={() => onViewReceipt(job)}>
                                View Receipt
                            </button>
                        )}
                    </div>
                )) : (
                    <p className="text-center text-slate-500 py-8">No active deliveries assigned.</p>
                )}
            </div>
        </StandaloneWrapper>
    );
};

export default DriverDashboardView;
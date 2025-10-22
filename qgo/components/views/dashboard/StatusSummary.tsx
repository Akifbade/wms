import React, { useMemo } from 'react';
import { JobFile } from '../../../types';
import AnimatedNumber from '../../AnimatedNumber';
import { TruckIcon, CheckCircleIcon } from '../../Icons';

interface KPICardsProps {
    jobFiles: JobFile[];
    onViewJobs: (title: string, jobs: JobFile[]) => void;
}

const KPICard: React.FC<{
    title: string;
    value: number;
    decimals?: number;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}> = ({ title, value, decimals = 0, icon, color, onClick }) => {
    const cardClasses = `p-4 rounded-lg shadow-sm border-l-4 ${color} cursor-pointer hover:scale-105 hover:shadow-md transition-all w-full text-left`;
    
    return (
        <button onClick={onClick} className={cardClasses}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                        <AnimatedNumber value={value} decimals={decimals} />
                    </p>
                </div>
                <div className="text-slate-400">{icon}</div>
            </div>
        </button>
    );
};

const KPICards: React.FC<KPICardsProps> = ({ jobFiles, onViewJobs }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const totalProfit = jobFiles.reduce((sum, job) => sum + (job.totalProfit || 0), 0);
        const totalRevenue = jobFiles.reduce((sum, job) => sum + (job.totalSelling || 0), 0);
        
        const jobsThisMonthList = jobFiles.filter(job => new Date(job.d) >= firstDayOfMonth);
        
        const pendingJobsList = jobFiles.filter(job => job.status === 'pending');
        const checkedJobsList = jobFiles.filter(job => job.status === 'checked');
        const approvedJobsList = jobFiles.filter(job => job.status === 'approved');

        const pendingDeliveriesList = jobFiles.filter(job => job.deliveryAssigned && job.deliveryStatus === 'Pending');
        const deliveriesThisMonthList = jobFiles.filter(job => 
            job.deliveryStatus === 'Delivered' && 
            job.completedAt && 
            new Date(job.completedAt) >= firstDayOfMonth
        );
        
        return { 
            totalProfit, 
            totalRevenue,
            jobsThisMonthList,
            pendingJobsList,
            checkedJobsList,
            approvedJobsList,
            pendingDeliveriesList,
            deliveriesThisMonthList,
        };
    }, [jobFiles]);
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <KPICard 
                title="Total Profit (KD)" 
                value={stats.totalProfit}
                decimals={3}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                color="border-green-500 bg-green-50"
                onClick={() => onViewJobs('All Job Files (Total Profit)', jobFiles)}
            />
             <KPICard 
                title="Total Revenue (KD)" 
                value={stats.totalRevenue}
                decimals={3}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                color="border-blue-500 bg-blue-50"
                onClick={() => onViewJobs('All Job Files (Total Revenue)', jobFiles)}
            />
            <KPICard 
                title="Jobs This Month" 
                value={stats.jobsThisMonthList.length}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                color="border-sky-500 bg-sky-50"
                onClick={() => onViewJobs('Jobs This Month', stats.jobsThisMonthList)}
            />
            <KPICard 
                title="Deliveries This Month" 
                value={stats.deliveriesThisMonthList.length}
                icon={<CheckCircleIcon />}
                color="border-teal-500 bg-teal-50"
                onClick={() => onViewJobs('Deliveries This Month', stats.deliveriesThisMonthList)}
            />
             <KPICard 
                title="Pending Jobs" 
                value={stats.pendingJobsList.length}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                color="border-yellow-500 bg-yellow-50"
                onClick={() => onViewJobs('Pending Jobs', stats.pendingJobsList)}
            />
            <KPICard 
                title="Checked Jobs" 
                value={stats.checkedJobsList.length}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                color="border-indigo-500 bg-indigo-50"
                onClick={() => onViewJobs('Checked Jobs', stats.checkedJobsList)}
            />
             <KPICard 
                title="Approved Jobs" 
                value={stats.approvedJobsList.length}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                color="border-lime-500 bg-lime-50"
                onClick={() => onViewJobs('Approved Jobs', stats.approvedJobsList)}
            />
            <KPICard 
                title="Pending Deliveries" 
                value={stats.pendingDeliveriesList.length}
                icon={<TruckIcon />}
                color="border-orange-500 bg-orange-50"
                onClick={() => onViewJobs('Pending Deliveries', stats.pendingDeliveriesList)}
            />
        </div>
    );
};

export default KPICards;
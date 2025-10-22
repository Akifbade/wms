
import React, { useMemo, useRef, useEffect } from 'react';
import { JobFile, User, Feedback } from '../../types';
import Modal from './Modal';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface DriverPerformanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobs: JobFile[];
    users: User[];
    feedback: Feedback[];
    onViewJobs: (title: string, jobs: JobFile[]) => void;
    onViewFeedback: (driverId: string) => void;
}

const DriverPerformanceModal: React.FC<DriverPerformanceModalProps> = ({ isOpen, onClose, jobs, users, feedback, onViewJobs, onViewFeedback }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    const driverStats = useMemo(() => {
        const drivers = users.filter(u => u.role === 'driver');
        return drivers.map(driver => {
            const driverJobs = jobs.filter(j => j.driverUid === driver.uid);
            const driverFeedback = feedback.filter(f => f.driverUid === driver.uid);
            
            const completed = driverJobs.filter(j => j.deliveryStatus === 'Delivered').length;
            const pending = driverJobs.filter(j => j.deliveryStatus === 'Pending').length;
            const totalRatings = driverFeedback.length;
            const averageRating = totalRatings > 0 ? driverFeedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings : 0;
            const starRating = '★'.repeat(Math.round(averageRating)) + '☆'.repeat(5 - Math.round(averageRating));

            return { ...driver, completed, pending, averageRating, totalRatings, starRating, jobs: driverJobs };
        }).sort((a,b) => b.completed - a.completed);
    }, [users, jobs, feedback]);

    useEffect(() => {
        if (isOpen && chartRef.current && driverStats.length > 0) {
            if(chartInstance.current) chartInstance.current.destroy();

            const chartLabels = driverStats.map(d => d.displayName);
            const chartData = driverStats.map(d => d.completed);

            chartInstance.current = new Chart(chartRef.current, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Completed Deliveries',
                        data: chartData,
                        backgroundColor: 'rgba(79, 184, 175, 0.6)',
                        borderColor: 'rgba(79, 184, 175, 1)',
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }
         return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        }
    }, [isOpen, driverStats]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Driver Performance Dashboard" maxWidth="max-w-4xl">
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg"><canvas ref={chartRef}></canvas></div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                     {driverStats.map(stat => (
                        <div key={stat.uid} className="p-4 border rounded-lg bg-white grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="md:col-span-1">
                                <p className="font-bold text-lg">{stat.displayName}</p>
                                <p className="text-sm text-gray-600">{stat.email}</p>
                            </div>
                            <div className="md:col-span-2 flex flex-wrap justify-center items-center gap-4 text-center">
                                <div title={`Avg: ${stat.averageRating.toFixed(2)}`}>
                                    <p className="text-2xl text-yellow-500">{stat.starRating}</p>
                                    <p className="text-xs">{stat.totalRatings} ratings</p>
                                </div>
                                <div><p className="text-2xl font-bold text-green-600">{stat.completed}</p><p className="text-xs">Completed</p></div>
                                <div><p className="text-2xl font-bold text-yellow-600">{stat.pending}</p><p className="text-xs">Pending</p></div>
                            </div>
                             <div className="md:col-span-1 flex justify-center md:justify-end gap-2">
                                <button onClick={() => onViewFeedback(stat.uid)} className="btn btn-primary btn-xs">Feedback</button>
                                <button onClick={() => onViewJobs(`Deliveries for ${stat.displayName}`, stat.jobs)} className="btn btn-secondary btn-xs">Deliveries</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default DriverPerformanceModal;

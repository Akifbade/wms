import React, { useEffect, useRef, useState, useMemo } from 'react';
import { JobFile } from '../../../types';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface DashboardChartsProps {
    jobFiles: JobFile[];
    onViewJobs: (title: string, jobs: JobFile[]) => void;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ jobFiles, onViewJobs }) => {
    const profitChartRef = useRef<HTMLCanvasElement>(null);
    const statusChartRef = useRef<HTMLCanvasElement>(null);
    const profitChartInstanceRef = useRef<Chart | null>(null);
    const statusChartInstanceRef = useRef<Chart | null>(null);
    const [activeTab, setActiveTab] = useState<'profit' | 'status'>('profit');

    const profitData = useMemo(() => {
        const monthlyData: Record<string, number> = {};
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

        jobFiles.forEach(job => {
            const date = new Date(job.bd || job.d);
            if (date >= sixMonthsAgo) {
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (job.totalProfit || 0);
            }
        });

        const labels: string[] = [];
        const data: number[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'short' });
            labels.push(monthName);
            data.push(monthlyData[monthKey] || 0);
        }
        return { labels, data };
    }, [jobFiles]);

    const statusData = useMemo(() => {
        const counts = jobFiles.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {} as Record<JobFile['status'], number>);
        
        const labels = ['Approved', 'Rejected', 'Checked', 'Pending'];
        const data = [counts.approved || 0, counts.rejected || 0, counts.checked || 0, counts.pending || 0];
        const colors = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B'];
        const statuses: JobFile['status'][] = ['approved', 'rejected', 'checked', 'pending'];

        return { labels, data, colors, statuses };
    }, [jobFiles]);

    useEffect(() => {
        if (activeTab === 'profit' && profitChartRef.current) {
            if (profitChartInstanceRef.current) profitChartInstanceRef.current.destroy();
            profitChartInstanceRef.current = new Chart(profitChartRef.current, {
                type: 'bar',
                data: {
                    labels: profitData.labels,
                    datasets: [{
                        label: 'Monthly Profit (KD)',
                        data: profitData.data,
                        backgroundColor: 'rgba(79, 70, 229, 0.6)',
                        borderColor: 'rgba(79, 70, 229, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
        return () => { if(profitChartInstanceRef.current) profitChartInstanceRef.current.destroy(); };
    }, [activeTab, profitData]);

    useEffect(() => {
        if (activeTab === 'status' && statusChartRef.current) {
            if (statusChartInstanceRef.current) statusChartInstanceRef.current.destroy();
            statusChartInstanceRef.current = new Chart(statusChartRef.current, {
                type: 'doughnut',
                data: {
                    labels: statusData.labels,
                    datasets: [{
                        data: statusData.data,
                        backgroundColor: statusData.colors,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const status = statusData.statuses[index];
                            const jobs = jobFiles.filter(j => j.status === status);
                            onViewJobs(`'${statusData.labels[index]}' Job Files`, jobs);
                        }
                    },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
        return () => { if(statusChartInstanceRef.current) statusChartInstanceRef.current.destroy(); };
    }, [activeTab, statusData, jobFiles, onViewJobs]);

    const TabButton: React.FC<{ label: string; tabName: 'profit' | 'status' }> = ({ label, tabName }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabName ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="card h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Overview</h3>
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                    <TabButton label="Profit Trend" tabName="profit" />
                    <TabButton label="Status Breakdown" tabName="status" />
                </div>
            </div>
            <div className="flex-grow relative min-h-[250px] sm:min-h-[300px]">
                <div style={{ display: activeTab === 'profit' ? 'block' : 'none', height: '100%' }}>
                    <canvas ref={profitChartRef}></canvas>
                </div>
                <div style={{ display: activeTab === 'status' ? 'block' : 'none', height: '100%' }}>
                    <canvas ref={statusChartRef}></canvas>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;

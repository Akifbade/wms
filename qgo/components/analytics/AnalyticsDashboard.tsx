import React, { useMemo, useState, useEffect, useRef } from 'react';
import { JobFile, User } from '../../types';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);


interface AnalyticsDashboardProps {
    jobFiles: JobFile[];
    onLoadJob: (job: JobFile) => void;
    onPreview: (job: JobFile) => void;
    setJobToDelete: (job: JobFile | null) => void;
    currentUser: User;
    onViewJobs: (title: string, jobs: JobFile[]) => void;
}

const SortableHeader: React.FC<{
    title: string;
    column: string;
    sortConfig: { column: string; direction: 'asc' | 'desc' };
    onSort: (column: string) => void;
}> = ({ title, column, sortConfig, onSort }) => (
    <th onClick={() => onSort(column)} className="p-2 text-left font-semibold cursor-pointer select-none">
        {title}
        {sortConfig.column === column && (
            <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
        )}
    </th>
);


const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ jobFiles, onViewJobs }) => {
    
    const [timeframeFilter, setTimeframeFilter] = useState('all');
    const [dateType, setDateType] = useState<'opening' | 'billing'>('opening');
    const [monthSort, setMonthSort] = useState({ column: 'month', direction: 'asc' as 'asc' | 'desc' });
    const barChartRef = useRef<HTMLCanvasElement>(null);
    const pieChartRef = useRef<HTMLCanvasElement>(null);
    const barChartInstance = useRef<Chart | null>(null);
    const pieChartInstance = useRef<Chart | null>(null);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        jobFiles.forEach(job => {
            const dateString = dateType === 'billing' ? job.billingDate : (job.bd || job.d);
            if (dateString) {
                const monthKey = dateString.substring(0, 7);
                months.add(monthKey);
            }
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a)); // Sort descending
    }, [jobFiles, dateType]);

    const filteredJobFiles = useMemo(() => {
        if (timeframeFilter === 'all') {
            return jobFiles;
        }
        return jobFiles.filter(job => {
            const dateString = dateType === 'billing' ? job.billingDate : (job.bd || job.d);
            const monthKey = dateString?.substring(0, 7);
            return monthKey === timeframeFilter;
        });
    }, [jobFiles, timeframeFilter, dateType]);

    const analyticsData = useMemo(() => {
        if (!filteredJobFiles) return null;

        const totalJobs = filteredJobFiles.length;
        const totalProfit = filteredJobFiles.reduce((acc, job) => acc + (job.totalProfit || 0), 0);
        const avgProfit = totalJobs > 0 ? totalProfit / totalJobs : 0;

        const jobsBySalesman: { [key: string]: { profit: number; count: number; jobs: JobFile[] } } = {};
        const jobsByUser: { [key: string]: { profit: number; count: number; jobs: JobFile[] } } = {};
        const jobsByShipper: { [key: string]: { profit: number; count: number; jobs: JobFile[] } } = {};
        const jobsByConsignee: { [key: string]: { profit: number; count: number; jobs: JobFile[] } } = {};
        const profitByMonth: { [key: string]: { profit: number; count: number; jobs: JobFile[] } } = {};

        filteredJobFiles.forEach(job => {
            const salesman = job.sm || 'Unassigned';
            if (!jobsBySalesman[salesman]) jobsBySalesman[salesman] = { profit: 0, count: 0, jobs: [] };
            jobsBySalesman[salesman].profit += job.totalProfit || 0;
            jobsBySalesman[salesman].count++;
            jobsBySalesman[salesman].jobs.push(job);

            const user = job.createdBy || 'Unknown';
            if (!jobsByUser[user]) jobsByUser[user] = { profit: 0, count: 0, jobs: [] };
            jobsByUser[user].profit += job.totalProfit || 0;
            jobsByUser[user].count++;
            jobsByUser[user].jobs.push(job);
            
            if(job.sh) {
                if (!jobsByShipper[job.sh]) jobsByShipper[job.sh] = { profit: 0, count: 0, jobs: [] };
                jobsByShipper[job.sh].profit += job.totalProfit || 0;
                jobsByShipper[job.sh].count++;
                jobsByShipper[job.sh].jobs.push(job);
            }

            if(job.co) {
                 if (!jobsByConsignee[job.co]) jobsByConsignee[job.co] = { profit: 0, count: 0, jobs: [] };
                jobsByConsignee[job.co].profit += job.totalProfit || 0;
                jobsByConsignee[job.co].count++;
                jobsByConsignee[job.co].jobs.push(job);
            }

            const dateString = dateType === 'billing' ? job.billingDate : (job.bd || job.d);
            if(dateString) {
                const monthKey = dateString.substring(0, 7);
                 if (!profitByMonth[monthKey]) profitByMonth[monthKey] = { profit: 0, count: 0, jobs: [] };
                 profitByMonth[monthKey].profit += job.totalProfit || 0;
                 profitByMonth[monthKey].count++;
                 profitByMonth[monthKey].jobs.push(job);
            }
        });

        const topSalesmen = Object.entries(jobsBySalesman).sort((a, b) => b[1].profit - a[1].profit);
        const topUsers = Object.entries(jobsByUser).sort((a, b) => b[1].profit - a[1].profit);
        const topShippers = Object.entries(jobsByShipper).sort((a, b) => b[1].profit - a[1].profit).slice(0, 10);
        const topConsignees = Object.entries(jobsByConsignee).sort((a, b) => b[1].profit - a[1].profit).slice(0, 10);
        
        const monthlyProfit = Object.entries(profitByMonth).sort((a, b) => {
            const valA = monthSort.column === 'month' ? a[0] : a[1][monthSort.column as keyof typeof a[1]];
            const valB = monthSort.column === 'month' ? b[0] : b[1][monthSort.column as keyof typeof b[1]];

            if (valA < valB) return monthSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return monthSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return { totalJobs, totalProfit, avgProfit, topSalesmen, topUsers, topShippers, topConsignees, monthlyProfit };
    }, [filteredJobFiles, monthSort, dateType]);

     useEffect(() => {
        if (!analyticsData || !barChartRef.current || !pieChartRef.current) return;

        // --- Bar Chart: Monthly Profit ---
        if (barChartInstance.current) barChartInstance.current.destroy();
        const monthlyProfitSorted = [...analyticsData.monthlyProfit].sort((a,b) => a[0].localeCompare(b[0]));
        barChartInstance.current = new Chart(barChartRef.current, {
            type: 'bar',
            data: {
                labels: monthlyProfitSorted.map(item => item[0]),
                datasets: [{
                    label: 'Total Profit (KD)',
                    data: monthlyProfitSorted.map(item => item[1].profit),
                    backgroundColor: 'rgba(79, 70, 229, 0.6)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // --- Pie Chart: Salesman Profit ---
        if (pieChartInstance.current) pieChartInstance.current.destroy();
        const topSalesmenForChart = analyticsData.topSalesmen.slice(0, 5);
        const otherProfit = analyticsData.topSalesmen.slice(5).reduce((acc, curr) => acc + curr[1].profit, 0);
        const pieLabels = topSalesmenForChart.map(item => item[0]);
        const pieData = topSalesmenForChart.map(item => item[1].profit);
        if (otherProfit > 0) {
            pieLabels.push('Others');
            pieData.push(otherProfit);
        }

        pieChartInstance.current = new Chart(pieChartRef.current, {
            type: 'pie',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: ['#4f46e5', '#34d399', '#f59e0b', '#60a5fa', '#ef4444', '#a855f7'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });

        return () => {
            if (barChartInstance.current) barChartInstance.current.destroy();
            if (pieChartInstance.current) pieChartInstance.current.destroy();
        }
    }, [analyticsData]);

    const handleMonthSort = (column: string) => {
        setMonthSort(prev => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const renderTable = (headers: React.ReactNode[], rows: (string | number)[][], actions?: { title: string, jobs: JobFile[] }[]) => (
        <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                    <tr>{headers}</tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b hover:bg-slate-50">
                            {row.map((cell, cellIndex) => <td key={cellIndex} className="p-2">{cell}</td>)}
                            {actions && actions[rowIndex] && (
                                <td className="p-2 text-right">
                                    <button onClick={() => onViewJobs(actions[rowIndex].title, actions[rowIndex].jobs)} className="text-xs btn bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-2">View</button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    if (!analyticsData) return <div>Loading analytics...</div>;

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                 <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h2>
                    <div className="flex items-center gap-2 text-sm p-1 bg-slate-100 rounded-md">
                        <span className="font-semibold">Date Basis:</span>
                        <label className="cursor-pointer p-1 rounded-md transition-colors hover:bg-slate-200"><input type="radio" name="dateType" value="opening" checked={dateType === 'opening'} onChange={() => setDateType('opening')} className="mr-1" />Opening</label>
                        <label className="cursor-pointer p-1 rounded-md transition-colors hover:bg-slate-200"><input type="radio" name="dateType" value="billing" checked={dateType === 'billing'} onChange={() => setDateType('billing')} className="mr-1" />Billing</label>
                    </div>
                </div>
                <div>
                    <label htmlFor="timeframe-filter" className="text-sm font-medium mr-2">Filter by Month:</label>
                    <select
                        id="timeframe-filter"
                        value={timeframeFilter}
                        onChange={e => setTimeframeFilter(e.target.value)}
                        className="input-field w-48"
                    >
                        <option value="all">All Time</option>
                        {availableMonths.map(month => (
                            <option key={month} value={month}>{month}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center p-4"><p className="text-sm text-slate-500">Total Job Files</p><p className="text-2xl font-bold">{analyticsData.totalJobs}</p></div>
                <div className="card text-center p-4"><p className="text-sm text-slate-500">Total Profit (KD)</p><p className="text-2xl font-bold text-green-600">{analyticsData.totalProfit.toFixed(3)}</p></div>
                <div className="card text-center p-4"><p className="text-sm text-slate-500">Avg. Profit / Job (KD)</p><p className="text-2xl font-bold">{analyticsData.avgProfit.toFixed(3)}</p></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="card lg:col-span-3"><h3 className="text-lg font-bold mb-4">Profit Over Time</h3><div className="h-64"><canvas ref={barChartRef}></canvas></div></div>
                <div className="card lg:col-span-2"><h3 className="text-lg font-bold mb-4">Profit Distribution by Salesman</h3><div className="h-64"><canvas ref={pieChartRef}></canvas></div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card"><h3 className="text-lg font-bold mb-4">Top Salesmen by Profit</h3>
                    {renderTable([<th className="p-2 text-left font-semibold">Salesman</th>, <th className="p-2 text-left font-semibold">Files</th>, <th className="p-2 text-left font-semibold">Profit (KD)</th>],
                        analyticsData.topSalesmen.map(([name, data]) => [name, data.count, data.profit.toFixed(3)]),
                        analyticsData.topSalesmen.map(([name, data]) => ({ title: `Jobs for ${name}`, jobs: data.jobs }))
                    )}
                </div>
                <div className="card"><h3 className="text-lg font-bold mb-4">Top Users by Profit</h3>
                    {renderTable([<th className="p-2 text-left font-semibold">User</th>, <th className="p-2 text-left font-semibold">Files Created</th>, <th className="p-2 text-left font-semibold">Profit (KD)</th>],
                        analyticsData.topUsers.map(([name, data]) => [name, data.count, data.profit.toFixed(3)]),
                        analyticsData.topUsers.map(([name, data]) => ({ title: `Jobs by ${name}`, jobs: data.jobs }))
                    )}
                </div>
                <div className="card"><h3 className="text-lg font-bold mb-4">Top Profitable Shippers</h3>
                    {renderTable([<th className="p-2 text-left font-semibold">Shipper</th>, <th className="p-2 text-left font-semibold">Total Profit (KD)</th>],
                        analyticsData.topShippers.map(([name, data]) => [name, data.profit.toFixed(3)]),
                        analyticsData.topShippers.map(([name, data]) => ({ title: `Jobs for ${name}`, jobs: data.jobs }))
                    )}
                </div>
                <div className="card"><h3 className="text-lg font-bold mb-4">Top Profitable Consignees</h3>
                     {renderTable([<th className="p-2 text-left font-semibold">Consignee</th>, <th className="p-2 text-left font-semibold">Total Profit (KD)</th>],
                        analyticsData.topConsignees.map(([name, data]) => [name, data.profit.toFixed(3)]),
                        analyticsData.topConsignees.map(([name, data]) => ({ title: `Jobs for ${name}`, jobs: data.jobs }))
                    )}
                </div>
                 <div className="card lg:col-span-2"><h3 className="text-lg font-bold mb-4">Profit by Month</h3>
                    {renderTable([
                        <SortableHeader title="Month" column="month" sortConfig={monthSort} onSort={handleMonthSort} />,
                        <SortableHeader title="Jobs" column="count" sortConfig={monthSort} onSort={handleMonthSort} />,
                        <SortableHeader title="Profit (KD)" column="profit" sortConfig={monthSort} onSort={handleMonthSort} />,
                    ],
                        analyticsData.monthlyProfit.map(([month, data]) => [month, data.count, data.profit.toFixed(3)]),
                        analyticsData.monthlyProfit.map(([month, data]) => ({ title: `Jobs in ${month}`, jobs: data.jobs }))
                    )}
                </div>
            </div>
        </div>
    );
}

export default AnalyticsDashboard;
import React, { useState } from 'react';
import { Download, Calendar } from 'lucide-react';

interface MonthlyReportProps {
  jobs: any[];
}

const MonthlyJobsReport: React.FC<MonthlyReportProps> = ({ jobs }) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const filterJobsByMonth = () => {
    return jobs.filter(job => {
      const jobDate = new Date(job.jobDate || job.createdAt);
      const jobMonth = jobDate.toISOString().slice(0, 7);
      return jobMonth === selectedMonth;
    });
  };

  const calculateMonthlyStats = () => {
    const monthJobs = filterJobsByMonth();
    
    const totalRevenue = monthJobs.reduce((sum, job) => {
      return sum + (parseFloat(job.totalCost) || 0);
    }, 0);

    const byStatus = {
      COMPLETED: monthJobs.filter(j => j.status === 'COMPLETED').length,
      IN_PROGRESS: monthJobs.filter(j => j.status === 'IN_PROGRESS').length,
      SCHEDULED: monthJobs.filter(j => j.status === 'SCHEDULED' || j.status === 'PLANNED').length,
      CANCELLED: monthJobs.filter(j => j.status === 'CANCELLED').length,
    };

    return {
      total: monthJobs.length,
      revenue: totalRevenue,
      byStatus,
      jobs: monthJobs
    };
  };

  const downloadReport = () => {
    const stats = calculateMonthlyStats();
    const [year, month] = selectedMonth.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;

    // Create CSV content
    let csv = `Monthly Moving Jobs Report - ${monthName}\n\n`;
    csv += `Summary\n`;
    csv += `Total Jobs,${stats.total}\n`;
    csv += `Total Revenue,${stats.revenue.toFixed(3)} KWD\n`;
    csv += `Completed,${stats.byStatus.COMPLETED}\n`;
    csv += `In Progress,${stats.byStatus.IN_PROGRESS}\n`;
    csv += `Scheduled,${stats.byStatus.SCHEDULED}\n`;
    csv += `Cancelled,${stats.byStatus.CANCELLED}\n\n`;

    // Jobs details
    csv += `Job Details\n`;
    csv += `Job Code,Title,Client,Date,Status,From,To,Cost (KWD)\n`;
    
    stats.jobs.forEach(job => {
      const jobDate = new Date(job.jobDate || job.createdAt);
      const dateStr = `${jobDate.getDate()}/${jobDate.getMonth() + 1}/${jobDate.getFullYear()}`;
      
      csv += `${job.jobCode || ''},`;
      csv += `"${(job.jobTitle || job.title || '').replace(/"/g, '""')}",`;
      csv += `"${(job.clientName || '').replace(/"/g, '""')}",`;
      csv += `${dateStr},`;
      csv += `${job.status || ''},`;
      csv += `"${(job.jobAddress || job.fromAddress || '').replace(/"/g, '""')}",`;
      csv += `"${(job.dropoffAddress || job.toAddress || '').replace(/"/g, '""')}",`;
      csv += `${parseFloat(job.totalCost || 0).toFixed(3)}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `moving-jobs-report-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = calculateMonthlyStats();
  const [year, month] = selectedMonth.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">Monthly Report</h2>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            max={currentMonth}
            className="px-3 py-2 border rounded-lg"
          />
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.byStatus.COMPLETED}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.byStatus.IN_PROGRESS}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Revenue</p>
          <p className="text-2xl font-bold text-purple-600">{stats.revenue.toFixed(3)} KWD</p>
        </div>
      </div>

      {/* Jobs Table */}
      {stats.jobs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.jobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{job.jobCode}</td>
                  <td className="px-4 py-3 text-sm">{job.clientName}</td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      const d = new Date(job.jobDate || job.createdAt);
                      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      job.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {parseFloat(job.totalCost || 0).toFixed(3)} KWD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No jobs found for {monthName}
        </div>
      )}
    </div>
  );
};

export default MonthlyJobsReport;

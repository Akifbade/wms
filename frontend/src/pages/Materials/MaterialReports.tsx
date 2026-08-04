import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, TrendingUp, TrendingDown, AlertTriangle,
  Download, RefreshCw, ChevronDown, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Truck, XCircle, FileText, Printer,
  BarChart3, Eye, Table, History, Edit2, Trash2
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// Types
interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  minStockLevel: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'PURCHASE' | 'ISSUE' | 'RETURN' | 'DAMAGE' | 'RETURN_PENDING_APPROVAL';
  description: string;
  reference: string;
  referenceType: string;
  referenceId: string;
  stockIn: number;
  stockOut: number;
  unitCost: number;
  totalCost: number;
  balance: number;
  issuedBy?: string;
  recordedBy?: string;
  photoUrls?: string;
}

interface MaterialStatement {
  material: Material;
  transactions: Transaction[];
  totals: {
    openingStock: number;
    totalPurchased: number;
    totalIssued: number;
    totalReturned: number;
    totalDamaged: number;
    totalPendingApproval: number;
    closingBalance: number;
    currentStock: number;
    totalValue: number;
  };
}

interface Summary {
  totalMaterials: number;
  totalOpeningStock: number;
  totalPurchased: number;
  totalIssued: number;
  totalReturned: number;
  totalDamaged: number;
  totalPendingApproval: number;
  totalClosingStock: number;
  totalValue: number;
}

interface IssueHistoryItem {
  id: string;
  issueId: string | null;
  action: 'CREATED' | 'EDITED' | 'DELETED' | 'RETURN_EDITED' | 'RETURN_DELETED';
  jobId: string | null;
  materialId: string;
  materialName: string;
  materialSku: string;
  quantity: number;
  previousQty: number | null;
  unitCost: number;
  totalCost: number;
  rackId: string | null;
  rackCode: string | null;
  notes: string | null;
  reason: string | null;
  performedById: string;
  performedAt: string;
  material?: { name: string; sku: string; unit: string };
  performedBy?: { name: string; email: string };
}

const MaterialReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState<MaterialStatement[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [activeTab, setActiveTab] = useState<'statement' | 'history'>('statement');
  const [issueHistory, setIssueHistory] = useState<IssueHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');

  useEffect(() => {
    loadMaterialStatement();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadIssueHistory();
    }
  }, [activeTab]);

  const loadIssueHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('Loading history with dates:', dateRange.start, dateRange.end);
      const startISO = `${dateRange.start}T00:00:00.000Z`;
      const endISO = `${dateRange.end}T23:59:59.999Z`;
      const response = await apiFetch(`/materials/issues/history?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('History API response:', data);
      console.log('History array length:', Array.isArray(data) ? data.length : 'not an array');
      setIssueHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load issue history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadMaterialStatement = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const startISO = `${dateRange.start}T00:00:00.000Z`;
      const endISO = `${dateRange.end}T23:59:59.999Z`;
      let url = `/materials/reports/material-statement?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`;
      if (selectedMaterial) {
        url += `&materialId=${selectedMaterial}`;
      }

      const response = await apiFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setStatements(data.statements || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to load material statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaterial = (materialId: string) => {
    const newExpanded = new Set(expandedMaterials);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedMaterials(newExpanded);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <ArrowUpCircle className="w-4 h-4 text-green-600" />;
      case 'ISSUE': return <Truck className="w-4 h-4 text-blue-600" />;
      case 'RETURN': return <ArrowDownCircle className="w-4 h-4 text-purple-600" />;
      case 'DAMAGE': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'PURCHASE': return 'bg-green-50 border-l-4 border-green-500';
      case 'ISSUE': return 'bg-blue-50 border-l-4 border-blue-500';
      case 'RETURN': return 'bg-purple-50 border-l-4 border-purple-500';
      case 'DAMAGE': return 'bg-red-50 border-l-4 border-red-500';
      default: return 'bg-gray-50';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const exportToCSV = () => {
    if (statements.length === 0) {
      alert('No data to export. Please load the statement first.');
      return;
    }
    const rows: string[] = ['Material,SKU,Unit,Opening Stock,Current Stock,Waiting Approval,Purchased,Consumed,Returned,Damaged,Closing Stock,Unit Price,Total Value'];
        statements.forEach(stmt => {
          rows.push([
            `"${stmt.material.name}"`,
            stmt.material.sku,
            stmt.material.unit,
            stmt.totals.openingStock,
            stmt.material.currentStock,
            stmt.totals.totalPendingApproval || 0,
            stmt.totals.totalPurchased,
            stmt.totals.totalIssued,
            stmt.totals.totalReturned,
            stmt.totals.totalDamaged,
            stmt.totals.closingBalance,
            stmt.material.unitCost.toFixed(2),
            stmt.totals.totalValue.toFixed(2)
          ].join(','));
        });

        // Add totals row
        if (summary) {
          rows.push([
            'TOTAL',
            '',
            '',
            summary.totalOpeningStock,
            statements.reduce((sum, s) => sum + s.material.currentStock, 0),
            summary.totalPendingApproval || 0,
            summary.totalPurchased,
            summary.totalIssued,
            summary.totalReturned,
            summary.totalDamaged,
            summary.totalClosingStock,
            '',
            summary.totalValue.toFixed(2)
          ].join(','));
        }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-stock-statement-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  // Professional PDF Export
  const exportToPDF = () => {
    if (statements.length === 0) {
      alert('No data to export. Please load the statement first.');
      return;
    }
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIAL STOCK STATEMENT', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`, pageWidth / 2, 24, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // Stock Statement Table
    const tableData = statements.map(stmt => [
      stmt.material.name,
      stmt.material.sku,
      stmt.material.unit,
      stmt.totals.openingStock.toString(),
      stmt.material.currentStock.toString(),
      `${stmt.totals.totalPendingApproval || 0}`,
      `+${stmt.totals.totalPurchased}`,
      `-${stmt.totals.totalIssued}`,
      `+${stmt.totals.totalReturned}`,
      `-${stmt.totals.totalDamaged}`,
      `${stmt.material.unitCost.toFixed(2)}`,
      `${stmt.totals.totalValue.toFixed(2)}`
    ]);

    // Add totals row
    const totalCurrentStock = statements.reduce((sum, s) => sum + s.material.currentStock, 0);
    if (summary) {
      tableData.push([
        'TOTAL',
        '',
        '',
        summary.totalOpeningStock.toString(),
        totalCurrentStock.toString(),
        `${summary.totalPendingApproval || 0}`,
        `+${summary.totalPurchased}`,
        `-${summary.totalIssued}`,
        `+${summary.totalReturned}`,
        `-${summary.totalDamaged}`,
        '',
        `${summary.totalValue.toFixed(2)} KWD`
      ]);
    }

    doc.autoTable({
      startY: yPos,
      head: [['Material', 'SKU', 'Unit', 'Opening', 'Current Stock', 'Waiting Approval', 'Purchase', 'Consumed', 'Returned', 'Damaged', 'Unit Price', 'Total Value']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 22 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 24, halign: 'right', textColor: [180, 83, 9] },
        6: { cellWidth: 20, halign: 'right', textColor: [34, 197, 94] },
        7: { cellWidth: 22, halign: 'right', textColor: [59, 130, 246] },
        8: { cellWidth: 20, halign: 'right', textColor: [168, 85, 247] },
        9: { cellWidth: 20, halign: 'right', textColor: [239, 68, 68] },
        10: { cellWidth: 22, halign: 'right' },
        11: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 10, right: 10 },
      didParseCell: (data: any) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [243, 244, 246];
        }
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`Material-Stock-Statement-${dateRange.start}-to-${dateRange.end}.pdf`);
  };

  const printStatement = () => window.print();

  return (
    <>
      {/* Professional Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          
          /* NUCLEAR OPTION: HIDE EVERYTHING */
          * {
            visibility: hidden !important;
          }
          
          /* ONLY show print container and its children */
          .print-only-report,
          .print-only-report * {
            visibility: visible !important;
          }
          
          .print-only-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
            margin: 0;
            padding: 0;
          }
          
          /* Print Header with Logo */
          .print-header {
            display: flex !important;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .print-logo {
            max-width: 180px;
            max-height: 80px;
          }
          
          .print-company-info {
            text-align: right;
          }
          
          .print-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
          }
          
          .print-period {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
            text-align: center;
          }
          
          /* Table Styles */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          .print-table th {
            background-color: #1e40af !important;
            color: white !important;
            padding: 8px 4px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #ddd;
          }
          
          .print-table td {
            padding: 6px 4px;
            border: 1px solid #ddd;
          }
          
          .print-table tbody tr:nth-child(even) {
            background-color: #f9fafb !important;
          }
          
          .print-table tfoot {
            background-color: #1f2937 !important;
            color: white !important;
            font-weight: bold;
          }
          
          /* Footer */
          .print-footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #666;
            padding: 10px;
            border-top: 1px solid #ddd;
          }
          
          /* Ensure colors print */
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-purple-50 { background-color: #faf5ff !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .text-blue-700 { color: #1d4ed8 !important; }
          .text-green-600 { color: #16a34a !important; }
          .text-purple-600 { color: #9333ea !important; }
          .text-red-600 { color: #dc2626 !important; }
        }
      `}</style>

      <div className="p-6 max-w-7xl mx-auto print:p-0 print:max-w-none material-reports-print-container">
        {/* Screen Header */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Material Stock Statement</h1>
            <p className="text-gray-500 mt-1">Complete stock movement report with opening & closing balances</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              disabled={loading || statements.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={printStatement}
              disabled={statements.length === 0}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={exportToCSV}
              disabled={loading || statements.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 print:hidden">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material (Optional)</label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="border rounded-lg px-3 py-2 min-w-[200px]"
              >
                <option value="">All Materials</option>
                {statements.map(s => (
                  <option key={s.material.id} value={s.material.id}>
                    {s.material.name} ({s.material.sku})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadMaterialStatement}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Load Statement
            </button>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${viewMode === 'summary' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Table className="w-4 h-4" />
                Summary View
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${viewMode === 'detailed' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <BarChart3 className="w-4 h-4" />
                Detailed View
              </button>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="bg-white rounded-lg shadow mb-6 print:hidden">
          <div className="border-b flex">
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-6 py-3 font-medium flex items-center gap-2 ${activeTab === 'statement' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Table className="w-4 h-4" />
              Stock Statement
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium flex items-center gap-2 ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" />
              Edit/Delete History
            </button>
          </div>
        </div>

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Material Issue History
                </h2>
                <p className="text-purple-100 text-sm">All edits and deletions for material issues</p>
              </div>
              <button
                onClick={loadIssueHistory}
                disabled={historyLoading}
                className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30"
              >
                <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {historyLoading && (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                <p className="mt-2 text-gray-500">Loading history...</p>
              </div>
            )}

            {!historyLoading && issueHistory.length === 0 && (
              <div className="p-12 text-center">
                <History className="w-16 h-16 mx-auto text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No History Found</h3>
                <p className="mt-2 text-gray-500">No material issue edits or deletions recorded yet.</p>
              </div>
            )}

            {!historyLoading && issueHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date/Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Material</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {issueHistory.map((item) => (
                      <tr
                        key={item.id}
                        className={`
                        ${(item.action === 'DELETED' || item.action === 'RETURN_DELETED') ? 'bg-red-50' : (item.action === 'EDITED' || item.action === 'RETURN_EDITED') ? 'bg-yellow-50' : 'bg-green-50'}
                        ${item.jobId ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                      `}
                        onClick={() => item.jobId && window.open(`/jobs/${item.jobId}`, '_blank')}
                        title={item.jobId ? "Click to open job details" : ""}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {new Date(item.performedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${(item.action === 'DELETED' || item.action === 'RETURN_DELETED') ? 'bg-red-100 text-red-700' :
                            (item.action === 'EDITED' || item.action === 'RETURN_EDITED') ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                            {(item.action === 'DELETED' || item.action === 'RETURN_DELETED') && <Trash2 className="w-3 h-3" />}
                            {(item.action === 'EDITED' || item.action === 'RETURN_EDITED') && <Edit2 className="w-3 h-3" />}
                            {item.action === 'CREATED' && <ArrowUpCircle className="w-3 h-3" />}
                            {item.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.materialName}</div>
                          <div className="text-xs text-gray-500">{item.materialSku}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(item.action === 'EDITED' || item.action === 'RETURN_EDITED') && item.previousQty !== null ? (
                            <div className="text-sm">
                              <span className="text-gray-500 line-through">{item.previousQty}</span>
                              <span className="mx-1">→</span>
                              <span className="font-bold text-yellow-700">{item.quantity}</span>
                            </div>
                          ) : (
                            <span className={`font-bold ${(item.action === 'DELETED' || item.action === 'RETURN_DELETED') ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.quantity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          KWD {item.totalCost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {item.reason || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.performedBy?.name || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STATEMENT TAB CONTENT */}
        {activeTab === 'statement' && (
          <>
            {/* Loading */}
            {loading && (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-500">Loading material statement...</p>
              </div>
            )}

            {/* No Data */}
            {!loading && statements.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Data Found</h3>
                <p className="mt-2 text-gray-500">No material transactions found for the selected date range.</p>
              </div>
            )}

            {/* SUMMARY VIEW - Stock Statement Table */}
            {!loading && statements.length > 0 && viewMode === 'summary' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Print-Only Professional Report Container */}
                <div className="print-only-report">
                  {/* Print-Only Professional Header */}
                  <div className="hidden print:block print-header">
                    <div>
                      <img
                        src="http://qgocargo.com/logo.png"
                        alt="Company Logo"
                        className="print-logo"
                      />
                    </div>
                    <div className="print-company-info">
                      <div className="print-title">MATERIAL STOCK STATEMENT</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        QGO Cargo & Warehouse Management
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                        Tel: +965 XXXX XXXX | Email: info@qgocargo.com
                      </div>
                    </div>
                  </div>

                  {/* Print Period */}
                  <div className="hidden print:block print-period">
                    <strong>Report Period:</strong> {formatDate(dateRange.start)} to {formatDate(dateRange.end)}
                    <br />
                    <strong>Generated:</strong> {new Date().toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>

                  {/* Screen Header (Hidden in Print) */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 print:hidden">
                    <h2 className="text-xl font-bold">Stock Statement</h2>
                    <p className="text-blue-100 text-sm">Period: {formatDate(dateRange.start)} to {formatDate(dateRange.end)}</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full print-table">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Material</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Opening</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-100">
                                                      <span className="print:hidden">📦 </span>Current Stock
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase tracking-wider bg-amber-50">⏳ Waiting Approval</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">+ Purchased</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-50">- Consumed</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-purple-700 uppercase tracking-wider bg-purple-50">+ Returned</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-red-700 uppercase tracking-wider bg-red-50">- Damaged</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Value</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider print:hidden">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {statements.map((stmt) => (
                          <tr key={stmt.material.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link to={`/materials/${stmt.material.id}`} className="text-blue-600 hover:underline font-medium print:text-black print:no-underline">
                                {stmt.material.name}
                              </Link>
                              <p className="text-xs text-gray-500 print:inline print:ml-1">({stmt.material.category})</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{stmt.material.sku}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600">{stmt.material.unit}</td>
                                                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{stmt.totals.openingStock}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50">{stmt.material.currentStock}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-amber-700 bg-amber-50">{stmt.totals.totalPendingApproval || '-'}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600 bg-green-50">
                              {stmt.totals.totalPurchased > 0 ? `+${stmt.totals.totalPurchased}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-600 bg-blue-50">
                              {stmt.totals.totalIssued > 0 ? `-${stmt.totals.totalIssued}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-purple-600 bg-purple-50">
                              {stmt.totals.totalReturned > 0 ? `+${stmt.totals.totalReturned}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-red-600 bg-red-50">
                              {stmt.totals.totalDamaged > 0 ? `-${stmt.totals.totalDamaged}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">{stmt.material.unitCost.toFixed(2)} KWD</td>
                            <td className="px-4 py-3 text-right font-semibold">{stmt.totals.totalValue.toFixed(2)} KWD</td>
                            <td className="px-4 py-3 text-center print:hidden">
                              <button
                                onClick={() => {
                                  setViewMode('detailed');
                                  setExpandedMaterials(new Set([stmt.material.id]));
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="View Transactions"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals Footer */}
                      {summary && (
                        <tfoot className="bg-gray-800 text-white">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 font-bold text-right">TOTAL ({summary.totalMaterials} Materials)</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-300">{summary.totalOpeningStock}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-400">{statements.reduce((sum, s) => sum + s.material.currentStock, 0)}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-amber-400">{summary.totalPendingApproval || 0}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-green-400">+{summary.totalPurchased}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-400">-{summary.totalIssued}</td>
                            <td className="px-4 py-3 text-right font-bold text-purple-400">+{summary.totalReturned}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-400">-{summary.totalDamaged}</td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-right font-bold">{summary.totalValue.toFixed(2)} KWD</td>
                            <td className="print:hidden"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Print Footer */}
                  <div className="hidden print:block print-footer">
                    <strong>QGO Cargo Kuwait</strong> | Warehouse Storage, Customs Clearance, Import Export & International Moving
                  </div>
                </div>
                {/* End print-only-report wrapper */}

                {/* Legend */}
                <div className="px-6 py-4 bg-gray-50 border-t flex gap-6 text-sm print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-gray-600">Purchase = Stock In (from vendors)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-gray-600">Consumed = Stock Out (to jobs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span className="text-gray-600">Returned = Stock In (from jobs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-gray-600">Damaged = Stock Loss</span>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED VIEW - Individual Material Transactions */}
            {!loading && statements.length > 0 && viewMode === 'detailed' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Click on a material to view its transaction history</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedMaterials(new Set(statements.map(s => s.material.id)))}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Expand All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setExpandedMaterials(new Set())}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {statements.map((stmt) => (
                  <div key={stmt.material.id} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Material Header - Clickable */}
                    <div
                      onClick={() => toggleMaterial(stmt.material.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 border-b"
                    >
                      <div className="flex items-center gap-4">
                        {expandedMaterials.has(stmt.material.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <Link
                            to={`/materials/${stmt.material.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-lg font-bold text-blue-600 hover:underline"
                          >
                            {stmt.material.name}
                          </Link>
                          <p className="text-sm text-gray-500">
                            SKU: {stmt.material.sku} • {stmt.material.category} • {stmt.material.unit}
                          </p>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-6">
                        <div className="text-center px-3 py-1 bg-gray-100 rounded">
                          <p className="text-xs text-gray-500">Opening</p>
                          <p className="font-bold">{stmt.totals.openingStock}</p>
                        </div>
                        <div className="text-center px-3 py-1 bg-green-100 rounded">
                          <p className="text-xs text-green-600">Purchased</p>
                          <p className="font-bold text-green-700">+{stmt.totals.totalPurchased}</p>
                        </div>
                        <div className="text-center px-3 py-1 bg-blue-100 rounded">
                          <p className="text-xs text-blue-600">Consumed</p>
                          <p className="font-bold text-blue-700">-{stmt.totals.totalIssued}</p>
                        </div>
                        <div className="text-center px-3 py-1 bg-purple-100 rounded">
                          <p className="text-xs text-purple-600">Returned</p>
                          <p className="font-bold text-purple-700">+{stmt.totals.totalReturned}</p>
                        </div>
                        {stmt.totals.totalDamaged > 0 && (
                          <div className="text-center px-3 py-1 bg-red-100 rounded">
                            <p className="text-xs text-red-600">Damaged</p>
                            <p className="font-bold text-red-700">-{stmt.totals.totalDamaged}</p>
                          </div>
                        )}
                        <div className={`text-center px-3 py-1 rounded ${stmt.totals.closingBalance < stmt.material.minStockLevel ? 'bg-red-100' : 'bg-gray-200'}`}>
                          <p className="text-xs text-gray-600">Closing</p>
                          <p className={`font-bold ${stmt.totals.closingBalance < stmt.material.minStockLevel ? 'text-red-600' : ''}`}>
                            {stmt.totals.closingBalance}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Transactions Table - Expanded View */}
                    {expandedMaterials.has(stmt.material.id) && (
                      <div>
                        {/* Opening Balance Row */}
                        <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b">
                          <span className="text-sm text-gray-600 font-medium">📂 Opening Balance (before {formatDate(dateRange.start)})</span>
                          <span className="font-bold">{stmt.totals.openingStock} {stmt.material.unit}</span>
                        </div>

                        {stmt.transactions.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No transactions found for this material in the selected date range.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Job / Details</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-green-600">IN</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-red-600">OUT</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-800">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {stmt.transactions.map((txn, idx) => {
                                  // Extract customer name from description
                                  const customerMatch = txn.description?.match(/- (.+?)(?:\s*\(|$)/);
                                  const customerName = customerMatch ? customerMatch[1].trim() : '';
                                  const isPending = txn.type === 'RETURN_PENDING_APPROVAL';

                                  return (
                                    <tr
                                      key={txn.id || idx}
                                      className={`hover:bg-gray-50 ${isPending ? 'bg-yellow-50' : ''} ${txn.type === 'PURCHASE' ? 'bg-green-50/50' :
                                          txn.type === 'ISSUE' ? 'bg-blue-50/50' :
                                            txn.type === 'RETURN' ? 'bg-purple-50/50' :
                                              txn.type === 'DAMAGE' ? 'bg-red-50/50' : ''
                                        }`}
                                    >
                                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                        {formatDate(txn.date)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${txn.type === 'PURCHASE' ? 'bg-green-100 text-green-700' :
                                            txn.type === 'ISSUE' ? 'bg-blue-100 text-blue-700' :
                                              txn.type === 'RETURN' ? 'bg-purple-100 text-purple-700' :
                                                txn.type === 'RETURN_PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                                                  txn.type === 'DAMAGE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                          }`}>
                                          {txn.type === 'PURCHASE' && '📦 Stock In'}
                                          {txn.type === 'ISSUE' && '📤 Issued'}
                                          {txn.type === 'RETURN' && '↩️ Returned'}
                                          {txn.type === 'RETURN_PENDING_APPROVAL' && '⏳ Pending Return'}
                                          {txn.type === 'DAMAGE' && '❌ Damaged'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        {txn.referenceType === 'moving_job' && txn.referenceId ? (
                                          <Link
                                            to={`/moving-jobs/${txn.referenceId}`}
                                            className="group block"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-blue-600 hover:text-blue-800 font-medium group-hover:underline">
                                                {customerName || txn.reference}
                                              </span>
                                              <span className="text-xs text-gray-400 group-hover:text-blue-500">
                                                → Open Job
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-400">{txn.reference}</p>
                                          </Link>
                                        ) : (
                                          <div>
                                            <p className="font-medium text-gray-800">
                                              {txn.description?.replace('Issued to Job:', '').replace('Returned from Job:', '').replace('Purchased from', '').trim() || txn.reference}
                                            </p>
                                            {txn.reference !== 'N/A' && txn.reference && (
                                              <p className="text-xs text-gray-400">{txn.reference}</p>
                                            )}
                                          </div>
                                        )}
                                        {isPending && (
                                          <span className="inline-block mt-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                                            ⏳ Waiting for approval - not added to stock
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        {txn.stockIn > 0 ? (
                                          <span className="text-lg font-bold text-green-600">+{txn.stockIn}</span>
                                        ) : (
                                          <span className="text-gray-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        {txn.stockOut > 0 ? (
                                          <span className="text-lg font-bold text-red-600">-{txn.stockOut}</span>
                                        ) : (
                                          <span className="text-gray-300">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <span className={`text-lg font-bold ${txn.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                          {txn.balance}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Closing Balance Row */}
                        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
                          <span className="font-medium">📦 Closing Balance</span>
                          <span className="text-xl font-bold">{stmt.totals.closingBalance} {stmt.material.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Print-Only Footer */}
        <div className="hidden print:block print-footer">
          <div>
            <strong>QGO Cargo & Warehouse Management System</strong>
            <br />
            Generated on {new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} | This is a system-generated report
          </div>
        </div>
      </div>
    </>
  );
};

export default MaterialReports;

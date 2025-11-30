import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, TrendingUp, TrendingDown, AlertTriangle,
  Download, RefreshCw, ChevronDown, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, Truck, XCircle, FileText, Printer,
  BarChart3, Eye, Table
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
  type: 'PURCHASE' | 'ISSUE' | 'RETURN' | 'DAMAGE';
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
  totalClosingStock: number;
  totalValue: number;
}

const MaterialReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState<MaterialStatement[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');

  useEffect(() => {
    loadMaterialStatement();
  }, []);

  const loadMaterialStatement = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      let url = `/materials/reports/material-statement?startDate=${dateRange.start}&endDate=${dateRange.end}`;
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
    const rows: string[] = ['Material,SKU,Unit,Opening Stock,Purchased,Consumed,Returned,Damaged,Closing Stock,Unit Cost,Total Value'];
    statements.forEach(stmt => {
      rows.push([
        `"${stmt.material.name}"`,
        stmt.material.sku,
        stmt.material.unit,
        stmt.totals.openingStock,
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
      stmt.material.currentStock.toString(),
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
        totalCurrentStock.toString(),
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
      head: [['Material', 'SKU', 'Unit', 'Current Stock', 'Purchase', 'Consumed', 'Returned', 'Damaged', 'Unit Cost', 'Total Value']],
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
        0: { cellWidth: 48 },
        1: { cellWidth: 28 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'right', textColor: [34, 197, 94] },
        5: { cellWidth: 24, halign: 'right', textColor: [59, 130, 246] },
        6: { cellWidth: 22, halign: 'right', textColor: [168, 85, 247] },
        7: { cellWidth: 22, halign: 'right', textColor: [239, 68, 68] },
        8: { cellWidth: 25, halign: 'right' },
        9: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
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
    <div className="p-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Material Stock Statement</h1>
          <p className="text-gray-500 mt-1">Complete stock movement report with opening & closing balances</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={printStatement}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
            <h2 className="text-xl font-bold">Stock Statement</h2>
            <p className="text-blue-100 text-sm">Period: {formatDate(dateRange.start)} to {formatDate(dateRange.end)}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-100">📦 Current Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">+ Purchased</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider bg-blue-50">- Consumed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-purple-700 uppercase tracking-wider bg-purple-50">+ Returned</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-700 uppercase tracking-wider bg-red-50">- Damaged</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Value</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statements.map((stmt) => (
                  <tr key={stmt.material.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/materials/${stmt.material.id}`} className="text-blue-600 hover:underline font-medium">
                        {stmt.material.name}
                      </Link>
                      <p className="text-xs text-gray-500">{stmt.material.category}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{stmt.material.sku}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{stmt.material.unit}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50">{stmt.material.currentStock}</td>
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
                    <td className="px-4 py-3 text-right font-bold text-blue-400">{statements.reduce((sum, s) => sum + s.material.currentStock, 0)}</td>
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
                    <div className="divide-y divide-gray-100">
                      {stmt.transactions.map((txn, idx) => (
                        <div key={txn.id || idx} className={`px-4 py-3 ${getTransactionColor(txn.type)}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              {getTransactionIcon(txn.type)}
                              <div>
                                <p className="font-medium text-gray-900">{txn.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  📅 {formatDate(txn.date)} •
                                  {txn.referenceType === 'moving_job' && txn.referenceId ? (
                                    <Link to={`/moving-jobs/${txn.referenceId}`} className="text-blue-600 hover:underline ml-1">
                                      {txn.reference}
                                    </Link>
                                  ) : (
                                    <span className="ml-1">{txn.reference}</span>
                                  )}
                                  {txn.issuedBy && <span> • By: {txn.issuedBy}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {txn.stockIn > 0 && (
                                <p className="text-lg font-bold text-green-600">+{txn.stockIn}</p>
                              )}
                              {txn.stockOut > 0 && (
                                <p className="text-lg font-bold text-red-600">-{txn.stockOut}</p>
                              )}
                              <p className="text-xs text-gray-500">Balance: {txn.balance}</p>
                            </div>
                          </div>
                        </div>
                      ))}
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
    </div>
  );
};

export default MaterialReports;

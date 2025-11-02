import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PrinterIcon } from '@heroicons/react/24/outline';

interface ShipmentsPrintReportProps {
    shipments: any[];
    searchTerm?: string;
    activeTab?: string;
    warehouseFilter?: string;
}

const ShipmentsPrintReport: React.FC<ShipmentsPrintReportProps> = ({
    shipments,
    searchTerm = '',
    activeTab = 'all',
    warehouseFilter = 'all'
}) => {

    const getDaysStored = (shipment: any) => {
        const arrival = new Date(shipment.arrivalDate || shipment.receivedDate);
        const now = new Date();
        const diff = now.getTime() - arrival.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const getStatusText = (status: string) => {
        const statusMap: any = {
            'PENDING': 'Pending',
            'IN_STORAGE': 'In Storage',
            'ACTIVE': 'In Storage',
            'PARTIAL': 'Partial Release',
            'RELEASED': 'Released'
        };
        return statusMap[status] || status;
    };

    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header - Company Logo & Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('📦 WAREHOUSE MANAGEMENT SYSTEM', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(16);
        doc.text('Shipments Report', pageWidth / 2, 25, { align: 'center' });

        // Report Metadata
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const reportDate = new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        });
        doc.text(`Generated: ${reportDate}`, 14, 35);

        // Filter Info
        let filterText = 'Showing: ';
        if (searchTerm) filterText += `Search "${searchTerm}" | `;
        if (activeTab !== 'all') filterText += `Status: ${getStatusText(activeTab.toUpperCase())} | `;
        if (warehouseFilter !== 'all') filterText += `Type: ${warehouseFilter === 'warehouse' ? 'Warehouse' : 'Regular'} | `;
        filterText += `Total: ${shipments.length} shipments`;
        doc.text(filterText, 14, 40);

        // Summary Statistics
        const totalBoxes = shipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0);
        const avgDaysStored = shipments.length > 0
            ? Math.round(shipments.reduce((sum, s) => sum + getDaysStored(s), 0) / shipments.length)
            : 0;
        const longStayCount = shipments.filter(s => getDaysStored(s) >= 30).length;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`📊 Summary: ${totalBoxes} Total Boxes | Avg Storage: ${avgDaysStored} days | Long Stay (30+d): ${longStayCount} shipments`, 14, 45);

        // Prepare table data
        const tableData = shipments.map((shipment) => {
            const days = getDaysStored(shipment);
            const daysColor = days >= 60 ? [255, 0, 0] : days >= 30 ? [255, 165, 0] : [0, 128, 0];

            // Get proper rack display
            const rackDisplay = shipment.rack?.code
                ? `${shipment.rack.code}${shipment.rack.location ? ` (${shipment.rack.location})` : ''}`
                : shipment.rackLocation || 'Not Assigned';

            // Get proper date
            const dateValue = shipment.arrivalDate || shipment.receivedDate || shipment.createdAt;
            const dateDisplay = dateValue
                ? new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No Date';

            return [
                shipment.referenceId || 'N/A',
                shipment.clientName || 'N/A',
                shipment.companyProfile?.name || 'Individual',
                shipment.clientPhone || 'N/A',
                `${shipment.currentBoxCount || 0} / ${shipment.originalBoxCount || 0}`,
                shipment.palletCount && shipment.boxesPerPallet
                    ? `${shipment.palletCount} × ${shipment.boxesPerPallet}`
                    : `${shipment.originalBoxCount || 0} loose`,
                shipment.isWarehouseShipment ? '🪵 Pallet' : '📦 Regular',
                rackDisplay,
                { content: `${days}d`, styles: { textColor: daysColor, fontStyle: 'bold' } },
                getStatusText(shipment.status),
                dateDisplay
            ];
        });

        // Table
        autoTable(doc, {
            startY: 50,
            head: [[
                'Ref ID',
                'Client',
                'Company',
                'Phone',
                'Boxes',
                'Pallets',
                'Type',
                'Rack',
                'Days',
                'Status',
                'Date'
            ]],
            body: tableData,
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [59, 130, 246], // Blue
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 25 }, // Ref ID
                1: { cellWidth: 28 }, // Client
                2: { cellWidth: 25 }, // Company
                3: { cellWidth: 22 }, // Phone
                4: { cellWidth: 18, halign: 'center' }, // Boxes
                5: { cellWidth: 20, halign: 'center' }, // Pallets
                6: { cellWidth: 18, halign: 'center' }, // Type
                7: { cellWidth: 20, halign: 'center' }, // Rack
                8: { cellWidth: 15, halign: 'center' }, // Days
                9: { cellWidth: 22, halign: 'center' }, // Status
                10: { cellWidth: 22, halign: 'center' } // Date
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                // Footer on each page
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(128);
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
                doc.text(
                    '© Warehouse Management System - Confidential',
                    14,
                    doc.internal.pageSize.getHeight() - 10
                );
            }
        });

        // Save PDF
        const filename = `WMS-Shipments-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
    };

    const printHTML = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('❌ Please allow pop-ups to print the report');
            return;
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipments Report - ${new Date().toLocaleDateString()}</title>
          <style>
            @media print {
              @page { margin: 0.5cm; }
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1e40af;
            }
            .header h2 {
              margin: 5px 0;
              font-size: 18px;
              color: #64748b;
            }
            .metadata {
              margin-bottom: 15px;
              padding: 10px;
              background: #f1f5f9;
              border-radius: 5px;
            }
            .summary {
              margin-bottom: 20px;
              padding: 10px;
              background: #dbeafe;
              border-left: 4px solid #3b82f6;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #3b82f6;
              color: white;
              padding: 8px 6px;
              text-align: left;
              font-size: 10px;
              border: 1px solid #2563eb;
            }
            td {
              padding: 6px 6px;
              border: 1px solid #e2e8f0;
              font-size: 10px;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            tr:hover {
              background: #e0f2fe;
            }
            .badge {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: bold;
              display: inline-block;
            }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-yellow { background: #fef9c3; color: #854d0e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .badge-purple { background: #f3e8ff; color: #6b21a8; }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 9px;
            }
            .print-btn {
              padding: 10px 20px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin-bottom: 20px;
            }
            .print-btn:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" class="print-btn no-print">🖨️ Print Report</button>
          
          <div class="header">
            <h1>📦 WAREHOUSE MANAGEMENT SYSTEM</h1>
            <h2>Shipments Report</h2>
          </div>
          
          <div class="metadata">
            <strong>Generated:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}<br>
            <strong>Filters:</strong> 
            ${searchTerm ? `Search: "${searchTerm}" | ` : ''}
            ${activeTab !== 'all' ? `Status: ${getStatusText(activeTab.toUpperCase())} | ` : ''}
            ${warehouseFilter !== 'all' ? `Type: ${warehouseFilter === 'warehouse' ? 'Warehouse' : 'Regular'} | ` : ''}
            Total: ${shipments.length} shipments
          </div>
          
          <div class="summary">
            📊 Summary: ${shipments.reduce((sum, s) => sum + (s.currentBoxCount || 0), 0)} Total Boxes | 
            Avg Storage: ${shipments.length > 0 ? Math.round(shipments.reduce((sum, s) => sum + getDaysStored(s), 0) / shipments.length) : 0} days | 
            Long Stay (30+d): ${shipments.filter(s => getDaysStored(s) >= 30).length} shipments
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Ref ID</th>
                <th>Client</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Boxes</th>
                <th>Pallets</th>
                <th>Type</th>
                <th>Rack</th>
                <th>Days</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${shipments.map(shipment => {
            const days = getDaysStored(shipment);
            const daysBadgeClass = days >= 60 ? 'badge-red' : days >= 30 ? 'badge-yellow' : 'badge-green';

            // Get proper rack display
            const rackDisplay = shipment.rack?.code
                ? `${shipment.rack.code}${shipment.rack.location ? ` (${shipment.rack.location})` : ''}`
                : shipment.rackLocation || '<span style="color: #ef4444;">Not Assigned</span>';

            // Get proper date
            const dateValue = shipment.arrivalDate || shipment.receivedDate || shipment.createdAt;
            const dateDisplay = dateValue
                ? new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '<span style="color: #ef4444;">No Date</span>';

            // Get pallet info
            const palletInfo = shipment.palletCount && shipment.boxesPerPallet
                ? `<strong>${shipment.palletCount}</strong> × <strong>${shipment.boxesPerPallet}</strong>`
                : `${shipment.originalBoxCount || 0} loose`;

            return `
                  <tr>
                    <td><strong>${shipment.referenceId || 'N/A'}</strong></td>
                    <td>${shipment.clientName || 'N/A'}</td>
                    <td><span class="badge badge-blue">${shipment.companyProfile?.name || 'Individual'}</span></td>
                    <td>${shipment.clientPhone || 'N/A'}</td>
                    <td style="text-align: center;"><span class="badge badge-purple">${shipment.currentBoxCount || 0} / ${shipment.originalBoxCount || 0}</span></td>
                    <td style="text-align: center;">${palletInfo}</td>
                    <td style="text-align: center;">${shipment.isWarehouseShipment ? '🪵 Pallet' : '📦 Regular'}</td>
                    <td style="text-align: center; font-weight: bold;">${rackDisplay}</td>
                    <td style="text-align: center;"><span class="badge ${daysBadgeClass}">${days}d</span></td>
                    <td style="text-align: center;">${getStatusText(shipment.status)}</td>
                    <td style="text-align: center;">${dateDisplay}</td>
                  </tr>
                `;
        }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            © ${new Date().getFullYear()} Warehouse Management System - Confidential<br>
            Total Records: ${shipments.length} | Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={generatePDF}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                title="Download as PDF"
            >
                <PrinterIcon className="h-5 w-5 mr-2" />
                📄 Export PDF
            </button>

            <button
                onClick={printHTML}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                title="Print in Browser"
            >
                <PrinterIcon className="h-5 w-5 mr-2" />
                🖨️ Print Report
            </button>
        </div>
    );
};

export default ShipmentsPrintReport;

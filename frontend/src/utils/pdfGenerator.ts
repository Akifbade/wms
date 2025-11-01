import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  lineItems: Array<{
    description: string;
    notes?: string;
    quantity: number;
    unitPrice: string;
    taxAmount: string;
    amount: string;
  }>;
  shipment?: {
    referenceId: string;
  };
  payments?: Array<{
    paymentDate: string;
    paymentMethod: string;
    transactionReference?: string;
    amount: string;
  }>;
}

interface BillingSettings {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  iban?: string;
  swiftCode?: string;
  bankDetails?: string;
  termsAndConditions?: string;
}

export const generateInvoicePDF = (invoice: InvoiceData, settings: BillingSettings) => {
  const doc = new jsPDF();
  const primaryColor = settings.primaryColor || '#2563eb';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 37, g: 99, b: 235 };
  };

  const color = hexToRgb(primaryColor);

  // Header Background
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Company Logo (if available)
  if (settings.logoUrl) {
    try {
      // Note: For production, you'd need to convert logo to base64 first
      // doc.addImage(settings.logoUrl, 'PNG', 15, 10, 30, 20);
    } catch (err) {
      console.error('Logo load error:', err);
    }
  }

  // Invoice Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 15, 25, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, pageWidth - 15, 33, { align: 'right' });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Company Details (From)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 6;
  doc.text(settings.companyName || 'Company Name', 15, yPos);
  yPos += 5;
  if (settings.address) {
    doc.setFontSize(9);
    doc.text(settings.address, 15, yPos);
    yPos += 5;
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, 15, yPos);
    yPos += 5;
  }
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, 15, yPos);
  }

  // Client Details (To)
  yPos = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', pageWidth - 80, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 6;
  doc.text(invoice.clientName, pageWidth - 80, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.text(`Tel: ${invoice.clientPhone}`, pageWidth - 80, yPos);
  yPos += 5;
  if (invoice.clientEmail) {
    doc.text(`Email: ${invoice.clientEmail}`, pageWidth - 80, yPos);
    yPos += 5;
  }
  if (invoice.shipment) {
    doc.text(`Shipment: ${invoice.shipment.referenceId}`, pageWidth - 80, yPos);
  }

  // Invoice Info Box
  yPos = 90;
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos, pageWidth - 30, 20, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', 20, yPos + 8);
  doc.text('Due Date:', 70, yPos + 8);
  doc.text('Status:', 120, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.invoiceDate).toLocaleDateString(), 20, yPos + 15);
  doc.text(new Date(invoice.dueDate).toLocaleDateString(), 70, yPos + 15);
  
  // Status badge
  const statusColor = invoice.status === 'PAID' ? [34, 197, 94] : 
                      invoice.status === 'PARTIAL' ? [59, 130, 246] : 
                      invoice.status === 'OVERDUE' ? [239, 68, 68] : [234, 179, 8];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setTextColor(255, 255, 255);
  doc.roundedRect(120, yPos + 10, 25, 6, 2, 2, 'F');
  doc.text(invoice.status, 132.5, yPos + 14, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Line Items Table
  yPos = 120;
  const lineItemsData = invoice.lineItems.map(item => [
    item.description + (item.notes ? `\n${item.notes}` : ''),
    item.quantity.toString(),
    `${parseFloat(item.unitPrice).toFixed(3)} KWD`,
    `${parseFloat(item.taxAmount || '0').toFixed(3)} KWD`,
    `${parseFloat(item.amount).toFixed(3)} KWD`
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Tax', 'Amount']],
    body: lineItemsData,
    theme: 'striped',
    headStyles: {
      fillColor: [color.r, color.g, color.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 30 }
    }
  });

  // Totals Section
  yPos = doc.lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 70;
  
  doc.setFontSize(10);
  doc.text('Subtotal:', totalsX, yPos, { align: 'right' });
  doc.text(`${parseFloat(invoice.subtotal).toFixed(3)} KWD`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 7;
  doc.text('Tax:', totalsX, yPos, { align: 'right' });
  doc.text(`${parseFloat(invoice.taxAmount || '0').toFixed(3)} KWD`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 10;
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 10, yPos - 3, pageWidth - 15, yPos - 3);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX, yPos, { align: 'right' });
  doc.text(`${parseFloat(invoice.totalAmount).toFixed(3)} KWD`, pageWidth - 15, yPos, { align: 'right' });

  // Payment Info
  const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || '0');
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Paid:', totalsX, yPos, { align: 'right' });
  doc.setTextColor(34, 197, 94);
  doc.text(`${parseFloat(invoice.paidAmount || '0').toFixed(3)} KWD`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(0, 0, 0);
  doc.text('Balance Due:', totalsX, yPos, { align: 'right' });
  doc.setTextColor(balance > 0 ? 239 : 34, balance > 0 ? 68 : 197, balance > 0 ? 68 : 94);
  doc.text(`${balance.toFixed(3)} KWD`, pageWidth - 15, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Payment History
  if (invoice.payments && invoice.payments.length > 0) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payment History', 15, yPos);
    
    yPos += 5;
    const paymentsData = invoice.payments.map(p => [
      new Date(p.paymentDate).toLocaleDateString(),
      p.paymentMethod,
      p.transactionReference || 'N/A',
      `${parseFloat(p.amount).toFixed(3)} KWD`
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: paymentsData,
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Bank Details
  if (settings.bankDetails && yPos < pageHeight - 60) {
    yPos += 10;
    doc.setFillColor(240, 248, 255);
    doc.rect(15, yPos, pageWidth - 30, 30, 'F');
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details', 20, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const bankLines = settings.bankDetails.split('\n');
    bankLines.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 4;
    });
  }

  // Terms & Conditions
  if (settings.termsAndConditions && yPos < pageHeight - 40) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', 15, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const termsLines = settings.termsAndConditions.split('\n').slice(0, 3);
    termsLines.forEach(line => {
      doc.text(line, 15, yPos);
      yPos += 4;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save PDF
  const fileName = `Invoice-${invoice.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

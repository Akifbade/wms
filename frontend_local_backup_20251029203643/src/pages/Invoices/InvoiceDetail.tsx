import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { billingAPI } from '../../services/api';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [templateSettings, setTemplateSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const [invoiceRes, settingsRes, templateRes] = await Promise.all([
        billingAPI.getInvoice(id!),
        billingAPI.getSettings(),
        fetch('/api/template-settings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }).then(r => r.json()).catch(() => ({ settings: null }))
      ]);
      setInvoice(invoiceRes.invoice || invoiceRes);
      setBillingSettings(settingsRes.settings || settingsRes);
      setTemplateSettings(templateRes.settings);
    } catch (err) {
      console.error('Load invoice error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      PAID: 'bg-green-100 text-green-800 border-green-300',
      PARTIAL: 'bg-blue-100 text-blue-800 border-blue-300',
      OVERDUE: 'bg-red-100 text-red-800 border-red-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    const icons = {
      PENDING: <ClockIcon className="h-5 w-5" />,
      PAID: <CheckCircleIcon className="h-5 w-5" />,
      PARTIAL: <CurrencyDollarIcon className="h-5 w-5" />,
      OVERDUE: <ClockIcon className="h-5 w-5" />,
      CANCELLED: <ClockIcon className="h-5 w-5" />,
    };

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${styles[status as keyof typeof styles] || styles.PENDING}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !billingSettings) return;
    
    try {
      setGeneratingPDF(true);
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      generateInvoicePDF(invoice, billingSettings);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getQRPosition = () => {
    const position = templateSettings?.qrCodePosition || 'TOP_RIGHT';
    const positions: Record<string, string> = {
      'TOP_RIGHT': 'top-4 right-4',
      'TOP_LEFT': 'top-4 left-4',
      'BOTTOM_RIGHT': 'bottom-4 right-4',
      'BOTTOM_LEFT': 'bottom-4 left-4'
    };
    return positions[position] || positions['TOP_RIGHT'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Invoice not found</p>
      </div>
    );
  }

  const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0);
  const paymentProgress = (parseFloat(invoice.paidAmount || 0) / parseFloat(invoice.totalAmount)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Actions */}
      <div className="max-w-5xl mx-auto mb-6 print:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Invoices
          </button>

          <div className="flex items-center gap-3">
            {balance > 0 && (
              <button
                onClick={() => setRecordPaymentOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CurrencyDollarIcon className="h-5 w-5" />
                Record Payment
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <PrinterIcon className="h-5 w-5" />
              Print
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                  Generating...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download PDF
                </>
              )}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <EnvelopeIcon className="h-5 w-5" />
              Send Email
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden relative">
        {/* QR Code */}
        {templateSettings?.showQRCode && invoice && (
          <div className={`absolute ${getQRPosition()} z-10 bg-white p-2 rounded-lg shadow-md print:block`}>
            <QRCodeSVG
              value={`INV-${invoice.invoiceNumber || invoice.id}`}
              size={templateSettings?.qrCodeSize || 100}
              level="M"
              includeMargin={true}
            />
          </div>
        )}
        
        {/* Header */}
        <div
          className="p-8 border-b-4"
          style={{
            borderColor: templateSettings?.invoicePrimaryColor || billingSettings?.primaryColor || '#2563eb',
            backgroundColor: `${templateSettings?.invoicePrimaryColor || billingSettings?.primaryColor || '#2563eb'}08`,
          }}
        >
          <div className="flex items-start justify-between">
            {/* Company Info */}
            <div>
              {(templateSettings?.invoiceShowLogo !== false) && (templateSettings?.companyLogo || billingSettings?.logoUrl) && (
                <img
                  src={templateSettings?.companyLogo || billingSettings.logoUrl}
                  alt="Company Logo"
                  className="h-16 mb-4"
                />
              )}
              <h1 
                className="text-3xl font-bold" 
                style={{ color: templateSettings?.invoicePrimaryColor || billingSettings?.primaryColor || '#2563eb' }}
              >
                {templateSettings?.invoiceTitle || 'INVOICE'}
              </h1>
              <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
              {templateSettings?.companyName && (
                <p className="text-gray-700 font-semibold mt-2">{templateSettings.companyName}</p>
              )}
              {(templateSettings?.invoiceShowAddress !== false) && templateSettings?.companyAddress && (
                <p className="text-sm text-gray-600 mt-1">{templateSettings.companyAddress}</p>
              )}
              {(templateSettings?.invoiceShowPhone !== false) && templateSettings?.companyPhone && (
                <p className="text-sm text-gray-600">Phone: {templateSettings.companyPhone}</p>
              )}
              {(templateSettings?.invoiceShowEmail !== false) && templateSettings?.companyEmail && (
                <p className="text-sm text-gray-600">Email: {templateSettings.companyEmail}</p>
              )}
            </div>

            {/* Status Badge */}
            <div>
              {getStatusBadge(invoice.status)}
            </div>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <p className="text-sm text-gray-500">Invoice Date</p>
              <p className="text-gray-900 font-semibold">
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="text-gray-900 font-semibold">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To & From */}
        <div className="p-8 grid grid-cols-2 gap-8 border-b">
          {/* From */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">From</h3>
            <p className="text-gray-900 font-semibold">{billingSettings?.companyName || 'Company Name'}</p>
            <p className="text-gray-600 text-sm mt-1">{billingSettings?.address || ''}</p>
            <p className="text-gray-600 text-sm">{billingSettings?.phone || ''}</p>
            <p className="text-gray-600 text-sm">{billingSettings?.email || ''}</p>
          </div>

          {/* To */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="text-gray-900 font-semibold">{invoice.clientName}</p>
            <p className="text-gray-600 text-sm mt-1">{invoice.clientPhone}</p>
            {invoice.clientEmail && (
              <p className="text-gray-600 text-sm">{invoice.clientEmail}</p>
            )}
            {invoice.shipment && (
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-gray-600">Shipment Reference</p>
                <p className="text-sm font-medium text-gray-900">{invoice.shipment.referenceId}</p>
                {invoice.shipment.rackLocations && (
                  <>
                    <p className="text-xs text-gray-600 mt-1">Rack Locations</p>
                    <p className="text-sm font-medium text-gray-900">{invoice.shipment.rackLocations}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shipment Details Section - NEW */}
        {invoice.shipment && (
          <div className="p-8 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: templateSettings?.invoicePrimaryColor || billingSettings?.primaryColor || '#2563eb' }}
            >
              <span>📦</span> Shipment Details & Box Distribution
            </h3>
            
            {/* Shipment Info Grid */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">Shipment ID</p>
                <p className="text-sm font-bold text-gray-900">{invoice.shipment.qrCode || invoice.shipment.id}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">Total Boxes</p>
                <p className="text-sm font-bold text-gray-900">{invoice.shipment.originalBoxCount || invoice.shipment.boxes?.length || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">Arrival Date</p>
                <p className="text-sm font-bold text-gray-900">
                  {invoice.shipment.arrivalDate 
                    ? new Date(invoice.shipment.arrivalDate).toLocaleDateString() 
                    : invoice.shipment.receivedDate 
                    ? new Date(invoice.shipment.receivedDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">Days Stored</p>
                <p className="text-sm font-bold text-indigo-600">
                  {invoice.shipment.arrivalDate || invoice.shipment.receivedDate
                    ? Math.ceil((new Date().getTime() - new Date(invoice.shipment.arrivalDate || invoice.shipment.receivedDate).getTime()) / (1000 * 3600 * 24))
                    : 0} days
                </p>
              </div>
            </div>

            {/* Box Distribution by Rack */}
            {invoice.shipment.boxes && invoice.shipment.boxes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">📍 Box Distribution by Rack Location:</p>
                {(() => {
                  // Group boxes by rack
                  const rackGroups: Record<string, any[]> = {};
                  invoice.shipment.boxes.forEach((box: any) => {
                    if (box.rackId && box.rack) {
                      const rackKey = box.rack.code;
                      if (!rackGroups[rackKey]) {
                        rackGroups[rackKey] = [];
                      }
                      rackGroups[rackKey].push(box);
                    } else {
                      if (!rackGroups['Unassigned']) {
                        rackGroups['Unassigned'] = [];
                      }
                      rackGroups['Unassigned'].push(box);
                    }
                  });

                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(rackGroups).map(([rackCode, boxes]) => {
                        const isUnassigned = rackCode === 'Unassigned';
                        const rack = boxes[0]?.rack;
                        
                        return (
                          <div 
                            key={rackCode}
                            className={`border-2 rounded-lg p-3 bg-white ${
                              isUnassigned 
                                ? 'border-yellow-300' 
                                : 'border-green-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800">
                                  {isUnassigned ? '⏳' : '🗄️'} {isUnassigned ? 'Unassigned' : `Rack ${rackCode}`}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  isUnassigned 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {boxes.length} box{boxes.length !== 1 ? 'es' : ''}
                                </span>
                              </div>
                            </div>
                            {!isUnassigned && rack?.location && (
                              <p className="text-xs text-gray-600 mb-2">📍 {rack.location}</p>
                            )}
                            
                            {/* Box Numbers */}
                            <div className="flex flex-wrap gap-1">
                              {boxes.map((box: any) => (
                                <span
                                  key={box.id}
                                  className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-700"
                                  title={`Box #${box.boxNumber} - ${box.status}`}
                                >
                                  #{box.boxNumber}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Summary Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="bg-white border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Total Racks</p>
                    <p className="text-base font-bold text-gray-800">
                      {Object.keys(
                        invoice.shipment.boxes.reduce((acc: any, box: any) => {
                          if (box.rackId) acc[box.rackId] = true;
                          return acc;
                        }, {})
                      ).length}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Assigned</p>
                    <p className="text-base font-bold text-green-600">
                      {invoice.shipment.boxes.filter((b: any) => b.rackId).length}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Unassigned</p>
                    <p className="text-base font-bold text-yellow-600">
                      {invoice.shipment.boxes.filter((b: any) => !b.rackId).length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Line Items */}
        <div className="p-8 border-b">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">Qty</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">Unit Price</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">Tax</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-4 text-gray-900">
                    <div className="font-medium">{item.description}</div>
                    {item.notes && <div className="text-sm text-gray-500 mt-1">{item.notes}</div>}
                  </td>
                  <td className="py-4 text-right text-gray-900">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-900">{parseFloat(item.unitPrice).toFixed(3)}</td>
                  <td className="py-4 text-right text-gray-900">{parseFloat(item.taxAmount || 0).toFixed(3)}</td>
                  <td className="py-4 text-right text-gray-900 font-semibold">{parseFloat(item.amount).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-80">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-semibold">{parseFloat(invoice.subtotal).toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900 font-semibold">{parseFloat(invoice.taxAmount || 0).toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}</span>
              </div>
              <div className="flex justify-between py-3 border-b-2 border-gray-300">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{parseFloat(invoice.totalAmount).toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="p-8 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">{parseFloat(invoice.totalAmount).toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid Amount</p>
              <p className="text-xl font-bold text-green-600">{parseFloat(invoice.paidAmount || 0).toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance Due</p>
              <p className="text-xl font-bold text-red-600">{balance.toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${paymentProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{paymentProgress.toFixed(1)}% Paid</p>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="p-8 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Method</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Reference</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b">
                      <td className="px-4 py-3 text-gray-900">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{payment.paymentMethod}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{payment.transactionReference || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">
                        {parseFloat(payment.amount).toFixed(3)} {templateSettings?.currencySymbol || 'KWD'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bank Details */}
        {billingSettings?.bankDetails && (
          <div className="p-8 border-b bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bank Details</h3>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {billingSettings.bankDetails}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {(templateSettings?.invoiceTerms || billingSettings?.termsAndConditions) && (
          <div className="p-8 bg-gray-50">
            <h3 
              className="text-lg font-semibold mb-3"
              style={{ color: templateSettings?.invoicePrimaryColor || billingSettings?.primaryColor || '#2563eb' }}
            >
              Terms & Conditions
            </h3>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {templateSettings?.invoiceTerms || billingSettings.termsAndConditions}
            </div>
          </div>
        )}

        {/* Footer */}
        {(templateSettings?.invoiceShowFooter !== false) && (
        <div className="p-8 text-center border-t">
          <p className="text-sm text-gray-700 font-semibold mb-2">
            {templateSettings?.invoiceFooterText || 'Thank you for your business!'}
          </p>
          {templateSettings?.companyWebsite && (
            <p className="text-xs text-gray-500">{templateSettings.companyWebsite}</p>
          )}
        </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        invoice={invoice}
        onSuccess={loadInvoiceData}
      />
    </div>
  );
};

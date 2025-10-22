import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';

interface ReleaseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseData: {
    shipment: any;
    invoice: any;
    releaseDate: Date;
    releasedBy: string;
    collectorID: string;
    collectorName?: string;
    releaseType: 'FULL' | 'PARTIAL';
    boxesReleased: number;
    boxNumbers?: number[];
  };
  companyInfo?: any;
}

interface TemplateSettings {
  companyName?: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  releaseNoteTitle?: string;
  releaseNoteShowLogo?: boolean;
  releaseShowShipment?: boolean;
  releaseShowStorage?: boolean;
  releaseShowItems?: boolean;
  releaseShowCollector?: boolean;
  releaseShowCharges?: boolean;
  releaseShowTerms?: boolean;
  releaseShowSignatures?: boolean;
  releaseTerms?: string;
  releaseFooterText?: string;
  releasePrimaryColor?: string;
  releaseNoteHeaderBg?: string;
  currencySymbol?: string;
  dateFormat?: string;
  timeFormat?: string;
  showQRCode?: boolean;
  qrCodePosition?: string;
  qrCodeSize?: number;
}

export const ReleaseNoteModal: React.FC<ReleaseNoteModalProps> = ({
  isOpen,
  onClose,
  releaseData,
  companyInfo
}) => {
  const {
    shipment,
    invoice,
    releaseDate,
    releasedBy,
    collectorID,
    collectorName,
    releaseType,
    boxesReleased,
    boxNumbers
  } = releaseData;

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings | null>(null);

  // Load template settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/template-settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setTemplateSettings(data.settings);
        }
      } catch (error) {
        console.error('Failed to load template settings:', error);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Use template settings or defaults
  const settings = templateSettings || {};
  const primaryColor = settings.releasePrimaryColor || '#1e40af';
  const headerBg = settings.releaseNoteHeaderBg || primaryColor;
  const currency = settings.currencySymbol || 'KD';
  const dateFormatStr = settings.dateFormat || 'MMM dd, yyyy';
  const timeFormatStr = settings.timeFormat || 'hh:mm a';

  // Parse dates safely
  const parsedReleaseDate = releaseDate instanceof Date ? releaseDate : parseISO(releaseDate as string);
  const parsedArrivalDate = shipment.arrivalDate instanceof Date 
    ? shipment.arrivalDate 
    : parseISO(shipment.arrivalDate);
  
  // Calculate storage duration
  const storageDays = Math.ceil((parsedReleaseDate.getTime() - parsedArrivalDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* No-Print Header */}
        <div className="no-print sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Release Note Generated</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PrinterIcon className="h-5 w-5" />
              Print Release Note
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="release-note-content p-8 relative">
          {/* QR Code */}
          {settings.showQRCode && shipment && (
            <div className={`absolute ${(() => {
              const position = settings.qrCodePosition || 'TOP_RIGHT';
              const positions: Record<string, string> = {
                'TOP_RIGHT': 'top-4 right-4',
                'TOP_LEFT': 'top-4 left-4',
                'BOTTOM_RIGHT': 'bottom-4 right-4',
                'BOTTOM_LEFT': 'bottom-4 left-4'
              };
              return positions[position] || positions['TOP_RIGHT'];
            })()} z-10 bg-white p-2 rounded-lg shadow-md print:block`}>
              <QRCodeSVG
                value={`SHIPMENT-${shipment.shipmentNumber || shipment.id}`}
                size={settings.qrCodeSize || 100}
                level="M"
                includeMargin={true}
              />
            </div>
          )}
          
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2" style={{ borderColor: headerBg }}>
            {(settings.releaseNoteShowLogo !== false) && (settings.companyLogo || companyInfo?.logo) && (
              <img 
                src={settings.companyLogo || companyInfo?.logo} 
                alt="Logo" 
                className="h-16 mx-auto mb-2" 
              />
            )}
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {settings.companyName || companyInfo?.name || 'QGO Cargo'}
            </h1>
            <h2 className="text-xl text-gray-600 mt-2">
              {settings.releaseNoteTitle || 'SHIPMENT RELEASE NOTE'}
            </h2>
            {settings.companyAddress && (
              <p className="text-sm text-gray-600 mt-2">{settings.companyAddress}</p>
            )}
            {(settings.companyPhone || settings.companyEmail) && (
              <p className="text-sm text-gray-600">
                {settings.companyPhone && <span>{settings.companyPhone}</span>}
                {settings.companyPhone && settings.companyEmail && <span> | </span>}
                {settings.companyEmail && <span>{settings.companyEmail}</span>}
              </p>
            )}
          </div>

          {/* Document Info */}
          <div className="bg-gray-50 p-4 rounded mb-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold">Release Note #:</span>
                <span className="ml-2">RN-{format(parsedReleaseDate, 'yyyyMMdd-HHmmss')}</span>
              </div>
              <div>
                <span className="font-semibold">Date & Time:</span>
                <span className="ml-2">
                  {format(parsedReleaseDate, dateFormatStr)} - {format(parsedReleaseDate, timeFormatStr)}
                </span>
              </div>
              <div>
                <span className="font-semibold">Released By:</span>
                <span className="ml-2">{releasedBy}</span>
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          {settings.releaseShowShipment !== false && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>SHIPMENT DETAILS</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1"><span className="font-semibold">Shipment ID:</span> {shipment.qrCode}</p>
                <p className="mb-1"><span className="font-semibold">Reference:</span> {shipment.referenceId || 'N/A'}</p>
                <p className="mb-1"><span className="font-semibold">Client Name:</span> {shipment.clientName}</p>
                <p className="mb-1"><span className="font-semibold">Client Phone:</span> {shipment.clientPhone}</p>
              </div>
              <div>
                <p className="mb-1"><span className="font-semibold">Client Email:</span> {shipment.clientEmail || 'N/A'}</p>
                <p className="mb-1"><span className="font-semibold">Storage Type:</span> {shipment.type}</p>
                <p className="mb-1"><span className="font-semibold">Rack Locations:</span> {shipment.rackLocations || shipment.rack?.code || 'N/A'}</p>
                <p className="mb-1"><span className="font-semibold">Status:</span> <span className="text-green-600 font-semibold">RELEASED</span></p>
              </div>
            </div>
          </div>
          )}

          {/* Storage Information */}
          {settings.releaseShowStorage !== false && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>STORAGE INFORMATION</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-600">Received Date</p>
                <p className="text-gray-800">{shipment.receivedDate ? format(parseISO(shipment.receivedDate), 'MMM dd, yyyy') : 'N/A'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Arrival Date</p>
                <p className="text-gray-800">{shipment.arrivalDate ? format(parseISO(shipment.arrivalDate), 'MMM dd, yyyy') : format(parsedArrivalDate, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Release Date</p>
                <p className="text-gray-800">{format(parsedReleaseDate, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Storage Duration</p>
                <p className="text-gray-800 text-lg font-bold" style={{ color: primaryColor }}>{storageDays} days</p>
              </div>
            </div>
          </div>
          )}

          {/* Items Released */}
          {settings.releaseShowItems !== false && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>ITEMS RELEASED</h3>
            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div>
                <p className="font-semibold text-gray-600">Total Boxes</p>
                <p className="text-gray-800 text-lg">{shipment.originalBoxCount} boxes</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Release Type</p>
                <p className="text-gray-800 text-lg">{releaseType === 'FULL' ? 'FULL RELEASE' : 'PARTIAL RELEASE'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Boxes Released</p>
                <p className="text-gray-800 text-lg font-bold text-green-600">{boxesReleased} boxes</p>
              </div>
            </div>
            {boxNumbers && boxNumbers.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold text-gray-600 mb-1">Box Numbers Released:</p>
                <p className="text-gray-700 bg-gray-50 p-2 rounded font-mono">
                  {boxNumbers.join(', ')}
                </p>
              </div>
            )}
          </div>
          )}

          {/* Box Distribution by Rack - NEW SECTION */}
          {settings.releaseShowItems !== false && shipment.boxes && shipment.boxes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>📦 BOX DISTRIBUTION BY RACK</h3>
            <div className="text-xs text-gray-600 mb-3">
              Storage location details for each box before release
            </div>
            {(() => {
              // Group boxes by rack
              const rackGroups: Record<string, any[]> = {};
              shipment.boxes.forEach((box: any) => {
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
                <div className="space-y-3">
                  {Object.entries(rackGroups).map(([rackCode, boxes]) => {
                    const isUnassigned = rackCode === 'Unassigned';
                    const rack = boxes[0]?.rack;
                    
                    return (
                      <div 
                        key={rackCode}
                        className={`border-2 rounded-lg p-3 ${
                          isUnassigned 
                            ? 'border-yellow-300 bg-yellow-50' 
                            : 'border-green-300 bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-gray-800">
                                {isUnassigned ? '⏳ Unassigned' : `🗄️ Rack ${rackCode}`}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isUnassigned 
                                  ? 'bg-yellow-200 text-yellow-800' 
                                  : 'bg-green-200 text-green-800'
                              }`}>
                                {boxes.length} box{boxes.length !== 1 ? 'es' : ''}
                              </span>
                            </div>
                            {!isUnassigned && rack?.location && (
                              <p className="text-xs text-gray-600 mt-1">📍 {rack.location}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Box Numbers Grid */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {boxes.map((box: any) => (
                            <div
                              key={box.id}
                              className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                                box.status === 'IN_STORAGE' || box.status === 'RELEASED'
                                  ? 'bg-white border-2 border-gray-400 text-gray-800' 
                                  : 'bg-yellow-200 text-yellow-900'
                              }`}
                              title={`Box #${box.boxNumber} - ${box.status}`}
                            >
                              #{box.boxNumber}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            
            {/* Summary Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white border border-gray-300 rounded p-2 text-center">
                <p className="text-gray-600">Total Racks Used</p>
                <p className="text-lg font-bold text-gray-800">
                  {Object.keys(
                    shipment.boxes.reduce((acc: any, box: any) => {
                      if (box.rackId) acc[box.rackId] = true;
                      return acc;
                    }, {})
                  ).length}
                </p>
              </div>
              <div className="bg-white border border-gray-300 rounded p-2 text-center">
                <p className="text-gray-600">Assigned Boxes</p>
                <p className="text-lg font-bold text-green-600">
                  {shipment.boxes.filter((b: any) => b.rackId).length}
                </p>
              </div>
              <div className="bg-white border border-gray-300 rounded p-2 text-center">
                <p className="text-gray-600">Unassigned Boxes</p>
                <p className="text-lg font-bold text-yellow-600">
                  {shipment.boxes.filter((b: any) => !b.rackId).length}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Collector Information */}
          {settings.releaseShowCollector !== false && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>COLLECTOR INFORMATION</h3>
            <div className="grid grid-cols-2 gap-6 text-sm mb-4">
              <div>
                <p className="font-semibold text-gray-600 mb-1">Collector Name:</p>
                <p className="border-b-2 border-gray-400 pb-1 min-h-[28px]">{collectorName || '_________________________'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600 mb-1">ID Number:</p>
                <p className="text-gray-800 font-mono font-semibold">{collectorID}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Collector Signature:</p>
                <div className="border-b-2 border-gray-800 h-20"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Date:</p>
                <p className="border-b border-gray-400 pb-1">{format(parsedReleaseDate, 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>
          )}

          {/* Charges & Payment */}
          {settings.releaseShowCharges !== false && invoice && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>CHARGES & PAYMENT</h3>
              <table className="w-full text-sm">
                <tbody>
                  {invoice.lineItems?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1.5 text-gray-700">{item.description}</td>
                      <td className="text-right font-mono">{item.amount.toFixed(3)} {currency}</td>
                    </tr>
                  ))}
                  <tr className="border-t">
                    <td className="py-1.5 font-semibold">Subtotal</td>
                    <td className="text-right font-semibold font-mono">{invoice.subtotal.toFixed(3)} {currency}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Tax ({((invoice.taxAmount / invoice.subtotal) * 100).toFixed(1)}%)</td>
                    <td className="text-right font-mono">{invoice.taxAmount.toFixed(3)} {currency}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-800">
                    <td className="py-2 text-lg font-bold">TOTAL AMOUNT</td>
                    <td className="text-right text-lg font-bold font-mono">{invoice.totalAmount.toFixed(3)} {currency}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 bg-gray-50 p-3 rounded text-sm">
                <p className="mb-1"><span className="font-semibold">Invoice Number:</span> <span className="font-mono">{invoice.invoiceNumber}</span></p>
                <p>
                  <span className="font-semibold">Payment Status:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                    invoice.paymentStatus === 'PAID' 
                      ? 'bg-green-100 text-green-800' 
                      : invoice.paymentStatus === 'PENDING'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {invoice.paymentStatus}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {settings.releaseShowTerms !== false && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>TERMS & CONDITIONS</h3>
            {settings.releaseTerms ? (
              <div className="text-xs text-gray-700 whitespace-pre-wrap">{settings.releaseTerms}</div>
            ) : (
              <ul className="text-xs space-y-1 text-gray-700 ml-4">
                <li>• All items have been inspected and released in good condition</li>
                <li>• The company shall not be held liable for any items after the release date and time</li>
                <li>• Payment must be completed within the specified due date on the invoice</li>
                <li>• This document serves as official proof of shipment release and receipt</li>
                <li>• Any disputes must be raised within 24 hours of release</li>
              </ul>
            )}
          </div>
          )}

          {/* Authorization Signatures */}
          {settings.releaseShowSignatures !== false && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 pb-2 border-b" style={{ color: primaryColor }}>AUTHORIZATION SIGNATURES</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-sm font-semibold mb-6 text-gray-700">Released By (Company Staff)</p>
                <div className="border-b-2 border-gray-800 mb-2 h-16"></div>
                <p className="text-sm font-semibold">{releasedBy}</p>
                <p className="text-xs text-gray-600 mt-1">Date: {format(parsedReleaseDate, 'MMM dd, yyyy')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-6 text-gray-700">Received By (Collector)</p>
                <div className="border-b-2 border-gray-800 mb-2 h-16"></div>
                <p className="text-sm">{collectorName || '_________________________'}</p>
                <p className="text-xs text-gray-600 mt-1">Date: _________________</p>
              </div>
            </div>
          </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t-2" style={{ borderColor: headerBg }}>
            <p className="text-lg font-semibold mb-2" style={{ color: primaryColor }}>
              {settings.releaseFooterText || 'Thank you for your business!'}
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>{settings.companyAddress || companyInfo?.address || 'Kuwait'}</p>
              <p>
                {settings.companyPhone && <>Phone: {settings.companyPhone}</>}
                {settings.companyPhone && settings.companyEmail && <> | </>}
                {settings.companyEmail && <>Email: {settings.companyEmail}</>}
              </p>
              {settings.companyWebsite && <p>Website: {settings.companyWebsite}</p>}
            </div>
            <p className="text-xs text-gray-500 mt-3">Generated on {format(new Date(), `${dateFormatStr} ${timeFormatStr}`)}</p>
          </div>
        </div>

        {/* No-Print Footer Actions */}
        <div className="no-print sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 justify-center">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
          >
            <PrinterIcon className="h-5 w-5" />
            Print Release Note
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Close
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .release-note-content,
          .release-note-content * {
            visibility: visible;
          }
          .release-note-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

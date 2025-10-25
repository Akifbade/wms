import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface BoxQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  shipmentRef: string;
}

interface Box {
  id: string;
  boxNumber: number;
  qrCode: string;
  status: string;
  rack?: {
    code: string;
    location: string;
  };
}

export default function BoxQRModal({ isOpen, onClose, shipmentId, shipmentRef }: BoxQRModalProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && shipmentId) {
      loadBoxes();
    }
  }, [isOpen, shipmentId]);

  const loadBoxes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/boxes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        
        if (!data.boxes || data.boxes.length === 0) {
          setError('No boxes found for this shipment');
          setLoading(false);
          return;
        }
        
        setBoxes(data.boxes);
        
        // Generate QR code images
        const images: Record<string, string> = {};
        for (const box of data.boxes) {
          images[box.id] = await QRCode.toDataURL(box.qrCode, { width: 200 });
        }
        setQrImages(images);
      }
    } catch (err) {
      console.error('Failed to load boxes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      IN_STORAGE: 'bg-green-100 text-green-800 border-green-300',
      RELEASED: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return badges[status] || badges.PENDING;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg print:hidden">
          <div>
            <h2 className="text-2xl font-bold">📦 Individual Box QR Codes</h2>
            <p className="text-indigo-100 text-sm mt-1">Shipment: {shipmentRef}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading box QR codes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-gray-700 font-semibold text-lg">{error}</p>
              <p className="text-gray-500 text-sm mt-2">Boxes will be created when shipment is saved</p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">📦</div>
              <p className="text-gray-500">No boxes found for this shipment</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex justify-between items-center print:hidden">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Total Boxes: {boxes.length}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Each box has its own unique QR code for scanning
                  </p>
                </div>
                <button
                  onClick={handlePrintAll}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print All QR Codes
                </button>
              </div>

              {/* QR Codes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {boxes.map(box => (
                  <div 
                    key={box.id} 
                    className="border-2 border-gray-200 rounded-lg p-4 text-center hover:border-indigo-400 transition print:border print:border-black print:break-inside-avoid"
                  >
                    {/* Box Number */}
                    <div className="bg-indigo-100 text-indigo-800 font-bold text-lg rounded-md py-2 mb-3">
                      Box #{box.boxNumber}
                    </div>

                    {/* QR Code */}
                    {qrImages[box.id] && (
                      <img 
                        src={qrImages[box.id]} 
                        alt={`Box ${box.boxNumber} QR`}
                        className="mx-auto mb-3"
                      />
                    )}

                    {/* QR Code Text */}
                    <p className="text-xs text-gray-600 font-mono break-all mb-2">
                      {box.qrCode}
                    </p>

                    {/* Status */}
                    <div className={`text-xs font-semibold px-2 py-1 rounded border inline-block ${getStatusBadge(box.status)}`}>
                      {box.status}
                    </div>

                    {/* Rack Info */}
                    {box.rack && (
                      <div className="mt-2 text-xs text-gray-600">
                        📍 {box.rack.code} - {box.rack.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {boxes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg font-semibold">No boxes found</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t rounded-b-lg print:hidden">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
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
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border {
            border: 1px solid #000 !important;
          }
          .print\\:break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}


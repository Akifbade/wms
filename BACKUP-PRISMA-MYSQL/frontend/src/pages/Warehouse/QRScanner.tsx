import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  QrCodeIcon,
  DocumentTextIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface QRScannerProps {}

interface ScanResult {
  type: 'piece' | 'rack' | 'shipment' | 'unknown';
  data: any;
}



export const QRScanner: React.FC<QRScannerProps> = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<Array<{ qr: string; timestamp: Date; result?: ScanResult }>>([]);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanning = () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scannerRef.current = new Html5QrcodeScanner("qr-reader", config, false);
    
    scannerRef.current.render(
      (decodedText) => {
        handleScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Handle scan failure - usually just means no QR code found
        console.log('Scan error:', errorMessage);
      }
    );
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  };

  const handleScanSuccess = async (qrCode: string) => {
    if (qrCode === lastScan) return; // Prevent duplicate scans

    setLastScan(qrCode);
    setLoading(true);
    setError(null);

    // Add to scan history
    const historyEntry = { qr: qrCode, timestamp: new Date() };
    setScanHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10 scans

    try {
      const response = await fetch('/api/warehouse/qr-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ qrCode })
      });

      if (!response.ok) {
        throw new Error('Failed to process QR code');
      }

      const result = await response.json();
      setScanResult(result);
      
      // Update history with result
      setScanHistory(prev => 
        prev.map((entry, index) => 
          index === 0 ? { ...entry, result } : entry
        )
      );

      if (result.type === 'unknown') {
        setError('QR code not recognized or not found in system');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'piece':
        return <CubeIcon className="h-6 w-6 text-blue-500" />;
      case 'rack':
        return <BuildingStorefrontIcon className="h-6 w-6 text-green-500" />;
      case 'shipment':
        return <DocumentTextIcon className="h-6 w-6 text-purple-500" />;
      default:
        return <XMarkIcon className="h-6 w-6 text-red-500" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'piece':
        return 'bg-blue-50 border-blue-200';
      case 'rack':
        return 'bg-green-50 border-green-200';
      case 'shipment':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const renderScanResult = () => {
    if (!scanResult) return null;

    const { type, data } = scanResult;

    if (type === 'unknown') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XMarkIcon className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="font-medium text-red-900">Unknown QR Code</h3>
              <p className="text-sm text-red-700">This QR code is not recognized in the warehouse system.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`border rounded-lg p-4 ${getResultColor(type)}`}>
        <div className="flex items-start space-x-3">
          {getResultIcon(type)}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 capitalize">{type} Information</h3>
            
            {type === 'piece' && data.shipment && (
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Shipment:</span>
                  <p className="text-sm text-gray-900">{data.shipment.referenceId}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Piece Number:</span>
                  <p className="text-sm text-gray-900">#{data.pieceNumber}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Shipper:</span>
                  <p className="text-sm text-gray-900">{data.shipment.shipper}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Consignee:</span>
                  <p className="text-sm text-gray-900">{data.shipment.consignee}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                    {data.shipment.status}
                  </span>
                </div>
                {data.shipment.rack && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Rack:</span>
                    <p className="text-sm text-gray-900">{data.shipment.rack.code}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'rack' && (
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Rack Code:</span>
                  <p className="text-sm text-gray-900">{data.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Capacity:</span>
                  <p className="text-sm text-gray-900">{data.capacityUsed}/{data.capacityTotal}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">QR Code:</span>
                  <p className="text-sm text-gray-900 font-mono">{data.qrCode}</p>
                </div>
                {data.boxes && data.boxes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Stored Items:</span>
                    <p className="text-sm text-gray-900">{data.boxes.length} box(es)</p>
                  </div>
                )}
              </div>
            )}

            {type === 'shipment' && (
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Barcode:</span>
                  <p className="text-sm text-gray-900 font-mono">{data.referenceId}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Shipper:</span>
                  <p className="text-sm text-gray-900">{data.shipper}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Consignee:</span>
                  <p className="text-sm text-gray-900">{data.consignee}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Boxes:</span>
                  <p className="text-sm text-gray-900">{data.originalBoxCount} pieces</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                    {data.status}
                  </span>
                </div>
                {data.warehouseData && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Weight:</span>
                    <p className="text-sm text-gray-900">{data.warehouseData.weight} kg</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center">
            <QrCodeIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">QR Code Scanner</h1>
              <p className="text-sm text-gray-600">Scan warehouse QR codes for shipments, pieces, and racks</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Camera Scanner</h2>
                <button
                  onClick={isScanning ? stopScanning : startScanning}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    isScanning 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  {isScanning ? 'Stop Scanner' : 'Start Scanner'}
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {isScanning ? (
                  <div>
                    <div id="qr-reader" style={{ width: '100%' }}></div>
                    {loading && (
                      <div className="mt-4 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Processing scan...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">QR Scanner Ready</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click "Start Scanner" to begin scanning QR codes
                    </p>
                  </div>
                )}
              </div>

              {/* Last Scan Result */}
              {scanResult && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Scan Result</h3>
                  {renderScanResult()}
                </div>
              )}
            </div>

            {/* Scan History Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Scans</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scanHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No scans yet</p>
                  </div>
                ) : (
                  scanHistory.map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {entry.result && getResultIcon(entry.result.type)}
                            <span className="text-sm font-mono text-gray-900">{entry.qr}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {formatDate(entry.timestamp)}
                          </div>
                          {entry.result && entry.result.type !== 'unknown' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {entry.result.type}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* QR Code Types Info */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Supported QR Code Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CubeIcon className="h-4 w-4 text-blue-500" />
                <div>
                  <span className="font-medium">Piece QR</span>
                  <p className="text-gray-600">PIECE_WH24101312345_001</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <BuildingStorefrontIcon className="h-4 w-4 text-green-500" />
                <div>
                  <span className="font-medium">Rack QR</span>
                  <p className="text-gray-600">RACK_A_01_01</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="h-4 w-4 text-purple-500" />
                <div>
                  <span className="font-medium">Shipment QR</span>
                  <p className="text-gray-600">WH_WH24101312345</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

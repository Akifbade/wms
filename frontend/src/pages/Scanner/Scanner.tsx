import { useState, useEffect, useRef } from 'react';
import { 
  QrCodeIcon, 
  CameraIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Html5Qrcode } from 'html5-qrcode';
import { shipmentsAPI, racksAPI } from '../../services/api';

type ScanType = 'rack' | 'shipment' | 'unknown';

interface ScanResult {
  type: ScanType;
  data: any;
  rawCode: string;
}

export const Scanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [pendingShipment, setPendingShipment] = useState<any>(null);
  const [boxQuantity, setBoxQuantity] = useState<number>(0);
  const [remainingBoxes, setRemainingBoxes] = useState<number>(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError('');
      setScanning(true);
      
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}  // onScanFailure
      );
    } catch (err: any) {
      setError('❌ Camera access denied. Please allow camera permission.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error('Scanner stop error:', err);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScanning();
    
    setLoading(true);
    try {
      const result = await processScanCode(decodedText);
      setScanResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setError(err.message || 'Failed to process scan');
    } finally {
      setLoading(false);
    }
  };

  const processScanCode = async (code: string): Promise<ScanResult> => {
    if (code.toUpperCase().includes('RACK') || code.match(/^R-[A-Z]-\d+$/i)) {
      const response = await racksAPI.getAll({ search: code });
      const rack = response.racks?.find((r: any) => r.code.toUpperCase() === code.toUpperCase());
      if (rack) return { type: 'rack', data: rack, rawCode: code };
    }
    
    // Check if it's a box QR code (QR-SH-timestamp-BOX-1)
    if (code.includes('-BOX-')) {
      const masterQR = code.split('-BOX-')[0]; // Get QR-SH-timestamp part
      const response = await shipmentsAPI.getAll({ search: masterQR });
      const shipment = response.shipments?.find((s: any) => 
        s.qrCode && masterQR.includes(s.qrCode)
      );
      if (shipment) {
        // Fetch box information to get remaining unassigned boxes
        const boxResponse = await fetch(`http://localhost:5000/api/shipments/${shipment.id}/boxes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const boxData = await boxResponse.json();
        const unassignedBoxes = boxData.boxes.filter((b: any) => !b.rackId).length;
        setRemainingBoxes(unassignedBoxes);
        return { type: 'shipment', data: { ...shipment, remainingBoxes: unassignedBoxes }, rawCode: code };
      }
    }
    
    const response = await shipmentsAPI.getAll({ search: code });
    const shipment = response.shipments?.find((s: any) => 
      s.referenceId.toUpperCase() === code.toUpperCase()
    );
    if (shipment) {
      // Fetch remaining boxes for regular shipment scan too
      const boxResponse = await fetch(`http://localhost:5000/api/shipments/${shipment.id}/boxes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const boxData = await boxResponse.json();
      const unassignedBoxes = boxData.boxes.filter((b: any) => !b.rackId).length;
      setRemainingBoxes(unassignedBoxes);
      return { type: 'shipment', data: { ...shipment, remainingBoxes: unassignedBoxes }, rawCode: code };
    }
    
    return { type: 'unknown', data: null, rawCode: code };
  };

  const assignShipmentToRack = async () => {
    if (!pendingShipment || !scanResult || scanResult.type !== 'rack') return;
    
    if (!boxQuantity || boxQuantity <= 0) {
      setError('Please enter how many boxes to assign');
      return;
    }

    if (boxQuantity > remainingBoxes) {
      setError(`Only ${remainingBoxes} boxes remaining!`);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get all unassigned boxes
      const boxResponse = await fetch(`http://localhost:5000/api/shipments/${pendingShipment.id}/boxes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const boxData = await boxResponse.json();
      const unassignedBoxes = boxData.boxes.filter((b: any) => !b.rackId);
      
      // Take first N boxes based on quantity
      const boxNumbers = unassignedBoxes.slice(0, boxQuantity).map((b: any) => b.boxNumber);
      
      // Assign boxes to rack
      await fetch(`http://localhost:5000/api/shipments/${pendingShipment.id}/assign-boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rackId: scanResult.data.id,
          boxNumbers
        })
      });
      
      // Update shipment status if all boxes assigned
      if (boxQuantity === remainingBoxes) {
        await shipmentsAPI.update(pendingShipment.id, { status: 'IN_STORAGE' });
      }
      
      alert(`✅ ${boxQuantity} boxes assigned to ${scanResult.data.code}!`);
      setPendingShipment(null);
      setScanResult(null);
      setBoxQuantity(0);
      setRemainingBoxes(0);
    } catch (err: any) {
      setError(err.message || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setError('');
    setPendingShipment(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 QR Scanner</h1>
        <p className="text-gray-600 text-lg">Scan Racks & Shipments | مسح الرفوف والشحنات</p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
          <XCircleIcon className="h-6 w-6 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xl">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
            
            {scanning && (
              <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-primary-600 mb-2">📸 Scanning...</h3>
                  <p className="text-gray-600">ضع رمز الاستجابة السريعة في الإطار</p>
                </div>
                <div id={qrCodeRegionId} className="mx-auto"></div>
                <button
                  onClick={stopScanning}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  Stop Camera / إيقاف الكاميرا
                </button>
              </div>
            )}

            {!scanning && !scanResult && !loading && (
              <div className="p-12 text-center space-y-6">
                <div className="mx-auto w-64 h-64 border-4 border-dashed border-primary-300 rounded-3xl flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
                  <QrCodeIcon className="h-32 w-32 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h3>
                  <p className="text-gray-600 text-lg">جاهز للمسح</p>
                </div>
                <button
                  onClick={startScanning}
                  className="inline-flex items-center gap-3 px-10 py-5 bg-primary-600 text-white text-xl font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <CameraIcon className="h-7 w-7" />
                  Start Camera
                </button>
              </div>
            )}

            {loading && (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Processing scan...</p>
              </div>
            )}

            {scanResult && !loading && (
              <div className="p-8 space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircleIcon className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-1">Scan Successful! ✅</h3>
                  <p className="text-gray-600 font-mono text-lg">{scanResult.rawCode}</p>
                </div>

                {scanResult.type === 'rack' && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <CubeIcon className="h-8 w-8 text-blue-600" />
                      <h4 className="text-xl font-bold text-blue-900">Rack Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-lg">
                      <div>
                        <span className="text-gray-600">Code:</span>
                        <p className="font-bold">{scanResult.data.code}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <p className="font-bold">{scanResult.data.location}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Section:</span>
                        <p className="font-bold">{scanResult.data.section}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <p className="font-bold">{scanResult.data.capacityUsed} / {scanResult.data.capacity}</p>
                      </div>
                    </div>
                    
                    {pendingShipment && (
                      <div className="mt-6 pt-6 border-t-2 border-blue-300">
                        <p className="text-blue-900 font-semibold mb-4">
                          📦 Assign "{pendingShipment.referenceId}" to this rack?
                        </p>
                        
                        <div className="mb-4 bg-white p-4 rounded-lg border-2 border-blue-300">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            How Many Boxes to Assign? 📦
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={remainingBoxes}
                            value={boxQuantity || ''}
                            onChange={(e) => setBoxQuantity(parseInt(e.target.value) || 0)}
                            placeholder={`Max: ${remainingBoxes} boxes`}
                            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            💡 Remaining: {remainingBoxes} boxes | Enter quantity (1-{remainingBoxes})
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={assignShipmentToRack}
                            disabled={loading || !boxQuantity}
                            className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg"
                          >
                            ✅ Confirm Assignment
                          </button>
                          <button
                            onClick={() => {
                              setPendingShipment(null);
                              setBoxQuantity(0);
                              setRemainingBoxes(0);
                            }}
                            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {scanResult.type === 'shipment' && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <ArchiveBoxIcon className="h-8 w-8 text-purple-600" />
                      <h4 className="text-xl font-bold text-purple-900">Shipment Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-lg">
                      <div>
                        <span className="text-gray-600">Reference:</span>
                        <p className="font-bold">{scanResult.data.referenceId}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Client:</span>
                        <p className="font-bold">{scanResult.data.clientName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Boxes:</span>
                        <p className="font-bold">{scanResult.data.currentBoxCount}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Remaining:</span>
                        <p className="font-bold text-blue-600">{scanResult.data.remainingBoxes || 0} 📦</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <p className="font-bold">{scanResult.data.status}</p>
                      </div>
                    </div>
                    
                    {(scanResult.data.status === 'PENDING' || scanResult.data.remainingBoxes > 0) && (
                      <div className="mt-6 pt-6 border-t-2 border-purple-300">
                        <button
                          onClick={() => {
                            setPendingShipment(scanResult.data);
                            setBoxQuantity(scanResult.data.remainingBoxes || 0);
                            setScanResult(null);
                            startScanning();
                          }}
                          className="w-full py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold text-lg"
                        >
                          📍 Scan Rack to Assign ({scanResult.data.remainingBoxes} boxes left)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {scanResult.type === 'unknown' && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                    <XCircleIcon className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-yellow-900 font-semibold text-lg">QR code not found in system</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      startScanning();
                    }}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold flex items-center justify-center gap-2"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    Scan Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Recent Scans
            </h3>
            <div className="space-y-2">
              {scanHistory.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No scans yet</p>
              ) : (
                scanHistory.map((scan, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    {scan.type === 'rack' ? (
                      <CubeIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    ) : scan.type === 'shipment' ? (
                      <ArchiveBoxIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />
                    ) : (
                      <QrCodeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="font-mono text-sm flex-1 truncate">{scan.rawCode}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Tips</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Scan shipment first</li>
              <li>• Then scan rack to assign</li>
              <li>• Keep QR code steady</li>
              <li>• Good lighting helps</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

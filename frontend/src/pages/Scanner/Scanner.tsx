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
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'scanner' | 'list'>('scanner');
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [selectedShipmentForRack, setSelectedShipmentForRack] = useState<any>(null);
  const [showRackSelection, setShowRackSelection] = useState(false);
  
  // Pallet + Box assignment states
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedRackForAssignment, setSelectedRackForAssignment] = useState<any>(null);
  const [palletQuantity, setPalletQuantity] = useState<number>(0);
  const [looseBoxQuantity, setLooseBoxQuantity] = useState<number>(0);
  const [assignmentPhotos, setAssignmentPhotos] = useState<File[]>([]);

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
      
      // Check if we have HTTPS or localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      const isSecureContext = window.isSecureContext || isHttps || isLocalhost;
      const currentUrl = window.location.href;
      
      console.log('🔒 Camera Security Check:', {
        isSecureContext,
        isLocalhost,
        isHttps,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        url: currentUrl,
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      });
      
      // FORCE HTTPS if not secure (and not localhost)
      if (!isSecureContext && window.location.protocol === 'http:' && !isLocalhost) {
        const httpsUrl = currentUrl.replace('http://', 'https://');
        throw new Error(`🔒 Camera requires HTTPS. Redirecting to: ${httpsUrl}`);
      }
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Your browser or connection does not support camera access. Please use HTTPS (https://qgocargo.cloud) and a modern browser like Chrome.');
      }
      
      // Set scanning true to render the div
      setScanning(true);
      
      // FORCE React to update DOM immediately - CRITICAL for mobile
      await new Promise(resolve => {
        // Use requestAnimationFrame to ensure React has flushed updates
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(undefined);
          });
        });
      });
      
      // Wait for DOM to update and div to be rendered - INCREASED wait time for mobile
      console.log('⏳ Waiting for DOM to render qr-reader element...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 300ms to 500ms for mobile
      
      // Check if qr-reader element exists (with retry) - MORE RETRIES for slow mobile
      let qrReaderElement = document.getElementById(qrCodeRegionId);
      let retries = 0;
      while (!qrReaderElement && retries < 10) { // Increased from 5 to 10 retries
        console.log(`⏳ Retry ${retries + 1}/10: Waiting for qr-reader element...`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Increased from 200ms to 300ms
        qrReaderElement = document.getElementById(qrCodeRegionId);
        retries++;
      }
      
      if (!qrReaderElement) {
        console.error('❌ QR reader element not found in DOM after 10 retries');
        console.error('DOM body:', document.body.innerHTML.substring(0, 500));
        console.error('📱 Mobile debugging - Current scanning state:', scanning);
        console.error('📱 Retry duration: 500ms initial + (10 × 300ms) = 3.5 seconds total');
        throw new Error('📱 Scanner container not ready after 10 retries (3.5 seconds). Please close this page completely and reopen, then try again. If issue persists, clear browser cache.');
      }
      
      console.log('✅ QR reader element found:', qrReaderElement);
      
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      // Request camera access first to get better error messages
      console.log('📹 Requesting camera access...');
      console.log('📱 Available constraints:', navigator.mediaDevices.getSupportedConstraints());
      
      try {
        // Try simpler constraints first
        console.log('🔍 Trying camera access with environment facing mode...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        console.log('✅ Camera access granted:', stream.getVideoTracks());
        console.log('📹 Video track settings:', stream.getVideoTracks()[0].getSettings());
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
      } catch (mediaErr: any) {
        console.error('❌ getUserMedia failed:', mediaErr);
        console.error('Error details:', {
          name: mediaErr.name,
          message: mediaErr.message,
          constraint: mediaErr.constraint,
          stack: mediaErr.stack
        });
        
        // Try without facingMode constraint as fallback
        if (mediaErr.name === 'OverconstrainedError' || mediaErr.constraint === 'facingMode') {
          console.log('⚠️ facingMode not supported, trying without constraint...');
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
              video: true 
            });
            console.log('✅ Camera access granted (fallback mode)');
            fallbackStream.getTracks().forEach(track => track.stop());
          } catch (fallbackErr) {
            console.error('❌ Fallback also failed:', fallbackErr);
            throw mediaErr; // Throw original error
          }
        } else {
          throw mediaErr; // Re-throw to handle in outer catch
        }
      }

      console.log('🚀 Starting html5-qrcode scanner...');
      
      // Try multiple camera configurations with proper fallback
      const cameraConfigs = [
        // Config 1: Back camera (environment)
        { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        // Config 2: Back camera (ideal, not required)
        { 
          facingMode: { ideal: 'environment' }
        },
        // Config 3: Any camera (no constraints)
        { 
          facingMode: 'user' 
        },
        // Config 4: Most basic (any camera)
        'environment' as any
      ];
      
      let scannerStarted = false;
      let lastError: any = null;
      
      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          console.log(`🔄 Trying camera config ${i + 1}/${cameraConfigs.length}:`, cameraConfigs[i]);
          
          await html5QrCode.start(
            cameraConfigs[i],
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            onScanSuccess,
            () => {}  // onScanFailure
          );
          
          console.log(`✅ Scanner started successfully with config ${i + 1}`);
          scannerStarted = true;
          break;
        } catch (configErr: any) {
          console.warn(`⚠️ Config ${i + 1} failed:`, configErr.message);
          lastError = configErr;
          
          // Try to stop scanner if partially started
          try {
            await html5QrCode.stop();
          } catch (e) {
            // Ignore stop errors
          }
        }
      }
      
      if (!scannerStarted) {
        console.error('❌ All camera configs failed');
        throw lastError || new Error('Failed to start scanner with any camera configuration');
      }
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      console.error('📱 MOBILE DEBUG - Error type:', typeof err);
      console.error('📱 MOBILE DEBUG - Error constructor:', err?.constructor?.name);
      console.error('📱 MOBILE DEBUG - Error toString:', err?.toString());
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        type: typeof err,
        constructor: err?.constructor?.name,
        keys: Object.keys(err || {}),
        stringified: JSON.stringify(err, null, 2)
      });
      
      // Extract error info from various sources
      const errorName = err?.name || err?.constructor?.name || typeof err;
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      
      console.error('📱 EXTRACTED - Name:', errorName, 'Message:', errorMessage);
      
      let errorMsg = '❌ Camera access failed';
      let solution = 'Try reloading the page';
      
      // Check for HTTPS requirement
      if (errorMessage?.includes('HTTPS') || errorMessage?.includes('https://') || errorMessage?.includes('Redirecting')) {
        errorMsg = '🔒 Camera requires HTTPS';
        solution = `Current URL: ${window.location.href}\n\n✅ Use HTTPS: https://qgocargo.cloud\n\nCamera access only works on secure connections (HTTPS).`;
      } 
      // Permission denied
      else if (errorName === 'NotAllowedError' || errorMessage?.includes('Permission denied') || errorMessage?.includes('permission') || errorMessage?.includes('not allowed')) {
        errorMsg = '❌ Camera permission denied';
        solution = `📱 MOBILE FIX (Android/iPhone):
1. Tap the 🔒 lock icon in the address bar
2. Tap "Permissions" or "Site settings"
3. Find "Camera" → Change to "Allow"
4. Refresh this page

💻 DESKTOP FIX:
Chrome: Click 🔒 → Site settings → Camera → Allow
Safari: Safari menu → Preferences → Websites → Camera → Allow
Firefox: Click 🔒 → Clear permissions → Reload (will ask again)

🔄 Then REFRESH the page!`;
      } 
      // No camera found
      else if (errorName === 'NotFoundError' || errorMessage?.includes('not found') || errorMessage?.includes('No camera')) {
        errorMsg = '❌ No camera detected';
        solution = 'Make sure your device has a working camera and it\'s not disabled in system settings.';
      } 
      // Camera in use
      else if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorMessage?.includes('in use') || errorMessage?.includes('being used')) {
        errorMsg = '❌ Camera is busy';
        solution = 'Close other apps using the camera (WhatsApp, Zoom, Skype, etc.) and try again.';
      } 
      // Constraints not supported
      else if (errorName === 'OverconstrainedError' || errorMessage?.includes('constraint')) {
        errorMsg = '❌ Camera settings not supported';
        solution = 'Your camera doesn\'t support the required settings. Try using a different device or browser.';
      } 
      // Not supported/API not available
      else if (errorName === 'NotSupportedError' || errorName === 'TypeError' || errorMessage?.includes('not available') || errorMessage?.includes('not supported')) {
        errorMsg = '❌ Camera API not supported';
        solution = `Your browser doesn't support camera access.\n\n✅ Recommended:\n- Chrome (Desktop/Mobile)\n- Safari (iPhone/iPad)\n- Edge (Desktop)\n\n🔒 Make sure you're using: https://qgocargo.cloud`;
      } 
      // Insecure context
      else if (errorMessage?.includes('insecure context') || errorMessage?.includes('secure origin')) {
        errorMsg = '🔒 Insecure connection';
        solution = `Camera requires HTTPS.\n\n✅ Use: https://qgocargo.cloud\n❌ Don't use: http://qgocargo.cloud`;
      }
      // Html5Qrcode specific errors
      else if (errorMessage?.includes('QR code parse error') || errorMessage?.includes('NotFoundException')) {
        errorMsg = '❌ Camera started but QR code not detected';
        solution = 'Camera is working! Position a QR code in front of the camera to scan.';
      }
      // DOM/Element errors
      else if (errorMessage?.includes('not ready') || errorMessage?.includes('not found') || errorMessage?.includes('element')) {
        errorMsg = '❌ Scanner initialization failed';
        solution = '📱 Try this:\n1. Close this tab completely\n2. Clear browser cache (Settings → Privacy → Clear cache)\n3. Reopen https://qgocargo.cloud/scanner\n4. Try again';
      }
      // Generic/unknown error
      else {
        errorMsg = `❌ Camera error: ${errorName}`;
        solution = `Error: ${errorMessage}\n\n💡 Troubleshooting:\n1. ✅ Make sure you're using HTTPS: https://qgocargo.cloud\n2. 📷 Allow camera permissions when browser asks\n3. 🌐 Try Chrome browser (best for camera)\n4. 📱 Check if camera works in other apps (like WhatsApp)\n5. 🔄 Reload the page and try again\n6. 🔒 Check browser settings: Site Settings → Camera → Allow\n7. 📞 If still not working, contact support with error: ${errorName}`;
      }
      
      setError(`${errorMsg}\n\n💡 Solution:\n${solution}`);
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
        const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
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
      const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
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
      const boxResponse = await fetch(`/api/shipments/${pendingShipment.id}/boxes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const boxData = await boxResponse.json();
      const unassignedBoxes = boxData.boxes.filter((b: any) => !b.rackId);
      
      // Take first N boxes based on quantity
      const boxNumbers = unassignedBoxes.slice(0, boxQuantity).map((b: any) => b.boxNumber);
      
      // Assign boxes to rack
      await fetch(`/api/shipments/${pendingShipment.id}/assign-boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          rackId: scanResult.data.id,
          boxNumbers
        })
      });
      
      // Update shipment status if all boxes assigned
      if (boxQuantity === remainingBoxes) {
        await fetch(`/api/shipments/${pendingShipment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ status: 'IN_STORAGE' })
        });
      }
      
      alert(`✅ ${boxQuantity} boxes assigned to ${scanResult.data.code}!\n📊 Rack capacity updated. Check Racks page for current status.`);
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

  // Load pending shipments (including PARTIAL status)
  const loadPendingShipments = async () => {
    try {
      setLoading(true);
      console.log('Loading pending shipments...');
      const token = localStorage.getItem('authToken');
      // Fetch both PENDING and PARTIAL status shipments
      const response = await fetch('/api/shipments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded shipments:', data);
        const shipments = data.shipments || data || [];
        
        // Filter shipments to only show PENDING and PARTIAL status with unassigned boxes
        const shipmentsWithBoxes = await Promise.all(
          shipments
            .filter((s: any) => s.status === 'PENDING' || s.status === 'PARTIAL')
            .map(async (shipment: any) => {
              try {
                const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const boxData = await boxResponse.json();
                const unassignedBoxes = boxData.boxes.filter((b: any) => !b.rackId).length;
                const totalBoxes = boxData.boxes.length;
                return unassignedBoxes > 0 ? { 
                  ...shipment, 
                  remainingBoxes: unassignedBoxes,
                  totalBoxes: totalBoxes 
                } : null;
              } catch {
                return shipment; // Keep shipment if error checking boxes
              }
            })
        );
        
        const validShipments = shipmentsWithBoxes.filter((s: any) => s !== null);
        console.log('Shipments with unassigned boxes (PENDING + PARTIAL):', validShipments);
        setAllShipments(validShipments);
        setFilteredShipments(validShipments);
      } else {
        console.error('Failed to load shipments:', response.status);
        setError(`Failed to load shipments: ${response.status}`);
      }
    } catch (err) {
      console.error('Error loading shipments:', err);
      setError('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  // Handle rack selection from pending list - NOW OPENS ASSIGNMENT MODAL
  const handleRackSelectionFromList = async (shipment: any, rack: any) => {
    try {
      setLoading(true);
      
      // Get box count and shipment details
      const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const boxData = await boxResponse.json();
      const unassignedBoxes = boxData.boxes.filter((b: any) => !b.rackId).length;
      
      // Calculate pallet info
      const boxesPerPallet = shipment.boxesPerPallet || 0;
      const totalPallets = boxesPerPallet > 0 ? Math.floor(unassignedBoxes / boxesPerPallet) : 0;
      const looseBoxes = boxesPerPallet > 0 ? unassignedBoxes % boxesPerPallet : unassignedBoxes;
      
      // Set selected shipment and rack
      setSelectedShipmentForRack({
        ...shipment,
        remainingBoxes: unassignedBoxes,
        totalPallets,
        looseBoxes,
        boxesPerPallet
      });
      setSelectedRackForAssignment(rack);
      
      // Set initial quantities
      setPalletQuantity(totalPallets);
      setLooseBoxQuantity(looseBoxes);
      
      // Hide rack selection and show assignment modal
      setShowRackSelection(false);
      setShowAssignmentModal(true);
      
    } catch (err) {
      setError('Failed to load rack/shipment details');
    } finally {
      setLoading(false);
    }
  };

  // Select shipment from list - show rack selection
  const handleSelectShipment = async (shipment: any) => {
    console.log('🎯 Choose Rack clicked for shipment:', shipment);
    console.log('📦 Current racks:', racks);
    setSelectedShipmentForRack(shipment);
    setShowRackSelection(true);
    console.log('✅ Rack selection enabled');
  };

  // Load racks for rack map
  const loadRacks = async () => {
    try {
      console.log('Loading racks...');
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/racks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded racks response:', data);
        // Backend returns { racks: [...] }
        const racksArray = data.racks || data || [];
        console.log('Racks array:', racksArray);
        setRacks(Array.isArray(racksArray) ? racksArray : []);
      } else {
        console.error('Failed to load racks:', response.status);
        setRacks([]);
      }
    } catch (err) {
      console.error('Error loading racks:', err);
      setRacks([]);
    }
  };

  // Confirm pallet + box assignment to rack
  const handleConfirmAssignment = async () => {
    if (!selectedShipmentForRack || !selectedRackForAssignment) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Calculate total boxes to assign
      const boxesPerPallet = selectedShipmentForRack.boxesPerPallet || 0;
      const totalBoxesToAssign = (palletQuantity * boxesPerPallet) + looseBoxQuantity;
      
      console.log('🎯 Assigning:', {
        pallets: palletQuantity,
        looseBoxes: looseBoxQuantity,
        totalBoxes: totalBoxesToAssign,
        rack: selectedRackForAssignment.code,
        shipment: selectedShipmentForRack.referenceId,
        photos: assignmentPhotos.length
      });

      // Upload photos first if any
      let photoUrls: string[] = [];
      if (assignmentPhotos.length > 0) {
        for (const photo of assignmentPhotos) {
          const formData = new FormData();
          formData.append('photo', photo);
          
          const uploadRes = await fetch('/api/shipments/upload/photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            photoUrls.push(uploadData.photoUrl);
          }
        }
        console.log('📸 Uploaded photos:', photoUrls);
      }
      
      // Assign boxes to rack with photos
      const response = await fetch(`/api/shipments/${selectedShipmentForRack.id}/assign-rack`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rackId: selectedRackForAssignment.id,
          quantity: totalBoxesToAssign,
          pallets: palletQuantity,
          looseBoxes: looseBoxQuantity,
          photos: photoUrls
        })
      });
      
      if (response.ok) {
        // Success - refresh lists and close modal
        alert(`✅ Successfully assigned ${palletQuantity} pallets + ${looseBoxQuantity} boxes to ${selectedRackForAssignment.code}${photoUrls.length > 0 ? ` with ${photoUrls.length} photos` : ''}`);
        setShowAssignmentModal(false);
        setPalletQuantity(0);
        setLooseBoxQuantity(0);
        setAssignmentPhotos([]);
        loadPendingShipments();
        loadRacks();
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to assign boxes to rack');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign boxes to rack');
    } finally {
      setLoading(false);
    }
  };

  // Load shipments and racks when switching to list tab
  useEffect(() => {
    if (activeTab === 'list') {
      loadPendingShipments();
      loadRacks();
    }
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 Warehouse Scanner</h1>
        <p className="text-gray-600 text-lg">مسح المستودع | مسح أو بحث يدوي</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow-md border-2 border-gray-200">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg transition-all ${
            activeTab === 'scanner'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📸 QR Scanner<br />
          <span className="text-sm font-normal">مسح QR | الكاميرا</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-4 px-6 rounded-lg font-bold text-lg transition-all ${
            activeTab === 'list'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📋 Pending List + Racks<br />
          <span className="text-sm font-normal">قائمة الانتظار | خريطة الرفوف</span>
        </button>
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
          {/* SCANNER TAB */}
          {activeTab === 'scanner' && (
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
                {/* HTTPS Warning if not secure */}
                {window.location.protocol === 'http:' && (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-red-900 font-bold text-lg">🔒 Camera Requires HTTPS</p>
                    </div>
                    <p className="text-red-700 mb-3">Camera access only works on secure connections.</p>
                    <button
                      onClick={() => {
                        const httpsUrl = window.location.href.replace('http://', 'https://');
                        window.location.href = httpsUrl;
                      }}
                      className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ✅ Switch to HTTPS Now
                    </button>
                  </div>
                )}

                <div className="mx-auto w-64 h-64 border-4 border-dashed border-primary-300 rounded-3xl flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
                  <QrCodeIcon className="h-32 w-32 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h3>
                  <p className="text-gray-600 text-lg">جاهز للمسح</p>
                  {window.location.protocol === 'https:' && (
                    <p className="text-green-600 text-sm mt-2">✅ Secure Connection (HTTPS)</p>
                  )}
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
                        <p className="font-bold">{scanResult.data.capacityUsed || 0} / {scanResult.data.capacityTotal || 0}</p>
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
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              max={remainingBoxes}
                              value={boxQuantity || ''}
                              onChange={(e) => setBoxQuantity(parseInt(e.target.value) || 0)}
                              placeholder={`Max: ${remainingBoxes} boxes`}
                              className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => setBoxQuantity(remainingBoxes)}
                              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold whitespace-nowrap"
                            >
                              📦 All
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            💡 Remaining: {remainingBoxes} boxes | Enter quantity or click "All" button
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
          )}

          {/* PENDING SHIPMENTS LIST TAB WITH INLINE RACK SELECTION */}
          {/* Manual Entry Tab Removed - Racks shown inline when clicking Choose Rack button */}
          {false && <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">⌨️ Manual Entry</h2>
                <p className="text-gray-600 text-lg">إدخال الرمز يدويًا | Rack Map Below</p>
              </div>

              <div className="space-y-6 max-w-4xl mx-auto">
                <div>
                  <label className="block text-xl font-bold text-gray-900 mb-3">
                    Enter Code | أدخل الرمز
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="SH-12345 or R-A-001 | الشحنة أو الرف"
                    className="w-full px-6 py-5 text-2xl font-mono border-4 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-500 focus:border-primary-500 text-center uppercase"
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                  />
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    💡 Example: SH-12345 (Shipment) or R-A-001 (Rack)
                  </p>
                </div>

                <button
                  onClick={handleManualSearch}
                  disabled={loading || !manualCode.trim()}
                  className="w-full py-6 bg-primary-600 text-white text-2xl font-bold rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-white"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      🔍 Search | بحث
                    </>
                  )}
                </button>

                {scanResult && (
                  <div className="mt-8 p-6 bg-green-50 border-4 border-green-300 rounded-xl">
                    <p className="text-green-900 font-bold text-xl mb-3">✅ Found!</p>
                    <p className="text-gray-700 text-lg">
                      {scanResult.type === 'rack' ? '🏢 Rack' : '📦 Shipment'}: {scanResult.rawCode}
                    </p>
                  </div>
                )}

                {/* Rack Map Section */}
                <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-blue-900">
                      🗺️ Rack Map | خريطة الرفوف
                    </h3>
                    <button
                      onClick={loadRacks}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {racks && racks.length > 0 ? racks.map((rack) => (
                      <div
                        key={rack.id}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${rack.status === 'AVAILABLE' 
                            ? 'bg-green-100 border-green-400 hover:bg-green-200' 
                            : rack.status === 'FULL'
                            ? 'bg-red-100 border-red-400 opacity-60'
                            : 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200'
                          }
                        `}
                        onClick={() => {
                          if (rack.status !== 'FULL') {
                            setManualCode(rack.code);
                          }
                        }}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900">{rack.code}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {rack.location}
                          </div>
                          <div className="mt-2">
                            {rack.status === 'AVAILABLE' && (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                ✓ Available
                              </span>
                            )}
                            {rack.status === 'OCCUPIED' && (
                              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                                ⚡ In Use
                              </span>
                            )}
                            {rack.status === 'FULL' && (
                              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                                ✕ Full
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full text-center text-gray-500 py-8">
                        <p className="text-lg font-semibold">No racks found | لم يتم العثور على رفوف</p>
                        <p className="text-sm mt-2">Click Refresh button or create racks from Dashboard</p>
                        <p className="text-xs mt-2 text-gray-400">Debug: racks = {JSON.stringify(racks)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t-4 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-700 mb-3">Quick Guide | دليل سريع</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>📦 <strong>Shipment:</strong> Type reference like SH-12345</li>
                    <li>🏢 <strong>Rack:</strong> Type code like R-A-001</li>
                    <li>🗺️ <strong>Click Rack:</strong> Auto-fills code from map | انقر لملء الرمز</li>
                    <li>⌨️ <strong>Press Enter</strong> to search quickly</li>
                    <li>� Green = Available | 🟡 Yellow = In Use | 🔴 Red = Full</li>
                  </ul>
                </div>
              </div>
            </div>}

          {/* PENDING SHIPMENTS LIST TAB */}
          {activeTab === 'list' && (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200">
              <div className="p-6 border-b-2 border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 Pending Shipments</h2>
                <p className="text-gray-600">الشحنات في انتظار التخزين</p>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-lg">Loading shipments...</p>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="p-12 text-center">
                  <ArchiveBoxIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-xl font-semibold">No Pending Shipments</p>
                  <p className="text-gray-400 mt-2">لا توجد شحنات في الانتظار</p>
                  <p className="text-sm text-gray-400 mt-4">Create a new shipment from Dashboard to see it here</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-gray-200">
                  {filteredShipments.map((shipment) => (
                    <div key={shipment.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-primary-600">
                              {shipment.referenceId}
                            </span>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                              shipment.status === 'PARTIAL' 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {shipment.status === 'PARTIAL' ? '🔄 PARTIAL' : '⏳ PENDING'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-lg">
                            <div>
                              <span className="text-gray-500">Client:</span>
                              <p className="font-semibold text-gray-900">{shipment.clientName}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Boxes:</span>
                              <p className="font-semibold text-gray-900">
                                {shipment.remainingBoxes || 0} / {shipment.totalBoxes || shipment.currentBoxCount || 0} 📦
                                {shipment.status === 'PARTIAL' && (
                                  <span className="text-sm text-orange-600 ml-2">
                                    ({shipment.remainingBoxes} remaining)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {shipment.notes && (
                            <p className="text-gray-600 text-sm">📝 {shipment.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSelectShipment(shipment)}
                          className="px-8 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl text-lg whitespace-nowrap"
                        >
                          📍 Choose Rack<br />
                          <span className="text-sm font-normal">اختر الرف</span>
                        </button>
                      </div>

                      {/* Show Rack Selection when shipment is selected */}
                      {showRackSelection && selectedShipmentForRack?.id === shipment.id && (
                        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                          <h4 className="text-lg font-bold text-blue-900 mb-3">
                            🗺️ Select Rack | اختر الرف
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {racks && racks.length > 0 ? racks.map((rack) => (
                              <button
                                key={rack.id}
                                onClick={() => handleRackSelectionFromList(shipment, rack)}
                                disabled={rack.status === 'FULL'}
                                className={`
                                  p-3 rounded-lg font-bold text-xs transition-all text-left
                                  ${rack.status === 'AVAILABLE' 
                                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                                    : rack.status === 'FULL'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                  }
                                `}
                              >
                                <div className="font-bold text-sm">{rack.code}</div>
                                <div className="text-xs opacity-90 mt-1">
                                  📦 {rack.capacityUsed || 0}/{rack.capacityTotal || 0}
                                </div>
                              </button>
                            )) : (
                              <p className="col-span-full text-gray-500 text-center py-4">No racks available</p>
                            )}
                          </div>
                          <button
                            onClick={() => setShowRackSelection(false)}
                            className="mt-3 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                          >
                            Cancel | إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6 bg-gray-50 border-t-2 border-gray-200 text-center">
                <button
                  onClick={loadPendingShipments}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
                >
                  🔄 Refresh List | تحديث القائمة
                </button>
              </div>
            </div>
          )}
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

      {/* PALLET + BOX ASSIGNMENT MODAL */}
      {showAssignmentModal && selectedShipmentForRack && selectedRackForAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-5">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircleIcon className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Scan Successful! ✅</h2>
              </div>
              <p className="text-lg font-semibold">{selectedRackForAssignment.code}</p>
            </div>

            {/* Rack Information */}
            <div className="p-6 bg-blue-50 border-b-2 border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                📦 Rack Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Code:</span>
                  <p className="text-xl font-bold text-gray-900">{selectedRackForAssignment.code}</p>
                </div>
                <div>
                  <span className="text-gray-600">Location:</span>
                  <p className="text-xl font-bold text-gray-900">{selectedRackForAssignment.location || 'Section B, Row 2'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Section:</span>
                  <p className="text-xl font-bold text-gray-900">{selectedRackForAssignment.section || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Capacity:</span>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedRackForAssignment.capacityUsed || 0} / {selectedRackForAssignment.capacityTotal || 100}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-purple-900 mb-2 flex items-center gap-2">
                  📦 Assign "{selectedShipmentForRack.referenceId}" to this rack?
                </h3>
                <p className="text-gray-600">
                  Client: <strong>{selectedShipmentForRack.clientName}</strong>
                </p>
              </div>

              {/* Pallet + Box Selection */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                <h4 className="text-lg font-bold text-purple-900 mb-4">
                  📦 How Many to Assign?
                </h4>
                
                {/* Available Info */}
                <div className="bg-white rounded-lg p-4 mb-4 border-2 border-purple-300">
                  <p className="text-sm text-gray-600 mb-2">Available for assignment:</p>
                  <div className="flex items-center gap-6 text-lg">
                    {selectedShipmentForRack.totalPallets > 0 && (
                      <div>
                        <span className="font-bold text-purple-700">{selectedShipmentForRack.totalPallets} Pallets</span>
                        <span className="text-gray-500 text-sm ml-2">
                          ({selectedShipmentForRack.boxesPerPallet} boxes each)
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-blue-700">{selectedShipmentForRack.looseBoxes} Loose Boxes</span>
                    </div>
                  </div>
                </div>

                {/* Pallet Input */}
                {selectedShipmentForRack.totalPallets > 0 && (
                  <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">
                      🎁 Pallets to Assign:
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPalletQuantity(Math.max(0, palletQuantity - 1))}
                        className="w-12 h-12 bg-red-500 text-white rounded-lg font-bold text-xl hover:bg-red-600"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={selectedShipmentForRack.totalPallets}
                        value={palletQuantity}
                        onChange={(e) => setPalletQuantity(Math.min(selectedShipmentForRack.totalPallets, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="flex-1 text-center text-2xl font-bold border-2 border-purple-300 rounded-lg px-4 py-3"
                      />
                      <button
                        onClick={() => setPalletQuantity(Math.min(selectedShipmentForRack.totalPallets, palletQuantity + 1))}
                        className="w-12 h-12 bg-green-500 text-white rounded-lg font-bold text-xl hover:bg-green-600"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setPalletQuantity(selectedShipmentForRack.totalPallets)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                      >
                        🎯 All
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      ⚡ Max: {selectedShipmentForRack.totalPallets} pallets | 
                      Remaining: {selectedShipmentForRack.totalPallets - palletQuantity} pallets
                    </p>
                  </div>
                )}

                {/* Loose Box Input */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    📦 Loose Boxes to Assign:
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLooseBoxQuantity(Math.max(0, looseBoxQuantity - 1))}
                      className="w-12 h-12 bg-red-500 text-white rounded-lg font-bold text-xl hover:bg-red-600"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={selectedShipmentForRack.looseBoxes}
                      value={looseBoxQuantity}
                      onChange={(e) => setLooseBoxQuantity(Math.min(selectedShipmentForRack.looseBoxes, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="flex-1 text-center text-2xl font-bold border-2 border-blue-300 rounded-lg px-4 py-3"
                    />
                    <button
                      onClick={() => setLooseBoxQuantity(Math.min(selectedShipmentForRack.looseBoxes, looseBoxQuantity + 1))}
                      className="w-12 h-12 bg-green-500 text-white rounded-lg font-bold text-xl hover:bg-green-600"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setLooseBoxQuantity(selectedShipmentForRack.looseBoxes)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                    >
                      🎯 All
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    ⚡ Max: {selectedShipmentForRack.looseBoxes} boxes | 
                    Remaining: {selectedShipmentForRack.looseBoxes - looseBoxQuantity} boxes
                  </p>
                </div>

                {/* Total Summary */}
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-400">
                  <p className="text-gray-700 font-semibold mb-2">Total to assign:</p>
                  <div className="flex items-center gap-4 text-xl font-bold">
                    {palletQuantity > 0 && (
                      <span className="text-purple-700">
                        {palletQuantity} Pallet{palletQuantity > 1 ? 's' : ''} 
                        <span className="text-sm text-gray-600 ml-1">
                          ({palletQuantity * (selectedShipmentForRack.boxesPerPallet || 0)} boxes)
                        </span>
                      </span>
                    )}
                    {looseBoxQuantity > 0 && (
                      <span className="text-blue-700">+ {looseBoxQuantity} Box{looseBoxQuantity > 1 ? 'es' : ''}</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-green-700 mt-2">
                    = {(palletQuantity * (selectedShipmentForRack.boxesPerPallet || 0)) + looseBoxQuantity} Total Boxes
                  </p>
                </div>

                {/* Photo Upload Section */}
                <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-300">
                  <h4 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                    📸 Upload Photos (Optional - Max 10)
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Take photos of pallets/boxes for reference
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length + assignmentPhotos.length > 10) {
                        alert('Maximum 10 photos allowed');
                        return;
                      }
                      setAssignmentPhotos([...assignmentPhotos, ...files]);
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  
                  <label
                    htmlFor="photo-upload"
                    className="block w-full px-6 py-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 cursor-pointer text-center transition-all"
                  >
                    📷 Take/Select Photos ({assignmentPhotos.length}/10)
                  </label>

                  {/* Photo Preview */}
                  {assignmentPhotos.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {assignmentPhotos.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-purple-300"
                          />
                          <button
                            onClick={() => setAssignmentPhotos(assignmentPhotos.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setPalletQuantity(0);
                    setLooseBoxQuantity(0);
                  }}
                  className="flex-1 px-6 py-4 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-all text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={loading || (palletQuantity === 0 && looseBoxQuantity === 0)}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 transition-all text-lg shadow-lg"
                >
                  ✅ Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

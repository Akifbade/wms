import { useState, useEffect, useRef, useCallback } from 'react';
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
import ShipmentDetailModal from '../../components/ShipmentDetailModal';

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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; size: string } | null>(null);

  // Shipment Details Modal state
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  const [selectedShipmentForDetails, setSelectedShipmentForDetails] = useState<any>(null);

  // Move Shipment Modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveShipmentData, setMoveShipmentData] = useState<any>(null);
  const [moveDestinationRack, setMoveDestinationRack] = useState<string>('');
  const [moveDestinationRackCode, setMoveDestinationRackCode] = useState<string>('');
  const [scanningForDestination, setScanningForDestination] = useState(false);
  const destinationScannerRef = useRef<Html5Qrcode | null>(null);
  const [moveReason, setMoveReason] = useState<string>('');
  const [moveAuthorizedBy, setMoveAuthorizedBy] = useState<string>('');
  const [moveNotes, setMoveNotes] = useState<string>('');
  const [movePhotos, setMovePhotos] = useState<File[]>([]);
  const [movingInProgress, setMovingInProgress] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [loadingMoveHistory, setLoadingMoveHistory] = useState(false);

  // Manual Move Modal state (without scanning)
  const [showManualMoveModal, setShowManualMoveModal] = useState(false);
  const [inStorageShipments, setInStorageShipments] = useState<any[]>([]);
  const [selectedManualShipment, setSelectedManualShipment] = useState<string>('');
  const [selectedSourceRack, setSelectedSourceRack] = useState<string>('');
  const [loadingInStorageShipments, setLoadingInStorageShipments] = useState(false);
  const [palletsToMove, setPalletsToMove] = useState<number>(0);
  const [looseBoxesToMove, setLooseBoxesToMove] = useState<number>(0);

  // Manual code input state
  const [manualCode, setManualCode] = useState<string>('');

  // ✅ Duplicate prevention: Track last scanned code and timestamp
  const lastScanRef = useRef<{ code: string; timestamp: number } | null>(null);
  const SCAN_COOLDOWN_MS = 3000; // 3 seconds cooldown between same QR scans

  // 🔊 Sound alerts - Create shared audio context
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Helper to calculate pallet box counts from palletDetails
  const getPalletBoxCount = useCallback(
    (details: any[] | undefined, palletCount: number, fallbackPerPallet: number = 0) => {
      console.log('🔍 getPalletBoxCount called:', { details, palletCount, fallbackPerPallet });

      if (!palletCount) return 0;

      if (details && details.length > 0) {
        const sorted = [...details].sort((a, b) => (a?.palletNumber || 0) - (b?.palletNumber || 0));
        const selected = sorted.slice(0, Math.min(palletCount, details.length));
        const total = selected.reduce((sum, detail) => sum + (detail?.boxCount || 0), 0);

        console.log('✅ Using palletDetails:', { sorted, selected, total });
        return total;
      }

      const fallback = palletCount * fallbackPerPallet;
      console.log('⚠️ Using fallback calculation:', { palletCount, fallbackPerPallet, fallback });
      return fallback;
    },
    []
  );

  const playSuccessSound = () => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // High pitch for success
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      console.log('Sound playback failed:', err);
    }
  };

  const playErrorSound = () => {
    try {
      const audioContext = getAudioContext();

      // Play 3 loud error beeps
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 200; // Low pitch for error
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
        }, i * 500); // 500ms between beeps
      }
    } catch (err) {
      console.log('Error sound playback failed:', err);
    }
  };

  const playWarningSound = () => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 400; // Medium pitch for warning
      oscillator.type = 'triangle';
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (err) {
      console.log('Warning sound playback failed:', err);
    }
  };

  // 📸 Compress photo for mobile upload (reduce 10MB → 500KB)
  const compressPhoto = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions 1920x1920 (keeps quality but reduces size)
          const maxSize = 1920;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                console.log(`📸 Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(compressedFile);
              } else {
                resolve(file); // Fallback to original
              }
            },
            'image/jpeg',
            0.85 // 85% quality (good balance)
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Fetch authorized users (MANAGER, ADMIN) for move authorization
  const fetchAuthorizedUsers = async () => {
    try {
      const response = await fetch('/api/users/authorized', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });
      const data = await response.json();
      if (data.success) {
        setAuthorizedUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch authorized users:', error);
    }
  };

  // Fetch move history for a shipment
  const fetchMoveHistory = async (shipmentId: string) => {
    setLoadingMoveHistory(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/move-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });
      const data = await response.json();
      if (data.success) {
        setMoveHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to fetch move history:', error);
    } finally {
      setLoadingMoveHistory(false);
    }
  };

  // Handle move shipment between racks
  const handleMoveShipment = async () => {
    if (!moveShipmentData || !moveDestinationRack || !moveReason || !moveAuthorizedBy) {
      setError('Please fill in all required fields');
      return;
    }

    setMovingInProgress(true);
    try {
      // Upload photos first if any
      const uploadedPhotoUrls: string[] = [];
      for (const photo of movePhotos) {
        const formData = new FormData();
        const compressedPhoto = await compressPhoto(photo);
        formData.append('photo', compressedPhoto);

        const uploadResponse = await fetch('/api/shipments/upload/photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: formData
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          uploadedPhotoUrls.push(uploadData.photoUrl);
        }
      }

      // Get box IDs from the shipment
      const boxIds = moveShipmentData.boxes
        ?.filter((b: any) => b.rackId === moveShipmentData.sourceRackId)
        .map((b: any) => b.id) || [];

      if (boxIds.length === 0) {
        setError('No boxes found to move');
        setMovingInProgress(false);
        return;
      }

      // Call move API
      const response = await fetch(`/api/shipments/${moveShipmentData.id}/move-boxes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceRackId: moveShipmentData.sourceRackId,
          destinationRackId: moveDestinationRack,
          boxIds,
          reason: moveReason,
          authorizedById: moveAuthorizedBy,
          notes: moveNotes,
          photos: uploadedPhotoUrls
        })
      });

      const data = await response.json();
      if (data.success) {
        playSuccessSound();
        // Reset modal state
        setShowMoveModal(false);
        setMoveShipmentData(null);
        setMoveDestinationRack('');
        setMoveDestinationRackCode('');
        setScanningForDestination(false);
        setMoveReason('');
        setMoveAuthorizedBy('');
        setMoveNotes('');
        setMovePhotos([]);
        setScanResult(null);

        // Show success message
        setError(`✅ Successfully moved ${data.moveDetails.boxesMoved} boxes from ${data.moveDetails.from.code} to ${data.moveDetails.to.code}`);
        setTimeout(() => setError(''), 5000);
      } else {
        throw new Error(data.error || 'Move failed');
      }
    } catch (error: any) {
      playErrorSound();
      setError(`❌ Move failed: ${error.message}`);
    } finally {
      setMovingInProgress(false);
    }
  };

  // Open move modal with shipment data
  const openMoveModal = (shipmentData: any) => {
    // Find the rack this shipment is currently in
    const assignedBox = shipmentData.boxes?.find((b: any) => b.rackId);
    const sourceRackId = assignedBox?.rackId;
    const sourceRackCode = assignedBox?.rack?.code || 'Unknown';

    setMoveShipmentData({
      ...shipmentData,
      sourceRackId,
      sourceRackCode
    });
    setShowMoveModal(true);
    fetchAuthorizedUsers();
  };

  // Fetch IN_STORAGE shipments for manual move
  const fetchInStorageShipments = async () => {
    setLoadingInStorageShipments(true);
    try {
      const response = await fetch('/api/shipments?status=IN_STORAGE&status=IN_WAREHOUSE', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });
      const data = await response.json();
      // Filter shipments that have assigned boxes
      const shipmentsWithRacks = (data.shipments || []).filter((s: any) =>
        s.status === 'IN_STORAGE' || s.status === 'IN_WAREHOUSE'
      );
      setInStorageShipments(shipmentsWithRacks);
    } catch (error) {
      console.error('Failed to fetch in-storage shipments:', error);
    } finally {
      setLoadingInStorageShipments(false);
    }
  };

  // Open manual move modal (without scanning)
  const openManualMoveModal = async () => {
    setShowManualMoveModal(true);
    setSelectedManualShipment('');
    setSelectedSourceRack('');
    setMoveDestinationRack('');
    setMoveDestinationRackCode('');
    setScanningForDestination(false);
    setMoveReason('');
    setMoveAuthorizedBy('');
    setMoveNotes('');
    setMovePhotos([]);
    // Load racks and shipments
    await Promise.all([fetchInStorageShipments(), fetchAuthorizedUsers(), loadRacks()]);
  };

  // Handle manual shipment selection - fetch boxes to get rack info
  const handleManualShipmentSelect = async (shipmentId: string) => {
    setSelectedManualShipment(shipmentId);
    setSelectedSourceRack('');

    if (!shipmentId) return;

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/boxes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });
      const data = await response.json();
      const boxes = data.boxes || [];

      // Group boxes by rack
      const rackGroups: Record<string, { rackId: string; rackCode: string; boxCount: number; boxes: any[] }> = {};
      boxes.forEach((box: any) => {
        if (box.rackId && box.rack) {
          if (!rackGroups[box.rackId]) {
            rackGroups[box.rackId] = {
              rackId: box.rackId,
              rackCode: box.rack.code,
              boxCount: 0,
              boxes: []
            };
          }
          rackGroups[box.rackId].boxCount++;
          rackGroups[box.rackId].boxes.push(box);
        }
      });

      // Find the selected shipment and add rack info
      const selectedShipment = inStorageShipments.find(s => s.id === shipmentId);
      if (selectedShipment) {
        setMoveShipmentData({
          ...selectedShipment,
          boxes,
          rackGroups: Object.values(rackGroups)
        });
      }
    } catch (error) {
      console.error('Failed to fetch shipment boxes:', error);
    }
  };

  // Handle manual move submission
  const handleManualMoveSubmit = async () => {
    if (!selectedManualShipment || !selectedSourceRack || !moveDestinationRack || !moveReason || !moveAuthorizedBy) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if any items to move
    if ((palletsToMove || 0) === 0 && (looseBoxesToMove || 0) === 0) {
      setError('Please select at least 1 pallet or box to move');
      return;
    }

    // Get box IDs from the selected source rack
    const rackGroup = moveShipmentData?.rackGroups?.find((rg: any) => rg.rackId === selectedSourceRack);
    if (!rackGroup) {
      setError('No boxes found in selected source rack');
      return;
    }

    // Calculate which boxes to move based on pallets/loose selection
    const boxesInRack = rackGroup.boxes || [];
    const palletGroups: Record<number, any[]> = {};
    const looseBoxes: any[] = [];

    boxesInRack.forEach((box: any) => {
      try {
        const pieceQR = typeof box.pieceQR === 'string' ? JSON.parse(box.pieceQR) : box.pieceQR;
        const palletNum = pieceQR?.palletNumber || 0;
        if (palletNum > 0) {
          if (!palletGroups[palletNum]) palletGroups[palletNum] = [];
          palletGroups[palletNum].push(box);
        } else {
          looseBoxes.push(box);
        }
      } catch {
        looseBoxes.push(box);
      }
    });

    // Select boxes to move
    const boxIdsToMove: string[] = [];

    // Add pallets (take first N pallets)
    const palletNums = Object.keys(palletGroups).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < (palletsToMove || 0) && i < palletNums.length; i++) {
      const palletNum = palletNums[i];
      palletGroups[palletNum].forEach(box => boxIdsToMove.push(box.id));
    }

    // Add loose boxes (take first N loose boxes)
    for (let i = 0; i < (looseBoxesToMove || 0) && i < looseBoxes.length; i++) {
      boxIdsToMove.push(looseBoxes[i].id);
    }

    if (boxIdsToMove.length === 0) {
      setError('No boxes selected to move');
      return;
    }

    setMovingInProgress(true);
    try {
      // Upload photos first if any
      const uploadedPhotoUrls: string[] = [];
      for (const photo of movePhotos) {
        const formData = new FormData();
        const compressedPhoto = await compressPhoto(photo);
        formData.append('photo', compressedPhoto);

        const uploadResponse = await fetch('/api/shipments/upload/photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: formData
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          uploadedPhotoUrls.push(uploadData.photoUrl);
        }
      }

      // Call move API with selected boxes
      const response = await fetch(`/api/shipments/${selectedManualShipment}/move-boxes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceRackId: selectedSourceRack,
          destinationRackId: moveDestinationRack,
          boxIds: boxIdsToMove,
          reason: moveReason,
          authorizedById: moveAuthorizedBy,
          notes: moveNotes,
          photos: uploadedPhotoUrls
        })
      });

      const data = await response.json();
      if (data.success) {
        playSuccessSound();
        setShowManualMoveModal(false);
        setMoveShipmentData(null);
        setSelectedManualShipment('');
        setSelectedSourceRack('');
        setMoveDestinationRack('');
        setMoveReason('');
        setMoveAuthorizedBy('');
        setMoveNotes('');
        setMovePhotos([]);
        setPalletsToMove(0);
        setLooseBoxesToMove(0);

        setError(`✅ Successfully moved ${data.moveDetails?.boxesMoved || boxIdsToMove.length} boxes from ${data.moveDetails?.from?.code || 'source'} to ${data.moveDetails?.to?.code || 'destination'}`);
        setTimeout(() => setError(''), 5000);
      } else {
        throw new Error(data.error || 'Move failed');
      }
    } catch (error: any) {
      playErrorSound();
      setError(`❌ Move failed: ${error.message}`);
    } finally {
      setMovingInProgress(false);
    }
  };

  // Start destination rack scanner
  const startDestinationScanner = async () => {
    try {
      // Wait for DOM element
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById('destination-qr-reader');
      if (!element) {
        console.error('Destination QR reader element not found');
        return;
      }

      // Stop existing scanner if any
      if (destinationScannerRef.current) {
        try {
          await destinationScannerRef.current.stop();
        } catch (e) {
          console.log('No scanner to stop');
        }
      }

      const scanner = new Html5Qrcode('destination-qr-reader');
      destinationScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        async (decodedText) => {
          console.log('🎯 Destination rack scanned:', decodedText);
          const upperCode = decodedText.toUpperCase();

          // Handle multiple QR formats:
          // Format 1: RACK_XXX -> extract XXX  
          // Format 2: QR-XXX -> extract XXX
          // Format 3: GROUND_B -> convert to GROUND-B (underscore to hyphen)
          // Format 4: Just the rack code like 8E, 7L, etc.
          let rackCode = decodedText
            .replace(/^RACK_/i, '')
            .replace(/^QR-/i, '');

          // Create hyphen version (GROUND_B -> GROUND-B)
          let rackCodeWithHyphen = rackCode.replace(/_/g, '-');
          // Create underscore version (GROUND-B -> GROUND_B)
          let rackCodeWithUnderscore = rackCode.replace(/-/g, '_');

          console.log('🔍 Scanned:', decodedText, '→ Hyphen:', rackCodeWithHyphen, '→ Underscore:', rackCodeWithUnderscore);

          // Find rack using EXACT same logic as processScanCode (which works!)
          let rack = null;

          // ALWAYS fetch from API first
          try {
            // Search with HYPHEN version first (since DB uses hyphens like GROUND-B)
            console.log('📡 Fetching rack from API with search:', rackCodeWithHyphen);
            let response = await racksAPI.getAll({ search: rackCodeWithHyphen });
            console.log('📊 API returned:', response.racks?.length, 'racks');

            // If no results, try original scanned text
            if (!response.racks || response.racks.length === 0) {
              console.log('📡 Retry with original text:', decodedText);
              response = await racksAPI.getAll({ search: decodedText });
              console.log('📊 Retry returned:', response.racks?.length, 'racks');
            }

            if (response.racks && response.racks.length > 0) {
              response.racks.forEach((r: any) => {
                console.log('  - Rack:', r.code, 'qrCode:', r.qrCode);
              });

              // Match by qrCode first
              rack = response.racks.find((r: any) =>
                r.qrCode?.toUpperCase() === upperCode ||
                r.qrCode?.toUpperCase() === rackCodeWithHyphen.toUpperCase() ||
                r.qrCode?.toUpperCase() === rackCodeWithUnderscore.toUpperCase()
              );

              // If not found by qrCode, try matching by code with all variations
              if (!rack) {
                rack = response.racks.find((r: any) => {
                  const dbCode = r.code.toUpperCase();
                  const dbCodeNormalized = dbCode.replace(/[-_]/g, '');
                  const scannedNormalized = upperCode.replace(/[-_]/g, '');

                  return dbCode === upperCode ||
                    dbCode === rackCodeWithHyphen.toUpperCase() ||
                    dbCode === rackCodeWithUnderscore.toUpperCase() ||
                    dbCodeNormalized === scannedNormalized ||
                    r.code.replace(/-/g, '_').toUpperCase() === upperCode ||
                    r.code.replace(/_/g, '-').toUpperCase() === upperCode;
                });
              }

              // Final fallback: take first rack if only one result
              if (!rack && response.racks.length === 1) {
                console.log('⚠️ Taking first rack as fallback');
                rack = response.racks[0];
              }
            }
          } catch (err) {
            console.error('❌ Error fetching rack from API:', err);
          }

          // Fallback to local racks array
          if (!rack) {
            console.log('📦 Trying local racks array, count:', racks.length);
            rack = racks.find(r => {
              const dbCode = r.code.toUpperCase();
              const scannedNormalized = upperCode.replace(/[-_]/g, '');
              const dbCodeNormalized = dbCode.replace(/[-_]/g, '');

              return r.qrCode?.toUpperCase() === upperCode ||
                dbCode === upperCode ||
                dbCode === rackCodeWithHyphen.toUpperCase() ||
                dbCode === rackCodeWithUnderscore.toUpperCase() ||
                dbCodeNormalized === scannedNormalized;
            });
          }

          if (rack) {
            console.log('✅ Found rack:', rack.code, 'ID:', rack.id);
            if (rack.id === moveShipmentData?.sourceRackId) {
              alert('Cannot move to the same rack!');
              return;
            }
            if (rack.status === 'FULL') {
              alert('This rack is full! Choose another rack.');
              return;
            }
            // Stop scanner and set values
            scanner.stop().then(() => {
              setMoveDestinationRack(rack.id);
              setMoveDestinationRackCode(rack.code);
              setScanningForDestination(false);
              playSuccessSound();
            }).catch(console.error);
          } else {
            console.error('❌ Rack not found. Scanned:', decodedText, 'Hyphen:', rackCodeWithHyphen, 'Underscore:', rackCodeWithUnderscore);
            alert('Rack not found!\n\nScanned: ' + decodedText + '\nTried: ' + rackCodeWithHyphen + '\n\nPlease use dropdown to select rack manually.');
          }
        },
        (errorMessage) => {
          // Ignore scan errors (no QR in frame)
        }
      );
    } catch (error) {
      console.error('Failed to start destination scanner:', error);
      alert('Failed to start camera. Please check camera permissions.');
      setScanningForDestination(false);
    }
  };

  // Stop destination scanner
  const stopDestinationScanner = async () => {
    if (destinationScannerRef.current) {
      try {
        await destinationScannerRef.current.stop();
        destinationScannerRef.current = null;
      } catch (e) {
        console.log('Error stopping destination scanner:', e);
      }
    }
    setScanningForDestination(false);
  };

  // Effect to start/stop destination scanner
  useEffect(() => {
    if (scanningForDestination) {
      startDestinationScanner();
    }
    return () => {
      if (destinationScannerRef.current) {
        destinationScannerRef.current.stop().catch(console.error);
      }
    };
  }, [scanningForDestination]);

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

      // Initialize audio context on user interaction (required by browsers)
      try {
        getAudioContext();
        console.log('🔊 Audio context initialized');
      } catch (err) {
        console.log('⚠️ Audio context initialization failed:', err);
      }

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

      // 📹 CRITICAL: Test camera access BEFORE starting html5-qrcode
      // This matches camera-test.html behavior which works perfectly
      console.log('📹 Step 1: Testing direct camera access (like camera-test.html)...');
      console.log('📱 Available constraints:', navigator.mediaDevices.getSupportedConstraints());

      let cameraWorks = false;

      // Test configs in order of preference
      const testConfigs = [
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'environment' } },
        { video: true }
      ];

      for (let i = 0; i < testConfigs.length; i++) {
        try {
          console.log(`🔍 Testing camera config ${i + 1}/${testConfigs.length}:`, testConfigs[i]);
          const testStream = await navigator.mediaDevices.getUserMedia(testConfigs[i]);
          console.log('✅ Camera test SUCCESS with config', i + 1);
          console.log('📹 Video track settings:', testStream.getVideoTracks()[0]?.getSettings());

          // Stop test stream immediately
          testStream.getTracks().forEach(track => track.stop());

          cameraWorks = true;
          break;
        } catch (testErr: any) {
          console.warn(`⚠️ Config ${i + 1} failed:`, testErr.name, testErr.message);
        }
      }

      if (!cameraWorks) {
        console.error('❌ Direct camera access failed - camera-test.html would also fail');
        throw new Error('Camera test failed - please check camera permissions and try camera-test.html first');
      }

      console.log('✅ Camera test passed! Now starting html5-qrcode with working constraints...');

      console.log('🚀 Step 2: Starting html5-qrcode with correct camera config...');

      // ✅ FIX: html5-qrcode.start() expects ONLY facingMode string OR deviceId string
      // NOT the full constraints object with width/height
      // Use the facingMode string directly
      const cameraConfig = { facingMode: 'environment' };

      try {
        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          onScanSuccess,
          () => { }  // onScanFailure - ignore, not an error
        );

        console.log('✅ html5-qrcode scanner started successfully!');
      } catch (html5Err: any) {
        console.error('❌ html5-qrcode.start() failed even though camera test passed!');
        console.error('This is an html5-qrcode library issue:', html5Err);
        throw html5Err;
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

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;

    setLoading(true);
    try {
      const result = await processScanCode(manualCode);

      if (result.type === 'unknown') {
        playErrorSound();
      } else if (result.data?.status === 'IN_STORAGE' && result.type === 'shipment') {
        playErrorSound();
      } else {
        playSuccessSound();
      }

      setScanResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]);
      setManualCode('');
    } catch (err: any) {
      playErrorSound();
      setError(err.message || 'Failed to process code');
    } finally {
      setLoading(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // ✅ DUPLICATE PREVENTION: Check if same code was scanned recently
    const now = Date.now();
    if (lastScanRef.current) {
      const { code: lastCode, timestamp: lastTime } = lastScanRef.current;
      const timeSinceLastScan = now - lastTime;

      if (lastCode === decodedText && timeSinceLastScan < SCAN_COOLDOWN_MS) {
        console.log(`🚫 Duplicate scan ignored: ${decodedText} (scanned ${Math.round(timeSinceLastScan / 1000)}s ago)`);
        playWarningSound();
        return; // Ignore duplicate scan
      }
    }

    // Update last scan tracking
    lastScanRef.current = { code: decodedText, timestamp: now };

    await stopScanning();

    setLoading(true);
    try {
      const result = await processScanCode(decodedText);

      // 🔊 Play appropriate sound based on result
      if (result.type === 'unknown') {
        playErrorSound(); // Loud 3-beep error
      } else if (result.data?.status === 'IN_STORAGE' && result.type === 'shipment') {
        playErrorSound(); // Already in storage - error sound
      } else {
        playSuccessSound(); // Success sound
      }

      setScanResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]);
    } catch (err: any) {
      playErrorSound();
      setError(err.message || 'Failed to process scan');
    } finally {
      setLoading(false);
    }
  };

  const validateAndReturnShipment = async (shipment: any, rawCode: string): Promise<ScanResult> => {
    // Get box information with cache-busting to ensure fresh data
    const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Cache-Control': 'no-cache'
      }
    });
    const boxData = await boxResponse.json();
    // ✅ CRITICAL: Filter out boxes that are assigned (have rackId) OR already in storage/released
    // A box is unassigned if: rackId is null/undefined AND status is not IN_STORAGE/RELEASED
    const unassignedBoxes = boxData.boxes.filter((b: any) => {
      const hasRackId = b.rackId !== null && b.rackId !== undefined && b.rackId !== '';
      const isInStorage = b.status === 'IN_STORAGE';
      const isReleased = b.status === 'RELEASED';
      const isAssigned = hasRackId || isInStorage || isReleased;
      return !isAssigned; // Return true if NOT assigned
    });

    console.log('🔍 validateAndReturnShipment - Box filtering:', {
      shipmentId: shipment.id,
      totalBoxes: boxData.boxes.length,
      assignedBoxes: boxData.boxes.filter((b: any) => b.rackId).length,
      unassignedBoxes: unassignedBoxes.length,
      boxDetails: boxData.boxes.map((b: any) => ({
        boxNumber: b.boxNumber,
        rackId: b.rackId,
        status: b.status,
        pieceQR: b.pieceQR
      }))
    });

    // ⚠️ CHECK: If shipment is IN_STORAGE or IN_WAREHOUSE and has 0 remaining boxes, it's already fully assigned
    if ((shipment.status === 'IN_STORAGE' || shipment.status === 'IN_WAREHOUSE') && unassignedBoxes.length === 0) {
      // Find which rack it's assigned to
      const assignedBoxes = boxData.boxes.filter((b: any) => b.rackId);
      const rackCodes = [...new Set(assignedBoxes.map((b: any) => b.rack?.code || 'Unknown'))];

      setError(`⛔ SHIPMENT ALREADY IN STORAGE!\n\nThis shipment is fully assigned to:\n${rackCodes.join(', ')}\n\nAll ${boxData.boxes.length} boxes are already stored.`);
      return {
        type: 'shipment',
        data: {
          ...shipment,
          remainingBoxes: 0,
          assignedRacks: rackCodes
        },
        rawCode
      };
    }

    // ✅ FIX: Calculate pallets based on ACTUAL pallet distribution, not fixed 20-box rule
    // Group unassigned boxes by palletNumber (stored in pieceQR JSON field)
    const palletGroups = unassignedBoxes.reduce((acc: Record<number, number>, box: any) => {
      let palletNum = 0; // Default: loose box

      // Try to parse palletNumber from pieceQR JSON field
      if (box.pieceQR) {
        try {
          const pieceData = JSON.parse(box.pieceQR);
          palletNum = pieceData.palletNumber || 0;
        } catch (e) {
          console.warn('Failed to parse pieceQR:', box.pieceQR);
        }
      }

      acc[palletNum] = (acc[palletNum] || 0) + 1;
      return acc;
    }, {});

    // Separate pallets (palletNumber > 0) from loose boxes (palletNumber = 0)
    const palletNumbers = Object.keys(palletGroups)
      .map(Number)
      .filter(num => num > 0)
      .sort((a, b) => a - b);

    const totalPallets = palletNumbers.length;
    const looseBoxes = palletGroups[0] || 0;

    // Build pallet details for display
    const palletDetails = palletNumbers.map(num => ({
      palletNumber: num,
      boxCount: palletGroups[num]
    }));

    setRemainingBoxes(unassignedBoxes.length);
    return {
      type: 'shipment',
      data: {
        ...shipment,
        remainingBoxes: unassignedBoxes.length,
        availablePallets: totalPallets,
        availableLooseBoxes: looseBoxes,
        palletDetails // NEW: Array of {palletNumber, boxCount}
      },
      rawCode
    };
  };

  const processScanCode = async (code: string): Promise<ScanResult> => {
    const upperCode = code.toUpperCase();

    // ✅ PRIORITY 1: Check for RACK_XXX or any rack-like format
    // Handles: RACK_A1_1, A1-1, A1_1, R-A-1, etc.
    if (upperCode.startsWith('RACK_') || upperCode.match(/^[A-Z]\d+[-_]\d+$/i) || upperCode.match(/^R-[A-Z]-\d+$/i)) {
      // Extract rack code (remove RACK_ prefix if present)
      const rackCode = code.replace(/^RACK_/i, '').replace(/_/g, '-');

      // Try exact match first
      const response = await racksAPI.getAll({ search: code });
      let rack = response.racks?.find((r: any) =>
        r.code.toUpperCase() === upperCode ||
        r.code.toUpperCase() === rackCode.toUpperCase() ||
        r.code.replace(/-/g, '_').toUpperCase() === upperCode ||
        r.code.replace(/-/g, '').toUpperCase() === upperCode.replace(/[-_]/g, '')
      );

      // If not found, try searching by extracted code
      if (!rack && rackCode !== code) {
        const response2 = await racksAPI.getAll({ search: rackCode });
        rack = response2.racks?.find((r: any) =>
          r.code.toUpperCase() === rackCode.toUpperCase() ||
          r.code.replace(/-/g, '_').toUpperCase() === rackCode.replace(/-/g, '_').toUpperCase()
        );
      }

      if (rack) return { type: 'rack', data: rack, rawCode: code };
    }

    // ✅ PRIORITY 3: Check for PALLET_SHIPMENTID_NUMBER format (simplified pallet QR)
    // Example: PALLET_cmhhm6gq1000132e5vadvqil_1
    if (upperCode.startsWith('PALLET_')) {
      console.log('🔍 Scanning pallet QR:', code);
      const parts = code.split('_');
      console.log('📦 Pallet QR parts:', parts);

      if (parts.length === 3) {
        const shipmentId = parts[1];
        console.log('🎯 Extracted shipmentId:', shipmentId);

        // Try 1: Direct shipment ID lookup
        try {
          console.log('🔍 Try 1: Direct API lookup for shipmentId:', shipmentId);
          const directResponse = await fetch(`/api/shipments/${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          });
          if (directResponse.ok) {
            const data = await directResponse.json();
            const shipment = data.shipment || data;
            console.log('✅ Found shipment via direct lookup:', shipment.referenceId);
            return await validateAndReturnShipment(shipment, code);
          } else {
            console.warn('❌ Direct lookup failed with status:', directResponse.status);
          }
        } catch (err) {
          console.warn('❌ Direct shipment lookup error:', err);
        }

        // Try 2: Search by shipment ID (this should work since ID is unique)
        console.log('🔍 Try 2: Search API for shipmentId:', shipmentId);
        const response = await shipmentsAPI.getAll({ search: shipmentId });
        console.log('📊 Search results:', response.shipments?.length, 'shipments found');

        const shipment = response.shipments?.find((s: any) => {
          const match = s.id === shipmentId || s.qrCode?.includes(shipmentId) || s.referenceId?.includes(shipmentId);
          console.log(`  - Checking ${s.referenceId}: id=${s.id === shipmentId}, qr=${s.qrCode?.includes(shipmentId)}, ref=${s.referenceId?.includes(shipmentId)} → ${match}`);
          return match;
        });

        if (shipment) {
          console.log('✅ Found shipment via search:', shipment.referenceId);
          return await validateAndReturnShipment(shipment, code);
        } else {
          console.error('❌ No shipment found matching ID:', shipmentId);
        }
      }

      // Try 3: Handle old PALLET-ID-NUM|S:base64 format (backwards compatibility)
      if (code.includes('|S:')) {
        const cleanCode = code.split('|S:')[0]; // Remove metadata
        const response = await shipmentsAPI.getAll({ search: cleanCode });
        const shipment = response.shipments?.[0]; // Take first match
        if (shipment) {
          return await validateAndReturnShipment(shipment, code);
        }
      }
    }

    // ✅ PRIORITY 4: Check for SHIPMENT_XXX format (simplified shipment master QR)
    if (upperCode.startsWith('SHIPMENT_')) {
      const response = await shipmentsAPI.getAll({ search: code });
      const shipment = response.shipments?.find((s: any) =>
        s.qrCode?.toUpperCase() === upperCode || s.referenceId?.toUpperCase() === upperCode
      );
      if (shipment) {
        return await validateAndReturnShipment(shipment, code);
      }
    }

    // ✅ PRIORITY 5: Check if it's a box QR code (format: SHIPMENT_XXX-BOX001)
    if (code.includes('-BOX')) {
      // Extract master QR (everything before -BOX)
      // Example: SHIPMENT_1730547890123-abcd123-BOX001 → SHIPMENT_1730547890123-abcd123
      const masterQR = code.split('-BOX')[0];
      const response = await shipmentsAPI.getAll({ search: masterQR });
      const shipment = response.shipments?.find((s: any) =>
        s.qrCode?.toUpperCase() === masterQR.toUpperCase()
      );
      if (shipment) {
        return await validateAndReturnShipment(shipment, code);
      }
    }

    // ✅ FALLBACK: Try general search by reference ID
    const response = await shipmentsAPI.getAll({ search: code });
    const shipment = response.shipments?.find((s: any) =>
      s.referenceId?.toUpperCase() === upperCode
    );
    if (shipment) {
      return await validateAndReturnShipment(shipment, code);
    }

    return { type: 'unknown', data: null, rawCode: code };
  };

  const assignShipmentToRack = async () => {
    if (!pendingShipment || !scanResult || scanResult.type !== 'rack') return;

    // ✅ FIX: Calculate total boxes based on ACTUAL pallet contents, not fixed 20-box rule
    let totalBoxes = 0;

    // Add boxes from selected pallets (using actual pallet box counts)
    if (palletQuantity > 0 && pendingShipment.palletDetails) {
      for (let i = 0; i < palletQuantity; i++) {
        if (pendingShipment.palletDetails[i]) {
          totalBoxes += pendingShipment.palletDetails[i].boxCount;
        }
      }
    }

    // Add loose boxes
    totalBoxes += (looseBoxQuantity || 0);

    if (totalBoxes <= 0) {
      setError('Please select pallets or boxes to assign');
      return;
    }

    if (totalBoxes > remainingBoxes) {
      setError(`Only ${remainingBoxes} boxes remaining!`);
      return;
    }

    // 🔒 CBM CAPACITY CHECK - Block if shipment CBM exceeds rack's remaining CBM
    const rackCBMCapacity = Number(scanResult.data.cbmCapacity) || 0;
    const rackCBMUsed = Number(scanResult.data.cbmUsed) || 0;
    const rackCBMRemaining = rackCBMCapacity - rackCBMUsed;

    // Calculate CBM for this assignment based on selected pallets/boxes
    const cbmPerPallet = pendingShipment.cbmPerPallet || 0;
    const cbmPerBox = pendingShipment.cbmPerBox || 0;
    const assignmentCBM = (palletQuantity * cbmPerPallet) + (looseBoxQuantity * cbmPerBox);

    if (rackCBMCapacity > 0 && assignmentCBM > rackCBMRemaining) {
      alert(`❌ No CBM Space Left!\n\n📦 Shipment CBM: ${assignmentCBM.toFixed(4)} m³\n📏 Rack Free CBM: ${rackCBMRemaining.toFixed(4)} m³\n\n⚠️ This shipment requires more space than available.\n\n👉 Try another rack with more capacity.`);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      console.log('🎯 Scanner Assignment:', {
        pallets: palletQuantity,
        looseBoxes: looseBoxQuantity,
        totalBoxes,
        rack: scanResult.data.code,
        shipment: pendingShipment.referenceId,
        photos: assignmentPhotos.length
      });

      // Upload photos first if any (Same as Pending+Racks)
      let photoUrls: string[] = [];
      if (assignmentPhotos.length > 0) {
        setUploadingPhotos(true);
        console.log(`📸 Starting upload of ${assignmentPhotos.length} photo(s)...`);

        for (let i = 0; i < assignmentPhotos.length; i++) {
          const photo = assignmentPhotos[i];
          const originalSize = (photo.size / 1024 / 1024).toFixed(2);

          setUploadProgress({
            current: i + 1,
            total: assignmentPhotos.length,
            size: `${originalSize}MB`
          });

          try {
            // 📸 Compress photo before upload (mobile cameras = huge files!)
            console.log(`📸 Compressing photo ${i + 1}/${assignmentPhotos.length} (${originalSize}MB)...`);
            const compressedPhoto = await compressPhoto(photo);
            const compressedSize = (compressedPhoto.size / 1024 / 1024).toFixed(2);
            console.log(`✅ Compressed: ${originalSize}MB → ${compressedSize}MB`);

            const formData = new FormData();
            formData.append('photo', compressedPhoto);

            const uploadRes = await fetch('/api/shipments/upload/photo', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              photoUrls.push(uploadData.photoUrl);
              console.log(`✅ Photo ${i + 1} uploaded: ${uploadData.photoUrl}`);
            } else {
              const errorText = await uploadRes.text();
              console.error(`❌ Photo ${i + 1} upload failed (${uploadRes.status}):`, errorText);
              alert(`⚠️ Photo ${i + 1} upload failed: ${uploadRes.status} - ${errorText.substring(0, 100)}`);
            }
          } catch (error) {
            console.error(`❌ Photo ${i + 1} upload error:`, error);
            alert(`⚠️ Photo ${i + 1} error: ${error}`);
          }
        }

        setUploadingPhotos(false);
        setUploadProgress(null);
        console.log(`📸 Successfully uploaded ${photoUrls.length}/${assignmentPhotos.length} photos`);
      }

      // Use same API endpoint as Pending+Racks workflow
      const response = await fetch(`/api/shipments/${pendingShipment.id}/assign-rack`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rackId: scanResult.data.id,
          quantity: totalBoxes,
          pallets: palletQuantity,
          looseBoxes: looseBoxQuantity,
          photos: photoUrls
        })
      });

      if (response.ok) {
        playSuccessSound();
        alert(`✅ Assignment Complete!\n\n🎁 ${palletQuantity || 0} Pallet${palletQuantity > 1 ? 's' : ''} (${totalBoxes - (looseBoxQuantity || 0)} boxes)\n📦 ${looseBoxQuantity || 0} Loose Box${looseBoxQuantity > 1 ? 'es' : ''}\n\n= ${totalBoxes} Total Boxes assigned to ${scanResult.data.code}!${photoUrls.length > 0 ? `\n📸 ${photoUrls.length} photo${photoUrls.length > 1 ? 's' : ''} uploaded` : ''}`);
        setPendingShipment(null);
        setScanResult(null);
        setPalletQuantity(0);
        setLooseBoxQuantity(0);
        setAssignmentPhotos([]);
        setRemainingBoxes(0);

        // ✅ CRITICAL FIX: Refresh pending shipments list to get updated box counts
        // This ensures when user comes back to assign more boxes, they see correct counts
        if (activeTab === 'list') {
          loadPendingShipments();
        }
      } else {
        const error = await response.json();
        playErrorSound();
        setError(error.message || 'Failed to assign boxes to rack');
      }
    } catch (err: any) {
      playErrorSound();
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
      // Fetch both PENDING and PARTIAL status shipments with high limit
      const response = await fetch('/api/shipments?status=PENDING&status=PARTIAL&limit=500', {
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
                // ✅ CRITICAL FIX: Fetch fresh box data with cache-busting
                const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes?t=${Date.now()}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                  }
                });
                const boxData = await boxResponse.json();
                // ✅ CRITICAL: Filter out boxes that are assigned properly
                const unassignedBoxes = boxData.boxes.filter((b: any) => {
                  const hasRackId = b.rackId !== null && b.rackId !== undefined && b.rackId !== '';
                  const isInStorage = b.status === 'IN_STORAGE';
                  const isReleased = b.status === 'RELEASED';
                  return !hasRackId && !isInStorage && !isReleased;
                });

                // ✅ CRITICAL: Calculate pallet/loose breakdown from unassigned boxes
                const palletGroups = unassignedBoxes.reduce((acc: Record<number, number>, box: any) => {
                  let palletNum = 0; // Default: loose box
                  if (box.pieceQR) {
                    try {
                      const pieceData = JSON.parse(box.pieceQR);
                      palletNum = pieceData.palletNumber || 0;
                    } catch (e) {
                      console.warn('Failed to parse pieceQR:', box.pieceQR);
                    }
                  }
                  acc[palletNum] = (acc[palletNum] || 0) + 1;
                  return acc;
                }, {});

                const palletNumbers = Object.keys(palletGroups)
                  .map(Number)
                  .filter(num => num > 0)
                  .sort((a, b) => a - b);

                const totalPallets = palletNumbers.length;
                const looseBoxes = palletGroups[0] || 0;
                const palletDetails = palletNumbers.map(num => ({
                  palletNumber: num,
                  boxCount: palletGroups[num]
                }));

                const totalBoxes = boxData.boxes.length;
                return unassignedBoxes.length > 0 ? {
                  ...shipment,
                  remainingBoxes: unassignedBoxes.length,
                  totalBoxes: totalBoxes,
                  availablePallets: totalPallets,
                  availableLooseBoxes: looseBoxes,
                  palletDetails: palletDetails
                } : null;
              } catch (err) {
                console.error('Error processing shipment boxes:', err);
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

      // Get box count and shipment details with cache-busting
      const boxResponse = await fetch(`/api/shipments/${shipment.id}/boxes?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Cache-Control': 'no-cache'
        }
      });
      const boxData = await boxResponse.json();
      // ✅ CRITICAL: Filter out boxes that are assigned (have rackId) OR already in storage/released
      const unassignedBoxes = boxData.boxes.filter((b: any) => {
        const hasRackId = b.rackId !== null && b.rackId !== undefined && b.rackId !== '';
        const isInStorage = b.status === 'IN_STORAGE';
        const isReleased = b.status === 'RELEASED';
        const isAssigned = hasRackId || isInStorage || isReleased;
        return !isAssigned; // Return true if NOT assigned
      });

      console.log('📊 handleRackSelectionFromList - Box filtering:', {
        totalBoxes: boxData.boxes.length,
        assignedBoxes: boxData.boxes.filter((b: any) => b.rackId).length,
        unassignedBoxes: unassignedBoxes.length,
        boxes: boxData.boxes.map((b: any) => ({
          boxNumber: b.boxNumber,
          rackId: b.rackId,
          status: b.status,
          pieceQR: b.pieceQR
        }))
      });

      // ✅ FIX: Calculate pallets based on ACTUAL pallet distribution, not fixed 20-box rule
      // Group unassigned boxes by palletNumber (stored in pieceQR JSON field)
      const palletGroups = unassignedBoxes.reduce((acc: Record<number, number>, box: any) => {
        let palletNum = 0; // Default: loose box

        // Try to parse palletNumber from pieceQR JSON field
        if (box.pieceQR) {
          try {
            const pieceData = JSON.parse(box.pieceQR);
            palletNum = pieceData.palletNumber || 0;
          } catch (e) {
            console.warn('Failed to parse pieceQR:', box.pieceQR);
          }
        }

        acc[palletNum] = (acc[palletNum] || 0) + 1;
        return acc;
      }, {});

      // Separate pallets (palletNumber > 0) from loose boxes (palletNumber = 0)
      const palletNumbers = Object.keys(palletGroups)
        .map(Number)
        .filter(num => num > 0)
        .sort((a, b) => a - b);

      const totalPallets = palletNumbers.length;
      const looseBoxes = palletGroups[0] || 0;

      // Build pallet details for display
      const palletDetails = palletNumbers.map(num => ({
        palletNumber: num,
        boxCount: palletGroups[num]
      }));

      // Set selected shipment and rack
      setSelectedShipmentForRack({
        ...shipment,
        remainingBoxes: unassignedBoxes.length,
        totalPallets,
        looseBoxes,
        palletDetails // NEW: Array of {palletNumber, boxCount}
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
    console.log('📦 Fetching FRESH box data and dimensions...');

    try {
      setLoading(true);

      // Fetch boxes AND dimensions in parallel
      const [boxResponse, dimResponse] = await Promise.all([
        fetch(`/api/shipments/${shipment.id}/boxes?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Cache-Control': 'no-cache'
          }
        }),
        fetch(`/api/shipments/${shipment.id}/dimensions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          }
        })
      ]);

      const boxData = await boxResponse.json();
      const dimData = dimResponse.ok ? await dimResponse.json() : { dimensions: [] };

      console.log('📏 Dimensions loaded:', dimData.dimensions?.length || 0);

      // ✅ CRITICAL: Filter out boxes that are assigned (have rackId) OR already in storage/released
      // A box is unassigned if: rackId is null/undefined AND status is not IN_STORAGE/RELEASED
      const unassignedBoxes = boxData.boxes.filter((b: any) => {
        const hasRackId = b.rackId !== null && b.rackId !== undefined && b.rackId !== '';
        const isInStorage = b.status === 'IN_STORAGE';
        const isReleased = b.status === 'RELEASED';
        const isAssigned = hasRackId || isInStorage || isReleased;
        return !isAssigned; // Return true if NOT assigned
      });

      console.log('📊 Box filtering:', {
        totalBoxes: boxData.boxes.length,
        assignedBoxes: boxData.boxes.filter((b: any) => b.rackId).length,
        unassignedBoxes: unassignedBoxes.length,
        boxes: boxData.boxes.map((b: any) => ({
          boxNumber: b.boxNumber,
          rackId: b.rackId,
          status: b.status,
          pieceQR: b.pieceQR
        }))
      });

      console.log('📦 Unassigned boxes:', unassignedBoxes.length);

      // Recalculate pallet/loose box breakdown from CURRENT boxes
      const palletGroups = unassignedBoxes.reduce((acc: Record<number, number>, box: any) => {
        let palletNum = 0; // Default: loose box

        if (box.pieceQR) {
          try {
            const pieceData = JSON.parse(box.pieceQR);
            palletNum = pieceData.palletNumber || 0;
          } catch (e) {
            console.warn('Failed to parse pieceQR:', box.pieceQR);
          }
        }

        acc[palletNum] = (acc[palletNum] || 0) + 1;
        return acc;
      }, {});

      const palletNumbers = Object.keys(palletGroups)
        .map(Number)
        .filter(num => num > 0)
        .sort((a, b) => a - b);

      const totalPallets = palletNumbers.length;
      const looseBoxes = palletGroups[0] || 0;

      const palletDetails = palletNumbers.map(num => ({
        palletNumber: num,
        boxCount: palletGroups[num]
      }));

      // Calculate total CBM from dimensions OR use shipment.cbm directly
      const dimensions = dimData.dimensions || [];
      let totalCBM = 0;

      // Priority 1: Use shipment.cbm if available (from direct input or L×W×H calculation)
      if (shipment.cbm && Number(shipment.cbm) > 0) {
        totalCBM = Number(shipment.cbm);
        console.log('📦 Using shipment.cbm:', totalCBM);
      }
      // Priority 2: Calculate from dimensions array
      else if (dimensions.length > 0) {
        totalCBM = dimensions.reduce((sum: number, d: any) => {
          const cbm = ((d.length || 0) * (d.width || 0) * (d.height || 0) * (d.pieces || d.quantity || 1)) / 1000000;
          return sum + cbm;
        }, 0);
        console.log('📐 Calculated CBM from dimensions:', totalCBM);
      }

      // Calculate CBM per pallet and per box (for partial assignments)
      // Use originalBoxCount for accurate per-box CBM
      const originalBoxCount = Number(shipment.originalBoxCount) || unassignedBoxes.length || 1;
      const cbmPerPallet = totalPallets > 0 ? totalCBM / totalPallets : 0;
      const cbmPerBox = totalCBM / originalBoxCount;

      console.log('✅ Fresh data:', {
        totalPallets,
        looseBoxes,
        palletDetails,
        unassignedBoxes: unassignedBoxes.length,
        originalBoxCount,
        totalCBM: totalCBM.toFixed(4),
        cbmPerPallet: cbmPerPallet.toFixed(4),
        cbmPerBox: cbmPerBox.toFixed(6)
      });

      setSelectedShipmentForRack({
        ...shipment,
        remainingBoxes: unassignedBoxes.length,
        totalPallets,
        looseBoxes,
        palletDetails,
        dimensions,
        totalCBM,
        cbmPerPallet,
        cbmPerBox
      });
      setShowRackSelection(true);
      console.log('✅ Rack selection enabled with FRESH data + CBM:', {
        totalPallets,
        looseBoxes,
        palletDetails,
        unassignedBoxes: unassignedBoxes.length,
        totalCBM
      });
    } catch (err) {
      console.error('Failed to fetch boxes:', err);
      setError('Failed to load box data');
    } finally {
      setLoading(false);
    }
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

      // ✅ FIX: Calculate total boxes based on ACTUAL pallet contents, not fixed 20-box rule
      const totalBoxesToAssign =
        getPalletBoxCount(
          selectedShipmentForRack.palletDetails,
          palletQuantity || 0,
          selectedShipmentForRack.boxesPerPallet || 0
        ) + (looseBoxQuantity || 0);

      // Calculate CBM for this assignment
      const assignmentCBM = (palletQuantity * (selectedShipmentForRack.cbmPerPallet || 0)) +
        (looseBoxQuantity * (selectedShipmentForRack.cbmPerBox || 0));

      // 🔒 CBM CAPACITY CHECK - Block if shipment CBM exceeds rack's remaining CBM
      const rackCBMCapacity = Number(selectedRackForAssignment.cbmCapacity) || 0;
      const rackCBMUsed = Number(selectedRackForAssignment.cbmUsed) || 0;
      const rackCBMRemaining = rackCBMCapacity - rackCBMUsed;

      if (rackCBMCapacity > 0 && assignmentCBM > rackCBMRemaining) {
        setLoading(false);
        alert(`❌ No CBM Space Left!\n\n📦 Shipment CBM: ${assignmentCBM.toFixed(4)} m³\n📏 Rack Free CBM: ${rackCBMRemaining.toFixed(4)} m³\n\n⚠️ This shipment requires more space than available.\n\n👉 Try another rack with more capacity.`);
        return;
      }

      console.log('🎯 Assigning:', {
        pallets: palletQuantity,
        looseBoxes: looseBoxQuantity,
        totalBoxes: totalBoxesToAssign,
        cbm: assignmentCBM.toFixed(4),
        rackCBMRemaining: rackCBMRemaining.toFixed(4),
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

      // Assign boxes to rack with photos and CBM
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
          photos: photoUrls,
          cbm: assignmentCBM // Send CBM for this assignment
        })
      });

      if (response.ok) {
        // Success - refresh lists and close modal
        const assignedPalletBoxCount = getPalletBoxCount(
          selectedShipmentForRack.palletDetails,
          palletQuantity || 0,
          selectedShipmentForRack.boxesPerPallet || 0
        );

        const assignedPallets = palletQuantity > 0
          ? `${palletQuantity} pallet${palletQuantity > 1 ? 's' : ''} (${assignedPalletBoxCount} box${assignedPalletBoxCount === 1 ? '' : 'es'})`
          : '';
        const assignedLoose = looseBoxQuantity > 0 ? `${looseBoxQuantity} loose box${looseBoxQuantity > 1 ? 'es' : ''}` : '';
        const separator = assignedPallets && assignedLoose ? ' + ' : '';
        const assignmentSummary = assignedPallets + separator + assignedLoose;

        alert(`✅ Successfully assigned ${assignmentSummary} to ${selectedRackForAssignment.code}${photoUrls.length > 0 ? `\n📸 With ${photoUrls.length} photo${photoUrls.length > 1 ? 's' : ''}` : ''}`);
        setShowAssignmentModal(false);
        setShowRackSelection(false);
        setSelectedShipmentForRack(null);
        setSelectedRackForAssignment(null);
        setPalletQuantity(0);
        setLooseBoxQuantity(0);
        setAssignmentPhotos([]);

        // ✅ CRITICAL FIX: Force refresh the shipment data to get updated pallet/loose counts
        // This ensures when user comes back to assign more boxes, they see correct counts
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
    <div className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 max-w-7xl mx-auto pb-20 md:pb-6">
      <div className="text-center">
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">📱 Scanner</h1>
        <p className="text-gray-600 text-xs sm:text-base md:text-lg hidden sm:block">مسح المستودع | مسح أو بحث يدوي</p>
      </div>

      {/* Tab Navigation - MOBILE OPTIMIZED */}
      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-md border-2 border-gray-200">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 py-2.5 px-2 rounded-md font-bold text-xs sm:text-sm transition-all ${activeTab === 'scanner'
            ? 'bg-primary-600 text-white shadow-lg'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          <span className="block">📸</span>
          <span className="text-[10px] sm:text-xs font-normal mt-0.5">Scan</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 px-2 rounded-md font-bold text-xs sm:text-sm transition-all ${activeTab === 'list'
            ? 'bg-primary-600 text-white shadow-lg'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          <span className="block">📋</span>
          <span className="text-[10px] sm:text-xs font-normal mt-0.5">Pending</span>
        </button>
        {/* Manual Move Button */}
        <button
          onClick={openManualMoveModal}
          className="flex-1 py-2.5 px-2 rounded-md font-bold text-xs sm:text-sm transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-lg"
        >
          <span className="block">🔄</span>
          <span className="text-[10px] sm:text-xs font-normal mt-0.5">Move</span>
        </button>
      </div>

      {error && (
        <div className={`${error.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border-2 px-6 py-4 rounded-xl flex items-center gap-3`}>
          {error.startsWith('✅') ? (
            <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
          ) : (
            <XCircleIcon className="h-6 w-6 flex-shrink-0" />
          )}
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="hover:opacity-70 text-xl">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* SCANNER TAB */}
          {activeTab === 'scanner' && (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">

              {scanning && (
                <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                  <div className="text-center mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary-600 mb-1 sm:mb-2">📸 Scanning...</h3>
                    <p className="text-gray-600 text-xs sm:text-sm md:text-base">ضع رمز الاستجابة السريعة في الإطار</p>
                  </div>
                  <div id={qrCodeRegionId} className="w-full max-w-md mx-auto"></div>
                  <button
                    onClick={stopScanning}
                    className="w-full sm:w-auto py-2.5 sm:py-3 px-4 sm:px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm sm:text-base"
                  >
                    Stop Camera / إيقاف الكاميرا
                  </button>
                </div>
              )}

              {!scanning && !scanResult && !loading && (
                <div className="p-4 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6">
                  {/* HTTPS Warning if not secure */}
                  {window.location.protocol === 'http:' && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-900 font-bold text-sm sm:text-base md:text-lg">🔒 Camera Requires HTTPS</p>
                      </div>
                      <p className="text-red-700 mb-3 text-xs sm:text-sm">Camera access only works on secure connections.</p>
                      <button
                        onClick={() => {
                          const httpsUrl = window.location.href.replace('http://', 'https://');
                          window.location.href = httpsUrl;
                        }}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                      >
                        ✅ Switch to HTTPS Now
                      </button>
                    </div>
                  )}

                  <div className="mx-auto w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 border-4 border-dashed border-primary-300 rounded-2xl sm:rounded-3xl flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
                    <QrCodeIcon className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Ready to Scan</h3>
                    <p className="text-gray-600 text-sm sm:text-base md:text-lg">جاهز للمسح</p>
                    {window.location.protocol === 'https:' && (
                      <p className="text-green-600 text-xs sm:text-sm mt-1 sm:mt-2">✅ Secure Connection (HTTPS)</p>
                    )}
                  </div>
                  <button
                    onClick={startScanning}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-primary-600 text-white text-base sm:text-lg md:text-xl font-bold rounded-lg sm:rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <CameraIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                    <span>Start Camera</span>
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
                <div className="p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-5 md:space-y-6">
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <CheckCircleIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-green-600" />
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-green-900 mb-1">Scan Successful! ✅</h3>
                    <p className="text-gray-600 font-mono text-xs sm:text-sm md:text-base break-all px-2">{scanResult.rawCode}</p>
                  </div>

                  {scanResult.type === 'rack' && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <CubeIcon className="h-8 w-8 text-blue-600" />
                        <h4 className="text-xl font-bold text-blue-900">Rack Information</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
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

                      {/* 📏 CBM Capacity Display */}
                      {(scanResult.data.cbmCapacity > 0) && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm font-medium">📏 CBM Capacity:</span>
                            <div className="text-right">
                              <span className={`font-bold ${(Number(scanResult.data.cbmCapacity) - Number(scanResult.data.cbmUsed || 0)) <= 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                                }`}>
                                {(Number(scanResult.data.cbmCapacity) - Number(scanResult.data.cbmUsed || 0)).toFixed(2)} m³ Free
                              </span>
                              <span className="text-gray-500 text-xs ml-2">
                                ({Number(scanResult.data.cbmUsed || 0).toFixed(2)} / {Number(scanResult.data.cbmCapacity).toFixed(2)})
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {pendingShipment && (
                        <div className="mt-6 pt-6 border-t-2 border-blue-300">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-blue-900 font-semibold">
                              📦 Assign "{pendingShipment.clientName || pendingShipment.referenceId}" to this rack?
                            </p>
                          </div>

                          {/* Client Info */}
                          <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Client:</span>
                                <p className="font-semibold">{pendingShipment.clientName || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Reference:</span>
                                <p className="font-semibold">{pendingShipment.referenceId}</p>
                              </div>
                            </div>
                          </div>

                          {/* How Many to Assign? */}
                          <div className="mb-4 bg-gray-50 border border-gray-300 p-4 rounded-lg">
                            <p className="text-gray-800 font-semibold mb-3 flex items-center gap-2">
                              📦 How Many to Assign?
                            </p>

                            <div className="bg-white p-3 rounded border mb-3">
                              <p className="text-sm text-gray-700 font-medium mb-2">Available for assignment:</p>
                              <div className="flex items-center justify-center gap-6">
                                {pendingShipment.availablePallets > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">📦</span>
                                    <div>
                                      <p className="font-bold text-lg text-gray-800">{pendingShipment.availablePallets} Pallet{pendingShipment.availablePallets > 1 ? 's' : ''}</p>
                                      {pendingShipment.palletDetails && pendingShipment.palletDetails.length > 0 ? (
                                        <p className="text-xs text-gray-600">
                                          {pendingShipment.palletDetails.map((p: any) => `P${p.palletNumber}: ${p.boxCount} boxes`).join(', ')}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-gray-600">(Palletized boxes)</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {pendingShipment.availableLooseBoxes > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">📦</span>
                                    <div>
                                      <p className="font-bold text-lg text-gray-800">{pendingShipment.availableLooseBoxes} Loose Box{pendingShipment.availableLooseBoxes > 1 ? 'es' : ''}</p>
                                      <p className="text-xs text-gray-600">(Individual boxes)</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 📏 DIMENSIONS LIST - Show each pallet/item dimensions */}
                              {pendingShipment.dimensions && pendingShipment.dimensions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 mb-2 font-semibold">📏 Dimensions (L×W×H cm):</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {pendingShipment.dimensions.map((dim: any, idx: number) => {
                                      const cbm = ((dim.length || 0) * (dim.width || 0) * (dim.height || 0) * (dim.quantity || 1)) / 1000000;
                                      return (
                                        <div key={idx} className="bg-purple-50 rounded-lg p-2 border border-purple-200 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">
                                              {dim.label || `#${idx + 1}`}
                                            </span>
                                            <span className="text-sm text-gray-700 font-medium">
                                              {dim.length || 0}×{dim.width || 0}×{dim.height || 0}
                                            </span>
                                            {(dim.quantity || 1) > 1 && (
                                              <span className="text-xs text-gray-500">×{dim.quantity}</span>
                                            )}
                                          </div>
                                          <span className="text-xs font-semibold text-green-600">{cbm.toFixed(4)} m³</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {pendingShipment.totalCBM > 0 && (
                                    <div className="mt-2 flex gap-2">
                                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                                        📦 Total: {pendingShipment.totalCBM.toFixed(4)} m³
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Pallets to Assign - Only show if pallets available - MOBILE OPTIMIZED */}
                            {pendingShipment.availablePallets > 0 && (
                              <div className="mb-3">
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">📦 Pallets to Assign:</label>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <button
                                    onClick={() => setPalletQuantity(Math.max(0, (palletQuantity || 0) - 1))}
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 text-sm sm:text-base"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    max={pendingShipment.availablePallets}
                                    value={palletQuantity || 0}
                                    onChange={(e) => setPalletQuantity(Math.min(pendingShipment.availablePallets, parseInt(e.target.value) || 0))}
                                    className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-base sm:text-lg font-bold border-2 border-gray-300 rounded-lg"
                                  />
                                  <button
                                    onClick={() => setPalletQuantity(Math.min(pendingShipment.availablePallets, (palletQuantity || 0) + 1))}
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 text-sm sm:text-base"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => setPalletQuantity(pendingShipment.availablePallets)}
                                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-xs sm:text-sm"
                                  >
                                    All
                                  </button>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">Max: {pendingShipment.availablePallets} | Remaining: {pendingShipment.availablePallets - (palletQuantity || 0)}</p>
                              </div>
                            )}

                            {/* Loose Boxes to Assign - Only show if loose boxes available - MOBILE OPTIMIZED */}
                            {pendingShipment.availableLooseBoxes > 0 && (
                              <div className="mb-3">
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">📦 Loose Boxes to Assign:</label>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <button
                                    onClick={() => setLooseBoxQuantity(Math.max(0, (looseBoxQuantity || 0) - 1))}
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 text-sm sm:text-base"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    max={pendingShipment.availableLooseBoxes}
                                    value={looseBoxQuantity || 0}
                                    onChange={(e) => setLooseBoxQuantity(Math.min(pendingShipment.availableLooseBoxes, parseInt(e.target.value) || 0))}
                                    className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 text-center text-base sm:text-lg font-bold border-2 border-gray-300 rounded-lg"
                                  />
                                  <button
                                    onClick={() => setLooseBoxQuantity(Math.min(pendingShipment.availableLooseBoxes, (looseBoxQuantity || 0) + 1))}
                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 text-sm sm:text-base"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => setLooseBoxQuantity(pendingShipment.availableLooseBoxes)}
                                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-xs sm:text-sm"
                                  >
                                    All
                                  </button>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">Max: {pendingShipment.availableLooseBoxes} | Remaining: {pendingShipment.availableLooseBoxes - (looseBoxQuantity || 0)}</p>
                              </div>
                            )}

                            {/* Total Summary */}
                            <div className="bg-green-50 border border-green-300 p-3 rounded-lg mb-3">
                              <p className="font-semibold text-gray-800 mb-1">📋 Total to assign:</p>
                              {palletQuantity > 0 && (
                                <p className="text-lg font-bold text-gray-900">
                                  {palletQuantity} Pallet{palletQuantity > 1 ? 's' : ''} (
                                  {getPalletBoxCount(
                                    pendingShipment.palletDetails,
                                    palletQuantity,
                                    pendingShipment.boxesPerPallet || 0
                                  )} boxes)
                                </p>
                              )}
                              {looseBoxQuantity > 0 && (
                                <p className="text-lg font-bold text-gray-900">
                                  + {looseBoxQuantity} Loose Box{looseBoxQuantity > 1 ? 'es' : ''}
                                </p>
                              )}
                              <p className="text-xl font-bold text-green-800 mt-2">
                                =
                                {getPalletBoxCount(
                                  pendingShipment.palletDetails,
                                  palletQuantity || 0,
                                  pendingShipment.boxesPerPallet || 0
                                ) + (looseBoxQuantity || 0)}{' '}
                                Total Boxes
                              </p>
                            </div>

                            {/* Photo Upload Section (Same as Pending+Racks) */}
                            <div className="mb-3">
                              <label className="block text-sm font-semibold mb-2">
                                📸 Upload Photos (Optional - Max 10)
                              </label>
                              <p className="text-xs text-gray-600 mb-2">Take photos of pallets/boxes for reference</p>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                id="scanner-photo-upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length + assignmentPhotos.length > 10) {
                                    alert('Maximum 10 photos allowed');
                                    return;
                                  }
                                  setAssignmentPhotos([...assignmentPhotos, ...files]);
                                }}
                              />
                              <label
                                htmlFor="scanner-photo-upload"
                                className="w-full block py-3 bg-blue-600 text-white text-center rounded-lg font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
                              >
                                📷 Upload Photos ({assignmentPhotos.length}/10)
                              </label>

                              {assignmentPhotos.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                                  {assignmentPhotos.map((photo, idx) => (
                                    <div key={idx} className="relative">
                                      <img
                                        src={URL.createObjectURL(photo)}
                                        alt={`Preview ${idx + 1}`}
                                        className="w-full h-16 object-cover rounded border"
                                      />
                                      <button
                                        onClick={() => setAssignmentPhotos(assignmentPhotos.filter((_, i) => i !== idx))}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 📸 Upload Progress Indicator */}
                              {uploadingPhotos && uploadProgress && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-blue-900">
                                      📸 Uploading Photo {uploadProgress.current}/{uploadProgress.total}
                                    </span>
                                    <span className="text-xs text-blue-700">
                                      Size: {uploadProgress.size}
                                    </span>
                                  </div>
                                  <div className="w-full bg-blue-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-blue-600 mt-1 animate-pulse">
                                    ⏳ Compressing and uploading... Please wait
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 sm:gap-3">
                            <button
                              onClick={assignShipmentToRack}
                              disabled={loading || uploadingPhotos || ((palletQuantity || 0) === 0 && (looseBoxQuantity || 0) === 0)}
                              className="flex-1 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-sm sm:text-base md:text-lg"
                            >
                              {uploadingPhotos ? '⏳ Uploading...' : '✅ Confirm'}
                            </button>
                            <button
                              onClick={() => {
                                setPendingShipment(null);
                                setPalletQuantity(0);
                                setLooseBoxQuantity(0);
                                setRemainingBoxes(0);
                              }}
                              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold text-sm sm:text-base"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {scanResult.type === 'shipment' && (
                    <div className={`border-2 rounded-xl p-6 space-y-4 ${scanResult.data.remainingBoxes === 0 && (scanResult.data.status === 'IN_STORAGE' || scanResult.data.status === 'IN_WAREHOUSE')
                      ? 'bg-red-50 border-red-500'
                      : 'bg-purple-50 border-purple-200'
                      }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <ArchiveBoxIcon className={`h-8 w-8 ${scanResult.data.remainingBoxes === 0 && (scanResult.data.status === 'IN_STORAGE' || scanResult.data.status === 'IN_WAREHOUSE')
                            ? 'text-red-600'
                            : 'text-purple-600'
                            }`} />
                          <h4 className={`text-xl font-bold ${scanResult.data.remainingBoxes === 0 && (scanResult.data.status === 'IN_STORAGE' || scanResult.data.status === 'IN_WAREHOUSE')
                            ? 'text-red-900'
                            : 'text-purple-900'
                            }`}>
                            {scanResult.data.remainingBoxes === 0 && (scanResult.data.status === 'IN_STORAGE' || scanResult.data.status === 'IN_WAREHOUSE')
                              ? '⛔ Already in Storage!'
                              : 'Shipment Scanned!'}
                          </h4>
                        </div>
                        {scanResult.data.remainingBoxes === 0 && (scanResult.data.status === 'IN_STORAGE' || scanResult.data.status === 'IN_WAREHOUSE') ? (
                          <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                            🚫 FULLY STORED
                          </div>
                        ) : (scanResult.data.status === 'PENDING' || scanResult.data.remainingBoxes > 0) && (
                          <div className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm animate-pulse">
                            ⏳ Pending to Assign
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">Client</span>
                            <p className="font-bold text-base">{scanResult.data.clientName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Reference</span>
                            <p className="font-bold text-base">{scanResult.data.referenceId}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Total Boxes</span>
                            <p className="font-bold text-base">{scanResult.data.currentBoxCount} 📦</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Remaining</span>
                            <p className="font-bold text-lg text-orange-600">{scanResult.data.remainingBoxes || 0} 📦</p>
                          </div>
                        </div>
                      </div>

                      {scanResult.data.remainingBoxes === 0 && (scanResult.data.status === 'IN_STORAGE' || scanResult.data.status === 'IN_WAREHOUSE') ? (
                        <div className="mt-4">
                          <div className="bg-red-100 border-2 border-red-600 p-6 rounded-lg mb-4">
                            <p className="text-center text-red-900 font-bold text-xl mb-3">
                              🚨 SHIPMENT ALREADY IN STORAGE
                            </p>
                            <p className="text-center text-red-800 text-base mb-3">
                              All {scanResult.data.currentBoxCount} boxes are already assigned to rack!
                            </p>
                            {scanResult.data.assignedRacks && scanResult.data.assignedRacks.length > 0 && (
                              <div className="bg-white p-3 rounded border border-red-300">
                                <p className="text-sm text-gray-600 text-center mb-1">Located in:</p>
                                <p className="text-center font-bold text-lg text-red-900">
                                  {scanResult.data.assignedRacks.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            {/* Move to Another Rack Button */}
                            <button
                              onClick={() => openMoveModal(scanResult.data)}
                              className="w-full py-3 sm:py-3.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Move to Another Rack
                            </button>
                            {/* View Move History Button */}
                            <button
                              onClick={() => {
                                fetchMoveHistory(scanResult.data.id);
                                setShowMoveHistory(true);
                              }}
                              className="w-full py-3 sm:py-3.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              View Move History
                            </button>
                            <button
                              onClick={() => {
                                setSelectedShipmentForDetails(scanResult.data);
                                setShowShipmentDetails(true);
                              }}
                              className="w-full py-3 sm:py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Full Details
                            </button>
                            <button
                              onClick={() => {
                                setScanResult(null);
                                startScanning();
                              }}
                              className="w-full py-2.5 sm:py-3 md:py-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold text-sm sm:text-base md:text-lg"
                            >
                              Scan Next Shipment
                            </button>
                          </div>
                        </div>
                      ) : (scanResult.data.status === 'PENDING' || scanResult.data.remainingBoxes > 0) ? (
                        <div className="mt-4">
                          <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg mb-4">
                            <p className="text-center text-blue-900 font-semibold mb-2">
                              📍 Next Step: Scan Rack QR Code
                            </p>
                            <p className="text-center text-blue-700 text-sm">
                              Scan the rack where you want to assign this shipment
                            </p>
                          </div>
                          <div className="space-y-3">
                            <button
                              onClick={async () => {
                                // ✅ CRITICAL FIX: Re-fetch fresh shipment data before setting pendingShipment
                                // This ensures we get the latest box counts after any previous assignments
                                try {
                                  // Fetch boxes AND dimensions in parallel
                                  const [freshResponse, dimResponse] = await Promise.all([
                                    fetch(`/api/shipments/${scanResult.data.id}/boxes?t=${Date.now()}`, {
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                                        'Cache-Control': 'no-cache'
                                      }
                                    }),
                                    fetch(`/api/shipments/${scanResult.data.id}/dimensions`, {
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                      }
                                    })
                                  ]);

                                  const freshBoxData = await freshResponse.json();
                                  const dimData = dimResponse.ok ? await dimResponse.json() : { dimensions: [] };

                                  const freshUnassignedBoxes = freshBoxData.boxes.filter((b: any) => {
                                    const hasRackId = b.rackId !== null && b.rackId !== undefined && b.rackId !== '';
                                    const isInStorage = b.status === 'IN_STORAGE';
                                    const isReleased = b.status === 'RELEASED';
                                    return !hasRackId && !isInStorage && !isReleased;
                                  });

                                  // Recalculate pallet/loose breakdown from FRESH data
                                  const freshPalletGroups = freshUnassignedBoxes.reduce((acc: Record<number, number>, box: any) => {
                                    let palletNum = 0;
                                    if (box.pieceQR) {
                                      try {
                                        const pieceData = JSON.parse(box.pieceQR);
                                        palletNum = pieceData.palletNumber || 0;
                                      } catch (e) {
                                        console.warn('Failed to parse pieceQR:', box.pieceQR);
                                      }
                                    }
                                    acc[palletNum] = (acc[palletNum] || 0) + 1;
                                    return acc;
                                  }, {});

                                  const freshPalletNumbers = Object.keys(freshPalletGroups)
                                    .map(Number)
                                    .filter(num => num > 0)
                                    .sort((a, b) => a - b);
                                  const freshTotalPallets = freshPalletNumbers.length;
                                  const freshLooseBoxes = freshPalletGroups[0] || 0;
                                  const freshPalletDetails = freshPalletNumbers.map(num => ({
                                    palletNumber: num,
                                    boxCount: freshPalletGroups[num]
                                  }));

                                  // Calculate CBM from dimensions
                                  const dimensions = dimData.dimensions || [];
                                  const totalCBM = dimensions.reduce((sum: number, d: any) => {
                                    const cbm = ((d.length || 0) * (d.width || 0) * (d.height || 0) * (d.quantity || 1)) / 1000000;
                                    return sum + cbm;
                                  }, 0);

                                  // Update scanResult.data with fresh counts + dimensions
                                  const freshShipmentData = {
                                    ...scanResult.data,
                                    remainingBoxes: freshUnassignedBoxes.length,
                                    availablePallets: freshTotalPallets,
                                    availableLooseBoxes: freshLooseBoxes,
                                    palletDetails: freshPalletDetails,
                                    dimensions: dimensions,
                                    totalCBM: totalCBM,
                                    cbmPerPallet: freshTotalPallets > 0 ? totalCBM / freshTotalPallets : 0
                                  };

                                  setPendingShipment(freshShipmentData);
                                  setScanResult(null);
                                  startScanning();
                                } catch (err) {
                                  console.error('Failed to refresh shipment data:', err);
                                  // Fallback to original data if refresh fails
                                  setPendingShipment(scanResult.data);
                                  setScanResult(null);
                                  startScanning();
                                }
                              }}
                              className="w-full py-3 sm:py-3.5 md:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm sm:text-base md:text-lg shadow-lg"
                            >
                              ✅ Scan Rack Now ({scanResult.data.remainingBoxes} boxes)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedShipmentForDetails(scanResult.data);
                                setShowShipmentDetails(true);
                              }}
                              className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Full Details
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-green-50 border border-green-300 p-4 rounded-lg">
                            <p className="text-center text-green-900 font-semibold">
                              ✅ All boxes already assigned!
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedShipmentForDetails(scanResult.data);
                              setShowShipmentDetails(true);
                            }}
                            className="w-full py-3 sm:py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Full Details
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

                  <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                    <button
                      onClick={handleReset}
                      className="flex-1 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-sm sm:text-base"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        setScanResult(null);
                        startScanning();
                      }}
                      className="flex-1 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Scan Again</span>
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
                    <div key={shipment.id} className="p-3 sm:p-4 md:p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row items-start sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary-600">
                              {shipment.referenceId}
                            </span>
                            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full ${shipment.status === 'PARTIAL'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {shipment.status === 'PARTIAL' ? '🔄 PARTIAL' : '⏳ PENDING'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 text-sm sm:text-base md:text-lg">
                            <div>
                              <span className="text-gray-500 text-xs sm:text-sm">Client:</span>
                              <p className="font-semibold text-gray-900 truncate">{shipment.clientName}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs sm:text-sm">Available:</span>
                              <p className="font-semibold text-gray-900">
                                {/* Show Pallet + Loose Box breakdown */}
                                {shipment.availablePallets > 0 && (
                                  <span className="text-blue-700">
                                    {shipment.availablePallets} Pallet{shipment.availablePallets > 1 ? 's' : ''}
                                    {shipment.palletDetails && shipment.palletDetails.length > 0 && (
                                      <span className="text-xs text-gray-600">
                                        {' '}({shipment.palletDetails.map((p: any) => `${p.boxCount}box`).join(', ')})
                                      </span>
                                    )}
                                  </span>
                                )}
                                {shipment.availablePallets > 0 && shipment.availableLooseBoxes > 0 && <span> + </span>}
                                {shipment.availableLooseBoxes > 0 && (
                                  <span className="text-orange-700">
                                    {shipment.availableLooseBoxes} Loose Box{shipment.availableLooseBoxes > 1 ? 'es' : ''}
                                  </span>
                                )}
                                {shipment.status === 'PARTIAL' && (
                                  <span className="text-xs sm:text-sm text-gray-600 ml-1 sm:ml-2">
                                    ({shipment.remainingBoxes} unassigned)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {shipment.notes && (
                            <p className="text-gray-600 text-sm">📝 {shipment.notes}</p>
                          )}
                          {/* Show CBM if available */}
                          {shipment.cbm > 0 && (
                            <p className="text-green-600 text-sm font-semibold">📏 CBM: {Number(shipment.cbm).toFixed(4)} m³</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSelectShipment(shipment)}
                          className="px-3 sm:px-5 md:px-8 py-2.5 sm:py-3 md:py-4 bg-primary-600 text-white font-bold rounded-lg sm:rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base md:text-lg whitespace-nowrap"
                        >
                          <span className="block">📍 Choose Rack</span>
                          <span className="hidden sm:block text-xs sm:text-sm font-normal">اختر الرف</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header - MOBILE OPTIMIZED */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Scan Successful! ✅</h2>
              </div>
              <p className="text-sm sm:text-base md:text-lg font-semibold">{selectedRackForAssignment.code}</p>
            </div>

            {/* Rack Information - MOBILE OPTIMIZED */}
            <div className="p-3 sm:p-4 md:p-6 bg-blue-50 border-b-2 border-blue-200">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-blue-900 mb-3 sm:mb-4 flex items-center gap-2">
                📦 Rack Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Code:</span>
                  <p className="text-sm sm:text-base md:text-xl font-bold text-gray-900">{selectedRackForAssignment.code}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Location:</span>
                  <p className="text-sm sm:text-base md:text-xl font-bold text-gray-900 truncate">{selectedRackForAssignment.location || 'Section B, Row 2'}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Section:</span>
                  <p className="text-sm sm:text-base md:text-xl font-bold text-gray-900">{selectedRackForAssignment.section || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-xs sm:text-sm">Capacity:</span>
                  <p className="text-sm sm:text-base md:text-xl font-bold text-gray-900">
                    {selectedRackForAssignment.capacityUsed || 0} / {selectedRackForAssignment.capacityTotal || 100}
                  </p>
                </div>
              </div>

              {/* 📏 CBM Capacity Display */}
              {(selectedRackForAssignment.cbmCapacity > 0) && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm font-medium">📏 CBM Capacity:</span>
                    <div className="text-right">
                      <span className={`font-bold ${(Number(selectedRackForAssignment.cbmCapacity) - Number(selectedRackForAssignment.cbmUsed || 0)) <= 0
                          ? 'text-red-600'
                          : 'text-green-600'
                        }`}>
                        {(Number(selectedRackForAssignment.cbmCapacity) - Number(selectedRackForAssignment.cbmUsed || 0)).toFixed(2)} m³ Free
                      </span>
                      <span className="text-gray-500 text-xs ml-2">
                        ({Number(selectedRackForAssignment.cbmUsed || 0).toFixed(2)} / {Number(selectedRackForAssignment.cbmCapacity).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Assignment Section - MOBILE OPTIMIZED */}
            <div className="p-3 sm:p-4 md:p-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-purple-900 mb-2 flex items-center gap-2">
                  📦 Assign "{selectedShipmentForRack.referenceId}" to this rack?
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                  Client: <strong>{selectedShipmentForRack.clientName}</strong>
                </p>
              </div>

              {/* Pallet + Box Selection - MOBILE OPTIMIZED */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base md:text-lg font-bold text-purple-900 mb-3 sm:mb-4">
                  📦 How Many to Assign?
                </h4>

                {/* Available Info */}
                <div className="bg-white rounded-lg p-4 mb-4 border-2 border-purple-300">
                  <p className="text-sm text-gray-600 mb-2">Available for assignment:</p>
                  <div className="flex flex-wrap items-center gap-4 text-lg">
                    {selectedShipmentForRack.totalPallets > 0 && (
                      <div>
                        <span className="font-bold text-purple-700">{selectedShipmentForRack.totalPallets} Pallets</span>
                        {selectedShipmentForRack.palletDetails && selectedShipmentForRack.palletDetails.length > 0 ? (
                          <span className="text-gray-500 text-sm ml-2">
                            ({selectedShipmentForRack.palletDetails.map((p: any) => `P${p.palletNumber}:${p.boxCount}box`).join(', ')})
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm ml-2">
                            (20 boxes each)
                          </span>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-blue-700">{selectedShipmentForRack.looseBoxes} Loose Boxes</span>
                    </div>
                  </div>

                  {/* 📏 DIMENSIONS LIST - Show each pallet/item dimensions */}
                  {selectedShipmentForRack.dimensions && selectedShipmentForRack.dimensions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="text-xs text-gray-500 mb-2 font-semibold">📏 Dimensions (L×W×H cm):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedShipmentForRack.dimensions.map((dim: any, idx: number) => {
                          const cbm = ((dim.length || 0) * (dim.width || 0) * (dim.height || 0) * (dim.pieces || dim.quantity || 1)) / 1000000;
                          return (
                            <div key={idx} className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">
                                  {dim.label || `#${idx + 1}`}
                                </span>
                                <span className="text-sm text-gray-700">
                                  {dim.length || 0}×{dim.width || 0}×{dim.height || 0}
                                </span>
                                {(dim.pieces || dim.quantity) > 1 && (
                                  <span className="text-xs text-gray-500">×{dim.pieces || dim.quantity}</span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-green-600">{cbm.toFixed(4)} m³</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CBM Total Info */}
                  {selectedShipmentForRack.totalCBM > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="bg-green-100 px-3 py-1 rounded-full">
                          <span className="text-green-700 font-semibold">📏 Total: {selectedShipmentForRack.totalCBM.toFixed(4)} m³</span>
                        </div>
                        {selectedShipmentForRack.cbmPerPallet > 0 && (
                          <div className="bg-purple-100 px-3 py-1 rounded-full">
                            <span className="text-purple-700 font-semibold">Per Pallet: {selectedShipmentForRack.cbmPerPallet.toFixed(4)} m³</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pallet Input - MOBILE OPTIMIZED */}
                {selectedShipmentForRack.totalPallets > 0 && (
                  <div className="mb-3 sm:mb-4">
                    <label className="block text-gray-700 font-semibold mb-2 text-xs sm:text-sm md:text-base">
                      🎁 Pallets to Assign:
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                      <button
                        onClick={() => setPalletQuantity(Math.max(0, palletQuantity - 1))}
                        className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-red-500 text-white rounded-lg font-bold text-base sm:text-lg md:text-xl hover:bg-red-600"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={selectedShipmentForRack.totalPallets}
                        value={palletQuantity}
                        onChange={(e) => setPalletQuantity(Math.min(selectedShipmentForRack.totalPallets, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="flex-1 text-center text-lg sm:text-xl md:text-2xl font-bold border-2 border-purple-300 rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3"
                      />
                      <button
                        onClick={() => setPalletQuantity(Math.min(selectedShipmentForRack.totalPallets, palletQuantity + 1))}
                        className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-500 text-white rounded-lg font-bold text-base sm:text-lg md:text-xl hover:bg-green-600"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setPalletQuantity(selectedShipmentForRack.totalPallets)}
                        className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 text-xs sm:text-sm md:text-base"
                      >
                        🎯 All
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      ⚡ Max: {selectedShipmentForRack.totalPallets} |
                      Remaining: {selectedShipmentForRack.totalPallets - palletQuantity}
                    </p>
                  </div>
                )}

                {/* Loose Box Input - MOBILE OPTIMIZED */}
                <div className="mb-3 sm:mb-4">
                  <label className="block text-gray-700 font-semibold mb-2 text-xs sm:text-sm md:text-base">
                    📦 Loose Boxes to Assign:
                  </label>
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                    <button
                      onClick={() => setLooseBoxQuantity(Math.max(0, looseBoxQuantity - 1))}
                      className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-red-500 text-white rounded-lg font-bold text-base sm:text-lg md:text-xl hover:bg-red-600"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={selectedShipmentForRack.looseBoxes}
                      value={looseBoxQuantity}
                      onChange={(e) => setLooseBoxQuantity(Math.min(selectedShipmentForRack.looseBoxes, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="flex-1 text-center text-lg sm:text-xl md:text-2xl font-bold border-2 border-blue-300 rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3"
                    />
                    <button
                      onClick={() => setLooseBoxQuantity(Math.min(selectedShipmentForRack.looseBoxes, looseBoxQuantity + 1))}
                      className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-500 text-white rounded-lg font-bold text-base sm:text-lg md:text-xl hover:bg-green-600"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setLooseBoxQuantity(selectedShipmentForRack.looseBoxes)}
                      className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 text-xs sm:text-sm md:text-base"
                    >
                      🎯 All
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    ⚡ Max: {selectedShipmentForRack.looseBoxes} |
                    Remaining: {selectedShipmentForRack.looseBoxes - looseBoxQuantity}
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
                          ({getPalletBoxCount(
                            selectedShipmentForRack.palletDetails,
                            palletQuantity,
                            selectedShipmentForRack.boxesPerPallet || 0
                          )} boxes)
                        </span>
                      </span>
                    )}
                    {looseBoxQuantity > 0 && (
                      <span className="text-blue-700">+ {looseBoxQuantity} Box{looseBoxQuantity > 1 ? 'es' : ''}</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-green-700 mt-2">
                    = {getPalletBoxCount(
                      selectedShipmentForRack.palletDetails,
                      palletQuantity,
                      selectedShipmentForRack.boxesPerPallet || 0
                    ) + looseBoxQuantity} Total Boxes
                  </p>
                  {/* CBM for selected items */}
                  {selectedShipmentForRack.cbmPerPallet > 0 && (palletQuantity > 0 || looseBoxQuantity > 0) && (
                    <div className="mt-2 pt-2 border-t border-green-300">
                      <p className="text-sm font-semibold text-green-800">
                        📏 CBM: {((palletQuantity * selectedShipmentForRack.cbmPerPallet) +
                          (looseBoxQuantity * (selectedShipmentForRack.cbmPerBox || 0))).toFixed(4)} m³
                      </p>
                    </div>
                  )}
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
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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

              {/* Action Buttons - MOBILE OPTIMIZED */}
              <div className="flex gap-2 sm:gap-3 md:gap-4">
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setPalletQuantity(0);
                    setLooseBoxQuantity(0);
                  }}
                  className="flex-1 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-gray-500 text-white font-bold rounded-lg sm:rounded-xl hover:bg-gray-600 transition-all text-sm sm:text-base md:text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={loading || (palletQuantity === 0 && looseBoxQuantity === 0)}
                  className="flex-1 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 transition-all text-sm sm:text-base md:text-lg shadow-lg"
                >
                  ✅ Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Details Modal */}
      {showShipmentDetails && selectedShipmentForDetails && (
        <ShipmentDetailModal
          isOpen={showShipmentDetails}
          onClose={() => setShowShipmentDetails(false)}
          shipmentId={selectedShipmentForDetails.id}
        />
      )}

      {/* Move Shipment Modal */}
      {showMoveModal && moveShipmentData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">🔄 Move Shipment</h3>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setMoveShipmentData(null);
                    setMoveDestinationRack('');
                    setMoveReason('');
                    setMoveAuthorizedBy('');
                    setMoveNotes('');
                    setMovePhotos([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current Location */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-700 mb-1">Moving from:</p>
                <p className="text-lg font-bold text-amber-900">
                  📍 {moveShipmentData.sourceRackCode} → ?
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Shipment: <span className="font-semibold">{moveShipmentData.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Boxes: <span className="font-semibold">{moveShipmentData.currentBoxCount}</span>
                </p>
              </div>

              {/* Destination Rack Selection - QR Scanner */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Destination Rack <span className="text-red-500">*</span>
                </label>

                {/* Show selected rack or scan button */}
                {moveDestinationRack ? (
                  <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-800 font-bold text-lg">✅ {moveDestinationRackCode}</p>
                        <p className="text-green-600 text-sm">Rack selected</p>
                      </div>
                      <button
                        onClick={() => {
                          setMoveDestinationRack('');
                          setMoveDestinationRackCode('');
                        }}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : scanningForDestination ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border-2 border-blue-500 p-4 rounded-lg">
                      <p className="text-blue-800 font-bold text-center mb-2">📷 Scan Destination Rack QR</p>
                      <div id="destination-qr-reader" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>
                    </div>
                    <button
                      onClick={() => stopDestinationScanner()}
                      className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel Scanning
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setScanningForDestination(true)}
                      className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      📷 Scan Destination Rack QR
                    </button>
                    <p className="text-center text-gray-500 text-sm">or select manually</p>
                    <select
                      value={moveDestinationRack}
                      onChange={(e) => {
                        const rack = racks.find(r => r.id === e.target.value);
                        setMoveDestinationRack(e.target.value);
                        setMoveDestinationRackCode(rack?.code || '');
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select destination rack...</option>
                      {racks
                        .filter(r => r.id !== moveShipmentData.sourceRackId && r.status !== 'FULL')
                        .map(rack => (
                          <option key={rack.id} value={rack.id}>
                            {rack.code} - {rack.zone} ({rack.capacityUsed || 0}/{rack.capacityTotal || 100})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Move <span className="text-red-500">*</span>
                </label>
                <select
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select reason...</option>
                  <option value="Reorganization">📦 Reorganization</option>
                  <option value="Space Optimization">📐 Space Optimization</option>
                  <option value="Customer Request">👤 Customer Request</option>
                  <option value="Damage Prevention">⚠️ Damage Prevention</option>
                  <option value="Temperature Control">🌡️ Temperature Control</option>
                  <option value="Easier Access">🚪 Easier Access</option>
                  <option value="Consolidation">🔗 Consolidation</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              {/* Authorized By */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Authorized By <span className="text-red-500">*</span>
                </label>
                <select
                  value={moveAuthorizedBy}
                  onChange={(e) => setMoveAuthorizedBy(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select manager/admin...</option>
                  {authorizedUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.role === 'ADMIN' ? '👑' : '👔'} {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 h-20"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📸 Take Photos of New Location
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setMovePhotos([...movePhotos, ...files]);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                {movePhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {movePhotos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Photo ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setMovePhotos(movePhotos.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setMoveShipmentData(null);
                    setMoveDestinationRack('');
                    setMoveReason('');
                    setMoveAuthorizedBy('');
                    setMoveNotes('');
                    setMovePhotos([]);
                  }}
                  className="flex-1 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveShipment}
                  disabled={movingInProgress || !moveDestinationRack || !moveReason || !moveAuthorizedBy}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {movingInProgress ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Moving...
                    </>
                  ) : (
                    '✅ Confirm Move'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move History Modal */}
      {showMoveHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">📜 Move History</h3>
                <button
                  onClick={() => setShowMoveHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingMoveHistory ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-purple-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : moveHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No move history found</p>
                  <p className="text-gray-400 text-sm mt-2">This shipment hasn't been moved between racks yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {moveHistory.map((move, idx) => (
                    <div key={move.id || idx} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      {/* Move Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔄</span>
                          <div>
                            <p className="font-bold text-gray-900">
                              {move.fromRack?.code || '?'} → {move.toRack?.code || '?'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(move.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {move.boxCount} boxes
                        </span>
                      </div>

                      {/* Move Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Reason</p>
                          <p className="font-semibold">{move.reason}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Authorized By</p>
                          <p className="font-semibold">
                            {move.authorizedBy?.role === 'ADMIN' ? '👑' : '👔'} {move.authorizedBy?.name || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Moved By</p>
                          <p className="font-semibold">👷 {move.movedBy?.name || 'Unknown'}</p>
                        </div>
                        {move.notes && (
                          <div>
                            <p className="text-gray-500 text-xs">Notes</p>
                            <p className="font-semibold">{move.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Photos */}
                      {(move.oldPhotos?.length > 0 || move.newPhotos?.length > 0) && (
                        <div className="border-t pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Old Photos */}
                            {move.oldPhotos?.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">📷 Before Move (Old Location)</p>
                                <div className="flex gap-2 flex-wrap">
                                  {move.oldPhotos.map((photo: string, pIdx: number) => (
                                    <img
                                      key={pIdx}
                                      src={photo}
                                      alt={`Old photo ${pIdx + 1}`}
                                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                      onClick={() => window.open(photo, '_blank')}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* New Photos */}
                            {move.newPhotos?.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">📸 After Move (New Location)</p>
                                <div className="flex gap-2 flex-wrap">
                                  {move.newPhotos.map((photo: string, pIdx: number) => (
                                    <img
                                      key={pIdx}
                                      src={photo}
                                      alt={`New photo ${pIdx + 1}`}
                                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                      onClick={() => window.open(photo, '_blank')}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Move Modal (without scanning) */}
      {showManualMoveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header - Green like scan success */}
            <div className="bg-emerald-500 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    🔄 Move Shipment
                  </h3>
                  <p className="text-emerald-100 text-sm mt-1">Select items to move to different rack</p>
                </div>
                <button
                  onClick={() => {
                    setShowManualMoveModal(false);
                    setMoveShipmentData(null);
                    setSelectedManualShipment('');
                    setSelectedSourceRack('');
                    setMoveDestinationRack('');
                    setMoveReason('');
                    setMoveAuthorizedBy('');
                    setMoveNotes('');
                    setMovePhotos([]);
                    setPalletsToMove(0);
                    setLooseBoxesToMove(0);
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: Select Shipment */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  📦 Select Shipment
                </label>
                {loadingInStorageShipments ? (
                  <div className="text-center py-4">
                    <div className="animate-spin h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : (
                  <select
                    value={selectedManualShipment}
                    onChange={(e) => handleManualShipmentSelect(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Select a shipment...</option>
                    {inStorageShipments.map(shipment => (
                      <option key={shipment.id} value={shipment.id}>
                        {shipment.name} - {shipment.referenceId} ({shipment.currentBoxCount} boxes)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 2: Select Source Rack */}
              {selectedManualShipment && moveShipmentData?.rackGroups && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    📍 Source Rack (From)
                  </label>
                  <select
                    value={selectedSourceRack}
                    onChange={(e) => {
                      setSelectedSourceRack(e.target.value);
                      setPalletsToMove(0);
                      setLooseBoxesToMove(0);
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Select current rack...</option>
                    {moveShipmentData.rackGroups.map((rg: any) => (
                      <option key={rg.rackId} value={rg.rackId}>
                        {rg.rackCode} ({rg.boxCount} boxes)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rack Info Card - like 1st image */}
              {selectedSourceRack && moveShipmentData?.rackGroups && (() => {
                const sourceRackGroup = moveShipmentData.rackGroups.find((rg: any) => rg.rackId === selectedSourceRack);
                const sourceRackInfo = racks.find(r => r.id === selectedSourceRack);
                if (!sourceRackGroup) return null;

                // Calculate pallets and loose boxes
                const boxesInRack = sourceRackGroup.boxes || [];
                const palletGroups: Record<number, any[]> = {};
                const looseBoxes: any[] = [];

                boxesInRack.forEach((box: any) => {
                  try {
                    const pieceQR = typeof box.pieceQR === 'string' ? JSON.parse(box.pieceQR) : box.pieceQR;
                    const palletNum = pieceQR?.palletNumber || 0;
                    if (palletNum > 0) {
                      if (!palletGroups[palletNum]) palletGroups[palletNum] = [];
                      palletGroups[palletNum].push(box);
                    } else {
                      looseBoxes.push(box);
                    }
                  } catch {
                    looseBoxes.push(box);
                  }
                });

                const palletCount = Object.keys(palletGroups).length;
                const looseCount = looseBoxes.length;
                const maxPallets = palletCount;
                const maxLoose = looseCount;

                return (
                  <>
                    {/* Rack Info Display */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        📦 Rack Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Code:</span>
                          <p className="font-bold text-lg text-slate-900">{sourceRackInfo?.code}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Location:</span>
                          <p className="font-bold text-slate-900">{sourceRackInfo?.location || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Section:</span>
                          <p className="font-bold text-slate-900">{sourceRackInfo?.section || '-'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Capacity:</span>
                          <p className="font-bold text-slate-900">{sourceRackInfo?.capacityUsed || 0} / {sourceRackInfo?.capacityTotal || 100}</p>
                        </div>
                      </div>
                    </div>

                    {/* How Many to Move - Partial Move Support */}
                    <div className="bg-white border-2 border-emerald-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                        📦 How Many to Move?
                      </h4>

                      {/* Available for move */}
                      <div className="bg-emerald-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-600 mb-1">Available for move:</p>
                        <div className="flex gap-4">
                          <span className="text-emerald-700 font-bold">{palletCount} Pallets</span>
                          <span className="text-blue-600 font-bold">{looseCount} Loose Boxes</span>
                        </div>
                      </div>

                      {/* Pallets to Move */}
                      {palletCount > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">🎁 Pallets to Move:</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPalletsToMove(Math.max(0, (palletsToMove || 0) - 1))}
                              className="w-12 h-12 bg-red-500 text-white rounded-lg text-xl font-bold hover:bg-red-600 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={palletsToMove || 0}
                              onChange={(e) => setPalletsToMove(Math.min(maxPallets, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="flex-1 text-center text-xl font-bold p-3 border border-slate-300 rounded-lg"
                              min="0"
                              max={maxPallets}
                            />
                            <button
                              type="button"
                              onClick={() => setPalletsToMove(Math.min(maxPallets, (palletsToMove || 0) + 1))}
                              className="w-12 h-12 bg-emerald-500 text-white rounded-lg text-xl font-bold hover:bg-emerald-600 transition-colors"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => setPalletsToMove(maxPallets)}
                              className="px-4 h-12 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                            >
                              📦 All
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">⚡ Max: {maxPallets} | Remaining: {maxPallets - (palletsToMove || 0)}</p>
                        </div>
                      )}

                      {/* Loose Boxes to Move */}
                      {looseCount > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">📦 Loose Boxes to Move:</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLooseBoxesToMove(Math.max(0, (looseBoxesToMove || 0) - 1))}
                              className="w-12 h-12 bg-red-500 text-white rounded-lg text-xl font-bold hover:bg-red-600 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={looseBoxesToMove || 0}
                              onChange={(e) => setLooseBoxesToMove(Math.min(maxLoose, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="flex-1 text-center text-xl font-bold p-3 border border-slate-300 rounded-lg"
                              min="0"
                              max={maxLoose}
                            />
                            <button
                              type="button"
                              onClick={() => setLooseBoxesToMove(Math.min(maxLoose, (looseBoxesToMove || 0) + 1))}
                              className="w-12 h-12 bg-emerald-500 text-white rounded-lg text-xl font-bold hover:bg-emerald-600 transition-colors"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => setLooseBoxesToMove(maxLoose)}
                              className="px-4 h-12 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                            >
                              📦 All
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">⚡ Max: {maxLoose} | Remaining: {maxLoose - (looseBoxesToMove || 0)}</p>
                        </div>
                      )}

                      {/* Total Summary */}
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                        <p className="text-sm text-slate-700">Total to move:</p>
                        <p className="font-bold text-green-800">
                          {palletsToMove || 0} Pallet{(palletsToMove || 0) !== 1 ? 's' : ''}
                          {looseBoxesToMove > 0 && ` + ${looseBoxesToMove} Loose Box${looseBoxesToMove !== 1 ? 'es' : ''}`}
                        </p>
                        <p className="text-emerald-700 font-semibold mt-1">
                          = {((palletsToMove || 0) * (Object.values(palletGroups)[0]?.length || 1)) + (looseBoxesToMove || 0)} Total Boxes
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Destination Rack Selection */}
              {selectedSourceRack && ((palletsToMove || 0) > 0 || (looseBoxesToMove || 0) > 0) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    🎯 Select Destination Rack
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {racks
                      .filter(r => r.id !== selectedSourceRack && r.status !== 'FULL')
                      .map(rack => {
                        const isSelected = moveDestinationRack === rack.id;
                        const capacity = rack.capacityUsed || 0;
                        const total = rack.capacityTotal || 100;
                        const percentage = (capacity / total) * 100;

                        return (
                          <button
                            key={rack.id}
                            type="button"
                            onClick={() => setMoveDestinationRack(rack.id)}
                            className={`p-3 rounded-xl text-center transition-all duration-200 ${isSelected
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-300 scale-105 shadow-lg'
                              : percentage > 80
                                ? 'bg-orange-100 text-orange-800 border-2 border-orange-300 hover:bg-orange-200'
                                : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-200'
                              }`}
                          >
                            <div className="font-bold text-sm">{rack.code}</div>
                            <div className="text-xs mt-1">
                              {isSelected ? '✓ Selected' : `${capacity}/${total}`}
                            </div>
                          </button>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              {/* Reason & Authorized By */}
              {moveDestinationRack && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                      <select
                        value={moveReason}
                        onChange={(e) => setMoveReason(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select...</option>
                        <option value="Reorganization">📦 Reorganization</option>
                        <option value="Space Optimization">📐 Space Optimization</option>
                        <option value="Customer Request">👤 Customer Request</option>
                        <option value="Consolidation">🔗 Consolidation</option>
                        <option value="Other">📝 Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized By *</label>
                      <select
                        value={moveAuthorizedBy}
                        onChange={(e) => setMoveAuthorizedBy(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select...</option>
                        {authorizedUsers.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                    <textarea
                      value={moveNotes}
                      onChange={(e) => setMoveNotes(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm h-16 focus:ring-2 focus:ring-emerald-500"
                      placeholder="Any additional details..."
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      📸 Upload Photos (Optional - Max 10)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">Take photos of pallets/boxes for reference</p>
                    <button
                      type="button"
                      onClick={() => document.getElementById('movePhotoInput')?.click()}
                      className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      📷 Take/Select Photos ({movePhotos.length}/10)
                    </button>
                    <input
                      id="movePhotoInput"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, 10 - movePhotos.length);
                        setMovePhotos([...movePhotos, ...files]);
                      }}
                      className="hidden"
                    />
                    {movePhotos.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {movePhotos.map((photo, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Photo ${idx + 1}`}
                              className="w-14 h-14 object-cover rounded-lg border-2 border-white shadow"
                            />
                            <button
                              type="button"
                              onClick={() => setMovePhotos(movePhotos.filter((_, i) => i !== idx))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualMoveModal(false);
                    setMoveShipmentData(null);
                    setSelectedManualShipment('');
                    setSelectedSourceRack('');
                    setMoveDestinationRack('');
                    setMoveReason('');
                    setMoveAuthorizedBy('');
                    setMoveNotes('');
                    setMovePhotos([]);
                    setPalletsToMove(0);
                    setLooseBoxesToMove(0);
                  }}
                  className="flex-1 py-3.5 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualMoveSubmit}
                  disabled={movingInProgress || !moveDestinationRack || !moveReason || !moveAuthorizedBy || ((palletsToMove || 0) === 0 && (looseBoxesToMove || 0) === 0)}
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {movingInProgress ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Moving...
                    </>
                  ) : (
                    <>✅ Confirm</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
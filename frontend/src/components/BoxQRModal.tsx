import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getBackendUrl } from '../services/api';

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
  pieceQR?: string; // JSON string with pallet/loose metadata
  rack?: {
    code: string;
    location: string;
  };
}

interface Shipment {
  id: string;
  referenceId: string;
  palletCount?: number;
  boxesPerPallet?: number;
  originalBoxCount: number;
  currentBoxCount: number;
  qrCode: string;
  clientName: string;
  companyProfileId?: string;
  companyProfile?: { id: string; name: string } | null;
  arrivalDate: string;
  notes?: string; // Additional information field
  length?: number | null;
  width?: number | null;
  height?: number | null;
}

export default function BoxQRModal({ isOpen, onClose, shipmentId, shipmentRef }: BoxQRModalProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [branding, setBranding] = useState<{
    name?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    showCompanyName?: boolean;
  } | null>(null);
  // Derived print units: one per pallet, plus one per loose box
  const [printUnits, setPrintUnits] = useState<Array<
    | { type: 'PALLET'; key: string; palletNumber: number; pieces: number; qrValue: string }
    | { type: 'LOOSE_BOX'; key: string; boxId: string; boxNumber: number; qrValue: string }
  >>([]);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && shipmentId) {
      // Load branding (logo/colors)
      fetch('/api/company/branding')
        .then(r => r.json())
        .then(d => {
          const brandingData = d?.branding || null;
          console.log('✅ BoxQRModal: Loaded branding:', brandingData);
          console.log('   - logoUrl:', brandingData?.logoUrl);
          setBranding(brandingData);
        })
        .catch((err) => {
          console.error('❌ BoxQRModal: Failed to load branding:', err);
        });
      loadShipmentAndBoxes();
    }
  }, [isOpen, shipmentId]);

  const loadShipmentAndBoxes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load shipment details
      const shipmentResponse = await fetch(`/api/shipments/${shipmentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (shipmentResponse.ok) {
        const shipmentData = await shipmentResponse.json();
        setShipment(shipmentData.shipment || shipmentData);
      }

      // Load boxes
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

        // Ensure pieceQR exists as string and parse for grouping
        const loaded: Box[] = data.boxes.map((b: any) => ({
          id: b.id,
          boxNumber: b.boxNumber,
          qrCode: b.qrCode,
          status: b.status,
          pieceQR: b.pieceQR,
          rack: b.rack,
        }));
        setBoxes(loaded);

        // Build pallet and loose box units
        const palletCounts = new Map<number, number>();
        const loose: Box[] = [];
        loaded.forEach((b) => {
          let palletNumber = 0;
          let isLoose = false;
          try {
            const meta = b.pieceQR ? JSON.parse(b.pieceQR) : undefined;
            palletNumber = Number(meta?.palletNumber || 0);
            isLoose = Boolean(meta?.isLoose) || palletNumber === 0;
          } catch {
            // fallback: infer from qrCode suffix `-PAL-x`
            const m = /-PAL-(\d+)/.exec(b.qrCode);
            palletNumber = m ? parseInt(m[1], 10) : 0;
            isLoose = palletNumber === 0;
          }
          if (isLoose) {
            loose.push(b);
          } else {
            palletCounts.set(palletNumber, (palletCounts.get(palletNumber) || 0) + 1);
          }
        });

        // Create pallet units (one QR per pallet)
        const totalPallets = shipment?.palletCount || palletCounts.size || 0;
        const master = (shipment as any)?.qrCode || '';
        const client = (shipment as any)?.clientName || '';
        const arrDate = (shipment as any)?.arrivalDate ? new Date((shipment as any).arrivalDate) : null;
        const ad = arrDate ? `${arrDate.getFullYear()}-${String(arrDate.getMonth() + 1).padStart(2, '0')}-${String(arrDate.getDate()).padStart(2, '0')}` : '';
        const buildPalletQR = (palletNumber: number, pieces: number) => {
          // ✅ SIMPLIFIED: Use same format as SHIPMENT_XXX and RACK_XXX
          // Format: PALLET_SHIPMENTID_PALLETNUMBER
          // Example: PALLET_cmhhm6gq1000132e5vadvqil_1
          // Scanner can easily extract shipmentId and pallet number
          return `PALLET_${shipmentId}_${palletNumber}`;
        };
        const palletsUnits = Array.from(palletCounts.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([palletNumber, pieces]) => {
            const qrValue = buildPalletQR(palletNumber, pieces);
            return {
              type: 'PALLET' as const,
              key: `PAL-${palletNumber}`,
              palletNumber,
              pieces,
              qrValue,
            };
          });

        // Loose boxes as individual units
        const looseUnits = loose
          .sort((a, b) => a.boxNumber - b.boxNumber)
          .map((b) => ({
            type: 'LOOSE_BOX' as const,
            key: `BOX-${b.id}`,
            boxId: b.id,
            boxNumber: b.boxNumber,
            qrValue: b.qrCode,
          }));

        const units = [...palletsUnits, ...looseUnits];
        setPrintUnits(units);

        // Select all by default
        setSelectedUnits(new Set(units.map(u => u.key)));

        // Pre-render QR images for all units
        const images: Record<string, string> = {};
        for (const u of units) {
          const key = u.key;
          const val = u.qrValue;
          images[key] = await QRCode.toDataURL(val, { width: 220 });
        }
        setQrImages(images);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // (master QR image no longer used in pallet-mode printing)

  const handlePrintAll = async () => {
    // Preload all images to ensure they're ready for print
    const imgPromises: Promise<void>[] = [];

    // Preload logo image if it exists
    if (branding?.logoUrl) {
      imgPromises.push(
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't fail if image fails to load
          img.src = branding.logoUrl;
        })
      );
    }

    // Preload all QR images
    Object.values(qrImages).forEach(qrSrc => {
      imgPromises.push(
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't fail if image fails to load
          img.src = qrSrc;
        })
      );
    });

    // Wait for all images to load before printing
    await Promise.all(imgPromises);

    // Small delay to ensure rendering
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // status badge no longer displayed in pallet-mode printing

  // single pallet shortcut no longer needed; we print per pallet always

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg print:hidden">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding?.name || 'Brand'} className="h-8 w-auto rounded bg-white/10 p-1" />
            ) : (
              <span className="inline-flex items-center justify-center h-8 w-8 rounded bg-white/20 font-black">Q</span>
            )}
            <div>
              <h2 className="text-2xl font-bold">QGO Cargo • QR Suite</h2>
              <p className="text-indigo-100 text-sm mt-1">Shipment: {shipmentRef}{shipment?.companyProfile?.name ? ` • Profile: ${shipment.companyProfile.name}` : ''}</p>
            </div>
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
              <p className="mt-4 text-gray-600">Loading QR codes...</p>
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
              {/* Shipment Photos Section */}
              {shipment?.shipmentPhotos && shipment.shipmentPhotos.length > 0 && (
                <div className="mb-6 print:hidden">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Shipment Photos ({shipment.shipmentPhotos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {shipment.shipmentPhotos.map((photo: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img
                          src={`${getBackendUrl()}${photo}`}
                          alt={`Shipment photo ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 hover:border-indigo-500 cursor-pointer transition-all"
                          onClick={() => window.open(`${getBackendUrl()}${photo}`, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                          <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-0.5 rounded">
                          Photo {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PALLET + LOOSE BOX VIEW - ONE QR PER PALLET, PLUS EACH LOOSE BOX */}
              <div className="mb-6 flex justify-between items-center print:hidden">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    QRs to Print: {selectedUnits.size} / {printUnits.length} selected
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select individual QR codes to print
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSelectedUnits(new Set(printUnits.map(u => u.key)))}
                      className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedUnits(new Set())}
                      className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={() => setSelectedUnits(new Set(printUnits.filter(u => u.type === 'PALLET').map(u => u.key)))}
                      className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                    >
                      Pallets Only
                    </button>
                    <button
                      onClick={() => setSelectedUnits(new Set(printUnits.filter(u => u.type === 'LOOSE_BOX').map(u => u.key)))}
                      className="text-xs px-3 py-1 bg-orange-100 hover:bg-orange-200 rounded"
                    >
                      Loose Boxes Only
                    </button>
                  </div>
                </div>
                <button
                  onClick={handlePrintAll}
                  disabled={selectedUnits.size === 0}
                  className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${selectedUnits.size === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Selected ({selectedUnits.size})
                </button>
              </div>

              {/* QR Codes Grid (Pallets + Loose Boxes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {printUnits.map(unit => {
                  const isSelected = selectedUnits.has(unit.key);
                  return (
                    <div
                      key={unit.key}
                      className={`relative border-2 rounded-lg p-4 text-center transition cursor-pointer print:border print:border-black print:break-inside-avoid ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400'
                        } ${!isSelected ? 'print:hidden' : ''}`}
                      onClick={() => {
                        const newSelected = new Set(selectedUnits);
                        if (isSelected) {
                          newSelected.delete(unit.key);
                        } else {
                          newSelected.add(unit.key);
                        }
                        setSelectedUnits(newSelected);
                      }}
                    >
                      {/* Checkbox overlay (only visible on screen) */}
                      <div className="print:hidden absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { }} // Handled by parent div onClick
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Header */}
                      {unit.type === 'PALLET' ? (
                        <div className="bg-blue-100 text-blue-800 font-bold text-lg rounded-md py-2 mb-3">
                          Pallet #{unit.palletNumber}
                        </div>
                      ) : (
                        <div className="bg-purple-100 text-purple-800 font-bold text-lg rounded-md py-2 mb-3">
                          Loose Box #{unit.boxNumber}
                        </div>
                      )}

                      {/* QR Image */}
                      {qrImages[unit.key] && (
                        <img
                          src={qrImages[unit.key]}
                          alt={`${unit.type === 'PALLET' ? `Pallet ${unit.palletNumber}` : `Loose Box ${unit.boxNumber}`} QR`}
                          className="mx-auto mb-3"
                        />
                      )}

                      {/* Brand mark on label - LOGO ONLY (smaller) */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        {branding?.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt="Logo"
                            className="h-8 w-auto object-contain"
                            onError={(e) => {
                              console.error('❌ Logo failed to load:', branding.logoUrl);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-sm font-black text-indigo-700">QGO</span>
                        )}
                      </div>

                      {/* Details - BIGGER TEXT */}
                      {unit.type === 'PALLET' ? (
                        <div className="text-sm text-gray-700 space-y-1.5">
                          <div><span className="font-medium">Shipment:</span> <span className="font-bold">{shipmentRef}</span></div>
                          <div className="bg-indigo-50 -mx-2 px-2 py-1.5 rounded">
                            <span className="font-medium">Pallet:</span> <span className="font-bold text-indigo-700 text-base">
                              {(() => {
                                const pallets = printUnits.filter(u => u.type === 'PALLET');
                                const palletIndex = pallets.findIndex(u => u.type === 'PALLET' && u.palletNumber === unit.palletNumber);
                                return `${palletIndex + 1} of ${pallets.length}`;
                              })()}
                            </span>
                          </div>
                          <div><span className="font-medium">Pieces on Pallet:</span> <span className="font-bold">{unit.pieces}</span></div>
                          {shipment?.companyProfile?.name && (
                            <div><span className="font-medium">Profile:</span> <span className="font-bold">{shipment.companyProfile.name}</span></div>
                          )}
                          <div><span className="font-medium">Client:</span> <span className="font-bold">{shipment?.clientName || '—'}</span></div>
                          <div><span className="font-medium">Arrived:</span> <span className="font-bold">{new Date(shipment?.arrivalDate || '').toLocaleDateString()}</span></div>
                          {shipment?.notes && (
                            <div className="pt-2 mt-2 border-t-2 border-blue-400">
                              <span className="font-medium text-blue-700">Additional Info:</span>
                              <p className="font-bold text-blue-900 mt-1">{shipment.notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 space-y-1.5">
                          <div><span className="font-medium">Shipment:</span> <span className="font-bold">{shipmentRef}</span></div>
                          <div className="bg-purple-50 -mx-2 px-2 py-1.5 rounded">
                            <span className="font-medium">Loose Box:</span> <span className="font-bold text-purple-700 text-base">
                              {(() => {
                                const looseBoxes = printUnits.filter(u => u.type === 'LOOSE_BOX');
                                const looseIndex = looseBoxes.findIndex(u => u.type === 'LOOSE_BOX' && u.boxId === unit.boxId);
                                return `${looseIndex + 1} of ${looseBoxes.length}`;
                              })()}
                            </span>
                          </div>
                          {shipment?.companyProfile?.name && (
                            <div><span className="font-medium">Profile:</span> <span className="font-bold">{shipment.companyProfile.name}</span></div>
                          )}
                          <div><span className="font-medium">Client:</span> <span className="font-bold">{shipment?.clientName || '—'}</span></div>
                          <div><span className="font-medium">Arrived:</span> <span className="font-bold">{new Date(shipment?.arrivalDate || '').toLocaleDateString()}</span></div>
                          {shipment?.notes && (
                            <div className="pt-2 mt-2 border-t-2 border-blue-400">
                              <span className="font-medium text-blue-700">Additional Info:</span>
                              <p className="font-bold text-blue-900 mt-1">{shipment.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* Print Styles - FIXED: Properly hide background page */}
      <style>{`
        @media print {
          /* Hide everything first */
          body > * {
            display: none !important;
          }
          
          /* Show only this modal */
          body > div:last-child {
            display: block !important;
          }
          
          .fixed {
            position: relative !important;
            background: white !important;
          }
          
          .fixed > div {
            box-shadow: none !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          .fixed img {
            max-width: 100%;
            height: auto;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:border {
            border: 1px solid #000 !important;
          }
          
          .print\\:break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Grid for print - 2 per row */
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}


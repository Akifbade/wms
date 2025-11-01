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
        const ad = arrDate ? `${arrDate.getFullYear()}-${String(arrDate.getMonth()+1).padStart(2,'0')}-${String(arrDate.getDate()).padStart(2,'0')}` : '';
        const buildPalletQR = (palletNumber: number, pieces: number) => {
          // Compact summary segment appended to QR for pallet metadata
          const meta = {
            t: 'PAL', // type: pallet
            pn: palletNumber,
            pc: totalPallets || palletCounts.size,
            pcs: pieces,
            ref: shipmentRef,
            c: client,
            ad,
          };
          let encoded = '';
          try {
            encoded = typeof window !== 'undefined' && (window as any).btoa
              ? (window as any).btoa(JSON.stringify(meta))
              : btoa(JSON.stringify(meta));
          } catch {
            encoded = encodeURIComponent(JSON.stringify(meta));
          }
          return master
            ? `${master}-PAL-${palletNumber}-OF-${totalPallets || palletCounts.size}|S:${encoded}`
            : `PALLET-${shipmentId}-${palletNumber}|S:${encoded}`;
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
              {/* PALLET + LOOSE BOX VIEW - ONE QR PER PALLET, PLUS EACH LOOSE BOX */}
              <div className="mb-6 flex justify-between items-center print:hidden">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    QRs to Print: {printUnits.length} (Pallets: {printUnits.filter(u => u.type === 'PALLET').length}, Loose Boxes: {printUnits.filter(u => u.type === 'LOOSE_BOX').length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    One QR per pallet with details, plus one for each loose box
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

              {/* QR Codes Grid (Pallets + Loose Boxes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {printUnits.map(unit => (
                  <div
                    key={unit.key}
                    className="border-2 border-gray-200 rounded-lg p-4 text-center hover:border-indigo-400 transition print:border print:border-black print:break-inside-avoid"
                  >
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

                    {/* QR Value (compact with copy) - BIGGER TEXT */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <p className="text-sm text-gray-600 font-mono truncate max-w-[220px]" title={unit.qrValue}>
                        {unit.qrValue.replace(/\|S:.+$/, '')}
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(unit.qrValue)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm underline print:hidden"
                        title="Copy full QR value"
                      >Copy</button>
                    </div>

                    {/* Details - BIGGER TEXT */}
                    {unit.type === 'PALLET' ? (
                      <div className="text-sm text-gray-700 space-y-1.5">
                        <div><span className="font-medium">Shipment:</span> <span className="font-bold">{shipmentRef}</span></div>
                        {shipment?.companyProfile?.name && (
                          <div><span className="font-medium">Profile:</span> <span className="font-bold">{shipment.companyProfile.name}</span></div>
                        )}
                        <div><span className="font-medium">Pieces on Pallet:</span> <span className="font-bold">{unit.pieces}</span></div>
                        <div><span className="font-medium">Client:</span> <span className="font-bold">{shipment?.clientName || '—'}</span></div>
                        <div><span className="font-medium">Arrived:</span> <span className="font-bold">{new Date(shipment?.arrivalDate || '').toLocaleDateString()}</span></div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 space-y-1.5">
                        <div><span className="font-medium">Shipment:</span> <span className="font-bold">{shipmentRef}</span></div>
                        <div><span className="font-medium">Type:</span> <span className="font-bold">Loose Box</span></div>
                        {shipment?.companyProfile?.name && (
                          <div><span className="font-medium">Profile:</span> <span className="font-bold">{shipment.companyProfile.name}</span></div>
                        )}
                        <div><span className="font-medium">Client:</span> <span className="font-bold">{shipment?.clientName || '—'}</span></div>
                        <div><span className="font-medium">Arrived:</span> <span className="font-bold">{new Date(shipment?.arrivalDate || '').toLocaleDateString()}</span></div>
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
            visibility: visible !important;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .fixed img {
            visibility: visible !important;
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
          }
        }
      `}</style>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  QrCodeIcon,
  CubeIcon,
  ChartBarIcon,
  PencilIcon,
  XMarkIcon,
  PrinterIcon,
  InformationCircleIcon,
  CameraIcon,
  MapPinIcon,
  TagIcon,
  BuildingOfficeIcon,
  TruckIcon,
  SquaresPlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  RectangleStackIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { racksAPI } from '../../services/api';
import CreateRackModal from '../../components/CreateRackModal';
import EditRackModal from '../../components/EditRackModal';
import BulkAddRackModal from '../../components/BulkAddRackModal';
import QRCode from 'qrcode';

// Shipment Box Card Component (to avoid hooks in loops)
const ShipmentBoxCard: React.FC<{
  shipment: any;
  boxCount: number;
  photos: string[];
  assignedDate?: Date;
}> = ({ shipment, boxCount, photos, assignedDate }) => {
  const [showPhotos, setShowPhotos] = useState(false);

  // Calculate days in rack
  const daysInRack = assignedDate 
    ? Math.floor((new Date().getTime() - new Date(assignedDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-blue-600">
              #{shipment?.referenceId || 'N/A'}
            </span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${shipment?.status === 'IN_WAREHOUSE' || shipment?.status === 'PARTIAL'
              ? 'bg-green-100 text-green-800'
              : shipment?.status === 'RELEASED'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
              }`}>
              {shipment?.status || 'N/A'}
            </span>
          </div>
          <p className="text-xs text-gray-700 font-semibold">
            🏢 {shipment?.companyProfile?.name || shipment?.clientName || 'Unknown Company'}
          </p>
          {shipment?.clientPhone && (
            <p className="text-xs text-gray-600 mt-1">
              📞 {shipment.clientPhone}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-gray-600">
              📦 <span className="font-semibold text-gray-700">{boxCount}</span> boxes
            </span>
            {daysInRack > 0 && (
              <span className={`font-semibold ${daysInRack > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                📅 {daysInRack} day{daysInRack !== 1 ? 's' : ''} in rack
              </span>
            )}
          </div>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <button
            onClick={() => setShowPhotos(!showPhotos)}
            className="w-full flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span className="flex items-center gap-1">
              📷 Photos ({photos.length})
            </span>
            <span className="text-lg">{showPhotos ? '▲' : '▼'}</span>
          </button>

          {showPhotos && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {photos.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square rounded-lg overflow-hidden border-2 border-blue-200 hover:border-blue-500 transition-all"
                >
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <span className="text-white text-xl opacity-0 group-hover:opacity-100">🔍</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const Racks: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all'); // NEW: Zone filter
  const [viewMode, setViewMode] = useState<'zones' | 'grid'>('zones'); // NEW: View toggle
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set()); // NEW: Track expanded zones
  const [racks, setRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false); // NEW: Bulk add modal
  const [selectedRack, setSelectedRack] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [rackDetails, setRackDetails] = useState<any>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [bulkQrModalOpen, setBulkQrModalOpen] = useState(false);
  const bulkQrCanvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  const resolveLogoUrl = (logo?: string | null) => {
    if (!logo) return '';
    if (logo.startsWith('http')) return logo;
    const url = logo.startsWith('/') ? logo : `/uploads/${logo}`;
    // Add cache-busting parameter to force fresh load
    return `${url}?t=${Date.now()}`;
  };

  useEffect(() => {
    loadRacks();
  }, []);

  const loadRacks = async () => {
    try {
      setLoading(true);
      const data = await racksAPI.getAll();
      setRacks(data.racks || []);
    } catch (err) {
      console.error('Load racks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRacks = racks.filter((r: any) => {
    const sectionMatch = selectedSection === 'all' || r.code.startsWith(selectedSection);
    const selected = selectedCategory?.toLowerCase();
    const categoryName = r.category?.name?.toLowerCase();
    const rawCategory = typeof r.category === 'string' ? r.category.toLowerCase() : undefined;
    const profileName = r.companyProfile?.name?.toLowerCase();
    const profileId = r.companyProfile?.id?.toLowerCase();

    const categoryMatch =
      selectedCategory === 'all' ||
      selected === categoryName ||
      selected === rawCategory ||
      selected === profileName ||
      selected === profileId;

    // NEW: Zone filter
    const zone = r.zone || 'Unassigned';
    const zoneMatch = selectedZone === 'all' || zone === selectedZone;

    return sectionMatch && categoryMatch && zoneMatch;
  });

  // NEW: Get unique zones for filter buttons
  const uniqueZones = Array.from(new Set(racks.map((r: any) => r.zone || 'Unassigned')))
    .sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });

  // NEW: Toggle zone expansion
  const toggleZone = (zone: string) => {
    const newExpanded = new Set(expandedZones);
    if (newExpanded.has(zone)) {
      newExpanded.delete(zone);
    } else {
      newExpanded.add(zone);
    }
    setExpandedZones(newExpanded);
  };

  // NEW: Group racks by zone
  const racksByZone = filteredRacks.reduce((acc: any, rack: any) => {
    const zone = rack.zone || 'Unassigned';
    if (!acc[zone]) {
      acc[zone] = [];
    }
    acc[zone].push(rack);
    return acc;
  }, {});

  // NEW: Render capacity based on mode (INFORMATIVE VERSION)
  const renderCapacity = (rack: any) => {
    const mode = rack.capacityMode || 'FIXED';

    if (mode === 'UNLIMITED') {
      return <span className="text-purple-600 font-bold">∞ Unlimited</span>;
    }

    if (mode === 'FLEXIBLE') {
      return (
        <span className="flex items-center gap-1 text-blue-700">
          <span className="font-semibold">{rack.currentPallets || 0}/{rack.palletCapacity || 0} 🚚</span>
          <span className="text-gray-400">or</span>
          <span className="font-semibold">{rack.currentBoxes || 0}/{rack.boxCapacity || 0} 📦</span>
        </span>
      );
    }

    // FIXED mode (default)
    return <span className="font-semibold">{rack.capacityUsed || 0}/{rack.capacityTotal || 0} boxes</span>;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleRackClick = async (rack: any) => {
    setDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const response = await racksAPI.getById(rack.id);
      console.log('✅ Rack details loaded:', response.rack);
      console.log('   - companyProfile:', response.rack?.companyProfile);
      console.log('   - companyProfile.name:', response.rack?.companyProfile?.name);
      console.log('   - companyProfile.logo:', response.rack?.companyProfile?.logo);
      setRackDetails(response.rack);
    } catch (err) {
      console.error('❌ Failed to load rack details:', err);
      console.log('⚠️ Falling back to basic rack data:', rack);
      setRackDetails(rack);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBulkQrOpen = async () => {
    setBulkQrModalOpen(true);
    // Generate QR codes for all racks
    setTimeout(async () => {
      for (const rack of racks) {
        const canvas = bulkQrCanvasRefs.current[rack.id];
        if (canvas) {
          try {
            await QRCode.toCanvas(canvas, `RACK_${rack.code.replace(/-/g, '_')}`, {
              width: 200,
              margin: 1,
            });
          } catch (err) {
            console.error(`Failed to generate QR for ${rack.code}:`, err);
          }
        }
      }
    }, 100);
  };

  const handlePrintAllQR = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Load company branding for logo
    let companyLogo = '';
    try {
      const response = await fetch('/api/company/branding');
      const data = await response.json();
      if (data?.branding?.logoUrl) {
        companyLogo = data.branding.logoUrl;
      }
    } catch (err) {
      console.warn('Could not load branding:', err);
    }

    const qrGridHtml = racks.map(rack => {
      const canvas = bulkQrCanvasRefs.current[rack.id];
      if (!canvas) return '';
      const qrDataUrl = canvas.toDataURL();

      // Determine which logo to use: company profile logo or default company logo
      let logoToUse = companyLogo;
      if (rack.companyProfile?.logo) {
        const logoPath = rack.companyProfile.logo;
        logoToUse = logoPath.startsWith('http') ? logoPath : (logoPath.startsWith('/') ? logoPath : `/uploads/${logoPath}`);
      }

      return `
        <div class="qr-item">
          ${logoToUse ? `<img src="${logoToUse}" class="company-logo" alt="Logo" onerror="this.style.display='none'" />` : ''}
          <h3>${rack.code}</h3>
          <p class="location">${rack.location || 'Warehouse'}</p>
          <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
          <p class="code">RACK_${rack.code}</p>
          ${rack.companyProfile?.name ? `<p class="company-name">${rack.companyProfile.name}</p>` : ''}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Rack QR Codes</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .qr-item {
              text-align: center;
              border: 2px solid #000;
              padding: 15px;
              page-break-inside: avoid;
            }
            .company-logo {
              height: 40px;
              width: auto;
              max-width: 120px;
              margin: 0 auto 10px;
              object-fit: contain;
            }
            h3 {
              margin: 0 0 5px 0;
              font-size: 24px;
              font-weight: bold;
            }
            .location {
              margin: 5px 0;
              font-size: 14px;
              color: #666;
            }
            .qr-code {
              width: 100%;
              max-width: 200px;
              margin: 10px 0;
            }
            .code {
              font-size: 16px;
              font-weight: bold;
              font-family: 'Courier New', monospace;
              margin: 5px 0;
            }
            .company-name {
              font-size: 12px;
              color: #5B21B6;
              font-weight: 600;
              margin: 5px 0 0 0;
            }
            @media print {
              body { padding: 10px; }
              .grid { gap: 15px; }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 20px;">Warehouse Rack QR Codes</h1>
          <div class="grid">
            ${qrGridHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Warehouse Racks</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
              ✨ ZONE VIEW
            </span>
          </div>
          <p className="text-gray-600 mt-1">Monitor and manage warehouse storage racks - Now with Zone Organization!</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('zones')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'zones'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              🏢 Zones
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              📦 Grid
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkQrOpen}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
          >
            <CameraIcon className="h-5 w-5 mr-2" />
            Bulk QR
          </button>
          <button
            onClick={() => setBulkAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors shadow-md"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            Bulk Add
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Rack
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Racks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{racks.length}</p>
                </div>
                <CubeIcon className="h-10 w-10 text-primary-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Capacity</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {racks.reduce((sum: number, r: any) => sum + r.capacityTotal, 0)}
                  </p>
                </div>
                <ChartBarIcon className="h-10 w-10 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Occupied</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {racks.reduce((sum: number, r: any) => sum + r.capacityUsed, 0)}
                  </p>
                </div>
                <div className="text-green-600 text-sm font-medium">
                  {racks.length > 0 ? Math.round((racks.reduce((sum: number, r: any) => sum + r.capacityUsed, 0) / racks.reduce((sum: number, r: any) => sum + r.capacityTotal, 0)) * 100) : 0}%
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Available</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {racks.reduce((sum: number, r: any) => sum + (r.capacityTotal - r.capacityUsed), 0)}
                  </p>
                </div>
                <div className="text-blue-600 text-sm font-medium">
                  {racks.length > 0 ? Math.round((racks.reduce((sum: number, r: any) => sum + (r.capacityTotal - r.capacityUsed), 0) / racks.reduce((sum: number, r: any) => sum + r.capacityTotal, 0)) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Section Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="space-y-3">
          {/* Section Buttons */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <MapPinIcon className="h-4 w-4" /> SECTION
            </p>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setSelectedSection('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedSection === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                All Sections
              </button>
              {['A', 'B', 'C'].map((section) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedSection === section ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Section {section}
                </button>
              ))}
            </div>
          </div>

          {/* Category Buttons */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <TagIcon className="h-4 w-4" /> CATEGORY
            </p>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                All Categories
              </button>
              <button
                onClick={() => setSelectedCategory('DIOR')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'DIOR' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
              >
                Dior
              </button>
              <button
                onClick={() => setSelectedCategory('COMPANY_MATERIAL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'COMPANY_MATERIAL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
              >
                Company Material
              </button>
              <button
                onClick={() => setSelectedCategory('JAZEERA')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'JAZEERA' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
              >
                Jazeera
              </button>
              <button
                onClick={() => setSelectedCategory('OTHERS')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 'OTHERS' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
              >
                Others
              </button>
            </div>
          </div>

          {/* NEW: Zone Filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              🏢 ZONES
            </p>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setSelectedZone('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedZone === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                All Zones ({racks.length})
              </button>
              {uniqueZones.map((zone) => {
                const zoneRacks = racks.filter(r => (r.zone || 'Unassigned') === zone);
                const zoneOccupied = zoneRacks.filter(r => r.capacityUsed > 0).length;
                return (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedZone === zone
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                  >
                    <span>{zone === 'Unassigned' ? '📦' : '🏢'} {zone}</span>
                    <span className="text-xs opacity-75">({zoneRacks.length})</span>
                    {zoneOccupied > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedZone === zone ? 'bg-white/20' : 'bg-green-100 text-green-700'
                        }`}>
                        {zoneOccupied} active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Zone View or Grid View */}
      {viewMode === 'zones' ? (
        /* Zone Accordion View */
        <div className="space-y-4">
          {Object.keys(racksByZone).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
          }).map((zoneName) => {
            const zoneRacks = racksByZone[zoneName];
            const isExpanded = expandedZones.has(zoneName);
            const totalRacks = zoneRacks.length;
            const occupiedRacks = zoneRacks.filter((r: any) => r.capacityUsed > 0).length;
            const availableRacks = zoneRacks.filter((r: any) => r.capacityUsed === 0).length;
            const fullRacks = zoneRacks.filter((r: any) => r.capacityUsed >= r.capacityTotal).length;

            const totalCapacity = zoneRacks.reduce((sum: number, r: any) => sum + (r.capacityTotal || 0), 0);
            const usedCapacity = zoneRacks.reduce((sum: number, r: any) => sum + (r.capacityUsed || 0), 0);
            const utilizationPercent = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

            // Get zone icon and description from first rack in zone (all racks in zone should have same icon/description)
            const zoneIcon = zoneRacks[0]?.zoneIcon || (zoneName === 'Unassigned' ? '📦' : '🏢');
            const zoneDescription = zoneRacks[0]?.zoneDescription || '';

            // Get company name from racks in this zone (if all racks belong to same company)
            const companyNames = [...new Set(zoneRacks.map((r: any) => r.companyProfile?.name).filter(Boolean))];
            const singleCompanyName = companyNames.length === 1 ? String(companyNames[0]) : null;

            // Calculate pallet and box totals
            const totalPallets = zoneRacks.reduce((sum: number, r: any) => sum + (r.currentPallets || 0), 0);
            const totalBoxes = zoneRacks.reduce((sum: number, r: any) => sum + (r.currentBoxes || 0), 0);
            const palletCapacity = zoneRacks.reduce((sum: number, r: any) => sum + (r.palletCapacity || 0), 0);
            const boxCapacity = zoneRacks.reduce((sum: number, r: any) => sum + (r.boxCapacity || 0), 0);

            return (
              <div key={zoneName} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
                {/* Zone Header - Clickable */}
                <button
                  onClick={() => toggleZone(zoneName)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Zone Icon */}
                    <div className="text-5xl">
                      {zoneIcon}
                    </div>

                    {/* Zone Info */}
                    <div className="text-left flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {zoneName === 'Unassigned' ? '📦 Unassigned Racks' : `Zone ${zoneName}`}
                        {totalRacks === 0 && (
                          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Empty</span>
                        )}
                        {singleCompanyName && (
                          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {singleCompanyName}
                          </span>
                        )}
                      </h3>

                      {/* Zone Description */}
                      {zoneDescription && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          {zoneDescription}
                        </p>
                      )}

                      {/* Detailed Stats */}
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        {/* Total Racks */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {totalRacks} Racks
                          </span>
                        </div>

                        {/* Available */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-sm text-green-700 font-medium">
                            {availableRacks} Available
                          </span>
                        </div>

                        {/* Occupied */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="text-sm text-blue-700 font-medium">
                            {occupiedRacks - fullRacks} In Use
                          </span>
                        </div>

                        {/* Full */}
                        {fullRacks > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            <span className="text-sm text-red-700 font-medium">
                              {fullRacks} Full
                            </span>
                          </div>
                        )}

                        {/* Capacity Details */}
                        <div className="flex items-center gap-3 ml-2 border-l pl-3">
                          {palletCapacity > 0 && (
                            <span className="text-xs text-gray-600">
                              🎯 <strong>{totalPallets}/{palletCapacity}</strong> pallets
                            </span>
                          )}
                          {boxCapacity > 0 && (
                            <span className="text-xs text-gray-600">
                              📦 <strong>{totalBoxes}/{boxCapacity}</strong> boxes
                            </span>
                          )}
                          {palletCapacity === 0 && boxCapacity === 0 && (
                            <span className="text-xs text-gray-600">
                              💼 <strong>{usedCapacity}/{totalCapacity}</strong> items
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Utilization & Controls */}
                  <div className="flex items-center gap-4">
                    {/* Utilization Indicator */}
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${utilizationPercent >= 90 ? 'text-red-600' :
                          utilizationPercent >= 70 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                          {utilizationPercent >= 90 ? '🔴' : utilizationPercent >= 70 ? '🟡' : '🟢'}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {utilizationPercent}%
                        </span>
                      </div>
                      {/* Utilization Bar */}
                      <div className="w-32 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-300 ${utilizationPercent >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            utilizationPercent >= 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                              'bg-gradient-to-r from-green-500 to-green-600'
                            }`}
                          style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-medium mt-0.5 block ${utilizationPercent >= 90 ? 'text-red-600' :
                        utilizationPercent >= 70 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                        {utilizationPercent >= 90 ? 'Critical' :
                          utilizationPercent >= 70 ? 'High' :
                            'Healthy'}
                      </span>
                    </div>

                    {/* Expand/Collapse Icon */}
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Zone Content - Expandable */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {zoneRacks.map((rack: any) => {
                        const totalCapacity = rack.capacityTotal && rack.capacityTotal > 0 ? rack.capacityTotal : 1;
                        const utilization = typeof rack.utilization === 'number'
                          ? rack.utilization
                          : Math.round((rack.capacityUsed / totalCapacity) * 100);

                        const uniqueShipments = new Set();
                        if (rack.boxes && Array.isArray(rack.boxes)) {
                          rack.boxes.forEach((box: any) => {
                            if (box.shipmentId) {
                              uniqueShipments.add(box.shipmentId);
                            }
                          });
                        }
                        const shipmentCount = uniqueShipments.size;
                        // const available = Math.max(totalCapacity - rack.capacityUsed, 0);

                        return (
                          <div
                            key={rack.id}
                            onClick={() => handleRackClick(rack)}
                            className="group relative bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 p-3 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
                          >
                            {/* Company Logo Badge - Top Right */}
                            {rack.companyProfile && (
                              <div
                                className="absolute top-2 right-2 group/logo z-10"
                                title={rack.companyProfile.name || 'Company'}
                              >
                                {rack.companyProfile.logo ? (
                                  <div className="relative">
                                    <img
                                      src={resolveLogoUrl(rack.companyProfile.logo)}
                                      alt={rack.companyProfile.name}
                                      className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-contain bg-white border-2 border-gray-200 shadow-md group-hover/logo:scale-110 transition-transform"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        console.error('Failed to load logo:', rack.companyProfile.logo);
                                      }}
                                    />
                                    {/* Hover Tooltip */}
                                    <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover/logo:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                      {rack.companyProfile.name}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-md border-2 border-white group-hover/logo:scale-110 transition-transform">
                                    {rack.companyProfile.name?.substring(0, 2).toUpperCase() || 'CO'}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Edit Button - Appears on Hover */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRack(rack);
                                setEditModalOpen(true);
                              }}
                              className={`absolute ${rack.companyProfile ? 'top-14' : 'top-2'} right-2 p-1.5 bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 z-10`}
                              title="Edit Rack"
                            >
                              <PencilIcon className="h-3.5 w-3.5 text-blue-600" />
                            </button>

                            {/* Status Indicator */}
                            <div className="flex items-center justify-between mb-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${getUtilizationColor(utilization)} animate-pulse`} />
                              {rack.capacityMode && rack.capacityMode !== 'FIXED' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${rack.capacityMode === 'UNLIMITED' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {rack.capacityMode === 'UNLIMITED' ? '∞' : '⚡'}
                                </span>
                              )}
                            </div>

                            {/* Rack Code */}
                            <div className="mb-2">
                              <h4 className="text-lg font-bold text-gray-900">{rack.code}</h4>
                              <p className="text-xs text-gray-500 truncate">{rack.location || 'Warehouse'}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${getUtilizationColor(utilization)}`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>

                            {/* Capacity Info */}
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-gray-600">{renderCapacity(rack)}</span>
                              <span className="font-bold text-gray-900">{utilization}%</span>
                            </div>

                            {/* Shipment Count */}
                            {shipmentCount > 0 && (
                              <div className="pt-2 border-t flex items-center gap-1">
                                <TruckIcon className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-xs text-blue-600 font-semibold">{shipmentCount} shipment{shipmentCount > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Original Grid View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5" /> Warehouse Layout
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">0-50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">50-90%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">90-100%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredRacks.map((rack: any) => {
              const totalCapacity = rack.capacityTotal && rack.capacityTotal > 0 ? rack.capacityTotal : 1;
              const utilization = typeof rack.utilization === 'number'
                ? rack.utilization
                : Math.round((rack.capacityUsed / totalCapacity) * 100);

              // Count unique shipments from boxes
              const uniqueShipments = new Set();
              if (rack.boxes && Array.isArray(rack.boxes)) {
                rack.boxes.forEach((box: any) => {
                  if (box.shipmentId) {
                    uniqueShipments.add(box.shipmentId);
                  }
                });
              }
              const shipmentCount = uniqueShipments.size;
              const available = Math.max(totalCapacity - rack.capacityUsed, 0);

              return (
                <div
                  key={rack.id}
                  onClick={() => handleRackClick(rack)}
                  className="group relative bg-gradient-to-br from-white to-gray-50 border rounded-xl p-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: utilization >= 90 ? '#ef4444' : utilization >= 50 ? '#eab308' : '#10b981'
                  }}
                >
                  {/* Company Logo Badge - Top Left */}
                  {rack.companyProfile && (
                    <div
                      className="absolute -top-2 -left-2 group/logo z-10"
                      title={rack.companyProfile.name || 'Company'}
                    >
                      {rack.companyProfile.logo ? (
                        <div className="relative">
                          <img
                            src={resolveLogoUrl(rack.companyProfile.logo)}
                            alt={rack.companyProfile.name}
                            className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-contain bg-white border-2 border-gray-300 shadow-md group-hover/logo:scale-125 transition-transform"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              console.error('Failed to load logo:', rack.companyProfile.logo);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] shadow-md border-2 border-white group-hover/logo:scale-125 transition-transform">
                          {rack.companyProfile.name?.substring(0, 2).toUpperCase() || 'CO'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shadow ${rack.status === 'ACTIVE'
                      ? utilization >= 100
                        ? 'bg-red-500 text-white'
                        : utilization >= 90
                          ? 'bg-yellow-500 text-white'
                          : 'bg-green-500 text-white'
                      : 'bg-gray-400 text-white'
                      }`}>
                      {rack.status === 'ACTIVE'
                        ? utilization >= 100
                          ? 'FULL'
                          : utilization >= 90
                            ? 'BUSY'
                            : 'OK'
                        : 'OFF'}
                    </span>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRack(rack);
                      setEditModalOpen(true);
                    }}
                    className="absolute top-2 left-2 p-1.5 bg-white rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50"
                    title="Edit Rack"
                  >
                    <PencilIcon className="h-4 w-4 text-blue-600" />
                  </button>

                  {/* Rack Code - ENHANCED SIZE */}
                  <div className="mb-4 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <QrCodeIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <span className="text-2xl font-bold text-gray-900 leading-tight">{rack.code}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">{rack.location || 'N/A'}</p>
                  </div>

                  {/* Capacity Info - Mode Badge */}
                  <div className="space-y-3">
                    {rack.capacityMode && (
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${rack.capacityMode === 'UNLIMITED'
                          ? 'bg-purple-100 text-purple-700'
                          : rack.capacityMode === 'FLEXIBLE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}>
                          {rack.capacityMode === 'UNLIMITED' ? '∞ Unlimited' : rack.capacityMode === 'FLEXIBLE' ? '⚡ Flexible' : '📦 Fixed'}
                        </span>
                      </div>
                    )}

                    {/* Capacity Display Based on Mode */}
                    {rack.capacityMode === 'UNLIMITED' ? (
                      <div className="text-center py-2">
                        <span className="text-4xl">∞</span>
                        <p className="text-sm font-semibold text-purple-600 mt-1">Unlimited Capacity</p>
                      </div>
                    ) : rack.capacityMode === 'FLEXIBLE' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            🚚 Pallets
                          </span>
                          <span className="text-lg font-bold text-gray-900">{rack.currentPallets || 0}/{rack.palletCapacity || 0}</span>
                        </div>
                        <div className="text-center text-xs font-bold text-gray-400">OR</div>
                        <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            📦 Boxes
                          </span>
                          <span className="text-lg font-bold text-gray-900">{rack.currentBoxes || 0}/{rack.boxCapacity || 0}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Capacity (boxes)</span>
                        <span className="text-lg font-bold text-gray-900">{rack.capacityUsed}/{rack.capacityTotal}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getUtilizationColor(utilization)}`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-md">{utilization}%</span>
                      </div>
                    </div>

                    {/* Stats - ENHANCED SIZE */}
                    <div className="flex items-center justify-between pt-2 border-t-2 border-gray-200">
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Available</p>
                        <p className="text-xl font-bold text-green-600">{available}</p>
                      </div>
                      <div className="h-10 w-px bg-gray-300"></div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Shipments</p>
                        <p className="text-xl font-bold text-blue-600">{shipmentCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRacks.length === 0 && (
            <div className="text-center py-12">
              <CubeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No racks found</p>
              <p className="text-sm text-gray-400 mt-1">Try selecting a different section</p>
            </div>
          )}
        </div>
      )}

      {/* Create Rack Modal */}
      <CreateRackModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadRacks}
      />

      {/* Edit Rack Modal */}
      <EditRackModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        rack={selectedRack}
        onSuccess={loadRacks}
      />

      {/* Rack Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-blue-600 text-white px-6 py-5 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <QrCodeIcon className="h-8 w-8" />
                  Rack {rackDetails?.code || '...'}
                </h2>
                <p className="text-sm text-blue-100 mt-1 flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" /> {rackDetails?.location || 'Loading...'}
                </p>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-white hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition"
              >
                <XMarkIcon className="h-7 w-7" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-500 font-medium">Loading rack details...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${rackDetails?.status === 'ACTIVE'
                        ? rackDetails.capacityUsed >= rackDetails.capacityTotal
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {rackDetails?.status === 'ACTIVE'
                          ? rackDetails.capacityUsed >= rackDetails.capacityTotal
                            ? <><ExclamationCircleIcon className="h-4 w-4" /> FULL</>
                            : <><CheckCircleIcon className="h-4 w-4" /> ACTIVE</>
                          : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Pallet Capacity</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {rackDetails?.capacityUsed}/{rackDetails?.capacityTotal}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Available Pallets</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.max((rackDetails?.capacityTotal || 0) - (rackDetails?.capacityUsed || 0), 0)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Utilization</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {rackDetails && rackDetails.capacityTotal > 0
                          ? Math.round((rackDetails.capacityUsed / rackDetails.capacityTotal) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rack Information */}
                <div className="px-6 pt-4 pb-2 bg-white border-b">
                  <div className="grid grid-cols-2 gap-6">
                    {rackDetails?.companyProfile && rackDetails.companyProfile.name && (
                      <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                        {rackDetails.companyProfile.logo && (
                          <img
                            src={resolveLogoUrl(rackDetails.companyProfile.logo)}
                            alt={`${rackDetails.companyProfile.name} logo`}
                            className="h-16 w-16 rounded-lg object-contain bg-white border border-purple-200"
                            onError={(e) => {
                              console.warn('Logo failed to load:', rackDetails.companyProfile.logo);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Company / Profile</p>
                          <p
                            className="text-lg font-bold text-purple-900 truncate cursor-pointer underline-offset-2 hover:underline"
                            title="Filter boxes by this company"
                            onClick={() => setCompanyFilter(prev => prev === rackDetails.companyProfile.name ? null : rackDetails.companyProfile.name)}
                          >
                            {rackDetails.companyProfile.name}
                          </p>
                          {rackDetails.companyProfile.contractStatus && (
                            <p className="text-xs font-semibold text-purple-700 uppercase">
                              {rackDetails.companyProfile.contractStatus}
                            </p>
                          )}
                          {(rackDetails.companyProfile.contactPerson || rackDetails.companyProfile.contactPhone) && (
                            <p className="text-xs text-purple-700 mt-1">
                              {rackDetails.companyProfile.contactPerson && `Contact: ${rackDetails.companyProfile.contactPerson}`}
                              {rackDetails.companyProfile.contactPerson && rackDetails.companyProfile.contactPhone && ' ?? '}
                              {rackDetails.companyProfile.contactPhone && `Phone: ${rackDetails.companyProfile.contactPhone}`}
                            </p>
                          )}
                          {rackDetails.companyProfile.description && (
                            <p className="text-xs text-purple-700 mt-2 line-clamp-3">
                              {rackDetails.companyProfile.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Category */}
                    {rackDetails?.category && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                          <TagIcon className="h-4 w-4" /> Category
                        </p>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${rackDetails.category === 'DIOR'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : rackDetails.category === 'COMPANY_MATERIAL'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : rackDetails.category === 'JAZEERA'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}>
                          {rackDetails.category === 'DIOR' && 'Dior'}
                          {rackDetails.category === 'COMPANY_MATERIAL' && 'Company Material'}
                          {rackDetails.category === 'JAZEERA' && 'Jazeera'}
                          {rackDetails.category === 'OTHERS' && 'Others'}
                        </span>
                      </div>
                    )}

                    {/* Dimensions */}
                    {(rackDetails?.length || rackDetails?.width || rackDetails?.height) && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                          <SquaresPlusIcon className="h-4 w-4" /> Dimensions
                        </p>
                        <div className="flex items-center gap-2 text-sm font-mono bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                          {rackDetails.length && (
                            <span className="font-bold text-gray-900">
                              L: {rackDetails.length}
                            </span>
                          )}
                          {rackDetails.width && (
                            <>
                              <span className="text-gray-400">??</span>
                              <span className="font-bold text-gray-900">
                                W: {rackDetails.width}
                              </span>
                            </>
                          )}
                          {rackDetails.height && (
                            <>
                              <span className="text-gray-400">??</span>
                              <span className="font-bold text-gray-900">
                                H: {rackDetails.height}
                              </span>
                            </>
                          )}
                          <span className="text-xs text-gray-500 ml-1">
                            {rackDetails.dimensionUnit === 'FEET' ? 'ft' : 'm'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {/* Shipments List - Full Width */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <RectangleStackIcon className="h-5 w-5" /> Stored Shipments ({rackDetails?.boxes?.length || 0})
                    </h3>

                    {rackDetails?.boxes && rackDetails.boxes.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {(() => {
                          // Group boxes by pallet number
                          const groups = new Map<number, any[]>();
                          const filtered = rackDetails.boxes.filter((box: any) => {
                            if (!companyFilter) return true;
                            const name = box.shipment?.companyProfile?.name || box.shipment?.clientName || '';
                            return name === companyFilter;
                          });
                          filtered.forEach((box: any) => {
                            let pn = 0;
                            try {
                              const meta = box.pieceQR ? JSON.parse(box.pieceQR) : undefined;
                              pn = Number(meta?.palletNumber || 0);
                            } catch {
                              const m = /-PAL-(\d+)/.exec(box.qrCode || '');
                              pn = m ? parseInt(m[1], 10) : 0;
                            }
                            if (!groups.has(pn)) groups.set(pn, []);
                            groups.get(pn)!.push(box);
                          });
                          // Render groups: pallets first in order, then loose (0)
                          const ordered = Array.from(groups.entries()).sort((a, b) => {
                            if (a[0] === 0) return 1;
                            if (b[0] === 0) return -1;
                            return a[0] - b[0];
                          });
                          return ordered.map(([pn, boxes]) => (
                            <div key={`grp-${pn}`}>
                              <div className={`flex items-center justify-between mb-2 ${pn === 0 ? 'text-purple-800' : 'text-amber-800'}`}>
                                <h4 className={`text-sm font-bold ${pn === 0 ? '' : ''}`}>
                                  {pn === 0 ? 'Loose' : `Pallet #${pn}`} ({boxes.length} pcs)
                                </h4>
                                <div className={`text-[10px] px-2 py-0.5 rounded-full border ${pn === 0 ? 'border-dashed border-purple-400 text-purple-600' : 'border-amber-400 text-amber-600'}`}>
                                  {pn === 0 ? 'LOOSE' : 'PALLET'}
                                </div>
                              </div>
                              <div className="space-y-3">
                                {(() => {
                                  // Group boxes by shipment
                                  const shipmentGroups = new Map<string, any[]>();
                                  boxes.forEach((box: any) => {
                                    const shipmentId = box.shipment?.id || 'unknown';
                                    if (!shipmentGroups.has(shipmentId)) {
                                      shipmentGroups.set(shipmentId, []);
                                    }
                                    shipmentGroups.get(shipmentId)!.push(box);
                                  });

                                  return Array.from(shipmentGroups.values()).map((shipmentBoxes: any[], shipmentIdx: number) => {
                                    const firstBox = shipmentBoxes[0];
                                    const shipment = firstBox.shipment;

                                    // Collect UNIQUE photos from all boxes in this shipment (avoid duplicates)
                                    const allPhotos: string[] = [];
                                    const photoSet = new Set<string>();
                                    shipmentBoxes.forEach((box: any) => {
                                      if (box.photos) {
                                        try {
                                          const parsed = JSON.parse(box.photos);
                                          if (Array.isArray(parsed)) {
                                            parsed.forEach((url: string) => {
                                              if (!photoSet.has(url)) {
                                                photoSet.add(url);
                                                allPhotos.push(url);
                                              }
                                            });
                                          }
                                        } catch (error) {
                                          console.warn('Failed to parse box photos', error);
                                        }
                                      }
                                    });

                                    return (
                                      <ShipmentBoxCard
                                        key={`shipment-${shipmentIdx}`}
                                        shipment={shipment}
                                        boxCount={shipmentBoxes.length}
                                        photos={allPhotos}
                                        assignedDate={firstBox.assignedAt}
                                      />
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-4xl mb-3">????</div>
                        <p className="text-gray-500 font-medium">No shipments stored</p>
                        <p className="text-sm text-gray-400 mt-1">This rack is empty</p>
                      </div>
                    )}
                  </div>
                </div>

                {companyFilter && (
                  <div className="px-6 pb-4 -mt-2">
                    <button
                      onClick={() => setCompanyFilter(null)}
                      className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700"
                    >
                      Clear company filter
                    </button>
                  </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <InformationCircleIcon className="h-5 w-5 inline mr-1" />
                    Click on any shipment for more details
                  </div>
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk QR Codes Modal */}
      {bulkQrModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-5 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <CameraIcon className="h-8 w-8" />
                  Bulk QR Codes - All Racks
                </h2>
                <p className="text-sm text-purple-100 mt-1">
                  {racks.length} racks total
                </p>
              </div>
              <button
                onClick={() => setBulkQrModalOpen(false)}
                className="text-white hover:text-gray-200 p-2 rounded-lg hover:bg-white/10 transition"
              >
                <XMarkIcon className="h-7 w-7" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {racks.map((rack) => (
                  <div
                    key={rack.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 text-center hover:border-purple-400 hover:shadow-lg transition-all"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{rack.code}</h3>
                    <p className="text-xs text-gray-500 mb-3">{rack.location || 'Warehouse'}</p>
                    <canvas
                      ref={(el) => {
                        if (el) bulkQrCanvasRefs.current[rack.id] = el;
                      }}
                      className="mx-auto mb-3"
                    />
                    <p className="text-xs font-mono font-bold text-gray-600">RACK_{rack.code}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <InformationCircleIcon className="h-5 w-5 inline mr-1" />
                Print all QR codes at once
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setBulkQrModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintAllQR}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-lg"
                >
                  <PrinterIcon className="h-5 w-5" />
                  Print All QR Codes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      <BulkAddRackModal
        isOpen={bulkAddModalOpen}
        onClose={() => setBulkAddModalOpen(false)}
        onSuccess={() => {
          loadRacks();
          setBulkAddModalOpen(false);
        }}
      />
    </div>
  );
};


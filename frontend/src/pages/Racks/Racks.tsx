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
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { racksAPI } from '../../services/api';
import CreateRackModal from '../../components/CreateRackModal';
import EditRackModal from '../../components/EditRackModal';
import QRCode from 'qrcode';

// Shipment Box Card Component (to avoid hooks in loops)
const ShipmentBoxCard: React.FC<{
  shipment: any;
  boxCount: number;
  photos: string[];
}> = ({ shipment, boxCount, photos }) => {
  const [showPhotos, setShowPhotos] = useState(false);

  return (
    <div className="bg-gradient-to-r from-white to-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-blue-600">
              #{shipment?.referenceId || 'N/A'}
            </span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              shipment?.status === 'IN_WAREHOUSE' || shipment?.status === 'PARTIAL'
                ? 'bg-green-100 text-green-800'
                : shipment?.status === 'RELEASED'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {shipment?.status || 'N/A'}
            </span>
          </div>
          <p className="text-xs text-gray-700 font-semibold">
            📦 {shipment?.companyProfile?.name || shipment?.clientName || 'Unknown Company'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Boxes: <span className="font-semibold text-gray-700">{boxCount}</span>
          </p>
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
  const [racks, setRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
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
    return logo.startsWith('/') ? logo : `/uploads/${logo}`;
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

    return sectionMatch && categoryMatch;
  });

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
            await QRCode.toCanvas(canvas, `RACK_${rack.code}`, {
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

  const handlePrintAllQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrGridHtml = racks.map(rack => {
      const canvas = bulkQrCanvasRefs.current[rack.id];
      if (!canvas) return '';
      const qrDataUrl = canvas.toDataURL();
      return `
        <div class="qr-item">
          <h3>${rack.code}</h3>
          <p class="location">${rack.location || 'Warehouse'}</p>
          <img src="${qrDataUrl}" alt="QR Code" />
          <p class="code">RACK_${rack.code}</p>
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
            h3 {
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .location {
              margin: 5px 0;
              font-size: 14px;
              color: #666;
            }
            img {
              width: 100%;
              max-width: 200px;
              margin: 10px 0;
            }
            .code {
              font-size: 16px;
              font-weight: bold;
              font-family: 'Courier New', monospace;
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
              ✨ UPDATED
            </span>
          </div>
          <p className="text-gray-600 mt-1">Monitor and manage warehouse storage racks - Now with enhanced UI!</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBulkQrOpen}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <CameraIcon className="h-5 w-5 mr-2" />
            Bulk QR Codes
          </button>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedSection === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Sections
              </button>
              {['A', 'B', 'C'].map((section) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedSection === section ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              <button
                onClick={() => setSelectedCategory('DIOR')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'DIOR' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Dior
              </button>
              <button
                onClick={() => setSelectedCategory('COMPANY_MATERIAL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'COMPANY_MATERIAL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Company Material
              </button>
              <button
                onClick={() => setSelectedCategory('JAZEERA')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'JAZEERA' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                Jazeera
              </button>
              <button
                onClick={() => setSelectedCategory('OTHERS')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'OTHERS' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Others
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Rack Grid - Modern & Clean Design */}
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
                  {/* Status Badge */}
                  <div className="absolute -top-2 -right-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shadow ${
                      rack.status === 'ACTIVE'
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
                  
                  {/* Capacity Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Capacity (pallets)</span>
                      <span className="text-lg font-bold text-gray-900">{rack.capacityUsed}/{rack.capacityTotal}</span>
                    </div>
                    
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
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                        rackDetails?.status === 'ACTIVE'
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
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                          rackDetails.category === 'DIOR' 
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
                            const ordered = Array.from(groups.entries()).sort((a,b) => {
                              if (a[0] === 0) return 1;
                              if (b[0] === 0) return -1;
                              return a[0] - b[0];
                            });
                            return ordered.map(([pn, boxes]) => (
                              <div key={`grp-${pn}`}>
                                <div className={`flex items-center justify-between mb-2 ${pn===0 ? 'text-purple-800' : 'text-amber-800'}`}>
                                  <h4 className={`text-sm font-bold ${pn===0 ? '' : ''}`}>
                                    {pn === 0 ? 'Loose' : `Pallet #${pn}`} ({boxes.length} pcs)
                                  </h4>
                                  <div className={`text-[10px] px-2 py-0.5 rounded-full border ${pn===0 ? 'border-dashed border-purple-400 text-purple-600' : 'border-amber-400 text-amber-600'}`}>
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
                                      
                                      // Collect all photos from all boxes in this shipment
                                      const allPhotos: string[] = [];
                                      shipmentBoxes.forEach((box: any) => {
                                        if (box.photos) {
                                          try {
                                            const parsed = JSON.parse(box.photos);
                                            if (Array.isArray(parsed)) {
                                              allPhotos.push(...parsed);
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
    </div>
  );
};


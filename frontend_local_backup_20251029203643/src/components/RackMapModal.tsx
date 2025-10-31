import { useState, useEffect } from 'react';
import { racksAPI } from '../services/api';
import { QrCodeIcon, CheckCircleIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface RackMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRack: (rackId: string, rackCode: string) => void;
  selectedRackId?: string;
}

interface Box {
  id: string;
  boxNumber: string;
  photos?: string; // JSON string of photo URLs
  shipment: {
    id: string;
    referenceId: string;
    shipper?: string;
    consignee?: string;
    status: string;
  };
}

interface Rack {
  id: string;
  code: string;
  location: string;
  capacityTotal: number;
  capacityUsed: number;
  status: string;
  rackType: string;
  boxes?: Box[];
}

export default function RackMapModal({ isOpen, onClose, onSelectRack, selectedRackId }: RackMapModalProps) {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, available, full
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedRackDetails, setSelectedRackDetails] = useState<Rack | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRacks();
    }
  }, [isOpen]);

  const loadRacks = async () => {
    try {
      setLoading(true);
      const response = await racksAPI.getAll();
      setRacks(response.racks || []);
    } catch (err) {
      console.error('Load racks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationPercent = (rack: Rack) => {
    return Math.round((rack.capacityUsed / rack.capacityTotal) * 100);
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    if (percent >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const filteredRacks = racks.filter(rack => {
    // Section filter
    if (selectedSection !== 'all' && !rack.code.startsWith(selectedSection)) {
      return false;
    }

    // Availability filter
    if (filter === 'available' && rack.capacityUsed >= rack.capacityTotal) {
      return false;
    }
    if (filter === 'full' && rack.capacityUsed < rack.capacityTotal) {
      return false;
    }

    return true;
  });

  // Get unique sections from rack codes (A, B, C, etc.)
  const sections = Array.from(new Set(racks.map(r => r.code.charAt(0)))).sort();

  const handleRackClick = async (rack: Rack) => {
    // Show rack details instead of directly selecting
    setLoadingDetails(true);
    try {
      const response = await racksAPI.getById(rack.id);
      setSelectedRackDetails(response.rack);
    } catch (err) {
      console.error('Failed to load rack details:', err);
      // Fallback to basic rack data
      setSelectedRackDetails(rack);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectThisRack = () => {
    if (selectedRackDetails && selectedRackDetails.status === 'ACTIVE' && selectedRackDetails.capacityUsed < selectedRackDetails.capacityTotal) {
      onSelectRack(selectedRackDetails.id, selectedRackDetails.code);
      onClose();
    }
  };

  const closeDetails = () => {
    setSelectedRackDetails(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">🗺️ Warehouse Rack Map</h2>
            <p className="text-sm text-purple-100 mt-1">Select a rack with available space</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Section Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Section:</span>
              <button
                onClick={() => setSelectedSection('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedSection === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {sections.map(section => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    selectedSection === section
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Availability Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Show:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('available')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === 'available'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setFilter('full')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === 'full'
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Full
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">0-50% Full</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">50-75% Full</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">75-90% Full</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">90-100% Full</span>
            </div>
          </div>
        </div>

        {/* Rack Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredRacks.map(rack => {
                const utilization = getUtilizationPercent(rack);
                const isAvailable = rack.status === 'ACTIVE' && rack.capacityUsed < rack.capacityTotal;
                const isSelected = rack.id === selectedRackId;

                return (
                  <button
                    key={rack.id}
                    onClick={() => handleRackClick(rack)}
                    className={`relative border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600'
                        : isAvailable
                        ? 'border-gray-300 hover:border-purple-400'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2">
                        <CheckCircleIcon className="h-6 w-6 text-purple-600 bg-white rounded-full" />
                      </div>
                    )}

                    {/* Info Icon */}
                    <div className="absolute top-2 right-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                    </div>

                    {/* Rack Code */}
                    <div className="flex items-center gap-1 mb-2 mt-2">
                      <QrCodeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">{rack.code}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                          rack.status === 'ACTIVE'
                            ? utilization >= 100 
                              ? 'bg-red-100 text-red-800'
                              : utilization >= 90
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rack.status === 'ACTIVE' 
                          ? utilization >= 100 
                            ? '🔴 FULL' 
                            : utilization >= 90 
                            ? '🟡 ALMOST FULL' 
                            : '🟢 AVAILABLE'
                          : rack.status}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="text-xs text-gray-500 mb-3 truncate" title={rack.location}>
                      📍 {rack.location}
                    </div>

                    {/* Capacity */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Capacity</span>
                        <span className="font-medium text-gray-900">
                          {rack.capacityUsed}/{rack.capacityTotal}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${getUtilizationColor(utilization)}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-center text-gray-500 font-semibold">{utilization}%</div>
                    </div>

                    {/* Available Space */}
                    {isAvailable ? (
                      <div className="mt-2 text-xs font-medium text-green-600 text-center">
                        ✓ {rack.capacityTotal - rack.capacityUsed} spaces
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-medium text-red-600 text-center">
                        ✗ No space
                      </div>
                    )}

                    {/* Click to view hint */}
                    <div className="mt-2 text-xs text-blue-600 text-center font-medium">
                      Click to view details
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && filteredRacks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No racks found</p>
              <p className="text-sm mt-2">Try changing the filters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredRacks.length}</span> of{' '}
            <span className="font-semibold">{racks.length}</span> racks
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Rack Details Sidebar */}
      {selectedRackDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-end z-[60]">
          <div className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <QrCodeIcon className="h-7 w-7" />
                  Rack {selectedRackDetails.code}
                </h3>
                <p className="text-sm text-blue-100 mt-1">📍 {selectedRackDetails.location}</p>
              </div>
              <button
                onClick={closeDetails}
                className="text-white hover:text-gray-200 text-3xl font-bold"
              >
                <XMarkIcon className="h-8 w-8" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Stats Section */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium">Status</p>
                      <p className="text-lg font-bold mt-1">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          selectedRackDetails.status === 'ACTIVE'
                            ? selectedRackDetails.capacityUsed >= selectedRackDetails.capacityTotal
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedRackDetails.status === 'ACTIVE'
                            ? selectedRackDetails.capacityUsed >= selectedRackDetails.capacityTotal
                              ? '🔴 FULL'
                              : '🟢 AVAILABLE'
                            : selectedRackDetails.status}
                        </span>
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium">Capacity</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {selectedRackDetails.capacityUsed}/{selectedRackDetails.capacityTotal}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                      <p className="text-xs text-gray-500 font-medium">Available</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {selectedRackDetails.capacityTotal - selectedRackDetails.capacityUsed}
                      </p>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Utilization</span>
                      <span className="text-sm font-bold text-gray-900">
                        {getUtilizationPercent(selectedRackDetails)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all ${getUtilizationColor(getUtilizationPercent(selectedRackDetails))}`}
                        style={{ width: `${Math.min(getUtilizationPercent(selectedRackDetails), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Shipments List */}
                <div className="flex-1 overflow-y-auto p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    📦 Stored Shipments ({selectedRackDetails.boxes?.length || 0})
                  </h4>

                  {selectedRackDetails.boxes && selectedRackDetails.boxes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRackDetails.boxes.map((box) => {
                        let photoUrls: string[] = [];
                        if (box.photos) {
                          try {
                            const parsed = JSON.parse(box.photos);
                            photoUrls = Array.isArray(parsed) ? parsed : [];
                          } catch (error) {
                            console.warn('Failed to parse box photos', error);
                            photoUrls = [];
                          }
                        }
                        return (
                        <div
                          key={box.id}
                          className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-blue-600">
                                  #{box.shipment.referenceId}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  box.shipment.status === 'STORED'
                                    ? 'bg-green-100 text-green-800'
                                    : box.shipment.status === 'RELEASED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {box.shipment.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Box: <span className="font-semibold text-gray-700">{box.boxNumber}</span>
                              </p>
                            </div>
                          </div>
                          {box.shipment.shipper && (
                            <div className="text-xs text-gray-600 mt-2 space-y-1">
                              <p>📤 <span className="font-medium">From:</span> {box.shipment.shipper}</p>
                              {box.shipment.consignee && (
                                <p>📥 <span className="font-medium">To:</span> {box.shipment.consignee}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Photo Gallery */}
                          {photoUrls.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                📷 Photos ({photoUrls.length})
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {photoUrls.map((url: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative block aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all"
                                  >
                                    <img
                                      src={url}
                                      alt={`Box photo ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                      <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100">
                                        🔍 View
                                      </span>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-gray-500 font-medium">No shipments stored</p>
                      <p className="text-sm text-gray-400 mt-1">This rack is empty</p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50 flex gap-3">
                  <button
                    onClick={closeDetails}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                  >
                    Close
                  </button>
                  {selectedRackDetails.status === 'ACTIVE' && selectedRackDetails.capacityUsed < selectedRackDetails.capacityTotal && (
                    <button
                      onClick={handleSelectThisRack}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg"
                    >
                      ✓ Select This Rack
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

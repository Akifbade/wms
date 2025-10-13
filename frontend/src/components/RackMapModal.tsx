import { useState, useEffect } from 'react';
import { racksAPI } from '../services/api';
import { QrCodeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface RackMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRack: (rackId: string, rackCode: string) => void;
  selectedRackId?: string;
}

interface Rack {
  id: string;
  code: string;
  location: string;
  capacityTotal: number;
  capacityUsed: number;
  status: string;
  rackType: string;
}

export default function RackMapModal({ isOpen, onClose, onSelectRack, selectedRackId }: RackMapModalProps) {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, available, full
  const [selectedSection, setSelectedSection] = useState('all');

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

  const handleRackClick = (rack: Rack) => {
    if (rack.status === 'ACTIVE' && rack.capacityUsed < rack.capacityTotal) {
      onSelectRack(rack.id, rack.code);
      onClose();
    }
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
                    disabled={!isAvailable}
                    className={`relative border-2 rounded-lg p-4 transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600'
                        : isAvailable
                        ? 'border-gray-300 hover:border-purple-400 hover:shadow-lg'
                        : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2">
                        <CheckCircleIcon className="h-6 w-6 text-purple-600 bg-white rounded-full" />
                      </div>
                    )}

                    {/* Rack Code */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <QrCodeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-lg font-bold text-gray-900">{rack.code}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          rack.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rack.status}
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
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getUtilizationColor(utilization)}`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <div className="text-xs text-center text-gray-500">{utilization}% Full</div>
                    </div>

                    {/* Available Space */}
                    {isAvailable && (
                      <div className="mt-2 text-xs font-medium text-green-600">
                        ✓ {rack.capacityTotal - rack.capacityUsed} spaces available
                      </div>
                    )}
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  QrCodeIcon,
  CubeIcon,
  ChartBarIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { racksAPI } from '../../services/api';
import CreateRackModal from '../../components/CreateRackModal';
import EditRackModal from '../../components/EditRackModal';

export const Racks: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState('all');
  const [racks, setRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRack, setSelectedRack] = useState<any>(null);

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

  const filteredRacks = selectedSection === 'all' 
    ? racks 
    : racks.filter((r: any) => r.code.startsWith(selectedSection));

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Racks</h1>
          <p className="text-gray-600 mt-1">Monitor and manage warehouse storage racks</p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Rack
        </button>
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
        <div className="flex items-center space-x-2">
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

      {/* Visual Rack Grid - Modern & Clean Design */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">🏗️ Warehouse Layout</h3>
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
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRacks.map((rack: any) => {
              const utilization = rack.utilization || Math.round((rack.capacityUsed / rack.capacityTotal) * 100);
              const shipmentCount = rack.inventory?.length || 0;
              const available = rack.capacityTotal - rack.capacityUsed;
              
              return (
                <div
                  key={rack.id}
                  className="group relative bg-gradient-to-br from-white to-gray-50 border-2 rounded-xl p-4 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
                  style={{
                    borderColor: utilization >= 90 ? '#ef4444' : utilization >= 50 ? '#eab308' : '#10b981'
                  }}
                >
                  {/* Status Badge */}
                  <div className="absolute -top-2 -right-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
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
                          ? '🔴 FULL' 
                          : utilization >= 90 
                          ? '🟡 BUSY' 
                          : '🟢 OK'
                        : '⚫ OFF'}
                    </span>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      setSelectedRack(rack);
                      setEditModalOpen(true);
                    }}
                    className="absolute top-2 left-2 p-1.5 bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50"
                    title="Edit Rack"
                  >
                    <PencilIcon className="h-4 w-4 text-blue-600" />
                  </button>
                  
                  {/* Rack Code */}
                  <div className="flex items-center gap-2 mb-3 mt-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <QrCodeIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-gray-900">{rack.code}</span>
                      <p className="text-xs text-gray-500 truncate">{rack.location || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Capacity Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Capacity</span>
                      <span className="text-sm font-bold text-gray-900">{rack.capacityUsed}/{rack.capacityTotal}</span>
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
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Available</p>
                        <p className="text-sm font-bold text-green-600">{available}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-300"></div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Shipments</p>
                        <p className="text-sm font-bold text-blue-600">{shipmentCount}</p>
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
    </div>
  );
};

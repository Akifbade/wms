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

      {/* Visual Rack Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Warehouse Layout</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRacks.map((rack: any) => {
              const utilization = rack.utilization || Math.round((rack.capacityUsed / rack.capacityTotal) * 100);
              const shipmentCount = rack.inventory?.length || 0;
              return (
                <div
                  key={rack.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <QrCodeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900">{rack.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRack(rack);
                          setEditModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-blue-600"
                        title="Edit Rack"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rack.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {rack.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Capacity</span>
                      <span className="font-medium text-gray-900">{rack.capacityUsed}/{rack.capacityTotal}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getUtilizationColor(utilization)}`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{shipmentCount} shipments</span>
                      <span>{utilization.toFixed(0)}%</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-2">
                      {rack.location || `Section ${rack.code.charAt(0)}`}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
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

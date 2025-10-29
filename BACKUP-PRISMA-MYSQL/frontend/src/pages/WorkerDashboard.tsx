import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface PendingShipment {
  id: string;
  name: string;
  referenceId: string;
  customerName: string | null;
  category: string;
  awbNumber: string | null;
  arrivalDate: string;
  totalBoxes: number;
  pendingBoxes: number;
  boxes: Array<{
    id: string;
    boxNumber: number;
    qrCode: string;
    status: string;
    pieceWeight: number | null;
  }>;
  items: Array<{
    id: string;
    itemName: string;
    category: string;
    quantity: number;
  }>;
  daysSinceArrival: number;
}

interface Rack {
  id: string;
  code: string;
  location: string;
  capacity: number;
  currentBoxes: number;
  availableCapacity: number;
  utilizationPercent: number;
  qrCode: string;
}

export default function WorkerDashboard() {
  const [pendingShipments, setPendingShipments] = useState<PendingShipment[]>([]);
  const [availableRacks, setAvailableRacks] = useState<Rack[]>([]);
  const [todayStats, setTodayStats] = useState({
    assignedToday: 0,
    activitiesToday: 0,
    pendingBoxes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBoxes, setSelectedBoxes] = useState<Set<string>>(new Set());
  const [selectedRackId, setSelectedRackId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [categoryFilter]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [pendingRes, racksRes, tasksRes] = await Promise.all([
        fetch(`/api/worker/pending?category=${categoryFilter}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }),
        fetch('/api/worker/available-racks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }),
        fetch('/api/worker/tasks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingShipments(data.pendingShipments || []);
      }

      if (racksRes.ok) {
        const data = await racksRes.json();
        setAvailableRacks(data.racks || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTodayStats({
          assignedToday: data.assignedToday || 0,
          activitiesToday: data.activitiesToday || 0,
          pendingBoxes: data.pendingBoxes || 0,
        });
      }
    } catch (err: any) {
      setError('Failed to load dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBoxSelection = (boxId: string) => {
    const newSelection = new Set(selectedBoxes);
    if (newSelection.has(boxId)) {
      newSelection.delete(boxId);
    } else {
      newSelection.add(boxId);
    }
    setSelectedBoxes(newSelection);
  };

  const selectAllBoxes = (shipmentId: string) => {
    const shipment = pendingShipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const newSelection = new Set(selectedBoxes);
    shipment.boxes.forEach(box => newSelection.add(box.id));
    setSelectedBoxes(newSelection);
  };

  const quickAssign = async () => {
    if (selectedBoxes.size === 0) {
      setError('Please select at least one box');
      return;
    }

    if (!selectedRackId) {
      setError('Please select a rack');
      return;
    }

    try {
      setAssigning(true);
      const response = await fetch('/api/worker/quick-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          boxIds: Array.from(selectedBoxes),
          rackId: selectedRackId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign boxes');
      }

      const data = await response.json();
      alert(`✅ ${data.assignedCount} boxes assigned to ${data.rackCode}!`);

      // Reset and reload
      setSelectedBoxes(new Set());
      setSelectedRackId('');
      loadDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CUSTOMER_STORAGE':
        return 'bg-blue-100 text-blue-800';
      case 'AIRPORT_CARGO':
        return 'bg-purple-100 text-purple-800';
      case 'WAREHOUSE_STOCK':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (days: number) => {
    if (days > 3) return 'bg-red-100 text-red-800 border-red-300';
    if (days > 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔧 Worker Dashboard</h1>
              <p className="text-gray-600 mt-1">Assign pending shipments to racks</p>
            </div>
            <Link
              to="/warehouse/scanner"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              📱 Open Scanner
            </Link>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Assigned Today</div>
              <div className="text-3xl font-bold mt-1">{todayStats.assignedToday}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Activities Today</div>
              <div className="text-3xl font-bold mt-1">{todayStats.activitiesToday}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Pending Boxes</div>
              <div className="text-3xl font-bold mt-1">{todayStats.pendingBoxes}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Pending Shipments */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  📦 Pending Shipments ({pendingShipments.length})
                </h2>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Categories</option>
                  <option value="CUSTOMER_STORAGE">📦 Customer Storage</option>
                  <option value="AIRPORT_CARGO">✈️ Airport Cargo</option>
                  <option value="WAREHOUSE_STOCK">🏭 Warehouse Stock</option>
                </select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading...</p>
                </div>
              ) : pendingShipments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">All Done!</h3>
                  <p className="text-gray-600">No pending shipments to assign.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingShipments.map(shipment => (
                    <div
                      key={shipment.id}
                      className={`border-2 rounded-lg p-4 ${getPriorityColor(
                        shipment.daysSinceArrival
                      )}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{shipment.name}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                                shipment.category
                              )}`}
                            >
                              {shipment.category.replace('_', ' ')}
                            </span>
                            {shipment.daysSinceArrival > 1 && (
                              <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                                {shipment.daysSinceArrival} days old!
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700">
                            {shipment.customerName} • Ref: {shipment.referenceId}
                          </div>
                          {shipment.awbNumber && (
                            <div className="text-sm text-gray-700">AWB: {shipment.awbNumber}</div>
                          )}
                          <div className="text-sm font-medium text-gray-900 mt-2">
                            📦 {shipment.pendingBoxes} of {shipment.totalBoxes} boxes pending
                          </div>
                        </div>
                        <button
                          onClick={() => selectAllBoxes(shipment.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Select All
                        </button>
                      </div>

                      {/* Items Preview */}
                      {shipment.items.length > 0 && (
                        <div className="mb-3 text-sm text-gray-700">
                          <span className="font-medium">Items:</span>{' '}
                          {shipment.items
                            .slice(0, 3)
                            .map(item => `${item.itemName} (${item.quantity})`)
                            .join(', ')}
                          {shipment.items.length > 3 && ` +${shipment.items.length - 3} more`}
                        </div>
                      )}

                      {/* Boxes Grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {shipment.boxes.map(box => (
                          <button
                            key={box.id}
                            onClick={() => toggleBoxSelection(box.id)}
                            className={`p-2 rounded border-2 text-sm font-medium transition-all ${
                              selectedBoxes.has(box.id)
                                ? 'bg-blue-600 text-white border-blue-700'
                                : 'bg-white text-gray-900 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            #{box.boxNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignment Panel */}
          <div className="space-y-4">
            {/* Selected Boxes */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                ✅ Selected Boxes ({selectedBoxes.size})
              </h3>
              {selectedBoxes.size > 0 ? (
                <>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-900">
                      {selectedBoxes.size} box{selectedBoxes.size !== 1 && 'es'} ready to assign
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBoxes(new Set())}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Clear Selection
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-600">Select boxes from pending shipments</p>
              )}
            </div>

            {/* Available Racks */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                📍 Available Racks ({availableRacks.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableRacks.map(rack => (
                  <button
                    key={rack.id}
                    onClick={() => setSelectedRackId(rack.id)}
                    disabled={rack.availableCapacity < selectedBoxes.size}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedRackId === rack.id
                        ? 'bg-blue-600 text-white border-blue-700'
                        : rack.availableCapacity < selectedBoxes.size
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="font-bold">{rack.code}</div>
                    <div className="text-sm opacity-90">{rack.location}</div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span>
                        {rack.currentBoxes}/{rack.capacity}
                      </span>
                      <span className="font-medium">
                        {rack.availableCapacity} available
                      </span>
                    </div>
                    <div className="mt-2 bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white h-full"
                        style={{ width: `${rack.utilizationPercent}%` }}
                      ></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Button */}
            <button
              onClick={quickAssign}
              disabled={selectedBoxes.size === 0 || !selectedRackId || assigning}
              className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg"
            >
              {assigning ? '⏳ Assigning...' : `🚀 Assign ${selectedBoxes.size} Boxes`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skills?: string;
  position?: string;
}

interface StaffAssignment {
  id?: string;
  jobId: string;
  materialIssueId?: string;
  packerName?: string;
  packerUserId?: string;
  carpenterName?: string;
  carpenterUserId?: string;
  driverName?: string;
  driverUserId?: string;
  externalLaborCount?: number;
  externalLaborNames?: string;
  externalLaborCost?: number;
  outsideForkliftNeeded?: boolean;
  forkliftOperatorName?: string;
  forkliftCost?: number;
  forkliftHours?: number;
  notes?: string;
}

interface StaffAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  materialIssueId?: string;
  existingAssignment?: StaffAssignment;
  onSuccess?: () => void;
}

const StaffAssignmentDialog: React.FC<StaffAssignmentDialogProps> = ({
  open,
  onClose,
  jobId,
  materialIssueId,
  existingAssignment,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [externalLaborList, setExternalLaborList] = useState<string[]>([]);
  const [newLabor, setNewLabor] = useState('');
  
  const [formData, setFormData] = useState<StaffAssignment>({
    jobId,
    materialIssueId,
    packerName: '',
    packerUserId: '',
    carpenterName: '',
    carpenterUserId: '',
    driverName: '',
    driverUserId: '',
    externalLaborCount: 0,
    externalLaborNames: '',
    externalLaborCost: 0,
    outsideForkliftNeeded: false,
    forkliftOperatorName: '',
    forkliftCost: 0,
    forkliftHours: 0,
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchAvailableStaff();
      if (existingAssignment) {
        setFormData(existingAssignment);
        if (existingAssignment.externalLaborNames) {
          try {
            const names = JSON.parse(existingAssignment.externalLaborNames);
            setExternalLaborList(Array.isArray(names) ? names : []);
          } catch (e) {
            setExternalLaborList([]);
          }
        }
      }
    }
  }, [open, existingAssignment]);

  const fetchAvailableStaff = async () => {
    try {
      const response = await fetch('/api/staff-assignments/available-staff', {
        headers: { Authorization: `Bearer ` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleUserSelect = (field: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData({
        ...formData,
        [`${field}Name`]: user.name,
        [`${field}UserId`]: user.id,
      });
    }
  };

  const addExternalLabor = () => {
    if (newLabor.trim()) {
      setExternalLaborList([...externalLaborList, newLabor.trim()]);
      setNewLabor('');
    }
  };

  const removeExternalLabor = (index: number) => {
    setExternalLaborList(externalLaborList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        externalLaborCount: externalLaborList.length,
        externalLaborNames: JSON.stringify(externalLaborList),
      };

      const url = existingAssignment?.id
        ? `/api/staff-assignments/`
        : '/api/staff-assignments';
      
      const method = existingAssignment?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer `,
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        alert('Failed to save staff assignment');
      }
    } catch (error) {
      console.error('Failed to save assignment:', error);
      alert('Error saving staff assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            <h2 className="text-xl font-bold">Staff Assignment</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Internal Staff
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Packer</label>
                <select
                  value={formData.packerUserId || ''}
                  onChange={(e) => handleUserSelect('packer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Packer</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.position || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carpenter</label>
                <select
                  value={formData.carpenterUserId || ''}
                  onChange={(e) => handleUserSelect('carpenter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Carpenter</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.position || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select
                  value={formData.driverUserId || ''}
                  onChange={(e) => handleUserSelect('driver', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Driver</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.position || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">External Labor</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLabor}
                onChange={(e) => setNewLabor(e.target.value)}
                placeholder="Enter labor name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExternalLabor())}
              />
              <button type="button" onClick={addExternalLabor} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>

            {externalLaborList.length > 0 && (
              <div className="space-y-2">
                {externalLaborList.map((labor, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <span className="text-sm font-medium">{labor}</span>
                    <button type="button" onClick={() => removeExternalLabor(index)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">External Labor Cost (KWD)</label>
              <input
                type="number"
                step="0.001"
                value={formData.externalLaborCost || ''}
                onChange={(e) => setFormData({ ...formData, externalLaborCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Forklift (Outside)</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forklift"
                  checked={formData.outsideForkliftNeeded || false}
                  onChange={(e) => setFormData({ ...formData, outsideForkliftNeeded: e.target.checked })}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="forklift" className="text-sm font-medium text-gray-700">Outside Forklift Needed</label>
              </div>

              {formData.outsideForkliftNeeded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operator Name</label>
                    <input
                      type="text"
                      value={formData.forkliftOperatorName || ''}
                      onChange={(e) => setFormData({ ...formData, forkliftOperatorName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.forkliftHours || ''}
                      onChange={(e) => setFormData({ ...formData, forkliftHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost (KWD)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.forkliftCost || ''}
                      onChange={(e) => setFormData({ ...formData, forkliftCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : existingAssignment ? 'Update' : 'Assign Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffAssignmentDialog;

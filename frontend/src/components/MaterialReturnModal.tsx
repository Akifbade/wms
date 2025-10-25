import React, { useState, useEffect } from 'react';
import { X, Camera, Trash2 } from 'lucide-react';

interface MaterialReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onSuccess: () => void;
}

interface IssuedMaterial {
  id: string;
  material: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  quantity: number;
}

interface ReturnData {
  issueId: string;
  quantityUsed: number;
  quantityGood: number;
  quantityDamaged: number;
  damageReason: string;
  notes: string;
  photos: File[];
}

export default function MaterialReturnModal({ isOpen, onClose, jobId, onSuccess }: MaterialReturnModalProps) {
  const [issuedMaterials, setIssuedMaterials] = useState<IssuedMaterial[]>([]);
  const [returns, setReturns] = useState<Map<string, ReturnData>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && jobId) {
      loadIssuedMaterials();
    }
  }, [isOpen, jobId]);

  const loadIssuedMaterials = async () => {
    try {
      const response = await fetch(`/api/materials/job-materials/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter only materials without returns
        const pending = data.filter((m: any) => !m.returns || m.returns.length === 0);
        setIssuedMaterials(pending);
        
        // Initialize return data
        const initialReturns = new Map();
        pending.forEach((material: IssuedMaterial) => {
          initialReturns.set(material.id, {
            issueId: material.id,
            quantityUsed: 0,
            quantityGood: 0,
            quantityDamaged: 0,
            damageReason: '',
            notes: '',
            photos: []
          });
        });
        setReturns(initialReturns);
      }
    } catch (error) {
      console.error('Failed to load issued materials:', error);
    }
  };

  const updateReturn = (issueId: string, field: string, value: any) => {
    const newReturns = new Map(returns);
    const returnData = newReturns.get(issueId);
    if (returnData) {
      newReturns.set(issueId, { ...returnData, [field]: value });
      setReturns(newReturns);
    }
  };

  const handlePhotoSelect = (issueId: string, files: FileList | null) => {
    if (files) {
      const returnData = returns.get(issueId);
      if (returnData) {
        const newPhotos = [...returnData.photos, ...Array.from(files)];
        updateReturn(issueId, 'photos', newPhotos);
      }
    }
  };

  const removePhoto = (issueId: string, index: number) => {
    const returnData = returns.get(issueId);
    if (returnData) {
      const newPhotos = returnData.photos.filter((_, i) => i !== index);
      updateReturn(issueId, 'photos', newPhotos);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Submit each material return
      for (const [issueId, returnData] of returns.entries()) {
        const material = issuedMaterials.find(m => m.id === issueId);
        if (!material) continue;

        // Debug logging
        console.log('Return Data:', {
          materialName: material.material.name,
          issued: material.quantity,
          quantityGood: returnData.quantityGood,
          quantityGoodType: typeof returnData.quantityGood,
          quantityDamaged: returnData.quantityDamaged,
          quantityDamagedType: typeof returnData.quantityDamaged
        });

        // Simple validation: returned + damaged should not exceed issued
        const total = Number(returnData.quantityGood) + Number(returnData.quantityDamaged);
        if (total > material.quantity) {
          alert(`${material.material.name}: Total returned (${total}) cannot exceed issued quantity (${material.quantity})`);
          setLoading(false);
          return;
        }

        // Calculate used automatically
        const quantityUsed = material.quantity - total;

        // Validate damaged items have reason and photos
        if (returnData.quantityDamaged > 0 && !returnData.damageReason.trim()) {
          alert(`${material.material.name}: Damage reason required for damaged items`);
          setLoading(false);
          return;
        }

        if (returnData.quantityDamaged > 0 && returnData.photos.length === 0) {
          alert(`${material.material.name}: Photo proof required for damaged items`);
          setLoading(false);
          return;
        }

        // Create FormData
        const formData = new FormData();
        formData.append('jobId', jobId);
        formData.append('issueId', issueId);
        formData.append('quantityUsed', String(quantityUsed));
        formData.append('quantityGood', String(Number(returnData.quantityGood)));
        formData.append('quantityDamaged', String(Number(returnData.quantityDamaged)));
        formData.append('damageReason', returnData.damageReason);
        formData.append('notes', returnData.notes);
        
        returnData.photos.forEach(photo => {
          formData.append('photos', photo);
        });

        // Submit
        const response = await fetch('/api/materials/return', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to record return');
        }
      }

      alert('✅ Material returns recorded successfully! Stock updated.');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">📦 Return Materials</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {issuedMaterials.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No materials to return</p>
          ) : (
            <div className="space-y-6">
              {issuedMaterials.map(material => {
                const returnData = returns.get(material.id);
                if (!returnData) return null;

                return (
                  <div key={material.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg">{material.material.name}</h3>
                      <p className="text-sm text-gray-600">
                        {material.material.sku} • Issued: <span className="font-bold text-blue-600">{material.quantity} {material.material.unit}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          ✅ Returned (Good Condition) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={material.quantity}
                          value={returnData.quantityGood === 0 ? '' : returnData.quantityGood}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            updateReturn(material.id, 'quantityGood', isNaN(value) ? 0 : value);
                          }}
                          className="w-full border rounded px-3 py-2 text-lg font-semibold"
                          placeholder="Enter quantity"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Good items returned to stock
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          ❌ Damaged (Lost)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={material.quantity}
                          value={returnData.quantityDamaged === 0 ? '' : returnData.quantityDamaged}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            updateReturn(material.id, 'quantityDamaged', isNaN(value) ? 0 : value);
                          }}
                          className="w-full border rounded px-3 py-2 text-lg font-semibold"
                          placeholder="Enter quantity"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Damaged/broken items
                        </p>
                      </div>
                    </div>

                    {/* Auto-calculated Used */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                      <p className="text-sm font-medium text-blue-900">
                        🔧 Used/Consumed: <span className="text-lg font-bold">
                          {material.quantity - (returnData.quantityGood + returnData.quantityDamaged)} {material.material.unit}
                        </span>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Automatically calculated: Issued ({material.quantity}) - Returned ({returnData.quantityGood}) - Damaged ({returnData.quantityDamaged})
                      </p>
                    </div>

                    {returnData.quantityDamaged > 0 && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1">Damage Reason *</label>
                          <textarea
                            value={returnData.damageReason}
                            onChange={(e) => updateReturn(material.id, 'damageReason', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                            rows={2}
                            placeholder="Explain what happened..."
                            required
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1">
                            <Camera className="w-4 h-4 inline mr-1" />
                            Damage Photos * (Required)
                          </label>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handlePhotoSelect(material.id, e.target.files)}
                            className="w-full border rounded px-3 py-2"
                          />
                          {returnData.photos.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {returnData.photos.map((photo, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={URL.createObjectURL(photo)}
                                    alt={`Damage ${index + 1}`}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removePhoto(material.id, index)}
                                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        value={returnData.notes}
                        onChange={(e) => updateReturn(material.id, 'notes', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        rows={2}
                        placeholder="Any additional notes..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || issuedMaterials.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Record Returns'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Trash2, Upload, QrCode, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';

interface MaterialReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onSuccess: () => void;
  jobsAPI?: any; // Add jobsAPI for updating job status
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
  returns?: any[];
}

interface ReturnData {
  issueId: string;
  quantityUsed: number;
  quantityGood: number;
  quantityDamaged: number;
  damageReason: string;
  notes: string;
  photos: File[];
  existingReturnId?: string;
  locked?: boolean;
}

export default function MaterialReturnModal({ isOpen, onClose, jobId, onSuccess, jobsAPI }: MaterialReturnModalProps) {
  const [issuedMaterials, setIssuedMaterials] = useState<IssuedMaterial[]>([]);
  const [returns, setReturns] = useState<Map<string, ReturnData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hasExistingReturns, setHasExistingReturns] = useState(false);
  
  // Physical report upload states
  const [physicalReportFile, setPhysicalReportFile] = useState<File | null>(null);
  const [physicalReportPreview, setPhysicalReportPreview] = useState<string | null>(null);
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'pc' | 'mobile' | null>(null);
  const physicalReportInputRef = useRef<HTMLInputElement>(null);

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
        // Include all issued materials so previously returned items are visible
        setIssuedMaterials(data);
        setHasExistingReturns(data.some((m: any) => m.returns && m.returns.length > 0));

        // Initialize return data (prefill with latest return if it exists)
        const initialReturns = new Map();
        data.forEach((material: any) => {
          const latestReturn = material.returns && material.returns.length > 0 ? material.returns[0] : null;
          initialReturns.set(material.id, {
            issueId: material.id,
            quantityUsed: 0,
            quantityGood: latestReturn?.quantityGood || 0,
            quantityDamaged: latestReturn?.quantityDamaged || 0,
            damageReason: '',
            notes: latestReturn?.notes || '',
            photos: [],
            existingReturnId: latestReturn?.id,
            locked: false // UNLOCKED - Allow editing existing returns
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

  const handlePhysicalReportSelect = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPEG, PNG, and PDF files are allowed');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setPhysicalReportFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPhysicalReportPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPhysicalReportPreview(null);
      }
      
      setUploadMethod('pc');
    }
  };

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setUploadMethod('mobile');
      
      // Generate upload token
      const token = await generateUploadToken();
      if (!token) {
        alert('Failed to generate upload token');
        return;
      }

      setUploadToken(token);
      
      // Generate QR code
      const baseUrl = window.location.origin;
      const uploadUrl = `${baseUrl}/mobile-upload/${token}`;
      
      const qrDataUrl = await QRCode.toDataURL(uploadUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(qrDataUrl);
      setShowQRCode(true);
    } catch (error) {
      console.error('QR generation error:', error);
      alert('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const generateUploadToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/mobile-upload/generate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          companyId: JSON.parse(localStorage.getItem('user') || '{}').companyId,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      return data.uploadToken;
    } catch (error) {
      console.error('Token generation error:', error);
      return null;
    }
  };

  const clearPhysicalReport = () => {
    setPhysicalReportFile(null);
    setPhysicalReportPreview(null);
    setUploadToken(null);
    setQrCodeDataUrl(null);
    setShowQRCode(false);
    setUploadMethod(null);
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

    // Validate physical report is uploaded or ready
    if (!physicalReportFile && !uploadToken) {
      alert('❌ Please upload physical report or generate QR code for mobile upload before completing the job');
      return;
    }

    setLoading(true);

    try {
      // Submit each material return
      for (const [issueId, returnData] of returns.entries()) {
        const material = issuedMaterials.find(m => m.id === issueId);
        if (!material) continue;

        // If a return already exists, reuse it instead of creating duplicates
        if (returnData.existingReturnId) {
          continue;
        }

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
        formData.append('materialId', material.material.id); // Required by backend
        formData.append('issueId', issueId);
        formData.append('quantityUsed', String(quantityUsed));
        formData.append('quantityGood', String(Number(returnData.quantityGood)));
        formData.append('quantityDamaged', String(Number(returnData.quantityDamaged)));
        formData.append('damageReason', returnData.damageReason);
        formData.append('notes', returnData.notes);
        
        // If using mobile upload, request token generation
        formData.append('generateUploadToken', uploadMethod === 'mobile' ? 'true' : 'false');

        returnData.photos.forEach(photo => {
          formData.append('photos', photo);
        });

        // Submit
        const response = await fetch('/api/materials/returns', {
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

      // Don't close modal here - let caller decide
      // Just return success
      return true;
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>📦</span> Return Materials
            </h2>
            <p className="text-orange-100 text-sm mt-1">Record material returns and submit for approval</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-orange-700 rounded-full p-2 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {issuedMaterials.length === 0 ? (
            <div className="text-center text-gray-500 py-8 space-y-2">
              <p>No materials to return.</p>
              {hasExistingReturns && (
                <p className="text-sm text-green-700">All materials already have returns on file. You can resend for approval.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {issuedMaterials.map(material => {
                const returnData = returns.get(material.id);
                if (!returnData) return null;
                const isLocked = Boolean(returnData.existingReturnId);

                return (
                  <div key={material.id} className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="mb-4 bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                      <h3 className="font-bold text-xl text-blue-900">{material.material.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-blue-700">
                          <span className="font-semibold">SKU:</span> {material.material.sku}
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-blue-700">Issued:</span> <span className="font-bold text-blue-600 text-lg">{material.quantity} {material.material.unit}</span>
                        </p>
                      </div>
                      {isLocked && (
                        <div className="mt-2 bg-green-100 border border-green-300 rounded px-3 py-1.5">
                          <p className="text-xs text-green-800 font-medium">✅ Already submitted - These values will be used for approval</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                        <label className="block text-sm font-bold mb-2 text-green-700 flex items-center gap-1">
                          <span className="text-lg">✅</span> Returned (Good)
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
                          className="w-full border-2 border-green-300 rounded-lg px-4 py-3 text-lg font-bold text-green-700 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                          placeholder="0"
                          disabled={isLocked}
                        />
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          Good condition - will be restocked
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-3 border-2 border-red-200">
                        <label className="block text-sm font-bold mb-2 text-red-700 flex items-center gap-1">
                          <span className="text-lg">❌</span> Damaged/Lost
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
                          className="w-full border-2 border-red-300 rounded-lg px-4 py-3 text-lg font-bold text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                          placeholder="0"
                          disabled={isLocked}
                        />
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          Damaged or lost items
                        </p>
                      </div>
                    </div>

                    {/* Auto-calculated Used */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 mb-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-blue-700 mb-1 flex items-center gap-2">
                            <span className="text-xl">🔧</span> Used/Consumed
                          </p>
                          <p className="text-3xl font-extrabold text-blue-900">
                            {material.quantity - (returnData.quantityGood + returnData.quantityDamaged)} {material.material.unit}
                          </p>
                        </div>
                        <div className="text-right text-xs text-blue-600">
                          <p className="font-semibold">Calculation:</p>
                          <p>Issued: {material.quantity}</p>
                          <p>- Returned: {returnData.quantityGood}</p>
                          <p>- Damaged: {returnData.quantityDamaged}</p>
                          <p className="border-t border-blue-300 mt-1 pt-1">= Used: {material.quantity - (returnData.quantityGood + returnData.quantityDamaged)}</p>
                        </div>
                      </div>
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
                            disabled={isLocked}
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
                            disabled={isLocked}
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
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 📄 PHYSICAL REPORT UPLOAD SECTION */}
          <div className="mt-8 border-t-2 border-orange-200 pt-6">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-300">
              <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                📄 Physical Report Upload (Required)
              </h3>
              <p className="text-sm text-orange-700 mb-4">
                ⚠️ Upload a photo/scan of the physical return report before completing the job.
              </p>

              {/* Upload Method Selection */}
              {!physicalReportFile && !uploadToken && (
                <div className="grid grid-cols-2 gap-4">
                  {/* PC Upload */}
                  <button
                    type="button"
                    onClick={() => physicalReportInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-dashed border-blue-400 rounded-lg hover:bg-blue-50 hover:border-blue-600 transition group"
                  >
                    <Upload className="w-12 h-12 text-blue-600 group-hover:scale-110 transition" />
                    <div className="text-center">
                      <p className="font-bold text-blue-900">Upload from PC</p>
                      <p className="text-xs text-gray-600 mt-1">Select PDF or Image</p>
                    </div>
                  </button>

                  {/* Mobile QR Scanner */}
                  <button
                    type="button"
                    onClick={generateQRCode}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-dashed border-purple-400 rounded-lg hover:bg-purple-50 hover:border-purple-600 transition group disabled:opacity-50"
                  >
                    <QrCode className="w-12 h-12 text-purple-600 group-hover:scale-110 transition" />
                    <div className="text-center">
                      <p className="font-bold text-purple-900">Scan from Mobile</p>
                      <p className="text-xs text-gray-600 mt-1">Generate QR Code</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={physicalReportInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={(e) => handlePhysicalReportSelect(e.target.files)}
                className="hidden"
              />

              {/* PC Upload Preview */}
              {physicalReportFile && uploadMethod === 'pc' && (
                <div className="mt-4 bg-white rounded-lg p-4 border-2 border-green-400">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-bold text-green-900">File Selected ✅</p>
                      <p className="text-sm text-gray-700 mt-1">{physicalReportFile.name}</p>
                      {physicalReportPreview && (
                        <img src={physicalReportPreview} alt="Preview" className="mt-3 max-w-full h-auto rounded border" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={clearPhysicalReport}
                      className="text-red-600 hover:bg-red-50 p-2 rounded transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* QR Code Display */}
              {showQRCode && uploadToken && qrCodeDataUrl && (
                <div className="mt-4 bg-white rounded-lg p-6 border-2 border-purple-400 text-center">
                  <p className="font-bold text-purple-900 mb-3">📱 Scan this QR code with mobile</p>
                  <img src={qrCodeDataUrl} alt="QR Code" className="mx-auto border-4 border-purple-200 rounded-lg shadow-lg" />
                  <p className="text-sm text-gray-600 mt-4">
                    Scan → Take Photo → Upload<br />
                    <span className="text-xs text-purple-700">Token expires in 30 minutes</span>
                  </p>
                  <button
                    type="button"
                    onClick={clearPhysicalReport}
                    className="mt-4 text-red-600 hover:bg-red-50 px-4 py-2 rounded transition"
                  >
                    Cancel Mobile Upload
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 mt-6 pt-6 border-t-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-gray-700 transition-colors"
            >
              ❌ Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  const success = await handleSubmit({ preventDefault: () => {} } as any);
                  if (success) {
                    await onSuccess();
                    alert('✅ Material returns saved!');
                    onClose();
                  }
                }}
                disabled={loading || (issuedMaterials.length === 0 && !hasExistingReturns)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 font-bold shadow-md transition-all flex items-center gap-2"
              >
                {loading ? '⏳ Saving...' : '💾 Save Returns'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  // First save all returns
                  const success = await handleSubmit({ preventDefault: () => {} } as any);
                  if (!success) return;
                  
                  // Then mark job as complete
                  try {
                    const response = await fetch(`/api/moving-jobs/${jobId}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      },
                      body: JSON.stringify({ status: 'COMPLETED' })
                    });

                    if (!response.ok) {
                      throw new Error('Failed to mark job as complete');
                    }

                    await onSuccess();
                    alert('✅ Job completed! Approval request sent. Materials will be restocked after manager approval.');
                    onClose();
                  } catch (error: any) {
                    alert(`❌ Failed: ${error.message}`);
                  }
                }}
                disabled={loading || (issuedMaterials.length === 0 && !hasExistingReturns)}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:bg-gray-400 font-extrabold text-lg shadow-lg transition-all flex items-center gap-2"
              >
                {loading ? '⏳ Processing...' : '✅ Complete & Send for Approval'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

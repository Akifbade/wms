import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UploadStatus {
  uploaded: boolean;
  fileUrl: string | null;
  expired: boolean;
  jobId: string | null;
}

export default function MobileUploadPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check upload status on mount
  useEffect(() => {
    checkUploadStatus();
  }, [token]);

  const checkUploadStatus = async () => {
    try {
      const response = await axios.get(`/api/mobile-upload/${token}/status`);
      setUploadStatus(response.data);
      
      if (response.data.uploaded) {
        setError('Physical report already uploaded for this job.');
      } else if (response.data.expired) {
        setError('Upload link has expired. Please request a new upload link.');
      }
    } catch (err: any) {
      console.error('Status check error:', err);
      setError(err.response?.data?.error || 'Invalid or expired upload link');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and PDF files are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setError(null);
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('physicalReport', file);

      const response = await axios.post(`/api/mobile-upload/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadStatus({
        uploaded: true,
        fileUrl: response.data.fileUrl,
        expired: false,
        jobId: response.data.jobId
      });

      alert('✅ Physical report uploaded successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload physical report');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">Invalid upload link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl p-6 text-center shadow-lg">
          <h1 className="text-2xl font-bold">📄 Upload Physical Report</h1>
          <p className="text-sm mt-2 opacity-90">Take a photo or select document</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-2xl shadow-xl p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm font-medium">❌ {error}</p>
            </div>
          )}

          {uploadStatus?.uploaded ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-green-700 mb-2">Upload Complete!</h2>
              <p className="text-gray-600 mb-6">Physical report has been uploaded successfully.</p>
              
              {previewUrl && (
                <div className="mb-4">
                  <img src={previewUrl} alt="Uploaded report" className="max-w-full h-auto rounded-lg border" />
                </div>
              )}
              
              <button
                onClick={() => window.close()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Close Window
              </button>
            </div>
          ) : uploadStatus?.expired ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⏰</span>
              </div>
              <h2 className="text-xl font-bold text-red-700 mb-2">Link Expired</h2>
              <p className="text-gray-600">This upload link has expired. Please request a new one.</p>
            </div>
          ) : (
            <>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Preview */}
              {previewUrl && (
                <div className="mb-4">
                  <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-lg border" />
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={handleCameraCapture}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📸</span>
                    <span>Take Photo / Select File</span>
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Accepted formats: JPEG, PNG, PDF (max 10MB)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

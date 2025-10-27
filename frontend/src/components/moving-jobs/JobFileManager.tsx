import React, { useState, useEffect } from 'react';
import { X, Upload, File, Trash2, Download, Eye, FolderPlus } from 'lucide-react';

interface JobFileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

interface JobFile {
  id: string;
  jobId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  folder: string | null;
  uploadedAt: string;
  uploadedBy: string;
}

const JobFileManager: React.FC<JobFileManagerProps> = ({ isOpen, onClose, job }) => {
  const [files, setFiles] = useState<JobFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<JobFile | null>(null);

  useEffect(() => {
    if (isOpen && job?.id) {
      loadFiles();
      loadFolders();
    }
  }, [isOpen, job]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/job-files/${job.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await fetch(`/api/job-files/${job.id}/folders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    const formData = new FormData();
    Array.from(fileList).forEach(file => {
      formData.append('files', file);
    });
    formData.append('jobId', job.id);
    if (selectedFolder) {
      formData.append('folder', selectedFolder);
    }

    try {
      setUploading(true);
      const response = await fetch('/api/job-files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (response.ok) {
        await loadFiles();
        await loadFolders();
      } else {
        alert('Failed to upload files');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;

    try {
      const response = await fetch(`/api/job-files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        await loadFiles();
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter folder name');
      return;
    }

    try {
      const response = await fetch('/api/job-files/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          jobId: job.id,
          folderName: newFolderName.trim()
        })
      });

      if (response.ok) {
        await loadFolders();
        setShowNewFolderModal(false);
        setNewFolderName('');
        setSelectedFolder(newFolderName.trim());
      } else {
        alert('Failed to create folder');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      alert('Failed to create folder');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const filteredFiles = selectedFolder 
    ? files.filter(f => f.folder === selectedFolder)
    : files.filter(f => !f.folder);

  if (!isOpen || !job) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">📁 Job Files & Documents</h2>
              <p className="text-purple-100 text-sm">{job.jobTitle || job.jobCode}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Folder Selection & Actions */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">📂 Folder</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">📄 All Files (No Folder)</option>
                  {folders.map(folder => (
                    <option key={folder} value={folder}>
                      📁 {folder}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-6">
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </button>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="p-6 border-b">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-purple-600' : 'text-gray-400'}`} />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Supports: PDF, Images, Documents, Spreadsheets (Max 10MB each)
              </p>
              {selectedFolder && (
                <p className="text-sm text-purple-600 font-medium mb-4">
                  📁 Files will be uploaded to: {selectedFolder}
                </p>
              )}
              <label className="inline-block">
                <span className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                  {uploading ? 'Uploading...' : 'Browse Files'}
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>
          </div>

          {/* Files List */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading files...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {selectedFolder ? `No files in "${selectedFolder}" folder` : 'No files uploaded yet'}
                </p>
                <p className="text-sm text-gray-400 mt-2">Upload your first document using the area above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center flex-1">
                      <span className="text-3xl mr-4">{getFileIcon(file.fileType)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          {file.folder && (
                            <>
                              <span>•</span>
                              <span className="text-purple-600">📁 {file.folder}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <a
                        href={file.fileUrl}
                        download
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredFiles.length} file(s) {selectedFolder && `in "${selectedFolder}"`}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">📁 Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(previewFile.fileType)}</span>
                <div>
                  <h3 className="font-bold">{previewFile.fileName}</h3>
                  <p className="text-sm text-gray-300">{formatFileSize(previewFile.fileSize)}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
              {previewFile.fileType.includes('image') ? (
                <img 
                  src={previewFile.fileUrl} 
                  alt={previewFile.fileName}
                  className="max-w-full mx-auto"
                />
              ) : previewFile.fileType.includes('pdf') ? (
                <iframe 
                  src={previewFile.fileUrl}
                  className="w-full h-[600px] border-0"
                  title={previewFile.fileName}
                />
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <a
                    href={previewFile.fileUrl}
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-5 h-5" />
                    Download File
                  </a>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <a
                href={previewFile.fileUrl}
                download
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JobFileManager;

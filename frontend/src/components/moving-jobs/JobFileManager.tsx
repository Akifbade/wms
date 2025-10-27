import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';

import { X, Upload, File, Trash2, Download, Eye, FolderPlus, Folder } from 'lucide-react';import { X, Upload, File, Trash2, Download, Eye } from 'lucide-react';



interface JobFileManagerProps {interface JobFileManagerProps {

  isOpen: boolean;  isOpen: boolean;

  onClose: () => void;  onClose: () => void;

  job: any;  job: any;

}}



interface JobFile {interface JobFile {

  id: string;  id: string;

  jobId: string;  jobId: string;

  fileName: string;  fileName: string;

  fileUrl: string;  fileUrl: string;

  fileType: string;  fileType: string;

  fileSize: number;  fileSize: number;

  folder: string | null;  uploadedAt: string;

  uploadedAt: string;  uploadedBy: string;

  uploadedBy: string;}

}

const JobFileManager: React.FC<JobFileManagerProps> = ({ isOpen, onClose, job }) => {

const JobFileManager: React.FC<JobFileManagerProps> = ({ isOpen, onClose, job }) => {  const [files, setFiles] = useState<JobFile[]>([]);

  const [files, setFiles] = useState<JobFile[]>([]);  const [loading, setLoading] = useState(false);

  const [folders, setFolders] = useState<string[]>([]);  const [uploading, setUploading] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<string>('');  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);  useEffect(() => {

  const [dragActive, setDragActive] = useState(false);    if (isOpen && job?.id) {

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);      loadFiles();

  const [newFolderName, setNewFolderName] = useState('');    }

  const [previewFile, setPreviewFile] = useState<JobFile | null>(null);  }, [isOpen, job]);



  useEffect(() => {  const loadFiles = async () => {

    if (isOpen && job?.id) {    try {

      loadFiles();      setLoading(true);

      loadFolders();      const response = await fetch(`/api/job-files/${job.id}`, {

    }        headers: {

  }, [isOpen, job]);          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

        }

  const loadFiles = async () => {      });

    try {      if (response.ok) {

      setLoading(true);        const data = await response.json();

      const response = await fetch(`/api/job-files/${job.id}`, {        setFiles(data.files || []);

        headers: {      }

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`    } catch (error) {

        }      console.error('Failed to load files:', error);

      });    } finally {

      if (response.ok) {      setLoading(false);

        const data = await response.json();    }

        setFiles(data.files || []);  };

      }

    } catch (error) {  const handleDrag = (e: React.DragEvent) => {

      console.error('Failed to load files:', error);    e.preventDefault();

    } finally {    e.stopPropagation();

      setLoading(false);    if (e.type === "dragenter" || e.type === "dragover") {

    }      setDragActive(true);

  };    } else if (e.type === "dragleave") {

      setDragActive(false);

  const loadFolders = async () => {    }

    try {  };

      const response = await fetch(`/api/job-files/${job.id}/folders`, {

        headers: {  const handleDrop = async (e: React.DragEvent) => {

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`    e.preventDefault();

        }    e.stopPropagation();

      });    setDragActive(false);

      if (response.ok) {

        const data = await response.json();    if (e.dataTransfer.files && e.dataTransfer.files[0]) {

        setFolders(data.folders || []);      await handleFiles(e.dataTransfer.files);

      }    }

    } catch (error) {  };

      console.error('Failed to load folders:', error);

    }  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {

  };    if (e.target.files && e.target.files[0]) {

      await handleFiles(e.target.files);

  const handleDrag = (e: React.DragEvent) => {    }

    e.preventDefault();  };

    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {  const handleFiles = async (fileList: FileList) => {

      setDragActive(true);    const formData = new FormData();

    } else if (e.type === "dragleave") {    Array.from(fileList).forEach(file => {

      setDragActive(false);      formData.append('files', file);

    }    });

  };    formData.append('jobId', job.id);



  const handleDrop = async (e: React.DragEvent) => {    try {

    e.preventDefault();      setUploading(true);

    e.stopPropagation();      const response = await fetch('/api/job-files/upload', {

    setDragActive(false);        method: 'POST',

        headers: {

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

      await handleFiles(e.dataTransfer.files);        },

    }        body: formData

  };      });



  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {      if (response.ok) {

    if (e.target.files && e.target.files[0]) {        await loadFiles(); // Reload files

      await handleFiles(e.target.files);      } else {

    }        alert('Failed to upload files');

  };      }

    } catch (error) {

  const handleFiles = async (fileList: FileList) => {      console.error('Upload error:', error);

    const formData = new FormData();      alert('Failed to upload files');

    Array.from(fileList).forEach(file => {    } finally {

      formData.append('files', file);      setUploading(false);

    });    }

    formData.append('jobId', job.id);  };

    if (selectedFolder) {

      formData.append('folder', selectedFolder);  const deleteFile = async (fileId: string) => {

    }    if (!confirm('Delete this file?')) return;



    try {    try {

      setUploading(true);      const response = await fetch(`/api/job-files/${fileId}`, {

      const response = await fetch('/api/job-files/upload', {        method: 'DELETE',

        method: 'POST',        headers: {

        headers: {          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`        }

        },      });

        body: formData

      });      if (response.ok) {

        await loadFiles();

      if (response.ok) {      } else {

        await loadFiles();        alert('Failed to delete file');

        await loadFolders();      }

      } else {    } catch (error) {

        alert('Failed to upload files');      console.error('Delete error:', error);

      }      alert('Failed to delete file');

    } catch (error) {    }

      console.error('Upload error:', error);  };

      alert('Failed to upload files');

    } finally {  const formatFileSize = (bytes: number) => {

      setUploading(false);    if (bytes === 0) return '0 Bytes';

    }    const k = 1024;

  };    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

  const deleteFile = async (fileId: string) => {    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];

    if (!confirm('Delete this file?')) return;  };



    try {  const getFileIcon = (fileType: string) => {

      const response = await fetch(`/api/job-files/${fileId}`, {    if (fileType.includes('image')) return '🖼️';

        method: 'DELETE',    if (fileType.includes('pdf')) return '📄';

        headers: {    if (fileType.includes('word') || fileType.includes('document')) return '📝';

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';

        }    return '📎';

      });  };



      if (response.ok) {  if (!isOpen || !job) return null;

        await loadFiles();

      } else {  return (

        alert('Failed to delete file');    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

      }      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

    } catch (error) {        {/* Header */}

      console.error('Delete error:', error);        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center">

      alert('Failed to delete file');          <div>

    }            <h2 className="text-xl font-bold">📁 Job Files & Documents</h2>

  };            <p className="text-purple-100 text-sm">{job.jobTitle || job.jobCode}</p>

          </div>

  const createFolder = async () => {          <button

    if (!newFolderName.trim()) {            onClick={onClose}

      alert('Please enter folder name');            className="text-white hover:text-gray-200 text-2xl font-bold"

      return;          >

    }            <X className="w-6 h-6" />

          </button>

    try {        </div>

      const response = await fetch('/api/job-files/folder', {

        method: 'POST',        {/* Upload Area */}

        headers: {        <div className="p-6 border-b">

          'Content-Type': 'application/json',          <div

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${

        },              dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'

        body: JSON.stringify({            }`}

          jobId: job.id,            onDragEnter={handleDrag}

          folderName: newFolderName.trim()            onDragLeave={handleDrag}

        })            onDragOver={handleDrag}

      });            onDrop={handleDrop}

          >

      if (response.ok) {            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-purple-600' : 'text-gray-400'}`} />

        await loadFolders();            <p className="text-lg font-medium text-gray-700 mb-2">

        setShowNewFolderModal(false);              Drop files here or click to browse

        setNewFolderName('');            </p>

        setSelectedFolder(newFolderName.trim());            <p className="text-sm text-gray-500 mb-4">

      } else {              Supports: PDF, Images, Documents, Spreadsheets (Max 10MB each)

        alert('Failed to create folder');            </p>

      }            <label className="inline-block">

    } catch (error) {              <span className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">

      console.error('Create folder error:', error);                {uploading ? 'Uploading...' : 'Browse Files'}

      alert('Failed to create folder');              </span>

    }              <input

  };                type="file"

                multiple

  const formatFileSize = (bytes: number) => {                onChange={handleFileInput}

    if (bytes === 0) return '0 Bytes';                className="hidden"

    const k = 1024;                disabled={uploading}

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"

    const i = Math.floor(Math.log(bytes) / Math.log(k));              />

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];            </label>

  };          </div>

        </div>

  const getFileIcon = (fileType: string) => {

    if (fileType.includes('image')) return '🖼️';        {/* Files List */}

    if (fileType.includes('pdf')) return '📄';        <div className="p-6 max-h-96 overflow-y-auto">

    if (fileType.includes('word') || fileType.includes('document')) return '📝';          {loading ? (

    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';            <div className="text-center py-8">

    return '📎';              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>

  };              <p className="mt-4 text-gray-600">Loading files...</p>

            </div>

  const filteredFiles = selectedFolder           ) : files.length === 0 ? (

    ? files.filter(f => f.folder === selectedFolder)            <div className="text-center py-12">

    : files.filter(f => !f.folder);              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />

              <p className="text-gray-500">No files uploaded yet</p>

  if (!isOpen || !job) return null;              <p className="text-sm text-gray-400 mt-2">Upload your first document using the area above</p>

            </div>

  return (          ) : (

    <>            <div className="grid grid-cols-1 gap-4">

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">              {files.map((file) => (

        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">                <div

          {/* Header */}                  key={file.id}

          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center">                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"

            <div>                >

              <h2 className="text-xl font-bold">📁 Job Files & Documents</h2>                  <div className="flex items-center flex-1">

              <p className="text-purple-100 text-sm">{job.jobTitle || job.jobCode}</p>                    <span className="text-3xl mr-4">{getFileIcon(file.fileType)}</span>

            </div>                    <div className="flex-1">

            <button                      <h4 className="font-medium text-gray-900">{file.fileName}</h4>

              onClick={onClose}                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">

              className="text-white hover:text-gray-200 text-2xl font-bold"                        <span>{formatFileSize(file.fileSize)}</span>

            >                        <span>•</span>

              <X className="w-6 h-6" />                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>

            </button>                        {file.uploadedBy && (

          </div>                          <>

                            <span>•</span>

          {/* Folder Selection & Actions */}                            <span>By {file.uploadedBy}</span>

          <div className="p-6 border-b bg-gray-50">                          </>

            <div className="flex items-center gap-4 mb-4">                        )}

              <div className="flex-1">                      </div>

                <label className="block text-sm font-medium mb-1">📂 Folder</label>                    </div>

                <select                  </div>

                  value={selectedFolder}                  <div className="flex items-center gap-2">

                  onChange={(e) => setSelectedFolder(e.target.value)}                    <a

                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"                      href={file.fileUrl}

                >                      target="_blank"

                  <option value="">📄 All Files (No Folder)</option>                      rel="noopener noreferrer"

                  {folders.map(folder => (                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"

                    <option key={folder} value={folder}>                      title="View"

                      📁 {folder}                    >

                    </option>                      <Eye className="w-5 h-5" />

                  ))}                    </a>

                </select>                    <a

              </div>                      href={file.fileUrl}

              <div className="pt-6">                      download={file.fileName}

                <button                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"

                  onClick={() => setShowNewFolderModal(true)}                      title="Download"

                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"                    >

                >                      <Download className="w-5 h-5" />

                  <FolderPlus className="w-4 h-4" />                    </a>

                  New Folder                    <button

                </button>                      onClick={() => deleteFile(file.id)}

              </div>                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"

            </div>                      title="Delete"

          </div>                    >

                      <Trash2 className="w-5 h-5" />

          {/* Upload Area */}                    </button>

          <div className="p-6 border-b">                  </div>

            <div                </div>

              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${              ))}

                dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'            </div>

              }`}          )}

              onDragEnter={handleDrag}        </div>

              onDragLeave={handleDrag}

              onDragOver={handleDrag}        {/* Footer */}

              onDrop={handleDrop}        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">

            >          <p className="text-sm text-gray-600">

              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-purple-600' : 'text-gray-400'}`} />            {files.length} file{files.length !== 1 ? 's' : ''} uploaded

              <p className="text-lg font-medium text-gray-700 mb-2">          </p>

                Drop files here or click to browse          <button

              </p>            onClick={onClose}

              <p className="text-sm text-gray-500 mb-2">            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"

                Supports: PDF, Images, Documents, Spreadsheets (Max 10MB each)          >

              </p>            Close

              {selectedFolder && (          </button>

                <p className="text-sm text-purple-600 font-medium mb-4">        </div>

                  📁 Files will be uploaded to: {selectedFolder}      </div>

                </p>    </div>

              )}  );

              <label className="inline-block">};

                <span className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">

                  {uploading ? 'Uploading...' : 'Browse Files'}export default JobFileManager;

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

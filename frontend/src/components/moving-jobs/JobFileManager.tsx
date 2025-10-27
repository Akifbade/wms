import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';

import { X, Upload, Folder, FolderPlus, File, Trash2, Download, Eye, ChevronRight, ChevronDown, FileText, Image as ImageIcon, FileVideo } from 'lucide-react';import { X, Upload, File, Trash2, Download, Eye, FolderPlus } from 'lucide-react';



interface JobFileManagerProps {interface JobFileManagerProps {

  isOpen: boolean;  isOpen: boolean;

  onClose: () => void;  onClose: () => void;

  job: any;  job: any;

}}



interface JobFile {interface JobFile {

  id: number;  id: string;

  fileName: string;  jobId: string;

  originalName: string;  fileName: string;

  filePath: string;  fileUrl: string;

  mimeType: string;  fileType: string;

  fileSize: number;  fileSize: number;

  folderName: string | null;  folder: string | null;

  uploadedAt: string;  uploadedAt: string;

}  uploadedBy: string;

}

interface FolderNode {

  name: string;const JobFileManager: React.FC<JobFileManagerProps> = ({ isOpen, onClose, job }) => {

  files: JobFile[];  const [files, setFiles] = useState<JobFile[]>([]);

  expanded: boolean;  const [folders, setFolders] = useState<string[]>([]);

}  const [selectedFolder, setSelectedFolder] = useState<string>('');

  const [loading, setLoading] = useState(false);

const JobFileManager: React.FC<JobFileManagerProps> = ({ isOpen, onClose, job }) => {  const [uploading, setUploading] = useState(false);

  const [files, setFiles] = useState<JobFile[]>([]);  const [dragActive, setDragActive] = useState(false);

  const [folderTree, setFolderTree] = useState<Map<string, FolderNode>>(new Map());  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);  const [newFolderName, setNewFolderName] = useState('');

  const [loading, setLoading] = useState(false);  const [previewFile, setPreviewFile] = useState<JobFile | null>(null);

  const [uploading, setUploading] = useState(false);

  const [dragActive, setDragActive] = useState(false);  useEffect(() => {

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);    if (isOpen && job?.id) {

  const [newFolderName, setNewFolderName] = useState('');      loadFiles();

  const [previewFile, setPreviewFile] = useState<JobFile | null>(null);      loadFolders();

    }

  useEffect(() => {  }, [isOpen, job]);

    if (isOpen && job?.id) {

      loadFiles();  const loadFiles = async () => {

    }    try {

  }, [isOpen, job]);      setLoading(true);

      const response = await fetch(`/api/job-files/${job.id}`, {

  useEffect(() => {        headers: {

    // Build folder tree whenever files change          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

    buildFolderTree();        }

  }, [files]);      });

      if (response.ok) {

  const buildFolderTree = () => {        const data = await response.json();

    const tree = new Map<string, FolderNode>();        setFiles(data.files || []);

          }

    // Create "Root" folder for files without folder    } catch (error) {

    tree.set('ROOT', {      console.error('Failed to load files:', error);

      name: 'All Files',    } finally {

      files: files.filter(f => !f.folderName),      setLoading(false);

      expanded: true    }

    });  };



    // Group files by folder  const loadFolders = async () => {

    files.forEach(file => {    try {

      if (file.folderName) {      const response = await fetch(`/api/job-files/${job.id}/folders`, {

        if (!tree.has(file.folderName)) {        headers: {

          tree.set(file.folderName, {          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

            name: file.folderName,        }

            files: [],      });

            expanded: false      if (response.ok) {

          });        const data = await response.json();

        }        setFolders(data.folders || []);

        tree.get(file.folderName)!.files.push(file);      }

      }    } catch (error) {

    });      console.error('Failed to load folders:', error);

    }

    setFolderTree(tree);  };

  };

  const handleDrag = (e: React.DragEvent) => {

  const loadFiles = async () => {    e.preventDefault();

    try {    e.stopPropagation();

      setLoading(true);    if (e.type === "dragenter" || e.type === "dragover") {

      const response = await fetch(`/api/job-files/${job.id}`, {      setDragActive(true);

        headers: {    } else if (e.type === "dragleave") {

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`      setDragActive(false);

        }    }

      });  };

      

      if (response.ok) {  const handleDrop = async (e: React.DragEvent) => {

        const data = await response.json();    e.preventDefault();

        setFiles(data.files || []);    e.stopPropagation();

      } else {    setDragActive(false);

        console.error('Failed to load files:', response.statusText);

      }    if (e.dataTransfer.files && e.dataTransfer.files[0]) {

    } catch (error) {      await handleFiles(e.dataTransfer.files);

      console.error('Error loading files:', error);    }

    } finally {  };

      setLoading(false);

    }  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {

  };    if (e.target.files && e.target.files[0]) {

      await handleFiles(e.target.files);

  const handleFileUpload = async (uploadFiles: FileList | null) => {    }

    if (!uploadFiles || uploadFiles.length === 0) return;  };



    try {  const handleFiles = async (fileList: FileList) => {

      setUploading(true);    const formData = new FormData();

      const formData = new FormData();    Array.from(fileList).forEach(file => {

      formData.append('jobId', job.id);      formData.append('files', file);

          });

      if (selectedFolder && selectedFolder !== 'ROOT') {    formData.append('jobId', job.id);

        formData.append('folder', selectedFolder);    if (selectedFolder) {

      }      formData.append('folder', selectedFolder);

    }

      Array.from(uploadFiles).forEach(file => {

        formData.append('files', file);    try {

      });      setUploading(true);

      const response = await fetch('/api/job-files/upload', {

      const response = await fetch('/api/job-files/upload', {        method: 'POST',

        method: 'POST',        headers: {

        headers: {          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`        },

        },        body: formData

        body: formData      });

      });

      if (response.ok) {

      if (response.ok) {        await loadFiles();

        await loadFiles();        await loadFolders();

        alert(`${uploadFiles.length} file(s) uploaded successfully!`);      } else {

      } else {        alert('Failed to upload files');

        const error = await response.json();      }

        alert(`Upload failed: ${error.error || 'Unknown error'}`);    } catch (error) {

      }      console.error('Upload error:', error);

    } catch (error) {      alert('Failed to upload files');

      console.error('Upload error:', error);    } finally {

      alert('Failed to upload files');      setUploading(false);

    } finally {    }

      setUploading(false);  };

    }

  };  const deleteFile = async (fileId: string) => {

    if (!confirm('Delete this file?')) return;

  const handleCreateFolder = async () => {

    if (!newFolderName.trim()) {    try {

      alert('Please enter a folder name');      const response = await fetch(`/api/job-files/${fileId}`, {

      return;        method: 'DELETE',

    }        headers: {

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

    try {        }

      const response = await fetch('/api/job-files/folder', {      });

        method: 'POST',

        headers: {      if (response.ok) {

          'Content-Type': 'application/json',        await loadFiles();

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`      } else {

        },        alert('Failed to delete file');

        body: JSON.stringify({      }

          jobId: job.id,    } catch (error) {

          folderName: newFolderName.trim()      console.error('Delete error:', error);

        })      alert('Failed to delete file');

      });    }

  };

      if (response.ok) {

        setShowNewFolderModal(false);  const createFolder = async () => {

        setNewFolderName('');    if (!newFolderName.trim()) {

              alert('Please enter folder name');

        // Add folder to tree immediately      return;

        setFolderTree(prev => {    }

          const updated = new Map(prev);

          updated.set(newFolderName.trim(), {    try {

            name: newFolderName.trim(),      const response = await fetch('/api/job-files/folder', {

            files: [],        method: 'POST',

            expanded: true        headers: {

          });          'Content-Type': 'application/json',

          return updated;          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

        });        },

                body: JSON.stringify({

        alert('Folder created successfully!');          jobId: job.id,

      } else {          folderName: newFolderName.trim()

        const error = await response.json();        })

        alert(`Failed to create folder: ${error.error || 'Unknown error'}`);      });

      }

    } catch (error) {      if (response.ok) {

      console.error('Create folder error:', error);        await loadFolders();

      alert('Failed to create folder');        setShowNewFolderModal(false);

    }        setNewFolderName('');

  };        setSelectedFolder(newFolderName.trim());

      } else {

  const handleDeleteFile = async (fileId: number) => {        alert('Failed to create folder');

    if (!confirm('Are you sure you want to delete this file?')) return;      }

    } catch (error) {

    try {      console.error('Create folder error:', error);

      const response = await fetch(`/api/job-files/${fileId}`, {      alert('Failed to create folder');

        method: 'DELETE',    }

        headers: {  };

          'Authorization': `Bearer ${localStorage.getItem('authToken')}`

        }  const formatFileSize = (bytes: number) => {

      });    if (bytes === 0) return '0 Bytes';

    const k = 1024;

      if (response.ok) {    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

        await loadFiles();    const i = Math.floor(Math.log(bytes) / Math.log(k));

        alert('File deleted successfully!');    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];

      } else {  };

        alert('Failed to delete file');

      }  const getFileIcon = (fileType: string) => {

    } catch (error) {    if (fileType.includes('image')) return '🖼️';

      console.error('Delete error:', error);    if (fileType.includes('pdf')) return '📄';

      alert('Failed to delete file');    if (fileType.includes('word') || fileType.includes('document')) return '📝';

    }    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';

  };    return '📎';

  };

  const toggleFolder = (folderName: string) => {

    setFolderTree(prev => {  const filteredFiles = selectedFolder 

      const updated = new Map(prev);    ? files.filter(f => f.folder === selectedFolder)

      const folder = updated.get(folderName);    : files.filter(f => !f.folder);

      if (folder) {

        folder.expanded = !folder.expanded;  if (!isOpen || !job) return null;

      }

      return updated;  return (

    });    <>

  };      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">

  const getFileIcon = (mimeType: string) => {          {/* Header */}

    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center">

    if (mimeType.startsWith('video/')) return <FileVideo className="w-4 h-4 text-purple-500" />;            <div>

    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;              <h2 className="text-xl font-bold">📁 Job Files & Documents</h2>

    return <File className="w-4 h-4 text-gray-500" />;              <p className="text-purple-100 text-sm">{job.jobTitle || job.jobCode}</p>

  };            </div>

            <button

  const formatFileSize = (bytes: number): string => {              onClick={onClose}

    if (bytes < 1024) return bytes + ' B';              className="text-white hover:text-gray-200 text-2xl font-bold"

    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';            >

    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';              <X className="w-6 h-6" />

  };            </button>

          </div>

  const handleDrag = (e: React.DragEvent) => {

    e.preventDefault();          {/* Folder Selection & Actions */}

    e.stopPropagation();          <div className="p-6 border-b bg-gray-50">

    if (e.type === 'dragenter' || e.type === 'dragover') {            <div className="flex items-center gap-4 mb-4">

      setDragActive(true);              <div className="flex-1">

    } else if (e.type === 'dragleave') {                <label className="block text-sm font-medium mb-1">📂 Folder</label>

      setDragActive(false);                <select

    }                  value={selectedFolder}

  };                  onChange={(e) => setSelectedFolder(e.target.value)}

                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"

  const handleDrop = (e: React.DragEvent) => {                >

    e.preventDefault();                  <option value="">📄 All Files (No Folder)</option>

    e.stopPropagation();                  {folders.map(folder => (

    setDragActive(false);                    <option key={folder} value={folder}>

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {                      📁 {folder}

      handleFileUpload(e.dataTransfer.files);                    </option>

    }                  ))}

  };                </select>

              </div>

  if (!isOpen) return null;              <div className="pt-6">

                <button

  return (                  onClick={() => setShowNewFolderModal(true)}

    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"

      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">                >

        {/* Header */}                  <FolderPlus className="w-4 h-4" />

        <div className="flex justify-between items-center p-6 border-b">                  New Folder

          <div>                </button>

            <h2 className="text-2xl font-bold text-gray-800">📁 Job Files & Documents</h2>              </div>

            <p className="text-sm text-gray-600">Job: {job?.jobCode} - {job?.jobTitle}</p>            </div>

          </div>          </div>

          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">

            <X className="w-6 h-6" />          {/* Upload Area */}

          </button>          <div className="p-6 border-b">

        </div>            <div

              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${

        {/* Toolbar */}                dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'

        <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">              }`}

          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">              onDragEnter={handleDrag}

            <Upload className="w-4 h-4" />              onDragLeave={handleDrag}

            Upload Files              onDragOver={handleDrag}

            <input              onDrop={handleDrop}

              type="file"            >

              multiple              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-purple-600' : 'text-gray-400'}`} />

              onChange={(e) => handleFileUpload(e.target.files)}              <p className="text-lg font-medium text-gray-700 mb-2">

              className="hidden"                Drop files here or click to browse

              disabled={uploading}              </p>

            />              <p className="text-sm text-gray-500 mb-2">

          </label>                Supports: PDF, Images, Documents, Spreadsheets (Max 10MB each)

              </p>

          <button              {selectedFolder && (

            onClick={() => setShowNewFolderModal(true)}                <p className="text-sm text-purple-600 font-medium mb-4">

            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"                  📁 Files will be uploaded to: {selectedFolder}

          >                </p>

            <FolderPlus className="w-4 h-4" />              )}

            New Folder              <label className="inline-block">

          </button>                <span className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">

                  {uploading ? 'Uploading...' : 'Browse Files'}

          {selectedFolder && selectedFolder !== 'ROOT' && (                </span>

            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">                <input

              <Folder className="w-4 h-4" />                  type="file"

              Uploading to: <strong>{selectedFolder}</strong>                  multiple

            </div>                  onChange={handleFileInput}

          )}                  className="hidden"

                  disabled={uploading}

          {uploading && (                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"

            <div className="ml-auto text-blue-600 font-medium animate-pulse">                />

              Uploading...              </label>

            </div>            </div>

          )}          </div>

        </div>

          {/* Files List */}

        {/* Main Content */}          <div className="p-6 max-h-96 overflow-y-auto">

        <div className="flex-1 flex overflow-hidden">            {loading ? (

          {/* Folder Tree Sidebar */}              <div className="text-center py-8">

          <div className="w-64 bg-gray-50 border-r overflow-y-auto p-4">                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>

            <h3 className="text-xs font-semibold text-gray-600 uppercase mb-3">Folders</h3>                <p className="mt-4 text-gray-600">Loading files...</p>

            <div className="space-y-1">              </div>

              {Array.from(folderTree.entries()).map(([folderName, folder]) => (            ) : filteredFiles.length === 0 ? (

                <div key={folderName}>              <div className="text-center py-12">

                  <div                <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />

                    onClick={() => {                <p className="text-gray-500">

                      setSelectedFolder(folderName);                  {selectedFolder ? `No files in "${selectedFolder}" folder` : 'No files uploaded yet'}

                      toggleFolder(folderName);                </p>

                    }}                <p className="text-sm text-gray-400 mt-2">Upload your first document using the area above</p>

                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${              </div>

                      selectedFolder === folderName            ) : (

                        ? 'bg-blue-600 text-white'              <div className="grid grid-cols-1 gap-4">

                        : 'hover:bg-gray-200 text-gray-700'                {filteredFiles.map((file) => (

                    }`}                  <div

                  >                    key={file.id}

                    {folder.expanded ? (                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"

                      <ChevronDown className="w-4 h-4" />                  >

                    ) : (                    <div className="flex items-center flex-1">

                      <ChevronRight className="w-4 h-4" />                      <span className="text-3xl mr-4">{getFileIcon(file.fileType)}</span>

                    )}                      <div className="flex-1">

                    <Folder className={`w-4 h-4 ${selectedFolder === folderName ? 'text-white' : 'text-yellow-500'}`} />                        <h4 className="font-medium text-gray-900">{file.fileName}</h4>

                    <span className="text-sm font-medium flex-1">{folder.name}</span>                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">

                    <span className={`text-xs px-2 py-0.5 rounded-full ${                          <span>{formatFileSize(file.fileSize)}</span>

                      selectedFolder === folderName                          <span>•</span>

                        ? 'bg-blue-500 text-white'                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>

                        : 'bg-gray-300 text-gray-700'                          {file.folder && (

                    }`}>                            <>

                      {folder.files.length}                              <span>•</span>

                    </span>                              <span className="text-purple-600">📁 {file.folder}</span>

                  </div>                            </>

                </div>                          )}

              ))}                        </div>

            </div>                      </div>

          </div>                    </div>

                    <div className="flex items-center gap-2">

          {/* File List */}                      <button

          <div className="flex-1 overflow-y-auto p-6">                        onClick={() => setPreviewFile(file)}

            {loading ? (                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"

              <div className="flex items-center justify-center h-64">                        title="Preview"

                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>                      >

              </div>                        <Eye className="w-5 h-5" />

            ) : (                      </button>

              <div                      <a

                onDragEnter={handleDrag}                        href={file.fileUrl}

                onDragLeave={handleDrag}                        download

                onDragOver={handleDrag}                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"

                onDrop={handleDrop}                        title="Download"

                className={`min-h-[400px] ${                      >

                  dragActive ? 'border-4 border-dashed border-blue-500 bg-blue-50' : ''                        <Download className="w-5 h-5" />

                }`}                      </a>

              >                      <button

                {selectedFolder ? (                        onClick={() => deleteFile(file.id)}

                  <div>                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"

                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">                        title="Delete"

                      <Folder className="w-5 h-5 text-yellow-500" />                      >

                      {folderTree.get(selectedFolder)?.name || 'Unknown Folder'}                        <Trash2 className="w-5 h-5" />

                    </h3>                      </button>

                                        </div>

                    {folderTree.get(selectedFolder)?.files.length === 0 ? (                  </div>

                      <div className="text-center py-16 text-gray-500">                ))}

                        <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />              </div>

                        <p>This folder is empty</p>            )}

                        <p className="text-sm mt-2">Drag & drop files here or click Upload Files</p>          </div>

                      </div>

                    ) : (          {/* Footer */}

                      <div className="grid grid-cols-1 gap-3">          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">

                        {folderTree.get(selectedFolder)?.files.map(file => (            <p className="text-sm text-gray-600">

                          <div              {filteredFiles.length} file(s) {selectedFolder && `in "${selectedFolder}"`}

                            key={file.id}            </p>

                            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"            <button

                          >              onClick={onClose}

                            {getFileIcon(file.mimeType)}              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"

                                        >

                            <div className="flex-1 min-w-0">              Close

                              <p className="font-medium text-gray-800 truncate">{file.originalName}</p>            </button>

                              <p className="text-sm text-gray-500">          </div>

                                {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}        </div>

                              </p>      </div>

                            </div>

      {/* New Folder Modal */}

                            <div className="flex items-center gap-2">      {showNewFolderModal && (

                              {file.mimeType.startsWith('image/') && (        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">

                                <button          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">

                                  onClick={() => setPreviewFile(file)}            <h3 className="text-lg font-bold mb-4">📁 Create New Folder</h3>

                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"            <input

                                  title="Preview"              type="text"

                                >              value={newFolderName}

                                  <Eye className="w-4 h-4" />              onChange={(e) => setNewFolderName(e.target.value)}

                                </button>              placeholder="Enter folder name"

                              )}              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"

                                            onKeyPress={(e) => e.key === 'Enter' && createFolder()}

                              <a            />

                                href={file.filePath}            <div className="flex gap-3">

                                download={file.originalName}              <button

                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"                onClick={() => {

                                title="Download"                  setShowNewFolderModal(false);

                              >                  setNewFolderName('');

                                <Download className="w-4 h-4" />                }}

                              </a>                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"

                                            >

                              <button                Cancel

                                onClick={() => handleDeleteFile(file.id)}              </button>

                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"              <button

                                title="Delete"                onClick={createFolder}

                              >                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"

                                <Trash2 className="w-4 h-4" />              >

                              </button>                Create

                            </div>              </button>

                          </div>            </div>

                        ))}          </div>

                      </div>        </div>

                    )}      )}

                  </div>

                ) : (      {/* File Preview Modal */}

                  <div className="text-center py-16 text-gray-500">      {previewFile && (

                    <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">

                    <p className="text-lg font-medium">Select a folder to view files</p>          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

                    <p className="text-sm mt-2">Choose a folder from the left sidebar</p>            <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">

                  </div>              <div className="flex items-center gap-3">

                )}                <span className="text-2xl">{getFileIcon(previewFile.fileType)}</span>

              </div>                <div>

            )}                  <h3 className="font-bold">{previewFile.fileName}</h3>

          </div>                  <p className="text-sm text-gray-300">{formatFileSize(previewFile.fileSize)}</p>

        </div>                </div>

      </div>              </div>

              <button

      {/* New Folder Modal */}                onClick={() => setPreviewFile(null)}

      {showNewFolderModal && (                className="text-white hover:text-gray-300"

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">              >

          <div className="bg-white rounded-lg p-6 w-96">                <X className="w-6 h-6" />

            <h3 className="text-lg font-bold mb-4">Create New Folder</h3>              </button>

            <input            </div>

              type="text"            <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">

              value={newFolderName}              {previewFile.fileType.includes('image') ? (

              onChange={(e) => setNewFolderName(e.target.value)}                <img 

              placeholder="Enter folder name"                  src={previewFile.fileUrl} 

              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"                  alt={previewFile.fileName}

              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}                  className="max-w-full mx-auto"

              autoFocus                />

            />              ) : previewFile.fileType.includes('pdf') ? (

            <div className="flex gap-3 justify-end">                <iframe 

              <button                  src={previewFile.fileUrl}

                onClick={() => {                  className="w-full h-[600px] border-0"

                  setShowNewFolderModal(false);                  title={previewFile.fileName}

                  setNewFolderName('');                />

                }}              ) : (

                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"                <div className="text-center py-12">

              >                  <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />

                Cancel                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>

              </button>                  <a

              <button                    href={previewFile.fileUrl}

                onClick={handleCreateFolder}                    download

                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"

              >                  >

                Create Folder                    <Download className="w-5 h-5" />

              </button>                    Download File

            </div>                  </a>

          </div>                </div>

        </div>              )}

      )}            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">

      {/* Preview Modal */}              <a

      {previewFile && (                href={previewFile.fileUrl}

        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setPreviewFile(null)}>                download

          <div className="max-w-4xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2"

            <button              >

              onClick={() => setPreviewFile(null)}                <Download className="w-4 h-4" />

              className="absolute -top-10 right-0 text-white hover:text-gray-300"                Download

            >              </a>

              <X className="w-8 h-8" />              <button

            </button>                onClick={() => setPreviewFile(null)}

            <img                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"

              src={previewFile.filePath}              >

              alt={previewFile.originalName}                Close

              className="max-w-full max-h-[90vh] rounded-lg"              </button>

            />            </div>

          </div>          </div>

        </div>        </div>

      )}      )}

    </div>    </>

  );  );

};};



export default JobFileManager;export default JobFileManager;


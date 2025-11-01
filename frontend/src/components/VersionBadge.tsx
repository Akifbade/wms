import React, { useState, useEffect } from 'react';

interface VersionData {
  version: string;
  buildDate: string;
  buildTime: string;
  author: string;
  commitMessage: string;
  environment: string;
}

/**
 * Version Badge Component
 * Displays current app version and environment
 * Auto-updated on every commit via Git hook
 */
export const VersionBadge: React.FC = () => {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Load version from version.json
    fetch('/version.json?t=' + Date.now()) // Cache bust
      .then(res => res.json())
      .then(data => setVersionData(data))
      .catch(err => console.error('Failed to load version:', err));
  }, []);

  if (!versionData) return null;

  const getEnvironmentColor = () => {
    switch (versionData.environment) {
      case 'production':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getEnvironmentLabel = () => {
    switch (versionData.environment) {
      case 'production':
        return '🟢 Production';
      case 'staging':
        return '🟡 Staging';
      default:
        return '🔵 Local Dev';
    }
  };

  return (
    <>
      <div 
        className={`fixed bottom-4 right-4 px-3 py-2 rounded-lg border text-xs font-mono shadow-md cursor-pointer hover:shadow-lg transition-shadow ${getEnvironmentColor()}`}
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold">{versionData.version}</span>
          <span className="opacity-70">•</span>
          <span>{getEnvironmentLabel()}</span>
          <span 
            className="opacity-50 cursor-help text-base"
            title="Click for details"
          >
            ℹ️
          </span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">📦 Version Info</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Version:</span>
                <span className="text-green-600 font-mono font-bold">{versionData.version}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Environment:</span>
                <span className={versionData.environment === 'production' ? 'text-green-600' : 'text-yellow-600'}>
                  {versionData.environment.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-col py-2 border-b">
                <span className="font-semibold mb-1">Latest Change:</span>
                <span className="text-gray-700 italic bg-gray-50 px-2 py-1 rounded">
                  "{versionData.commitMessage || 'No message'}"
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Author:</span>
                <span className="text-blue-600">{versionData.author}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Build Date:</span>
                <span className="text-gray-600">{versionData.buildDate}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="font-semibold">Build Time:</span>
                <span className="text-gray-600">{versionData.buildTime}</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

// Version Info Modal removed - now integrated in main VersionBadge component

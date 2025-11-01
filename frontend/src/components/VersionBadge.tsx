import React from 'react';
import { APP_VERSION, VERSION_INFO } from '../config/version';

/**
 * Version Badge Component
 * Displays current app version and environment
 * Auto-updated by GitHub Actions
 */
export const VersionBadge: React.FC = () => {
  const getEnvironmentColor = () => {
    switch (VERSION_INFO.environment) {
      case 'production':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getEnvironmentLabel = () => {
    switch (VERSION_INFO.environment) {
      case 'production':
        return '🟢 Production';
      case 'staging':
        return '🟡 Staging';
      default:
        return '🔵 Local Dev';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 px-3 py-2 rounded-lg border text-xs font-mono shadow-md ${getEnvironmentColor()}`}>
      <div className="flex items-center gap-2">
        <span>{APP_VERSION}</span>
        <span className="opacity-70">•</span>
        <span>{getEnvironmentLabel()}</span>
        <span 
          className="opacity-50 cursor-help"
          title={`Deployed: ${VERSION_INFO.buildDate}\nCommit: ${VERSION_INFO.commitHash}`}
        >
          ℹ️
        </span>
      </div>
    </div>
  );
};

/**
 * Version Info Modal
 * Shows detailed version information
 */
export const VersionInfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Version Info</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 font-mono text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">Version:</span>
            <span className="text-green-600">{APP_VERSION}</span>
          </div>

          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">Environment:</span>
            <span className={VERSION_INFO.environment === 'production' ? 'text-green-600' : 'text-yellow-600'}>
              {VERSION_INFO.environment.toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">Stage:</span>
            <span>{VERSION_INFO.stage}</span>
          </div>

          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">Commit:</span>
            <span className="text-blue-600">{VERSION_INFO.commitHash.substring(0, 7)}</span>
          </div>

          <div className="flex justify-between py-2 border-b">
            <span className="font-semibold">Build Date:</span>
            <span className="text-gray-600">
              {new Date(VERSION_INFO.buildDate).toLocaleDateString()}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="font-semibold">Build Time:</span>
            <span className="text-gray-600">
              {new Date(VERSION_INFO.buildDate).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

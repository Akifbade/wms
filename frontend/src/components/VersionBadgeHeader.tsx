import React from 'react';
import { APP_VERSION, VERSION_INFO } from '../config/version';

/**
 * Version Badge Header Component
 * Compact version for display in header
 * Shows: v2.1.0 • 🟡 Staging (never changes on refresh)
 */
export const VersionBadgeHeader: React.FC = () => {
  const getEnvironmentColor = () => {
    switch (VERSION_INFO.environment) {
      case 'production':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'staging':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getEnvironmentEmoji = () => {
    switch (VERSION_INFO.environment) {
      case 'production':
        return '🟢';
      case 'staging':
        return '🟡';
      default:
        return '🔵';
    }
  };

  const getEnvironmentLabel = () => {
    switch (VERSION_INFO.environment) {
      case 'production':
        return 'Production';
      case 'staging':
        return 'Staging';
      default:
        return 'Local Dev';
    }
  };

  return (
    <div
      className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono ${getEnvironmentColor()}`}
      title={`Version: ${APP_VERSION} | Commit: ${VERSION_INFO.commitHash} | Deployed: ${VERSION_INFO.buildDate}`}
    >
      <span className="font-bold">{APP_VERSION}</span>
      <span className="opacity-50">•</span>
      <span>{getEnvironmentEmoji()} {getEnvironmentLabel()}</span>
    </div>
  );
};

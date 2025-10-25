import React from 'react';
import { ShieldCheckIcon, KeyIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export const SecuritySettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security & Access</h2>
        <p className="text-gray-600">Manage authentication and security settings</p>
      </div>

      {/* Password Policy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
        <div className="space-y-3">
          {['Minimum 8 characters', 'Require uppercase letters', 'Require numbers', 'Require special characters'].map((policy, idx) => (
            <label key={idx} className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600 rounded" />
              <span className="ml-2 text-sm text-gray-700">{policy}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mt-1">Add an extra layer of security</p>
          </div>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Enable</button>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <input type="number" defaultValue={30} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

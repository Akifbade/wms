import React, { useState, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { notificationPreferencesAPI } from '../../../services/api';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<any>({
    email: {},
    sms: {},
    push: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await notificationPreferencesAPI.get();
      setPreferences(response.preferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      await notificationPreferencesAPI.update(preferences);
      setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          <p className="text-gray-600">Configure how and when you receive notifications</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {message && (
            <div className={`flex items-center ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.type === 'success' && <CheckCircleIcon className="h-5 w-5 mr-2" />}
              <span className="text-sm">{message.text}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-3">
          {[
            { label: 'New shipment arrival', desc: 'Get notified when new shipments arrive' },
            { label: 'Job assignments', desc: 'Notifications for new job assignments' },
            { label: 'Expense approvals', desc: 'Alerts for expense approval requests' },
            { label: 'System updates', desc: 'Important system updates and maintenance' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Notifications</h3>
        <div className="space-y-3">
          {[
            'Job updates',
            'Schedule changes',
            'Emergency alerts'
          ].map((item, idx) => (
            <label key={idx} className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600 rounded" />
              <span className="ml-2 text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

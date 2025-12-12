import React, { useState, useEffect } from 'react';
import {
  Mail,
  Settings,
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Save,
  TestTube,
  RefreshCw,
  Clock,
  Users,
  AlertTriangle,
  Package,
  FileText,
  DollarSign,
  Boxes,
  Calendar,
  Truck,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  UserPlus,
  ClipboardList
} from 'lucide-react';
import api from '../../services/api';

// Toast helper
const toast = {
  success: (msg: string) => {
    const el = document.createElement('div');
    el.innerHTML = `<div style="position:fixed;top:20px;right:20px;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);">${msg}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
  error: (msg: string) => {
    const el = document.createElement('div');
    el.innerHTML = `<div style="position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);">${msg}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
};

interface EmailSettings {
  id: string;
  provider: string;
  isEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  senderName: string;
  senderEmail: string;
  dailyLimit: number;
}

interface NotificationSetting {
  type: string;
  label: string;
  description: string;
  category: string;
  id: string | null;
  isEnabled: boolean;
  notifyAdmins: boolean;
  notifyManagers: boolean;
  customEmails: string;
  alertDaysBefore: number | null;
  recipients: any[];
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  todayCount: number;
  dailyLimit: number;
  isEnabled: boolean;
  remainingToday: number;
}

const EmailSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'notifications' | 'logs'>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    id: '',
    provider: 'gmail',
    isEnabled: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    senderName: '',
    senderEmail: '',
    dailyLimit: 500,
  });

  // Notification Settings State
  const [notifications, setNotifications] = useState<NotificationSetting[]>([]);

  // Email Stats
  const [stats, setStats] = useState<EmailStats | null>(null);

  // Test Email
  const [testEmail, setTestEmail] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, notificationsRes, statsRes] = await Promise.all([
        api.get('/email/settings'),
        api.get('/email/notifications'),
        api.get('/email/stats'),
      ]);

      setEmailSettings(settingsRes.data);
      setNotifications(notificationsRes.data);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Error loading email settings:', error);
      toast.error('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    try {
      await api.put('/email/settings', emailSettings);
      toast.success('Email settings saved successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testEmailConnection = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setTesting(true);
    try {
      await api.post('/email/test', { testEmail });
      toast.success('Test email sent successfully! Check your inbox.');
    } catch (error: any) {
      console.error('Error testing email:', error);
      toast.error(error.response?.data?.error || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const updateNotification = async (type: string, data: Partial<NotificationSetting>) => {
    try {
      await api.put(`/email/notifications/${type}`, data);
      toast.success('Notification settings updated!');
      loadData();
    } catch (error: any) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification settings');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SHIPMENT_RELEASED':
      case 'SHIPMENT_CREATED':
      case 'SHIPMENT_PARTIAL_RELEASE':
        return <Package className="w-5 h-5" />;
      case 'CONTRACT_NEW':
      case 'CONTRACT_EXPIRING':
      case 'CONTRACT_EXPIRED':
      case 'CONTRACT_RENEWED':
        return <Calendar className="w-5 h-5" />;
      case 'MOVING_JOB_CREATED':
      case 'MOVING_JOB_ASSIGNED':
      case 'MOVING_JOB_STARTED':
      case 'MOVING_JOB_COMPLETED':
        return <Truck className="w-5 h-5" />;
      case 'INVOICE_CREATED':
      case 'INVOICE_OVERDUE':
        return <FileText className="w-5 h-5" />;
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_REMINDER':
        return <DollarSign className="w-5 h-5" />;
      case 'LOW_STOCK_ALERT':
      case 'MATERIAL_ISSUED':
      case 'MATERIAL_RETURNED':
      case 'MATERIAL_DAMAGED':
      case 'PURCHASE_ORDER_CREATED':
        return <Boxes className="w-5 h-5" />;
      case 'STORAGE_ALERT':
        return <AlertTriangle className="w-5 h-5" />;
      case 'DAILY_SUMMARY':
      case 'WEEKLY_REPORT':
        return <ClipboardList className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Shipments':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Contracts':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Moving Jobs':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Billing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Materials':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Reports':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Group notifications by category
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const category = notification.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(notification);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Custom email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedNotificationType, setSelectedNotificationType] = useState<string | null>(null);
  const [newCustomEmail, setNewCustomEmail] = useState('');

  const addCustomEmail = async () => {
    if (!selectedNotificationType || !newCustomEmail) return;

    const notification = notifications.find(n => n.type === selectedNotificationType);
    if (!notification) return;

    const existingEmails = notification.customEmails ? notification.customEmails.split(',').map(e => e.trim()).filter(Boolean) : [];
    if (!existingEmails.includes(newCustomEmail)) {
      existingEmails.push(newCustomEmail);
    }

    await updateNotification(selectedNotificationType, {
      ...notification,
      customEmails: existingEmails.join(', '),
    });

    setNewCustomEmail('');
    setShowEmailModal(false);
    setSelectedNotificationType(null);
  };

  const removeCustomEmail = async (type: string, emailToRemove: string) => {
    const notification = notifications.find(n => n.type === type);
    if (!notification) return;

    const existingEmails = notification.customEmails ? notification.customEmails.split(',').map(e => e.trim()).filter(Boolean) : [];
    const updatedEmails = existingEmails.filter(e => e !== emailToRemove);

    await updateNotification(type, {
      ...notification,
      customEmails: updatedEmails.join(', '),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-blue-500" />
            Email & Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure email notifications for your WMS system
          </p>
        </div>

        {/* Stats Card */}
        {stats && (
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{stats.sent}</p>
              <p className="text-xs text-gray-500">Sent</p>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.remainingToday}</p>
              <p className="text-xs text-gray-500">Left Today</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'settings', label: 'Email Settings', icon: Settings },
          { id: 'notifications', label: 'Notification Types', icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div
          className="space-y-6"
        >
          {/* Gmail Setup Guide */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Gmail Setup Guide</h3>
                <ol className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Create a new Gmail account for your WMS (e.g., wms-notifications@gmail.com)</li>
                  <li>Enable 2-Factor Authentication on the account</li>
                  <li>Go to Google Account → Security → App Passwords</li>
                  <li>Generate an App Password for "Mail" and copy it</li>
                  <li>Use that App Password below (not your regular password)</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                <p className="text-sm text-gray-500">Enable or disable all email notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailSettings.isEnabled}
                  onChange={(e) => setEmailSettings({ ...emailSettings, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* SMTP Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SMTP Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Provider
                </label>
                <select
                  value={emailSettings.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    setEmailSettings({
                      ...emailSettings,
                      provider,
                      smtpHost: provider === 'gmail' ? 'smtp.gmail.com' : emailSettings.smtpHost,
                      smtpPort: provider === 'gmail' ? 587 : emailSettings.smtpPort,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gmail">Gmail (Recommended)</option>
                  <option value="smtp">Custom SMTP</option>
                </select>
              </div>

              {/* SMTP Host */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  disabled={emailSettings.provider === 'gmail'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              {/* SMTP Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                  placeholder="587"
                  disabled={emailSettings.provider === 'gmail'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Secure */}
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={emailSettings.smtpSecure}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpSecure: e.target.checked })}
                  disabled={emailSettings.provider === 'gmail'}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="smtpSecure" className="text-sm text-gray-700 dark:text-gray-300">
                  Use SSL/TLS (Port 465)
                </label>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gmail Address
                </label>
                <input
                  type="email"
                  value={emailSettings.smtpUser}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                  placeholder="wms-notifications@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* App Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  App Password
                </label>
                <input
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sender Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={emailSettings.senderName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, senderName: e.target.value })}
                  placeholder="QGO Cargo WMS"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sender Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sender Email (From)
                </label>
                <input
                  type="email"
                  value={emailSettings.senderEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, senderEmail: e.target.value })}
                  placeholder="wms-notifications@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Test & Save Buttons */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to test..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={testEmailConnection}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test
                </button>
              </div>

              <button
                onClick={saveEmailSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Category Groups */}
          {Object.entries(groupedNotifications).map(([category, categoryNotifications]) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {categoryNotifications.filter(n => n.isEnabled).length} / {categoryNotifications.length} enabled
                  </span>
                </div>
                {expandedCategories[category] !== false ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Category Content */}
              {expandedCategories[category] !== false && (
                <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {categoryNotifications.map((notification) => (
                    <div key={notification.type} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-2 rounded-lg shrink-0 ${notification.isEnabled
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                            }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{notification.label}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{notification.description}</p>

                            {/* Recipients Options */}
                            <div className="flex flex-wrap gap-4 mt-3">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notification.notifyAdmins}
                                  onChange={(e) => updateNotification(notification.type, {
                                    ...notification,
                                    notifyAdmins: e.target.checked,
                                  })}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Admins</span>
                              </label>

                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notification.notifyManagers}
                                  onChange={(e) => updateNotification(notification.type, {
                                    ...notification,
                                    notifyManagers: e.target.checked,
                                  })}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Managers</span>
                              </label>

                              {notification.type === 'CONTRACT_EXPIRING' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">Alert</span>
                                  <input
                                    type="number"
                                    value={notification.alertDaysBefore || 30}
                                    onChange={(e) => updateNotification(notification.type, {
                                      ...notification,
                                      alertDaysBefore: parseInt(e.target.value),
                                    })}
                                    className="w-16 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">days before</span>
                                </div>
                              )}

                              {/* Add Custom Email Button */}
                              <button
                                onClick={() => {
                                  setSelectedNotificationType(notification.type);
                                  setShowEmailModal(true);
                                }}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <UserPlus className="w-4 h-4" />
                                Add Email
                              </button>
                            </div>

                            {/* Custom Emails List */}
                            {notification.customEmails && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {notification.customEmails.split(',').map(email => email.trim()).filter(Boolean).map((email, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300"
                                  >
                                    {email}
                                    <button
                                      onClick={() => removeCustomEmail(notification.type, email)}
                                      className="hover:text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Enable Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={notification.isEnabled}
                            onChange={(e) => updateNotification(notification.type, {
                              ...notification,
                              isEnabled: e.target.checked,
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Custom Email Recipient
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This email will receive notifications for: <strong>{selectedNotificationType?.replace(/_/g, ' ')}</strong>
            </p>
            <input
              type="email"
              value={newCustomEmail}
              onChange={(e) => setNewCustomEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setNewCustomEmail('');
                  setSelectedNotificationType(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addCustomEmail}
                disabled={!newCustomEmail}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Add Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSettings;

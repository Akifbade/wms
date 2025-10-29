import React, { useState, useEffect } from 'react';

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export const DebugLogin: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('Test123!');
  const [authStatus, setAuthStatus] = useState({ hasToken: false, hasUser: false, userData: null });

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const checkAuthStatus = () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    let userData = null;
    if (user) {
      try {
        userData = JSON.parse(user);
      } catch (e) {
        addLog('Invalid user data in localStorage', 'error');
      }
    }

    setAuthStatus({
      hasToken: !!token,
      hasUser: !!user,
      userData
    });

    if (token) {
      addLog(`Token found: ${token.substring(0, 20)}...`, 'success');
    } else {
      addLog('No token in localStorage', 'warning');
    }

    if (userData) {
      addLog(`User data: ${userData.email || userData.id}`, 'success');
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    addLog('🗑️ Cleared all auth data', 'warning');
    checkAuthStatus();
  };

  const testLogin = async () => {
    addLog(`Attempting login with: ${email}`, 'info');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        addLog(`✅ Login successful for ${data.user.email}`, 'success');
        addLog(`Token saved: ${data.token.substring(0, 20)}...`, 'success');
        
        checkAuthStatus();
      } else {
        addLog(`❌ Login failed: ${data.message || 'Unknown error'}`, 'error');
      }
    } catch (error: any) {
      addLog(`❌ Error during login: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    checkAuthStatus();
    addLog('🚀 Debug tool loaded', 'info');
  }, []);

  const getStatusColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-500 text-green-800';
      case 'error': return 'bg-red-50 border-red-500 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-500 text-yellow-800';
      default: return 'bg-blue-50 border-blue-500 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">🔍 Login Debug Tool</h1>
          <p className="text-gray-600">Test Parse authentication without redirects</p>
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            📊 Current Auth Status
            <button
              onClick={checkAuthStatus}
              className="ml-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              🔄 Refresh
            </button>
          </h2>

          <div className="space-y-3">
            <div className={`p-4 border-l-4 rounded ${authStatus.hasToken ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
              {authStatus.hasToken ? '✅ Token exists in localStorage' : '❌ No token found'}
            </div>

            <div className={`p-4 border-l-4 rounded ${authStatus.hasUser ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
              {authStatus.hasUser ? '✅ User data exists' : '❌ No user data found'}
            </div>

            {authStatus.userData && (
              <div className="bg-gray-50 p-4 rounded">
                <strong>User Data:</strong>
                <pre className="mt-2 text-sm overflow-auto">{JSON.stringify(authStatus.userData, null, 2)}</pre>
              </div>
            )}

            <button
              onClick={clearAuth}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ Clear Auth Data
            </button>
          </div>
        </div>

        {/* Login Test */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">🔐 Test Login</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={testLogin}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              🚀 Test Login
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">📋 Response Logs</h2>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded h-96 overflow-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div>Waiting for actions...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  [{log.time}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              🔙 Go to Login Page
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              📊 Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';

interface SystemPlugin {
  id: string;
  name: string;
  version: string;
  status: 'ACTIVE' | 'DISABLED' | 'ERROR';
  installDate: string;
  lastUpdated: string;
}

interface SystemPluginLog {
  id: string;
  pluginId: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

const PluginSystemManager: React.FC = () => {
  const [plugins, setPlugins] = useState<SystemPlugin[]>([]);
  const [logs, setLogs] = useState<SystemPluginLog[]>([]);
  const [activeTab, setActiveTab] = useState<'plugins' | 'install' | 'logs'>('plugins');
  const [loading, setLoading] = useState(false);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    version: '1.0.0',
    description: '',
  });

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plugins', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPluginLogs = async (pluginId: string) => {
    try {
      const res = await fetch(`/api/plugins/${pluginId}/logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch plugin logs:', error);
    }
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Plugin installed successfully');
        setFormData({ name: '', version: '1.0.0', description: '' });
        setActiveTab('plugins');
        fetchPlugins();
      } else {
        alert('Failed to install plugin');
      }
    } catch (error) {
      console.error('Installation error:', error);
      alert('Error installing plugin');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlugin = async (pluginId: string, shouldActivate: boolean) => {
    try {
      const endpoint = shouldActivate ? 'activate' : 'deactivate';
      const res = await fetch(`/api/plugins/${pluginId}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        fetchPlugins();
      } else {
        alert('Failed to update plugin');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!window.confirm('Are you sure you want to uninstall this plugin?')) {
      return;
    }

    try {
      const res = await fetch(`/api/plugins/${pluginId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        alert('Plugin uninstalled successfully');
        fetchPlugins();
      } else {
        alert('Failed to uninstall plugin');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#28a745';
      case 'DISABLED':
        return '#ffc107';
      case 'ERROR':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="p-4">
      <h2 className="mb-4">Plugin System Management</h2>

      {/* Tabs */}
      <div className="mb-4" style={{ borderBottom: '1px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('plugins')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'plugins' ? '#007bff' : 'transparent',
            color: activeTab === 'plugins' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Installed Plugins
        </button>
        <button
          onClick={() => setActiveTab('install')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'install' ? '#007bff' : 'transparent',
            color: activeTab === 'install' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Install Plugin
        </button>
        <button
          onClick={() => {
            setActiveTab('logs');
            if (selectedPluginId) {
              fetchPluginLogs(selectedPluginId);
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'logs' ? '#007bff' : 'transparent',
            color: activeTab === 'logs' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Audit Logs
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {/* Plugins Tab */}
      {activeTab === 'plugins' && !loading && (
        <div>
          {plugins.length === 0 ? (
            <p style={{ color: '#6c757d' }}>No plugins installed yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getStatusBadgeColor(plugin.status)}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <h5 style={{ marginBottom: '5px' }}>{plugin.name}</h5>
                      <small style={{ color: '#6c757d' }}>
                        Version {plugin.version} • Installed: {new Date(plugin.installDate).toLocaleDateString()}
                      </small>
                    </div>
                    <span
                      style={{
                        backgroundColor: getStatusBadgeColor(plugin.status),
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {plugin.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleTogglePlugin(plugin.id, plugin.status !== 'ACTIVE')}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: plugin.status === 'ACTIVE' ? '#ffc107' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {plugin.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPluginId(plugin.id);
                        setActiveTab('logs');
                        fetchPluginLogs(plugin.id);
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      View Logs
                    </button>
                    <button
                      onClick={() => handleUninstall(plugin.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Install Tab */}
      {activeTab === 'install' && (
        <form onSubmit={handleInstall} style={{ maxWidth: '500px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Plugin Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
              placeholder="e.g., Advanced Reporting"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Version
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
              placeholder="1.0.0"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                boxSizing: 'border-box',
                minHeight: '100px',
              }}
              placeholder="Plugin description and features..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Installing...' : 'Install Plugin'}
          </button>
        </form>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {selectedPluginId && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h5>
                  Plugin: {plugins.find((p) => p.id === selectedPluginId)?.name}
                </h5>
              </div>

              {logs.length === 0 ? (
                <p style={{ color: '#6c757d' }}>No logs available for this plugin.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Timestamp</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Performed By</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              backgroundColor:
                                log.action === 'INSTALLED'
                                  ? '#28a745'
                                  : log.action === 'ACTIVATED'
                                  ? '#17a2b8'
                                  : log.action === 'DEACTIVATED'
                                  ? '#ffc107'
                                  : log.action === 'UNINSTALLED'
                                  ? '#dc3545'
                                  : '#6c757d',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '3px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{log.performedBy}</td>
                        <td style={{ padding: '12px', color: '#6c757d' }}>
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PluginSystemManager;

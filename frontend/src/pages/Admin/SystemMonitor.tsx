import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Dns as DnsIcon,
  ViewInAr as ContainerIcon
} from '@mui/icons-material';
import axios from 'axios';
import { getAuthToken } from '../../services/api';

interface ContainerStat {
  name: string;
  cpu: string;
  memory: string;
  network: string;
  diskIO: string;
}

interface SystemStats {
  system: {
    platform: string;
    arch: string;
    hostname: string;
    uptime: number;
    cpu: {
      cores: number;
      model: string;
      loadAvg: number[];
      usagePercent: number;
    };
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    disk: Array<{
      filesystem: string;
      size: string;
      used: string;
      available: string;
      usePercent: string;
      mount: string;
    }>;
  };
  processes: Array<{
    pid: string;
    user: string;
    cpu: number;
    memory: number;
    command: string;
  }>;
  containers?: ContainerStat[];
}

const SystemMonitor: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = getAuthToken();

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/system/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
      setError('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [token]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !stats) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={fetchStats}><RefreshIcon /></IconButton>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          System Monitor
        </Typography>
        <Box>
          <Chip
            label={`Last updated: ${new Date().toLocaleTimeString()}`}
            variant="outlined"
            size="small"
            sx={{ mr: 1 }}
          />
          <IconButton onClick={fetchStats} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {stats && (
        <Grid container spacing={3}>
          {/* CPU Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SpeedIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">CPU Usage</Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h3" color={stats.system.cpu.usagePercent > 80 ? 'error' : 'primary'}>
                    {stats.system.cpu.usagePercent}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.system.cpu.usagePercent}
                  color={stats.system.cpu.usagePercent > 80 ? 'error' : 'primary'}
                  sx={{ height: 10, borderRadius: 5, mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Cores: {stats.system.cpu.cores}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Load Avg: {stats.system.cpu.loadAvg.map(l => l.toFixed(2)).join(', ')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Memory Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <MemoryIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Memory Usage</Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="h3" color={stats.system.memory.usagePercent > 80 ? 'error' : 'secondary'}>
                    {stats.system.memory.usagePercent}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.system.memory.usagePercent}
                  color={stats.system.memory.usagePercent > 80 ? 'error' : 'secondary'}
                  sx={{ height: 10, borderRadius: 5, mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Used: {formatBytes(stats.system.memory.used)} / {formatBytes(stats.system.memory.total)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Free: {formatBytes(stats.system.memory.free)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* System Info Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <DnsIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">System Info</Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                  <strong>Hostname:</strong> {stats.system.hostname}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>OS:</strong> {stats.system.platform} ({stats.system.arch})
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Uptime:</strong> {formatUptime(stats.system.uptime)}
                </Typography>
                {stats.system.disk.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2">Disk Usage (/):</Typography>
                    <Typography variant="body2">
                      {stats.system.disk[0].used} used of {stats.system.disk[0].size} ({stats.system.disk[0].usePercent})
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Processes Table */}
          <Grid item xs={12}>
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <Box p={2}>
                <Typography variant="h6">Top Processes (by CPU)</Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PID</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Command</TableCell>
                      <TableCell align="right">CPU %</TableCell>
                      <TableCell align="right">Memory %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.processes.map((proc) => (
                      <TableRow key={proc.pid} hover>
                        <TableCell>{proc.pid}</TableCell>
                        <TableCell>{proc.user}</TableCell>
                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Tooltip title={proc.command}>
                            <span>{proc.command}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${proc.cpu}%`}
                            size="small"
                            color={proc.cpu > 50 ? 'error' : proc.cpu > 20 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{proc.memory}%</TableCell>
                      </TableRow>
                    ))}
                    {stats.processes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No process data available (requires Linux/Mac host)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Docker Containers Section */}
          <Grid item xs={12}>
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <Box p={2} display="flex" alignItems="center">
                <ContainerIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Docker Containers (Live)</Typography>
                <Chip 
                  label="Real-time" 
                  size="small" 
                  color="success" 
                  sx={{ ml: 2 }}
                />
              </Box>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Container</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                      <TableCell align="right"><strong>CPU</strong></TableCell>
                      <TableCell align="right"><strong>Memory</strong></TableCell>
                      <TableCell align="right"><strong>Network I/O</strong></TableCell>
                      <TableCell align="right"><strong>Disk I/O</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.containers && stats.containers.length > 0 ? (
                      stats.containers.map((container) => {
                        const cpuValue = parseFloat(container.cpu.replace('%', ''));
                        const isWmsContainer = container.name.startsWith('wms-');
                        return (
                          <TableRow 
                            key={container.name} 
                            hover
                            sx={{ 
                              backgroundColor: isWmsContainer ? 'rgba(25, 118, 210, 0.04)' : 'inherit'
                            }}
                          >
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <ContainerIcon 
                                  sx={{ 
                                    mr: 1, 
                                    fontSize: 18,
                                    color: isWmsContainer ? 'primary.main' : 'text.secondary'
                                  }} 
                                />
                                <Typography 
                                  variant="body2" 
                                  fontWeight={isWmsContainer ? 600 : 400}
                                >
                                  {container.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label="Running" 
                                size="small" 
                                color="success"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={container.cpu}
                                size="small"
                                color={cpuValue > 80 ? 'error' : cpuValue > 50 ? 'warning' : 'default'}
                                sx={{ minWidth: 60 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontFamily="monospace">
                                {container.memory}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                                {container.network}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                                {container.diskIO}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Box>
                            <ContainerIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">
                              No Docker containers detected
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Docker stats are only available when running on the VPS
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SystemMonitor;

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
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Dns as DnsIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Dashboard as DashboardIcon,
  FiberManualRecord as OnlineIcon
} from '@mui/icons-material';
import axios from 'axios';
import { getAuthToken } from '../../services/api';

interface ActiveUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  currentPage: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  sessionDuration: number;
  idleTime: number;
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
  database: {
    activeConnections: number;
  };
  containers: Array<{
    name: string;
    cpu: string;
    memory: string;
    network: string;
    diskIO: string;
  }>;
  users: {
    active: ActiveUser[];
    statistics: {
      totalUsers: number;
      activeNow: number;
      last24Hours: number;
      recentLogins: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        lastLoginAt: string;
      }>;
    };
  };
}

const SystemMonitorEnhanced: React.FC = () => {
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
    const interval = setInterval(fetchStats, 3000); // Refresh every 3 seconds
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
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getPageName = (path: string) => {
    if (path.includes('/shipments')) return '📦 Shipments';
    if (path.includes('/racks')) return '🏗️ Racks';
    if (path.includes('/dashboard')) return '📊 Dashboard';
    if (path.includes('/billing')) return '💰 Billing';
    if (path.includes('/users')) return '👥 Users';
    if (path.includes('/system')) return '⚙️ System Monitor';
    if (path.includes('/settings')) return '⚙️ Settings';
    return path;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'MANAGER': return 'warning';
      case 'WORKER': return 'info';
      default: return 'default';
    }
  };

  if (loading && !stats) {
    return (
      <Box p={3}>
        <Typography>Loading system statistics...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!stats) return null;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">System Monitor</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchStats} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* System Resource Cards */}
      <Grid container spacing={3} mb={3}>
        {/* CPU Usage */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              <Typography variant="h3" color="primary" gutterBottom>
                {stats.system.cpu.usagePercent}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.system.cpu.usagePercent}
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
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

        {/* Memory Usage */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MemoryIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Memory Usage</Typography>
              </Box>
              <Typography variant="h3" color={stats.system.memory.usagePercent > 85 ? 'error' : 'secondary'} gutterBottom>
                {stats.system.memory.usagePercent.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.system.memory.usagePercent}
                color={stats.system.memory.usagePercent > 85 ? 'error' : 'secondary'}
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
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

        {/* System Info */}
        <Grid item xs={12} md={3}>
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
              {stats.system.disk[0] && (
                <Typography variant="body2" gutterBottom>
                  <strong>Disk Usage (/):</strong><br />
                  {stats.system.disk[0].used} used of {stats.system.disk[0].size} ({stats.system.disk[0].usePercent})
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PeopleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Users</Typography>
              </Box>
              <Typography variant="h3" color="success" gutterBottom>
                {stats.users.statistics.activeNow}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Online now
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Users: {stats.users.statistics.totalUsers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last 24h: {stats.users.statistics.last24Hours}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Online Users - Real-time */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <OnlineIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Online Users ({stats.users.active.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {stats.users.active.length === 0 ? (
              <Typography color="textSecondary">No users currently online</Typography>
            ) : (
              <List>
                {stats.users.active.map((user) => (
                  <ListItem key={user.userId} divider>
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <OnlineIcon
                            sx={{
                              fontSize: 12,
                              color: user.idleTime < 60 ? '#44b700' : '#ffa726'
                            }}
                          />
                        }
                      >
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">{user.name}</Typography>
                          <Chip
                            label={user.role}
                            size="small"
                            color={getRoleColor(user.role)}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            📍 {getPageName(user.currentPage)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Session: {formatDuration(user.sessionDuration)} |
                            Idle: {formatDuration(user.idleTime)} |
                            IP: {user.ipAddress}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Docker Containers */}
        {stats.containers.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <ComputerIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Docker Containers ({stats.containers.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Container</TableCell>
                      <TableCell align="right">CPU</TableCell>
                      <TableCell align="right">Memory</TableCell>
                      <TableCell align="right">Network I/O</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.containers.map((container) => (
                      <TableRow key={container.name}>
                        <TableCell>{container.name}</TableCell>
                        <TableCell align="right">{container.cpu}</TableCell>
                        <TableCell align="right">{container.memory}</TableCell>
                        <TableCell align="right">{container.network}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Top Processes */}
        <Grid item xs={12} md={stats.containers.length > 0 ? 12 : 6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <DashboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Top Processes by CPU
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PID</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell align="right">CPU %</TableCell>
                    <TableCell align="right">Memory %</TableCell>
                    <TableCell>Command</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.processes.slice(0, 10).map((proc) => (
                    <TableRow key={proc.pid}>
                      <TableCell>{proc.pid}</TableCell>
                      <TableCell>{proc.user}</TableCell>
                      <TableCell align="right">{proc.cpu.toFixed(1)}%</TableCell>
                      <TableCell align="right">{proc.memory.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                          {proc.command}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Logins */}
        <Grid item xs={12} md={stats.containers.length > 0 ? 6 : 12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Logins (Last 24h)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {stats.users.statistics.recentLogins.map((user) => (
                <ListItem key={user.id} divider>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">{user.name}</Typography>
                        <Chip label={user.role} size="small" color={getRoleColor(user.role)} />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="textSecondary">
                          {user.email}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          Last login: {new Date(user.lastLoginAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Database Stats */}
        <Grid item xs={12} md={stats.containers.length > 0 ? 6 : 12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Database Statistics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box p={2}>
              <Typography variant="body1" gutterBottom>
                <strong>Active Connections:</strong> {stats.database.activeConnections}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Current database connections being used by the application
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitorEnhanced;

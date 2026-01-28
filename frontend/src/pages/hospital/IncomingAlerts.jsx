import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch
} from '@mui/material';
import {
  Emergency,
  Warning,
  CheckCircle,
  Schedule,
  LocalHospital,
  Phone,
  Message,
  Visibility,
  Refresh,
  FilterList,
  NotificationsActive,
  TrendingUp,
  TrendingDown,
  Close
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const IncomingAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    priority: 'all',
    status: 'all',
    type: 'all'
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    highPriority: 0,
    today: 0
  });
  const { socket } = useSocket();

  useEffect(() => {
    loadAlerts();
    
    if (socket) {
      socket.on('emergency-started', handleNewAlert);
      socket.on('ambulance-location-update', handleLocationUpdate);
      socket.on('police-notification', handlePoliceNotification);
      
      return () => {
        socket.off('emergency-started');
        socket.off('ambulance-location-update');
        socket.off('police-notification');
      };
    }
  }, [socket]);

  useEffect(() => {
    applyFilters();
  }, [alerts, filters]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/hospital/notifications');
      setAlerts(response.data.notifications || []);
      calculateStats(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAlert = (data) => {
    const newAlert = {
      id: Date.now(),
      type: 'emergency',
      priority: 'high',
      title: 'New Emergency Vehicle Enroute',
      message: `Ambulance ${data.ambulance} heading to ${data.hospital}`,
      timestamp: new Date(),
      read: false,
      data: data
    };
    
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleLocationUpdate = (data) => {
    // Update existing alert with new ETA
    setAlerts(prev => prev.map(alert => 
      alert.data?.emergencyId === data.emergencyId
        ? { ...alert, message: `ETA Updated: ${data.eta} minutes remaining` }
        : alert
    ));
  };

  const handlePoliceNotification = (data) => {
    const newAlert = {
      id: Date.now(),
      type: 'police',
      priority: data.priority,
      title: 'Police Notification',
      message: data.message,
      timestamp: new Date(),
      read: false,
      data: data
    };
    
    setAlerts(prev => [newAlert, ...prev]);
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    if (filters.priority !== 'all') {
      filtered = filtered.filter(alert => alert.priority === filters.priority);
    }

    if (filters.status !== 'all') {
      const read = filters.status === 'read';
      filtered = filtered.filter(alert => alert.read === read);
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(alert => alert.type === filters.type);
    }

    setFilteredAlerts(filtered);
  };

  const calculateStats = (alertList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAlerts = alertList.filter(alert => 
      new Date(alert.timestamp) >= today
    ).length;

    setStats({
      total: alertList.length,
      unread: alertList.filter(a => !a.read).length,
      highPriority: alertList.filter(a => a.priority === 'high' || a.priority === 'critical').length,
      today: todayAlerts
    });
  };

  const handleMarkAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
  };

  const handleMarkAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all alerts?')) {
      setAlerts([]);
    }
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setDetailDialog(true);
    if (!alert.read) {
      handleMarkAsRead(alert.id);
    }
  };

  const handleAcknowledgeEmergency = async (emergencyId) => {
    try {
      await api.post(`/api/hospital/emergencies/${emergencyId}/acknowledge`);
      alert('Emergency acknowledged');
    } catch (error) {
      console.error('Error acknowledging emergency:', error);
      alert('Failed to acknowledge emergency');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const getAlertIcon = (type, priority) => {
    switch (type) {
      case 'emergency':
        return <Emergency sx={{ color: getPriorityColor(priority) }} />;
      case 'police':
        return <Warning sx={{ color: getPriorityColor(priority) }} />;
      case 'system':
        return <NotificationsActive sx={{ color: getPriorityColor(priority) }} />;
      default:
        return <Warning sx={{ color: getPriorityColor(priority) }} />;
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return alertTime.toLocaleDateString();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff3e0' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <NotificationsActive sx={{ fontSize: 40, color: '#ff9800', mr: 2 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                📢 Incoming Alerts & Notifications
              </Typography>
              <Typography variant="body1">
                Real-time emergency notifications and system alerts
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <IconButton onClick={loadAlerts} title="Refresh">
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircle />}
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={stats.unread} color="error">
                <NotificationsActive sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
              </Badge>
              <Typography variant="h4">{stats.total}</Typography>
              <Typography variant="caption" color="textSecondary">
                Total Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Emergency sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
              <Typography variant="h4" color="error.main">
                {stats.highPriority}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                High Priority
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Schedule sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {stats.today}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Today's Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
              <Typography variant="h4">92%</Typography>
              <Typography variant="caption" color="textSecondary">
                Response Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                label="Priority"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="unread">Unread</MenuItem>
                <MenuItem value="read">Read</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                label="Alert Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="police">Police</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="alert">Alert</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FilterList />}
              onClick={() => setFilters({
                priority: 'all',
                status: 'all',
                type: 'all'
              })}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Alerts List */}
      {loading ? (
        <Box textAlign="center" py={4}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Loading alerts...
          </Typography>
        </Box>
      ) : filteredAlerts.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body2">
            No alerts match your filters.
          </Typography>
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Alert</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow 
                  key={alert.id}
                  hover
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: !alert.read ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                  onClick={() => handleViewDetails(alert)}
                >
                  <TableCell>
                    <Badge
                      color="error"
                      variant="dot"
                      invisible={alert.read}
                    >
                      {getAlertIcon(alert.type, alert.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {alert.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {alert.message}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.type.toUpperCase()}
                      size="small"
                      color={
                        alert.type === 'emergency' ? 'error' :
                        alert.type === 'police' ? 'warning' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.priority.toUpperCase()}
                      size="small"
                      sx={{ 
                        color: getPriorityColor(alert.priority),
                        borderColor: getPriorityColor(alert.priority)
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTime(alert.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.read ? "READ" : "UNREAD"}
                      size="small"
                      color={alert.read ? "default" : "error"}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <IconButton 
                        size="small" 
                        title="View Details"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(alert);
                        }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {!alert.read && (
                        <IconButton 
                          size="small" 
                          color="primary"
                          title="Mark as Read"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(alert.id);
                          }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                      {alert.type === 'emergency' && (
                        <IconButton 
                          size="small" 
                          color="success"
                          title="Acknowledge Emergency"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (alert.data?.emergencyId) {
                              handleAcknowledgeEmergency(alert.data.emergencyId);
                            }
                          }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Alert Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        {selectedAlert && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                {getAlertIcon(selectedAlert.type, selectedAlert.priority)}
                <Box sx={{ ml: 1 }}>
                  <Typography variant="h6">{selectedAlert.title}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(selectedAlert.timestamp)}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Alert Message
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {selectedAlert.message}
                      </Typography>
                      
                      {selectedAlert.data && (
                        <>
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Additional Information
                          </Typography>
                          <pre style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '10px', 
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            overflow: 'auto'
                          }}>
                            {JSON.stringify(selectedAlert.data, null, 2)}
                          </pre>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Alert Details
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Type"
                            secondary={
                              <Chip 
                                label={selectedAlert.type.toUpperCase()}
                                size="small"
                                color={
                                  selectedAlert.type === 'emergency' ? 'error' :
                                  selectedAlert.type === 'police' ? 'warning' : 'default'
                                }
                              />
                            }
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Priority"
                            secondary={
                              <Chip 
                                label={selectedAlert.priority.toUpperCase()}
                                size="small"
                                sx={{ 
                                  color: getPriorityColor(selectedAlert.priority),
                                  borderColor: getPriorityColor(selectedAlert.priority)
                                }}
                                variant="outlined"
                              />
                            }
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Status"
                            secondary={
                              <Chip 
                                label={selectedAlert.read ? "READ" : "UNREAD"}
                                size="small"
                                color={selectedAlert.read ? "default" : "error"}
                              />
                            }
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Timestamp"
                            secondary={new Date(selectedAlert.timestamp).toLocaleString()}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>

                  {selectedAlert.type === 'emergency' && (
                    <Card variant="outlined" sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Emergency Actions
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CheckCircle />}
                            onClick={() => {
                              if (selectedAlert.data?.emergencyId) {
                                handleAcknowledgeEmergency(selectedAlert.data.emergencyId);
                              }
                              setDetailDialog(false);
                            }}
                          >
                            Acknowledge Emergency
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<Phone />}
                          >
                            Contact Ambulance
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<Message />}
                          >
                            Notify Police
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<LocalHospital />}
                          >
                            Prepare Medical Team
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailDialog(false)}>Close</Button>
              {!selectedAlert.read && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    handleMarkAsRead(selectedAlert.id);
                    setDetailDialog(false);
                  }}
                >
                  Mark as Read
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  // Take action based on alert type
                  setDetailDialog(false);
                }}
              >
                Take Action
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          ⚡ Quick Alert Management
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<CheckCircle />}
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read
            </Button>
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TrendingDown />}
              onClick={() => {
                // Set priority filter to high
                setFilters({...filters, priority: 'high'});
              }}
            >
              Show High Priority
            </Button>
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Emergency />}
              onClick={() => {
                // Set type filter to emergency
                setFilters({...filters, type: 'emergency'});
              }}
            >
              Emergency Alerts Only
            </Button>
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<Close />}
              onClick={handleClearAll}
            >
              Clear All Alerts
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default IncomingAlerts;
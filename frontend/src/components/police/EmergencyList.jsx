import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Emergency,
  LocationOn,
  Schedule,
  Traffic,
  Directions,
  Info,
  Notifications,
  CheckCircle,
  Warning,
  Refresh,
  Visibility,
  Phone,
  Map
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const EmergencyList = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    loadEmergencies();
    
    if (socket) {
      socket.on('emergency-started', handleNewEmergency);
      socket.on('ambulance-location-update', handleLocationUpdate);
      socket.on('emergency-ended', handleEmergencyEnded);
      
      return () => {
        socket.off('emergency-started');
        socket.off('ambulance-location-update');
        socket.off('emergency-ended');
      };
    }
  }, [socket]);

  const loadEmergencies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/police/emergencies/active');
      setEmergencies(response.data.emergencies || []);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEmergency = (data) => {
    setEmergencies(prev => [data, ...prev]);
  };

  const handleLocationUpdate = (data) => {
    setEmergencies(prev => prev.map(emergency => 
      emergency._id === data.emergencyId
        ? { ...emergency, currentLocation: data.location, eta: data.eta }
        : emergency
    ));
  };

  const handleEmergencyEnded = (data) => {
    setEmergencies(prev => prev.filter(emergency => emergency._id !== data.emergencyId));
  };

  const handleViewDetails = (emergency) => {
    setSelectedEmergency(emergency);
    setDetailDialog(true);
  };

  const handleClearRoute = async (emergencyId) => {
    try {
      await api.post('/api/police/traffic/priority', {
        emergencyId,
        action: 'clear-route'
      });
      
      alert('Route clearance initiated for all signals');
    } catch (error) {
      console.error('Error clearing route:', error);
      alert('Failed to clear route');
    }
  };

  const handleNotifyHospital = async (emergencyId, hospitalId) => {
    try {
      await api.post('/api/police/notify/hospital', {
        emergencyId,
        hospitalId,
        message: 'Police assistance enroute'
      });
      
      alert('Hospital notified successfully');
    } catch (error) {
      console.error('Error notifying hospital:', error);
      alert('Failed to notify hospital');
    }
  };

  const getEmergencyColor = (emergency) => {
    if (emergency.priority === 'high') return '#f44336';
    if (emergency.isDelayed) return '#ff9800';
    return '#1976d2';
  };

  const getStatusIcon = (emergency) => {
    if (emergency.priority === 'high') return <Warning />;
    if (emergency.isDelayed) return <Schedule />;
    return <Emergency />;
  };

  const formatTime = (minutes) => {
    if (minutes <= 0) return 'Arriving now';
    return `${minutes} min`;
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          🚨 Active Emergency Vehicles
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh List">
            <IconButton onClick={loadEmergencies} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Chip 
            label={`${emergencies.length} Active`}
            color="error"
            size="small"
            icon={<Emergency />}
          />
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Loading active emergencies...
          </Typography>
        </Box>
      ) : emergencies.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            No active emergencies at the moment.
          </Typography>
          <Typography variant="caption" display="block">
            All systems are monitoring for emergency vehicles.
          </Typography>
        </Alert>
      ) : (
        <List>
          {emergencies.map((emergency) => (
            <ListItem
              key={emergency._id}
              sx={{
                mb: 2,
                bgcolor: '#f5f5f5',
                borderRadius: 1,
                border: `2px solid ${getEmergencyColor(emergency)}`,
                '&:hover': {
                  bgcolor: '#eeeeee'
                }
              }}
              secondaryAction={
                <Box display="flex" gap={1}>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => handleViewDetails(emergency)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear Route">
                    <IconButton onClick={() => handleClearRoute(emergency._id)}>
                      <Traffic />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemIcon>
                {getStatusIcon(emergency)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2" fontWeight="bold">
                      {emergency.vehicleNumber}
                    </Typography>
                    <Chip 
                      label={formatTime(emergency.remainingTime)}
                      size="small"
                      color={
                        emergency.remainingTime <= 5 ? 'error' :
                        emergency.remainingTime <= 10 ? 'warning' : 'primary'
                      }
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      🏥 To: {emergency.hospitalName}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      👤 Driver: {emergency.driverName}
                    </Typography>
                    <Box display="flex" gap={1} sx={{ mt: 0.5 }}>
                      <Chip 
                        icon={<LocationOn />}
                        label="Enroute"
                        size="small"
                        variant="outlined"
                      />
                      {emergency.priority === 'high' && (
                        <Chip 
                          icon={<Warning />}
                          label="High Priority"
                          size="small"
                          color="error"
                        />
                      )}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Statistics */}
      {emergencies.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Emergency Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h6" color="error.main">
                    {emergencies.filter(e => e.priority === 'high').length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    High Priority
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h6" color="warning.main">
                    {emergencies.filter(e => e.isDelayed).length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Delayed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h6" color="success.main">
                    {emergencies.filter(e => e.remainingTime <= 5).length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Arriving Soon
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Emergency Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        {selectedEmergency && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Emergency sx={{ mr: 1, color: getEmergencyColor(selectedEmergency) }} />
                Emergency Vehicle Details
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Vehicle Information
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Vehicle Number"
                            secondary={selectedEmergency.vehicleNumber}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Driver"
                            secondary={selectedEmergency.driverName}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Emergency Started"
                            secondary={new Date(selectedEmergency.startTime).toLocaleString()}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Elapsed Time"
                            secondary={`${selectedEmergency.elapsedTime || 0} minutes`}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Destination Hospital
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Hospital"
                            secondary={selectedEmergency.hospitalName}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="ETA"
                            secondary={formatTime(selectedEmergency.remainingTime)}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Status"
                            secondary={
                              <Chip 
                                label={selectedEmergency.priority === 'high' ? 'HIGH PRIORITY' : 'ACTIVE'}
                                size="small"
                                color={selectedEmergency.priority === 'high' ? 'error' : 'primary'}
                              />
                            }
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Route Information
                      </Typography>
                      <Box display="flex" gap={2} alignItems="center">
                        <Button
                          variant="outlined"
                          startIcon={<Map />}
                          size="small"
                        >
                          View on Map
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Directions />}
                          size="small"
                        >
                          Get Directions
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Phone />}
                          size="small"
                        >
                          Contact Driver
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Alert 
                    severity={selectedEmergency.isDelayed ? "warning" : "info"}
                    icon={<Info />}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {selectedEmergency.isDelayed ? '⚠️ Vehicle is delayed' : '✅ Vehicle on schedule'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {selectedEmergency.isDelayed 
                        ? `Delayed by ${Math.abs(selectedEmergency.remainingTime)} minutes`
                        : 'Arriving as per AI-estimated schedule'
                      }
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailDialog(false)}>Close</Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Notifications />}
                onClick={() => handleNotifyHospital(selectedEmergency._id, selectedEmergency.hospitalId)}
              >
                Notify Hospital
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Traffic />}
                onClick={() => handleClearRoute(selectedEmergency._id)}
              >
                Clear Entire Route
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default EmergencyList;
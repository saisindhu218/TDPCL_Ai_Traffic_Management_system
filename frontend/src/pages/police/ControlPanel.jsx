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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Slider
} from '@mui/material';
import {
  Traffic,
  Emergency,
  Warning,
  CheckCircle,
  ClearAll,
  Refresh,
  Directions,
  Notifications,
  Timer,
  Speed,
  FilterList,
  Visibility,
  Send
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const ControlPanel = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [clearanceDialog, setClearanceDialog] = useState(false);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [clearanceData, setClearanceData] = useState({
    duration: 180,
    pattern: 'all-green',
    message: ''
  });
  const [notificationData, setNotificationData] = useState({
    type: 'alert',
    message: '',
    priority: 'medium'
  });
  const { socket } = useSocket();

  useEffect(() => {
    loadData();
    
    if (socket) {
      socket.on('emergency-started', handleNewEmergency);
      socket.on('ambulance-location-update', handleLocationUpdate);
      socket.on('signal-clearance-request', handleClearanceRequest);
      
      return () => {
        socket.off('emergency-started');
        socket.off('ambulance-location-update');
        socket.off('signal-clearance-request');
      };
    }
  }, [socket]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emergenciesRes, signalsRes] = await Promise.all([
        api.get('/api/police/emergencies/active'),
        api.get('/api/police/signals')
      ]);
      
      setEmergencies(emergenciesRes.data.emergencies || []);
      setSignals(signalsRes.data.signals || []);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handleClearanceRequest = (data) => {
    // Highlight the signal that needs clearance
    setSignals(prev => prev.map(signal => 
      signal.signalId === data.signalId 
        ? { ...signal, needsClearance: true, emergencyId: data.emergencyId }
        : signal
    ));
    
    // Show alert
    alert(`Clearance requested for Signal ${data.signalId} by Ambulance`);
  };

  const handleClearSignal = async (signalId) => {
    try {
      await api.post(`/api/police/signals/${signalId}/clear`, {
        duration: clearanceData.duration
      });
      
      // Update local state
      setSignals(prev => prev.map(signal => 
        signal.signalId === signalId 
          ? { ...signal, status: 'cleared', clearedAt: new Date() }
          : signal
      ));
      
      setClearanceDialog(false);
      alert(`Signal ${signalId} cleared successfully`);
    } catch (error) {
      console.error('Error clearing signal:', error);
      alert('Failed to clear signal');
    }
  };

  const handleClearAllSignals = async () => {
    if (!window.confirm('Clear all signals for emergency route?')) {
      return;
    }

    try {
      const promises = signals.map(signal => 
        api.post(`/api/police/signals/${signal.signalId}/clear`, { duration: 180 })
      );

      await Promise.all(promises);

      // Update all signals
      setSignals(prev => prev.map(signal => ({
        ...signal,
        status: 'cleared',
        clearedAt: new Date(),
        isPriority: true
      })));

      alert('All signals cleared for emergency route');
    } catch (error) {
      console.error('Error clearing all signals:', error);
      alert('Failed to clear all signals');
    }
  };

  const handleSendNotification = async () => {
    try {
      // Send to all connected ambulances
      if (socket) {
        socket.emit('police-notification', notificationData);
      }
      
      setNotificationDialog(false);
      setNotificationData({
        type: 'alert',
        message: '',
        priority: 'medium'
      });
      
      alert('Notification sent to all emergency vehicles');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    }
  };

  const getEmergencyColor = (emergency) => {
    if (emergency.priority === 'high') return '#f44336';
    if (emergency.isDelayed) return '#ff9800';
    return '#1976d2';
  };

  const getSignalColor = (signal) => {
    if (signal.status === 'cleared') return '#4caf50';
    if (signal.needsClearance) return '#f44336';
    if (signal.congestionLevel === 'high') return '#ff9800';
    if (signal.isPriority) return '#2196f3';
    return '#757575';
  };

  const getStats = () => {
    return {
      activeEmergencies: emergencies.length,
      clearedSignals: signals.filter(s => s.status === 'cleared').length,
      pendingSignals: signals.filter(s => s.needsClearance).length,
      highCongestion: signals.filter(s => s.congestionLevel === 'high').length
    };
  };

  const stats = getStats();

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <Traffic sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                🚓 Police Control Center
              </Typography>
              <Typography variant="body1">
                Real-time emergency coordination and traffic management
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <IconButton onClick={loadData} title="Refresh">
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              color="error"
              startIcon={<ClearAll />}
              onClick={handleClearAllSignals}
            >
              Clear All Signals
            </Button>
            <Button
              variant="contained"
              startIcon={<Notifications />}
              onClick={() => setNotificationDialog(true)}
            >
              Broadcast Alert
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {stats.activeEmergencies}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Active Emergencies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.clearedSignals}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Signals Cleared
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.pendingSignals}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Pending Clearance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {stats.highCongestion}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                High Congestion Zones
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Column - Active Emergencies */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Emergency sx={{ mr: 1, color: '#f44336' }} />
              Active Emergency Vehicles
            </Typography>
            
            {loading ? (
              <Box textAlign="center" py={4}>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="textSecondary">
                  Loading emergencies...
                </Typography>
              </Box>
            ) : emergencies.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No active emergencies at the moment.
                </Typography>
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Destination</TableCell>
                      <TableCell>ETA</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emergencies.map((emergency) => (
                      <TableRow 
                        key={emergency._id}
                        hover
                        onClick={() => setSelectedEmergency(emergency)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {emergency.vehicleNumber}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {emergency.driverName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {emergency.hospitalName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${emergency.remainingTime || '?'} min`}
                            size="small"
                            color={
                              emergency.remainingTime <= 5 ? 'error' :
                              emergency.remainingTime <= 10 ? 'warning' : 'primary'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={emergency.priority === 'high' ? 'HIGH' : 'ACTIVE'}
                            size="small"
                            color={emergency.priority === 'high' ? 'error' : 'primary'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <IconButton size="small" title="View Details">
                              <Visibility fontSize="small" />
                            </IconButton>
                            <IconButton size="small" title="Get Directions">
                              <Directions fontSize="small" />
                            </IconButton>
                            <IconButton size="small" title="Send Alert">
                              <Send fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {emergencies.length > 0 && (
              <Button fullWidth sx={{ mt: 2 }} startIcon={<Emergency />}>
                View All Emergencies on Map
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Signal Control */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Traffic sx={{ mr: 1, color: '#1976d2' }} />
              Traffic Signal Control
            </Typography>
            
            {signals.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No signals available.
                </Typography>
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {signals.slice(0, 6).map((signal) => (
                  <Grid item xs={6} md={4} key={signal.signalId}>
                    <Card 
                      variant="outlined"
                      sx={{
                        borderColor: getSignalColor(signal),
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => {
                        setSelectedEmergency(null);
                        setClearanceData({...clearanceData, signalId: signal.signalId});
                        setClearanceDialog(true);
                      }}
                    >
                      <CardContent sx={{ p: 2, textAlign: 'center' }}>
                        <Traffic sx={{ 
                          fontSize: 30, 
                          color: getSignalColor(signal),
                          mb: 1
                        }} />
                        <Typography variant="subtitle2" fontWeight="medium">
                          {signal.signalId}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          {signal.location?.address?.split(',')[0]}
                        </Typography>
                        
                        <Box sx={{ mt: 1 }}>
                          <Chip 
                            label={signal.status || 'Normal'}
                            size="small"
                            sx={{ 
                              color: getSignalColor(signal),
                              borderColor: getSignalColor(signal)
                            }}
                            variant="outlined"
                          />
                        </Box>
                        
                        {signal.needsClearance && (
                          <Alert severity="error" sx={{ mt: 1, p: 0.5 }} icon={<Warning />}>
                            <Typography variant="caption">
                              Clearance Needed
                            </Typography>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
            
            {signals.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        startIcon={<Timer />}
                        onClick={() => {
                          // Set all to 2 min clearance
                          setClearanceData({...clearanceData, duration: 120});
                          setClearanceDialog(true);
                        }}
                      >
                        Set 2-min Clearance
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        startIcon={<Speed />}
                        onClick={() => {
                          // Set all to emergency clearance
                          setClearanceData({...clearanceData, duration: 300});
                          setClearanceDialog(true);
                        }}
                      >
                        Emergency Clearance
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Selected Emergency Details */}
      {selectedEmergency && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Emergency Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
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
                        primary="Start Time"
                        secondary={new Date(selectedEmergency.startTime).toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
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
                        secondary={`${selectedEmergency.remainingTime || '?'} minutes`}
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
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Actions
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Button
                      variant="contained"
                      startIcon={<Traffic />}
                      onClick={handleClearAllSignals}
                    >
                      Clear Route Signals
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Directions />}
                    >
                      View Route on Map
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Send />}
                      onClick={() => {
                        setNotificationData({
                          type: 'alert',
                          message: `Attention ${selectedEmergency.vehicleNumber}: Police assistance enroute`,
                          priority: 'high'
                        });
                        setNotificationDialog(true);
                      }}
                    >
                      Send Alert to Ambulance
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Signal Clearance Dialog */}
      <Dialog open={clearanceDialog} onClose={() => setClearanceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Traffic sx={{ mr: 1, color: '#1976d2' }} />
            Signal Clearance Configuration
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Configure signal clearance parameters for emergency vehicles.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Clearance Duration: {clearanceData.duration} seconds
            </Typography>
            <Slider
              value={clearanceData.duration}
              onChange={(e, value) => setClearanceData({...clearanceData, duration: value})}
              min={30}
              max={300}
              step={30}
              marks={[
                { value: 30, label: '30s' },
                { value: 120, label: '2m' },
                { value: 180, label: '3m' },
                { value: 300, label: '5m' }
              ]}
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Clearance Pattern</InputLabel>
            <Select
              value={clearanceData.pattern}
              onChange={(e) => setClearanceData({...clearanceData, pattern: e.target.value})}
              label="Clearance Pattern"
            >
              <MenuItem value="all-green">All Green (Emergency)</MenuItem>
              <MenuItem value="alternating">Alternating Flow</MenuItem>
              <MenuItem value="wave">Green Wave</MenuItem>
              <MenuItem value="standard">Standard Clearance</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Message to Ambulance (Optional)"
            value={clearanceData.message}
            onChange={(e) => setClearanceData({...clearanceData, message: e.target.value})}
            multiline
            rows={2}
            placeholder="e.g., All signals cleared on your route, proceed safely"
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setClearanceDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (clearanceData.signalId) {
                handleClearSignal(clearanceData.signalId);
              } else {
                handleClearAllSignals();
              }
            }}
            startIcon={<CheckCircle />}
          >
            Confirm Clearance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialog} onClose={() => setNotificationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Notifications sx={{ mr: 1, color: '#ff9800' }} />
            Broadcast Alert to Emergency Vehicles
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This message will be sent to all active emergency vehicles.
            </Typography>
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Alert Type</InputLabel>
            <Select
              value={notificationData.type}
              onChange={(e) => setNotificationData({...notificationData, type: e.target.value})}
              label="Alert Type"
            >
              <MenuItem value="info">Information</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="alert">Alert</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={notificationData.priority}
              onChange={(e) => setNotificationData({...notificationData, priority: e.target.value})}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Message"
            value={notificationData.message}
            onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
            multiline
            rows={3}
            required
            placeholder="Enter your message for emergency vehicles..."
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setNotificationDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSendNotification}
            disabled={!notificationData.message}
            startIcon={<Send />}
          >
            Broadcast Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ControlPanel;
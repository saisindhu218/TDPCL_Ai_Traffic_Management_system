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
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Emergency,
  LocationOn,
  LocalHospital,
  Schedule,
  Traffic,
  Navigation,
  Phone,
  Message,
  Warning,
  CheckCircle,
  Refresh,
  Close,
  History
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import MapComponent from '../../components/common/MapComponent';

const EmergencyView = () => {
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [signals, setSignals] = useState([]);
  const [eta, setEta] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    loadActiveEmergency();
    getCurrentLocation();
    
    if (socket) {
      socket.on('ambulance-location-update', handleLocationUpdate);
      socket.on('signal-cleared', handleSignalCleared);
      socket.on('hospital-prepared', handleHospitalUpdate);
      
      return () => {
        socket.off('ambulance-location-update');
        socket.off('signal-cleared');
        socket.off('hospital-prepared');
      };
    }
  }, [socket]);

  const loadActiveEmergency = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/ambulance/status');
      if (response.data.activeEmergency) {
        setEmergency(response.data.activeEmergency);
        setEta(response.data.activeEmergency.estimatedTime);
        loadSignalStatus(response.data.activeEmergency._id);
      } else {
        // No active emergency, redirect to dashboard
        navigate('/ambulance');
      }
    } catch (error) {
      console.error('Error loading emergency:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          updateLocation(latitude, longitude);
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  };

  const updateLocation = async (lat, lng) => {
    try {
      await api.post('/api/ambulance/emergency/update-location', {
        lat,
        lng,
        address: 'Current Location'
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const loadSignalStatus = async (emergencyId) => {
    try {
      const response = await api.get(`/api/ambulance/signal/status?emergencyId=${emergencyId}`);
      setSignals(response.data.signals || []);
    } catch (error) {
      console.error('Error loading signal status:', error);
    }
  };

  const handleLocationUpdate = (data) => {
    if (emergency && data.emergencyId === emergency._id) {
      setCurrentLocation(data.location);
      if (data.eta) setEta(data.eta);
    }
  };

  const handleSignalCleared = (data) => {
    setSignals(prev => prev.map(signal => 
      signal.signalId === data.signalId 
        ? { ...signal, status: 'cleared', clearedAt: data.timestamp }
        : signal
    ));
  };

  const handleHospitalUpdate = (data) => {
    if (emergency && data.emergencyId === emergency._id) {
      setEmergency(prev => ({
        ...prev,
        hospitalReady: true,
        hospitalPreparation: data.preparation
      }));
    }
  };

  const handleEndEmergency = async () => {
    if (!window.confirm('Are you sure you want to end this emergency?')) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/ambulance/emergency/end/${emergency._id}`);
      alert('Emergency completed successfully');
      navigate('/ambulance');
    } catch (error) {
      console.error('Error ending emergency:', error);
      alert('Failed to end emergency');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClearance = async (signalId) => {
    try {
      await api.post('/api/ambulance/signal/request-clearance', {
        signalId,
        emergencyId: emergency._id
      });
      alert('Clearance requested from police');
    } catch (error) {
      console.error('Error requesting clearance:', error);
      alert('Failed to request clearance');
    }
  };

  const handleNotifyHospital = async () => {
    try {
      await api.post('/api/ambulance/emergency/notify-hospital', {
        emergencyId: emergency._id,
        message: 'Ambulance enroute, ETA: ' + eta + ' minutes'
      });
      alert('Hospital notified');
    } catch (error) {
      console.error('Error notifying hospital:', error);
      alert('Failed to notify hospital');
    }
  };

  const getProgressPercentage = () => {
    if (!emergency || !eta) return 0;
    const elapsed = Math.floor((Date.now() - new Date(emergency.startTime).getTime()) / 60000);
    const total = elapsed + eta;
    return total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box textAlign="center">
          <LinearProgress sx={{ width: 300, mb: 2 }} />
          <Typography variant="h6">Loading Emergency Details...</Typography>
        </Box>
      </Container>
    );
  }

  if (!emergency) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body1">No active emergency found.</Typography>
          <Button sx={{ mt: 1 }} variant="outlined" onClick={() => navigate('/ambulance')}>
            Go to Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#ffebee', border: '2px solid #f44336' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <Emergency sx={{ fontSize: 40, color: '#f44336', mr: 2 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                🚨 ACTIVE EMERGENCY
              </Typography>
              <Typography variant="body1">
                Vehicle: {emergency.vehicleNumber} • To: {emergency.hospitalName}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Chip 
              label={`ETA: ${eta || 'Calculating...'}`}
              color="error"
              icon={<Schedule />}
              sx={{ fontWeight: 'bold', fontSize: '1rem' }}
            />
            <Button
              variant="contained"
              color="error"
              onClick={() => setDialogOpen(true)}
              startIcon={<Close />}
            >
              END EMERGENCY
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Map & Controls */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3, height: '500px' }}>
            <MapComponent
              currentLocation={currentLocation}
              destination={emergency.destination}
              emergencyMode={true}
              onRouteUpdate={(routeInfo) => setEta(routeInfo.estimatedTime)}
            />
          </Paper>

          {/* Progress & Controls */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Emergency Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={getProgressPercentage()}
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Phone />}
                    onClick={handleNotifyHospital}
                  >
                    Call Hospital
                  </Button>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Message />}
                  >
                    Message Police
                  </Button>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Navigation />}
                  >
                    Recalculate Route
                  </Button>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Refresh />}
                    onClick={loadActiveEmergency}
                  >
                    Refresh
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Details */}
        <Grid item xs={12} md={4}>
          {/* Hospital Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center">
                <LocalHospital sx={{ mr: 1, color: '#4caf50' }} />
                Destination Hospital
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary={emergency.hospitalName}
                    secondary={emergency.destination?.address}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Emergency Contact"
                    secondary="080-12345678"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Status"
                    secondary={
                      emergency.hospitalReady ? (
                        <Chip label="PREPARED" size="small" color="success" icon={<CheckCircle />} />
                      ) : (
                        <Chip label="PREPARING" size="small" color="warning" icon={<Warning />} />
                      )
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Signal Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center">
                <Traffic sx={{ mr: 1, color: '#1976d2' }} />
                Signal Clearance Status
              </Typography>
              
              {signals.length === 0 ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    No signals on your route yet
                  </Typography>
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Signal</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {signals.slice(0, 5).map((signal) => (
                        <TableRow key={signal.signalId}>
                          <TableCell>
                            <Typography variant="body2">
                              {signal.signalId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={signal.status || 'Pending'}
                              size="small"
                              color={
                                signal.status === 'cleared' ? 'success' : 
                                signal.status === 'blocked' ? 'error' : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            {signal.status !== 'cleared' && (
                              <IconButton 
                                size="small"
                                onClick={() => handleRequestClearance(signal.signalId)}
                                title="Request Clearance"
                              >
                                <Emergency fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Button fullWidth sx={{ mt: 2 }} startIcon={<Traffic />}>
                View All Signals
              </Button>
            </CardContent>
          </Card>

          {/* Emergency Details */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                <History sx={{ mr: 1, verticalAlign: 'middle' }} />
                Emergency Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Emergency ID"
                    secondary={emergency.emergencyId || emergency._id}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Start Time"
                    secondary={new Date(emergency.startTime).toLocaleString()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Patient Condition"
                    secondary={emergency.patientInfo?.condition || 'Not specified'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="AI Recommendations"
                    secondary={
                      <Chip 
                        label={`${emergency.aiRecommendations?.length || 0} active`}
                        size="small"
                        color="info"
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Real-time Updates Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          📡 Real-time Coordination
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Alert severity="info" icon={<Traffic />}>
              <Typography variant="body2" fontWeight="bold">
                Police Coordination
              </Typography>
              <Typography variant="caption" display="block">
                3 officers assigned to your route
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={4}>
            <Alert severity="success" icon={<LocalHospital />}>
              <Typography variant="body2" fontWeight="bold">
                Hospital Status
              </Typography>
              <Typography variant="caption" display="block">
                Emergency team standing by
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={4}>
            <Alert severity="warning" icon={<Warning />}>
              <Typography variant="body2" fontWeight="bold">
                Traffic Advisory
              </Typography>
              <Typography variant="caption" display="block">
                Heavy traffic ahead - AI rerouting
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      {/* End Emergency Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>End Emergency Confirmation</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Are you sure you want to end this emergency?
            </Typography>
          </Alert>
          <Typography variant="body2" paragraph>
            This will:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="Notify police and hospital" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="Restore normal traffic flow" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="Record emergency completion" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEndEmergency}
            disabled={loading}
          >
            {loading ? 'Ending...' : 'CONFIRM END EMERGENCY'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmergencyView;
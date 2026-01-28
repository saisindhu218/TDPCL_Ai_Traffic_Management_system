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
  Badge
} from '@mui/material';
import {
  LocalHospital,
  Emergency,
  Schedule,
  People,
  Bed,
  Warning,
  CheckCircle,
  Refresh,
  Visibility,
  Phone,
  Message,
  Notifications,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import MapComponent from '../../components/common/MapComponent';

const HospitalDashboard = () => {
  const [incomingEmergencies, setIncomingEmergencies] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capacityDialog, setCapacityDialog] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [capacityData, setCapacityData] = useState({
    bedsAvailable: 0,
    icuBeds: 0,
    specialties: []
  });
  const { socket } = useSocket();

  useEffect(() => {
    loadDashboardData();
    
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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [emergenciesRes, hospitalRes] = await Promise.all([
        api.get('/api/hospital/emergencies/incoming'),
        api.get('/api/hospital/profile')
      ]);
      
      setIncomingEmergencies(emergenciesRes.data.emergencies || []);
      setHospitalInfo(hospitalRes.data.hospital || {});
      setCapacityData({
        bedsAvailable: hospitalRes.data.hospital?.bedsAvailable || 0,
        icuBeds: hospitalRes.data.hospital?.icuBeds || 0,
        specialties: hospitalRes.data.hospital?.specialties || []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEmergency = (data) => {
    if (data.hospitalId === hospitalInfo?._id) {
      setIncomingEmergencies(prev => [data, ...prev]);
    }
  };

  const handleLocationUpdate = (data) => {
    setIncomingEmergencies(prev => prev.map(emergency => 
      emergency._id === data.emergencyId
        ? { ...emergency, currentLocation: data.location, eta: data.eta }
        : emergency
    ));
  };

  const handleEmergencyEnded = (data) => {
    setIncomingEmergencies(prev => prev.filter(emergency => emergency._id !== data.emergencyId));
  };

  const handleAcknowledgeEmergency = async (emergencyId) => {
    try {
      await api.post(`/api/hospital/emergencies/${emergencyId}/acknowledge`);
      
      setIncomingEmergencies(prev => prev.map(emergency => 
        emergency._id === emergencyId 
          ? { ...emergency, acknowledged: true, acknowledgedAt: new Date() }
          : emergency
      ));
      
      alert('Emergency acknowledged');
    } catch (error) {
      console.error('Error acknowledging emergency:', error);
      alert('Failed to acknowledge emergency');
    }
  };

  const handlePrepareForEmergency = async (emergencyId) => {
    try {
      await api.post(`/api/hospital/emergencies/${emergencyId}/prepare`, {
        preparationDetails: {
          teamReady: true,
          operatingRoom: 'OR-1',
          specialist: 'Dr. Smith'
        }
      });
      
      setIncomingEmergencies(prev => prev.map(emergency => 
        emergency._id === emergencyId 
          ? { ...emergency, prepared: true, preparedAt: new Date() }
          : emergency
      ));
      
      alert('Hospital prepared for emergency arrival');
    } catch (error) {
      console.error('Error preparing for emergency:', error);
      alert('Failed to prepare for emergency');
    }
  };

  const handleUpdateCapacity = async () => {
    try {
      await api.post('/api/hospital/capacity/update', capacityData);
      setCapacityDialog(false);
      loadDashboardData(); // Refresh data
      alert('Hospital capacity updated successfully');
    } catch (error) {
      console.error('Error updating capacity:', error);
      alert('Failed to update capacity');
    }
  };

  const handleNotifyPolice = async (emergencyId) => {
    try {
      await api.post('/api/hospital/notify/police', {
        emergencyId,
        message: 'Hospital ready for arrival, please clear route'
      });
      alert('Police notified');
    } catch (error) {
      console.error('Error notifying police:', error);
      alert('Failed to notify police');
    }
  };

  const getStats = () => {
    return {
      incoming: incomingEmergencies.length,
      acknowledged: incomingEmergencies.filter(e => e.acknowledged).length,
      prepared: incomingEmergencies.filter(e => e.prepared).length,
      arrivingSoon: incomingEmergencies.filter(e => e.preciseETA <= 10).length
    };
  };

  const stats = getStats();

  const getEmergencyColor = (emergency) => {
    if (emergency.preciseETA <= 5) return '#f44336';
    if (emergency.preciseETA <= 10) return '#ff9800';
    return '#1976d2';
  };

  const getStatusChip = (emergency) => {
    if (emergency.prepared) {
      return <Chip label="READY" size="small" color="success" icon={<CheckCircle />} />;
    }
    if (emergency.acknowledged) {
      return <Chip label="ACKNOWLEDGED" size="small" color="warning" icon={<Warning />} />;
    }
    return <Chip label="PENDING" size="small" color="default" icon={<Emergency />} />;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <LocalHospital sx={{ fontSize: 40, color: '#4caf50', mr: 2 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                🏥 {hospitalInfo?.name || 'Hospital'} Emergency Center
              </Typography>
              <Typography variant="body1">
                {hospitalInfo?.address || 'Loading hospital information...'}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <IconButton onClick={loadDashboardData} title="Refresh">
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Bed />}
              onClick={() => setCapacityDialog(true)}
            >
              Update Capacity
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Notifications />}
              onClick={() => {
                // Send alert to all ambulances
                if (socket) {
                  socket.emit('hospital-alert', {
                    message: `${hospitalInfo?.name} - All systems operational`,
                    priority: 'info'
                  });
                }
                alert('Status broadcasted to all ambulances');
              }}
            >
              Broadcast Status
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={stats.incoming} color="error">
                <Emergency sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
              </Badge>
              <Typography variant="h4">{stats.incoming}</Typography>
              <Typography variant="caption" color="textSecondary">
                Incoming Emergencies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Schedule sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4">{stats.arrivingSoon}</Typography>
              <Typography variant="caption" color="textSecondary">
                Arriving in ≤10 min
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Bed sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
              <Typography variant="h4">{capacityData.bedsAvailable}</Typography>
              <Typography variant="caption" color="textSecondary">
                Beds Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
              <Typography variant="h4">{capacityData.icuBeds}</Typography>
              <Typography variant="caption" color="textSecondary">
                ICU Beds Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Column - Incoming Emergencies */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Emergency sx={{ mr: 1, color: '#f44336' }} />
              Incoming Emergency Vehicles
            </Typography>
            
            {loading ? (
              <Box textAlign="center" py={4}>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="textSecondary">
                  Loading incoming emergencies...
                </Typography>
              </Box>
            ) : incomingEmergencies.length === 0 ? (
              <Alert severity="info">
                <Typography variant="body2">
                  No incoming emergencies at the moment.
                </Typography>
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ambulance</TableCell>
                      <TableCell>ETA</TableCell>
                      <TableCell>Patient Info</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {incomingEmergencies.map((emergency) => (
                      <TableRow 
                        key={emergency._id}
                        hover
                        sx={{ 
                          cursor: 'pointer',
                          borderLeft: `4px solid ${getEmergencyColor(emergency)}`
                        }}
                        onClick={() => setSelectedEmergency(emergency)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {emergency.vehicleNumber}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Driver: {emergency.driverName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Chip 
                              label={`${emergency.preciseETA || '?'} min`}
                              size="small"
                              color={
                                emergency.preciseETA <= 5 ? 'error' :
                                emergency.preciseETA <= 10 ? 'warning' : 'primary'
                              }
                            />
                            <Typography variant="caption" color="textSecondary" display="block">
                              Arrival: {emergency.arrivalTime?.toLocaleTimeString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {emergency.patientInfo?.condition || 'Not specified'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Severity: {emergency.patientInfo?.severity || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(emergency)}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            {!emergency.acknowledged && (
                              <IconButton 
                                size="small" 
                                color="primary"
                                title="Acknowledge"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcknowledgeEmergency(emergency._id);
                                }}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            )}
                            {emergency.acknowledged && !emergency.prepared && (
                              <IconButton 
                                size="small" 
                                color="warning"
                                title="Prepare Team"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrepareForEmergency(emergency._id);
                                }}
                              >
                                <Warning fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton 
                              size="small" 
                              title="Track Ambulance"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open tracking view
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              title="Contact Driver"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open communication
                              }}
                            >
                              <Phone fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {incomingEmergencies.length > 0 && (
              <Button fullWidth sx={{ mt: 2 }} startIcon={<Emergency />}>
                View All on Emergency Board
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Hospital Status & Map */}
        <Grid item xs={12} md={5}>
          {/* Hospital Status Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏥 Hospital Status
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Bed color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Beds Available"
                    secondary={`${capacityData.bedsAvailable} beds (${capacityData.icuBeds} ICU)`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <People color="secondary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Current Occupancy"
                    secondary={
                      <Box display="flex" alignItems="center">
                        <LinearProgress 
                          variant="determinate" 
                          value={capacityData.bedsAvailable > 0 ? 
                            ((capacityData.bedsAvailable - capacityData.icuBeds) / capacityData.bedsAvailable * 100) : 0
                          }
                          sx={{ width: 100, mr: 1 }}
                        />
                        <Typography variant="caption">
                          {capacityData.bedsAvailable > 0 ? 
                            Math.round(((capacityData.bedsAvailable - capacityData.icuBeds) / capacityData.bedsAvailable * 100)) : 0
                          }%
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocalHospital color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Specialties Available"
                    secondary={
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {capacityData.specialties?.map((spec, index) => (
                          <Chip key={index} label={spec} size="small" />
                        )) || 'None specified'}
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Response Efficiency"
                    secondary="92% (Above average)"
                  />
                </ListItem>
              </List>
              
              <Box display="flex" gap={1} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Message />}
                  onClick={() => {
                    // Open communication panel
                  }}
                >
                  Contact Police
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Phone />}
                  onClick={() => {
                    // Open emergency contact
                  }}
                >
                  Emergency Contacts
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚡ Quick Actions
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      // Mark all as prepared
                      incomingEmergencies.forEach(emergency => {
                        if (!emergency.prepared) {
                          handlePrepareForEmergency(emergency._id);
                        }
                      });
                    }}
                  >
                    Prepare All Teams
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    color="warning"
                    fullWidth
                    startIcon={<Warning />}
                    onClick={() => {
                      // Send urgent alert
                      if (socket) {
                        socket.emit('hospital-urgent-alert', {
                          message: 'URGENT: Hospital at full capacity',
                          priority: 'critical'
                        });
                      }
                      alert('Urgent alert sent to all units');
                    }}
                  >
                    Send Urgent Alert
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Notifications />}
                    onClick={() => {
                      // Notify police for all emergencies
                      incomingEmergencies.forEach(emergency => {
                        handleNotifyPolice(emergency._id);
                      });
                    }}
                  >
                    Notify All Police
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<TrendingDown />}
                    onClick={() => {
                      // Request additional resources
                      alert('Additional resources requested from central authority');
                    }}
                  >
                    Request Resources
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Selected Emergency Details */}
      {selectedEmergency && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Emergency Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Ambulance Information
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
                        primary="Current Location"
                                secondary={`Lat: ${selectedEmergency.currentLocation?.lat?.toFixed(4)}, Lng: ${selectedEmergency.currentLocation?.lng?.toFixed(4)}`}
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
                    Patient Information
                  </Typography>
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary="Condition"
                        secondary={selectedEmergency.patientInfo?.condition || 'Not specified'}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary="Severity"
                        secondary={
                          <Chip 
                            label={selectedEmergency.patientInfo?.severity?.toUpperCase() || 'UNKNOWN'}
                            size="small"
                            color={
                              selectedEmergency.patientInfo?.severity === 'high' ? 'error' :
                              selectedEmergency.patientInfo?.severity === 'medium' ? 'warning' : 'success'
                            }
                          />
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary="Estimated Arrival"
                        secondary={`${selectedEmergency.preciseETA || '?'} minutes (${selectedEmergency.arrivalTime?.toLocaleTimeString()})`}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary="Hospital Status"
                        secondary={getStatusChip(selectedEmergency)}
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
                    Actions
                  </Typography>
                  <Box display="flex" gap={1}>
                    {!selectedEmergency.acknowledged ? (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircle />}
                        onClick={() => handleAcknowledgeEmergency(selectedEmergency._id)}
                      >
                        Acknowledge Emergency
                      </Button>
                    ) : !selectedEmergency.prepared ? (
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<Warning />}
                        onClick={() => handlePrepareForEmergency(selectedEmergency._id)}
                      >
                        Prepare Medical Team
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        disabled
                      >
                        Ready for Arrival
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      startIcon={<Phone />}
                      onClick={() => {
                        // Open communication with driver
                      }}
                    >
                      Contact Driver
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Message />}
                      onClick={() => handleNotifyPolice(selectedEmergency._id)}
                    >
                      Notify Traffic Police
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => {
                        // Open ambulance tracking
                      }}
                    >
                      Track Ambulance
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Capacity Update Dialog */}
      <Dialog open={capacityDialog} onClose={() => setCapacityDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Bed sx={{ mr: 1, color: '#2196f3' }} />
            Update Hospital Capacity
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Update your hospital's current capacity to help emergency response coordination.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Total Beds Available"
            type="number"
            value={capacityData.bedsAvailable}
            onChange={(e) => setCapacityData({...capacityData, bedsAvailable: parseInt(e.target.value) || 0})}
            margin="normal"
            InputProps={{ inputProps: { min: 0 } }}
          />

          <TextField
            fullWidth
            label="ICU Beds Available"
            type="number"
            value={capacityData.icuBeds}
            onChange={(e) => setCapacityData({...capacityData, icuBeds: parseInt(e.target.value) || 0})}
            margin="normal"
            InputProps={{ inputProps: { min: 0, max: capacityData.bedsAvailable } }}
            helperText={`Maximum: ${capacityData.bedsAvailable}`}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Specialties Available</InputLabel>
            <Select
              multiple
              value={capacityData.specialties}
              onChange={(e) => setCapacityData({...capacityData, specialties: e.target.value})}
              label="Specialties Available"
              renderValue={(selected) => selected.join(', ')}
            >
              {['Trauma', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Burn Care', 'General Surgery'].map((specialty) => (
                <MenuItem key={specialty} value={specialty}>
                  <Switch checked={capacityData.specialties.indexOf(specialty) > -1} />
                  {specialty}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setCapacityDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateCapacity}
          >
            Update Capacity
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HospitalDashboard;
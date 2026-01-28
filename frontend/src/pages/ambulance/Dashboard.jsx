import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { EmergencyOn, LocationOn, Navigation, Hospital } from '@mui/icons-material';
import { io } from 'socket.io-client';
import MapComponent from '../../components/common/MapComponent';
import AIVisualization from '../../components/common/AIVisualization';
import api from '../../services/api';

const AmbulanceDashboard = () => {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        },
        (error) => console.error('Error getting location:', error)
      );
    }

    // Load hospitals
    api.get('/api/hospital/list').then(response => {
      setHospitals(response.data);
    });

    // Setup WebSocket
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const handleEmergencyToggle = async () => {
    if (!emergencyMode) {
      // Start emergency
      try {
        const response = await api.post('/api/emergency/start', {
          location: currentLocation,
          hospitalId: selectedHospital || destination
        });
        
        setEmergencyMode(true);
        socket.emit('emergency-alert', {
          type: 'ambulance_emergency_started',
          data: response.data
        });
        
        // Get AI-optimized route
        const routeResponse = await api.post('/api/ai/optimize-route', {
          start: currentLocation,
          end: selectedHospital || destination
        });
        
        setRoute(routeResponse.data);
        setEta(routeResponse.data.estimatedTime);
        
      } catch (error) {
        console.error('Error starting emergency:', error);
      }
    } else {
      // End emergency
      setEmergencyMode(false);
      socket.emit('emergency-alert', {
        type: 'ambulance_emergency_ended'
      });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Emergency Control Panel */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: emergencyMode ? '#ffebee' : 'white' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <EmergencyOn sx={{ fontSize: 40, color: emergencyMode ? 'red' : 'gray', mr: 2 }} />
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Emergency Response System
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {emergencyMode ? 'EMERGENCY ACTIVE - Traffic clearance enabled' : 'System Ready'}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center">
                <Typography sx={{ mr: 2 }}>
                  {emergencyMode ? 'ACTIVE' : 'INACTIVE'}
                </Typography>
                <Switch
                  checked={emergencyMode}
                  onChange={handleEmergencyToggle}
                  color="error"
                  size="large"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Map Section */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '500px' }}>
            <Typography variant="h6" gutterBottom>
              Live Navigation Map
            </Typography>
            <MapComponent
              currentLocation={currentLocation}
              destination={destination}
              route={route}
              emergencyMode={emergencyMode}
            />
          </Paper>
        </Grid>

        {/* Control Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '500px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Mission Control
            </Typography>
            
            <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
              <InputLabel>Select Hospital</InputLabel>
              <Select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                label="Select Hospital"
              >
                {hospitals.map((hospital) => (
                  <MenuItem key={hospital._id} value={hospital._id}>
                    <Box display="flex" alignItems="center">
                      <Hospital sx={{ mr: 1 }} />
                      {hospital.name} - {hospital.distance}km
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {eta && (
              <Card sx={{ mb: 3, bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Estimated Time of Arrival
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {eta} minutes
                  </Typography>
                  <Typography variant="body2">
                    AI-optimized route active
                  </Typography>
                </CardContent>
              </Card>
            )}

            {emergencyMode && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Emergency Active:</strong> All signals on your route are being cleared
              </Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<Navigation />}
              sx={{ mt: 2 }}
              onClick={() => {
                // Recalculate route
                api.post('/api/ai/recalculate-route', {
                  currentLocation,
                  destination: selectedHospital || destination
                }).then(response => {
                  setRoute(response.data);
                });
              }}
            >
              Recalculate Route
            </Button>
          </Paper>
        </Grid>

        {/* AI Visualization */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <AIVisualization
              title="AI Traffic Prediction & Optimization"
              data={route?.aiData}
              emergencyMode={emergencyMode}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AmbulanceDashboard;
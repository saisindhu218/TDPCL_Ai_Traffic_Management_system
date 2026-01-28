import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Place,
  Navigation,
  Traffic,
  Schedule,
  Route as RouteIcon,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Warning,
  LocalHospital
} from '@mui/icons-material';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';

const RouteSelector = ({ currentLocation, onRouteSelect, emergencyMode }) => {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      const response = await api.get('/api/ambulance/hospitals');
      setHospitals(response.data.hospitals);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const calculateRoutes = async () => {
    if (!selectedHospital || !currentLocation) return;

    setLoading(true);
    try {
      const hospital = hospitals.find(h => h._id === selectedHospital);
      if (!hospital) return;

      const response = await api.post('/api/ai/optimize-route', {
        start: currentLocation,
        end: hospital.location,
        emergencyLevel: emergencyMode ? 'high' : 'medium'
      });

      setRoutes(response.data.alternativeRoutes || []);
      
      if (response.data.bestRoute) {
        setSelectedRoute(response.data.bestRoute);
        if (onRouteSelect) {
          onRouteSelect(response.data.bestRoute);
        }
      }

      // Send route to police via WebSocket
      if (socket && emergencyMode) {
        socket.emit('route-selected', {
          route: response.data.bestRoute,
          hospital: hospital.name,
          emergencyMode
        });
      }

    } catch (error) {
      console.error('Error calculating routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalChange = (hospitalId) => {
    setSelectedHospital(hospitalId);
    setRoutes([]);
    setSelectedRoute(null);
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };

  const getRouteColor = (routeType) => {
    switch (routeType) {
      case 'emergency': return '#f44336';
      case 'highway': return '#1976d2';
      case 'city': return '#4caf50';
      case 'balanced': return '#ff9800';
      default: return '#757575';
    }
  };

  const getTrafficColor = (level) => {
    switch (level) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        🗺️ Route Planning & Optimization
      </Typography>

      <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
        <InputLabel>Select Hospital Destination</InputLabel>
        <Select
          value={selectedHospital}
          onChange={(e) => handleHospitalChange(e.target.value)}
          label="Select Hospital Destination"
        >
          {hospitals.map((hospital) => (
            <MenuItem key={hospital._id} value={hospital._id}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {hospital.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {hospital.address}
                  </Typography>
                </Box>
                <Chip 
                  label={`${hospital.distance || '?'} km`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedHospital && (
        <Button
          variant="contained"
          fullWidth
          onClick={calculateRoutes}
          disabled={loading}
          startIcon={<Navigation />}
          sx={{ mb: 3 }}
        >
          {loading ? 'AI Calculating Routes...' : 'Calculate AI-Optimized Routes'}
        </Button>
      )}

      {loading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            AI Route Optimization in Progress...
          </Typography>
          <LinearProgress />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Analyzing traffic patterns, signals, and road conditions
          </Typography>
        </Box>
      )}

      {selectedRoute && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          icon={<CheckCircle />}
        >
          <Typography variant="body2" fontWeight="bold">
            ✅ AI Recommended Route Selected
          </Typography>
          <Typography variant="caption" display="block">
            {selectedRoute.name} • Score: {selectedRoute.score}%
          </Typography>
        </Alert>
      )}

      {routes.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Alternative Routes ({routes.length})
          </Typography>
          
          <List>
            {routes.map((route, index) => (
              <React.Fragment key={route.id}>
                <Card 
                  variant="outlined"
                  sx={{
                    mb: 2,
                    borderColor: getRouteColor(route.type),
                    bgcolor: selectedRoute?.id === route.id ? 'action.selected' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleRouteSelect(route)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <RouteIcon sx={{ color: getRouteColor(route.type), mr: 1 }} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {route.name}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                            <Chip 
                              label={`${route.estimatedTime} min`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip 
                              label={`${route.distance} km`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                            <Chip 
                              label={route.trafficLevel}
                              size="small"
                              sx={{ color: getTrafficColor(route.trafficLevel), borderColor: getTrafficColor(route.trafficLevel) }}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box display="flex" alignItems="center">
                        <Chip 
                          label={`AI Score: ${route.score}%`}
                          size="small"
                          color={route.score > 80 ? 'success' : route.score > 60 ? 'warning' : 'error'}
                          sx={{ mr: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRoute(expandedRoute === index ? null : index);
                          }}
                        >
                          {expandedRoute === index ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={expandedRoute === index}>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                          Route Details:
                        </Typography>
                        <List dense>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Traffic fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Traffic Signals"
                              secondary={`${route.signals} signals on route`}
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Navigation fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Turns"
                              secondary={`${route.turns} major turns`}
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Schedule fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Priority"
                              secondary={route.priority}
                            />
                          </ListItem>
                        </List>

                        {route.aiFactors && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                              AI Analysis Factors:
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {route.aiFactors.map((factor, idx) => (
                                <Chip
                                  key={idx}
                                  label={factor}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {emergencyMode && route.type === 'emergency' && (
                          <Alert severity="info" sx={{ mt: 2 }} icon={<Warning />}>
                            <Typography variant="caption">
                              This route is optimized for emergency clearance. All signals will be prioritized.
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {selectedRoute && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            📊 Selected Route Summary
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {selectedRoute.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ETA: {selectedRoute.estimatedTime} min • Distance: {selectedRoute.distance} km
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LocalHospital />}
              onClick={() => {
                // Recalculate route
                calculateRoutes();
              }}
            >
              Recalculate
            </Button>
          </Box>
        </Box>
      )}

      {!selectedHospital && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Select a hospital destination to calculate AI-optimized routes.
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default RouteSelector;
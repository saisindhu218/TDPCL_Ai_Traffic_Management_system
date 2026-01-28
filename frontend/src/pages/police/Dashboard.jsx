import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Box
} from '@mui/material';
import { Traffic, Warning, CheckCircle, ClearAll } from '@mui/icons-material';
import { io } from 'socket.io-client';
import api from '../../services/api';

const PoliceDashboard = () => {
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [signals, setSignals] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Load initial data
    loadEmergencies();
    loadSignals();

    // Setup WebSocket
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('ambulance-update', (data) => {
      updateEmergencyData(data);
    });

    newSocket.on('emergency-broadcast', (data) => {
      if (data.type === 'ambulance_emergency_started') {
        setActiveEmergencies(prev => [...prev, data.data]);
      }
    });

    return () => newSocket.close();
  }, []);

  const loadEmergencies = async () => {
    const response = await api.get('/api/emergency/active');
    setActiveEmergencies(response.data);
  };

  const loadSignals = async () => {
    const response = await api.get('/api/traffic/signals');
    setSignals(response.data);
  };

  const updateEmergencyData = (data) => {
    setActiveEmergencies(prev => 
      prev.map(emergency => 
        emergency._id === data.emergencyId ? { ...emergency, ...data } : emergency
      )
    );
  };

  const handleClearSignal = async (signalId) => {
    try {
      await api.post('/api/traffic/clear-signal', { signalId });
      socket.emit('signal-clearance', {
        signalId,
        cleared: true,
        timestamp: new Date()
      });
      
      // Update local state
      setSignals(prev => 
        prev.map(signal => 
          signal._id === signalId 
            ? { ...signal, status: 'cleared', lastCleared: new Date() }
            : signal
        )
      );
    } catch (error) {
      console.error('Error clearing signal:', error);
    }
  };

  const handleReportCongestion = async (signalId, level) => {
    await api.post('/api/traffic/report-congestion', {
      signalId,
      level,
      reporter: 'police'
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: '#e3f2fd' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <Traffic sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Traffic Control Center
                  </Typography>
                  <Typography variant="body1">
                    Monitor and manage emergency vehicle clearance
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label={`${activeEmergencies.length} Active Emergencies`}
                color="error"
                icon={<Warning />}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Active Emergencies */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              🚑 Active Emergency Vehicles
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>ETA</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeEmergencies.map((emergency) => (
                    <TableRow key={emergency._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {emergency.vehicleNumber}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {emergency.driverName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{emergency.hospitalName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${emergency.eta} min`}
                          color={emergency.eta < 10 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          View Route
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={emergency.status.toUpperCase()}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary"
                          onClick={() => handleClearSignal(emergency.currentSignal)}
                        >
                          <CheckCircle />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Traffic Signals */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              🚦 Traffic Signals
            </Typography>
            <Grid container spacing={2}>
              {signals.map((signal) => (
                <Grid item xs={12} key={signal._id}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      borderColor: signal.congestionLevel === 'high' ? 'error.main' : 
                                 signal.congestionLevel === 'medium' ? 'warning.main' : 'success.main'
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Signal {signal.signalId}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {signal.location}
                          </Typography>
                        </Box>
                        <Chip 
                          label={signal.congestionLevel.toUpperCase()}
                          color={
                            signal.congestionLevel === 'high' ? 'error' :
                            signal.congestionLevel === 'medium' ? 'warning' : 'success'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Clearance Status:
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={signal.clearanceProgress || 0}
                          sx={{ mb: 1 }}
                        />
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between" sx={{ mt: 2 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleClearSignal(signal._id)}
                        >
                          Clear
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => handleReportCongestion(signal._id, 'high')}
                        >
                          Report Congestion
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* AI Recommendations */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              🤖 AI-Powered Recommendations
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#f3e5f5' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Predictive Alert
                    </Typography>
                    <Typography variant="h6">
                      Next congestion zone in 8 minutes
                    </Typography>
                    <Typography variant="body2">
                      Signal #45 on Main Street
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Optimization Score
                    </Typography>
                    <Typography variant="h6">
                      94% Efficiency
                    </Typography>
                    <Typography variant="body2">
                      Current clearance operations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Time Saved
                    </Typography>
                    <Typography variant="h6">
                      12.5 minutes
                    </Typography>
                    <Typography variant="body2">
                      Across all active emergencies
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PoliceDashboard;
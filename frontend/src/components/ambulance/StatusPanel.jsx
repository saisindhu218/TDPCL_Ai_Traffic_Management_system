import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  Button
} from '@mui/material';
import {
  LocationOn,
  Speed,
  Schedule,
  Traffic,
  CheckCircle,
  Warning,
  Error,
  Refresh,
  Notifications,
  Navigation,
  LocalHospital
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const StatusPanel = ({ emergencyMode, currentLocation, route, hospital }) => {
  const [status, setStatus] = useState({
    connection: 'connected',
    gps: 'active',
    ai: 'optimizing',
    signals: 0,
    lastUpdate: new Date()
  });
  const [signals, setSignals] = useState([]);
  const [eta, setEta] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (emergencyMode && socket) {
      // Listen for signal updates
      socket.on('signal-cleared', (data) => {
        updateSignalStatus(data);
      });

      // Listen for congestion updates
      socket.on('congestion-reported', (data) => {
        updateCongestion(data);
      });

      return () => {
        socket.off('signal-cleared');
        socket.off('congestion-reported');
      };
    }
  }, [emergencyMode, socket]);

  useEffect(() => {
    if (route && currentLocation && hospital) {
      calculateETA();
      loadSignalStatus();
    }
  }, [route, currentLocation, hospital]);

  const calculateETA = () => {
    if (!route || !route.estimatedTime) return;
    
    const now = new Date();
    const arrival = new Date(now.getTime() + route.estimatedTime * 60000);
    
    setEta({
      minutes: route.estimatedTime,
      arrivalTime: arrival,
      formatted: `${route.estimatedTime} min`,
      arrivalFormatted: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  const loadSignalStatus = async () => {
    try {
      const response = await api.get('/api/ambulance/signal/status');
      setSignals(response.data.signals || []);
    } catch (error) {
      console.error('Error loading signal status:', error);
    }
  };

  const updateSignalStatus = (data) => {
    setSignals(prev => {
      const updated = prev.map(signal => 
        signal.signalId === data.signalId 
          ? { ...signal, status: 'cleared', clearedAt: data.timestamp }
          : signal
      );
      return updated;
    });

    setStatus(prev => ({
      ...prev,
      signals: prev.signals + 1,
      lastUpdate: new Date()
    }));
  };

  const updateCongestion = (data) => {
    // Update signals with congestion info
    setSignals(prev => {
      const updated = prev.map(signal => 
        signal.signalId === data.signalId 
          ? { ...signal, congestion: data.level, cause: data.cause }
          : signal
      );
      return updated;
    });
  };

  const refreshStatus = async () => {
    setStatus(prev => ({ ...prev, lastUpdate: new Date() }));
    await loadSignalStatus();
    calculateETA();
  };

  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'connected':
      case 'active':
      case 'cleared':
        return '#4caf50';
      case 'warning':
      case 'optimizing':
        return '#ff9800';
      case 'error':
      case 'blocked':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'connected':
      case 'active':
      case 'cleared':
        return <CheckCircle />;
      case 'warning':
      case 'optimizing':
        return <Warning />;
      case 'error':
      case 'blocked':
        return <Error />;
      default:
        return <Notifications />;
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          🚨 Emergency Status Panel
        </Typography>
        <Tooltip title="Refresh Status">
          <IconButton onClick={refreshStatus} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* System Status Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <LocationOn sx={{ fontSize: 30, color: getStatusColor(status.gps), mb: 1 }} />
              <Typography variant="caption" color="textSecondary" display="block">
                GPS Status
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {status.gps.toUpperCase()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Speed sx={{ fontSize: 30, color: getStatusColor(status.ai), mb: 1 }} />
              <Typography variant="caption" color="textSecondary" display="block">
                AI Engine
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {status.ai.toUpperCase()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Traffic sx={{ fontSize: 30, color: getStatusColor('connected'), mb: 1 }} />
              <Typography variant="caption" color="textSecondary" display="block">
                Signals Cleared
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {status.signals}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Schedule sx={{ fontSize: 30, color: getStatusColor('connected'), mb: 1 }} />
              <Typography variant="caption" color="textSecondary" display="block">
                Connection
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {status.connection.toUpperCase()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ETA Information */}
      {eta && (
        <Alert 
          severity="info" 
          icon={<Schedule />}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" startIcon={<LocalHospital />}>
              Notify Hospital
            </Button>
          }
        >
          <Typography variant="body2" fontWeight="bold">
            Estimated Time of Arrival: {eta.formatted}
          </Typography>
          <Typography variant="caption" display="block">
            Arrival at {eta.arrivalFormatted} • AI-optimized route active
          </Typography>
        </Alert>
      )}

      {/* Signal Clearance Progress */}
      {emergencyMode && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Signal Clearance Progress
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(status.signals / 10) * 100}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="textSecondary">
              {status.signals} of 10 signals cleared
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {Math.round((status.signals / 10) * 100)}% Complete
            </Typography>
          </Box>
        </Box>
      )}

      {/* Signal List */}
      {signals.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Traffic Signal Status
          </Typography>
          <List dense>
            {signals.slice(0, 5).map((signal) => (
              <ListItem key={signal.signalId} sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getStatusIcon(signal.status)}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        Signal {signal.signalId}
                      </Typography>
                      <Chip 
                        label={signal.status}
                        size="small"
                        sx={{ 
                          color: getStatusColor(signal.status),
                          borderColor: getStatusColor(signal.status)
                        }}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {signal.location} • {signal.congestion ? `Congestion: ${signal.congestion}` : 'Clear'}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          {signals.length > 5 && (
            <Button size="small" fullWidth sx={{ mt: 1 }}>
              View all {signals.length} signals
            </Button>
          )}
        </Box>
      )}

      {/* Emergency Mode Actions */}
      {emergencyMode && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Emergency Actions
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<Notifications />}
              >
                Alert Police
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<LocalHospital />}
              >
                Update Hospital
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<Navigation />}
              >
                Recalculate Route
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<Traffic />}
              >
                Request Clearance
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Last Update */}
      <Typography variant="caption" color="textSecondary" sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
        Last updated: {status.lastUpdate.toLocaleTimeString()}
      </Typography>
    </Paper>
  );
};

export default StatusPanel;
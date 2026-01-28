import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Traffic,
  CheckCircle,
  Warning,
  Error,
  ClearAll,
  Report,
  Timer,
  Directions,
  Refresh,
  Info,
  Image,
  Send
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const SignalControl = () => {
  const [signals, setSignals] = useState([]);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [clearanceDuration, setClearanceDuration] = useState(120);
  const [loading, setLoading] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [reportData, setReportData] = useState({
    level: 'medium',
    cause: 'accident',
    description: '',
    imageUrl: ''
  });
  const { socket, emitSignalClearance } = useSocket();

  useEffect(() => {
    loadSignals();
    
    if (socket) {
      socket.on('signal-clearance-request', handleClearanceRequest);
      socket.on('emergency-started', handleEmergencyStarted);
      
      return () => {
        socket.off('signal-clearance-request');
        socket.off('emergency-started');
      };
    }
  }, [socket]);

  const loadSignals = async () => {
    try {
      const response = await api.get('/api/police/signals');
      setSignals(response.data.signals || []);
    } catch (error) {
      console.error('Error loading signals:', error);
    }
  };

  const handleClearanceRequest = (data) => {
    // Highlight the signal that needs clearance
    setSignals(prev => prev.map(signal => 
      signal.signalId === data.signalId 
        ? { ...signal, needsClearance: true, emergencyId: data.emergencyId }
        : signal
    ));
    
    // Auto-select the signal
    setSelectedSignal(data.signalId);
  };

  const handleEmergencyStarted = (data) => {
    // Update all signals along the emergency route
    setSignals(prev => prev.map(signal => ({
      ...signal,
      isPriority: true,
      status: 'pending-clearance'
    })));
  };

  const handleClearSignal = async (signalId) => {
    setLoading(true);
    try {
      const response = await api.post(`/api/police/signals/${signalId}/clear`, {
        duration: clearanceDuration
      });

      // Update local state
      setSignals(prev => prev.map(signal => 
        signal.signalId === signalId 
          ? { ...signal, status: 'cleared', clearedAt: new Date() }
          : signal
      ));

      // Broadcast via WebSocket
      emitSignalClearance({
        signalId,
        duration: clearanceDuration,
        timestamp: new Date()
      });

      alert(`Signal ${signalId} cleared successfully`);

    } catch (error) {
      console.error('Error clearing signal:', error);
      alert('Failed to clear signal');
    } finally {
      setLoading(false);
    }
  };

  const handleReportCongestion = async () => {
    if (!selectedSignal) {
      alert('Please select a signal first');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/police/congestion/report', {
        signalId: selectedSignal,
        ...reportData
      });

      // Update local state
      setSignals(prev => prev.map(signal => 
        signal.signalId === selectedSignal 
          ? { ...signal, congestion: reportData.level, cause: reportData.cause }
          : signal
      ));

      setReportDialog(false);
      setReportData({
        level: 'medium',
        cause: 'accident',
        description: '',
        imageUrl: ''
      });

      alert('Congestion reported successfully');

    } catch (error) {
      console.error('Error reporting congestion:', error);
      alert('Failed to report congestion');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllSignals = async () => {
    if (!window.confirm('Clear all signals? This will affect normal traffic flow.')) {
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal) => {
    if (signal.status === 'cleared') return '#4caf50';
    if (signal.needsClearance) return '#f44336';
    if (signal.congestionLevel === 'high') return '#ff9800';
    if (signal.isPriority) return '#2196f3';
    return '#757575';
  };

  const getSignalIcon = (signal) => {
    if (signal.status === 'cleared') return <CheckCircle />;
    if (signal.needsClearance) return <Error />;
    if (signal.congestionLevel === 'high') return <Warning />;
    return <Traffic />;
  };

  const getSignalStatusText = (signal) => {
    if (signal.status === 'cleared') return 'Cleared';
    if (signal.needsClearance) return 'Clearance Requested';
    if (signal.congestionLevel === 'high') return 'High Congestion';
    if (signal.isPriority) return 'Priority Route';
    return 'Normal';
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          🚦 Traffic Signal Control Center
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Signals">
            <IconButton onClick={loadSignals} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="error"
            startIcon={<ClearAll />}
            onClick={handleClearAllSignals}
            disabled={loading}
            size="small"
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {/* Control Panel */}
      <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Signal</InputLabel>
                <Select
                  value={selectedSignal || ''}
                  onChange={(e) => setSelectedSignal(e.target.value)}
                  label="Select Signal"
                >
                  {signals.map((signal) => (
                    <MenuItem key={signal.signalId} value={signal.signalId}>
                      <Box display="flex" alignItems="center">
                        {getSignalIcon(signal)}
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="body2">
                            Signal {signal.signalId}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {signal.location?.address}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                  Clearance Duration: {clearanceDuration} seconds
                </Typography>
                <Slider
                  value={clearanceDuration}
                  onChange={(e, value) => setClearanceDuration(value)}
                  min={30}
                  max={300}
                  step={30}
                  marks={[
                    { value: 30, label: '30s' },
                    { value: 120, label: '2m' },
                    { value: 300, label: '5m' }
                  ]}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckCircle />}
                  onClick={() => selectedSignal && handleClearSignal(selectedSignal)}
                  disabled={!selectedSignal || loading}
                >
                  Clear Signal
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Report />}
                  onClick={() => setReportDialog(true)}
                  disabled={!selectedSignal}
                >
                  Report
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Signal Grid */}
      <Typography variant="subtitle1" gutterBottom>
        Active Signals ({signals.length})
      </Typography>
      
      <Grid container spacing={2}>
        {signals.map((signal) => (
          <Grid item xs={12} sm={6} md={4} key={signal.signalId}>
            <Card 
              variant="outlined"
              sx={{
                borderColor: getSignalColor(signal),
                cursor: 'pointer',
                bgcolor: selectedSignal === signal.signalId ? 'action.selected' : 'transparent',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
              onClick={() => setSelectedSignal(signal.signalId)}
            >
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center">
                    {getSignalIcon(signal)}
                    <Typography variant="subtitle2" fontWeight="medium" sx={{ ml: 1 }}>
                      Signal {signal.signalId}
                    </Typography>
                  </Box>
                  <Chip 
                    label={getSignalStatusText(signal)}
                    size="small"
                    sx={{ 
                      color: getSignalColor(signal),
                      borderColor: getSignalColor(signal)
                    }}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                  {signal.location?.address}
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Chip 
                    label={signal.congestionLevel || 'Normal'}
                    size="small"
                    color={
                      signal.congestionLevel === 'high' ? 'error' :
                      signal.congestionLevel === 'medium' ? 'warning' : 'default'
                    }
                  />
                  
                  {signal.clearedAt && (
                    <Tooltip title={`Cleared at ${new Date(signal.clearedAt).toLocaleTimeString()}`}>
                      <Chip 
                        icon={<Timer />}
                        label={`${Math.floor((Date.now() - new Date(signal.clearedAt).getTime()) / 60000)}m ago`}
                        size="small"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                </Box>

                {signal.needsClearance && (
                  <Alert severity="error" sx={{ mt: 1, p: 1 }} icon={<Warning />}>
                    <Typography variant="caption">
                      Clearance requested for emergency vehicle
                    </Typography>
                  </Alert>
                )}

                <Box display="flex" gap={1} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<Directions />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show directions to signal
                    }}
                  >
                    Directions
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<Info />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show signal details
                    }}
                  >
                    Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Statistics */}
      {signals.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Signal Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {signals.filter(s => s.status === 'cleared').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Cleared
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">
                  {signals.filter(s => s.needsClearance).length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Pending
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">
                  {signals.filter(s => s.congestionLevel === 'high').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Congested
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="info.main">
                  {signals.filter(s => s.isPriority).length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Priority
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Congestion Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Report sx={{ mr: 1, color: '#ff9800' }} />
            Report Congestion
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Reporting congestion helps AI optimize traffic flow and emergency response.
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Congestion Level</InputLabel>
            <Select
              value={reportData.level}
              onChange={(e) => setReportData({...reportData, level: e.target.value})}
              label="Congestion Level"
            >
              <MenuItem value="low">Low - Slow traffic</MenuItem>
              <MenuItem value="medium">Medium - Heavy traffic</MenuItem>
              <MenuItem value="high">High - Gridlock/Standstill</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Cause</InputLabel>
            <Select
              value={reportData.cause}
              onChange={(e) => setReportData({...reportData, cause: e.target.value})}
              label="Cause"
            >
              <MenuItem value="accident">Accident</MenuItem>
              <MenuItem value="construction">Road Construction</MenuItem>
              <MenuItem value="event">Public Event</MenuItem>
              <MenuItem value="weather">Bad Weather</MenuItem>
              <MenuItem value="normal">Normal Traffic</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Description"
            value={reportData.description}
            onChange={(e) => setReportData({...reportData, description: e.target.value})}
            margin="normal"
            multiline
            rows={2}
            placeholder="Describe the congestion situation..."
          />

          <TextField
            fullWidth
            label="Image URL (Optional)"
            value={reportData.imageUrl}
            onChange={(e) => setReportData({...reportData, imageUrl: e.target.value})}
            margin="normal"
            placeholder="https://example.com/congestion-image.jpg"
            InputProps={{
              startAdornment: <Image sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReportCongestion}
            disabled={loading}
            startIcon={<Send />}
          >
            {loading ? 'Reporting...' : 'Submit Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SignalControl;
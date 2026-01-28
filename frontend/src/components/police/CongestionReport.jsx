import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
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
  Badge
} from '@mui/material';
import {
  Traffic,
  Warning,
  Report,
  Image,
  CheckCircle,
  ClearAll,
  Refresh,
  Visibility,
  Timeline,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  FilterList
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const CongestionReport = () => {
  const [congestions, setCongestions] = useState([]);
  const [filteredCongestions, setFilteredCongestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedCongestion, setSelectedCongestion] = useState(null);
  const [filters, setFilters] = useState({
    level: 'all',
    resolved: 'all',
    cause: 'all'
  });
  const [reportData, setReportData] = useState({
    signalId: '',
    level: 'medium',
    cause: 'accident',
    description: '',
    imageUrl: ''
  });
  const { socket } = useSocket();

  useEffect(() => {
    loadCongestions();
    
    if (socket) {
      socket.on('congestion-reported', handleNewCongestion);
      socket.on('signal-cleared', handleSignalCleared);
      
      return () => {
        socket.off('congestion-reported');
        socket.off('signal-cleared');
      };
    }
  }, [socket]);

  useEffect(() => {
    applyFilters();
  }, [congestions, filters]);

  const loadCongestions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/police/congestion/active');
      setCongestions(response.data.congestions || []);
    } catch (error) {
      console.error('Error loading congestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCongestion = (data) => {
    setCongestions(prev => [{
      ...data,
      id: Date.now(),
      timestamp: new Date(),
      resolved: false
    }, ...prev]);
  };

  const handleSignalCleared = (data) => {
    // Mark congestion as resolved for cleared signals
    setCongestions(prev => prev.map(congestion => 
      congestion.signalId === data.signalId 
        ? { ...congestion, resolved: true, resolvedAt: new Date() }
        : congestion
    ));
  };

  const applyFilters = () => {
    let filtered = [...congestions];

    if (filters.level !== 'all') {
      filtered = filtered.filter(c => c.level === filters.level);
    }

    if (filters.resolved !== 'all') {
      const resolved = filters.resolved === 'resolved';
      filtered = filtered.filter(c => c.resolved === resolved);
    }

    if (filters.cause !== 'all') {
      filtered = filtered.filter(c => c.cause === filters.cause);
    }

    setFilteredCongestions(filtered);
  };

  const handleReportCongestion = async () => {
    if (!reportData.signalId) {
      alert('Please select a signal');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/police/congestion/report', reportData);

      setReportDialog(false);
      setReportData({
        signalId: '',
        level: 'medium',
        cause: 'accident',
        description: '',
        imageUrl: ''
      });

      loadCongestions(); // Refresh the list
      alert('Congestion reported successfully');

    } catch (error) {
      console.error('Error reporting congestion:', error);
      alert('Failed to report congestion');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveCongestion = async (congestionId) => {
    try {
      await api.post(`/api/police/congestion/${congestionId}/resolve`);
      
      // Update local state
      setCongestions(prev => prev.map(congestion => 
        congestion._id === congestionId 
          ? { ...congestion, resolved: true, resolvedAt: new Date() }
          : congestion
      ));
      
      alert('Congestion marked as resolved');
    } catch (error) {
      console.error('Error resolving congestion:', error);
      alert('Failed to resolve congestion');
    }
  };

  const handleViewDetails = (congestion) => {
    setSelectedCongestion(congestion);
    setDetailDialog(true);
  };

  const getCongestionColor = (level) => {
    switch (level) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="error" />;
      case 'decreasing': return <TrendingDown color="success" />;
      default: return <TrendingFlat color="info" />;
    }
  };

  const getCauseIcon = (cause) => {
    switch (cause) {
      case 'accident': return <Warning color="error" />;
      case 'construction': return <Traffic color="warning" />;
      case 'event': return <Report color="info" />;
      case 'weather': return <Image color="primary" />;
      default: return <Report />;
    }
  };

  const calculateStatistics = () => {
    const total = congestions.length;
    const resolved = congestions.filter(c => c.resolved).length;
    const unresolved = total - resolved;
    
    const byLevel = {
      high: congestions.filter(c => c.level === 'high').length,
      medium: congestions.filter(c => c.level === 'medium').length,
      low: congestions.filter(c => c.level === 'low').length
    };

    const byCause = congestions.reduce((acc, c) => {
      acc[c.cause] = (acc[c.cause] || 0) + 1;
      return acc;
    }, {});

    return { total, resolved, unresolved, byLevel, byCause };
  };

  const stats = calculateStatistics();

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          📊 Congestion Monitoring & Reporting
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadCongestions} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Report />}
            onClick={() => setReportDialog(true)}
          >
            Report Congestion
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" color="textPrimary">
                {stats.total}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Total Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" color="success.main">
                {stats.resolved}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Resolved
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" color="error.main">
                {stats.unresolved}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" color="warning.main">
                {stats.byLevel.high || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                High Congestion
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
              <InputLabel>Congestion Level</InputLabel>
              <Select
                value={filters.level}
                onChange={(e) => setFilters({...filters, level: e.target.value})}
                label="Congestion Level"
              >
                <MenuItem value="all">All Levels</MenuItem>
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
                value={filters.resolved}
                onChange={(e) => setFilters({...filters, resolved: e.target.value})}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="unresolved">Unresolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Cause</InputLabel>
              <Select
                value={filters.cause}
                onChange={(e) => setFilters({...filters, cause: e.target.value})}
                label="Cause"
              >
                <MenuItem value="all">All Causes</MenuItem>
                <MenuItem value="accident">Accident</MenuItem>
                <MenuItem value="construction">Construction</MenuItem>
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="weather">Weather</MenuItem>
                <MenuItem value="normal">Normal Traffic</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ClearAll />}
              onClick={() => setFilters({
                level: 'all',
                resolved: 'all',
                cause: 'all'
              })}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Congestion Table */}
      {loading ? (
        <Box textAlign="center" py={4}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Loading congestion data...
          </Typography>
        </Box>
      ) : filteredCongestions.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body2">
            No congestion reports match your filters.
          </Typography>
        </Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Signal ID</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Cause</TableCell>
                <TableCell>Reported</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCongestions.slice(0, 10).map((congestion) => (
                <TableRow key={congestion._id || congestion.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {congestion.signalId}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {congestion.location?.address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={congestion.level.toUpperCase()}
                      size="small"
                      sx={{ 
                        color: getCongestionColor(congestion.level),
                        borderColor: getCongestionColor(congestion.level)
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getCauseIcon(congestion.cause)}
                      <Typography variant="body2">
                        {congestion.cause}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(congestion.timestamp).toLocaleTimeString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {congestion.reporter}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={congestion.resolved ? "success" : "error"}
                      variant="dot"
                      sx={{ mr: 1 }}
                    >
                      <Chip 
                        label={congestion.resolved ? "RESOLVED" : "ACTIVE"}
                        size="small"
                        color={congestion.resolved ? "success" : "error"}
                      />
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(congestion)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!congestion.resolved && (
                        <Tooltip title="Mark as Resolved">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleResolveCongestion(congestion._id)}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Trend Analysis */}
      {congestions.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              📈 Congestion Trend Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                  {getTrendIcon('increasing')}
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2">High Congestion</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stats.byLevel.high} reports
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                  {getTrendIcon('decreasing')}
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2">Resolution Rate</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                  <Timeline color="primary" />
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2">Avg. Resolution Time</Typography>
                    <Typography variant="caption" color="textSecondary">
                      45 minutes
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Report Congestion Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Report sx={{ mr: 1, color: '#ff9800' }} />
            Report New Congestion
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Accurate congestion reporting helps optimize emergency response routes.
          </Alert>

          <TextField
            fullWidth
            label="Signal ID"
            value={reportData.signalId}
            onChange={(e) => setReportData({...reportData, signalId: e.target.value})}
            margin="normal"
            required
            placeholder="e.g., TS001"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Congestion Level</InputLabel>
            <Select
              value={reportData.level}
              onChange={(e) => setReportData({...reportData, level: e.target.value})}
              label="Congestion Level"
            >
              <MenuItem value="low">Low - Slow moving traffic</MenuItem>
              <MenuItem value="medium">Medium - Heavy traffic, delays</MenuItem>
              <MenuItem value="high">High - Gridlock/Standstill</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Cause</InputLabel>
            <Select
              value={reportData.cause}
              onChange={(e) => setReportData({...reportData, cause: e.target.value})}
              label="Cause"
            >
              <MenuItem value="accident">Accident/Collision</MenuItem>
              <MenuItem value="construction">Road Construction</MenuItem>
              <MenuItem value="event">Public Event/Celebration</MenuItem>
              <MenuItem value="weather">Bad Weather Conditions</MenuItem>
              <MenuItem value="normal">Normal Peak Traffic</MenuItem>
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
            rows={3}
            placeholder="Describe the congestion situation in detail..."
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
            disabled={loading || !reportData.signalId}
            startIcon={<Report />}
          >
            {loading ? 'Reporting...' : 'Submit Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Congestion Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        {selectedCongestion && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Traffic sx={{ mr: 1, color: getCongestionColor(selectedCongestion.level) }} />
                Congestion Details - Signal {selectedCongestion.signalId}
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Report Information
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Signal ID"
                            secondary={selectedCongestion.signalId}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Location"
                            secondary={selectedCongestion.location?.address || 'N/A'}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Reported By"
                            secondary={selectedCongestion.reporter || 'Police Officer'}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Reported At"
                            secondary={new Date(selectedCongestion.timestamp).toLocaleString()}
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
                        Congestion Details
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Level"
                            secondary={
                              <Chip 
                                label={selectedCongestion.level.toUpperCase()}
                                size="small"
                                sx={{ 
                                  color: getCongestionColor(selectedCongestion.level),
                                  borderColor: getCongestionColor(selectedCongestion.level)
                                }}
                                variant="outlined"
                              />
                            }
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Cause"
                            secondary={selectedCongestion.cause}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Description"
                            secondary={selectedCongestion.description || 'No description provided'}
                          />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Status"
                            secondary={
                              <Chip 
                                label={selectedCongestion.resolved ? "RESOLVED" : "ACTIVE"}
                                size="small"
                                color={selectedCongestion.resolved ? "success" : "error"}
                              />
                            }
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedCongestion.imageUrl && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Uploaded Image
                        </Typography>
                        <Box 
                          component="img"
                          src={selectedCongestion.imageUrl}
                          alt="Congestion"
                          sx={{ 
                            width: '100%', 
                            maxHeight: 300,
                            objectFit: 'cover',
                            borderRadius: 1
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {!selectedCongestion.resolved && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      <Typography variant="body2" fontWeight="bold">
                        This congestion is affecting emergency response times.
                      </Typography>
                      <Typography variant="caption" display="block">
                        Consider clearing the signal or diverting traffic.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailDialog(false)}>Close</Button>
              {!selectedCongestion.resolved && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => {
                    handleResolveCongestion(selectedCongestion._id);
                    setDetailDialog(false);
                  }}
                >
                  Mark as Resolved
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={<Traffic />}
                onClick={() => {
                  // Navigate to signal control
                  setDetailDialog(false);
                }}
              >
                Go to Signal Control
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default CongestionReport;
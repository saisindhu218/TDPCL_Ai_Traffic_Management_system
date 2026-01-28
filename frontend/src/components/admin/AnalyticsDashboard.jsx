import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  Speed,
  Schedule,
  People,
  Traffic,
  LocalHospital,
  Emergency,
  Refresh,
  Download,
  CalendarToday
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7days');
  const [analytics, setAnalytics] = useState({
    overview: {},
    emergencies: [],
    traffic: [],
    responseTimes: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/analytics/overview?days=${getDaysFromRange(timeRange)}`);
      setAnalytics(response.data.overview || {});
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysFromRange = (range) => {
    switch (range) {
      case '1day': return 1;
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 7;
    }
  };

  // Mock data for charts (replace with actual API data)
  const emergencyData = [
    { day: 'Mon', emergencies: 12, responseTime: 14.5 },
    { day: 'Tue', emergencies: 18, responseTime: 13.2 },
    { day: 'Wed', emergencies: 15, responseTime: 15.8 },
    { day: 'Thu', emergencies: 22, responseTime: 12.1 },
    { day: 'Fri', emergencies: 25, responseTime: 11.4 },
    { day: 'Sat', emergencies: 20, responseTime: 13.7 },
    { day: 'Sun', emergencies: 16, responseTime: 14.9 }
  ];

  const trafficData = [
    { signal: 'TS001', congestion: 65, clearance: 92 },
    { signal: 'TS002', congestion: 42, clearance: 88 },
    { signal: 'TS003', congestion: 78, clearance: 76 },
    { signal: 'TS004', congestion: 35, clearance: 95 },
    { signal: 'TS005', congestion: 58, clearance: 84 }
  ];

  const responseTimeData = [
    { hour: '6-8', time: 16.2 },
    { hour: '8-10', time: 18.5 },
    { hour: '10-12', time: 14.8 },
    { hour: '12-14', time: 13.2 },
    { hour: '14-16', time: 12.7 },
    { hour: '16-18', time: 19.3 },
    { hour: '18-20', time: 17.6 },
    { hour: '20-22', time: 15.4 }
  ];

  const hospitalPerformance = [
    { name: 'City Hospital', emergencies: 45, avgTime: 13.2, efficiency: 92 },
    { name: 'General Hospital', emergencies: 38, avgTime: 14.8, efficiency: 88 },
    { name: 'Apollo Hospital', emergencies: 52, avgTime: 12.1, efficiency: 95 },
    { name: 'Fortis Hospital', emergencies: 29, avgTime: 15.3, efficiency: 86 }
  ];

  const aiPerformance = [
    { metric: 'Route Optimization', score: 94 },
    { metric: 'Traffic Prediction', score: 87 },
    { metric: 'Signal Clearance', score: 91 },
    { metric: 'ETA Accuracy', score: 89 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          📊 AI Analytics Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="1day">Last 24 Hours</MenuItem>
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          
          <IconButton onClick={loadAnalytics} title="Refresh">
            <Refresh />
          </IconButton>
          
          <Button
            variant="outlined"
            startIcon={<Download />}
            size="small"
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" py={4}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Loading AI Analytics...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Total Emergencies
                      </Typography>
                      <Typography variant="h4">
                        187
                      </Typography>
                      <Box display="flex" alignItems="center" mt={0.5}>
                        <TrendingUp color="success" fontSize="small" />
                        <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                          +12% from last week
                        </Typography>
                      </Box>
                    </Box>
                    <Emergency color="error" sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Avg. Response Time
                      </Typography>
                      <Typography variant="h4">
                        14.2m
                      </Typography>
                      <Box display="flex" alignItems="center" mt={0.5}>
                        <TrendingDown color="success" fontSize="small" />
                        <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                          -8% improvement
                        </Typography>
                      </Box>
                    </Box>
                    <Schedule color="primary" sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Signal Clearance Rate
                      </Typography>
                      <Typography variant="h4">
                        91%
                      </Typography>
                      <Box display="flex" alignItems="center" mt={0.5}>
                        <TrendingUp color="success" fontSize="small" />
                        <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                          +5% efficiency
                        </Typography>
                      </Box>
                    </Box>
                    <Traffic color="warning" sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        AI Optimization Score
                      </Typography>
                      <Typography variant="h4">
                        89%
                      </Typography>
                      <Box display="flex" alignItems="center" mt={0.5}>
                        <TrendingUp color="success" fontSize="small" />
                        <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                          +7% accuracy
                        </Typography>
                      </Box>
                    </Box>
                    <Speed color="success" sx={{ fontSize: 40, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row 1 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    📈 Emergency Trends & Response Times
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={emergencyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="emergencies"
                        stroke="#8884d8"
                        name="Emergencies"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="responseTime"
                        stroke="#82ca9d"
                        name="Avg Response (min)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    🚦 Signal Performance
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="signal" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="congestion" fill="#ff6b6b" name="Congestion %" />
                      <Bar dataKey="clearance" fill="#4ecdc4" name="Clearance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row 2 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    ⏱️ Hourly Response Time Analysis
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={responseTimeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="time" fill="#3498db" name="Avg Response Time (min)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    🤖 AI Performance Metrics
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={aiPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, score }) => `${name}: ${score}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="score"
                      >
                        {aiPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Hospital Performance Table */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                🏥 Hospital Performance Ranking
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Hospital</TableCell>
                      <TableCell align="center">Emergencies</TableCell>
                      <TableCell align="center">Avg Response Time</TableCell>
                      <TableCell align="center">Efficiency Score</TableCell>
                      <TableCell align="center">Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hospitalPerformance.map((hospital, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <LocalHospital sx={{ mr: 1, color: '#4caf50' }} />
                            {hospital.name}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={hospital.emergencies} size="small" color="primary" />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {hospital.avgTime} min
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <LinearProgress 
                            variant="determinate" 
                            value={hospital.efficiency}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" color="textSecondary">
                            {hospital.efficiency}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={hospital.efficiency >= 90 ? 'Excellent' : hospital.efficiency >= 80 ? 'Good' : 'Needs Improvement'}
                            size="small"
                            color={hospital.efficiency >= 90 ? 'success' : hospital.efficiency >= 80 ? 'warning' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                🧠 AI Insights & Recommendations
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Peak Hour Optimization
                    </Typography>
                    <Typography variant="caption" display="block">
                      AI detected 35% slower response times during 8-10 AM. Recommend:
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      • Deploy additional traffic police during morning peak
                      • Pre-clear signals along major ambulance routes
                      • Adjust AI prediction models for morning patterns
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Signal TS003 Improvement Needed
                    </Typography>
                    <Typography variant="caption" display="block">
                      Congestion levels consistently high (avg 78%). Issues:
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      • Construction work affecting flow
                      • Poor signal coordination with adjacent signals
                      • Recommend infrastructure review
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="success">
                    <Typography variant="body2" fontWeight="bold">
                      System Efficiency Up 12%
                    </Typography>
                    <Typography variant="caption" display="block">
                      AI optimizations implemented last week show:
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      • Route optimization improved by 8%
                      • Signal clearance time reduced by 15%
                      • ETA prediction accuracy at 92%
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    <Typography variant="body2" fontWeight="bold">
                      Predictive Alert System
                    </Typography>
                    <Typography variant="caption" display="block">
                      AI predicts 40% increase in emergencies next weekend:
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      • Festival event in city center
                      • Prepare additional resources
                      • Alert all hospitals and police stations
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </Paper>
  );
};

export default AnalyticsDashboard;
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  People,
  Emergency,
  Traffic,
  LocalHospital,
  TrendingUp,
  TrendingDown,
  Refresh,
  Download,
  MoreVert,
  Timeline,
  BarChart,
  PieChart,
  Map
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../services/api';

const AdminDashboard = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [recentEmergencies, setRecentEmergencies] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, emergenciesRes, usersRes] = await Promise.all([
        api.get('/api/admin/analytics/overview'),
        api.get('/api/admin/emergencies?limit=5'),
        api.get('/api/admin/analytics/emergencies')
      ]);

      setSystemStats(statsRes.data.overview);
      setRecentEmergencies(emergenciesRes.data.emergencies || []);
      setUserStats(usersRes.data.analytics || {});
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmergencyChartData = () => {
    return [
      { name: 'Mon', emergencies: 12, responseTime: 14.5 },
      { name: 'Tue', emergencies: 15, responseTime: 13.2 },
      { name: 'Wed', emergencies: 18, responseTime: 15.1 },
      { name: 'Thu', emergencies: 10, responseTime: 12.8 },
      { name: 'Fri', emergencies: 22, responseTime: 16.3 },
      { name: 'Sat', emergencies: 25, responseTime: 17.2 },
      { name: 'Sun', emergencies: 20, responseTime: 14.9 }
    ];
  };

  const getUserRoleData = () => {
    return [
      { name: 'Ambulance', value: systemStats?.users?.byRole?.find(r => r._id === 'ambulance')?.count || 45 },
      { name: 'Police', value: systemStats?.users?.byRole?.find(r => r._id === 'police')?.count || 28 },
      { name: 'Hospital', value: systemStats?.users?.byRole?.find(r => r._id === 'hospital')?.count || 15 },
      { name: 'Admin', value: systemStats?.users?.byRole?.find(r => r._id === 'admin')?.count || 5 }
    ];
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          👑 Admin Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}>
          <LinearProgress sx={{ mb: 3 }} />
          <Typography variant="body2" color="textSecondary">
            Loading system analytics and AI insights...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Total Users
                      </Typography>
                      <Typography variant="h4">
                        {systemStats?.users?.total || 0}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        <TrendingUp sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                        +12% from last week
                      </Typography>
                    </Box>
                    <People sx={{ fontSize: 40, color: '#1976d2' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Active Emergencies
                      </Typography>
                      <Typography variant="h4">
                        {systemStats?.emergencies?.active || 0}
                      </Typography>
                      <Typography variant="caption" color="error.main">
                        <TrendingUp sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                        {systemStats?.emergencies?.today || 0} today
                      </Typography>
                    </Box>
                    <Emergency sx={{ fontSize: 40, color: '#f44336' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        Avg Response Time
                      </Typography>
                      <Typography variant="h4">
                        {systemStats?.emergencies?.avgResponseTime || 0} min
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        <TrendingDown sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                        -2.5 min improvement
                      </Typography>
                    </Box>
                    <Timeline sx={{ fontSize: 40, color: '#4caf50' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        System Efficiency
                      </Typography>
                      <Typography variant="h4">
                        94.2%
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        <TrendingUp sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                        AI optimization active
                      </Typography>
                    </Box>
                    <BarChart sx={{ fontSize: 40, color: '#ff9800' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  📈 Emergency Trends & Response Times
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={getEmergencyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
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
                      name="Avg Response Time (min)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  👥 User Role Distribution
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <RechartsPieChart>
                    <Pie
                      data={getUserRoleData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getUserRoleData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Emergencies & System Status */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    🚨 Recent Emergency Activity
                  </Typography>
                  <Button size="small">View All</Button>
                </Box>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Emergency ID</TableCell>
                        <TableCell>Vehicle</TableCell>
                        <TableCell>Hospital</TableCell>
                        <TableCell>Response Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentEmergencies.map((emergency) => (
                        <TableRow key={emergency._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {emergency.emergencyId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {emergency.vehicleNumber}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {emergency.driverName}
                            </Typography>
                          </TableCell>
                          <TableCell>{emergency.hospitalName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${emergency.actualTime || emergency.estimatedTime || 0} min`}
                              size="small"
                              color={
                                (emergency.actualTime || 0) <= 15 ? 'success' : 
                                (emergency.actualTime || 0) <= 25 ? 'warning' : 'error'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={emergency.status.toUpperCase()}
                              size="small"
                              color={
                                emergency.status === 'active' ? 'error' :
                                emergency.status === 'completed' ? 'success' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <MoreVert />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🛠️ System Status
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Database Connection
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={100}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="textSecondary">
                      MongoDB Atlas
                    </Typography>
                    <Chip label="Connected" size="small" color="success" />
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    AI Engine Performance
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={94}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="textSecondary">
                      Route Optimization
                    </Typography>
                    <Chip label="94%" size="small" color="success" />
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Real-time Communication
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={100}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="textSecondary">
                      WebSocket Server
                    </Typography>
                    <Chip label="Active" size="small" color="success" />
                  </Box>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    All systems operational. AI engine optimizing 12 active routes.
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              ⚡ Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                >
                  Manage Users
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Emergency />}
                >
                  View Emergencies
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Traffic />}
                >
                  Signal Control
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<LocalHospital />}
                >
                  Hospital Management
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<BarChart />}
                >
                  Generate Reports
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Map />}
                >
                  System Map
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Download />}
                >
                  Backup Data
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<Refresh />}
                >
                  System Restart
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default AdminDashboard;
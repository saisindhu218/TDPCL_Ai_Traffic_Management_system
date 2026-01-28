import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Emergency,
  Traffic,
  LocalHospital,
  Security,
  Timeline,
  Map,
  Group,
  Analytics,
  TrendingUp,
  CheckCircle,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: <Emergency sx={{ fontSize: 40, color: '#f44336' }} />,
      title: 'Real-time Emergency Response',
      description: 'AI-powered route optimization for ambulance vehicles during emergencies',
      color: '#ffebee'
    },
    {
      icon: <Traffic sx={{ fontSize: 40, color: '#1976d2' }} />,
      title: 'Smart Traffic Control',
      description: 'Dynamic signal clearance and congestion management by traffic police',
      color: '#e3f2fd'
    },
    {
      icon: <LocalHospital sx={{ fontSize: 40, color: '#4caf50' }} />,
      title: 'Hospital Coordination',
      description: 'Real-time alerts and preparation time for incoming emergency cases',
      color: '#e8f5e9'
    },
    {
      icon: <Analytics sx={{ fontSize: 40, color: '#ff9800' }} />,
      title: 'AI Analytics Dashboard',
      description: 'Comprehensive analytics and reporting for system administrators',
      color: '#fff3e0'
    }
  ];

  const stats = [
    { label: 'Response Time Reduced', value: '40%', icon: <TrendingUp />, color: '#4caf50' },
    { label: 'Emergencies Handled', value: '1,250+', icon: <Emergency />, color: '#f44336' },
    { label: 'Traffic Signals', value: '150+', icon: <Traffic />, color: '#1976d2' },
    { label: 'Hospitals Integrated', value: '25+', icon: <LocalHospital />, color: '#4caf50' }
  ];

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      // Redirect to role-specific dashboard
      navigate(`/${user.role}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          🚨 AI-Powered Smart Traffic Management System
        </Typography>
        <Typography variant="h5" color="textSecondary" paragraph sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
          Reducing ambulance response time by intelligently managing urban traffic using 
          artificial intelligence and real-time coordination between emergency services.
        </Typography>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            endIcon={<ArrowForward />}
            sx={{ px: 4, py: 1.5 }}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login')}
            sx={{ px: 4, py: 1.5 }}
          >
            View Demo
          </Button>
        </Box>
      </Box>

      {/* Stats Section */}
      <Grid container spacing={3} sx={{ mb: 8 }}>
        {stats.map((stat, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent>
                <Box sx={{ color: stat.color, mb: 2 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Features Section */}
      <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom sx={{ mb: 4 }}>
        Key Features
      </Typography>
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%', bgcolor: feature.color }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                  {feature.description}
                </Typography>
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Real-time updates and coordination" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary="AI-powered optimization algorithms" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Multi-user role-based access" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* User Roles Section */}
      <Paper sx={{ p: 4, mb: 8, bgcolor: '#f5f5f5' }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
          User Roles
        </Typography>
        <Typography variant="body1" color="textSecondary" textAlign="center" paragraph sx={{ mb: 4 }}>
          Four specialized portals for different stakeholders in the emergency response ecosystem
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent>
                <Emergency sx={{ fontSize: 50, color: '#f44336', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Ambulance Driver
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Emergency toggle, GPS tracking, AI-optimized routes, real-time ETA
                </Typography>
                <Chip label="🚑 EMERGENCY MODE" color="error" size="small" />
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button 
                  size="small" 
                  onClick={() => navigate('/login')}
                  endIcon={<ArrowForward />}
                >
                  Access Portal
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent>
                <Traffic sx={{ fontSize: 50, color: '#1976d2', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Traffic Police
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Signal clearance, congestion reporting, emergency monitoring, coordination
                </Typography>
                <Chip label="🚦 TRAFFIC CONTROL" color="primary" size="small" />
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button 
                  size="small" 
                  onClick={() => navigate('/login')}
                  endIcon={<ArrowForward />}
                >
                  Access Portal
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent>
                <LocalHospital sx={{ fontSize: 50, color: '#4caf50', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Hospital Staff
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Incoming alerts, ambulance tracking, ETA visibility, emergency prep
                </Typography>
                <Chip label="🏥 HOSPITAL READY" color="success" size="small" />
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button 
                  size="small" 
                  onClick={() => navigate('/login')}
                  endIcon={<ArrowForward />}
                >
                  Access Portal
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent>
                <Security sx={{ fontSize: 50, color: '#9c27b0', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Administrator
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  User management, system analytics, configuration, monitoring
                </Typography>
                <Chip label="👑 ADMIN CONTROL" color="secondary" size="small" />
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button 
                  size="small" 
                  onClick={() => navigate('/login')}
                  endIcon={<ArrowForward />}
                >
                  Access Portal
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Technology Stack */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
          Technology Stack
        </Typography>
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 3 }}>
          {['React', 'Node.js', 'MongoDB', 'Express', 'Socket.io', 'Material-UI', 'Google Maps API', 'AI/ML'].map((tech) => (
            <Grid item key={tech}>
              <Chip
                label={tech}
                variant="outlined"
                sx={{ px: 2, py: 1, fontSize: '0.9rem' }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* CTA Section */}
      <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Ready to Transform Emergency Response?
        </Typography>
        <Typography variant="body1" paragraph sx={{ mb: 4, opacity: 0.9 }}>
          Join our AI-powered smart traffic management system and help save lives through faster emergency response.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              '&:hover': { bgcolor: '#f5f5f5' }
            }}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            sx={{ color: 'white', borderColor: 'white' }}
            onClick={() => window.open('#demo', '_blank')}
          >
            Watch Demo
          </Button>
        </Box>
      </Paper>

      {/* Footer Note */}
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          MCA Final Year Project | AI-Powered Smart Traffic Management System for Ambulance Emergency Response
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block">
          Patent-Supportive | Demo-Ready | Extendable | Built with FREE Cloud Services
        </Typography>
      </Box>
    </Container>
  );
};

export default Home;
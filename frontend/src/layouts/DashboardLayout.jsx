import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  Alert,
  Button,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab
} from '@mui/material';
import {
  Home,
  Emergency,
  Traffic,
  LocalHospital,
  Settings,
  Notifications,
  Refresh,
  Help,
  Dashboard as DashboardIcon,
  Map as MapIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const DashboardLayout = ({ children, role }) => {
  const { user } = useAuth();
  const { socket, emergencyUpdates } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  // Update breadcrumbs based on current route
  useEffect(() => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbItems = pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = value.charAt(0).toUpperCase() + value.slice(1);
      
      return {
        label: label === role ? `${label.toUpperCase()} PORTAL` : label,
        to: index === pathnames.length - 1 ? null : to
      };
    });
    
    setBreadcrumbs(breadcrumbItems);
  }, [location, role]);

  // Listen for emergency alerts
  useEffect(() => {
    if (socket) {
      socket.on('emergency-started', (data) => {
        if (role === 'police' || role === 'hospital') {
          setEmergencyAlert({
            type: 'emergency',
            message: `Emergency vehicle ${data.ambulance} heading to ${data.hospital}`,
            data,
            timestamp: new Date()
          });
        }
      });

      socket.on('emergency-ended', (data) => {
        setEmergencyAlert(null);
      });

      return () => {
        socket.off('emergency-started');
        socket.off('emergency-ended');
      };
    }
  }, [socket, role]);

  const handleEmergencyAction = () => {
    if (role === 'police') {
      navigate('/police/control');
    } else if (role === 'hospital') {
      navigate('/hospital/alerts');
    }
  };

  const getDashboardStats = () => {
    const baseStats = {
      responseTime: '8.5 min',
      efficiency: '92%',
      emergencies: '3',
      signals: '12'
    };

    switch (role) {
      case 'ambulance':
        return {
          ...baseStats,
          title: 'Ambulance Response Dashboard',
          color: '#d32f2f',
          icon: <Emergency />
        };
      case 'police':
        return {
          ...baseStats,
          title: 'Traffic Control Dashboard',
          color: '#1976d2',
          icon: <Traffic />
        };
      case 'hospital':
        return {
          ...baseStats,
          title: 'Hospital Emergency Dashboard',
          color: '#388e3c',
          icon: <LocalHospital />
        };
      case 'admin':
        return {
          ...baseStats,
          title: 'System Administration Dashboard',
          color: '#7b1fa2',
          icon: <Settings />
        };
      default:
        return baseStats;
    }
  };

  const stats = getDashboardStats();

  const speedDialActions = [
    { icon: <DashboardIcon />, name: 'Dashboard', action: () => navigate(`/${role}`) },
    { icon: <MapIcon />, name: 'Live Map', action: () => navigate(`/${role}/map`) },
    { icon: <HistoryIcon />, name: 'History', action: () => navigate(`/${role}/history`) },
    { icon: <Settings />, name: 'Settings', action: () => navigate(`/${role}/settings`) },
    { icon: <Help />, name: 'Help', action: () => navigate('/help') },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Breadcrumbs */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Home sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          {breadcrumbs.map((breadcrumb, index) => (
            breadcrumb.to ? (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                onClick={() => navigate(breadcrumb.to)}
                sx={{ cursor: 'pointer' }}
              >
                {breadcrumb.label}
              </Link>
            ) : (
              <Typography key={index} color="text.primary">
                {breadcrumb.label}
              </Typography>
            )
          ))}
        </Breadcrumbs>
      </Paper>

      {/* Emergency Alert Banner */}
      {emergencyAlert && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={handleEmergencyAction}
            >
              TAKE ACTION
            </Button>
          }
        >
          <Typography variant="body2" fontWeight="bold">
            🚨 EMERGENCY ALERT: {emergencyAlert.message}
          </Typography>
          <Typography variant="caption" display="block">
            Click to coordinate response
          </Typography>
        </Alert>
      )}

      {/* Dashboard Header */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3,
          background: `linear-gradient(135deg, ${stats.color} 0%, ${stats.color}80 100%)`,
          color: 'white'
        }}
      >
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Box display="flex" alignItems="center" gap={2}>
              {stats.icon}
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Welcome back, {user?.username || 'User'} • {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item>
            <Box display="flex" gap={2}>
              <Chip 
                label={`Response Time: ${stats.responseTime}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip 
                label={`Efficiency: ${stats.efficiency}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="xl">
        {children || <Outlet />}
      </Container>

      {/* System Status Bar */}
      <Paper sx={{ p: 2, mt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip 
                icon={<Emergency />}
                label={`${stats.emergencies} Active Emergencies`}
                color="error"
                size="small"
              />
              <Chip 
                icon={<Traffic />}
                label={`${stats.signals} Signals Controlled`}
                color="primary"
                size="small"
              />
              <Typography variant="caption" color="textSecondary">
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Actions Speed Dial */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
          />
        ))}
      </SpeedDial>

      {/* Emergency Action FAB */}
      {(role === 'police' || role === 'hospital') && emergencyUpdates.length > 0 && (
        <Fab
          color="error"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            animation: 'pulse 2s infinite'
          }}
          onClick={handleEmergencyAction}
        >
          <Notifications />
        </Fab>
      )}
    </Box>
  );
};

export default DashboardLayout;
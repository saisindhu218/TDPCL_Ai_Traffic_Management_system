import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Dashboard,
  Emergency,
  Traffic,
  LocalHospital,
  People,
  Analytics,
  Map,
  History,
  Settings,
  NotificationsActive,
  Route,
  Report,
  Timeline,
  Security
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ open, onClose, drawerWidth = 240 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getMenuItems = () => {
    const commonItems = [
      { text: 'Dashboard', icon: <Dashboard />, path: `/${user?.role}` },
      { text: 'Live Map', icon: <Map />, path: `/${user?.role}/map` },
      { text: 'History', icon: <History />, path: `/${user?.role}/history` },
      { text: 'Reports', icon: <Report />, path: `/${user?.role}/reports` },
      { text: 'Settings', icon: <Settings />, path: `/${user?.role}/settings` }
    ];

    const roleSpecificItems = {
      ambulance: [
        { text: 'Emergency Control', icon: <Emergency />, path: '/ambulance/emergency', badge: 1 },
        { text: 'Route Planning', icon: <Route />, path: '/ambulance/route' },
        { text: 'Hospitals', icon: <LocalHospital />, path: '/ambulance/hospitals' }
      ],
      police: [
        { text: 'Traffic Control', icon: <Traffic />, path: '/police/control', badge: 3 },
        { text: 'Signal Management', icon: <NotificationsActive />, path: '/police/signals' },
        { text: 'Congestion Reports', icon: <Timeline />, path: '/police/congestion' }
      ],
      hospital: [
        { text: 'Incoming Alerts', icon: <NotificationsActive />, path: '/hospital/alerts', badge: 2 },
        { text: 'Ambulance Tracking', icon: <Emergency />, path: '/hospital/tracking' },
        { text: 'Resource Management', icon: <LocalHospital />, path: '/hospital/resources' }
      ],
      admin: [
        { text: 'User Management', icon: <People />, path: '/admin/users' },
        { text: 'System Analytics', icon: <Analytics />, path: '/admin/analytics' },
        { text: 'Security', icon: <Security />, path: '/admin/security' }
      ]
    };

    return [...(roleSpecificItems[user?.role] || []), ...commonItems];
  };

  const menuItems = getMenuItems();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)'
        },
        display: { xs: open ? 'block' : 'none', md: 'block' }
      }}
      open={open}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        {/* User Info */}
        <Box sx={{ p: 2, textAlign: 'center', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
            {user?.role?.toUpperCase()} PORTAL
          </Typography>
          <Typography variant="caption" color="textSecondary" noWrap>
            {user?.username}
          </Typography>
        </Box>

        <List>
          {menuItems.map((item) => (
            <Tooltip key={item.text} title={item.text} placement="right">
              <ListItem
                button
                selected={isActive(item.path)}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mb: 0.5,
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white'
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) ? 'bold' : 'normal'
                  }}
                />
              </ListItem>
            </Tooltip>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* System Status */}
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            System Status
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption">AI Engine</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', mr: 0.5 }} />
              <Typography variant="caption" color="textSecondary">Online</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption">Database</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', mr: 0.5 }} />
              <Typography variant="caption" color="textSecondary">Connected</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Maps</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', mr: 0.5 }} />
              <Typography variant="caption" color="textSecondary">Active</Typography>
            </Box>
          </Box>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Quick Actions
          </Typography>
          <List dense>
            {user?.role === 'ambulance' && (
              <ListItem button sx={{ borderRadius: 1, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Emergency fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Start Emergency" primaryTypographyProps={{ fontSize: '0.75rem' }} />
              </ListItem>
            )}
            {user?.role === 'police' && (
              <ListItem button sx={{ borderRadius: 1, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Traffic fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Clear All Signals" primaryTypographyProps={{ fontSize: '0.75rem' }} />
              </ListItem>
            )}
            <ListItem button sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Report fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Generate Report" primaryTypographyProps={{ fontSize: '0.75rem' }} />
            </ListItem>
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
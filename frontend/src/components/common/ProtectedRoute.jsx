import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Badge,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Settings,
  Logout,
  Emergency,
  Traffic
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'ambulance':
        return <Emergency sx={{ color: '#ff0000' }} />;
      case 'police':
        return <Traffic sx={{ color: '#1976d2' }} />;
      case 'hospital':
        return <MedicalServices sx={{ color: '#4caf50' }} />;
      case 'admin':
        return <AdminPanelSettings sx={{ color: '#9c27b0' }} />;
      default:
        return <AccountCircle />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'ambulance':
        return '#ff0000';
      case 'police':
        return '#1976d2';
      case 'hospital':
        return '#4caf50';
      case 'admin':
        return '#9c27b0';
      default:
        return '#757575';
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: getRoleColor(),
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {getRoleIcon()}
          <Typography variant="h6" noWrap component="div" sx={{ ml: 1 }}>
            {title || 'Smart Traffic Management System'}
          </Typography>
          
          {user && (
            <Typography variant="caption" sx={{ ml: 2, opacity: 0.8 }}>
              {user.role === 'ambulance' && `🚑 ${user.vehicleNumber}`}
              {user.role === 'police' && `🚓 ${user.stationName}`}
              {user.role === 'hospital' && `🏥 ${user.hospitalName}`}
              {user.role === 'admin' && `👑 Administrator`}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationsOpen}>
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{ ml: 2 }}
              aria-controls={anchorEl ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={anchorEl ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'white', color: getRoleColor() }}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchor}
          open={Boolean(notificationsAnchor)}
          onClose={handleNotificationsClose}
          PaperProps={{
            sx: { width: 320, maxHeight: 400 }
          }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight="bold">Notifications</Typography>
          </MenuItem>
          <Divider />
          
          <MenuItem onClick={handleNotificationsClose}>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                🚑 Emergency vehicle enroute
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Ambulance KA01AB1234 heading to City Hospital
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                5 minutes ago
              </Typography>
            </Box>
          </MenuItem>
          
          <MenuItem onClick={handleNotificationsClose}>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                🚦 Signal cleared successfully
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Signal TS001 at MG Road cleared
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                15 minutes ago
              </Typography>
            </Box>
          </MenuItem>
          
          <MenuItem onClick={handleNotificationsClose}>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                📊 System update available
              </Typography>
              <Typography variant="caption" color="textSecondary">
                New AI optimization algorithms deployed
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                1 hour ago
              </Typography>
            </Box>
          </MenuItem>
        </Menu>

        {/* User Account Menu */}
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              width: 200,
              mt: 1.5
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleProfile}>
            <AccountCircle sx={{ mr: 2 }} />
            Profile
          </MenuItem>
          
          <MenuItem onClick={handleSettings}>
            <Settings sx={{ mr: 2 }} />
            Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout}>
            <Logout sx={{ mr: 2 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
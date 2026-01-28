import React, { useState } from 'react';
import {
  Box,
  CssBaseline,
  Toolbar,
  Container,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import { useAuth } from '../contexts/AuthContext';

const MainLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on mobile when clicking outside
  const handleCloseSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Get role-specific title
  const getRoleTitle = () => {
    if (title) return title;
    
    switch (user?.role) {
      case 'ambulance':
        return 'Ambulance Emergency Response System';
      case 'police':
        return 'Traffic Police Control Center';
      case 'hospital':
        return 'Hospital Emergency Coordination';
      case 'admin':
        return 'System Administration Panel';
      default:
        return 'Smart Traffic Management System';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Header */}
      <Header 
        title={getRoleTitle()}
        onMenuClick={handleSidebarToggle}
      />

      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        drawerWidth={240}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${sidebarOpen ? 240 : 0}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          ml: { sm: sidebarOpen ? 0 : `-${240}px` },
        }}
        onClick={handleCloseSidebar}
      >
        <Toolbar /> {/* Spacer for fixed header */}
        
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          {children}
        </Container>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: 3,
            px: 2,
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[800],
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                    }}
                  >
                    System Status: <Box component="span" sx={{ color: 'success.main' }}>Operational</Box>
                  </Box>
                </Box>
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}
                >
                  AI Engine: Active • Database: Connected • GPS: Tracking
                </Box>
              </Box>

              <Box sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
                <Box
                  sx={{
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  Smart Traffic Management System v1.0
                </Box>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.disabled',
                  }}
                >
                  © {new Date().getFullYear()} MCA Final Year Project • AI-Powered Emergency Response
                </Box>
              </Box>
            </Box>

            {/* System Metrics */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                justifyContent: 'center',
                gap: 4,
                mt: 3,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  Response Time
                </Box>
                <Box
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'success.main',
                  }}
                >
                  8.2 min
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  Emergencies Today
                </Box>
                <Box
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                >
                  14
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  Signals Cleared
                </Box>
                <Box
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'warning.main',
                  }}
                >
                  87
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  AI Efficiency
                </Box>
                <Box
                  sx={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'info.main',
                  }}
                >
                  94.5%
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>

      {/* Emergency Alert Overlay */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Quick Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            opacity: 0.9,
            '&:hover': { opacity: 1 },
          }}
        >
          {user?.role === 'ambulance' && (
            <Box
              sx={{
                p: 1,
                bgcolor: 'error.main',
                color: 'white',
                borderRadius: 1,
                cursor: 'pointer',
                animation: 'emergency-pulse 2s infinite',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              🚨 EMERGENCY
            </Box>
          )}

          <Box
            sx={{
              p: 1,
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            📍 LIVE MAP
          </Box>

          <Box
            sx={{
              p: 1,
              bgcolor: 'success.main',
              color: 'white',
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            ⚡ QUICK ACTIONS
          </Box>
        </Box>

        {/* Connection Status */}
        <Box
          sx={{
            p: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 2,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
            }}
          />
          <Box sx={{ color: 'text.secondary' }}>Connected</Box>
          <Box sx={{ ml: 'auto', color: 'text.disabled' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Box>
        </Box>
      </Box>

      {/* Loading Overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
          '&.loading': {
            opacity: 0.9,
            pointerEvents: 'all',
          },
        }}
        className="loading-overlay"
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '4px solid',
              borderColor: 'primary.light',
              borderTopColor: 'primary.main',
              animation: 'spin 1s linear infinite',
              mb: 2,
            }}
          />
          <Box sx={{ fontWeight: 500, color: 'text.primary' }}>
            AI Processing Route...
          </Box>
          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
            Optimizing traffic signals and clearance
          </Box>
        </Box>
      </Box>

      <style jsx="true">{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes emergency-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
          }
        }
        
        .loading-overlay {
          display: none;
        }
        
        .loading-overlay.loading {
          display: flex;
        }
      `}</style>
    </Box>
  );
};

export default MainLayout;
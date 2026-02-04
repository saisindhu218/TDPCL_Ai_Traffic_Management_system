import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress, Container, Paper, Typography } from '@mui/material';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box textAlign="center">
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="textSecondary">
            Loading Smart Traffic System...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            AI Engine Initializing
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <Container sx={{ mt: 10 }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500, mx: 'auto' }}>
          <Typography variant="h4" color="error" gutterBottom>
            ⚠️ Access Denied
          </Typography>
          <Typography variant="body1" paragraph>
            You don't have permission to access this page.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your role: <strong>{user?.role}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Required roles: {allowedRoles.join(', ')}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
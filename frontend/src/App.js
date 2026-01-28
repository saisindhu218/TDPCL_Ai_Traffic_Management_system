import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/auth/Login';
import AmbulanceDashboard from './pages/ambulance/Dashboard';
import PoliceDashboard from './pages/police/Dashboard';
import HospitalDashboard from './pages/hospital/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedRoute allowedRoles={['ambulance']} />}>
                <Route path="/ambulance/*" element={
                  <DashboardLayout role="ambulance">
                    <AmbulanceDashboard />
                  </DashboardLayout>
                } />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['police']} />}>
                <Route path="/police/*" element={
                  <DashboardLayout role="police">
                    <PoliceDashboard />
                  </DashboardLayout>
                } />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['hospital']} />}>
                <Route path="/hospital/*" element={
                  <DashboardLayout role="hospital">
                    <HospitalDashboard />
                  </DashboardLayout>
                } />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/*" element={
                  <DashboardLayout role="admin">
                    <AdminDashboard />
                  </DashboardLayout>
                } />
              </Route>
              
              <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
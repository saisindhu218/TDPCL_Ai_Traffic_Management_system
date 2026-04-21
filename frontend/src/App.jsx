import React, { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthContext } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import AmbulanceProfile from './pages/AmbulanceProfile';
import PoliceDashboard from './pages/PoliceDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Sidebar from './components/Sidebar';
import Simulation from './pages/Simulation';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('dashboardTheme');
    return storedTheme === 'light' ? 'light' : 'dark';
  });

  const handleThemeToggle = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('dashboardTheme', nextTheme);
      return nextTheme;
    });
  };


  if (loading) {
    // Wait for loading to finish before deciding
    return <div className="flex min-h-screen items-center justify-center text-slate-200">Loading...</div>;
  }

  if (!user) {
    // Only redirect if loading is done and user is not present
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Or return a "Not Authorized" page
  }

  return (
    <div className={`app-shell ${theme === 'light' ? 'app-shell--light' : ''}`}>
      <Sidebar theme={theme} onToggleTheme={handleThemeToggle} />
      <main className="app-shell__content">
        {children}
      </main>
    </div>
  );
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

ProtectedRoute.defaultProps = {
  allowedRoles: []
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/simulation" element={<Simulation />} />
        
        <Route 
          path="/ambulance" 
          element={
            <ProtectedRoute allowedRoles={['ambulance']}>
              <AmbulanceDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/ambulance/profile" 
          element={
            <ProtectedRoute allowedRoles={['ambulance']}>
              <AmbulanceProfile />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/police" 
          element={
            <ProtectedRoute allowedRoles={['police']}>
              <PoliceDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/hospital" 
          element={
            <ProtectedRoute allowedRoles={['hospital']}>
              <HospitalDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

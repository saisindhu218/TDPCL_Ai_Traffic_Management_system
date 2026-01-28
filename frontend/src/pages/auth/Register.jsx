import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Link
} from '@mui/material';
import {
  PersonAdd,
  ArrowBack,
  Emergency,
  Traffic,
  LocalHospital,
  AdminPanelSettings
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const Register = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    vehicleNumber: '',
    hospitalName: '',
    stationName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const steps = ['Account Details', 'Role Selection', 'Role-Specific Info', 'Confirmation'];

  const handleNext = () => {
    if (activeStep === 0) {
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }
    
    if (activeStep === 1 && !formData.role) {
      setError('Please select a role');
      return;
    }
    
    if (activeStep === 2) {
      if (formData.role === 'ambulance' && !formData.vehicleNumber) {
        setError('Vehicle number is required for ambulance drivers');
        return;
      }
      if (formData.role === 'hospital' && !formData.hospitalName) {
        setError('Hospital name is required');
        return;
      }
      if (formData.role === 'police' && !formData.stationName) {
        setError('Station name is required');
        return;
      }
    }
    
    setError('');
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Prepare registration data
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      
      // Add role-specific data
      if (formData.role === 'ambulance') {
        registrationData.vehicleNumber = formData.vehicleNumber;
      } else if (formData.role === 'hospital') {
        registrationData.hospitalName = formData.hospitalName;
      } else if (formData.role === 'police') {
        registrationData.stationName = formData.stationName;
      }
      
      const result = await register(registrationData);
      
      if (result.success) {
        // Redirect based on role
        navigate(`/${formData.role}`);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'ambulance':
        return 'Ambulance drivers can start emergencies, get AI-optimized routes, and coordinate with police/hospitals.';
      case 'police':
        return 'Traffic police can clear signals, report congestion, and monitor emergency vehicles.';
      case 'hospital':
        return 'Hospital staff receive emergency alerts, track incoming ambulances, and prepare resources.';
      case 'admin':
        return 'Administrators manage users, view system analytics, and configure system settings.';
      default:
        return '';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ambulance': return <Emergency sx={{ fontSize: 40, color: '#f44336' }} />;
      case 'police': return <Traffic sx={{ fontSize: 40, color: '#1976d2' }} />;
      case 'hospital': return <LocalHospital sx={{ fontSize: 40, color: '#4caf50' }} />;
      case 'admin': return <AdminPanelSettings sx={{ fontSize: 40, color: '#9c27b0' }} />;
      default: return null;
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Create your account
            </Typography>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="username"
            />
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="new-password"
              helperText="Minimum 6 characters"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="new-password"
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select your role
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Choose the role that best describes your function in the emergency response system.
            </Typography>
            
            <Grid container spacing={2}>
              {['ambulance', 'police', 'hospital', 'admin'].map((role) => (
                <Grid item xs={6} key={role}>
                  <Paper
                    elevation={formData.role === role ? 3 : 1}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: formData.role === role ? '2px solid' : '1px solid',
                      borderColor: formData.role === role ? 'primary.main' : 'divider',
                      bgcolor: formData.role === role ? 'action.selected' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => setFormData({...formData, role})}
                  >
                    {getRoleIcon(role)}
                    <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 'bold' }}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                      {getRoleDescription(role)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Additional Information for {formData.role}
            </Typography>
            
            {formData.role === 'ambulance' && (
              <TextField
                fullWidth
                label="Vehicle Number"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleInputChange}
                margin="normal"
                required
                placeholder="e.g., KA01AB1234"
                helperText="Enter your ambulance registration number"
              />
            )}
            
            {formData.role === 'hospital' && (
              <TextField
                fullWidth
                label="Hospital Name"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleInputChange}
                margin="normal"
                required
                placeholder="e.g., City General Hospital"
              />
            )}
            
            {formData.role === 'police' && (
              <TextField
                fullWidth
                label="Station Name"
                name="stationName"
                value={formData.stationName}
                onChange={handleInputChange}
                margin="normal"
                required
                placeholder="e.g., Central Traffic Control"
              />
            )}
            
            {formData.role === 'admin' && (
              <Alert severity="info">
                <Typography variant="body2">
                  Administrator accounts require additional verification.
                  Your request will be reviewed by the system administrator.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Review and Confirm
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Account Details
                  </Typography>
                  <Typography variant="body2">Username: {formData.username}</Typography>
                  <Typography variant="body2">Email: {formData.email}</Typography>
                  <Typography variant="body2">Role: {formData.role}</Typography>
                </Grid>
                
                {formData.role === 'ambulance' && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Ambulance Details
                    </Typography>
                    <Typography variant="body2">Vehicle: {formData.vehicleNumber}</Typography>
                  </Grid>
                )}
                
                {formData.role === 'hospital' && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Hospital Details
                    </Typography>
                    <Typography variant="body2">Hospital: {formData.hospitalName}</Typography>
                  </Grid>
                )}
                
                {formData.role === 'police' && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Police Details
                    </Typography>
                    <Typography variant="body2">Station: {formData.stationName}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
            
            <Alert severity="info">
              <Typography variant="body2">
                By registering, you agree to use this system only for genuine emergency response coordination.
                All activities are logged and monitored for security purposes.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" gutterBottom color="primary">
            🚨 Smart Traffic Management System
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Emergency Response Coordination Platform
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
          
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>

        <Box textAlign="center" mt={4}>
          <Typography variant="body2" color="textSecondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Sign in here
            </Link>
          </Typography>
          
          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 2 }}>
            MCA Final Year Project - AI Powered Smart Traffic Management System
          </Typography>
          <Typography variant="caption" color="textSecondary">
            For emergency vehicle response optimization
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
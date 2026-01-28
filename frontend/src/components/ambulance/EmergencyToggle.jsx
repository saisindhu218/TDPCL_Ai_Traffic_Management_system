import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  Box,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Emergency as EmergencyIcon,
  LocationOn,
  Warning,
  CheckCircle,
  Cancel,
  Hospital
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

const EmergencyToggle = ({ user, onEmergencyChange }) => {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [patientInfo, setPatientInfo] = useState({
    condition: '',
    severity: 'medium',
    notes: ''
  });
  const { socket, emitEmergencyAlert } = useSocket();

  const loadHospitals = async () => {
    try {
      const response = await api.get('/api/ambulance/hospitals');
      setHospitals(response.data.hospitals);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const handleEmergencyToggle = async (start) => {
    if (start) {
      await loadHospitals();
      setDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/ambulance/emergency/end');
      
      setEmergencyMode(false);
      emitEmergencyAlert({
        type: 'emergency_ended',
        ambulance: user.vehicleNumber,
        timestamp: new Date()
      });

      if (onEmergencyChange) {
        onEmergencyChange(false, null);
      }

    } catch (error) {
      console.error('Error ending emergency:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEmergency = async () => {
    if (!selectedHospital) {
      alert('Please select a hospital');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/ambulance/emergency/start', {
        hospitalId: selectedHospital,
        patientInfo
      });

      setEmergencyMode(true);
      setDialogOpen(false);
      
      emitEmergencyAlert({
        type: 'emergency_started',
        emergencyId: response.data.emergency._id,
        ambulance: user.vehicleNumber,
        hospital: response.data.emergency.hospitalName,
        timestamp: new Date()
      });

      if (onEmergencyChange) {
        onEmergencyChange(true, response.data.emergency);
      }

    } catch (error) {
      console.error('Error starting emergency:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card 
        sx={{ 
          bgcolor: emergencyMode ? '#ffebee' : 'white',
          border: emergencyMode ? '2px solid #f44336' : '1px solid #e0e0e0',
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: emergencyMode ? '0 0 20px rgba(244, 67, 54, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center">
              <EmergencyIcon sx={{ 
                fontSize: 40, 
                color: emergencyMode ? '#f44336' : '#9e9e9e',
                mr: 2,
                animation: emergencyMode ? 'pulse 1.5s infinite' : 'none'
              }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Emergency Response System
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {emergencyMode ? 'EMERGENCY ACTIVE - All systems engaged' : 'System Ready for Emergency'}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center">
              <Chip 
                label={emergencyMode ? 'ACTIVE' : 'STANDBY'}
                color={emergencyMode ? 'error' : 'default'}
                sx={{ mr: 2, fontWeight: 'bold' }}
              />
              <Switch
                checked={emergencyMode}
                onChange={(e) => handleEmergencyToggle(e.target.checked)}
                disabled={loading}
                color="error"
                size="large"
              />
            </Box>
          </Box>

          {emergencyMode ? (
            <Alert 
              severity="error" 
              icon={<Warning />}
              sx={{ mb: 2 }}
            >
              <Typography fontWeight="bold">
                🚨 EMERGENCY MODE ACTIVE 🚨
              </Typography>
              <Typography variant="body2">
                • All traffic signals on your route are being cleared
                • Police have been notified
                • Hospital is preparing for arrival
                • AI route optimization active
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                Ready to respond to emergencies. When activated:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                • AI will optimize the fastest route
                • Traffic police will clear your path
                • Hospital will prepare for arrival
                • Real-time coordination enabled
              </Typography>
            </Alert>
          )}

          {emergencyMode && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Emergency Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={75}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                <Chip icon={<LocationOn />} label="Enroute" size="small" color="primary" variant="outlined" />
                <Chip icon={<Hospital />} label="Hospital Notified" size="small" color="success" variant="outlined" />
                <Chip icon={<CheckCircle />} label="3 Signals Cleared" size="small" color="info" variant="outlined" />
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            {emergencyMode ? (
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<Cancel />}
                onClick={() => handleEmergencyToggle(false)}
                disabled={loading}
              >
                END EMERGENCY
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<EmergencyIcon />}
                onClick={() => handleEmergencyToggle(true)}
                disabled={loading}
              >
                START EMERGENCY RESPONSE
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Emergency Start Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <EmergencyIcon sx={{ mr: 1, color: '#f44336' }} />
            Start Emergency Response
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold">
              Confirm before proceeding:
            </Typography>
            <Typography variant="body2">
              • This will alert traffic police and hospitals
              • Traffic signals will be cleared on your route
              • Use only for genuine emergencies
            </Typography>
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Destination Hospital</InputLabel>
            <Select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              label="Select Destination Hospital"
            >
              {hospitals.map((hospital) => (
                <MenuItem key={hospital._id} value={hospital._id}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {hospital.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {hospital.address} • {hospital.distance} km
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Patient Information (Optional)
          </Typography>
          
          <TextField
            fullWidth
            label="Condition"
            value={patientInfo.condition}
            onChange={(e) => setPatientInfo({...patientInfo, condition: e.target.value})}
            margin="normal"
            size="small"
          />
          
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Severity Level</InputLabel>
            <Select
              value={patientInfo.severity}
              onChange={(e) => setPatientInfo({...patientInfo, severity: e.target.value})}
              label="Severity Level"
            >
              <MenuItem value="low">Low - Stable</MenuItem>
              <MenuItem value="medium">Medium - Urgent</MenuItem>
              <MenuItem value="high">High - Critical</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Additional Notes"
            value={patientInfo.notes}
            onChange={(e) => setPatientInfo({...patientInfo, notes: e.target.value})}
            margin="normal"
            size="small"
            multiline
            rows={2}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleStartEmergency}
            disabled={!selectedHospital || loading}
            startIcon={<EmergencyIcon />}
          >
            {loading ? 'Starting...' : 'CONFIRM EMERGENCY'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmergencyToggle;
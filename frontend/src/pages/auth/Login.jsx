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
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password);
            
            if (result.success) {
                // Redirect based on role
                const role = result.user.role;
                switch(role) {
                    case 'ambulance':
                        navigate('/ambulance');
                        break;
                    case 'police':
                        navigate('/police');
                        break;
                    case 'hospital':
                        navigate('/hospital');
                        break;
                    case 'admin':
                        navigate('/admin');
                        break;
                    default:
                        navigate('/');
                }
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const demoCredentials = [
        { role: '🚑 Ambulance', email: 'driver01@hospital.gov', password: 'driver123' },
        { role: '🚓 Police', email: 'traffic@police.gov', password: 'police123' },
        { role: '🏥 Hospital', email: 'emergency@cityhospital.gov', password: 'hospital123' },
        { role: '👑 Admin', email: 'admin@traffic.gov', password: 'admin123' }
    ];

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Box textAlign="center" mb={4}>
                    <Typography variant="h4" gutterBottom color="primary">
                        🚨 Smart Traffic Management System
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        AI-Powered Emergency Response Coordination
                    </Typography>
                </Box>

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        autoComplete="email"
                    />
                    
                    <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        autoComplete="current-password"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                        sx={{ mt: 3, mb: 2, py: 1.5 }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                {/* Demo Credentials Section */}
                <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        📋 Demo Credentials (For Viva):
                    </Typography>
                    <Box>
                        {demoCredentials.map((cred, index) => (
                            <Box 
                                key={index} 
                                sx={{ 
                                    p: 1, 
                                    mb: 1, 
                                    bgcolor: 'white',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#e3f2fd' }
                                }}
                                onClick={() => {
                                    setEmail(cred.email);
                                    setPassword(cred.password);
                                }}
                            >
                                <Typography variant="body2">
                                    <strong>{cred.role}:</strong> {cred.email} / {cred.password}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Box textAlign="center" mt={3}>
                    <Typography variant="body2" color="textSecondary">
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

export default Login;
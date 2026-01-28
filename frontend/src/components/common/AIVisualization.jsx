import React from 'react';
import {
    Paper,
    Typography,
    Box,
    LinearProgress,
    Chip,
    Grid,
    Card,
    CardContent,
    Tooltip
} from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineDot,
    TimelineConnector,
    TimelineContent,
    TimelineOppositeContent
} from '@mui/lab';
import {
    TrendingUp,
    Traffic,
    Route,
    Warning,
    CheckCircle,
    Schedule
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const AIVisualization = ({ title, data, emergencyMode }) => {
    // Mock AI data for visualization
    const aiData = data || {
        predictions: [
            { time: 'Now', congestion: 65 },
            { time: '+5min', congestion: 70 },
            { time: '+10min', congestion: 55 },
            { time: '+15min', congestion: 40 },
            { time: '+20min', congestion: 30 },
        ],
        recommendations: [
            { time: 'Immediate', action: 'Clear Signal #45', priority: 'high' },
            { time: 'In 3 min', action: 'Alert police at Junction 3', priority: 'medium' },
            { time: 'In 8 min', action: 'Switch to alternative route', priority: 'low' },
        ],
        metrics: {
            confidence: 88,
            timeSaved: 12,
            efficiency: 94,
            accuracy: 89
        }
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                🤖 {title}
            </Typography>
            
            <Grid container spacing={3}>
                {/* Metrics Cards */}
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#e8f5e9' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <TrendingUp sx={{ mr: 1, color: '#4caf50' }} />
                                <Typography variant="h6" color="success.main">
                                    {aiData.metrics.efficiency}%
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                Route Efficiency
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#e3f2fd' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Schedule sx={{ mr: 1, color: '#1976d2' }} />
                                <Typography variant="h6" color="primary.main">
                                    {aiData.metrics.timeSaved} min
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                Time Saved
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#fff3e0' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Traffic sx={{ mr: 1, color: '#ff9800' }} />
                                <Typography variant="h6" color="warning.main">
                                    {aiData.metrics.confidence}%
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                AI Confidence
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#fce4ec' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <CheckCircle sx={{ mr: 1, color: '#e91e63' }} />
                                <Typography variant="h6" color="secondary.main">
                                    {aiData.metrics.accuracy}%
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                Prediction Accuracy
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Congestion Prediction Chart */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '300px' }}>
                        <Typography variant="subtitle1" gutterBottom>
                            📊 Congestion Prediction
                        </Typography>
                        <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={aiData.predictions}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis label={{ value: 'Congestion %', angle: -90, position: 'insideLeft' }} />
                                <RechartsTooltip />
                                <Line 
                                    type="monotone" 
                                    dataKey="congestion" 
                                    stroke="#ff6b6b" 
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* AI Recommendations Timeline */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '300px', overflow: 'auto' }}>
                        <Typography variant="subtitle1" gutterBottom>
                            ⚡ AI Recommendations Timeline
                        </Typography>
                        <Timeline>
                            {aiData.recommendations.map((rec, index) => (
                                <TimelineItem key={index}>
                                    <TimelineOppositeContent color="textSecondary">
                                        {rec.time}
                                    </TimelineOppositeContent>
                                    <TimelineSeparator>
                                        <TimelineDot color={
                                            rec.priority === 'high' ? 'error' : 
                                            rec.priority === 'medium' ? 'warning' : 'success'
                                        }>
                                            {rec.priority === 'high' ? <Warning /> : <CheckCircle />}
                                        </TimelineDot>
                                        {index < aiData.recommendations.length - 1 && <TimelineConnector />}
                                    </TimelineSeparator>
                                    <TimelineContent>
                                        <Typography variant="body2">
                                            {rec.action}
                                        </Typography>
                                        <Chip 
                                            label={rec.priority.toUpperCase()}
                                            size="small"
                                            color={
                                                rec.priority === 'high' ? 'error' : 
                                                rec.priority === 'medium' ? 'warning' : 'success'
                                            }
                                            sx={{ mt: 0.5 }}
                                        />
                                    </TimelineContent>
                                </TimelineItem>
                            ))}
                        </Timeline>
                    </Paper>
                </Grid>

                {/* AI Decision Factors */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            🧠 AI Decision Factors
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {['Real-time Traffic', 'Historical Patterns', 'Road Conditions', 
                              'Weather Data', 'Event Detection', 'Signal Timing', 
                              'Vehicle Density', 'Time of Day'].map((factor, index) => (
                                <Tooltip key={index} title={`Weight: ${85 - index * 5}%`}>
                                    <Chip
                                        label={factor}
                                        variant="outlined"
                                        sx={{ m: 0.5 }}
                                    />
                                </Tooltip>
                            ))}
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                AI Model Confidence
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={aiData.metrics.confidence}
                                sx={{ height: 10, borderRadius: 5 }}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default AIVisualization;
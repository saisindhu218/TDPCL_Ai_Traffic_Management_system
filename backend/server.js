const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const ambulanceRoutes = require('./routes/ambulance');
const policeRoutes = require('./routes/police');
const hospitalRoutes = require('./routes/hospital');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Real-time WebSocket handling
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    
    socket.on('ambulance-location-update', (data) => {
        // Broadcast to police and hospital
        io.emit('ambulance-update', data);
    });
    
    socket.on('signal-clearance', (data) => {
        // Broadcast signal clearance updates
        io.emit('traffic-update', data);
    });
    
    socket.on('emergency-alert', (data) => {
        // Alert hospital and police
        io.emit('emergency-broadcast', data);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/police', policeRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Smart Traffic System API Running',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time updates`);
});
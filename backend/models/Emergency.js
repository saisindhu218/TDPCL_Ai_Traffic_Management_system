const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    emergencyId: {
        type: String,
        unique: true,
        default: () => `EMG${Date.now()}${Math.random().toString(36).substr(2, 4)}`
    },
    ambulanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driverName: String,
    vehicleNumber: String,
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    hospitalName: String,
    destination: {
        lat: Number,
        lng: Number,
        address: String
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        address: String
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    estimatedTime: Number, // in minutes
    actualTime: Number, // in minutes
    route: [{
        lat: Number,
        lng: Number,
        timestamp: Date
    }],
    signalsCleared: [{
        signalId: String,
        clearedAt: Date
    }],
    aiRecommendations: [{
        type: String,
        timestamp: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Emergency', emergencySchema);
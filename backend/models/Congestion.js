const mongoose = require('mongoose');

const congestionSchema = new mongoose.Schema({
    signalId: {
        type: String,
        required: true,
        ref: 'TrafficSignal'
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    level: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    severity: {
        type: Number,
        min: 1,
        max: 10,
        default: 1
    },
    cause: {
        type: String,
        enum: ['accident', 'construction', 'event', 'weather', 'normal', 'other'],
        default: 'normal'
    },
    reporter: {
        type: String,
        enum: ['police', 'system', 'user', 'camera'],
        default: 'system'
    },
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    imageUrl: String,
    description: String,
    estimatedClearTime: Date,
    actualClearTime: Date,
    affectedVehicles: {
        type: Number,
        default: 0
    },
    aiPredicted: {
        type: Boolean,
        default: false
    },
    confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    resolved: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for geospatial queries
congestionSchema.index({ location: '2dsphere' });
congestionSchema.index({ signalId: 1, timestamp: -1 });
congestionSchema.index({ resolved: 1, level: 1 });

module.exports = mongoose.model('Congestion', congestionSchema);
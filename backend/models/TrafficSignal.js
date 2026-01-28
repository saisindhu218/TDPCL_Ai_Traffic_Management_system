const mongoose = require('mongoose');

const trafficSignalSchema = new mongoose.Schema({
    signalId: {
        type: String,
        unique: true,
        required: true
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    lanes: [{
        direction: {
            type: String,
            enum: ['north', 'south', 'east', 'west']
        },
        status: {
            type: String,
            enum: ['normal', 'cleared', 'blocked'],
            default: 'normal'
        },
        clearanceTime: Date
    }],
    congestionLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isPriority: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('TrafficSignal', trafficSignalSchema);
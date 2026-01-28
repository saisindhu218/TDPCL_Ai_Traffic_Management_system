const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    },
    emergencyContact: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    bedsAvailable: {
        type: Number,
        default: 0
    },
    icuBeds: {
        type: Number,
        default: 0
    },
    specialties: [{
        type: String
    }],
    emergencyServices: [{
        type: String,
        enum: ['Trauma', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Burn']
    }],
    helipadAvailable: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    distanceFromCenter: {
        type: Number // in km
    },
    estimatedResponseTime: {
        type: Number // in minutes
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
hospitalSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create 2dsphere index for location-based queries
hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
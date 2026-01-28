const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['ambulance', 'police', 'hospital', 'admin'],
        required: true
    },
    vehicleNumber: {
        type: String,
        required: function() { return this.role === 'ambulance'; }
    },
    hospitalName: {
        type: String,
        required: function() { return this.role === 'hospital'; }
    },
    stationName: {
        type: String,
        required: function() { return this.role === 'police'; }
    },
    isActive: {
        type: Boolean,
        default: false
    },
    location: {
        lat: Number,
        lng: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
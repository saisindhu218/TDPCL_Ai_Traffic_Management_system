const mongoose = require('mongoose');

const trafficDataSchema = new mongoose.Schema({
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  congestion_level: { type: Number, min: 0, max: 100, required: true },
  source: { type: String, enum: ['police', 'simulation', 'system'], default: 'simulation' },
  emergency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' }
}, {
  timestamps: true
});

module.exports = mongoose.model('TrafficData', trafficDataSchema);

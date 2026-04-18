const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  emergency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency' },
  type: {
    type: String,
    enum: ['EMERGENCY_STARTED', 'LOCATION_UPDATED', 'ROUTE_UPDATED', 'TRAFFIC_INPUT', 'EMERGENCY_ENDED', 'LANE_CLEARED'],
    required: true
  },
  actor_role: { type: String, enum: ['ambulance', 'police', 'hospital', 'admin', 'system'], default: 'system' },
  message: { type: String, required: true },
  payload: { type: Object }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemLog', systemLogSchema);

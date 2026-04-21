const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  ambulance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  route: [{
    lat: Number,
    lng: Number
  }],
  eta: { type: String },
  current_location: {
    lat: Number,
    lng: Number
  },
  destination: {
    lat: Number,
    lng: Number
  },
  hospital_code: { type: String },
  hospital_name: { type: String },
  incident_note: { type: String, default: '' },
  cleared_signals: [{
    id: String,
    signal_name: String,
    lane_direction: String,
    from: String,
    to: String,
    sequence: Number,
    status: String
  }],
  congestion_level: { type: Number, min: 0, max: 100, default: 0 },
  ai_workflow: [{ type: String }],
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Emergency', emergencySchema);

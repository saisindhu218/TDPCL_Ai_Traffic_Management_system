const mongoose = require('mongoose');

const routeRecordSchema = new mongoose.Schema({
  ambulance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emergency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Emergency', required: true },
  coordinates: [{ lat: Number, lng: Number }],
  eta: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('RouteRecord', routeRecordSchema);

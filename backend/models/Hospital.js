const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  area: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  contact_number: { type: String, required: true },
  emergency_number: { type: String },
  trauma_level: { type: String, default: 'Level 2' },
  available_beds: { type: Number, default: 0 },
  icu_beds: { type: Number, default: 0 },
  ventilators: { type: Number, default: 0 },
  specialties: [{ type: String }],
  status: { type: String, enum: ['available', 'busy', 'full'], default: 'available' },
  notes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hospital', hospitalSchema);
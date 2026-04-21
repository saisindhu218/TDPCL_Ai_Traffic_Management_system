const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ambulance', 'police', 'hospital', 'admin'], required: true },
  ambulance_profile: {
    driver_name: { type: String },
    driver_email: { type: String },
    phone: { type: String },
    date_of_birth: { type: String },
    blood_group: { type: String },
    address: { type: String },
    driver_license_number: { type: String },
    driver_license_expiry: { type: String },
    ambulance_vehicle_number: { type: String },
    ambulance_unit_code: { type: String },
    years_of_experience: { type: Number, default: 0 },
    shift_type: { type: String },
    base_hospital: { type: String },
    emergency_contact_name: { type: String },
    emergency_contact_phone: { type: String },
    profile_note: { type: String }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

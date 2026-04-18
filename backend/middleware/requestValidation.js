function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isLatLng(value) {
  return value && isNumber(value.lat) && isNumber(value.lng);
}

function validateRegister(req, res, next) {
  const { name, email, password, role } = req.body;
  const allowedRoles = ['ambulance', 'police', 'hospital', 'admin'];

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(role)) {
    return res.status(400).json({ msg: 'name, email, password and role are required' });
  }

  if (password.trim().length < 6) {
    return res.status(400).json({ msg: 'password must be at least 6 characters' });
  }

  if (!allowedRoles.includes(role.trim().toLowerCase())) {
    return res.status(400).json({ msg: 'invalid role' });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.password = password;
  req.body.role = role.trim().toLowerCase();
  return next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ msg: 'email and password are required' });
  }

  req.body.email = email.trim().toLowerCase();
  return next();
}

function validateStartEmergency(req, res, next) {
  const { current_location, destination, hospital_code, incident_note } = req.body;

  if (!isLatLng(current_location)) {
    return res.status(400).json({ msg: 'current_location with lat/lng is required' });
  }

  if (destination && !isLatLng(destination)) {
    return res.status(400).json({ msg: 'destination must include valid lat/lng when provided' });
  }

  if (hospital_code && !isNonEmptyString(hospital_code)) {
    return res.status(400).json({ msg: 'hospital_code must be a non-empty string' });
  }

  if (incident_note && typeof incident_note !== 'string') {
    return res.status(400).json({ msg: 'incident_note must be a string' });
  }

  return next();
}

function validateUpdateLocation(req, res, next) {
  const { emergency_id, current_location } = req.body;
  if (!isNonEmptyString(emergency_id)) {
    return res.status(400).json({ msg: 'emergency_id is required' });
  }

  if (!isLatLng(current_location)) {
    return res.status(400).json({ msg: 'current_location with lat/lng is required' });
  }

  return next();
}

function validateTrafficInput(req, res, next) {
  const { location, congestion_level } = req.body;

  if (!isLatLng(location)) {
    return res.status(400).json({ msg: 'location with lat/lng is required' });
  }

  if (!isNumber(congestion_level) || congestion_level < 0 || congestion_level > 100) {
    return res.status(400).json({ msg: 'congestion_level must be a number from 0 to 100' });
  }

  return next();
}

function validateLaneClearance(req, res, next) {
  const { emergency_id, signal_id, lane_name, note } = req.body;

  if (!isNonEmptyString(emergency_id)) {
    return res.status(400).json({ msg: 'emergency_id is required' });
  }

  if (!isNonEmptyString(signal_id) && !isNonEmptyString(lane_name)) {
    return res.status(400).json({ msg: 'signal_id or lane_name is required' });
  }

  if (note && typeof note !== 'string') {
    return res.status(400).json({ msg: 'note must be a string' });
  }

  return next();
}

function validateEmergencyIdParam(req, res, next) {
  const { emergencyId } = req.params;
  if (!/^[a-f\d]{24}$/i.test(emergencyId || '')) {
    return res.status(400).json({ msg: 'Invalid emergencyId parameter' });
  }

  return next();
}

function validateEndEmergency(req, res, next) {
  const { emergency_id } = req.body;
  if (!/^[a-f\d]{24}$/i.test(emergency_id || '')) {
    return res.status(400).json({ msg: 'Invalid emergency_id' });
  }

  return next();
}

function validateHospitalCodeParam(req, res, next) {
  const { code } = req.params;
  if (!isNonEmptyString(code)) {
    return res.status(400).json({ msg: 'Hospital code is required' });
  }

  req.params.code = code.trim().toLowerCase();
  return next();
}

function validateSystemLogQuery(req, res, next) {
  if (req.query.limit === undefined) {
    return next();
  }

  const numericLimit = Number(req.query.limit);
  if (!isInteger(numericLimit) || numericLimit <= 0 || numericLimit > 200) {
    return res.status(400).json({ msg: 'limit must be an integer between 1 and 200' });
  }

  req.query.limit = numericLimit;
  return next();
}

function optionalValueProvided(value) {
  return value !== undefined;
}

function hasRequiredHospitalFields(payload) {
  return isNonEmptyString(payload.code)
    && isNonEmptyString(payload.name)
    && isNonEmptyString(payload.address)
    && isNonEmptyString(payload.area)
    && isNumber(payload.lat)
    && isNumber(payload.lng)
    && isNonEmptyString(payload.contact_number);
}

function getHospitalValidationError(payload) {
  const allowedStatuses = ['available', 'busy', 'full'];

  if (optionalValueProvided(payload.status) && !allowedStatuses.includes(payload.status)) {
    return 'status must be one of available, busy, full';
  }

  const integerFields = ['available_beds', 'icu_beds', 'ventilators'];
  for (const fieldName of integerFields) {
    const value = payload[fieldName];
    if (optionalValueProvided(value) && (!isInteger(value) || value < 0)) {
      return `${fieldName} must be a non-negative integer`;
    }
  }

  if (optionalValueProvided(payload.specialties) && !Array.isArray(payload.specialties)) {
    return 'specialties must be an array of strings';
  }

  if (Array.isArray(payload.specialties) && payload.specialties.some((item) => typeof item !== 'string')) {
    return 'specialties must be an array of strings';
  }

  const stringFields = ['emergency_number', 'trauma_level', 'notes'];
  for (const fieldName of stringFields) {
    if (optionalValueProvided(payload[fieldName]) && typeof payload[fieldName] !== 'string') {
      return `${fieldName} must be a string`;
    }
  }

  return null;
}

function validateUpsertHospital(req, res, next) {
  const {
    code,
    name,
    address,
    area,
    lat,
    lng,
    contact_number,
    emergency_number,
    trauma_level,
    available_beds,
    icu_beds,
    ventilators,
    specialties,
    status,
    notes
  } = req.body;

  if (!hasRequiredHospitalFields({ code, name, address, area, lat, lng, contact_number })) {
    return res.status(400).json({ msg: 'Required hospital fields are missing or invalid' });
  }

  const validationError = getHospitalValidationError({
    emergency_number,
    trauma_level,
    available_beds,
    icu_beds,
    ventilators,
    specialties,
    status,
    notes
  });

  if (validationError) {
    return res.status(400).json({ msg: validationError });
  }

  req.body.code = code.trim().toLowerCase();
  req.body.name = name.trim();
  req.body.address = address.trim();
  req.body.area = area.trim();
  req.body.contact_number = contact_number.trim();

  if (typeof emergency_number === 'string') {
    req.body.emergency_number = emergency_number.trim();
  }

  if (typeof trauma_level === 'string') {
    req.body.trauma_level = trauma_level.trim();
  }

  if (typeof status === 'string') {
    req.body.status = status.trim().toLowerCase();
  }

  return next();
}

function validateAmbulanceProfileUpdate(req, res, next) {
  const allowedFields = new Set([
    'phone',
    'date_of_birth',
    'blood_group',
    'address',
    'driver_license_number',
    'driver_license_expiry',
    'ambulance_vehicle_number',
    'ambulance_unit_code',
    'years_of_experience',
    'shift_type',
    'base_hospital',
    'emergency_contact_name',
    'emergency_contact_phone',
    'profile_note'
  ]);

  const incomingKeys = Object.keys(req.body || {});
  const hasAllowedField = incomingKeys.some((key) => allowedFields.has(key));

  if (!hasAllowedField) {
    return res.status(400).json({ msg: 'No valid profile fields provided for update' });
  }

  return next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateStartEmergency,
  validateUpdateLocation,
  validateTrafficInput,
  validateLaneClearance,
  validateEmergencyIdParam,
  validateEndEmergency,
  validateHospitalCodeParam,
  validateSystemLogQuery,
  validateUpsertHospital,
  validateAmbulanceProfileUpdate,
};

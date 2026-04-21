const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Emergency = require('../models/Emergency');
const TrafficData = require('../models/TrafficData');
const RouteRecord = require('../models/RouteRecord');
const SystemLog = require('../models/SystemLog');
const Hospital = require('../models/Hospital');

const { optimizeEmergencyRoute, generateClearancePlan } = require('../services/aiService');
const logger = require('../utils/logger');

function handleControllerError(handler, err, req, res) {
  logger.error('api_controller_error', {
    handler,
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: err.stack
  });

  return res.status(500).json({ msg: 'Server Error', requestId: req.id || null });
}

function signToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured on server');
  }

  const payload = { user: { id: user.id, role: user.role } };
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

async function writeLog({ type, actorRole, message, emergencyId, payload }) {
  await SystemLog.create({
    type,
    actor_role: actorRole || 'system',
    message,
    emergency_id: emergencyId,
    payload
  });
}

function formatLocationLabel(location) {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return 'Unknown';
  }

  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function getActorName(user = {}) {
  return user.name || user.email || user.id || 'Unknown User';
}

function emitEmergencyUpdate(io, updatePayload) {
  io.to('ambulance').emit('ambulance_update', updatePayload);
  io.to('police').emit('police_alert', updatePayload);
  io.to('hospital').emit('hospital_alert', updatePayload);
  io.to('admin').emit('admin_alert', updatePayload);
  io.emit('route_update', updatePayload);
}

function mergeClearedSignalStatuses(previousSignals = [], nextSignals = []) {
  const previousStatusById = new Map();

  previousSignals.forEach((signal) => {
    if (signal?.id) {
      previousStatusById.set(signal.id, signal.status || 'Pending');
    }
  });

  return nextSignals.map((signal) => ({
    ...signal,
    status: previousStatusById.get(signal.id) || signal.status || 'Pending'
  }));
}

function hasDirectionalSignalPlan(signals = []) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return false;
  }

  return signals.some((signal) => Boolean(signal?.lane_direction));
}

async function ensureDirectionalSignalPlan(emergency) {
  if (!emergency || hasDirectionalSignalPlan(emergency.cleared_signals)) {
    return emergency;
  }

  const startLoc = emergency.current_location || emergency.route?.[0];
  const endLoc = emergency.destination || emergency.route?.at(-1);
  if (!startLoc || !endLoc) {
    return emergency;
  }

  const generatedSignals = generateClearancePlan({
    route: emergency.route || [],
    startLoc,
    endLoc,
    congestionLevel: emergency.congestion_level || 50
  });

  emergency.cleared_signals = mergeClearedSignalStatuses(emergency.cleared_signals || [], generatedSignals);
  await emergency.save();
  return emergency;
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ msg: 'name, email, password, and role are required' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({ name, email, password: hashedPassword, role });

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return handleControllerError('register', err, req, res);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return handleControllerError('login', err, req, res);
  }
};

exports.startEmergency = async (req, res) => {
  try {
    const { current_location, destination, hospital_code, incident_note = '' } = req.body;
    const ambulanceId = req.user.id;

    if (!current_location || typeof current_location.lat !== 'number' || typeof current_location.lng !== 'number') {
      return res.status(400).json({ msg: 'current_location with lat/lng is required' });
    }

    const nearbyTraffic = await TrafficData.find({
      createdAt: { $gte: new Date(Date.now() - 20 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(40);

    const existingActiveEmergencies = await Emergency.find({
      ambulance_id: ambulanceId,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (existingActiveEmergencies.length > 0) {
      const [latestActiveEmergency, ...duplicateActiveEmergencies] = existingActiveEmergencies;

      if (duplicateActiveEmergencies.length > 0) {
        await Emergency.updateMany(
          { _id: { $in: duplicateActiveEmergencies.map((emergency) => emergency._id) } },
          {
            $set: {
              status: 'resolved',
              end_time: new Date()
            }
          }
        );
      }

      const normalizedEmergency = await ensureDirectionalSignalPlan(latestActiveEmergency);
      return res.json(normalizedEmergency);
    }

    const aiResult = await optimizeEmergencyRoute({
      startLoc: current_location,
      endLoc: destination,
      nearbyTraffic
    });

    const targetHospital = hospital_code ? await Hospital.findOne({ code: hospital_code }) : null;
    const targetDestination = destination || (targetHospital ? { lat: targetHospital.lat, lng: targetHospital.lng } : aiResult.route?.at(-1));

    const emergency = await Emergency.create({
      ambulance_id: ambulanceId,
      status: 'active',
      current_location,
      destination: targetDestination,
      hospital_code: targetHospital?.code || hospital_code || '',
      hospital_name: targetHospital?.name || '',
      incident_note,
      route: aiResult.route,
      eta: aiResult.eta,
      cleared_signals: aiResult.cleared_signals,
      congestion_level: aiResult.congestionLevel,
      ai_workflow: aiResult.aiWorkflow
    });

    await RouteRecord.create({
      ambulance_id: ambulanceId,
      emergency_id: emergency._id,
      coordinates: aiResult.route,
      eta: aiResult.eta
    });

    await writeLog({
      type: 'EMERGENCY_STARTED',
      actorRole: req.user.role,
      message: 'Emergency activated by ambulance unit',
      emergencyId: emergency._id,
      payload: {
        location: current_location,
        hospital_code: emergency.hospital_code,
        hospital_name: emergency.hospital_name,
        incident_note,
        congestion_level: aiResult.congestionLevel,
        eta: aiResult.eta,
        ride_from: formatLocationLabel(current_location),
        ride_to: emergency.hospital_name || formatLocationLabel(targetDestination),
        performed_by: getActorName(req.user),
        performed_by_id: req.user.id
      }
    });

    const io = req.app.get('io');
    const updatePayload = {
      emergency_id: emergency._id,
      status: emergency.status,
      route: emergency.route,
      eta: emergency.eta,
      congestion_level: emergency.congestion_level,
      ai_workflow: emergency.ai_workflow,
      cleared_signals: emergency.cleared_signals,
      ambulance_location: emergency.current_location,
      hospital_code: emergency.hospital_code,
      hospital_name: emergency.hospital_name,
      incident_note: emergency.incident_note,
      message: 'Ambulance emergency started. Priority corridor activated.'
    };

    emitEmergencyUpdate(io, updatePayload);
    if (emergency.hospital_code) {
      io.to(`hospital_${emergency.hospital_code}`).emit('hospital_alert', updatePayload);
    }
    return res.json(emergency);
  } catch (err) {
    return handleControllerError('startEmergency', err, req, res);
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { emergency_id, current_location } = req.body;
    if (!mongoose.Types.ObjectId.isValid(emergency_id)) {
      return res.status(400).json({ msg: 'Invalid emergency_id' });
    }

    if (!current_location || typeof current_location.lat !== 'number' || typeof current_location.lng !== 'number') {
      return res.status(400).json({ msg: 'current_location with lat/lng is required' });
    }

    const emergency = await Emergency.findById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ msg: 'Emergency not found' });
    }

    if (req.user.role === 'ambulance' && String(emergency.ambulance_id) !== req.user.id) {
      return res.status(403).json({ msg: 'Forbidden: this emergency belongs to another ambulance' });
    }

    const nearbyTraffic = await TrafficData.find({
      createdAt: { $gte: new Date(Date.now() - 20 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(40);

    const aiResult = await optimizeEmergencyRoute({
      startLoc: current_location,
      endLoc: emergency.destination || emergency.route?.at(-1),
      nearbyTraffic
    });

    emergency.current_location = current_location;
    emergency.route = aiResult.route;
    emergency.eta = aiResult.eta;
    emergency.cleared_signals = mergeClearedSignalStatuses(emergency.cleared_signals, aiResult.cleared_signals);
    emergency.congestion_level = aiResult.congestionLevel;
    emergency.ai_workflow = aiResult.aiWorkflow;
    await emergency.save();

    await RouteRecord.create({
      ambulance_id: emergency.ambulance_id,
      emergency_id: emergency._id,
      coordinates: aiResult.route,
      eta: aiResult.eta
    });

    await writeLog({
      type: 'LOCATION_UPDATED',
      actorRole: req.user.role,
      message: 'Ambulance location updated and AI route re-optimized',
      emergencyId: emergency._id,
      payload: {
        location: current_location,
        eta: aiResult.eta,
        congestion_level: aiResult.congestionLevel,
        ride_to: emergency.hospital_name || formatLocationLabel(emergency.destination),
        performed_by: getActorName(req.user),
        performed_by_id: req.user.id
      }
    });

    const io = req.app.get('io');
    const updatePayload = {
      emergency_id: emergency._id,
      status: emergency.status,
      route: emergency.route,
      eta: emergency.eta,
      congestion_level: emergency.congestion_level,
      ai_workflow: emergency.ai_workflow,
      cleared_signals: emergency.cleared_signals,
      ambulance_location: emergency.current_location,
      hospital_code: emergency.hospital_code,
      hospital_name: emergency.hospital_name,
      incident_note: emergency.incident_note
    };

    emitEmergencyUpdate(io, updatePayload);
    return res.json(emergency);
  } catch (err) {
    return handleControllerError('updateLocation', err, req, res);
  }
};

exports.endEmergency = async (req, res) => {
  try {
    const { emergency_id } = req.body;
    const emergency = await Emergency.findById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ msg: 'Emergency not found' });
    }

    if (req.user.role === 'ambulance' && String(emergency.ambulance_id) !== req.user.id) {
      return res.status(403).json({ msg: 'Forbidden: this emergency belongs to another ambulance' });
    }

    emergency.status = 'resolved';
    emergency.end_time = Date.now();
    await emergency.save();

    const tripStartTime = emergency.start_time || emergency.createdAt;
    const tripDurationMinutes = tripStartTime
      ? Math.max(1, Math.round((new Date(emergency.end_time).getTime() - new Date(tripStartTime).getTime()) / 60000))
      : null;
    const startPoint = emergency.route?.[0] || emergency.current_location;

    await writeLog({
      type: 'EMERGENCY_ENDED',
      actorRole: req.user.role,
      message: 'Emergency closed and corridor reset',
      emergencyId: emergency._id,
      payload: {
        start_time: tripStartTime,
        end_time: emergency.end_time,
        duration_minutes: tripDurationMinutes,
        ride_from: formatLocationLabel(startPoint),
        ride_to: emergency.hospital_name || formatLocationLabel(emergency.destination),
        performed_by: getActorName(req.user),
        performed_by_id: req.user.id
      }
    });

    const io = req.app.get('io');

    if (emergency.hospital_code) {
      io.to(`hospital_${emergency.hospital_code}`).emit('hospital_arrival', {
        emergency_id: emergency._id,
        status: emergency.status,
        hospital_code: emergency.hospital_code,
        hospital_name: emergency.hospital_name,
        ambulance_id: emergency.ambulance_id,
        incident_note: emergency.incident_note,
        arrived_at: emergency.end_time,
        message: `Ambulance arrived at ${emergency.hospital_name || emergency.hospital_code}.`
      });
    }

    io.emit('emergency_resolved', { emergency_id: emergency._id });

    return res.json({ msg: 'Emergency ended successfully', emergency });
  } catch (err) {
    return handleControllerError('endEmergency', err, req, res);
  }
};

exports.getActiveEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'active' })
      .populate('ambulance_id', 'name email role')
      .sort({ createdAt: -1 });

    await Promise.all(emergencies.map((emergency) => ensureDirectionalSignalPlan(emergency)));

    return res.json(emergencies);
  } catch (err) {
    return handleControllerError('getActiveEmergencies', err, req, res);
  }
};

exports.getEmergencyHistory = async (req, res) => {
  try {
    const baseQuery = { status: 'resolved' };

    // Ambulance users should receive their own complete history rather than a globally truncated list.
    if (req.user?.role === 'ambulance' && req.user?.id) {
      baseQuery.ambulance_id = req.user.id;
    }

    const [emergencies, totalResolvedCount] = await Promise.all([
      Emergency.find(baseQuery)
      .populate('ambulance_id', 'name email role')
      .sort({ end_time: -1, createdAt: -1 })
      .limit(200),
      Emergency.countDocuments(baseQuery)
    ]);

    res.set('x-total-count', String(totalResolvedCount));

    return res.json(emergencies);
  } catch (err) {
    return handleControllerError('getEmergencyHistory', err, req, res);
  }
};

exports.getRoute = async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.emergencyId);
    if (!emergency) {
      return res.status(404).json({ msg: 'Emergency not found' });
    }

    return res.json({
      route: emergency.route,
      eta: emergency.eta,
      congestion_level: emergency.congestion_level,
      ai_workflow: emergency.ai_workflow,
      cleared_signals: emergency.cleared_signals
    });
  } catch (err) {
    return handleControllerError('getRoute', err, req, res);
  }
};

exports.inputTrafficData = async (req, res) => {
  try {
    const { location, congestion_level, emergency_id } = req.body;

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ msg: 'location with lat/lng is required' });
    }

    if (typeof congestion_level !== 'number') {
      return res.status(400).json({ msg: 'congestion_level must be a number from 0 to 100' });
    }

    const trafficEntry = await TrafficData.create({
      location,
      congestion_level: Math.max(0, Math.min(100, congestion_level)),
      source: req.user.role === 'police' ? 'police' : 'system',
      emergency_id
    });

    await writeLog({
      type: 'TRAFFIC_INPUT',
      actorRole: req.user.role,
      message: 'Traffic congestion update submitted',
      emergencyId: emergency_id,
      payload: {
        ...trafficEntry.toObject(),
        performed_by: getActorName(req.user),
        performed_by_id: req.user.id
      }
    });

    const io = req.app.get('io');
    io.to('admin').emit('traffic_update', trafficEntry);
    io.to('police').emit('traffic_update', trafficEntry);

    return res.json(trafficEntry);
  } catch (err) {
    return handleControllerError('inputTrafficData', err, req, res);
  }
};

exports.recordLaneClearance = async (req, res) => {
  try {
    const { emergency_id, signal_id, lane_name, note = '' } = req.body;

    if (!emergency_id) {
      return res.status(400).json({ msg: 'emergency_id is required' });
    }

    if (!signal_id && !lane_name) {
      return res.status(400).json({ msg: 'signal_id or lane_name is required' });
    }

    const emergency = await Emergency.findById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ msg: 'Emergency not found' });
    }

    const label = lane_name || signal_id;

    if (!Array.isArray(emergency.cleared_signals)) {
      emergency.cleared_signals = [];
    }

    const targetIndex = emergency.cleared_signals.findIndex((signal) => signal.id === label || signal.id === signal_id || signal.id === lane_name);
    if (targetIndex >= 0) {
      emergency.cleared_signals[targetIndex].status = 'Cleared';
    } else {
      emergency.cleared_signals.push({
        id: label,
        status: 'Cleared'
      });
    }

    await emergency.save();

    const logEntry = await SystemLog.create({
      emergency_id,
      type: 'LANE_CLEARED',
      actor_role: req.user.role,
      message: `Lane cleared: ${label}`,
      payload: {
        signal_id: signal_id || '',
        lane_name: lane_name || '',
        note,
        emergency_id,
        hospital_code: emergency.hospital_code || '',
        hospital_name: emergency.hospital_name || '',
        performed_by: getActorName(req.user),
        performed_by_id: req.user.id
      }
    });

    const io = req.app.get('io');
    io.to('police').emit('lane_cleared', {
      emergency_id,
      signal_id: signal_id || '',
      lane_name: lane_name || '',
      note,
      createdAt: logEntry.createdAt,
      message: logEntry.message
    });

    emitEmergencyUpdate(io, {
      emergency_id: emergency._id,
      status: emergency.status,
      route: emergency.route,
      eta: emergency.eta,
      congestion_level: emergency.congestion_level,
      ai_workflow: emergency.ai_workflow,
      cleared_signals: emergency.cleared_signals,
      ambulance_location: emergency.current_location,
      hospital_code: emergency.hospital_code,
      hospital_name: emergency.hospital_name,
      incident_note: emergency.incident_note,
      message: `Lane cleared: ${label}`
    });

    return res.json(logEntry);
  } catch (err) {
    return handleControllerError('recordLaneClearance', err, req, res);
  }
};

exports.getLaneClearanceHistory = async (req, res) => {
  try {
    const manualRecords = await SystemLog.find({ type: 'LANE_CLEARED' })
      .sort({ createdAt: -1 })
      .limit(30);

    const legacyEmergencies = await Emergency.find({
      status: 'resolved',
      cleared_signals: { $exists: true, $ne: [] }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(30)
      .select('_id status hospital_code hospital_name cleared_signals createdAt updatedAt incident_note');

    const legacyRecords = legacyEmergencies.flatMap((emergency) => (
      (emergency.cleared_signals || []).map((signal) => ({
        _id: `${emergency._id}-${signal.id}`,
        emergency_id: emergency._id,
        type: 'LANE_CLEARED',
        actor_role: 'system',
        message: `Recommended clear: ${signal.id}`,
        payload: {
          signal_id: signal.id,
          lane_name: signal.id,
          note: emergency.incident_note || '',
          emergency_id: emergency._id,
          hospital_code: emergency.hospital_code || '',
          hospital_name: emergency.hospital_name || '',
          legacy: true
        },
        createdAt: emergency.updatedAt || emergency.createdAt,
        updatedAt: emergency.updatedAt || emergency.createdAt,
        legacy: true
      }))
    ));

    const mergedRecords = [];
    const seenKeys = new Set();

    [...manualRecords, ...legacyRecords].forEach((entry) => {
      const key = `${entry.emergency_id || entry.payload?.emergency_id || entry._id}-${entry.payload?.signal_id || entry.payload?.lane_name || entry._id}`;
      if (seenKeys.has(key)) {
        return;
      }

      seenKeys.add(key);
      mergedRecords.push(entry);
    });

    const sortedRecords = [...mergedRecords];
    sortedRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sortedRecords);
  } catch (err) {
    return handleControllerError('getLaneClearanceHistory', err, req, res);
  }
};

exports.getLiveTraffic = async (req, res) => {
  try {
    const records = await TrafficData.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(100);

    return res.json(records);
  } catch (err) {
    return handleControllerError('getLiveTraffic', err, req, res);
  }
};

exports.getAdminAnalytics = async (req, res) => {
  try {
    const [
      activeEmergencies,
      totalEmergencies,
      totalUsers,
      trafficPoints,
      totalRouteRecords,
      totalEvents,
      recentLogs
    ] = await Promise.all([
      Emergency.countDocuments({ status: 'active' }),
      Emergency.countDocuments(),
      User.countDocuments(),
      TrafficData.countDocuments(),
      RouteRecord.countDocuments(),
      SystemLog.countDocuments(),
      SystemLog.find().sort({ createdAt: -1 }).limit(25)
    ]);

    const resolvedTotalEvents = Math.max(
      Number(totalEvents) || 0,
      Array.isArray(recentLogs) ? recentLogs.length : 0,
      Number(totalEmergencies) || 0
    );

    return res.json({
      activeEmergencies,
      totalEmergencies,
      totalUsers,
      trafficPoints,
      totalRouteRecords,
      totalEvents: resolvedTotalEvents,
      logs: recentLogs
    });
  } catch (err) {
    return handleControllerError('getAdminAnalytics', err, req, res);
  }
};

exports.getUsers = async (_req, res) => {
  try {
    const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    return handleControllerError('getUsers', err, req, res);
  }
};

exports.getSystemLogs = async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 100);
    const logs = await SystemLog.find().sort({ createdAt: -1 }).limit(limit);
    return res.json(logs);
  } catch (err) {
    return handleControllerError('getSystemLogs', err, req, res);
  }
};

exports.getHospitals = async (_req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
    return res.json(hospitals);
  } catch (err) {
    return handleControllerError('getHospitals', err, req, res);
  }
};

exports.getHospitalByCode = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ code: req.params.code });
    if (!hospital) {
      return res.status(404).json({ msg: 'Hospital not found' });
    }

    return res.json(hospital);
  } catch (err) {
    return handleControllerError('getHospitalByCode', err, req, res);
  }
};

exports.upsertHospital = async (req, res) => {
  try {
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

    if (!code || !name || !address || !area || typeof lat !== 'number' || typeof lng !== 'number' || !contact_number) {
      return res.status(400).json({ msg: 'Required hospital fields are missing' });
    }

    const hospital = await Hospital.findOneAndUpdate(
      { code },
      {
        $set: {
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
        }
      },
      { upsert: true, runValidators: true, returnDocument: 'after' }
    );

    return res.json(hospital);
  } catch (err) {
    return handleControllerError('upsertHospital', err, req, res);
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const profileDefaults = {
      driver_name: '',
      driver_email: '',
      phone: '',
      date_of_birth: '',
      blood_group: '',
      address: '',
      driver_license_number: '',
      driver_license_expiry: '',
      ambulance_vehicle_number: '',
      ambulance_unit_code: '',
      years_of_experience: 0,
      shift_type: '',
      base_hospital: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      profile_note: ''
    };

    const plainUser = user.toObject();
    return res.json({
      ...plainUser,
      ambulance_profile: {
        ...profileDefaults,
        ...plainUser.ambulance_profile
      }
    });
  } catch (err) {
    return handleControllerError('getMyProfile', err, req, res);
  }
};

exports.updateAmbulanceProfile = async (req, res) => {
  try {
    const allowedFields = [
      'driver_name',
      'driver_email',
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
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (Object.hasOwn(req.body, field)) {
        updateData[`ambulance_profile.${field}`] = req.body[field];
      }
    });

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ msg: 'No valid profile fields provided for update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const profileDefaults = {
      driver_name: '',
      driver_email: '',
      phone: '',
      date_of_birth: '',
      blood_group: '',
      address: '',
      driver_license_number: '',
      driver_license_expiry: '',
      ambulance_vehicle_number: '',
      ambulance_unit_code: '',
      years_of_experience: 0,
      shift_type: '',
      base_hospital: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      profile_note: ''
    };

    return res.json({
      msg: 'Ambulance profile updated successfully',
      user: {
        ...user.toObject(),
        ambulance_profile: {
          ...profileDefaults,
          ...user.ambulance_profile
        }
      }
    });
  } catch (err) {
    return handleControllerError('updateAmbulanceProfile', err, req, res);
  }
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Emergency = require('../models/Emergency');
const TrafficData = require('../models/TrafficData');
const RouteRecord = require('../models/RouteRecord');
const SystemLog = require('../models/SystemLog');
const Hospital = require('../models/Hospital');

const { optimizeEmergencyRoute } = require('../services/aiService');

function signToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured on server');
  }

  const payload = { user: { id: user.id, role: user.role } };
  return jwt.sign(payload, jwtSecret, { expiresIn: '12h' });
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

function emitEmergencyUpdate(io, updatePayload) {
  io.to('ambulance').emit('ambulance_update', updatePayload);
  io.to('police').emit('police_alert', updatePayload);
  io.to('hospital').emit('hospital_alert', updatePayload);
  io.to('admin').emit('admin_alert', updatePayload);
  io.emit('route_update', updatePayload);
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
    console.error(err.message);
    return res.status(500).send('Server Error');
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
    console.error(err.message);
    return res.status(500).send('Server Error');
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

      return res.json(latestActiveEmergency);
    }

    const aiResult = await optimizeEmergencyRoute({
      startLoc: current_location,
      endLoc: destination,
      nearbyTraffic
    });

    const targetHospital = hospital_code ? await Hospital.findOne({ code: hospital_code }) : null;
    const targetDestination = destination || (targetHospital ? { lat: targetHospital.lat, lng: targetHospital.lng } : aiResult.route?.[aiResult.route.length - 1]);

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
        eta: aiResult.eta
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
    console.error(err.message);
    return res.status(500).send('Server Error');
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
      endLoc: emergency.destination || (emergency.route?.length ? emergency.route[emergency.route.length - 1] : undefined),
      nearbyTraffic
    });

    emergency.current_location = current_location;
    emergency.route = aiResult.route;
    emergency.eta = aiResult.eta;
    emergency.cleared_signals = aiResult.cleared_signals;
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
        congestion_level: aiResult.congestionLevel
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
    console.error(err.message);
    return res.status(500).send('Server Error');
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

    await writeLog({
      type: 'EMERGENCY_ENDED',
      actorRole: req.user.role,
      message: 'Emergency closed and corridor reset',
      emergencyId: emergency._id,
      payload: {
        end_time: emergency.end_time
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
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getActiveEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'active' })
      .populate('ambulance_id', 'name email role')
      .sort({ createdAt: -1 });

    return res.json(emergencies);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getEmergencyHistory = async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'resolved' })
      .populate('ambulance_id', 'name email role')
      .sort({ end_time: -1, createdAt: -1 })
      .limit(30);

    return res.json(emergencies);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
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
    console.error(err.message);
    return res.status(500).send('Server Error');
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
      payload: trafficEntry
    });

    const io = req.app.get('io');
    io.to('admin').emit('traffic_update', trafficEntry);
    io.to('police').emit('traffic_update', trafficEntry);

    return res.json(trafficEntry);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
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
        hospital_name: emergency.hospital_name || ''
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

    return res.json(logEntry);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
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
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getLiveTraffic = async (req, res) => {
  try {
    const records = await TrafficData.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(100);

    return res.json(records);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
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
      recentLogs
    ] = await Promise.all([
      Emergency.countDocuments({ status: 'active' }),
      Emergency.countDocuments(),
      User.countDocuments(),
      TrafficData.countDocuments(),
      RouteRecord.countDocuments(),
      SystemLog.find().sort({ createdAt: -1 }).limit(25)
    ]);

    return res.json({
      activeEmergencies,
      totalEmergencies,
      totalUsers,
      trafficPoints,
      totalRouteRecords,
      logs: recentLogs
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getUsers = async (_req, res) => {
  try {
    const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getSystemLogs = async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 100);
    const logs = await SystemLog.find().sort({ createdAt: -1 }).limit(limit);
    return res.json(logs);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getHospitals = async (_req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
    return res.json(hospitals);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
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
    console.error(err.message);
    return res.status(500).send('Server Error');
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
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

exports.updateAmbulanceProfile = async (req, res) => {
  try {
    const allowedFields = [
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

    return res.json({ msg: 'Ambulance profile updated successfully', user });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
};

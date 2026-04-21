const jwt = require('jsonwebtoken');
const User = require('../models/User');

function normalizeRole(role) {
  if (typeof role !== 'string') {
    return '';
  }

  const normalized = role.trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  if (normalized.includes('ambulance') || ['paramedic', 'emt', 'ambulance_driver', 'ambulance-driver', 'driver'].includes(normalized)) {
    return 'ambulance';
  }

  if (normalized.includes('police') || ['traffic-police', 'traffic_police', 'constable'].includes(normalized)) {
    return 'police';
  }

  if (normalized.includes('hospital') || ['hospital_staff', 'hospital-staff', 'medical'].includes(normalized)) {
    return 'hospital';
  }

  if (normalized.includes('admin')) {
    return 'admin';
  }

  return normalized;
}

module.exports = async function auth(req, res, next) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ msg: 'JWT_SECRET is not configured on server' });
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const decodedUser = decoded?.user || decoded || {};

    if (!decodedUser.id) {
      return res.status(401).json({ msg: 'Token payload is not valid' });
    }

    const dbUser = await User.findById(decodedUser.id).select('_id role name email');
    if (!dbUser) {
      return res.status(401).json({ msg: 'User not found for token' });
    }

    const normalizedRole = normalizeRole(dbUser.role || decodedUser.role);
    if (!normalizedRole) {
      return res.status(401).json({ msg: 'User role is not valid' });
    }

    req.user = {
      id: String(dbUser._id),
      role: normalizedRole,
      name: dbUser.name || decodedUser.name || '',
      email: dbUser.email || decodedUser.email || ''
    };

    return next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('auth_middleware_error', err?.message || err);
    }
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};

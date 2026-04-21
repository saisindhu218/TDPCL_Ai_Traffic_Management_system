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

module.exports = function roleAuth(allowedRoles = []) {
  return function roleMiddleware(req, res, next) {
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole).filter(Boolean);
    const userRole = normalizeRole(req.user?.role);
    const adminOnlyRoute = normalizedAllowedRoles.length > 0 && normalizedAllowedRoles.every((role) => role === 'admin');

    if (!req.user || !userRole) {
      return res.status(403).json({
        msg: 'Forbidden: insufficient role permissions',
        received_role: userRole || null,
        allowed_roles: normalizedAllowedRoles
      });
    }

    if (normalizedAllowedRoles.includes(userRole)) {
      req.user.role = userRole;
      return next();
    }

    // Keep admin-only endpoints strictly protected; operational endpoints are role-tolerant.
    if (!adminOnlyRoute) {
      req.user.role = userRole;
      return next();
    }

    return res.status(403).json({
      msg: 'Forbidden: insufficient role permissions',
      received_role: userRole || null,
      allowed_roles: normalizedAllowedRoles
    });
  };
};

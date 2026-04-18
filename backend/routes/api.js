const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const apiController = require('../controllers/apiController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { authLimiter, emergencyLimiter, trafficLimiter } = require('../middleware/rateLimiters');
const {
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
	validateAmbulanceProfileUpdate
} = require('../middleware/requestValidation');

// Auth Routes
router.post('/auth/register', authLimiter, validateRegister, apiController.register);
router.post('/auth/login', authLimiter, validateLogin, apiController.login);
router.get('/auth/me', auth, apiController.getMyProfile);
router.post('/register', authLimiter, validateRegister, apiController.register);
router.post('/login', authLimiter, validateLogin, apiController.login);

// Ambulance Profile
router.put('/ambulance/profile', auth, roleAuth(['ambulance']), validateAmbulanceProfileUpdate, apiController.updateAmbulanceProfile);

// Emergency Routes
router.post('/emergency/start-emergency', auth, roleAuth(['ambulance', 'admin']), emergencyLimiter, validateStartEmergency, apiController.startEmergency);
router.post('/emergency/end-emergency', auth, roleAuth(['ambulance', 'police', 'admin']), validateEndEmergency, apiController.endEmergency);
router.post('/start-emergency', auth, roleAuth(['ambulance', 'admin']), emergencyLimiter, validateStartEmergency, apiController.startEmergency);
router.post('/end-emergency', auth, roleAuth(['ambulance', 'police', 'admin']), validateEndEmergency, apiController.endEmergency);
router.get('/emergencies/active', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getActiveEmergencies);
router.get('/emergencies/history', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getEmergencyHistory);

// Location & Route Routes
router.post('/location/update-location', auth, roleAuth(['ambulance', 'admin']), emergencyLimiter, validateUpdateLocation, apiController.updateLocation);
router.post('/update-location', auth, roleAuth(['ambulance', 'admin']), emergencyLimiter, validateUpdateLocation, apiController.updateLocation);
router.get('/route/get-route/:emergencyId', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), validateEmergencyIdParam, apiController.getRoute);
router.get('/get-route/:emergencyId', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), validateEmergencyIdParam, apiController.getRoute);

// Traffic
router.post('/traffic/input', auth, roleAuth(['police', 'admin']), trafficLimiter, validateTrafficInput, apiController.inputTrafficData);
router.get('/traffic/live', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getLiveTraffic);

// Police lane clearance history
router.post('/police/lane-clearance', auth, roleAuth(['police', 'admin']), emergencyLimiter, validateLaneClearance, apiController.recordLaneClearance);
router.get('/police/lane-clearance/history', auth, roleAuth(['police', 'admin']), apiController.getLaneClearanceHistory);

// Hospital Records
router.get('/hospitals', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getHospitals);
router.get('/hospitals/:code', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), validateHospitalCodeParam, apiController.getHospitalByCode);
router.post('/hospitals', auth, roleAuth(['admin', 'hospital']), validateUpsertHospital, apiController.upsertHospital);

// Admin
router.get('/admin/analytics', auth, roleAuth(['admin']), apiController.getAdminAnalytics);
router.get('/admin/users', auth, roleAuth(['admin']), apiController.getUsers);
router.get('/admin/logs', auth, roleAuth(['admin']), validateSystemLogQuery, apiController.getSystemLogs);

router.get('/health', (_req, res) => {
	res.json({ status: 'ok', service: 'smart-traffic-backend' });
});

router.get('/ready', (_req, res) => {
	const isDbReady = mongoose.connection.readyState === 1;
	if (!isDbReady) {
		return res.status(503).json({ status: 'not_ready', db: 'disconnected' });
	}

	return res.json({ status: 'ready', db: 'connected' });
});

module.exports = router;

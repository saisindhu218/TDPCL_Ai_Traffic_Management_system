const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Auth Routes
router.post('/auth/register', apiController.register);
router.post('/auth/login', apiController.login);
router.get('/auth/me', auth, apiController.getMyProfile);
router.post('/register', apiController.register);
router.post('/login', apiController.login);

// Ambulance Profile
router.put('/ambulance/profile', auth, roleAuth(['ambulance']), apiController.updateAmbulanceProfile);

// Emergency Routes
router.post('/emergency/start-emergency', auth, roleAuth(['ambulance', 'admin']), apiController.startEmergency);
router.post('/emergency/end-emergency', auth, roleAuth(['ambulance', 'police', 'admin']), apiController.endEmergency);
router.post('/start-emergency', auth, roleAuth(['ambulance', 'admin']), apiController.startEmergency);
router.post('/end-emergency', auth, roleAuth(['ambulance', 'police', 'admin']), apiController.endEmergency);
router.get('/emergencies/active', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getActiveEmergencies);
router.get('/emergencies/history', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getEmergencyHistory);

// Location & Route Routes
router.post('/location/update-location', auth, roleAuth(['ambulance', 'admin']), apiController.updateLocation);
router.post('/update-location', auth, roleAuth(['ambulance', 'admin']), apiController.updateLocation);
router.get('/route/get-route/:emergencyId', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getRoute);
router.get('/get-route/:emergencyId', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getRoute);

// Traffic
router.post('/traffic/input', auth, roleAuth(['police', 'admin']), apiController.inputTrafficData);
router.get('/traffic/live', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getLiveTraffic);

// Police lane clearance history
router.post('/police/lane-clearance', auth, roleAuth(['police', 'admin']), apiController.recordLaneClearance);
router.get('/police/lane-clearance/history', auth, roleAuth(['police', 'admin']), apiController.getLaneClearanceHistory);

// Hospital Records
router.get('/hospitals', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getHospitals);
router.get('/hospitals/:code', auth, roleAuth(['ambulance', 'police', 'hospital', 'admin']), apiController.getHospitalByCode);
router.post('/hospitals', auth, roleAuth(['admin', 'hospital']), apiController.upsertHospital);

// Admin
router.get('/admin/analytics', auth, roleAuth(['admin']), apiController.getAdminAnalytics);
router.get('/admin/users', auth, roleAuth(['admin']), apiController.getUsers);
router.get('/admin/logs', auth, roleAuth(['admin']), apiController.getSystemLogs);

router.get('/health', (_req, res) => {
	res.json({ status: 'ok', service: 'smart-traffic-backend' });
});

module.exports = router;

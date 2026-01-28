const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const policeController = require('../controllers/policeController');

// All routes require police authentication
router.use(authenticate);
router.use(authorize('police'));

// Active emergencies
router.get('/emergencies/active', policeController.getActiveEmergencies);
router.get('/emergencies/:id', policeController.getEmergencyDetails);

// Signal control
router.get('/signals', policeController.getAllSignals);
router.post('/signals/:id/clear', policeController.clearSignal);
router.post('/signals/:id/reset', policeController.resetSignal);
router.get('/signals/nearby', policeController.getNearbySignals);

// Congestion reporting
router.post('/congestion/report', policeController.reportCongestion);
router.get('/congestion/active', policeController.getActiveCongestion);
router.post('/congestion/:id/resolve', policeController.resolveCongestion);

// Traffic control
router.post('/traffic/divert', policeController.divertTraffic);
router.post('/traffic/priority', policeController.setPriorityRoute);

// Dashboard data
router.get('/dashboard/stats', policeController.getDashboardStats);
router.get('/dashboard/map-data', policeController.getMapData);

// Communication
router.post('/notify/hospital', policeController.notifyHospital);
router.post('/notify/ambulance', policeController.notifyAmbulance);

module.exports = router;
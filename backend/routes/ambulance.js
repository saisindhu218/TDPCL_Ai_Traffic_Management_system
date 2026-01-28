const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ambulanceController = require('../controllers/ambulanceController');

// All routes require ambulance authentication
router.use(authenticate);
router.use(authorize('ambulance'));

// Emergency management
router.post('/emergency/start', ambulanceController.startEmergency);
router.post('/emergency/end/:id', ambulanceController.endEmergency);
router.post('/emergency/update-location', ambulanceController.updateLocation);

// Route management
router.get('/route/optimize', ambulanceController.optimizeRoute);
router.post('/route/set-destination', ambulanceController.setDestination);

// Status updates
router.get('/status', ambulanceController.getStatus);
router.post('/status/update', ambulanceController.updateStatus);

// Hospital list
router.get('/hospitals', ambulanceController.getHospitals);

// Emergency history
router.get('/history', ambulanceController.getHistory);
router.get('/history/:id', ambulanceController.getEmergencyDetails);

// Signal clearance requests
router.post('/signal/request-clearance', ambulanceController.requestSignalClearance);
router.get('/signal/status', ambulanceController.getSignalStatus);

module.exports = router;
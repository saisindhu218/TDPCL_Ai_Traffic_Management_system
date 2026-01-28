const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const hospitalController = require('../controllers/hospitalController');

// All routes require hospital authentication
router.use(authenticate);
router.use(authorize('hospital'));

// Emergency alerts
router.get('/emergencies/incoming', hospitalController.getIncomingEmergencies);
router.get('/emergencies/:id', hospitalController.getEmergencyDetails);
router.post('/emergencies/:id/acknowledge', hospitalController.acknowledgeEmergency);
router.post('/emergencies/:id/prepare', hospitalController.prepareForEmergency);

// Ambulance tracking
router.get('/ambulances/tracking', hospitalController.getAmbulanceTracking);
router.post('/ambulances/:id/update', hospitalController.updateAmbulanceStatus);

// Hospital management
router.get('/profile', hospitalController.getHospitalProfile);
router.put('/profile', hospitalController.updateHospitalProfile);
router.get('/capacity', hospitalController.getCapacity);
router.post('/capacity/update', hospitalController.updateCapacity);

// Communication
router.get('/notifications', hospitalController.getNotifications);
router.post('/notifications/clear', hospitalController.clearNotifications);
router.post('/notify/police', hospitalController.notifyPolice);

// Dashboard
router.get('/dashboard/stats', hospitalController.getDashboardStats);
router.get('/dashboard/upcoming', hospitalController.getUpcomingArrivals);

// Resources
router.get('/resources/available', hospitalController.getAvailableResources);
router.post('/resources/allocate', hospitalController.allocateResources);

module.exports = router;
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const emergencyController = require('../controllers/emergencyController');

// All routes require authentication
router.use(authenticate);

// Emergency management
router.post('/start', authorize('ambulance'), emergencyController.startEmergency);
router.post('/end/:id', authorize('ambulance'), emergencyController.endEmergency);
router.get('/active', emergencyController.getActiveEmergencies);
router.get('/:id', emergencyController.getEmergencyById);
router.post('/:id/update-location', authorize('ambulance'), emergencyController.updateLocation);
router.post('/:id/clear-signal', authorize('police'), emergencyController.clearSignal);

module.exports = router;
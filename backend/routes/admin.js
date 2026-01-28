const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/activate', adminController.activateUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);

// System Analytics
router.get('/analytics/overview', adminController.getSystemOverview);
router.get('/analytics/emergencies', adminController.getEmergencyAnalytics);
router.get('/analytics/traffic', adminController.getTrafficAnalytics);
router.get('/analytics/response-times', adminController.getResponseTimeAnalytics);

// Emergency Management
router.get('/emergencies', adminController.getAllEmergencies);
router.get('/emergencies/:id', adminController.getEmergencyDetails);
router.delete('/emergencies/:id', adminController.deleteEmergency);

// Traffic Signal Management
router.get('/signals', adminController.getAllSignals);
router.post('/signals', adminController.createSignal);
router.put('/signals/:id', adminController.updateSignal);
router.delete('/signals/:id', adminController.deleteSignal);

// Hospital Management
router.get('/hospitals', adminController.getAllHospitals);
router.post('/hospitals', adminController.createHospital);
router.put('/hospitals/:id', adminController.updateHospital);
router.delete('/hospitals/:id', adminController.deleteHospital);

// System Configuration
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

// AI Model Management
router.get('/ai/models', adminController.getAIModels);
router.post('/ai/models/train', adminController.trainAIModel);
router.get('/ai/performance', adminController.getAIPerformance);

// Reports
router.get('/reports/generate', adminController.generateReport);
router.get('/reports/export', adminController.exportData);

// Backup & Restore
router.post('/backup', adminController.createBackup);
router.post('/restore', adminController.restoreBackup);

module.exports = router;
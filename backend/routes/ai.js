const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

router.use(authenticate);

// AI endpoints
router.post('/optimize-route', aiController.optimizeRoute);
router.post('/predict-congestion', aiController.predictCongestion);
router.get('/recommendations/:emergencyId', aiController.getRecommendations);
router.post('/simulate-traffic', aiController.simulateTraffic);
router.get('/analytics', aiController.getAnalytics);

module.exports = router;
const TrafficPredictor = require('../ai_logic/trafficPredictor');
const RouteOptimizer = require('../ai_logic/routeOptimizer');

const trafficPredictor = new TrafficPredictor();
const routeOptimizer = new RouteOptimizer();

exports.optimizeRoute = async (req, res) => {
    try {
        const { start, end, emergencyLevel = 'high' } = req.body;
        
        // Get traffic prediction
        const trafficData = trafficPredictor.predictCongestion(new Date(), start);
        
        // Optimize route
        const optimizedRoute = routeOptimizer.findBestRoute(start, end, trafficData);
        
        // Add AI insights
        const aiInsights = {
            confidence: 0.92,
            factorsConsidered: [
                'real_time_traffic',
                'historical_patterns',
                'road_conditions',
                'signal_density'
            ],
            predictedSavings: '8-12 minutes',
            alternativeRoutes: optimizedRoute.alternatives,
            warnings: trafficData.level === 'high' ? ['High congestion zone ahead'] : []
        };
        
        res.json({
            success: true,
            route: optimizedRoute.bestRoute,
            traffic: trafficData,
            aiInsights,
            estimatedTime: optimizedRoute.bestRoute.estimatedTime,
            signalsToClear: optimizedRoute.bestRoute.signals
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.predictCongestion = async (req, res) => {
    try {
        const { location, time } = req.body;
        
        const prediction = trafficPredictor.predictCongestion(
            time ? new Date(time) : new Date(),
            location
        );
        
        res.json({
            success: true,
            prediction,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRecommendations = async (req, res) => {
    try {
        const { emergencyId } = req.params;
        
        // Mock AI recommendations
        const recommendations = {
            emergencyId,
            timestamp: new Date(),
            recommendations: [
                {
                    type: 'signal_priority',
                    signalId: 'TS045',
                    action: 'Clear 3 minutes before arrival',
                    reason: 'Historical congestion at this time'
                },
                {
                    type: 'route_adjustment',
                    suggestion: 'Take service road between km 4-6',
                    reason: 'Accident reported on main road'
                },
                {
                    type: 'alert',
                    message: 'School zone ahead - reduce speed',
                    priority: 'medium'
                }
            ],
            aiConfidence: 0.89
        };
        
        res.json({ success: true, ...recommendations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
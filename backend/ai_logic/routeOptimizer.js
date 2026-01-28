const TrafficPredictor = require('./trafficPredictor');

class RouteOptimizer {
    constructor() {
        this.trafficPredictor = new TrafficPredictor();
        this.routeCache = new Map();
    }

    async optimizeRoute(start, end, options = {}) {
        const cacheKey = `${JSON.stringify(start)}-${JSON.stringify(end)}`;
        
        // Check cache first
        if (this.routeCache.has(cacheKey)) {
            const cached = this.routeCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5 * 60000) { // 5 minutes cache
                return cached.data;
            }
        }

        try {
            // Get traffic predictions
            const trafficPredictions = this.getTrafficPredictions(start, end);
            
            // Generate possible routes
            const possibleRoutes = this.generateRoutes(start, end, trafficPredictions);
            
            // Score each route
            const scoredRoutes = possibleRoutes.map(route => ({
                ...route,
                score: this.calculateRouteScore(route, options.emergencyLevel),
                aiFactors: this.getAIFactors(route)
            }));

            // Sort by score (highest first)
            scoredRoutes.sort((a, b) => b.score - a.score);

            const bestRoute = scoredRoutes[0];
            const alternativeRoutes = scoredRoutes.slice(1, 4); // Top 3 alternatives

            // Add AI recommendations
            const recommendations = this.generateRecommendations(bestRoute, trafficPredictions);

            const result = {
                bestRoute,
                alternativeRoutes,
                recommendations,
                trafficPredictions,
                estimatedTime: bestRoute.estimatedTime,
                distance: bestRoute.distance,
                confidence: this.calculateConfidence(bestRoute, trafficPredictions),
                timestamp: new Date()
            };

            // Cache the result
            this.routeCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            console.error('Route optimization error:', error);
            return this.getFallbackRoute(start, end);
        }
    }

    getTrafficPredictions(start, end) {
        const now = new Date();
        const predictions = [];

        // Simulate traffic along route
        for (let i = 0; i < 10; i++) {
            const point = {
                lat: start.lat + (end.lat - start.lat) * (i / 10),
                lng: start.lng + (end.lng - start.lng) * (i / 10)
            };

            predictions.push({
                location: point,
                prediction: this.trafficPredictor.predictCongestion(now, point),
                timeOffset: i * 3 // minutes
            });
        }

        return predictions;
    }

    generateRoutes(start, end, trafficPredictions) {
        // Generate 5 different route options
        const routes = [];
        
        // Route 1: Fastest (Highway)
        routes.push({
            id: 'route-1',
            name: 'Express Highway Route',
            type: 'highway',
            coordinates: this.generateCoordinates(start, end, 0.3),
            distance: this.calculateDistance(start, end) * 1.1, // 10% longer
            estimatedTime: this.calculateTime(start, end, 'highway'),
            signals: 4,
            turns: 6,
            trafficLevel: this.getAverageTraffic(trafficPredictions, 'highway'),
            priority: 'speed'
        });

        // Route 2: Shortest (City Roads)
        routes.push({
            id: 'route-2',
            name: 'City Shortcut Route',
            type: 'city',
            coordinates: this.generateCoordinates(start, end, 0.5),
            distance: this.calculateDistance(start, end) * 0.9, // 10% shorter
            estimatedTime: this.calculateTime(start, end, 'city'),
            signals: 12,
            turns: 18,
            trafficLevel: this.getAverageTraffic(trafficPredictions, 'city'),
            priority: 'distance'
        });

        // Route 3: Balanced
        routes.push({
            id: 'route-3',
            name: 'Balanced Optimal Route',
            type: 'balanced',
            coordinates: this.generateCoordinates(start, end, 0.4),
            distance: this.calculateDistance(start, end),
            estimatedTime: this.calculateTime(start, end, 'balanced'),
            signals: 8,
            turns: 10,
            trafficLevel: this.getAverageTraffic(trafficPredictions, 'balanced'),
            priority: 'balanced'
        });

        // Route 4: Emergency Priority
        routes.push({
            id: 'route-4',
            name: 'Emergency Priority Route',
            type: 'emergency',
            coordinates: this.generateCoordinates(start, end, 0.2),
            distance: this.calculateDistance(start, end) * 1.2,
            estimatedTime: this.calculateTime(start, end, 'emergency') * 0.7, // 30% faster with priority
            signals: 6,
            turns: 8,
            trafficLevel: 'low', // Assumed cleared
            priority: 'emergency',
            clearanceRequired: true
        });

        // Route 5: Alternative
        routes.push({
            id: 'route-5',
            name: 'Alternative Scenic Route',
            type: 'alternative',
            coordinates: this.generateCoordinates(start, end, 0.6),
            distance: this.calculateDistance(start, end) * 1.3,
            estimatedTime: this.calculateTime(start, end, 'alternative'),
            signals: 3,
            turns: 5,
            trafficLevel: 'low',
            priority: 'reliability'
        });

        return routes;
    }

    calculateRouteScore(route, emergencyLevel = 'normal') {
        let score = 100;

        // Base scoring factors
        const factors = {
            time: 40, // Time is most important
            distance: 20,
            signals: 15,
            traffic: 15,
            reliability: 10
        };

        // Adjust for emergency level
        if (emergencyLevel === 'high') {
            factors.time = 50;
            factors.signals = 20;
            factors.traffic = 20;
            factors.distance = 5;
            factors.reliability = 5;
        } else if (emergencyLevel === 'medium') {
            factors.time = 45;
            factors.signals = 18;
            factors.traffic = 18;
            factors.distance = 10;
            factors.reliability = 9;
        }

        // Calculate time score (lower time = higher score)
        const maxExpectedTime = 60; // 60 minutes max
        const timeScore = Math.max(0, (maxExpectedTime - route.estimatedTime) / maxExpectedTime * factors.time);

        // Calculate distance score (shorter = better)
        const maxDistance = 50; // 50km max
        const distanceScore = Math.max(0, (maxDistance - route.distance) / maxDistance * factors.distance);

        // Calculate signals score (fewer signals = better)
        const maxSignals = 20;
        const signalsScore = Math.max(0, (maxSignals - route.signals) / maxSignals * factors.signals);

        // Calculate traffic score
        const trafficScore = this.getTrafficScore(route.trafficLevel) * factors.traffic;

        // Calculate reliability score (based on route type)
        const reliabilityScore = this.getReliabilityScore(route.type) * factors.reliability;

        score = timeScore + distanceScore + signalsScore + trafficScore + reliabilityScore;

        // Apply emergency bonus
        if (emergencyLevel === 'high' && route.type === 'emergency') {
            score *= 1.3; // 30% bonus for emergency routes
        }

        // Apply penalties for high traffic
        if (route.trafficLevel === 'high') {
            score *= 0.7; // 30% penalty
        } else if (route.trafficLevel === 'medium') {
            score *= 0.85; // 15% penalty
        }

        return Math.min(100, Math.max(0, score));
    }

    getTrafficScore(trafficLevel) {
        const scores = {
            'low': 1.0,
            'medium': 0.7,
            'high': 0.4
        };
        return scores[trafficLevel] || 0.5;
    }

    getReliabilityScore(routeType) {
        const reliability = {
            'highway': 0.9,
            'city': 0.6,
            'balanced': 0.8,
            'emergency': 1.0,
            'alternative': 0.7
        };
        return reliability[routeType] || 0.5;
    }

    getAIFactors(route) {
        return {
            congestionPrediction: this.trafficPredictor.predictCongestion(new Date(), route.coordinates[Math.floor(route.coordinates.length / 2)]),
            historicalPerformance: Math.random() * 0.3 + 0.7, // 70-100%
            weatherImpact: Math.random() * 0.2, // 0-20%
            timeOfDayFactor: this.getTimeOfDayFactor(),
            dayOfWeekFactor: this.getDayOfWeekFactor()
        };
    }

    generateRecommendations(route, trafficPredictions) {
        const recommendations = [];

        // Time-based recommendations
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 7 && hour <= 10) {
            recommendations.push({
                type: 'warning',
                message: 'Morning peak hours - expect delays',
                priority: 'medium'
            });
        }

        if (hour >= 17 && hour <= 20) {
            recommendations.push({
                type: 'warning',
                message: 'Evening rush hour - alternative route suggested',
                priority: 'high'
            });
        }

        // Traffic-based recommendations
        const highTrafficPoints = trafficPredictions.filter(p => p.prediction.level === 'high');
        if (highTrafficPoints.length > 0) {
            recommendations.push({
                type: 'alert',
                message: `${highTrafficPoints.length} high congestion points detected`,
                priority: 'high',
                actions: ['Consider alternative route', 'Request signal priority']
            });
        }

        // Route-specific recommendations
        if (route.signals > 10) {
            recommendations.push({
                type: 'suggestion',
                message: 'Many traffic signals on route - coordinate with police',
                priority: 'medium'
            });
        }

        if (route.type === 'emergency') {
            recommendations.push({
                type: 'action',
                message: 'Emergency route activated - all signals will be cleared',
                priority: 'critical',
                actions: ['Alert traffic police', 'Clear all signals', 'Divert civilian traffic']
            });
        }

        return recommendations;
    }

    calculateConfidence(route, trafficPredictions) {
        let confidence = 0.8; // Base confidence

        // Adjust based on traffic prediction accuracy
        const accuratePredictions = trafficPredictions.filter(p => 
            p.prediction.confidence > 0.7
        ).length;

        confidence += (accuratePredictions / trafficPredictions.length) * 0.1;

        // Adjust based on route type
        if (route.type === 'emergency') {
            confidence += 0.05; // Higher confidence for emergency routes
        }

        // Adjust based on time of day
        confidence += this.getTimeOfDayFactor() * 0.05;

        return Math.min(0.95, Math.max(0.6, confidence));
    }

    getTimeOfDayFactor() {
        const hour = new Date().getHours();
        
        if (hour >= 22 || hour <= 5) {
            return 0.9; // Night - predictable
        } else if (hour >= 12 && hour <= 14) {
            return 0.7; // Lunch time - moderate
        } else if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            return 0.5; // Peak hours - less predictable
        } else {
            return 0.8; // Normal hours
        }
    }

    getDayOfWeekFactor() {
        const day = new Date().getDay();
        return day === 0 || day === 6 ? 0.6 : 0.8; // Weekend vs weekday
    }

    getAverageTraffic(predictions, routeType) {
        const levels = predictions.map(p => p.prediction.level);
        
        const counts = {
            high: levels.filter(l => l === 'high').length,
            medium: levels.filter(l => l === 'medium').length,
            low: levels.filter(l => l === 'low').length
        };

        // Weight based on route type
        const weights = {
            highway: { high: 0.3, medium: 0.5, low: 0.2 },
            city: { high: 0.5, medium: 0.3, low: 0.2 },
            balanced: { high: 0.4, medium: 0.4, low: 0.2 },
            emergency: { high: 0.1, medium: 0.2, low: 0.7 },
            alternative: { high: 0.2, medium: 0.3, low: 0.5 }
        };

        const weight = weights[routeType] || weights.balanced;
        
        const score = 
            (counts.high * weight.high) + 
            (counts.medium * weight.medium) + 
            (counts.low * weight.low);

        if (score > 0.6) return 'high';
        if (score > 0.3) return 'medium';
        return 'low';
    }

    calculateDistance(start, end) {
        const R = 6371; // Earth's radius in km
        const dLat = (end.lat - start.lat) * Math.PI / 180;
        const dLon = (end.lng - start.lng) * Math.PI / 180;
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateTime(start, end, routeType) {
        const distance = this.calculateDistance(start, end);
        
        const speeds = {
            highway: 60, // km/h
            city: 30,
            balanced: 45,
            emergency: 70, // With clearance
            alternative: 40
        };

        const speed = speeds[routeType] || 40;
        return (distance / speed) * 60; // minutes
    }

    generateCoordinates(start, end, curvature = 0.5) {
        const coordinates = [];
        const steps = 10;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = start.lat + (end.lat - start.lat) * t;
            const lng = start.lng + (end.lng - start.lng) * t;
            
            // Add some curvature
            const curve = Math.sin(t * Math.PI) * curvature * 0.01;
            
            coordinates.push({
                lat: lat + curve,
                lng: lng - curve
            });
        }
        
        return coordinates;
    }

    getFallbackRoute(start, end) {
        return {
            bestRoute: {
                id: 'fallback-route',
                name: 'Direct Route',
                type: 'direct',
                coordinates: [start, end],
                distance: this.calculateDistance(start, end),
                estimatedTime: this.calculateTime(start, end, 'balanced'),
                signals: 0,
                turns: 0,
                trafficLevel: 'medium',
                priority: 'direct',
                score: 50
            },
            alternativeRoutes: [],
            recommendations: [{
                type: 'warning',
                message: 'Using fallback route - AI optimization unavailable',
                priority: 'medium'
            }],
            trafficPredictions: [],
            estimatedTime: this.calculateTime(start, end, 'balanced'),
            distance: this.calculateDistance(start, end),
            confidence: 0.5,
            timestamp: new Date()
        };
    }
}

module.exports = RouteOptimizer;
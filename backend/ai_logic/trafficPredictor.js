class TrafficPredictor {
    constructor() {
        this.congestionPatterns = {
            'morning': [7, 8, 9],
            'evening': [17, 18, 19],
            'weekend': [11, 12, 20, 21]
        };
    }

    predictCongestion(currentTime, location) {
        // Mock AI prediction logic
        const hour = currentTime.getHours();
        const day = currentTime.getDay();
        
        let baseCongestion = 0.3; // Base 30% congestion
        
        // Time-based prediction
        if (this.congestionPatterns.morning.includes(hour)) {
            baseCongestion += 0.4;
        } else if (this.congestionPatterns.evening.includes(hour)) {
            baseCongestion += 0.5;
        }
        
        // Weekend prediction
        if ([0, 6].includes(day)) { // Sunday or Saturday
            if (this.congestionPatterns.weekend.includes(hour)) {
                baseCongestion += 0.3;
            }
        }
        
        // Location-based adjustment (mock)
        const locationFactor = Math.random() * 0.2;
        baseCongestion += locationFactor;
        
        // Cap at 0.95
        const finalCongestion = Math.min(baseCongestion, 0.95);
        
        return {
            level: finalCongestion > 0.7 ? 'high' : finalCongestion > 0.4 ? 'medium' : 'low',
            score: finalCongestion,
            confidence: 0.85 + Math.random() * 0.1,
            predictedClearTime: this.calculateClearTime(finalCongestion),
            factors: ['time_of_day', 'day_of_week', 'historical_patterns']
        };
    }

    calculateClearTime(congestionScore) {
        const minutes = Math.ceil(congestionScore * 30);
        const clearTime = new Date();
        clearTime.setMinutes(clearTime.getMinutes() + minutes);
        return clearTime;
    }

    optimizeRoute(start, end, currentTraffic) {
        // Mock route optimization using Dijkstra-like algorithm
        const routes = [
            {
                path: 'Route A - Main Highway',
                distance: 12.5,
                time: this.calculateTime(12.5, currentTraffic),
                traffic: currentTraffic,
                signals: 8,
                prioritySignals: 3
            },
            {
                path: 'Route B - Service Road',
                distance: 10.2,
                time: this.calculateTime(10.2, 'medium'),
                traffic: 'medium',
                signals: 12,
                prioritySignals: 5
            },
            {
                path: 'Route C - Expressway',
                distance: 15.1,
                time: this.calculateTime(15.1, 'low'),
                traffic: 'low',
                signals: 4,
                prioritySignals: 2
            }
        ];

        // Sort by estimated time
        routes.sort((a, b) => a.time - b.time);
        
        return {
            recommendedRoute: routes[0],
            alternativeRoutes: routes.slice(1),
            optimizationFactors: ['traffic_density', 'signal_count', 'road_quality'],
            aiConfidence: 0.88
        };
    }

    calculateTime(distance, traffic) {
        const baseSpeed = 40; // km/h
        const trafficFactors = {
            'low': 1.0,
            'medium': 0.6,
            'high': 0.3
        };
        
        const speed = baseSpeed * trafficFactors[traffic];
        return (distance / speed) * 60; // minutes
    }
}

module.exports = TrafficPredictor;
class SignalController {
    constructor() {
        this.signalStates = new Map();
        this.clearancePatterns = new Map();
        this.initializePatterns();
    }

    initializePatterns() {
        // Define clearance patterns for different scenarios
        this.clearancePatterns.set('emergency', {
            duration: 180, // 3 minutes
            pattern: 'all-green',
            priority: 'ambulance-direction',
            coordination: 'wave',
            preClearance: 60 // 1 minute before arrival
        });

        this.clearancePatterns.set('congestion', {
            duration: 120,
            pattern: 'alternating',
            priority: 'main-road',
            coordination: 'isolated',
            preClearance: 30
        });

        this.clearancePatterns.set('normal', {
            duration: 90,
            pattern: 'standard-cycle',
            priority: 'balanced',
            coordination: 'linked',
            preClearance: 0
        });

        this.clearancePatterns.set('peak-hour', {
            duration: 150,
            pattern: 'extended-green',
            priority: 'arterial-roads',
            coordination: 'corridor',
            preClearance: 45
        });
    }

    async getClearancePlan(signal, emergencyData = null) {
        const scenario = this.determineScenario(signal, emergencyData);
        const pattern = this.clearancePatterns.get(scenario);
        
        // Generate lane clearance plan
        const lanes = signal.lanes.map(lane => {
            const clearance = this.calculateLaneClearance(lane, pattern, emergencyData);
            return {
                ...lane,
                clearanceStart: clearance.start,
                clearanceEnd: clearance.end,
                status: clearance.status,
                duration: clearance.duration
            };
        });

        // Calculate optimal clearance sequence
        const sequence = this.calculateClearanceSequence(lanes, pattern);

        // Generate AI recommendations
        const recommendations = this.generateRecommendations(signal, scenario, emergencyData);

        return {
            scenario,
            pattern,
            lanes,
            sequence,
            recommendations,
            totalClearanceTime: this.calculateTotalClearanceTime(lanes),
            efficiencyScore: this.calculateEfficiencyScore(lanes, pattern),
            estimatedImpact: this.estimateTrafficImpact(signal, lanes)
        };
    }

    determineScenario(signal, emergencyData) {
        if (emergencyData && emergencyData.priority === 'high') {
            return 'emergency';
        }

        if (signal.congestionLevel === 'high') {
            return 'congestion';
        }

        const hour = new Date().getHours();
        if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            return 'peak-hour';
        }

        return 'normal';
    }

    calculateLaneClearance(lane, pattern, emergencyData) {
        const now = new Date();
        let clearanceDuration = pattern.duration;
        let status = 'normal';

        // Adjust for emergency
        if (pattern.priority === 'ambulance-direction' && emergencyData) {
            if (this.isAmbulanceDirection(lane.direction, emergencyData.direction)) {
                clearanceDuration = 180; // 3 minutes for ambulance direction
                status = 'cleared';
            } else {
                clearanceDuration = 60; // 1 minute for other directions
                status = 'blocked';
            }
        }

        // Adjust for congestion
        if (pattern.pattern === 'alternating') {
            clearanceDuration = 90;
            status = 'alternating';
        }

        return {
            start: now,
            end: new Date(now.getTime() + clearanceDuration * 1000),
            duration: clearanceDuration,
            status: status
        };
    }

    isAmbulanceDirection(laneDirection, ambulanceDirection) {
        // Simplified direction matching
        const directionMap = {
            'north': ['north', 'south'],
            'south': ['south', 'north'],
            'east': ['east', 'west'],
            'west': ['west', 'east']
        };

        return directionMap[ambulanceDirection]?.includes(laneDirection) || false;
    }

    calculateClearanceSequence(lanes, pattern) {
        const sequence = [];
        let timeOffset = 0;

        switch (pattern.coordination) {
            case 'wave':
                // Sequential clearance like a wave
                lanes.forEach((lane, index) => {
                    sequence.push({
                        lane: lane.direction,
                        startOffset: timeOffset,
                        duration: lane.duration,
                        action: 'clear'
                    });
                    timeOffset += 5; // 5-second gap between lanes
                });
                break;

            case 'simultaneous':
                // All lanes cleared at once
                lanes.forEach(lane => {
                    sequence.push({
                        lane: lane.direction,
                        startOffset: 0,
                        duration: lane.duration,
                        action: 'clear'
                    });
                });
                break;

            case 'alternating':
                // Alternate between main and side roads
                const mainLanes = lanes.filter(l => ['north', 'south'].includes(l.direction));
                const sideLanes = lanes.filter(l => ['east', 'west'].includes(l.direction));

                mainLanes.forEach(lane => {
                    sequence.push({
                        lane: lane.direction,
                        startOffset: 0,
                        duration: 45,
                        action: 'clear'
                    });
                });

                sideLanes.forEach(lane => {
                    sequence.push({
                        lane: lane.direction,
                        startOffset: 45,
                        duration: 45,
                        action: 'clear'
                    });
                });
                break;

            default:
                // Standard sequence
                lanes.forEach((lane, index) => {
                    sequence.push({
                        lane: lane.direction,
                        startOffset: index * 30,
                        duration: 30,
                        action: 'clear'
                    });
                });
        }

        return sequence;
    }

    generateRecommendations(signal, scenario, emergencyData) {
        const recommendations = [];

        // Time-based recommendations
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 5) {
            recommendations.push({
                type: 'info',
                message: 'Night hours - minimal traffic expected',
                priority: 'low'
            });
        }

        // Congestion-based recommendations
        if (signal.congestionLevel === 'high') {
            recommendations.push({
                type: 'warning',
                message: 'High congestion - consider extended clearance time',
                priority: 'high',
                action: 'Extend clearance duration by 30 seconds'
            });
        }

        // Emergency-specific recommendations
        if (scenario === 'emergency' && emergencyData) {
            recommendations.push({
                type: 'critical',
                message: 'EMERGENCY VEHICLE APPROACHING',
                priority: 'critical',
                actions: [
                    'Clear all lanes in ambulance direction',
                    'Block perpendicular traffic',
                    'Maintain clearance until ambulance passes'
                ]
            });
        }

        // Weather considerations (mock)
        const weatherImpact = this.getWeatherImpact();
        if (weatherImpact > 0.3) {
            recommendations.push({
                type: 'warning',
                message: `Weather conditions may affect clearance (Impact: ${Math.round(weatherImpact * 100)}%)`,
                priority: 'medium',
                action: 'Add 15 seconds safety buffer'
            });
        }

        // Historical performance
        const historicalPerformance = this.getHistoricalPerformance(signal.signalId);
        if (historicalPerformance < 0.7) {
            recommendations.push({
                type: 'alert',
                message: `Below average historical performance (${Math.round(historicalPerformance * 100)}%)`,
                priority: 'medium',
                action: 'Monitor closely and adjust as needed'
            });
        }

        return recommendations;
    }

    calculateTotalClearanceTime(lanes) {
        return lanes.reduce((total, lane) => total + lane.duration, 0);
    }

    calculateEfficiencyScore(lanes, pattern) {
        let score = 100;

        // Deduct for unbalanced clearance
        const durations = lanes.map(l => l.duration);
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        
        const imbalance = (maxDuration - minDuration) / maxDuration;
        score -= imbalance * 40;

        // Add for emergency optimization
        if (pattern.priority === 'ambulance-direction') {
            score += 20;
        }

        // Deduct for long total time
        const totalTime = this.calculateTotalClearanceTime(lanes);
        if (totalTime > 300) { // More than 5 minutes
            score -= 30;
        } else if (totalTime > 180) { // More than 3 minutes
            score -= 15;
        }

        return Math.max(0, Math.min(100, score));
    }

    estimateTrafficImpact(signal, lanes) {
        const baseVehicles = 100; // Base vehicles per cycle
        let impact = {
            vehiclesAffected: 0,
            averageDelay: 0,
            queueLength: 0
        };

        lanes.forEach(lane => {
            if (lane.status === 'cleared') {
                // Positive impact for cleared lanes
                impact.vehiclesAffected += baseVehicles * 0.8; // 80% of vehicles benefit
                impact.averageDelay -= 2; // 2 minutes saved per vehicle
            } else if (lane.status === 'blocked') {
                // Negative impact for blocked lanes
                impact.vehiclesAffected += baseVehicles * 1.2; // 120% more vehicles affected
                impact.averageDelay += 5; // 5 minutes delay per vehicle
                impact.queueLength += 50; // 50 meters queue
            }
        });

        return impact;
    }

    getWeatherImpact() {
        // Mock weather impact calculation
        const conditions = ['clear', 'rain', 'fog', 'storm'];
        const impactFactors = {
            'clear': 0.1,
            'rain': 0.4,
            'fog': 0.6,
            'storm': 0.8
        };

        // Simulate random weather
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        return impactFactors[randomCondition];
    }

    getHistoricalPerformance(signalId) {
        // Mock historical performance
        // In real system, this would query database for past performance
        return 0.7 + Math.random() * 0.3; // 70-100%
    }

    async optimizeSignalTiming(signals) {
        // Optimize timing for multiple signals in a corridor
        const optimizedSignals = [];
        let baseTime = new Date();

        signals.forEach((signal, index) => {
            const offset = index * 30; // 30-second offset between signals
            const clearanceTime = new Date(baseTime.getTime() + offset * 1000);

            optimizedSignals.push({
                signalId: signal.signalId,
                clearanceTime: clearanceTime,
                greenWave: true,
                wavePosition: index + 1,
                totalSignals: signals.length,
                recommendedSpeed: this.calculateRecommendedSpeed(offset, signals.length)
            });
        });

        return {
            corridorId: `corridor-${Date.now()}`,
            signals: optimizedSignals,
            totalOptimizationTime: signals.length * 30,
            efficiencyGain: this.calculateEfficiencyGain(signals),
            recommendations: this.generateCorridorRecommendations(optimizedSignals)
        };
    }

    calculateRecommendedSpeed(offset, totalSignals) {
        const distanceBetweenSignals = 500; // meters (assumed)
        const timeBetweenSignals = 30; // seconds
        return (distanceBetweenSignals / timeBetweenSignals) * 3.6; // km/h
    }

    calculateEfficiencyGain(signals) {
        const baseTime = signals.length * 90; // 90 seconds per signal normally
        const optimizedTime = signals.length * 30; // 30 seconds offset
        return ((baseTime - optimizedTime) / baseTime) * 100; // Percentage gain
    }

    generateCorridorRecommendations(signals) {
        return [
            {
                type: 'optimization',
                message: `Green wave established for ${signals.length} signals`,
                priority: 'high',
                actions: ['Maintain recommended speed of 60 km/h', 'Coordinate with adjacent corridors']
            },
            {
                type: 'monitoring',
                message: 'Monitor traffic flow and adjust timing if needed',
                priority: 'medium',
                metrics: ['Flow rate', 'Queue length', 'Travel time']
            }
        ];
    }

    predictCongestion(signal, lookaheadMinutes = 60) {
        const predictions = [];
        const now = new Date();

        for (let i = 0; i < lookaheadMinutes; i += 15) {
            const predictionTime = new Date(now.getTime() + i * 60000);
            const congestionLevel = this.calculatePredictedCongestion(signal, predictionTime);
            
            predictions.push({
                time: predictionTime,
                level: congestionLevel.level,
                confidence: congestionLevel.confidence,
                factors: congestionLevel.factors
            });
        }

        return {
            signalId: signal.signalId,
            predictions,
            overallTrend: this.determineOverallTrend(predictions),
            peakTime: this.findPeakTime(predictions),
            recommendations: this.generatePredictionRecommendations(predictions)
        };
    }

    calculatePredictedCongestion(signal, time) {
        const hour = time.getHours();
        let baseLevel = 'low';
        let confidence = 0.7;

        // Simple time-based prediction
        if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            baseLevel = 'high';
            confidence = 0.9;
        } else if ((hour >= 11 && hour <= 12) || (hour >= 14 && hour <= 16)) {
            baseLevel = 'medium';
            confidence = 0.8;
        }

        // Adjust based on historical congestion
        const historicalFactor = this.getHistoricalCongestion(signal.signalId, hour);
        if (historicalFactor > 0.7) {
            baseLevel = 'high';
            confidence = 0.95;
        } else if (historicalFactor > 0.4) {
            baseLevel = 'medium';
            confidence = 0.85;
        }

        return {
            level: baseLevel,
            confidence,
            factors: ['time_of_day', 'historical_patterns', 'day_of_week']
        };
    }

    getHistoricalCongestion(signalId, hour) {
        // Mock historical data
        // In real system, this would query database
        const patterns = {
            'TS001': { peak: [8, 9, 18, 19], medium: [10, 11, 16, 17] },
            'TS002': { peak: [7, 8, 17, 18], medium: [9, 10, 15, 16] },
            'TS003': { peak: [9, 10, 19, 20], medium: [11, 12, 14, 15] }
        };

        const pattern = patterns[signalId] || patterns['TS001'];
        
        if (pattern.peak.includes(hour)) return 0.8;
        if (pattern.medium.includes(hour)) return 0.5;
        return 0.2;
    }

    determineOverallTrend(predictions) {
        const levels = predictions.map(p => {
            const values = { 'low': 1, 'medium': 2, 'high': 3 };
            return values[p.level];
        });

        const trend = levels[levels.length - 1] - levels[0];
        
        if (trend > 0.5) return 'increasing';
        if (trend < -0.5) return 'decreasing';
        return 'stable';
    }

    findPeakTime(predictions) {
        const peak = predictions.reduce((max, current) => {
            const values = { 'low': 1, 'medium': 2, 'high': 3 };
            return values[current.level] > values[max.level] ? current : max;
        }, predictions[0]);

        return {
            time: peak.time,
            level: peak.level,
            confidence: peak.confidence
        };
    }

    generatePredictionRecommendations(predictions) {
        const highCongestion = predictions.filter(p => p.level === 'high');
        
        if (highCongestion.length > 0) {
            return [
                {
                    type: 'warning',
                    message: `${highCongestion.length} periods of high congestion predicted`,
                    priority: 'high',
                    actions: ['Schedule additional patrols', 'Prepare diversion plans', 'Alert traffic management center']
                }
            ];
        }

        return [
            {
                type: 'info',
                message: 'Normal traffic conditions predicted',
                priority: 'low',
                actions: ['Maintain regular operations', 'Monitor for changes']
            }
        ];
    }
}

module.exports = SignalController;
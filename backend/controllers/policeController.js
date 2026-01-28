const Emergency = require('../models/Emergency');
const TrafficSignal = require('../models/TrafficSignal');
const Congestion = require('../models/Congestion');
const User = require('../models/User');
const SignalController = require('../ai_logic/signalController');

exports.getActiveEmergencies = async (req, res) => {
    try {
        const emergencies = await Emergency.find({ status: 'active' })
            .populate('ambulanceId', 'username vehicleNumber')
            .populate('hospitalId', 'name address')
            .sort({ startTime: -1 });

        // Add real-time ETA calculations
        const emergenciesWithETA = emergencies.map(emergency => {
            const now = new Date();
            const start = new Date(emergency.startTime);
            const elapsed = Math.floor((now - start) / 60000); // minutes
            const remaining = emergency.estimatedTime - elapsed;
            
            return {
                ...emergency.toObject(),
                elapsedTime: elapsed,
                remainingTime: remaining > 0 ? remaining : 0,
                isDelayed: remaining < 0
            };
        });

        res.json({
            success: true,
            emergencies: emergenciesWithETA
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.clearSignal = async (req, res) => {
    try {
        const { id } = req.params;
        
        const signal = await TrafficSignal.findOne({ signalId: id });
        if (!signal) {
            return res.status(404).json({ error: 'Signal not found' });
        }

        // Use AI to determine optimal clearance
        const signalController = new SignalController();
        const clearancePlan = await signalController.getClearancePlan(signal);

        // Update signal status
        signal.isPriority = true;
        signal.lanes = clearancePlan.lanes;
        signal.lastUpdated = new Date();
        
        await signal.save();

        // Broadcast to all connected clients
        req.io.emit('signal-cleared', {
            signalId: signal.signalId,
            clearedBy: req.user.username,
            timestamp: new Date(),
            lanes: clearancePlan.lanes
        });

        // Update any active congestion
        await Congestion.updateMany(
            { signalId: signal.signalId, resolved: false },
            { 
                resolved: true,
                actualClearTime: new Date(),
                level: 'low'
            }
        );

        res.json({
            success: true,
            message: 'Signal cleared successfully',
            signal,
            clearancePlan
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reportCongestion = async (req, res) => {
    try {
        const { signalId, level, cause, description, imageUrl } = req.body;
        
        const signal = await TrafficSignal.findOne({ signalId });
        if (!signal) {
            return res.status(404).json({ error: 'Signal not found' });
        }

        // Update signal congestion level
        signal.congestionLevel = level;
        signal.lastUpdated = new Date();
        await signal.save();

        // Create congestion record
        const congestion = new Congestion({
            signalId,
            location: signal.location,
            level,
            cause: cause || 'other',
            description,
            imageUrl,
            reporter: 'police',
            reporterId: req.user._id,
            estimatedClearTime: new Date(Date.now() + 30 * 60000) // 30 minutes default
        });

        await congestion.save();

        // Broadcast congestion alert
        req.io.emit('congestion-reported', {
            signalId,
            level,
            cause,
            reporter: req.user.username,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Congestion reported successfully',
            congestion
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllSignals = async (req, res) => {
    try {
        const signals = await TrafficSignal.find().sort({ signalId: 1 });

        // Get active congestion for each signal
        const signalsWithCongestion = await Promise.all(
            signals.map(async (signal) => {
                const activeCongestion = await Congestion.findOne({
                    signalId: signal.signalId,
                    resolved: false
                }).sort({ timestamp: -1 });

                return {
                    ...signal.toObject(),
                    activeCongestion: activeCongestion || null
                };
            })
        );

        res.json({
            success: true,
            signals: signalsWithCongestion
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));

        // Get today's emergencies
        const todayEmergencies = await Emergency.find({
            startTime: { $gte: todayStart, $lte: todayEnd }
        });

        // Get active congestion
        const activeCongestion = await Congestion.countDocuments({
            resolved: false,
            level: { $in: ['medium', 'high'] }
        });

        // Get cleared signals today
        const clearedSignals = await TrafficSignal.countDocuments({
            'lanes.status': 'cleared',
            lastUpdated: { $gte: todayStart }
        });

        // Calculate average response time
        const completedEmergencies = await Emergency.find({
            status: 'completed',
            endTime: { $gte: todayStart }
        });

        const avgResponseTime = completedEmergencies.length > 0
            ? completedEmergencies.reduce((sum, e) => sum + (e.actualTime || 0), 0) / completedEmergencies.length
            : 0;

        res.json({
            success: true,
            stats: {
                activeEmergencies: todayEmergencies.filter(e => e.status === 'active').length,
                activeCongestion,
                clearedSignalsToday: clearedSignals,
                avgResponseTime: avgResponseTime.toFixed(2),
                signalsUnderControl: await TrafficSignal.countDocuments({ isPriority: true })
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.divertTraffic = async (req, res) => {
    try {
        const { signalId, direction, alternativeRoute } = req.body;
        
        const signal = await TrafficSignal.findOne({ signalId });
        if (!signal) {
            return res.status(404).json({ error: 'Signal not found' });
        }

        // Update lane status for diversion
        const lane = signal.lanes.find(l => l.direction === direction);
        if (lane) {
            lane.status = 'blocked';
            signal.congestionLevel = 'high';
            signal.lastUpdated = new Date();
            
            await signal.save();

            // Broadcast diversion
            req.io.emit('traffic-diverted', {
                signalId,
                direction,
                alternativeRoute,
                timestamp: new Date()
            });

            res.json({
                success: true,
                message: `Traffic diverted from ${direction} at signal ${signalId}`,
                signal
            });
        } else {
            res.status(400).json({ error: 'Invalid direction' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
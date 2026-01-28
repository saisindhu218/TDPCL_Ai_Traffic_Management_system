const Emergency = require('../models/Emergency');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const TrafficSignal = require('../models/TrafficSignal');
const RouteOptimizer = require('../ai_logic/routeOptimizer');

exports.startEmergency = async (req, res) => {
    try {
        const { hospitalId, destination, patientInfo } = req.body;
        const ambulanceId = req.user._id;

        // Get hospital details
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ error: 'Hospital not found' });
        }

        // Create emergency record
        const emergency = new Emergency({
            ambulanceId,
            driverName: req.user.username,
            vehicleNumber: req.user.vehicleNumber,
            hospitalId,
            hospitalName: hospital.name,
            destination: {
                lat: hospital.location.lat,
                lng: hospital.location.lng,
                address: hospital.address
            },
            currentLocation: req.user.location || { lat: 12.9716, lng: 77.5946 },
            patientInfo: patientInfo || {},
            status: 'active'
        });

        await emergency.save();

        // Optimize route using AI
        const routeOptimizer = new RouteOptimizer();
        const optimizedRoute = await routeOptimizer.optimizeRoute(
            emergency.currentLocation,
            emergency.destination
        );

        // Update emergency with route
        emergency.route = optimizedRoute.coordinates;
        emergency.estimatedTime = optimizedRoute.estimatedTime;
        emergency.aiRecommendations = optimizedRoute.recommendations;
        await emergency.save();

        // Notify hospital and police via WebSocket
        req.io.emit('emergency-started', {
            emergencyId: emergency._id,
            ambulance: req.user.vehicleNumber,
            hospital: hospital.name,
            eta: optimizedRoute.estimatedTime
        });

        res.status(201).json({
            success: true,
            emergency,
            route: optimizedRoute,
            message: 'Emergency started successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng, address } = req.body;
        const ambulanceId = req.user._id;

        // Update user location
        await User.findByIdAndUpdate(ambulanceId, {
            location: { lat, lng }
        });

        // Update active emergency location
        const activeEmergency = await Emergency.findOne({
            ambulanceId,
            status: 'active'
        });

        if (activeEmergency) {
            activeEmergency.currentLocation = { lat, lng, address };
            activeEmergency.route.push({
                lat,
                lng,
                timestamp: new Date()
            });

            // Recalculate ETA if needed
            if (activeEmergency.route.length % 5 === 0) { // Every 5 updates
                const routeOptimizer = new RouteOptimizer();
                const newETA = await routeOptimizer.calculateETA(
                    { lat, lng },
                    activeEmergency.destination
                );
                activeEmergency.estimatedTime = newETA;
            }

            await activeEmergency.save();

            // Broadcast location update
            req.io.emit('ambulance-location-update', {
                emergencyId: activeEmergency._id,
                location: { lat, lng },
                eta: activeEmergency.estimatedTime
            });
        }

        res.json({
            success: true,
            message: 'Location updated successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHospitals = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        let hospitals;
        if (lat && lng) {
            // Find nearest hospitals
            hospitals = await Hospital.find({
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [parseFloat(lng), parseFloat(lat)]
                        },
                        $maxDistance: 10000 // 10km
                    }
                },
                isActive: true
            }).limit(10);
        } else {
            hospitals = await Hospital.find({ isActive: true }).limit(20);
        }

        res.json({
            success: true,
            hospitals: hospitals.map(h => ({
                _id: h._id,
                name: h.name,
                address: h.address,
                location: h.location,
                emergencyContact: h.emergencyContact,
                specialties: h.specialties,
                bedsAvailable: h.bedsAvailable,
                distance: h.distanceFromCenter || 'N/A'
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const ambulanceId = req.user._id;
        
        const activeEmergency = await Emergency.findOne({
            ambulanceId,
            status: 'active'
        }).populate('hospitalId', 'name address');

        const history = await Emergency.find({
            ambulanceId,
            status: { $in: ['completed', 'cancelled'] }
        }).sort({ createdAt: -1 }).limit(10);

        res.json({
            success: true,
            activeEmergency,
            history,
            user: {
                vehicleNumber: req.user.vehicleNumber,
                location: req.user.location,
                isActive: req.user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.endEmergency = async (req, res) => {
    try {
        const { id } = req.params;
        const ambulanceId = req.user._id;

        const emergency = await Emergency.findOne({
            _id: id,
            ambulanceId,
            status: 'active'
        });

        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        emergency.status = 'completed';
        emergency.endTime = new Date();
        emergency.actualTime = Math.floor((emergency.endTime - emergency.startTime) / 60000); // minutes
        
        await emergency.save();

        // Notify hospital and police
        req.io.emit('emergency-ended', {
            emergencyId: emergency._id,
            ambulance: req.user.vehicleNumber,
            hospital: emergency.hospitalName,
            actualTime: emergency.actualTime
        });

        res.json({
            success: true,
            message: 'Emergency completed successfully',
            emergency
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.optimizeRoute = async (req, res) => {
    try {
        const { start, end } = req.body;
        
        const routeOptimizer = new RouteOptimizer();
        const optimizedRoute = await routeOptimizer.optimizeRoute(start, end);

        res.json({
            success: true,
            route: optimizedRoute
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.requestSignalClearance = async (req, res) => {
    try {
        const { signalId, emergencyId } = req.body;
        
        const signal = await TrafficSignal.findOne({ signalId });
        if (!signal) {
            return res.status(404).json({ error: 'Signal not found' });
        }

        // Set signal to priority clearance
        signal.isPriority = true;
        signal.lanes.forEach(lane => {
            lane.status = 'cleared';
            lane.clearanceTime = new Date();
        });
        
        await signal.save();

        // Broadcast to police dashboard
        req.io.emit('signal-clearance-request', {
            signalId,
            emergencyId,
            requestedBy: req.user.vehicleNumber,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Signal clearance requested',
            signal
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
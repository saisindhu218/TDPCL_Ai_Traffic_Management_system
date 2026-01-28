const Emergency = require('../models/Emergency');
const Hospital = require('../models/Hospital');
const User = require('../models/User');

exports.getIncomingEmergencies = async (req, res) => {
    try {
        const hospitalId = req.user._id;

        const emergencies = await Emergency.find({
            hospitalId,
            status: 'active'
        })
        .populate('ambulanceId', 'username vehicleNumber')
        .sort({ estimatedTime: 1 });

        // Calculate precise ETA
        const emergenciesWithDetails = emergencies.map(emergency => {
            const now = new Date();
            const start = new Date(emergency.startTime);
            const elapsed = Math.floor((now - start) / 60000);
            const remaining = emergency.estimatedTime - elapsed;
            
            return {
                ...emergency.toObject(),
                preciseETA: remaining > 0 ? remaining : 0,
                arrivalTime: new Date(now.getTime() + remaining * 60000),
                status: remaining <= 0 ? 'arriving' : 'enroute'
            };
        });

        res.json({
            success: true,
            emergencies: emergenciesWithDetails
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHospitalProfile = async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.user._id);
        
        if (!hospital) {
            return res.status(404).json({ error: 'Hospital not found' });
        }

        // Get current emergencies
        const currentEmergencies = await Emergency.countDocuments({
            hospitalId: req.user._id,
            status: 'active'
        });

        // Get today's arrivals
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayArrivals = await Emergency.countDocuments({
            hospitalId: req.user._id,
            status: 'completed',
            endTime: { $gte: todayStart }
        });

        res.json({
            success: true,
            hospital: {
                ...hospital.toObject(),
                currentEmergencies,
                todayArrivals,
                occupancyRate: hospital.bedsAvailable > 0 
                    ? ((hospital.bedsAvailable - hospital.icuBeds) / hospital.bedsAvailable * 100).toFixed(2)
                    : 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.acknowledgeEmergency = async (req, res) => {
    try {
        const { id } = req.params;

        const emergency = await Emergency.findOne({
            _id: id,
            hospitalId: req.user._id
        });

        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        // Mark as acknowledged by hospital
        emergency.hospitalAcknowledged = true;
        emergency.hospitalAckTime = new Date();
        await emergency.save();

        // Broadcast acknowledgement
        req.io.emit('hospital-acknowledged', {
            emergencyId: emergency._id,
            hospital: req.user.hospitalName,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Emergency acknowledged by hospital',
            emergency
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.prepareForEmergency = async (req, res) => {
    try {
        const { id } = req.params;
        const { preparationDetails } = req.body;

        const emergency = await Emergency.findOne({
            _id: id,
            hospitalId: req.user._id
        });

        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        // Update preparation details
        emergency.hospitalPreparation = preparationDetails || {};
        emergency.hospitalReady = true;
        emergency.hospitalReadyTime = new Date();
        await emergency.save();

        // Notify ambulance and police
        req.io.emit('hospital-prepared', {
            emergencyId: emergency._id,
            hospital: req.user.hospitalName,
            preparation: preparationDetails,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Hospital prepared for emergency arrival',
            emergency
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAmbulanceTracking = async (req, res) => {
    try {
        const { emergencyId } = req.query;

        const emergency = await Emergency.findOne({
            _id: emergencyId,
            hospitalId: req.user._id
        }).populate('ambulanceId', 'username vehicleNumber location');

        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }

        // Calculate distance to hospital
        const distanceToHospital = calculateDistance(
            emergency.currentLocation,
            emergency.destination
        );

        res.json({
            success: true,
            tracking: {
                ambulance: emergency.ambulanceId,
                currentLocation: emergency.currentLocation,
                destination: emergency.destination,
                distanceRemaining: distanceToHospital.toFixed(2) + ' km',
                estimatedArrival: new Date(
                    Date.now() + emergency.estimatedTime * 60000
                ),
                route: emergency.route.slice(-10), // Last 10 locations
                status: emergency.status
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCapacity = async (req, res) => {
    try {
        const { bedsAvailable, icuBeds, specialties } = req.body;
        
        const hospital = await Hospital.findById(req.user._id);
        if (!hospital) {
            return res.status(404).json({ error: 'Hospital not found' });
        }

        // Update capacity
        if (bedsAvailable !== undefined) hospital.bedsAvailable = bedsAvailable;
        if (icuBeds !== undefined) hospital.icuBeds = icuBeds;
        if (specialties) hospital.specialties = specialties;
        
        hospital.updatedAt = new Date();
        await hospital.save();

        // Broadcast capacity update
        req.io.emit('hospital-capacity-updated', {
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            bedsAvailable: hospital.bedsAvailable,
            icuBeds: hospital.icuBeds,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Hospital capacity updated',
            hospital
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const hospitalId = req.user._id;
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));

        // Get today's statistics
        const todayEmergencies = await Emergency.find({
            hospitalId,
            startTime: { $gte: todayStart }
        });

        const activeEmergencies = todayEmergencies.filter(e => e.status === 'active').length;
        const completedToday = todayEmergencies.filter(e => e.status === 'completed').length;
        
        // Calculate average response time
        const avgResponseTime = completedToday > 0
            ? todayEmergencies
                .filter(e => e.status === 'completed' && e.actualTime)
                .reduce((sum, e) => sum + e.actualTime, 0) / completedToday
            : 0;

        // Get hospital capacity
        const hospital = await Hospital.findById(hospitalId);
        const occupancyRate = hospital.bedsAvailable > 0
            ? ((hospital.bedsAvailable - hospital.icuBeds) / hospital.bedsAvailable * 100)
            : 0;

        res.json({
            success: true,
            stats: {
                activeEmergencies,
                completedToday,
                avgResponseTime: avgResponseTime.toFixed(2),
                bedsAvailable: hospital.bedsAvailable,
                icuBeds: hospital.icuBeds,
                occupancyRate: occupancyRate.toFixed(2),
                upcomingArrivals: activeEmergencies
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Helper function to calculate distance
function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
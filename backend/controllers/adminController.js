const User = require('../models/User');
const Emergency = require('../models/Emergency');
const TrafficSignal = require('../models/TrafficSignal');
const Hospital = require('../models/Hospital');
const Congestion = require('../models/Congestion');

exports.getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        
        const query = {};
        if (role) query.role = role;
        
        const users = await User.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-password')
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSystemOverview = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - 7));

        // User statistics
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Emergency statistics
        const totalEmergencies = await Emergency.countDocuments();
        const activeEmergencies = await Emergency.countDocuments({ status: 'active' });
        const todayEmergencies = await Emergency.countDocuments({ 
            startTime: { $gte: todayStart } 
        });
        const weekEmergencies = await Emergency.countDocuments({ 
            startTime: { $gte: weekStart } 
        });

        // Response time statistics
        const completedEmergencies = await Emergency.find({ 
            status: 'completed',
            actualTime: { $exists: true, $gt: 0 }
        });
        
        const avgResponseTime = completedEmergencies.length > 0
            ? completedEmergencies.reduce((sum, e) => sum + e.actualTime, 0) / completedEmergencies.length
            : 0;

        // Traffic statistics
        const totalSignals = await TrafficSignal.countDocuments();
        const prioritySignals = await TrafficSignal.countDocuments({ isPriority: true });
        const activeCongestion = await Congestion.countDocuments({ 
            resolved: false,
            level: { $in: ['medium', 'high'] }
        });

        // Hospital statistics
        const totalHospitals = await Hospital.countDocuments();
        const activeHospitals = await Hospital.countDocuments({ isActive: true });
        const totalBeds = await Hospital.aggregate([
            { $group: { _id: null, totalBeds: { $sum: '$bedsAvailable' } } }
        ]);

        res.json({
            success: true,
            overview: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    byRole: usersByRole
                },
                emergencies: {
                    total: totalEmergencies,
                    active: activeEmergencies,
                    today: todayEmergencies,
                    thisWeek: weekEmergencies,
                    avgResponseTime: avgResponseTime.toFixed(2)
                },
                traffic: {
                    totalSignals,
                    prioritySignals,
                    activeCongestion
                },
                hospitals: {
                    total: totalHospitals,
                    active: activeHospitals,
                    totalBeds: totalBeds[0]?.totalBeds || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role, ...additionalData } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user based on role
        const userData = {
            username,
            email,
            password,
            role
        };

        // Add role-specific data
        if (role === 'ambulance') {
            userData.vehicleNumber = additionalData.vehicleNumber;
        } else if (role === 'hospital') {
            userData.hospitalName = additionalData.hospitalName;
        } else if (role === 'police') {
            userData.stationName = additionalData.stationName;
        }

        const user = new User(userData);
        await user.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove password from update if present
        delete updateData.password;

        const user = await User.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllEmergencies = async (req, res) => {
    try {
        const { status, page = 1, limit = 50, dateFrom, dateTo } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (dateFrom || dateTo) {
            query.startTime = {};
            if (dateFrom) query.startTime.$gte = new Date(dateFrom);
            if (dateTo) query.startTime.$lte = new Date(dateTo);
        }

        const emergencies = await Emergency.find(query)
            .populate('ambulanceId', 'username vehicleNumber')
            .populate('hospitalId', 'name address')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ startTime: -1 });

        const total = await Emergency.countDocuments(query);

        // Calculate statistics
        const stats = {
            total,
            active: await Emergency.countDocuments({ status: 'active' }),
            completed: await Emergency.countDocuments({ status: 'completed' }),
            cancelled: await Emergency.countDocuments({ status: 'cancelled' })
        };

        res.json({
            success: true,
            emergencies,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllSignals = async (req, res) => {
    try {
        const signals = await TrafficSignal.find().sort({ signalId: 1 });

        // Get congestion data for each signal
        const signalsWithStats = await Promise.all(
            signals.map(async (signal) => {
                const congestionCount = await Congestion.countDocuments({
                    signalId: signal.signalId
                });
                
                const activeCongestion = await Congestion.findOne({
                    signalId: signal.signalId,
                    resolved: false
                });

                return {
                    ...signal.toObject(),
                    congestionCount,
                    activeCongestion: activeCongestion || null
                };
            })
        );

        res.json({
            success: true,
            signals: signalsWithStats,
            total: signals.length,
            priorityCount: signals.filter(s => s.isPriority).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createSignal = async (req, res) => {
    try {
        const { signalId, location, lanes, address } = req.body;

        // Check if signal exists
        const existingSignal = await TrafficSignal.findOne({ signalId });
        if (existingSignal) {
            return res.status(400).json({ error: 'Signal ID already exists' });
        }

        const signal = new TrafficSignal({
            signalId,
            location,
            lanes: lanes || [
                { direction: 'north', status: 'normal' },
                { direction: 'south', status: 'normal' },
                { direction: 'east', status: 'normal' },
                { direction: 'west', status: 'normal' }
            ],
            address: address || `Traffic Signal ${signalId}`
        });

        await signal.save();

        res.status(201).json({
            success: true,
            message: 'Traffic signal created successfully',
            signal
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find().sort({ name: 1 });

        // Get emergency statistics for each hospital
        const hospitalsWithStats = await Promise.all(
            hospitals.map(async (hospital) => {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                
                const emergencyStats = await Emergency.aggregate([
                    { $match: { hospitalId: hospital._id } },
                    { $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgTime: { $avg: '$actualTime' }
                    }}
                ]);

                const todayEmergencies = await Emergency.countDocuments({
                    hospitalId: hospital._id,
                    startTime: { $gte: todayStart }
                });

                return {
                    ...hospital.toObject(),
                    emergencyStats,
                    todayEmergencies
                };
            })
        );

        res.json({
            success: true,
            hospitals: hospitalsWithStats,
            total: hospitals.length,
            active: hospitals.filter(h => h.isActive).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createHospital = async (req, res) => {
    try {
        const hospital = new Hospital(req.body);
        await hospital.save();

        // Also create a hospital user account
        const user = new User({
            username: hospital.name.toLowerCase().replace(/\s+/g, '_'),
            email: `admin@${hospital.name.toLowerCase().replace(/\s+/g, '')}.com`,
            password: 'hospital123', // Default password
            role: 'hospital',
            hospitalName: hospital.name
        });
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Hospital created successfully',
            hospital,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                password: 'hospital123' // Show default password
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEmergencyAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Daily emergency counts
        const dailyStats = await Emergency.aggregate([
            {
                $match: {
                    startTime: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$startTime" }
                    },
                    count: { $sum: 1 },
                    avgResponseTime: { $avg: "$actualTime" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Status distribution
        const statusDistribution = await Emergency.aggregate([
            {
                $match: {
                    startTime: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Hourly distribution
        const hourlyDistribution = await Emergency.aggregate([
            {
                $match: {
                    startTime: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $hour: "$startTime" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Hospital-wise statistics
        const hospitalStats = await Emergency.aggregate([
            {
                $match: {
                    startTime: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'hospitals',
                    localField: 'hospitalId',
                    foreignField: '_id',
                    as: 'hospital'
                }
            },
            { $unwind: '$hospital' },
            {
                $group: {
                    _id: '$hospital.name',
                    emergencies: { $sum: 1 },
                    avgResponseTime: { $avg: '$actualTime' }
                }
            },
            { $sort: { emergencies: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            analytics: {
                period: { start: startDate, end: endDate, days },
                dailyStats,
                statusDistribution,
                hourlyDistribution,
                hospitalStats
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.generateReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date();
        start.setDate(start.getDate() - 30); // Default to last 30 days
        const end = endDate ? new Date(endDate) : new Date();

        let report = {};

        switch (type) {
            case 'emergency':
                report = await generateEmergencyReport(start, end);
                break;
            case 'traffic':
                report = await generateTrafficReport(start, end);
                break;
            case 'performance':
                report = await generatePerformanceReport(start, end);
                break;
            default:
                report = await generateComprehensiveReport(start, end);
        }

        res.json({
            success: true,
            report: {
                type,
                period: { start, end },
                generatedAt: new Date(),
                data: report
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

async function generateEmergencyReport(start, end) {
    const emergencies = await Emergency.find({
        startTime: { $gte: start, $lte: end }
    })
    .populate('ambulanceId', 'vehicleNumber')
    .populate('hospitalId', 'name');

    const stats = {
        total: emergencies.length,
        active: emergencies.filter(e => e.status === 'active').length,
        completed: emergencies.filter(e => e.status === 'completed').length,
        cancelled: emergencies.filter(e => e.status === 'cancelled').length,
        avgResponseTime: emergencies
            .filter(e => e.actualTime)
            .reduce((sum, e) => sum + e.actualTime, 0) / emergencies.filter(e => e.actualTime).length || 0
    };

    return { emergencies, stats };
}

async function generateTrafficReport(start, end) {
    const congestion = await Congestion.find({
        timestamp: { $gte: start, $lte: end }
    });

    const signals = await TrafficSignal.find();

    const stats = {
        totalCongestion: congestion.length,
        resolved: congestion.filter(c => c.resolved).length,
        unresolved: congestion.filter(c => !c.resolved).length,
        byLevel: {
            high: congestion.filter(c => c.level === 'high').length,
            medium: congestion.filter(c => c.level === 'medium').length,
            low: congestion.filter(c => c.level === 'low').length
        },
        byCause: congestion.reduce((acc, c) => {
            acc[c.cause] = (acc[c.cause] || 0) + 1;
            return acc;
        }, {}),
        signalsCleared: signals.filter(s => s.isPriority).length
    };

    return { congestion, signals, stats };
}

async function generatePerformanceReport(start, end) {
    const emergencies = await Emergency.find({
        startTime: { $gte: start, $lte: end },
        status: 'completed',
        actualTime: { $exists: true }
    });

    const performance = {
        totalEmergencies: emergencies.length,
        avgResponseTime: emergencies.reduce((sum, e) => sum + e.actualTime, 0) / emergencies.length,
        fastestResponse: Math.min(...emergencies.map(e => e.actualTime)),
        slowestResponse: Math.max(...emergencies.map(e => e.actualTime)),
        efficiency: ((emergencies.filter(e => e.actualTime <= 15).length / emergencies.length) * 100).toFixed(2) + '%'
    };

    return { performance, sampleSize: emergencies.length };
}

async function generateComprehensiveReport(start, end) {
    const emergencyReport = await generateEmergencyReport(start, end);
    const trafficReport = await generateTrafficReport(start, end);
    const performanceReport = await generatePerformanceReport(start, end);

    return {
        emergency: emergencyReport,
        traffic: trafficReport,
        performance: performanceReport,
        summary: {
            totalEmergencies: emergencyReport.stats.total,
            avgResponseTime: emergencyReport.stats.avgResponseTime.toFixed(2),
            congestionCount: trafficReport.stats.totalCongestion,
            clearanceEfficiency: ((trafficReport.stats.resolved / trafficReport.stats.totalCongestion) * 100).toFixed(2) + '%'
        }
    };
}
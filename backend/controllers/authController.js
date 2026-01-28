const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                vehicleNumber: user.vehicleNumber,
                hospitalName: user.hospitalName,
                stationName: user.stationName
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.register = async (req, res) => {
    try {
        const { username, email, password, role, vehicleNumber, hospitalName, stationName } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            role,
            vehicleNumber: role === 'ambulance' ? vehicleNumber : undefined,
            hospitalName: role === 'hospital' ? hospitalName : undefined,
            stationName: role === 'police' ? stationName : undefined
        });

        await user.save();
        
        const token = generateToken(user._id);
        
        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.logout = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
    res.json({ user: req.user });
};
const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const TrafficSignal = require('../models/TrafficSignal');

class Validator {
    // Common validation rules
    static email = body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address');

    static password = body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long');

    static username = body('username')
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-30 characters, alphanumeric and underscores only');

    static role = body('role')
        .isIn(['ambulance', 'police', 'hospital', 'admin'])
        .withMessage('Invalid role specified');

    static location = body('location')
        .custom(value => {
            if (!value || typeof value !== 'object') return false;
            if (typeof value.lat !== 'number' || typeof value.lng !== 'number') return false;
            if (value.lat < -90 || value.lat > 90) return false;
            if (value.lng < -180 || value.lng > 180) return false;
            return true;
        })
        .withMessage('Invalid location coordinates');

    static validate = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => ({
                    field: err.param,
                    message: err.msg,
                    value: err.value
                }))
            });
        }
        next();
    };

    // Authentication validations
    static loginValidation = [
        Validator.email,
        Validator.password,
        Validator.validate
    ];

    static registerValidation = [
        Validator.username,
        Validator.email,
        Validator.password,
        Validator.role,
        body('vehicleNumber')
            .if(body('role').equals('ambulance'))
            .notEmpty()
            .withMessage('Vehicle number is required for ambulance drivers'),
        body('hospitalName')
            .if(body('role').equals('hospital'))
            .notEmpty()
            .withMessage('Hospital name is required for hospital users'),
        body('stationName')
            .if(body('role').equals('police'))
            .notEmpty()
            .withMessage('Station name is required for police users'),
        Validator.validate
    ];

    // Emergency validations
    static startEmergencyValidation = [
        body('hospitalId')
            .isMongoId()
            .withMessage('Invalid hospital ID')
            .custom(async (value) => {
                const hospital = await Hospital.findById(value);
                if (!hospital || !hospital.isActive) {
                    throw new Error('Hospital not found or inactive');
                }
                return true;
            }),
        body('patientInfo')
            .optional()
            .isObject()
            .withMessage('Patient info must be an object'),
        Validator.validate
    ];

    static updateLocationValidation = [
        body('lat')
            .isFloat({ min: -90, max: 90 })
            .withMessage('Latitude must be between -90 and 90'),
        body('lng')
            .isFloat({ min: -180, max: 180 })
            .withMessage('Longitude must be between -180 and 180'),
        body('address')
            .optional()
            .isString()
            .withMessage('Address must be a string'),
        Validator.validate
    ];

    // Traffic signal validations
    static signalValidation = [
        body('signalId')
            .isString()
            .matches(/^TS\d{3}$/)
            .withMessage('Signal ID must be in format TS001')
            .custom(async (value) => {
                const signal = await TrafficSignal.findOne({ signalId: value });
                if (signal) {
                    throw new Error('Signal ID already exists');
                }
                return true;
            }),
        Validator.location,
        body('address')
            .optional()
            .isString()
            .withMessage('Address must be a string'),
        body('lanes')
            .optional()
            .isArray()
            .withMessage('Lanes must be an array'),
        Validator.validate
    ];

    static congestionReportValidation = [
        body('signalId')
            .isString()
            .withMessage('Signal ID is required'),
        body('level')
            .isIn(['low', 'medium', 'high'])
            .withMessage('Congestion level must be low, medium, or high'),
        body('cause')
            .optional()
            .isIn(['accident', 'construction', 'event', 'weather', 'normal', 'other'])
            .withMessage('Invalid cause specified'),
        body('description')
            .optional()
            .isString()
            .withMessage('Description must be a string'),
        body('imageUrl')
            .optional()
            .isURL()
            .withMessage('Image URL must be a valid URL'),
        Validator.validate
    ];

    // Hospital validations
    static hospitalValidation = [
        body('name')
            .isString()
            .isLength({ min: 3, max: 100 })
            .withMessage('Hospital name must be 3-100 characters'),
        Validator.location,
        body('address')
            .isString()
            .isLength({ min: 10, max: 200 })
            .withMessage('Address must be 10-200 characters'),
        body('emergencyContact')
            .isString()
            .matches(/^[\d\s\+\-\(\)]+$/)
            .withMessage('Invalid emergency contact number'),
        body('phone')
            .isString()
            .matches(/^[\d\s\+\-\(\)]+$/)
            .withMessage('Invalid phone number'),
        body('email')
            .isEmail()
            .withMessage('Invalid email address'),
        body('bedsAvailable')
            .isInt({ min: 0 })
            .withMessage('Beds available must be a positive number'),
        body('icuBeds')
            .optional()
            .isInt({ min: 0 })
            .withMessage('ICU beds must be a positive number'),
        body('specialties')
            .optional()
            .isArray()
            .withMessage('Specialties must be an array'),
        body('emergencyServices')
            .optional()
            .isArray()
            .withMessage('Emergency services must be an array'),
        Validator.validate
    ];

    // User management validations
    static userUpdateValidation = [
        param('id')
            .isMongoId()
            .withMessage('Invalid user ID'),
        body('username')
            .optional()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be 3-30 characters'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Invalid email address'),
        body('isActive')
            .optional()
            .isBoolean()
            .withMessage('isActive must be a boolean'),
        Validator.validate
    ];

    // Pagination validations
    static paginationValidation = [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('sort')
            .optional()
            .isString()
            .withMessage('Sort must be a string'),
        query('order')
            .optional()
            .isIn(['asc', 'desc'])
            .withMessage('Order must be asc or desc'),
        Validator.validate
    ];

    // Date range validations
    static dateRangeValidation = [
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be in ISO 8601 format'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be in ISO 8601 format'),
        Validator.validate
    ];

    // Emergency search validations
    static emergencySearchValidation = [
        query('status')
            .optional()
            .isIn(['active', 'completed', 'cancelled'])
            .withMessage('Invalid status'),
        query('hospitalId')
            .optional()
            .isMongoId()
            .withMessage('Invalid hospital ID'),
        query('ambulanceId')
            .optional()
            .isMongoId()
            .withMessage('Invalid ambulance ID'),
        ...Validator.dateRangeValidation,
        ...Validator.paginationValidation
    ];

    // AI optimization validations
    static routeOptimizationValidation = [
        body('start')
            .custom(value => {
                if (!value || typeof value !== 'object') return false;
                if (typeof value.lat !== 'number' || typeof value.lng !== 'number') return false;
                return true;
            })
            .withMessage('Invalid start location'),
        body('end')
            .custom(value => {
                if (!value || typeof value !== 'object') return false;
                if (typeof value.lat !== 'number' || typeof value.lng !== 'number') return false;
                return true;
            })
            .withMessage('Invalid end location'),
        body('emergencyLevel')
            .optional()
            .isIn(['low', 'medium', 'high'])
            .withMessage('Emergency level must be low, medium, or high'),
        body('options')
            .optional()
            .isObject()
            .withMessage('Options must be an object'),
        Validator.validate
    ];

    // Signal clearance validations
    static signalClearanceValidation = [
        param('id')
            .isString()
            .matches(/^TS\d{3}$/)
            .withMessage('Invalid signal ID format'),
        body('emergencyId')
            .optional()
            .isMongoId()
            .withMessage('Invalid emergency ID'),
        body('clearanceDuration')
            .optional()
            .isInt({ min: 30, max: 300 })
            .withMessage('Clearance duration must be between 30 and 300 seconds'),
        Validator.validate
    ];

    // Webhook/notification validations
    static notificationValidation = [
        body('type')
            .isString()
            .isIn(['emergency', 'congestion', 'system', 'alert'])
            .withMessage('Invalid notification type'),
        body('title')
            .isString()
            .isLength({ min: 5, max: 100 })
            .withMessage('Title must be 5-100 characters'),
        body('message')
            .isString()
            .isLength({ min: 10, max: 500 })
            .withMessage('Message must be 10-500 characters'),
        body('priority')
            .isIn(['low', 'medium', 'high', 'critical'])
            .withMessage('Invalid priority level'),
        body('recipients')
            .optional()
            .isArray()
            .withMessage('Recipients must be an array'),
        body('data')
            .optional()
            .isObject()
            .withMessage('Data must be an object'),
        Validator.validate
    ];

    // Custom validation: Check if user exists
    static userExists = (field = 'userId') => {
        return param(field)
            .isMongoId()
            .withMessage(`Invalid ${field}`)
            .custom(async (value) => {
                const user = await User.findById(value);
                if (!user) {
                    throw new Error('User not found');
                }
                return true;
            });
    };

    // Custom validation: Check if hospital exists
    static hospitalExists = (field = 'hospitalId') => {
        return param(field)
            .isMongoId()
            .withMessage(`Invalid ${field}`)
            .custom(async (value) => {
                const hospital = await Hospital.findById(value);
                if (!hospital) {
                    throw new Error('Hospital not found');
                }
                return true;
            });
    };

    // Custom validation: Check if signal exists
    static signalExists = (field = 'signalId') => {
        return param(field)
            .isString()
            .withMessage(`Invalid ${field}`)
            .custom(async (value) => {
                const signal = await TrafficSignal.findOne({ signalId: value });
                if (!signal) {
                    throw new Error('Traffic signal not found');
                }
                return true;
            });
    };

    // Custom validation: Check if emergency exists
    static emergencyExists = (field = 'emergencyId') => {
        return param(field)
            .isMongoId()
            .withMessage(`Invalid ${field}`)
            .custom(async (value) => {
                const emergency = await Emergency.findById(value);
                if (!emergency) {
                    throw new Error('Emergency not found');
                }
                return true;
            });
    };

    // Sanitize input
    static sanitize = (req, res, next) => {
        // Trim strings
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }

        // Convert to lowercase where appropriate
        if (req.body.email) req.body.email = req.body.email.toLowerCase();
        if (req.body.username) req.body.username = req.body.username.toLowerCase();

        next();
    };

    // Validate coordinates array
    static coordinatesValidation = (field = 'coordinates') => {
        return body(field)
            .isArray()
            .withMessage(`${field} must be an array`)
            .custom((value) => {
                if (!Array.isArray(value)) return false;
                
                for (const coord of value) {
                    if (!coord || typeof coord !== 'object') return false;
                    if (typeof coord.lat !== 'number' || typeof coord.lng !== 'number') return false;
                    if (coord.lat < -90 || coord.lat > 90) return false;
                    if (coord.lng < -180 || coord.lng > 180) return false;
                }
                
                return true;
            })
            .withMessage(`Invalid coordinates in ${field}`);
    };

    // Validate time range
    static timeRangeValidation = (startField = 'startTime', endField = 'endTime') => {
        return [
            body(startField)
                .optional()
                .isISO8601()
                .withMessage(`${startField} must be in ISO 8601 format`),
            body(endField)
                .optional()
                .isISO8601()
                .withMessage(`${endField} must be in ISO 8601 format`)
                .custom((value, { req }) => {
                    if (req.body[startField] && value) {
                        const start = new Date(req.body[startField]);
                        const end = new Date(value);
                        if (end <= start) {
                            throw new Error(`${endField} must be after ${startField}`);
                        }
                    }
                    return true;
                })
        ];
    };

    // Validate numeric range
    static numericRangeValidation = (field, min, max) => {
        return body(field)
            .optional()
            .isInt({ min, max })
            .withMessage(`${field} must be between ${min} and ${max}`);
    };

    // Validate array of strings
    static stringArrayValidation = (field, minLength = 1, maxLength = 100) => {
        return body(field)
            .optional()
            .isArray()
            .withMessage(`${field} must be an array`)
            .custom((value) => {
                if (!Array.isArray(value)) return false;
                
                for (const item of value) {
                    if (typeof item !== 'string') return false;
                    if (item.length < minLength || item.length > maxLength) return false;
                }
                
                return true;
            })
            .withMessage(`Each item in ${field} must be a string between ${minLength} and ${maxLength} characters`);
    };

    // Validate URL
    static urlValidation = (field) => {
        return body(field)
            .optional()
            .isURL({
                protocols: ['http', 'https'],
                require_protocol: true,
                require_valid_protocol: true
            })
            .withMessage(`${field} must be a valid URL with http or https protocol`);
    };

    // Validate phone number
    static phoneValidation = (field) => {
        return body(field)
            .matches(/^[\d\s\+\-\(\)]{10,15}$/)
            .withMessage(`${field} must be a valid phone number (10-15 digits)`);
    };
}

module.exports = Validator;
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');

// Validation rules
const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
];

const registerValidation = [
    body('username').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['ambulance', 'police', 'hospital', 'admin']),
    body('vehicleNumber').optional().notEmpty(),
    body('hospitalName').optional().notEmpty(),
    body('stationName').optional().notEmpty()
];

// Routes
router.post('/login', loginValidation, validate, authController.login);
router.post('/register', registerValidation, validate, authController.register);
router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);

module.exports = router;
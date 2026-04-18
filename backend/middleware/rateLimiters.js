const rateLimit = require('express-rate-limit');

const defaultHandler = (req, res) => {
  res.status(429).json({
    msg: 'Too many requests, please try again later.',
    requestId: req.id || null,
  });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

const emergencyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

const trafficLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

module.exports = {
  authLimiter,
  emergencyLimiter,
  trafficLimiter,
};

const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  return res.status(404).json({
    msg: 'Route not found',
    path: req.originalUrl,
    requestId: req.id || null,
  });
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  if (statusCode >= 500) {
    logger.error('unhandled_http_error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({
    msg: message,
    requestId: req.id || null,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ msg: 'JWT_SECRET is not configured on server' });
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  return jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    req.user = decoded.user;
    return next();
  });
};

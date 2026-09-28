const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT authentication token from Authorization header.
 * Expected Header format: "Authorization: Bearer <token>"
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization header provided.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format. Format should be: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fleetlink_secret_key');
    req.user = decoded; // { id, email, name, role, iat, exp }
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}

/**
 * Role-check middleware factory.
 * Example: requireRole('fleet_operator') or requireRole('fleet_operator', 'owner_driver')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This resource requires one of the following roles: [${roles.join(', ')}]. Your current role is '${req.user.role}'.`
      });
    }

    next();
  };
}

/**
 * Attaches req.user when a valid token is present, but lets the request
 * through when it is absent.
 *
 * Used by GET /api/trips/:id. That endpoint is reachable both anonymously
 * (browse a trip's public details) and with a token (see the full row), so
 * the handler needs to know who is asking without demanding it. An invalid
 * token is still rejected outright — a bad credential should not silently
 * downgrade to an anonymous request.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format. Format should be: Bearer <token>'
    });
  }

  try {
    req.user = jwt.verify(parts[1], process.env.JWT_SECRET || 'fleetlink_secret_key');
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }

  return next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};

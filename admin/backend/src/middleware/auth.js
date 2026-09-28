const jwt = require('jsonwebtoken');

/**
 * Middleware to verify an ADMIN JWT from the Authorization header.
 * Expected Header format: "Authorization: Bearer <token>"
 *
 * Tokens are signed with the admin API's own JWT_SECRET, so a token issued by the
 * public API (port 5000) fails verification here and is rejected with 401.
 */
function authenticateAdmin(req, res, next) {
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

  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'fleetlink_admin_secret_key');
    req.admin = decoded; // { id, email, name, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin session. Please sign in again.'
    });
  }
}

/**
 * Gate that allows only role='admin' through. Runs after authenticateAdmin.
 */
function requireAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required.'
    });
  }

  if (req.admin.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: This resource is restricted to administrators.'
    });
  }

  next();
}

module.exports = {
  authenticateAdmin,
  requireAdmin
};

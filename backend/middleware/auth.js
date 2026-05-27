const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret';

// Verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Role-based access control
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// Shorthand middlewares
const requireSuperadmin = [verifyToken, requireRole('superadmin')];
const requireProvider   = [verifyToken, requireRole('provider', 'superadmin')];
const requireTourist    = [verifyToken, requireRole('tourist', 'superadmin')];
const requireAuth       = [verifyToken];

module.exports = { verifyToken, requireRole, requireSuperadmin, requireProvider, requireTourist, requireAuth };

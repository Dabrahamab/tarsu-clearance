const jwt = require('jsonwebtoken');
const { queries } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-secret';

function signToken(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await queries.findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    return next();
  };
}

module.exports = { signToken, authenticate, authorize };
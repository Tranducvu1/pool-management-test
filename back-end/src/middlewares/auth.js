const jwt = require('jsonwebtoken');
const config = require('../config');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};

module.exports = { requireAuth };

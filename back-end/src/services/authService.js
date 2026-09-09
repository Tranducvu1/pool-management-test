const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const config = require('../config');

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error('Email hoặc mật khẩu không đúng');
    error.statusCode = 401;
    throw error;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const error = new Error('Email hoặc mật khẩu không đúng');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, config.jwtSecret, {
    expiresIn: '7d',
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
};

module.exports = { login };

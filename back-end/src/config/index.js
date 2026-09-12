require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-pool-management-secret',
};

module.exports = config;

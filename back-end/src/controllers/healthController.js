const prisma = require('../config/db');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Controller kiểm tra tình trạng hoạt động của Server và Database
 */
const getHealthStatus = async (req, res, next) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = `disconnected (${error.message})`;
  }

  return sendSuccess(
    res,
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
    'Server is healthy'
  );
};

module.exports = {
  getHealthStatus,
};

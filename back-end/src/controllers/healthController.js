const prisma = require('../config/db');
const { sendSuccess } = require('../utils/apiResponse');

const checkDbConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch (error) {
    return `disconnected (${error.message})`;
  }
};

/**
 * Controller kiểm tra tình trạng hoạt động của Server và Database
 */
const getHealthStatus = async (_req, res) => {
  const database = await checkDbConnection();

  return sendSuccess(
    res,
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database,
    },
    'Server is healthy'
  );
};

module.exports = {
  getHealthStatus,
};

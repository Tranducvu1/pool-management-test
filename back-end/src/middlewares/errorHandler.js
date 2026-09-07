const { sendError } = require('../utils/apiResponse');
const config = require('../config');

/**
 * Middleware bắt lỗi tập trung (Global Error Handler)
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ (Internal Server Error)';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(config.isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;

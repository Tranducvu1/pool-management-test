const { sendError } = require('../utils/apiResponse');

const notFoundHandler = (req, res) => {
  return sendError(res, `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại`, 404);
};

module.exports = notFoundHandler;

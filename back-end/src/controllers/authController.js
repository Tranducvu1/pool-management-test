const { login } = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Nhập email và mật khẩu' });
    }
    const data = await login(email, password);
    return sendSuccess(res, data, 'Đăng nhập thành công');
  } catch (error) {
    return next(error);
  }
};

module.exports = { loginController };

const express = require('express');
const router = express.Router();

const { getHealthStatus } = require('../controllers/healthController');

// Base healthcheck route
router.get('/health', getHealthStatus);

// Đăng ký các routes nghiệp vụ của bạn tại đây
// Ví dụ: router.use('/users', userRoutes);
//        router.use('/pools', poolRoutes);

module.exports = router;

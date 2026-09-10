const express = require('express');
const router = express.Router();

const { getHealthStatus } = require('../controllers/healthController');
const { loginController } = require('../controllers/authController');
const {
  getStudents,
  getDashboardController,
  createStudentController,
  enrollFaceController,
  deleteStudentController,
} = require('../controllers/studentController');
const { checkinController, getTodayController } = require('../controllers/attendanceController');
const { requireAuth } = require('../middlewares/auth');

router.get('/health', getHealthStatus);
router.post('/auth/login', loginController);

router.get('/students', requireAuth, getStudents);
router.post('/students', requireAuth, createStudentController);
router.patch('/students/:id/face', requireAuth, enrollFaceController);
router.delete('/students/:id', requireAuth, deleteStudentController);
router.get('/dashboard', requireAuth, getDashboardController);
router.get('/attendance/today', requireAuth, getTodayController);
router.post('/attendance/checkin', requireAuth, checkinController);

module.exports = router;

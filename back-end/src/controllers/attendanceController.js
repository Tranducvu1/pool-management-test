const { z } = require('zod');
const { checkin, listToday } = require('../services/attendanceService');
const { sendSuccess } = require('../utils/apiResponse');

const checkinSchema = z.object({
  faceDescriptor: z.array(z.number()).length(128, 'Cần descriptor khuôn mặt'),
  photoUrl: z.string().optional(),
});

const checkinController = async (req, res, next) => {
  try {
    const payload = checkinSchema.parse(req.body);
    const data = await checkin(payload);
    return sendSuccess(res, data, `Điểm danh thành công: ${data.student.name}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    return next(error);
  }
};

const getTodayController = async (_req, res, next) => {
  try {
    const data = await listToday();
    return sendSuccess(res, data, 'Điểm danh hôm nay');
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkinController, getTodayController };

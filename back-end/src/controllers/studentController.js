const { z } = require('zod');
const {
  listStudents,
  getDashboard,
  createStudent,
  enrollFace,
  deleteStudent,
} = require('../services/studentService');
const { sendSuccess } = require('../utils/apiResponse');

const createStudentSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống'),
  phone: z.string().min(8, 'Số điện thoại không hợp lệ'),
  dob: z.string().min(1, 'Ngày sinh không được để trống'),
  currentSwimStyle: z.string().optional(),
  totalSessions: z.coerce.number().int().min(1, 'Số buổi phải lớn hơn 0'),
  photoUrl: z.string().min(20, 'Cần ảnh đăng ký (chụp hoặc tải lên)'),
  faceDescriptor: z.array(z.number()).length(128, 'Không nhận diện được khuôn mặt trong ảnh'),
});

const getStudents = async (_req, res, next) => {
  try {
    const students = await listStudents();
    return sendSuccess(res, students, 'Danh sách học sinh');
  } catch (error) {
    return next(error);
  }
};

const getDashboardController = async (_req, res, next) => {
  try {
    const data = await getDashboard();
    return sendSuccess(res, data, 'Thống kê');
  } catch (error) {
    return next(error);
  }
};

const createStudentController = async (req, res, next) => {
  try {
    const payload = createStudentSchema.parse(req.body);
    const student = await createStudent(payload);
    return sendSuccess(res, student, `Đã đăng ký ${student.name}`, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    return next(error);
  }
};

const enrollFaceController = async (req, res, next) => {
  try {
    const payload = z
      .object({
        photoUrl: z.string().min(8).optional(),
        faceDescriptor: z.array(z.number()).length(128),
      })
      .parse(req.body);
    const student = await enrollFace(req.params.id, payload);
    return sendSuccess(res, student, `Đã gắn khuôn mặt cho ${student.name}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    return next(error);
  }
};

const deleteStudentController = async (req, res, next) => {
  try {
    const student = await deleteStudent(req.params.id);
    return sendSuccess(res, student, `Đã xóa học sinh ${student.name} thành công`);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStudents,
  getDashboardController,
  createStudentController,
  enrollFaceController,
  deleteStudentController,
};

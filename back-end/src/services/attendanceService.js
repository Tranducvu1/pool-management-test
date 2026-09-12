const prisma = require('../config/db');
const {
  ATTENDANCE_SHIFT,
  ATTENDANCE_SHIFT_LABEL,
  ATTENDANCE_SHIFT_SPLIT_HOUR,
  FACE_API,
} = require('../constants/faceApi');
const { saveDataUrl } = require('../utils/savePhoto');

const toDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAttendanceShift = (date = new Date()) =>
  date.getHours() < ATTENDANCE_SHIFT_SPLIT_HOUR
    ? ATTENDANCE_SHIFT.MORNING
    : ATTENDANCE_SHIFT.AFTERNOON;

const euclideanDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

const matchStudentByDescriptor = async (descriptor) => {
  const students = await prisma.student.findMany({
    where: { faceEmbeddingJson: { not: null } },
  });

  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  students.forEach((student) => {
    const parsed = JSON.parse(student.faceEmbeddingJson);
    const stored = Array.isArray(parsed) ? parsed : Object.values(parsed);
    if (stored.length !== FACE_API.DESCRIPTOR_LENGTH) return;
    const distance = euclideanDistance(descriptor, stored.map(Number));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = student;
    }
  });

  if (!best || bestDistance > FACE_API.THRESHOLD) {
    const error = new Error(
      best
        ? `Không khớp khuôn mặt đã đăng ký. Gần nhất: ${best.name} (${bestDistance.toFixed(2)}).`
        : 'Ảnh đăng ký chưa trích được vector khuôn mặt. Vào Học sinh → Gắn khuôn mặt, rồi điểm danh lại.'
    );
    error.statusCode = 404;
    throw error;
  }

  return { student: best, distance: bestDistance };
};

const checkin = async ({ faceDescriptor, photoUrl }) => {
  const match = await matchStudentByDescriptor(faceDescriptor);

  const student = match.student;
  const checkInTime = new Date();
  const checkInDate = toDateKey(checkInTime);
  const studyShift = getAttendanceShift(checkInTime);
  const shiftLabel = ATTENDANCE_SHIFT_LABEL[studyShift];

  if (student.remainingSessions <= 0) {
    const error = new Error(`${student.name} đã hết buổi học`);
    error.statusCode = 400;
    throw error;
  }

  const alreadyCheckedShift = await prisma.attendance.findFirst({
    where: {
      studentId: student.id,
      checkInDate,
      studyShift,
    },
  });

  if (alreadyCheckedShift) {
    const error = new Error(`${student.name} đã điểm danh ${shiftLabel} hôm nay`);
    error.statusCode = 409;
    throw error;
  }

  const savedPhotoPath = saveDataUrl(photoUrl, 'attendance');

  const [attendance, updated] = await prisma.$transaction([
    prisma.attendance.create({
      data: {
        studentId: student.id,
        checkInTime,
        checkInDate,
        studyShift,
        photoUrl: savedPhotoPath,
        method: 'FACE',
        note: `Điểm danh khuôn mặt ${shiftLabel} (khoảng cách ${match.distance.toFixed(3)})`,
      },
      include: { student: true },
    }),
    prisma.student.update({
      where: { id: student.id },
      data: { remainingSessions: { decrement: 1 } },
    }),
  ]);

  return {
    ...attendance,
    student: updated,
  };
};

const listToday = () => {
  const checkInDate = toDateKey(new Date());

  return prisma.attendance.findMany({
    where: { checkInDate },
    orderBy: { checkInTime: 'desc' },
    include: { student: true },
  });
};

module.exports = { checkin, listToday, getAttendanceShift, toDateKey };

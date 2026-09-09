const prisma = require('../config/db');

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
    if (stored.length !== descriptor.length) return;
    const distance = euclideanDistance(descriptor, stored.map(Number));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = student;
    }
  });

  if (!best || bestDistance > 0.65) {
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

  if (student.remainingSessions <= 0) {
    const error = new Error(`${student.name} đã hết buổi học`);
    error.statusCode = 400;
    throw error;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const alreadyToday = await prisma.attendance.findFirst({
    where: {
      studentId: student.id,
      checkInTime: { gte: todayStart },
    },
  });

  if (alreadyToday) {
    const error = new Error(`${student.name} đã điểm danh hôm nay`);
    error.statusCode = 409;
    throw error;
  }

  const [attendance, updated] = await prisma.$transaction([
    prisma.attendance.create({
      data: {
        studentId: student.id,
        photoUrl: photoUrl || null,
        method: 'FACE',
        note: `Điểm danh khuôn mặt (khoảng cách ${match.distance.toFixed(3)})`,
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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return prisma.attendance.findMany({
    where: { checkInTime: { gte: todayStart } },
    orderBy: { checkInTime: 'desc' },
    include: { student: true },
  });
};

module.exports = { checkin, listToday };

const prisma = require('../config/db');
const { saveDataUrl } = require('../utils/savePhoto');

const listStudents = () =>
  prisma.student.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { attendances: true } },
    },
  });

const getDashboard = async () => {
  const [studentCount, todayCount, recent, students] = await Promise.all([
    prisma.student.count(),
    prisma.attendance.count({
      where: {
        checkInTime: { gte: startOfDay(new Date()) },
      },
    }),
    prisma.attendance.findMany({
      orderBy: { checkInTime: 'desc' },
      take: 8,
      include: { student: true },
    }),
    prisma.student.findMany({ select: { remainingSessions: true, totalSessions: true } }),
  ]);

  const lowSessions = students.filter((s) => s.remainingSessions <= 5).length;
  const byDay = await attendanceByDay(7);

  return {
    studentCount,
    todayCount,
    lowSessions,
    recent,
    byDay,
  };
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const attendanceByDay = async (days) => {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (days - 1));

  const rows = await prisma.attendance.findMany({
    where: { checkInTime: { gte: from } },
    select: { checkInTime: true },
  });

  const map = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  rows.forEach((row) => {
    const key = row.checkInTime.toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, map.get(key) + 1);
    }
  });

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
};

const createStudent = async ({
  name,
  phone,
  dob,
  currentSwimStyle,
  totalSessions,
  photoUrl,
  faceDescriptor,
}) => {
  const sessions = Number(totalSessions) || 0;
  const photoPath = saveDataUrl(photoUrl, 'students');

  return prisma.student.create({
    data: {
      name: name.trim(),
      phone: phone.trim(),
      dob: new Date(dob),
      currentSwimStyle: currentSwimStyle.trim() || 'Freestyle',
      totalSessions: sessions,
      remainingSessions: sessions,
      photoUrl: photoPath,
      faceEmbeddingJson: Array.isArray(faceDescriptor) ? JSON.stringify(faceDescriptor) : null,
    },
  });
};

const enrollFace = async (id, { photoUrl, faceDescriptor }) => {
  const photoPath = saveDataUrl(photoUrl, 'students');
  return prisma.student.update({
    where: { id: Number(id) },
    data: {
      ...(photoPath ? { photoUrl: photoPath } : {}),
      faceEmbeddingJson: JSON.stringify(faceDescriptor),
    },
  });
};

module.exports = { listStudents, getDashboard, createStudent, enrollFace };

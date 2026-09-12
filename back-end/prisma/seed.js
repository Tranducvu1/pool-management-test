const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getShift = (date) => (date.getHours() < 12 ? 'MORNING' : 'AFTERNOON');

const students = [
  {
    name: 'Nguyễn Minh An',
    phone: '0901111001',
    dob: '2016-03-12',
    currentSwimStyle: 'Freestyle',
    totalSessions: 24,
    remainingSessions: 18,
  },
  {
    name: 'Trần Gia Bảo',
    phone: '0901111002',
    dob: '2015-07-21',
    currentSwimStyle: 'Breaststroke',
    totalSessions: 20,
    remainingSessions: 9,
  },
  {
    name: 'Lê Ngọc Hà',
    phone: '0901111003',
    dob: '2017-01-08',
    currentSwimStyle: 'Backstroke',
    totalSessions: 16,
    remainingSessions: 12,
  },
  {
    name: 'Phạm Quốc Huy',
    phone: '0901111004',
    dob: '2014-11-02',
    currentSwimStyle: 'Butterfly',
    totalSessions: 32,
    remainingSessions: 4,
  },
  {
    name: 'Hoàng Mai Linh',
    phone: '0901111005',
    dob: '2016-09-30',
    currentSwimStyle: 'Freestyle',
    totalSessions: 20,
    remainingSessions: 20,
  },
  {
    name: 'Vũ Đức Nam',
    phone: '0901111006',
    dob: '2015-05-14',
    currentSwimStyle: 'Freestyle',
    totalSessions: 24,
    remainingSessions: 7,
  },
  {
    name: 'Đặng Khánh Vy',
    phone: '0901111007',
    dob: '2018-02-19',
    currentSwimStyle: 'Breaststroke',
    totalSessions: 12,
    remainingSessions: 10,
  },
  {
    name: 'Bùi Thành Đạt',
    phone: '0901111008',
    dob: '2013-08-05',
    currentSwimStyle: 'Butterfly',
    totalSessions: 40,
    remainingSessions: 15,
  },
];

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      email: 'admin@pool.vn',
      name: 'Quản trị viên',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const created = [];
  for (const student of students) {
    created.push(
      await prisma.student.create({
        data: {
          ...student,
          dob: new Date(student.dob),
        },
      })
    );
  }

  const now = Date.now();
  const sampleCheckins = [
    { studentIndex: 0, hoursAgo: 2 },
    { studentIndex: 1, hoursAgo: 2 },
    { studentIndex: 2, hoursAgo: 26 },
    { studentIndex: 3, hoursAgo: 26 },
    { studentIndex: 5, hoursAgo: 50 },
    { studentIndex: 0, hoursAgo: 74 },
    { studentIndex: 7, hoursAgo: 74 },
  ];

  for (const item of sampleCheckins) {
    const checkInTime = new Date(now - item.hoursAgo * 60 * 60 * 1000);
    await prisma.attendance.create({
      data: {
        studentId: created[item.studentIndex].id,
        checkInTime,
        checkInDate: toDateKey(checkInTime),
        studyShift: getShift(checkInTime),
        method: item.studentIndex % 2 === 0 ? 'FACE' : 'MANUAL',
        note: 'Dữ liệu mẫu',
      },
    });
  }

  console.log('Seed xong: admin@pool.vn / admin123 + 8 học sinh + điểm danh mẫu');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

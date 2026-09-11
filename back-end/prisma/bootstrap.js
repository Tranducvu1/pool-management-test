const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const demoStudents = [
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
];

const ensureAdmin = async () => {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@pool.vn' } });
  if (existing) return;

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@pool.vn',
      name: 'Quản trị viên',
      passwordHash,
      role: 'ADMIN',
    },
  });
};

const ensureDemoStudents = async () => {
  const count = await prisma.student.count();
  if (count > 0) return;

  for (const student of demoStudents) {
    await prisma.student.create({
      data: {
        ...student,
        dob: new Date(student.dob),
      },
    });
  }
};

async function main() {
  await ensureAdmin();
  await ensureDemoStudents();
  console.log('Bootstrap xong: admin@pool.vn / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

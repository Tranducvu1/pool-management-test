const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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

async function main() {
  await ensureAdmin();
  console.log('Bootstrap xong: admin@pool.vn / admin123, không tạo dữ liệu mẫu');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

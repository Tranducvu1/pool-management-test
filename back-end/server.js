const app = require('./src/app');
const config = require('./src/config');
const prisma = require('./src/config/db');

const server = app.listen(config.port, () => {
  console.log(`=================================================`);
  console.log(`🚀 Server running in [${config.nodeEnv}] mode on port: ${config.port}`);
  console.log(`🔗 API Healthcheck: http://localhost:${config.port}/api/health`);
  console.log(`=================================================`);
});

// Graceful shutdown
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Đang đóng server HTTP và ngắt kết nối database...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('✅ Đã ngắt kết nối database. Tiến trình kết thúc an toàn.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi ngắt kết nối:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

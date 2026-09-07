# Database Management

Thư mục này quản lý cấu hình cơ sở dữ liệu PostgreSQL cho dự án **Pool Management**.

## Khởi động CSDL cục bộ bằng Docker

Nếu máy của bạn đã cài đặt Docker, bạn có thể khởi động CSDL PostgreSQL một cách nhanh chóng:

```bash
# Khởi động PostgreSQL container
docker compose up -d

# Kiểm tra trạng thái container
docker compose ps

# Dừng PostgreSQL container
docker compose down
```

## Thông tin kết nối mặc định:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `pool_management`
- **Username**: `postgres`
- **Password**: `postgrespassword`
- **Connection URL**: `postgresql://postgres:postgrespassword@localhost:5432/pool_management?schema=public`

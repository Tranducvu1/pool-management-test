# Pool Management System 🏊‍♂️

Dự án fullstack Node.js + React.js với kiến trúc phân tầng chuyên nghiệp (Layered Architecture), quản lý gói qua **pnpm workspace** và CSDL PostgreSQL qua **Prisma ORM**.

---

## 📁 Cấu Trúc Khung Dự Án Hoàn Chỉnh

```text
pool-management/
├── back-end/                     # [1] Server Node.js (Express + Prisma)
│   ├── prisma/
│   │   ├── migrations/          # Nơi lưu trữ các file migration (.gitkeep)
│   │   └── schema.prisma        # Cấu hình Datasource & Model CSDL
│   ├── src/
│   │   ├── config/              # Cấu hình biến môi trường & kết nối CSDL
│   │   │   ├── db.js            # Prisma Client singleton
│   │   │   └── index.js         # Gom các biến cấu hình từ process.env
│   │   ├── constants/           # Các hằng số (Status codes, Enums,...) (.gitkeep)
│   │   ├── controllers/         # Tầng xử lý Request/Response (.gitkeep)
│   │   │   └── healthController.js # Endpoint kiểm tra sức khỏe hệ thống
│   │   ├── middlewares/         # Middleware hệ thống
│   │   │   ├── errorHandler.js  # Xử lý lỗi tập trung
│   │   │   ├── notFoundHandler.js # Xử lý lỗi 404
│   │   │   └── requestLogger.js # Ghi log các request
│   │   ├── models/              # Định nghĩa schema/types (.gitkeep)
│   │   ├── routes/              # Định tuyến API
│   │   │   └── api.js           # Router API trung tâm (/api/...)
│   │   ├── services/            # Tầng xử lý nghiệp vụ/Business logic (.gitkeep)
│   │   ├── utils/               # Tiện ích dùng chung
│   │   │   └── apiResponse.js   # Chuẩn hóa JSON Response (sendSuccess, sendError)
│   │   ├── validations/         # Validation schema dữ liệu đầu vào (.gitkeep)
│   │   └── app.js               # Khởi tạo Express app, CORS, Body parser
│   ├── .env & .env.example      # Cấu hình biến môi trường
│   ├── package.json
│   └── server.js                # Khởi chạy HTTP Server & Graceful shutdown
│
├── front-end/                    # [2] Client React.js (Vite)
│   ├── src/
│   │   ├── assets/              # Lưu ảnh, icons, svgs (.gitkeep)
│   │   ├── components/          # UI Components dùng chung (.gitkeep)
│   │   ├── hooks/               # Custom hooks (.gitkeep)
│   │   ├── pages/               # Các trang giao diện (.gitkeep)
│   │   ├── services/            # Tầng gọi API sang backend (.gitkeep)
│   │   ├── utils/               # Tiện ích/Helper (.gitkeep)
│   │   ├── App.jsx              # Root Component tối giản
│   │   ├── main.jsx             # Entrypoint React 18
│   │   └── index.css            # CSS reset cơ bản
│   ├── index.html
│   ├── package.json
│   └── vite.config.js           # Cấu hình Path Alias (@/) và Proxy /api
│
├── database/                     # [3] Cơ Sở Dữ Liệu
│   ├── docker-compose.yml       # Khởi chạy PostgreSQL 16
│   └── README.md                # Tài liệu quản trị DB
│
├── pnpm-workspace.yaml           # Quản lý workspace monorepo
├── .gitignore                    # Bỏ qua node_modules, .env, build output
├── package.json                  # Root scripts điều khiển toàn bộ dự án
└── README.md                     # Tài liệu hướng dẫn
```

---

## 🚀 Các Lệnh Thao Tác Cơ Bản (pnpm)

Tại thư mục gốc:

```bash
# Cài đặt tất cả dependencies
pnpm install

# Khởi chạy đồng thời cả Backend và Frontend
pnpm run dev

# Chạy migration CSDL (sau khi cấu hình DATABASE_URL trong back-end/.env)
pnpm run db:migrate

# Sinh Prisma Client
pnpm run db:generate

# Mở giao diện quản trị CSDL trực quan Prisma Studio
pnpm run db:studio

# Khởi chạy container PostgreSQL (nếu dùng Docker)
pnpm run db:up
```

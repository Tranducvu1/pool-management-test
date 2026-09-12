# Pool Management System 🏊‍♂️

Dự án Fullstack Node.js + React.js xây dựng theo chuẩn kiến trúc doanh nghiệp cao cấp (**Enterprise Grade 10/10**):

- **Monorepo Management**: `pnpm workspace`
- **Backend Architecture**: Node.js, Express, Layered Pattern, **Prisma ORM** (PostgreSQL)
- **Frontend Architecture**: React 18, Vite, Role-based Layouts (Admin / User / Auth)
- **Code Quality & CI/CD**: ESLint (v9 Flat Config), Prettier, EditorConfig, **Husky Git Hooks** & **Lint-Staged**

---

## 📁 Cấu Trúc Dự Án Hoàn Chỉnh

```text
pool-management/
├── .husky/                       # Git hooks tự động format & check lỗi trước khi commit
│   └── pre-commit
├── .editorconfig                 # Chuẩn hóa format (2 spaces, LF, UTF-8) cho mọi IDE
├── .prettierrc & .prettierignore # Quy chuẩn làm đẹp mã nguồn (Prettier)
├── .lintstagedrc.json            # Tự động format các file được git add
│
├── back-end/                     # [1] Server Node.js (Express + Prisma Migration)
│   ├── prisma/
│   │   ├── migrations/          # File migration CSDL (.gitkeep)
│   │   └── schema.prisma        # Cấu hình Datasource PostgreSQL & Model
│   ├── src/
│   │   ├── config/              # Cấu hình biến môi trường & kết nối CSDL (db.js, index.js)
│   │   ├── constants/           # Các hằng số (Status codes, Enums,...) (.gitkeep)
│   │   ├── controllers/         # Tầng xử lý Request/Response (.gitkeep)
│   │   │   └── healthController.js # Endpoint kiểm tra sức khỏe hệ thống
│   │   ├── middlewares/         # errorHandler, notFoundHandler, requestLogger
│   │   ├── models/              # Schema/types/DTOs (.gitkeep)
│   │   ├── routes/              # api.js - Router trung tâm (/api/...)
│   │   ├── services/            # Tầng xử lý nghiệp vụ/Business logic (.gitkeep)
│   │   ├── utils/               # apiResponse.js - Chuẩn hóa JSON Response
│   │   ├── validations/         # Validation schema đầu vào (.gitkeep)
│   │   └── app.js               # Khởi tạo Express app, CORS, Body parser
│   ├── .env & .env.example      # Cấu hình biến môi trường
│   ├── .gitignore               # Quy tắc bỏ qua file của backend
│   ├── eslint.config.js         # ESLint Flat Config cho Node.js
│   ├── package.json
│   └── server.js                # Khởi chạy HTTP Server & Graceful shutdown
│
├── front-end/                    # [2] Client React.js (Vite)
│   ├── src/
│   │   ├── assets/              # Lưu ảnh, icons, svgs (.gitkeep)
│   │   ├── components/          # UI Components dùng chung (.gitkeep)
│   │   ├── hooks/               # Custom hooks (.gitkeep)
│   │   ├── layouts/             # Khung bố cục giao diện
│   │   │   ├── admin/           # Bố cục cho Admin (Sidebar, Header quản trị) (.gitkeep)
│   │   │   ├── user/            # Bố cục cho Khách hàng (Navbar, Footer) (.gitkeep)
│   │   │   └── auth/            # Bố cục trang Đăng nhập / Đăng ký (.gitkeep)
│   │   ├── pages/               # Màn hình theo phân quyền
│   │   │   ├── admin/           # Các trang dành riêng cho Admin (.gitkeep)
│   │   │   ├── user/            # Các trang dành cho Khách hàng (.gitkeep)
│   │   │   └── auth/            # Trang Login, Register (.gitkeep)
│   │   ├── routes/              # Điều hướng & bảo vệ quyền truy cập (Guards) (.gitkeep)
│   │   ├── services/            # Tầng gọi API sang backend (.gitkeep)
│   │   ├── utils/               # Tiện ích/Helper (.gitkeep)
│   │   ├── App.jsx              # Root Component tối giản
│   │   ├── main.jsx             # Entrypoint React 18
│   │   └── index.css            # CSS reset cơ bản
│   ├── .gitignore               # Quy tắc bỏ qua file của frontend
│   ├── eslint.config.js         # ESLint Flat Config cho React & Hooks
│   ├── index.html
│   ├── package.json
│   └── vite.config.js           # Cấu hình Path Alias (@/) và Proxy /api
│
├── pnpm-workspace.yaml           # Quản lý workspace monorepo
├── .gitignore                    # Bỏ qua node_modules, .env, build output
├── package.json                  # Root scripts điều khiển toàn bộ dự án
└── README.md                     # Tài liệu hướng dẫn
```

---

## 🛠️ Bộ Lệnh Phát Triển & Kiểm Tra Code (pnpm)

Tại thư mục gốc:

### 1. Khởi chạy dự án

```bash
# Cài đặt tất cả dependencies cho toàn bộ monorepo
pnpm install

# Chạy song song cả Backend (port 5050) và Frontend (port 5173)
pnpm run dev
```

### 2. Quản lý Cơ sở dữ liệu (Prisma)

```bash
# Chạy migration CSDL PostgreSQL
pnpm run db:migrate

# Sinh Prisma Client
pnpm run db:generate

# Mở giao diện trực quan Prisma Studio
pnpm run db:studio
```

### 3. Kiểm tra chất lượng mã nguồn (Code Quality)

```bash
# Kiểm tra lỗi cú pháp và quy chuẩn code (ESLint)
pnpm run lint

# Tự động format lại toàn bộ code theo chuẩn Prettier
pnpm run format

# Kiểm tra xem code đã tuân thủ đúng định dạng Prettier chưa
pnpm run format:check
```

### 4. Cơ chế Git Hook tự động (Husky)

- Mỗi khi bạn gõ `git commit`, Husky sẽ tự động kích hoạt `lint-staged`.
- Các file bạn vừa sửa sẽ được Prettier tự động căn lề, thụt dòng và kiểm tra cú pháp trước khi commit được tạo.

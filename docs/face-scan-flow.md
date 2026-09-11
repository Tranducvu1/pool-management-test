# Face scan attendance — flow & coding rules

Nhánh: `feat/face-scan-attendance`

## Review spec dài

Ổn để apply (đã làm): constants 1 nguồn, threshold 0.65, descriptor 128, inputSize **224 mọi chỗ**, streak **3**, RAF + throttle, pause tab ẩn, timeout detect, CPU fallback, cấm `studentId` lúc check-in, gallery parse sẵn, không invalidate gallery khi check-in.

Không apply (không hợp stack hiện tại / overkill): rewrite TypeScript, class DetectionLoop/GalleryCache riêng, `/api/upload`, email, rate-limit/CORS/UNIQUE index SQLite, đổi format `sendError`, model path `@vladmandic/...` (weights đang ở `/models`).

## Flow

```
Đăng ký / Gắn mặt
  Webcam hoặc nhiều ảnh → TinyFaceDetector 224 + landmark 68 + recognition 128-d
  → photo /uploads/students + faceEmbeddingJson
        ↓
Kiosk /attendance
  RAF, tối thiểu 500ms/lần, pause khi tab ẩn
  Gallery GET /students/gallery (staleTime 30s)
  Khớp 3 khung liên tiếp, distance ≤ 0.65, reset streak nếu 10s không khớp
  → POST /attendance/checkin { faceDescriptor }  (không studentId)
  Backend match lại, trừ buổi, 1 lần/ngày
```

## Constants

Đổi **một chỗ**, import cùng giá trị:

- Client: `front-end/src/constants/faceApi.js`
- Server: `back-end/src/constants/faceApi.js`

Phải khớp: `THRESHOLD`, `DESCRIPTOR_LENGTH`, `DETECTOR_INPUT_SIZE`.

## Rules

1. Identity từ khuôn mặt. Backend match descriptor; client chỉ preview.
2. `JSON.stringify(Array.from(descriptor))` — không stringify `Float32Array`.
3. Ảnh check-in (nếu có) → `saveDataUrl(..., 'attendance')`.
4. Loop dùng ref + `buildGallery`; không restart khi invalidate students.
5. Invalidate `face-gallery` chỉ khi enroll/gắn mặt, không khi check-in.
6. Log distance/tên, không log full descriptor.
7. Logic ở service; controller Zod + `sendSuccess`.

## Verify

Đăng ký mặt → chip “Đã gắn” → kiosk `Khớp: tên · 3/3` → tự điểm danh đúng người. Người khác / chưa gắn → không ghi hộ.

## Deploy demo online

Khuyến nghị demo free: **Render Blueprint** với 1 web service + 1 PostgreSQL database.

Vì sao không dùng SQLite online:

- SQLite lưu trong file local của server, free server redeploy/restart có thể mất file.
- Face descriptor, học sinh, attendance cần lưu persistent nên chuyển Prisma datasource sang PostgreSQL.
- `render.yaml` tạo DB Postgres và web service cùng lúc, rồi chạy `prisma migrate deploy`.

Vì sao không tách frontend Vercel + backend Render cho demo đầu tiên:

- Tách 2 domain phải xử lý thêm `VITE_API_BASE_URL`, CORS, URL ảnh `/uploads`.
- Demo nhanh dùng backend Express serve luôn `front-end/dist`, nên `/`, `/api`, `/uploads` cùng một domain.

Render deploy flow:

1. Push branch lên GitHub.
2. Render Dashboard → Blueprints → New Blueprint Instance.
3. Chọn repo `pool-management`, branch `feat/face-scan-attendance`.
4. Render đọc `render.yaml`, tạo `pool-management-demo` và `pool-management-db`.
5. Sau deploy, login demo bằng `admin@pool.vn / admin123`.

Lưu ý ảnh demo:

- Render set `STORE_UPLOADS_IN_DB=true`, ảnh đăng ký/check-in được lưu trong DB text field để tránh mất file upload trên free server.
- Production thật nên đổi sang Supabase Storage/S3/Cloudinary, không lưu ảnh base64 lâu dài trong Postgres.

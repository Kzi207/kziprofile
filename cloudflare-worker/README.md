# Hướng dẫn thiết lập Cloudflare Worker CORS Proxy cho Catbox.moe

## 1. Lý do cần Cloudflare Worker?
- **Catbox.moe API (`https://catbox.moe/user/api.php`)** mặc định **chặn CORS từ trình duyệt** (không có header `Access-Control-Allow-Origin`).
- **Vercel Serverless Function** có giới hạn cứng **4.5 MB** cho request body.
- Cloudflare Worker giúp làm cầu nối (Proxy):
  - Hỗ trợ tải tệp **lên tới 100MB** trực tiếp từ trình duyệt.
  - Tự động bổ sung headers `Access-Control-Allow-Origin: *`.
  - Có thanh tiến trình (progress bar %) thực tế khi người dùng upload.
  - Hoàn toàn **Miễn phí 100,000 yêu cầu / ngày**.

---

## 2. Các bước triển khai (chỉ mất 1 phút)

1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com/) và đăng nhập.
2. Ở thanh bên trái, chọn **Workers & Pages** -> **Create application** -> **Create Worker**.
3. Đặt tên worker, ví dụ: `catbox-cors-proxy`, rồi nhấn **Deploy**.
4. Sau khi deploy, bấm vào **Edit code**.
5. Xóa hết mã mặc định, sao chép toàn bộ nội dung trong tệp [`catbox-cors-worker.js`](./catbox-cors-worker.js) và dán vào.
6. Nhấn **Deploy** (hoặc Save and Deploy).
7. Copy địa chỉ URL của Worker (Ví dụ: `https://catbox-cors-proxy.yourname.workers.dev`).

---

## 3. Cấu hình vào dự án

1. Mở tệp `.env` (hoặc cấu hình trong **Vercel Environment Variables**):
```env
VITE_CATBOX_PROXY_URL=https://catbox-cors-proxy.yourname.workers.dev
```

2. Redeploy hoặc chạy lại `npm run build`:
- Giờ đây mọi tệp lớn sẽ được tải trực tiếp qua Cloudflare Worker lên Catbox.moe với thanh tiến trình mượt mà và không còn bị lỗi CORS!

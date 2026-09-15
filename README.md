# 🎤 GinKaraoke - Progressive Web App Quản Lý Playlist Karaoke Cho Nhóm Bạn

[![Deploy to GitHub Pages](https://github.com/tranthaigin/ginkaraoke/actions/workflows/deploy.yml/badge.svg)](https://github.com/tranthaigin/ginkaraoke/actions/workflows/deploy.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success?logo=pwa)](https://github.com/tranthaigin/ginkaraoke)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase BaaS](https://img.shields.io/badge/Backend-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)

Ứng dụng web tiến bộ (PWA) di động giúp các nhóm bạn nhỏ quản lý danh sách bài hát karaoke cá nhân. Khi cả nhóm đi hát, chỉ cần chọn những ai tham gia hôm đó, hệ thống sẽ tự động so sánh danh sách bài của từng người, tìm các bài trùng, áp dụng thuật toán chấm điểm và công bằng để tạo ra playlist tối ưu cho buổi hát.

---

## 🌟 Tính Năng Nổi Bật

1. **Hôm Nay Ai Đi? 🎤**:
   - Chọn nhanh danh sách người tham gia bằng checklist trực quan.
   - Chỉ playlist của những người được chọn mới tham gia vào thuật toán tính điểm. Những người vắng mặt hoàn toàn không ảnh hưởng.
2. **Thuật toán Đề xuất & Công bằng (Pure TypeScript Engine)**:
   - **Độ trùng lặp thành viên (Member Overlap)** là tín hiệu quan trọng nhất (`COMMON_MEMBER_WEIGHT = 10`).
   - Cộng điểm bài tủ / ưu tiên cao (`HIGH_PRIORITY_BONUS = 5`) và muốn hát (`WANT_TO_SING_BONUS = 2`).
   - Cộng điểm bài yêu thích (`FAVORITE_BONUS = 3`).
   - Trừ điểm bài đã hát ở các buổi gần nhất (`RECENTLY_SUNG_PENALTY = 5`) để tránh danh sách bị trùng lặp nhàm chán.
   - **Cơ chế Fairness**: Xen kẽ các bài đơn lẻ giữa các thành viên khi điểm số tương đương, tránh việc một người có quá nhiều bài đẩy người khác ra ngoài.
3. **Chuẩn hóa tên bài hát tiếng Việt (Vietnamese Song Normalization)**:
   - Chuẩn hóa Unicode NFC, chữ hoa/thường, khoảng trắng thừa.
   - Bỏ dấu tiếng Việt thông minh cho việc tìm kiếm và matching key.
   - Xử lý các nhãn trang trí như `(Karaoke)`, `[Beat]`, `(Cover)`, `(Official MV)` mà không gây merge nhầm bài khác nhau.
4. **Karaoke Buổi Hát Live Session**:
   - Hiển thị thứ tự bài kèm nhãn độ trùng (ví dụ: `3/3 người`, `Qt • Huy • Khang`).
   - Đánh dấu **"Đã hát 🎵"** (tự động chuyển xuống khu vực Đã hát kèm nút Undo hoàn tác).
   - Đẩy bài lên đầu ưu tiên hát trước (`⬆️`).
   - Bỏ bài khỏi buổi hát hôm nay.
5. **Lịch sử Buổi Hát (Session History)**:
   - Lưu trữ các buổi hát trong quá khứ kèm ngày tháng, danh sách người tham gia và danh sách bài đã hát.
6. **Hỗ trợ Group & Multi-device Sync**:
   - Quản lý theo nhóm với mã đơn giản (ví dụ: `QT-KARAOKE`).
   - Đồng bộ thời gian thực (Supabase Realtime) giữa nhiều điện thoại của các bạn trong nhóm.
7. **PWA & Offline First**:
   - Cài đặt lên màn hình chính (Add to Home Screen) trên cả iOS và Android.
   - Cache offline qua Service Worker.
   - Tự động hiển thị huy hiệu `Offline` khi mất mạng và lưu tạm qua LocalStorage.
8. **Sao lưu & Khôi phục (JSON Backup/Restore)**:
   - Xuất toàn bộ dữ liệu nhóm ra file JSON dự phòng.
   - Nhập lại dữ liệu với xác thực schema chặt chẽ, chống crash và có cảnh báo xác nhận trước khi cập nhật.

---

## 🏗️ Kiến Trúc Hệ Thống

```
React 19 + TypeScript + Vite (PWA Shell)
      │
      ├── HashRouter (GitHub Pages 404-free navigation)
      │
      ├── UI Layer (Mobile-first Modern Dark Karaoke Neon Aesthetics)
      │     ├── HomePage (Stats, Quick actions, Trending in group)
      │     ├── MySongsPage (Instant unaccented search, Fast add/edit)
      │     ├── KaraokePage (Attendee picker & Live interactive session)
      │     ├── HistoryPage (Past outings & Songs sung)
      │     └── GroupPage (Members, Join codes, JSON Backup)
      │
      ├── Service & Repository Layer (Decoupled Data Access)
      │     ├── SupabaseRepo (PostgreSQL via Supabase Client & RLS)
      │     └── LocalRepo (Offline Cache & Zero-Config Demo State)
      │
      └── Core Algorithmic Engine (100% Decoupled & Unit Tested)
            ├── Song Normalization (normalizeSongTitle, removeVietnameseDiacritics)
            └── Recommendation & Fairness Engine (generateKaraokePlaylist)
```

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Modern Vanilla CSS (Dark mode, glassmorphism, glowing neon cyan/purple accents, responsive safe-area padding)
- **Icons**: Lucide React
- **Backend-as-a-Service**: Supabase (PostgreSQL, Row Level Security, Realtime)
- **PWA**: `vite-plugin-pwa`, Web App Manifest, Service Worker
- **Testing**: Vitest (Unit tests cho Normalization và Recommendation Engine)
- **Deployment**: GitHub Pages (tích hợp GitHub Actions CI/CD tự động)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### 1. Clone repository
```bash
git clone https://github.com/tranthaigin/ginkaraoke.git
cd ginkaraoke
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Chạy ở chế độ Local Mock (Không cần Supabase ngay)
Ứng dụng đã được tích hợp sẵn bộ dữ liệu mẫu (Qt, Huy, Khang) chạy mượt mà ngay trên bộ nhớ trình duyệt (LocalStorage):
```bash
npm run dev
```
Mở trình duyệt tại `http://localhost:5173`.

---

## 🗄️ Hướng Dẫn Setup Supabase Backend (Cloud Sync)

Để nhiều người trong nhóm cùng truy cập bằng điện thoại riêng và nhìn thấy dữ liệu đồng bộ:

### Bước 1: Tạo Supabase Project
1. Đăng nhập vào [Supabase](https://supabase.com) (miễn phí).
2. Nhấn **New project** và đặt tên (ví dụ: `ginkaraoke-db`).

### Bước 2: Chạy SQL Migration
1. Trong giao diện Supabase, mở mục **SQL Editor**.
2. Mở file [supabase/migrations/20260915_init.sql](./supabase/migrations/20260915_init.sql) trong project này, dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
3. File này sẽ tự động tạo:
   - Các bảng: `groups`, `members`, `songs`, `member_songs`, `karaoke_sessions`, `session_members`, `session_songs`.
   - Các chỉ mục (Indexes) và ràng buộc Unique.
   - Bật và cấu hình **Row Level Security (RLS)**.
   - Bật Supabase Realtime publication.

### Bước 3: Nạp dữ liệu mẫu (Seed Data)
1. Trong SQL Editor của Supabase, mở file [supabase/seed.sql](./supabase/seed.sql).
2. Dán nội dung và nhấn **Run** để nạp nhóm `QT-KARAOKE` với 3 thành viên: **Qt**, **Huy**, **Khang** cùng các bài hát mẫu.

### Bước 4: Cấu hình biến môi trường Frontend
1. Trong Supabase, vào **Project Settings** -> **API**.
2. Lấy **Project URL** và **anon public key**.
3. Tạo file `.env` ở thư mục gốc của project (dựa theo [.env.example](./.env.example)):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here
```
*(Lưu ý: Chỉ dùng **anon/public key**, TUYỆT ĐỐI không dùng `service_role` key trên frontend).*

4. Chạy lại dự án:
```bash
npm run dev
```
Huy hiệu trên thanh Navbar sẽ hiển thị màu xanh lá cây `Cloud`, sẵn sàng đồng bộ realtime giữa các thiết bị!

---

## 🧪 Kiểm Thử (Testing)

Dự án có bộ unit test toàn diện viết bằng Vitest:
```bash
npm run test
```

Các ca kiểm thử bao gồm:
- Chuẩn hóa dấu tiếng Việt (kể cả chữ `Đ/đ`).
- Chuẩn hóa khoảng trắng, viết hoa/viết thường.
- Loại bỏ nhãn phụ `(Karaoke)`, `[Beat]`, `(Official MV)`.
- Đảm bảo các bài khác nhau không bị merge nhầm.
- Tìm kiếm không dấu & không phân biệt hoa thường.
- Thuật toán xếp hạng bài theo số thành viên trùng (3/3 > 2/3 > 1/3).
- Điểm thưởng bài tủ (HIGH priority) và bài yêu thích (Favorite).
- Điểm phạt bài vừa hát gần đây (Recently sung penalty).
- Cơ chế cân bằng công bằng (Fairness balance) cho bài đơn lẻ.
- Loại trừ hoàn toàn bài của thành viên không tham gia buổi hát hôm đó.

---

## 📦 Build & Deploy Lên GitHub Pages

### Build kiểm tra
```bash
npm run build
```

### Triển khai tự động bằng GitHub Actions
Project đã có sẵn file workflow [.github/workflows/deploy.yml](./.github/workflows/deploy.yml).

Khi bạn push code lên branch `main` của repository GitHub:
1. Vào repository GitHub của bạn: `Settings` -> `Pages`.
2. Trong phần **Build and deployment** -> **Source**, chọn **GitHub Actions**.
3. Mỗi khi push code lên `main`, GitHub Actions sẽ tự động chạy test, build bundle PWA và phát hành website.
4. Nhờ sử dụng `HashRouter` (`#/`, `#/my-songs`, `#/karaoke`...), bạn có thể F5 hoặc chia sẻ link trực tiếp mà không bao giờ bị lỗi 404 trên GitHub Pages!

---

## 🔒 Bảo Mật & Đánh Giá An Toàn (Security Review)

- **Không chứa Secret trên Client**: Chỉ sử dụng public `anon` key của Supabase. Khóa bí mật `service_role` hoàn toàn không có trong source code. File `.env` đã được cấu hình trong `.gitignore`.
- **Row Level Security (RLS)**: Tất cả bảng đều kích hoạt RLS. Dữ liệu truy vấn theo ngữ cảnh nhóm và thành viên.
- **XSS Prevention**: Mọi dữ liệu văn bản (tên bài, ca sĩ, tên thành viên) đều được làm sạch qua React JSX escaping và hàm chuẩn hóa `cleanDisplayString`.
- **An Toàn Backup JSON**: Kiểm tra schema hợp lệ trước khi nạp dữ liệu, chống injection và crash ứng dụng.

---

## 📱 Cài Đặt Dưới Dạng Ứng Dụng (PWA)

- **Trên Android (Chrome)**: Nhấn menu ba chấm `⋮` -> chọn **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**.
- **Trên iOS (Safari)**: Nhấn biểu tượng Chia sẻ (Share) -> cuộn xuống chọn **Thêm vào MH chính (Add to Home Screen)**.

---

## 🔮 Giới Hạn Hiện Tại & Lộ Trình Nâng Cấp (Roadmap v2)

### Giới hạn hiện tại:
- Nhóm bạn sử dụng chung mã `join_code` đơn giản mà không cần đăng nhập email/mật khẩu phức tạp (thiết kế tối giản cho nhóm bạn bè thân thiết).
- Supabase Realtime dựa trên gói Free Tier của Supabase (hoàn toàn đủ cho hàng chục nhóm bạn sử dụng).

### Đề xuất cho Version 2:
- Tích hợp tìm kiếm trực tiếp video Karaoke trên YouTube để nhấn phát nhanh trong buổi hát.
- Hỗ trợ phòng hát ảo (Virtual Room) hiển thị lời bài hát đồng bộ.
- Thống kê biểu đồ "Top ca sĩ ruột của nhóm" và "Cặp đôi song ca ăn ý nhất".

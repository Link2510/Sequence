# Rummikub (Truyền thống & Twist)

Game xếp quân số, có 2 chế độ **Truyền thống** (106 quân, 2 Joker) và **Twist** (112 quân, 4 Joker đặc biệt). Chơi với AI hoặc tạo phòng online 2–4 người.

- **Chơi:** https://boardgameace.web.app/rummikub/
- **Source gốc:** `G:\AI\web\rummikub-việt-nam` (React/Vite)
- **Bản build tĩnh:** `rummikub/index.html`, `rummikub/assets/`, `rummikub/src/assets/images/`

## Tính năng

- Solo với 1–3 AI ở 3 cấp độ, đồng hồ lượt tùy chọn (không giới hạn / 60 / 90 / 120 giây).
- Phòng online công khai hoặc bằng mã 6 ký tự; chủ phòng thêm/bớt AI, sẵn sàng, chat trong phòng.
- Rule đầy đủ: mở bài ≥30 điểm, xào bộ, Joker đổi màu/nhân đôi/gương, bấm giờ, tính điểm cuối ván.

## Build lại

```powershell
cd 'G:\AI\web\rummikub-việt-nam'
npm install --legacy-peer-deps
npx tsc --noEmit
npx vite build
# Plugin copy asset không chạy → copy thủ công ảnh thảm bàn:
New-Item -ItemType Directory -Force -Path 'dist\src\assets' | Out-Null
Copy-Item 'src\assets\images' 'dist\src\assets\images' -Recurse -Force
# Xoá thư mục lồng dist\src\assets\images\images nếu có, rồi copy dist:
Remove-Item 'G:\AI\web\sequence\Sequence\rummikub' -Recurse -Force
Copy-Item 'dist\*' 'G:\AI\web\sequence\Sequence\rummikub' -Recurse -Force
cd G:\AI\web\sequence\Sequence
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1 -Files .\rummikub\index.html
firebase deploy --only hosting:boardgameace --project sequence-23c7f
```

⚠️ `src/utils/rummikubCore.ts` là browser port của `server.ts` (bỏ express/ws/vite, dùng fake socket); `src/utils/rummikubFirebase.ts` là transport RTDB `lotr-fotr-rooms/rummikub-rooms/{intents,views}` — dùng chung rules cũ, **không cần deploy rules**. Ảnh thảm bàn trong `LobbyView.tsx`/`GameBoard.tsx` phải là `./src/assets/images/...` (không phải `/src/...`). RTDB không lưu mảng rỗng → `normalize()` trong transport phải trả `[]` cho `rooms`, `players`, `myRack`, `table`, v.v.

## Quyền riêng tư

- **Không telemetry, không analytics, không quảng cáo, không tài khoản.**
- Chế độ solo chạy hoàn toàn trong browser, không gọi mạng.
- Chế độ online tải SDK Firebase từ `gstatic.com` và đọc/ghi tại `lotr-fotr-rooms/rummikub-rooms/` trong project `sequence-23c7f`: mã phòng, tên hiển thị, nước đi/trạng thái bàn, tin nhắn chat. Ai có mã phòng và rules public có thể đọc/sửa — tin tưởng lẫn nhau. Không nhập thông tin cá nhân nhạy cảm. View/intent có `updatedAt`/`ts`; phòng không hoạt động quá **30 phút** bị dọn.
- Ảnh thảm bàn là file local. Font dùng Google Fonts (Be Vietnam Pro, Fraunces/JetBrains Mono tùy bản) tải từ `fonts.googleapis.com`/`fonts.gstatic.com` — request duy nhất tới dịch vụ ngoài khi mở trang. `localStorage/sessionStorage` giữ tên, mã phòng/người chơi và mã định danh phiên (`rmk_*`). Không đọc clipboard, không chụp màn hình, không ghi phím, không dùng camera/microphone.
- Tự kiểm chứng: DevTools → Network để thấy request tới `gstatic.com`/`firebasedatabase.app`; tìm `gtag`/`fbq` trong bundle — không có.


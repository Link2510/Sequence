# Mèo Nổ (Exploding Kittens)

Game bài Mèo Nổ Vietnamese, bàn tối đa 5 người, chơi solo với AI hoặc tạo phòng chơi cùng bạn bè trên 2 thiết bị.

- **Chơi:** https://boardgameace.web.app/meono/
- **Source gốc:** `G:\AI\web\mèo-nổ-—-exploding-kittens` (React/Vite)
- **Bản build tĩnh:** `meono/index.html`, `meono/assets/`, `meono/src/assets/images/`

## Tính năng

- Solo nhanh với 1–4 AI (3 cấp độ Dễ / Thường / Láu cá).
- Phòng chờ công khai hoặc bằng mã 5 ký tự, thêm/bớt AI, sẵn sàng rồi bắt đầu.
- 13 lá bài có ảnh thật (file local), luật đầy đủ: Nope, Attack, Skip, Favor, Shuffle, See the Future, combo mèo, Gỡ Bom/đặt lại Mèo Nổ.
- Đồng bộ phòng qua Firebase Realtime Database của project `sequence-23c7f`.

## Build lại

```powershell
cd 'G:\AI\web\mèo-nổ-—-exploding-kittens'
npm install --legacy-peer-deps
npx tsc --noEmit
npx vite build
# ⚠️ Plugin copy asset không chạy: copy thủ công ảnh không được bundle:
New-Item -ItemType Directory -Force -Path 'dist\src\assets' | Out-Null
Copy-Item 'src\assets' 'dist\src\assets' -Recurse -Force
# Copy TOÀN BỘ dist sang meono/ (kể cả assets/*.css|js), rồi vá nút về sảnh:
Remove-Item 'G:\AI\web\sequence\Sequence\meono' -Recurse -Force
Copy-Item 'dist\*' 'G:\AI\web\sequence\Sequence\meono' -Recurse -Force
cd G:\AI\web\sequence\Sequence
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1 -Files .\meono\index.html
firebase deploy --only hosting:boardgameace --project sequence-23c7f
```

Source gốc chạy WebSocket (`server.ts`); với static hosting phải giữ `src/utils/meonoCore.ts` (browser port của `src/server/gameEngine.ts`) và `src/utils/meonoFirebase.ts` (transport RTDB), đồng thời ảnh trong `GameCard.tsx` phải dùng `./src/assets/images/...`, không phải `/src/assets/images/...`.

## Quyền riêng tư

- **Không telemetry, không analytics, không quảng cáo, không tài khoản.**
- **Firebase Realtime Database** (`lotr-fotr-rooms/meono-rooms/{intents,views}` trong project `sequence-23c7f`) lưu mã phòng, tên hiển thị, avatar và nước đi/trạng thái bàn. Ai có mã phòng và rules public có thể đọc/sửa — tin tưởng lẫn nhau. Không nhập thông tin cá nhân nhạy cảm vào tên người chơi. Phòng/view không hoạt động quá **30 phút** bị dọn (client quét mỗi 10 phút; engine cũng xoá phòng memory).
- SDK Firebase tải từ `gstatic.com` khi mở trang (chế độ online); chế độ solo chạy hoàn toàn trong browser. Font Google (Bricolage Grotesque, JetBrains Mono, Plus Jakarta Sans) tải từ `fonts.googleapis.com`/`fonts.gstatic.com`.
- **localStorage/sessionStorage** giữ tên, avatar và mã phiên (`meono_player_name`, `meono_avatar_id`, `meono_session_id`). Không đọc clipboard, không chụp màn hình, không ghi phím, không dùng camera/microphone.
- Tự kiểm chứng: DevTools → Network để thấy toàn bộ request; Firebase Console để xem dữ liệu RTDB; tìm `gtag`/`fbq` trong bundle — không có.


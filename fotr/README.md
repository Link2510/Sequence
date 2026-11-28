# The Fellowship of the Ring: Trick-Taking Game

Game ăn lượt (trick-taking) hợp tác 4 người, lấy bối cảnh hành trình của Hội Đồng Nhẫn qua 18 chương.

- **Chơi:** https://boardgameace.web.app/fotr/
- **Source:** `fotr/app/` (React 19 + Vite + Tailwind 4)
- **Bản build tĩnh:** `fotr/index.html`, `fotr/assets/`, `fotr/src/assets/`, `fotr/fonts/`

## Tính năng

- Đấu với 3 AI đồng đội, đủ 18 chương, có gợi ý nước đi.
- Hướng dẫn tương tác từng bước cho người mới.
- Tạo phòng `RING-XXXXX`, mời bạn bè bằng mã hoặc link `?room=...`; ghế trống tự điền AI.
- Đồng bộ phòng qua Firebase Firestore của project `sequence-23c7f`.
- Phòng tự đóng/xoá sau **30 phút không có hoạt động** (mỗi lần ghi state gia hạn thêm 30 phút). Dữ liệu TTL nằm ở field `expiresAt`; rules chỉ cho xoá khi đã quá hạn. Vì project dùng gói Spark (không có billing) nên Firestore TTL phía server chưa bật được — việc dọn được app thực hiện khi mở lại phòng/link cũ.

## Build lại

```powershell
cd G:\AI\web\sequence\Sequence\fotr\app
npm install --legacy-peer-deps
npx vite build
Copy-Item 'dist\*' '..' -Recurse -Force
Remove-Item 'dist' -Recurse -Force
cd ..\..
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1 -Files .\fotr\index.html
firebase deploy --only hosting:boardgameace --project sequence-23c7f
```

## Quyền riêng tư

- **Không telemetry, không analytics, không quảng cáo, không tài khoản.**
- **Firestore `rooms/`** (project `sequence-23c7f`) lưu: mã phòng, tên hiển thị bạn nhập, ghế ngồi, trạng thái ván và nước đi. Ai biết mã phòng đều đọc/ghi được phòng đó; không có danh sách phòng công khai. Client chỉ được xoá phòng khi đã quá hạn 30 phút. Không nhập thông tin cá nhân nhạy cảm vào tên người chơi.
- **Lưu trên máy:** `localStorage` giữ tên người chơi (`lotr_player_name`), mã định danh phiên (`lotr_player_id`) và tối đa 30 mã phòng đã ghé (`lotr_visited_rooms`, chỉ để dọn phòng hết hạn). Không đọc clipboard, không chụp màn hình, không ghi phím, không dùng camera/microphone.
- **Không gọi dịch vụ ngoài:** font và toàn bộ ảnh minh họa nằm trong project; SDK Firebase nằm trong bundle. Mở DevTools → Network để tự kiểm chứng.
- **Kiểm chứng nhanh:** tìm `gtag`, `analytics`, `fbq`, `getUserMedia`, `getDisplayMedia` trong `fotr/assets/*.js` — không có.

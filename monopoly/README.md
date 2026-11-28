# Tour Việt Nam

Trò chơi cờ tỷ phú chiến thuật, bàn **32 ô** với địa danh Việt Nam. Chạy hoàn toàn trong trình duyệt; bản dựng tĩnh đặt tại `/monopoly/` trên Firebase Hosting.

## Chơi

- **Chơi nhanh AI / tại chỗ**: không cần mạng.
- **Tạo phòng / vào phòng bằng mã**: chơi cùng bạn bè trên 2 thiết bị. Chủ phòng chạy luật, các máy khác gửi lượt đi qua Firebase Realtime Database. Mã phòng 6 ký tự, không phân biệt hoa thường.

## Kiến trúc

- `index.html`, `assets/`, `src/`: bản dựng tĩnh (Vite + React).
- `app/`: mã nguồn (React/TypeScript), trong đó:
  - `app/src/utils/tourServerCore.ts`: logic phòng/lượt đi (port từ `server.ts` để chạy trong browser).
  - `app/src/utils/firebaseRooms.ts`: lớp vận chuyển qua RTDB — chủ phòng xử lý intent, phát view riêng cho từng client.
- Đường dẫn dữ liệu: `lotr-fotr-rooms/tour-rooms/{intents,views}` trong project Firebase `sequence-23c7f` — **dùng chung rules hiện có, không cần deploy rules**.
- Phòng không có hoạt động quá **30 phút** tự bị dọn: view/intent RTDB có `updatedAt`/`ts`, engine trong browser cũng xoá phòng memory sau 30p.

## Build lại từ source mới

```powershell
cd G:\AI\web\sequence\Sequence\monopoly\app
npm install --legacy-peer-deps
npx vite build
Copy-Item 'dist\*' '..' -Recurse -Force
Remove-Item 'dist' -Recurse -Force
cd ..\..
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1 -Files .\monopoly\index.html
firebase deploy --only hosting:boardgameace --project sequence-23c7f
```

Lưu ý: source gốc chỉ chạy WebSocket (`server.ts`). Khi cập nhật source, phải **regenerate `app/src/utils/tourServerCore.ts`** từ `server.ts` mới và cắm lại Firebase transport trong `app/src/App.tsx` (`connectFirebaseRooms`/`sendFirebaseMessage`), nếu không nút tạo phòng sẽ bị vô hiệu trên hosting tĩnh. Xem `G:\AI\web\BOARDGAME-MEMORY.md`.

## Quyền riêng tư

- Chế độ local **không gọi mạng**, không tài khoản, không telemetry.
- Chế độ online tải SDK Firebase từ `gstatic.com` và chỉ đọc/ghi phòng tại `lotr-fotr-rooms/tour-rooms/` trên project của bạn. Dữ liệu gồm mã phòng, tên hiển thị, nước đi/trạng thái bàn. Ai có mã phòng và rules public có thể đọc/sửa — tin tưởng lẫn nhau, không chống gian lận. Không gửi dữ liệu bên thứ ba.
- Bạn tự kiểm chứng: mở DevTools → Network để thấy endpoint `*.firebasedatabase.app`, và kiểm tra `database.rules.json` trong repo.

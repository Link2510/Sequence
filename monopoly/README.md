# Tour Kinh Doanh Việt Nam

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

## Quyền riêng tư

- Chế độ local **không gọi mạng**, không tài khoản, không telemetry.
- Chế độ online tải SDK Firebase từ `gstatic.com` và chỉ đọc/ghi phòng tại `lotr-fotr-rooms/tour-rooms/` trên project của bạn. Dữ liệu gồm mã phòng, tên hiển thị, nước đi/trạng thái bàn. Ai có mã phòng và rules public có thể đọc/sửa — tin tưởng lẫn nhau, không chống gian lận. Không gửi dữ liệu bên thứ ba.
- Bạn tự kiểm chứng: mở DevTools → Network để thấy endpoint `*.firebasedatabase.app`, và kiểm tra `database.rules.json` trong repo.

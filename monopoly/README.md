# MONOPOLY — Phiên bản Việt Nam

Web game Monopoly bàn cờ cổ điển (kiểu NEW MONOPOLY / Monopoly Plus trên Steam), giao diện tiếng Việt, chơi với AI hoặc với bạn bè qua Firebase. Tranh và dữ liệu do mình tạo, không sao chép tài sản bản quyền của bản thương mại.

Thư mục: `G:\AI-Models\monopoly-vn`. Mở `index.html` là chơi.

## Có gì

- Bàn 40 ô với tên đường Việt Nam, 22 đất + 4 ga + 2 tiện ích, 16 Thử Thách + 16 Khối Cộng Đồng.
- Luật cổ điển: xúc xắc, đi bài, qua GO nhận 200đ, 3 lần đôi liên tiếp vào tù, thuế, mua/đấu giá đất, thuê theo nhà/khách sạn, ga/tiện ích, thế chấp/chuộc, xây nhà theo nhóm màu, phá sản chuyển tài sản.
- Chấm thắng: người cuối còn lại, hoặc **hết 400 lượt thì tính tổng tài sản** (giới hạn cần thiết để game web có điểm kết thúc — bản Steam không có, mình ghi rõ trong hướng dẫn).
- Chế độ chơi:
  - **Với AI (local)**: 1 bạn + 2 AI, 1 bạn + 3 AI, 2 bạn + 1 AI, 2 bạn + 2 AI.
  - **Nhiều người thật (local)**: 2/3/4 người, luân phiên cùng máy.
  - **Với bạn bè (online)**: tạo phòng, vào bằng mã (mã bắt đầu bằng **M**), dùng chung RTDB `lotr-fotr-rooms` của project `sequence-23c7f` — **không cần deploy lại rules**. Chủ phòng chạy luật, khách gửi lượt đi.
- Không telemetry/tài khoản. Chế độ local không gọi mạng; chế độ online tải SDK Firebase từ `gstatic.com` và đọc/ghi `lotr-fotr-rooms/<mã-M>` trên project của bạn.

## Kiểm chứng

`node tools/selftest.js` → **PASS 645 / FAIL 0**: kiểm tra 40 ô, 22 đất, 4 ga, 2 tiện ích, 32 thẻ, và 200 trận AI-vs-AI đều kết thúc hợp lệ (không cash âm, không vị trí lỗi).

Đã test thật trên 2 tab + Firebase: tạo phòng `M9SGNH` → tab kia thấy “Phòng đang mở” → vào → host tung xúc xắc, khách thấy ngay → host kết thúc lượt, AI đi, đến lượt khách (Sam) → khách tung xúc xắc, host thấy “Sam …” trong nhật ký. **0 lỗi console**. Phòng test đã xoá.

Bẫy đã ghi nhớ: Firebase RTDB bỏ mảng rỗng → snapshot phải gán mặc định `[]` cho `properties/houses/hotels/mortgaged/log`.

## Cấu trúc

```
index.html            Giao diện bàn cờ + trung tâm hành động
css/styles.css        Styling + font local
js/board.js           40 ô, màu nhóm, toạ độ bàn
js/cards.js           Chance / Community Chest
js/engine.js          Luật thuần túy (Node test được)
js/game.js            Điều khiển, AI, online, phòng chơi
js/net.js, firebase-config.js, room-list.js  (dùng lại từ Hội Nhẫn)
tools/selftest.js     Test luật, 200 trận mô phỏng
assets/fonts/         Noto Sans local
```

# The Lord of the Rings: Duel for Middle-Earth (web adaptation)

Bản web chơi được của game đối đầu 2 người **Duel for Middle-Earth** (Antoine Bauza & Bruno Cathala, Repos Production 2024). **Song ngữ VI/EN**, chơi với AI hoặc **2 thiết bị qua Firebase** (tạo phòng / vào phòng), local hoặc online.

Thư mục: `G:\AI-Models\duel-for-middle-earth`. Mở `index.html` là chơi. Nút **“Về sảnh trò chơi”** quay về `../index.html` — trang menu chọn game ở gốc `G:\AI-Models`.

## Có gì

- **69 thẻ chương** (23 mỗi chương), **7 điểm đến (landmark)**, đủ 6 loại thẻ: kỹ năng, tiền, hành trình Nhẫn, chủng tộc, quân, chiến thuật.
- Luật chính thức: 3 chương liên tiếp; mỗi lượt lấy 1 bài chương (chơi hoặc bỏ lấy tiền) hoặc 1 điểm đến; chi phí bằng kỹ năng (mỗi ký hiệu dùng 1 lần/lượt), thiếu thì trả 1 tiền/ký hiệu; **chain** từ chương 2 cho chơi miễn phí; điểm đến đắt thêm 1 tiền cho mỗi pháo đài đã có.
- **Bản đồ 7 vùng** (Arnor, Rhudaur, Núi Sương Mù, Enedwaith, Rohan, Gondor, Mordor), xung đột khi đặt quân vào vùng có địch, pháo đài không gây xung đột.
- **Đường Nhẫn** với Frodo/Sam và Nazgûl; Nazgûl đi cùng Frodo, Sauron tiến để đuổi kịp; ô bonus.
- **Liên minh chủng tộc** (2 trùng hoặc 3 khác → lấy token), 3 điều kiện thắng: tới Mount Doom / Nazgûl bắt kịp / 6 chủng tộc / chiếm đủ 7 vùng; hết chương 3 chấm theo số vùng.
- AI điều khiển phe còn lại (khi chơi local); **bảng “Hướng dẫn từng bước” luôn hiển thị ngay trên màn hình chơi** (nút “Ẩn/Hiện hướng dẫn” để thu gọn), coach-mark tự chạy lần đầu, nút Luật chơi 7 mục.
- **Chơi với bạn bè**: màn hình chính có nút **Tạo phòng** và ô **Mã phòng** + ô **“Phòng đang mở”**. Mã Duel luôn bắt đầu bằng **D** để không lẫn phòng Hội Nhẫn; bấm một mã trong danh sách là vào luôn. Chủ phòng chọn phe, khách nhận phe kia; chủ phòng điều khiển luật, khách gửi lượt đi qua Firebase. Không cần deploy rules RTDB vì dùng chung path `lotr-fotr-rooms` đã có sẵn.

## Phạm vi trung thực

Luật, số lượng thẻ, cấu trúc 3 chương và các loại hiệu ứng khớp rulebook công khai. **Tên và hiệu ứng cụ thể của 69 thẻ/7 landmark là do mình viết lại**, không chép nguyên văn thẻ bản in — mình không có danh sách thẻ thật (BoardGameGeek chặn tải file) và cũng tránh sao chép nội dung có bản quyền. Vì vậy game chơi đúng luật và đủ chiều sâu, nhưng không phải bản dịch từng thẻ in.

Nếu bạn có file danh sách thẻ (PDF fanmade `7DUME_List_of_Cards`, ảnh scan, hoặc gõ tay), gửi mình — mình chỉ cần thay `js/cards.js` là khớp 69 thẻ thật.

Chế độ 2 thiết bị online dùng chung cấu hình Firebase với bản Hội Nhẫn (`js/firebase-config.js`). Nếu deploy sang project khác, đổi 5 trường trong file này.

## Kiểm chứng

```powershell
node tools/selftest.js
node tools/audit-text.js
```

Đã chạy thật: **PASS 9943 / FAIL 0** (kiểm tra 69 thẻ, 7 landmark, và 300 trận AI-vs-AI đều kết thúc hợp lệ; tỉ lệ thắng hai phe ~45/55). `audit-text.js` → 0 lỗi encoding.

Đã mở trong Chromium: màn hình chính hiện đủ 69 thẻ data; chọn phe Sauron → chương 1 → 7 bài có thể lấy, 3 landmark, 7 vùng, 14 ô đường Nhẫn; bỏ bài/chơi bài → AI đáp trả, nhật ký cập nhật, **0 lỗi console**.

Nguồn luật: rulebook chính thức [7DUME_EN01_Rules.pdf](https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2024/09/7DUME_EN01_Rules.pdf).

## Quyền riêng tư / Privacy

**VI:** Chế độ local chạy hoàn toàn trên máy bạn — không gọi mạng, không tài khoản, không telemetry, không lưu tiến trình. Khi bạn bấm **Tạo phòng / Tham gia phòng**, game tải SDK Firebase từ `www.gstatic.com` và đọc/ghi tại `<databaseURL>/lotr-fotr-rooms/<mã-D>`. Dữ liệu phòng là nước đi, tiền, quân và mục tiêu — **không có dữ liệu cá nhân**, không đăng nhập; mã phòng là định danh duy nhất. Ai có mã và rules public có thể xem/sửa phòng (tin tưởng lẫn nhau). Font và tranh là file local.

**EN:** Local mode runs entirely on your machine with no network, account, telemetry or saved progress. When you press **Create/Join room**, the game loads the Firebase SDK from `www.gstatic.com` and reads/writes `<databaseURL>/lotr-fotr-rooms/<D-code>`. Room data contains moves, coins, units and goals — no personal data, no login; the room code is the only identifier. Anyone with the code can read/write under your public rules (trust-based). Font and art are local.

## Cấu trúc

```
index.html            Giao diện
css/styles.css        Styling + font local
js/cards.js           69 thẻ + 7 landmark + token/bonus
js/engine.js          Luật thuần túy (Node test được)
js/i18n.js            Từ điển VI/EN + hướng dẫn
js/game.js            Điều khiển DOM + AI
assets/               Tranh SVG + font
tools/selftest.js     Test luật, 300 trận mô phỏng
tools/audit-text.js   Quét lỗi mã hoá
```

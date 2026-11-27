# MONOPOLY — Phiên bản Việt Nam

Web game Monopoly bàn cờ cổ điển (kiểu NEW MONOPOLY / Monopoly Plus trên Steam), giao diện tiếng Việt, chơi với AI hoặc với bạn bè qua Firebase. Tranh và dữ liệu do mình tạo, không sao chép tài sản bản quyền của bản thương mại.

Thư mục: `G:\AI-Models\monopoly-vn`. Mở `index.html` là chơi.

## Có gì

- **Tự kết thúc lượt ngay** (không hàng đợi) khi không còn việc phải làm: hết tiền mua đất thì hiện lý do ~1,8s rồi đi tiếp; bỏ qua đấu giá xong thì sang lượt kế ngay; có đất để xây thì mới chờ bạn chọn. Có đôi thì vẫn được đi thêm lượt.
- Giao diện **chuẩn 1920×1080, co giãn theo px hiển thị** (`clamp()/min()/vw/vh`); **một màn hình, không cần cuộn**. Thanh trên có số lượt/chế độ; **4 tên người chơi cố định ở 4 góc khung bàn**, bàn nằm giữa (`min(860px, 100vh-210px, 100vw-420px)`) nên tên không đè lên bàn ở mọi kích thước. Xúc xắc + nút hành động nằm giữa bàn: **đã bỏ nút “Tung xúc xắc”**, đến lượt ai thì hiện dòng “Nhấn vào xúc xắc để tung xúc xắc” và bấm vào xúc xắc để đi. Nút **Sáng/Tối** đổi theme được ở cả 2 chế độ (tour mặc định sáng, bật sang tối khi nhấn). Đã **bỏ hẳn bảng điều khiển bên phải** (thẻ lượt/tab Nhật ký) — thông tin ô hiện bằng thẻ hover khi giữ chuột ~0,3s. Có thông báo ngắn (toast) sau mỗi hành động.
- Bàn 40 ô với tên đường Việt Nam, 22 đất + 4 ga + 2 tiện ích, 16 Thử Thách + 16 Khối Cộng Đồng.
- Luật cổ điển: xúc xắc, đi bài, qua GO nhận 200đ, 3 lần đôi liên tiếp vào tù, thuế, mua/đấu giá đất, thuê theo nhà/khách sạn, ga/tiện ích, thế chấp/chuộc, xây nhà theo nhóm màu, phá sản chuyển tài sản.
- Chấm thắng: người cuối còn lại, hoặc **hết 400 lượt thì tính tổng tài sản** (giới hạn cần thiết để game web có điểm kết thúc — bản Steam không có, mình ghi rõ trong hướng dẫn).
- Chế độ chơi:
  - **Với AI (local)**: 1 bạn + 2 AI, 1 bạn + 3 AI, 2 bạn + 1 AI, 2 bạn + 2 AI.
  - **Nhiều người thật (local)**: 2/3/4 người, luân phiên cùng máy.
  - **Với bạn bè (online)**: lobby phòng kiểu Business Tour — mã phòng, **danh sách người chơi** (chủ/khách/AI + trạng thái), **ô chat**, nút bắt đầu; vào bằng mã bắt đầu bằng **M**, dùng chung RTDB `lotr-fotr-rooms` của project `sequence-23c7f` — **không cần deploy lại rules**. Chủ phòng chạy luật, khách gửi lượt đi.
- **Thẻ sự kiện / power-up**: ~32% đầu mỗi lượt có thể rút thẻ (nhận tiền, đi thêm, tặng nhà miễn phí, trộm tiền, thêm lượt…) — làm trận nhanh và vui hơn.
- **Hiệu ứng**: xúc xắc lắc 3D kèm tiếng lắc, quân cờ (có biểu tượng 🎩/🐕/🚂/🎒) trượt từng ô theo đường vòng, ô đích sáng lên và bàn rung nhẹ lúc xúc xắc dừng — tự tạo bằng CSS/Web Animations, không copy asset của Steam.
- Bàn cờ phóng to, có **khung gỗ/vàng kiểu board game thật**, trung tâm là tranh thành phố SVG tự vẽ. Ô đất có dải màu nhóm, thanh màu chủ sở hữu, biểu tượng + tên người đó, **cấp nhà** (`Cấp 0`…`Cấp 4`, `🏨 Cấp 5`) và tiền thuê; hover hiện tooltip đầy đủ. Khi quân đi, các ô lần lượt sáng lên.
- **Góc nhìn 3D bằng CSS** (không thư viện): bàn nghiêng như nhìn từ trên bàn xuống, có 3 nút **Nghiêng / Phẳng / Phóng to**; nhà mọc lên có animation; ánh sáng chuyển **ngày → chiều → đêm** theo số lượt.
- **Thông báo giữa bàn**: 3 sự kiện gần nhất dạng `Ai → Ai · số tiền · lý do`; riêng thẻ sự kiện/Vào tù hiện thành **thẻ lớn giữa bàn** trong ~2,6 giây để mọi người cùng thấy (kể cả online). Có lý do cụ thể: “VÀO TÙ · 3 lần đôi liên tiếp”, “THỬ THÁCH · …”, “KHỐI CỘNG ĐỒNG · …”.
- Bàn cờ góc isometric kiểu Business Tour. Các thẻ người chơi (tên, quân cờ, số tiền, số đất) xếp thành **dải 4 ô bên dưới bàn** để không che góc bàn; tên người tới lượt nhấp nháy. Hiệu ứng rung bàn vẫn giữ nguyên góc 3D. **Xúc xắc và đồng hồ nằm giữa bàn** cho mọi người cùng nhìn, bấm xúc xắc để đi. Ô đất hiện **tên đường tiếng Việt đầy đủ**. Đã bỏ tab Nhật ký. Thẻ sự kiện hiện lâu hơn (~4–4,5 giây) và AI chậm hơn để kịp đọc. Có nút **Sáng/Tối**. Tham khảo bố cục từ link bạn gửi, **không copy ảnh/asset** của họ.
- **Chọn quân cờ & đặt tên**: 8 biểu tượng (🎩🐕🚂🎒🐱🚗🪙🏇) và ô nhập tên; nếu chơi nhiều người local thì hiện thêm màn hình nhập tên từng người. Tên/chủ phòng và tên khách được đồng bộ trong phòng online. **Bấm vào ô đất mở pop-up thẻ đất** (giá, chủ, cấp, bảng thuê, chi phí xây) kèm nút nâng cấp nếu là đất của bạn.
- Khi đi vào đất trống hiện **hộp thoại “Mua ngay / Không mua — đấu giá”** kèm giá và bảng tiền thuê.
- Hộp nâng cấp cho phép **chọn cấp 1–4 hoặc khách sạn**, hiện chi phí; cấp nào thiếu tiền hoặc vi phạm luật xây đều trong nhóm màu thì **làm mờ kèm lý do**.
- Không telemetry/tài khoản. Chế độ local không gọi mạng; chế độ online tải SDK Firebase từ `gstatic.com` và đọc/ghi `lotr-fotr-rooms/<mã-M>` trên project của bạn (gồm nước đi và **tin nhắn chat trong phòng**). Ai có mã phòng và rules public có thể đọc/sửa phòng — tin tưởng lẫn nhau, không chống gian lận.

## Hai chế độ (chọn bằng 2 tab trên màn hình tạo phòng)

- **Truyền thống**: luật Monopoly cổ điển, 40 ô tên đường Việt Nam, **không có thẻ sự kiện/power-up**, 400 lượt tối đa.
- **Business Tour**: bàn **32 ô chia 4 khu vực** (Miền Bắc / Miền Trung / Tây Nguyên / Miền Nam) với tỉnh thành Việt Nam. Cơ chế theo luật Business Tour trên Steam (tự dựng bằng dữ liệu/asset của mình, không copy tranh của họ):

| Cơ chế | Cách làm trong bản web |
|---|---|
| 4 resort | 🏖 Vịnh Hạ Long, Đà Nẵng, Phú Yên, Vũng Tàu — không bị đấu giá/mua lại; chiếm đủ 4 thắng ngay |
| 6 triplet | 3 ô cùng hoa văn A–F; chiếm đủ 3 nhóm thắng ngay |
| Side Monopoly | Chiếm mọi đất trong cùng 1 khu vực → thắng ngay |
| Xây theo vòng | Ghé đất mình: lần đầu chọn nhà cấp 1 hoặc 2; đi thêm 1 vòng lên cấp 3; thêm 1 vòng lên khách sạn |
| Giá tăng dần | Giá/tiền thuê tăng theo chiều kim đồng hồ |
| Liên hoan | Đầu trận ngẫu nhiên 2 thành phố có 🎊 — thuê gấp đôi cả trận |
| Thử Thách | ~50% đầu lượt, cho power-up: thêm lượt, động đất phá nhà đối thủ, thẻ thoát tù, tiền, tour thế giới, vào đảo… |
| Đảo Mất Tích | 1 ô tù duy nhất, giam đúng 3 lượt (đôi / trả phí / thẻ thoát tù để ra sớm) |
| Vô Địch Thế Giới | 🏆 Chọn 1 thành phố của bạn, mỗi lần tổ chức thuê ×1 thêm |
| Tour Thế Giới | 🌍 Trả 50đ để đi tới 1 đất trống hoặc đất của bạn ở lượt sau |
| Cơ quan thuế | Trả 10% tổng tài sản |
| Kết thúc | Phá sản, 3 điều kiện monopoly ở trên, hoặc hết **120 lượt** chấm theo tài sản |

Chế độ được gửi trong `meta.mode` của phòng nên chủ và khách luôn cùng luật. Diện mạo Business Tour: nền trời xanh, ô sáng có công trình nổi, giữa bàn là sân cỏ SVG tự vẽ; **đã bỏ cọc tiền 💵**. Bản Truyền thống giữ nền tối cũ. Không copy asset của Business Tour.

## Kiểm chứng

`node tools/selftest.js` → **PASS 678 / FAIL 0**: kiểm tra 40 ô cổ điển, 32 ô tour / 4 khu vực / 4 resort / 6 triplet / 1 ô tù, lên nhà theo vòng, tour thế giới, và 200 trận AI-vs-AI đều kết thúc hợp lệ.

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

# BoardGame Ace — Sảnh trò chơi

Website tổ hợp các board game, chạy hoàn toàn bằng HTML/CSS/JavaScript tĩnh trên Firebase Hosting.

- **Trang chủ:** https://boardgameace.web.app/
- **Sequence:** https://boardgameace.web.app/sequence/
- **Rummikub:** https://boardgameace.web.app/rummikub/
- **Hội Nhẫn (Lord of the Rings):** https://boardgameace.web.app/fotr/
- **Site cũ:** https://sequenceace.web.app/ tự động chuyển về trang chủ mới.

> Không dùng được tên `boardgame` vì ID này đã bị một project Firebase khác giữ trên toàn hệ thống. Tên `boardgameace` đã được chọn để giữ cùng phong cách với `sequenceace` cũ.

## Cấu trúc

```text
.
├── index.html          # Trang chủ (sảnh trò chơi), đọc danh sách GAMES
├── sequence/index.html # Game Sequence (giữ nguyên mã nguồn cũ)
├── rummikub/index.html # Game Rummikub
├── fotr/               # Game Hội Nhẫn mới: index.html + css/ + js/ + assets/ (18 chương)
├── legacy/index.html   # Trang redirect cho sequenceace.web.app
├── .firebaserc         # Project sequence-23c7f + 2 hosting target
├── firebase.json       # boardgameace = ., sequenceace = legacy/ + database rules
├── database.rules.json # Rules RTDB: rooms/, rummikub/rooms/, fotr/, lotr-fotr-rooms/
├── patch-back-button.ps1 + back-button.snippet.html  # Tiện ích vá sau khi đè file
└── .github/workflows/  # Auto deploy khi push main / preview khi có PR
```

Sequence và Rummikub là file `index.html` đơn; Hội Nhẫn là bản nhiều file (`css/`, `js/`, `assets/`) nhưng vẫn là HTML tĩnh, không cần build. Khi thêm game mới, tạo thư mục riêng có `index.html` (kèm asset nếu cần) rồi thêm một phần tử vào mảng `GAMES` trong `index.html` gốc với `url:"./game-moi/"`.

## Triển khai

Tự động: push lên nhánh `main` → GitHub Actions deploy `boardgameace` (live) và cập nhật trang redirect của `sequenceace`. Pull request → preview channel.

Thủ công (đã đăng nhập `firebase login`):

```powershell
firebase deploy --only hosting:boardgameace,hosting:sequenceace --project sequence-23c7f
```

Xem danh sách site: `firebase hosting:sites:list --project sequence-23c7f`.

Rules Realtime Database nằm ở `database.rules.json`. Sau khi sửa rules, deploy riêng:

```powershell
firebase deploy --only database --project sequence-23c7f
```

GitHub Actions hiện chỉ deploy hosting; rules không tự deploy khi push `main`.

### Sau khi đè file game mới

File tải về thường **không có** nút "← Sảnh trò chơi". Chạy script này rồi mới deploy:

```powershell
cd G:\AI\web\sequence\Sequence
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1
```

Script tự quét mọi thư mục game có `index.html` (bỏ qua trang chủ và `legacy/`), tự làm 2 việc: thêm nút vào file chưa có và đổi host database sai `...firebaseio.com` thành `...asia-southeast1.firebasedatabase.app`. Nội dung nút được đọc từ `back-button.snippet.html` (UTF-8) để tránh lỗi font khi chạy bằng Windows PowerShell. Nếu nút đã tồn tại nhưng bị lỗi font (kiểu `Sáº£nh trĂ² chÆ¡i`), script sẽ thay bằng nội dung đúng. File nào đã đúng thì bỏ qua.

Riêng game Hội Nhẫn có `fotr\CAP-NHAT-FOTR.bat` (file **local**, nằm trong `.gitignore` và bị loại khỏi hosting): chạy file này sẽ chép bản mới nhất từ `G:\AI\web\lotr-fotr-trick-taking` sang `fotr/`, ghi lại cấu hình Firebase rồi gọi script ở trên. Sửa biến `SRC` ở đầu file nếu bạn đổi nơi lưu source.

### Phòng đang mở

Rummikub có 2 tab trên trang chủ: **“Chuẩn · truyền thống”** (106 quân, 2 joker) và **“🌀 Twist”** (112 quân, 8 joker đặc biệt). Mỗi tab đều có riêng: tạo phòng với bạn bè, vào phòng bằng mã, chơi với AI (1–3 máy) và danh sách phòng đang mở. Chế độ được lưu thẳng vào phòng; vào nhầm tab sẽ bị từ chối và nhắc sang tab đúng. Luật/động tác kéo thả, hiệu ứng quân bài giữ nguyên như trước.

Rummikub và Hội Nhẫn đều có ô **“Phòng đang mở”** ngay trên màn hình chính: liệt kê tối đa 20 phòng còn hoạt động (chưa bắt đầu ván, tạo trong 30 phút gần đây), tự làm mới mỗi 10 giây. Bấm vào một phòng là tự điền mã phòng và vào chơi — bạn bè không cần nhớ/gõ mã. Ở Rummikub, danh sách được lọc riêng theo tab đang chọn.

- Rummikub đọc `rummikub/rooms/` bằng REST, hiển thị mã + tên chủ phòng + số người.
- Hội Nhẫn đọc `lotr-fotr-rooms/` bằng REST (`fotr/js/room-list.js`), hiển thị mã 6 ký tự + số người; chỉ hiện phòng chưa có khách (`guestJoined` chưa true).

Đây là dữ liệu RTDB công khai sẵn của project; tính năng này không gửi thêm dữ liệu nào đi đâu. Tên hiển thị trong phòng cũng vì thế mà công khai — không dùng tên thật nếu không muốn.

### Gói miễn phí (Spark)

Không cần nâng cấp: cùng một project `sequence-23c7f` đang dùng, Firebase cho phép tối đa 36 site trên mỗi project, dùng chung hạn mức 10 GB lưu trữ và 360 MB truyền tải/ngày. Toàn bộ website hiện nặng khoảng 2 MB (chủ yếu là font local của Hội Nhẫn) nên cách rất xa hạn mức. Không dùng custom domain hay tính năng trả phí.

Lưu ý: `localStorage` gắn theo tên miền. Dữ liệu lưu cũ trên `sequenceace.web.app` không tự động có trên `boardgameace.web.app`.

## Quyền riêng tư

- **Không có telemetry, analytics, quảng cáo, tracking hay tài khoản người dùng.** Mã nguồn là HTML tĩnh; không có script `gtag`, `googletagmanager`, `fbq` hay pixel.
- **Firebase Hosting (Google)** nhận các request HTTP thông thường khi tải trang (địa chỉ IP, user-agent, đường dẫn) và ghi log vận hành theo dịch vụ; đây là đặc tính của hosting, không phải tính năng theo dõi do ứng dụng thêm.
- **Firebase Realtime Database** của project `sequence-23c7f` được các game dùng để đồng bộ phòng chơi: mã phòng, nước đi/trạng thái bàn, tên hiển thị nếu bạn nhập. Các nhánh đang dùng: `rooms/` (Sequence), `rummikub/rooms/` (Rummikub), `lotr-fotr-rooms/` (Hội Nhẫn bản mới). Dữ liệu nằm trong RTDB của chính project cũ; không có đăng nhập/cloud account. Quyền đọc/ghi trên các nhánh phòng là công khai để game chạy không cần tài khoản; ô “Phòng đang mở” cũng hiển thị công khai mã phòng và tên chủ phòng. Vì vậy không nên gõ thông tin cá nhân nhạy cảm vào tên người chơi hoặc mã phòng.
- **Tài nguyên bên thứ ba:** SDK Firebase (chỉ tải khi bấm Tạo phòng/Tham gia) từ `gstatic.com`. Font Noto Sans và toàn bộ tranh SVG của Hội Nhẫn là file local trong project, không gọi Google Fonts.
- **Lưu trên thiết bị:** một số tùy chọn/trạng thái game được lưu bằng `localStorage` trong trình duyệt. Nút “Sao chép mã phòng” ghi nội dung vào clipboard **khi bạn chủ động bấm**; ứng dụng không đọc clipboard, không chụp màn hình, không ghi phím, không truy cập camera/microphone.
- **Tự kiểm chứng:** mở 4 file `index.html` và tìm các từ `gtag`, `analytics`, `fbq`, `getDisplayMedia`, `getUserMedia`; mở DevTools → Network để thấy toàn bộ request; xem dữ liệu RTDB trong Firebase Console của `sequence-23c7f`.

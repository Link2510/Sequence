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
├── fotr/index.html     # Game Hội Nhẫn (The Lord of the Rings)
├── legacy/index.html   # Trang redirect cho sequenceace.web.app
├── .firebaserc         # Project sequence-23c7f + 2 hosting target
├── firebase.json       # boardgameace = ., sequenceace = legacy/ + database rules
├── database.rules.json # Rules RTDB cho rooms/, rummikub/rooms/, fotr/
└── .github/workflows/  # Auto deploy khi push main / preview khi có PR
```

Mỗi game là một file `index.html` độc lập: không cần build, không có dependency cài đặt. Khi thêm game mới, tạo thư mục riêng (ví dụ `game-moi/index.html`) rồi thêm một phần tử vào mảng `GAMES` trong `index.html` với `url:"./game-moi/"`.

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

Script tự làm 2 việc: thêm nút vào file chưa có, và đổi host database sai `...firebaseio.com` thành `...asia-southeast1.firebasedatabase.app` (chỗ này hay bị mất khi đè file Rummikub mới). File nào đã đúng thì bỏ qua.

### Gói miễn phí (Spark)

Không cần nâng cấp: cùng một project `sequence-23c7f` đang dùng, Firebase cho phép tối đa 36 site trên mỗi project, dùng chung hạn mức 10 GB lưu trữ và 360 MB truyền tải/ngày. Toàn bộ website hiện nặng khoảng 125 KB nên cách rất xa hạn mức. Không dùng custom domain hay tính năng trả phí.

Lưu ý: `localStorage` gắn theo tên miền. Dữ liệu lưu cũ trên `sequenceace.web.app` không tự động có trên `boardgameace.web.app`.

## Quyền riêng tư

- **Không có telemetry, analytics, quảng cáo, tracking hay tài khoản người dùng.** Mã nguồn là HTML tĩnh; không có script `gtag`, `googletagmanager`, `fbq` hay pixel.
- **Firebase Hosting (Google)** nhận các request HTTP thông thường khi tải trang (địa chỉ IP, user-agent, đường dẫn) và ghi log vận hành theo dịch vụ; đây là đặc tính của hosting, không phải tính năng theo dõi do ứng dụng thêm.
- **Firebase Realtime Database** của project `sequence-23c7f` được các game dùng để đồng bộ phòng chơi: mã phòng, nước đi/trạng thái bàn, tên hiển thị nếu bạn nhập. Dữ liệu này nằm trong RTDB của chính project cũ; không có đăng nhập/cloud account. Quyền đọc/ghi trên các nhánh phòng là công khai để game chạy không cần tài khoản, nên không nên gõ thông tin cá nhân nhạy cảm vào tên người chơi hoặc mã phòng.
- **Tài nguyên bên thứ ba:** SDK Firebase tải từ `gstatic.com`; game Hội Nhẫn tải font từ `fonts.googleapis.com`/`fonts.gstatic.com`. Các bên này có thể thấy request từ trình duyệt của bạn.
- **Lưu trên thiết bị:** một số tùy chọn/trạng thái game được lưu bằng `localStorage` trong trình duyệt. Nút “Sao chép mã phòng” ghi nội dung vào clipboard **khi bạn chủ động bấm**; ứng dụng không đọc clipboard, không chụp màn hình, không ghi phím, không truy cập camera/microphone.
- **Tự kiểm chứng:** mở 4 file `index.html` và tìm các từ `gtag`, `analytics`, `fbq`, `getDisplayMedia`, `getUserMedia`; mở DevTools → Network để thấy toàn bộ request; xem dữ liệu RTDB trong Firebase Console của `sequence-23c7f`.

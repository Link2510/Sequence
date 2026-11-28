# BoardGame Ace — Sảnh trò chơi

Website tổ hợp board game tĩnh trên Firebase Hosting. Trang chủ là app React/Vite; các game là trang riêng.

- **Trang chủ:** https://boardgameace.web.app/
- **Sequence:** https://boardgameace.web.app/sequence/
- **Rummikub:** https://boardgameace.web.app/rummikub/
- **The Fellowship of the Ring: Trick-Taking Game:** https://boardgameace.web.app/fotr/
- **Tour Việt Nam:** https://boardgameace.web.app/monopoly/
- **Mèo Nổ:** https://boardgameace.web.app/meono/
- **Site cũ:** https://sequenceace.web.app/ tự động chuyển về trang chủ mới.

> Không dùng được tên `boardgame` vì ID này đã bị một project Firebase khác giữ trên toàn hệ thống. Tên `boardgameace` đã được chọn để giữ cùng phong cách với `sequenceace` cũ.

## Cấu trúc

```text
.
├── index.html          # Trang chủ mới (React/Vite), 5 thẻ đều là link sang game riêng
├── assets/             # Bundle + ảnh của trang chủ
├── meono/index.html    # Trang riêng Mèo Nổ (dùng chung bundle với trang chủ)
├── src/assets/images/  # Ảnh không được bundle của trang chủ
├── sequence/index.html # Game Sequence (giữ nguyên mã nguồn cũ)
├── rummikub/index.html # Game Rummikub
├── fotr/               # Game The Fellowship of the Ring (bản build tĩnh) + app/ (source React/Vite)
├── monopoly/           # Tour Việt Nam (bản build tĩnh) + app/ (source React/Vite)
├── legacy/index.html   # Trang redirect cho sequenceace.web.app
├── .firebaserc         # Project sequence-23c7f + 2 hosting target
├── firebase.json       # boardgameace = ., sequenceace = legacy/ + RTDB + Firestore rules
├── database.rules.json # Rules RTDB: rooms/, rummikub/rooms/, fotr/, lotr-fotr-rooms/
├── firestore.rules     # Rules Firestore: rooms/ của game Fellowship (tối đa 4 ghế/phòng)
├── patch-back-button.ps1 + back-button.snippet.html  # Tiện ích vá sau khi đè file
└── .github/workflows/  # Auto deploy khi push main / preview khi có PR
```

Sequence và Rummikub là file `index.html` đơn. Fellowship và Tour là app React/Vite (`fotr/app/`, `monopoly/app/`). Trang chủ mới được build từ source ngoài repo `G:\AI\web\Trang-chủ` (`base:'./'`, 2 entry `index.html` + `meono.html`), copy ngược ra root repo. Danh sách 5 game nằm ở `src/boardgameace/boardGames.ts` (và bản mirror `src/data/boardGames.ts`); mọi thẻ đều dùng `<a href>` với `relativeUrl`/`absoluteUrl`, không còn nút “Chơi Ngay” nhúng trong trang chủ. Khi thêm game mới: tạo thư mục riêng có `index.html`, rồi thêm phần tử vào `BOARD_GAMES` với `relativeUrl:"./game-moi/"` + `absoluteUrl:"https://boardgameace.web.app/game-moi/"`. Lưu ý `resolveGameUrl()` chỉ dùng path tương đối khi hostname là `boardgameace.web.app`; trên `boardgameace.firebaseapp.com` nó dùng URL tuyệt đối.

## Triển khai

Tự động: push lên nhánh `main` → GitHub Actions deploy `boardgameace` (live) và cập nhật trang redirect của `sequenceace`. Pull request → preview channel.

Thủ công (đã đăng nhập `firebase login`):

```powershell
firebase deploy --only hosting:boardgameace,hosting:sequenceace --project sequence-23c7f
```

Xem danh sách site: `firebase hosting:sites:list --project sequence-23c7f`.

Rules Realtime Database nằm ở `database.rules.json`, rules Firestore ở `firestore.rules`. Sau khi sửa rules, deploy riêng:

```powershell
firebase deploy --only database,firestore:rules --project sequence-23c7f
```

GitHub Actions hiện chỉ deploy hosting; rules không tự deploy khi push `main`.

### Sau khi đè file game mới

File tải về thường **không có** nút "← Sảnh trò chơi". Chạy script này rồi mới deploy:

```powershell
cd G:\AI\web\sequence\Sequence
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1
```

Script tự quét mọi thư mục game có `index.html` (bỏ qua trang chủ và `legacy/`), tự làm 2 việc: thêm nút vào file chưa có và đổi host database sai `...firebaseio.com` thành `...asia-southeast1.firebasedatabase.app`. Nội dung nút được đọc từ `back-button.snippet.html` (UTF-8) để tránh lỗi font khi chạy bằng Windows PowerShell. Nếu nút đã tồn tại nhưng bị lỗi font (kiểu `Sáº£nh trĂ² chÆ¡i`), script sẽ thay bằng nội dung đúng. File nào đã đúng thì bỏ qua.

### Build lại game Fellowship

Source React/Vite nằm ở `fotr/app/` (đã nhúng sẵn cấu hình Firebase của project `sequence-23c7f`, không cần file `.env`):

```powershell
cd G:\AI\web\sequence\Sequence\fotr\app
npm install --legacy-peer-deps   # lần đầu
npx vite build
Copy-Item 'dist\*' '..' -Recurse -Force
Remove-Item 'dist' -Recurse -Force
cd ..\..
powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1 -Files .\fotr\index.html
```

Sau khi build, chạy lại `patch-back-button.ps1` để thêm nút "← Sảnh trò chơi" (Vite ghi đè `index.html`).

### Phòng đang mở

Rummikub có 2 tab trên trang chủ: **“Chuẩn · truyền thống”** (106 quân, 2 joker) và **“🌀 Twist”** (112 quân, 8 joker đặc biệt). Mỗi tab đều có riêng: tạo phòng với bạn bè, vào phòng bằng mã, chơi với AI (1–3 máy) và danh sách phòng đang mở. Chế độ được lưu thẳng vào phòng; vào nhầm tab sẽ bị từ chối và nhắc sang tab đúng. Luật/động tác kéo thả, hiệu ứng quân bài giữ nguyên như trước.

AI chơi với máy có 3 cấp, chọn ở ô “🎯 Độ khó AI” (lưu trong `localStorage.rkailevel`): **Dễ · Bống** (tìm kiếm nông, thỉnh thoảng bỏ lượt), **Trung bình · Bình** (mặc định, tìm kiếm 20.000 nút) và **Khó · Túc** (tìm kiếm 200.000 nút, ưu tiên nhóm nhiều điểm, thử nối thêm quân nhiều vòng). Tên cấp được gắn vào tên bot trong bàn chơi.

Nút **“Sắp theo số / Sắp theo màu”** luôn có trên bàn chơi, kể cả khi đang là lượt của đối phương. Khi không phải lượt của bạn, hai nút này chỉ đổi **thứ tự hiển thị** trên giá (`RK`), không đụng vào nước đi hay trạng thái ván — nên bạn có thể sắp sẵn ngay sau khi rút bài để chuẩn bị lượt sau.

Chế độ có giới hạn thời gian: trong **5 giây cuối của lượt bạn**, đồng hồ nhấp nháy đỏ và phát tiếng bíp dồn dập bằng Web Audio (2 giây cuối nhanh/gấp đôi). Không dùng file âm thanh hay dịch vụ bên ngoài; trình duyệt chỉ cho phát sau lần bạn bấm/chạm đầu tiên.

Rummikub có ô **“Phòng đang mở”** ngay trên màn hình chính: liệt kê tối đa 20 phòng còn hoạt động (chưa bắt đầu ván, tạo trong 30 phút gần đây), tự làm mới mỗi 10 giây. Bấm vào một phòng là tự điền mã phòng và vào chơi — bạn bè không cần nhớ/gõ mã. Danh sách được lọc riêng theo tab đang chọn.

- Rummikub đọc `rummikub/rooms/` bằng REST, hiển thị mã + tên chủ phòng + số người.
- Fellowship dùng Firestore collection `rooms/` (mã dạng `RING-XXXXX`) và chỉ vào bằng mã hoặc link mời, không có danh sách phòng công khai.

Đây là dữ liệu RTDB công khai sẵn của project; tính năng này không gửi thêm dữ liệu nào đi đâu. Tên hiển thị trong phòng cũng vì thế mà công khai — không dùng tên thật nếu không muốn.

### Gói miễn phí (Spark)

Không cần nâng cấp: cùng một project `sequence-23c7f` đang dùng, Firebase cho phép tối đa 36 site trên mỗi project, dùng chung hạn mức 10 GB lưu trữ và 360 MB truyền tải/ngày. Toàn bộ website hiện nặng khoảng 15 MB (chủ yếu là ảnh minh họa của Fellowship và Tour Việt Nam) nên vẫn cách rất xa hạn mức. Không dùng custom domain hay tính năng trả phí.

Lưu ý: `localStorage` gắn theo tên miền. Dữ liệu lưu cũ trên `sequenceace.web.app` không tự động có trên `boardgameace.web.app`.

## Quyền riêng tư

- **Không có telemetry, analytics, quảng cáo, tracking hay tài khoản người dùng.** Toàn bộ là file tĩnh (HTML/JS/CSS); kiểm tra bundle không thấy `gtag`, `googletagmanager`, `fbq` hay pixel.
- **Firebase Hosting (Google)** nhận các request HTTP thông thường khi tải trang (địa chỉ IP, user-agent, đường dẫn) và ghi log vận hành theo dịch vụ; đây là đặc tính của hosting, không phải tính năng theo dõi do ứng dụng thêm.
- **Firebase Realtime Database** của project `sequence-23c7f` được các game dùng để đồng bộ phòng chơi: mã phòng, nước đi/trạng thái bàn, tên hiển thị nếu bạn nhập. Các nhánh đang dùng: `rooms/` (Sequence), `rummikub/rooms/` (Rummikub), `lotr-fotr-rooms/` (chỉ còn Tour Việt Nam tại `tour-rooms/`; các phòng Hội Nhẫn/Duel cũ đã dọn 28/11/2026). Dữ liệu nằm trong RTDB của chính project cũ; không có đăng nhập/cloud account. Quyền đọc/ghi trên các nhánh phòng là công khai để game chạy không cần tài khoản; ô “Phòng đang mở” cũng hiển thị công khai mã phòng và tên chủ phòng. Vì vậy không nên gõ thông tin cá nhân nhạy cảm vào tên người chơi hoặc mã phòng.
- **Firebase Firestore** của cùng project được game Fellowship dùng để đồng bộ phòng: mã phòng `RING-XXXXX`, tên hiển thị, ghế ngồi và trạng thái ván. Collection `rooms/` cho phép đọc một phòng khi biết mã và ghi/ cập nhật phòng đó (tối đa 4 ghế), không cho liệt kê toàn bộ. Mỗi lần ghi phòng sẽ gắn `expiresAt` = hiện tại + 60 phút; phòng quá hạn bị coi là đóng và tự xoá khi có người mở lại link (hoặc khi app khởi động, dọn các phòng đã ghé). Rules cũng chỉ cho xoá phòng khi đã quá `expiresAt`. Không có đăng nhập; ai biết mã phòng đều có thể vào phòng đó. Lưu ý: chính sách TTL phía server của Firestore yêu cầu project có billing, nên project Spark dùng cơ chế dọn phía client như trên.
- **Tài nguyên bên thứ ba:**
  - Trang chủ mới tải font Google Fonts (Cormorant Garamond, JetBrains Mono, Plus Jakarta Sans) từ `fonts.googleapis.com`/`fonts.gstatic.com` — đây là request duy nhất tới dịch vụ ngoài của trang chủ; không có telemetry hay pixel. Ảnh minh họa 5 game là file local.
  - Game Fellowship đóng gói sẵn SDK Firebase trong bundle; font và ảnh của game này là file local (không gọi Google Fonts).
  - Game Tour tải SDK Firebase từ `gstatic.com` **khi bấm tạo/vào phòng online**; phần chơi AI không gọi mạng.
  - Sequence/Rummikub tải SDK Firebase từ `gstatic.com` khi dùng chế độ online, như thiết kế cũ.
- **Lưu trên thiết bị:** một số tùy chọn/trạng thái game được lưu bằng `localStorage` trong trình duyệt. Nút “Sao chép mã phòng” ghi nội dung vào clipboard **khi bạn chủ động bấm**; ứng dụng không đọc clipboard, không chụp màn hình, không ghi phím, không truy cập camera/microphone.
- **Tự kiểm chứng:** mở các file `index.html`/bundle JS và tìm các từ `gtag`, `analytics`, `fbq`, `getDisplayMedia`, `getUserMedia`; mở DevTools → Network để thấy toàn bộ request; xem dữ liệu RTDB/Firestore trong Firebase Console của `sequence-23c7f`.

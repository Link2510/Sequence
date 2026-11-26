# The Lord of the Rings: The Fellowship of the Ring — Trick-Taking Game

Web game tái tạo **luật board game chính thức** (Office Dog / Asmodee, thiết kế Bryan Bornmueller): 18 chương, hợp tác. Chơi **1 người + AI** (local) hoặc **2 người ở 2 thiết bị + AI** (qua Firebase). **Song ngữ VI/EN**. Chế độ local không gọi mạng.

> Đây không phải bản service hay bản dịch có bản quyền của tranh thẻ. Đây là bản web tự làm để **học cách chơi**, dùng luật đã công bố trong rulebook và danh sách thẻ.

## Chạy

Double-click `index.html` (hoặc `Chay.bat`). Không cần server, không cài dependency. Nút **“Về sảnh trò chơi”** quay về `../index.html` — trang menu chọn game ở gốc `G:\AI-Models`.

## Mục lục

- [Luật đã tái tạo](#luật-đã-tái-tạo)
- [Chơi trên web](#chơi-trên-web)
- [Phạm vi tái tạo & phần tóm tắt](#phạm-vi-tái-tạo--phần-tóm-tắt)
- [Kiểm chứng](#kiểm-chứng)
- [Cấu trúc](#cấu-trúc)
- [Quyền riêng tư](#quyền-riêng-tư-privacy)

## Chơi online: 2 thiết bị + AI

Đây là chế độ bạn dùng khi up lên Firebase. Một máy làm **chủ phòng** (chạy luật + AI), máy kia làm **khách** (gửi lượt đi qua Firebase).

**Thiết lập 1 lần**

1. `js/firebase-config.js` **đã được điền sẵn** bằng web config của project `sequence-23c7f` (từ file handoff bạn cung cấp), dùng `databaseURL` khu vực `asia-southeast1`. Nếu bạn đổi project, chỉ cần thay 5 trường trong file này.
2. Bật **Realtime Database** trong project. Với game thông thường, rules tối thiểu:

```json
{
  "rules": {
    "lotr-fotr-rooms": {
      "$code": { ".read": true, ".write": true }
    }
  }
}
```

   (Rules mở chỉ phù hợp game không có dữ liệu nhạy cảm; nếu project của bạn đã có rules chặt hơn, hãy giữ rules đó và cấp quyền cho đường dẫn `lotr-fotr-rooms`.)
3. Deploy như một static site (Firebase Hosting chẳng hạn). Không cần build, không cần npm.

**Cách chơi**

- Máy 1: màn hình chính → **Tạo phòng** → copy mã 6 ký tự → gửi cho người kia. Khi máy 2 vào, màn hình chờ tự đổi sang “đã vào” và **tự mở chương 1** (không cần bấm nút). Bạn cũng có thể bấm **Bắt đầu** ngay nếu muốn.
- Máy 2: màn hình chính → nhập mã vào ô **Mã phòng** → **Tham gia phòng** → màn hình chờ tự đóng khi chủ phòng bắt đầu; khi game báo “chọn nhân vật”, chọn nhân vật của bạn. Ô **“Phòng đang mở”** ngay dưới nút tham gia liệt kê các phòng chờ trong 30 phút — bấm một mã là vào luôn (giống các game cũ).
- Chủ phòng chọn xong sẽ bấm bắt đầu vòng; cả hai cùng thấy bàn bài. Đến lượt ai, người đó đi bài trên thiết bị của mình. AI do máy chủ phòng điều khiển.
- Nếu chưa điền config, nút online hiện thông báo rõ và game vẫn chơi local bình thường.

Đã test thật với **2 tab trình duyệt** trên project Firebase của bạn: tạo phòng → tham gia → cả 2 thấy đúng 4 mục tiêu → host và khách đi bài → AI đi → người thắng lượt 1 được ghi ở cả 2 máy, **0 lỗi console**. Các phòng test đã xoá. Khi deploy, copy nội dung thư mục này đè lên `G:\AI\web\sequence\Sequence\fotr`, chạy `patch-back-button.ps1` rồi deploy hosting như lệnh trong file handoff.

**Giới hạn của chế độ online**

- Cần cả 2 máy cùng mạng để Firebase hoạt động. Nếu chủ phòng đóng tab, phòng ngừng chạy.
- Bài của cả 2 người được lưu trong RTDB để đồng bộ; giao diện chỉ hiện bài của đúng thiết bị đó, nhưng người có mã phòng và biết đọc RTDB có thể xem được — đây là trust-based, không phải chế độ chống gian lận.
- SDK Firebase được tải từ `gstatic.com` **chỉ khi bạn bấm Tạo phòng/Tham gia và đã có config**. Chế độ local không tải SDK, không gọi mạng.

## Luật đã tái tạo

**Bộ bài 37 lá**

- Đồi / Núi / Rừng / Bóng Tối: mỗi chất **1–8**.
- Nhẫn: **1–5**. Lá **1 Nhẫn là Nhẫn Vàng**.

**Khởi động vòng**

1. Xáo bài, lật 1 lá làm **lá bài bị rơi** (nếu là 1 Nhẫn thì lấy lá khác).
2. Chia bài: **3 người × 12 lá** hoặc **4 người × 9 lá**.
3. Người cầm **1 Nhẫn** làm **Frodo**, đi lượt đầu. Token Nhẫn ở trạng thái “chưa được đi chất Nhẫn”.
4. Chọn nhân vật theo chương (nhân vật có ★ là bắt buộc). Các nhân vật có hành động thiết lập: Gandalf lấy lá rơi; Sam/Merry rút Threat; Fatty cho bài... Các lần **đổi bài** được web tự động hoá và ghi vào nhật ký.

**Một lượt**

- Người dẫn đi bất kỳ lá nào (chưa được dẫn chất Nhẫn).
- Người sau **phải đi cùng chất nếu có**; nếu không thì đi lá bất kỳ.
- Lá **cao nhất của chất được dẫn** thắng; người thắng đi lượt sau.
- Lá Nhẫn đi vào lượt khác chất → **phá chất Nhẫn**, từ đó được dẫn.
- Khi đi **1 Nhẫn**, bạn được **chọn** dùng quyền thắng lượt đó, hoặc đi như lá Nhẫn số 1 thường.
- Lá 2–5 Nhẫn là bài thường, không phải chất chủ.

**Thắng / thua**

- Mỗi nhân vật có mục tiêu riêng (Frodo thắng 2+ lá Nhẫn, Bilbo 3+ lượt, Gandalf 1+ lượt, Pippin ít lượt nhất, Sam thắng lá Đồi đúng số Threat, Merry đúng 1 hoặc 2 lượt, Gildor đi lá Rừng ở lượt cuối...).
- **Chương ngắn**: hoàn thành mục tiêu các nhân vật đã chọn trong 1 vòng.
- **Chương dài**: chơi nhiều vòng, lưu nhân vật đã hoàn thành.
- Hỏng 1 mục tiêu → cả nhóm hỏng vòng đó, được chơi lại.
- Không được nói về bài trong tay — chỉ nhắc lại thông tin đã lộ (rulebook mục *Communication*).

## Chơi trên web

- Màn hình chính tách rõ 2 mục:
  - **Chơi với AI (local)**: `1 bạn + 2 AI (3 tay)`, `1 bạn + 3 AI (4 tay)`, `2 bạn + 1 AI (3 tay)`, `2 bạn + 2 AI (4 tay)`.
  - **Chơi nhiều người thật (local, luân phiên)**: `3 người thật (3 tay)` hoặc `4 người thật (4 tay)` — **không có AI**; các tay bài lần lượt thuộc Bạn 1/2/3/4, có màn hình “chuyển thiết bị” để giấu bài.
  - Mục **Chơi online (2 thiết bị)** nằm riêng bên dưới (2 người + AI). Chọn chương đã mở khoá (1–18).
- Với 2 người: chơi **luân phiên trên cùng máy**. Khi tới lượt người kia, game hiện màn hình “Chuyển thiết bị…” để giấu bài — đúng tinh thần rulebook: không được nhìn bài người khác.
-intro chương: xem truyện, danh sách nhân vật, loại thắng (ngắn/dài), Threat.
- Màn hình chọn nhân vật: bạn chọn 1 nhân vật; Frodo tự gán cho người cầm Nhẫn Vàng; AI nhận các nhân vật còn lại.
- Bảng điều khiển: ô mục tiêu từng nhân vật (✓/✗), token Nhẫn, lá bài bị rơi, lá Threat, nhật ký.
- Nút **Hướng dẫn từng bước**: 9 bước coach-mark dẫn bạn qua chương 1.
- Nút **Luật chơi**: 9 mục luật, gồm cả phần “Phạm vi tái tạo” và “Quyền riêng tư”.
- Nút **EN/VI** đổi ngôn ngữ mọi lúc.
- Tiến trình lưu trong `localStorage`; nút **Đặt lại tiến trình** xoá.

**Chế độ solo trong board game gốc khác với web này**: rulebook dùng 4 tay bài úp ngửa do chính bạn điều khiển và rút bài bổ sung sau mỗi lượt. Web dùng “bạn + AI” để bạn học luật nhiều người trước khi ngồi vào bàn thật. Mình ghi rõ trong mục “Solo” của hướng dẫn.

## Phạm vi tái tạo & phần tóm tắt

Khớp rulebook / tài liệu chính thức:

- Bộ bài, cách chia, lá rơi, luật dẫn/đi theo chất, luật chất Nhẫn và Nhẫn Vàng, cách tính thắng lượt.
- Chương 1–2 (nhân vật, Threat Black Rider 1–4, mục tiêu Frodo/Bilbo/Gandalf/Pippin/Sam/Merry).
- Cơ chế thắng ngắn / dài, 18 tiêu đề chương theo danh sách thẻ đã công bố.

Được tóm tắt (hiện dấu **~** cạnh mục tiêu trong game):

- Một số mục tiêu nhân vật ít phổ biến (Tom Bombadil, Goldberry chi tiết, Elrond, Gwaihir/Shadowfax/Radagast, nhóm “Burdened” chương 18...). Rulebook PDF không in text của 39 thẻ nhân vật, nên mình dùng mô tả từ rulebook + review công khai.
- Thành phần một số chương (3–12, 14–18) được dựng lại từ danh sách thẻ và ghi chú chương; khuyến nghị đối chiếu với thẻ chương thật khi chơi ngoài đời.
- Event cards (Old Man Willow, Barrow-wights, The Nine, Saruman, Mirror, Rivers, Moria events...) được tóm tắt thành ghi chú trong intro chương — web không mô phỏng từng hiệu ứng in trên thẻ sự kiện.
- Các lần đổi bài setup được tự động hoá (web không hỏi bạn lá nào muốn đưa/nhận).

AI là **bạn tập hợp tác heuristics**, không phải người chơi tối ưu. Tỷ lệ thắng vòng của AI đơn lẻ thấp (mục tiêu của game vốn cần trao đổi thông tin giữa người thật) — bạn nên tự quyết định giúp đồng đội.

## Kiểm chứng

```powershell
node tools/selftest.js
python tools/check-font.py
```

Kết quả đã chạy thật: **PASS 9086 / FAIL 0** (kiểm tra bộ bài, dữ liệu 18 chương, i18n, và 80 vòng mô phỏng mỗi chương cho cả 3 và 4 người). Font: **103/103** ký tự dấu tiếng Việt.

Đã mở thật trong Chromium: **0 lỗi console**; vào chương 1 → chọn nhân vật → chia bài → tutorial → đi 1 lượt bài (Frodo thắng lượt 1) → sang lượt 2 → đổi ngôn ngữ → mở hướng dẫn đều chạy. Không dùng ảnh chụp màn hình để kiểm tra; dùng log text, DOM state và bảng ký tự font.

Nguồn luật: rulebook chính thức [PDF trên Asmodee CDN](https://cdn.svc.asmodee.net/production-officedog/uploads/2025/10/ODLO01_Rulebook_web.pdf), danh sách thẻ BoardGameGeek, trang Office Dog Games. Để đọc PDF lúc phát triển mình có cài `pypdf` **vào môi trường Python của máy** — game không dùng package này và không gọi mạng.

## Cấu trúc

```
index.html            Giao diện
css/styles.css        Styling + @font-face local
js/engine.js          Luật bài thuần túy (Node test được)
js/characters.js      39 định nghĩa nhân vật (mục tiêu, setup, cờ ~)
js/chapters.js        18 chương (nhân vật, required, short/long, Threat)
js/i18n.js            Từ điển VI/EN + 9 bước hướng dẫn
js/game.js            Điều khiển DOM, AI, tutorial, localStorage
assets/*.svg          14 minh họa cục bộ
assets/fonts/*.ttf    Noto Sans Regular/Bold (OFL)
tools/make-art.js     Tạo lại tranh SVG
tools/selftest.js     Test luật, 0 dependency
tools/check-font.py   Kiểm tra độ phủ dấu tiếng Việt (cần fontTools)
tools/audit-text.js   Quét lỗi mã hoá / ký tự lạ
Chay.bat              Mở game trong trình duyệt mặc định
```

## Quyền riêng tư / Privacy

**VI:** Ở **chế độ local**, game **không gửi dữ liệu đi đâu**: không tài khoản, không telemetry, không analytics, không chụp màn hình, không ghi phím, không đọc clipboard, không tải SDK, không gọi mạng. Dữ liệu duy nhất là tiến trình trong `localStorage` trình duyệt, key `lotr-fotr-trick-taking-v1`.

Ở **chế độ online**, bạn chủ động bật Firebase: game tải SDK Firebase compat từ `www.gstatic.com`, rồi đọc/ghi tại `<databaseURL>/lotr-fotr-rooms/<mã-phòng>`. Dữ liệu phòng gồm bài trong tay của 2 người, bài đã thắng, mục tiêu và nhật ký lượt — **không có dữ liệu cá nhân, không telemetry, không tài khoản/đăng nhập**. Mã phòng là định danh duy nhất. Đây là endpoint mạng duy nhất, do chính project Firebase của bạn cấu hình; bạn tự kiểm soát rules. Không có bên thứ ba nào khác nhận dữ liệu. Font và tranh đều là file local trong project.

Tự kiểm chứng:

```powershell
Select-String -Path .\*.html,.\css\*.css,.\js\*.js,.\tools\*.js -Pattern 'fetch\(|XMLHttpRequest|sendBeacon|WebSocket|telemetry|analytics|CopyFromScreen|keylog|clipboard|https?://'
# Chỉ nên thấy: chuỗi giải thích "không telemetry", namespace SVG "http://www.w3.org/2000/svg",
# và 2 URL SDK Firebase trong js/net.js (chúng chỉ được tải khi bạn bật chế độ online có config).
# DevTools > Network: chỉ có file local. DevTools > Application > Local Storage: key ở trên.
# Xoá: nút "Đặt lại tiến trình" trong game.
```

**EN:** In **local mode** the game sends nothing anywhere: no account, telemetry, analytics, screenshots, keylogging, clipboard access, SDK downloads or network calls. The only stored data is Browser `localStorage` under `lotr-fotr-trick-taking-v1`.

In **online mode** you opt in to Firebase: the game loads the Firebase compat SDK from `www.gstatic.com` and reads/writes `<databaseURL>/lotr-fotr-rooms/<room-code>`. Room data contains both players' hands, won cards, goals and trick log — no personal data, no telemetry, no login. The room code is the only identifier. This is the sole network endpoint and it is your own Firebase project with rules you control. Verify with the grep above, DevTools → Network / Application, and the in-game “Reset progress” button.

## Giới hạn

- “2 người” là hot-seat trên cùng một máy, không phải multiplayer qua mạng. Chế độ 2 người của board game gốc dùng tháp bài úp (pyramid); web dùng 2 người thật + AI thay thế.
- Tiến trình gắn với trình duyệt/profile hiện tại.
- Tranh là SVG cách điệu do code tạo ra, không phải tranh thẻ chính thức.
- Đây là bản học luật; để chơi thật hãy đối chiếu các thẻ sự kiện/chương khi có board game trong tay.

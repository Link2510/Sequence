# Chạy sau khi đè file index.html mới, hoặc sau khi thêm game mới:
#   powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1
# Tự quét mọi thư mục có index.html (game mới chỉ cần tạo thư mục + index.html rồi chạy script).
# Script làm 2 việc, và bỏ qua file/nội dung đã đúng:
#   1. Thêm nút "Về sảnh trò chơi" nếu file chưa có.
#   2. Sửa host Realtime Database sai (...firebaseio.com) thành ...asia-southeast1.firebasedatabase.app.
# Sau đó chạy: firebase deploy --only hosting:boardgameace --project sequence-23c7f

# Không truyền -Files: tự quét mọi thư mục game có index.html trong repo
# (bỏ qua thư mục ẩn, legacy/ và index.html ở gốc là trang chủ).
# Truyền -Files nếu bạn muốn xử lý danh sách cụ thể.
param(
  [string[]]$Files
)

if (-not $Files -or $Files.Count -eq 0) {
  $Files = Get-ChildItem -LiteralPath $PSScriptRoot -Directory -Force |
    Where-Object { $_.Name -notmatch '^\.' -and $_.Name -ne 'legacy' } |
    ForEach-Object { Join-Path $_.FullName 'index.html' } |
    Where-Object { Test-Path -LiteralPath $_ }
}

$snippet = @'
<a class="bg-home" href="https://boardgameace.web.app/" title="Về sảnh trò chơi" aria-label="Về sảnh trò chơi">← Sảnh trò chơi</a>
<style>
.bg-home{position:fixed;left:12px;bottom:12px;z-index:2147483647;display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:rgba(15,18,32,.82);color:#fff;text-decoration:none;font:600 13px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 18px rgba(0,0,0,.28);backdrop-filter:blur(6px)}
.bg-home:hover,.bg-home:focus-visible{background:#242b55;color:#ffcc4d;outline:none}
@media (prefers-color-scheme:light){.bg-home{background:rgba(255,255,255,.9);color:#1c2040;border-color:rgba(0,0,0,.15)}.bg-home:hover,.bg-home:focus-visible{color:#d98a00}}
</style>
'@

$wrongHost = 'https://sequence-23c7f-default-rtdb.firebaseio.com'
$rightHost = 'https://sequence-23c7f-default-rtdb.asia-southeast1.firebasedatabase.app'
$utf8 = New-Object System.Text.UTF8Encoding($false)

foreach ($f in $Files) {
  if (-not (Test-Path $f)) { Write-Warning "Không tìm thấy: $f"; continue }

  $original = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
  $text = $original
  $changed = $false

  if (-not $text.Contains('class="bg-home"')) {
    $m = [regex]::Match($text, '<body[^>]*>')
    if ($m.Success) {
      $text = $text.Insert($m.Index + $m.Length, $snippet)
      $changed = $true
      "Đã thêm nút về trang chủ: $f"
    } else {
      Write-Warning "Không tìm thấy <body> trong: $f"
    }
  }

  if ($text.Contains($wrongHost)) {
    $text = $text.Replace($wrongHost, $rightHost)
    $changed = $true
    "Đã sửa host Realtime Database: $f"
  }

  if ($changed) {
    [System.IO.File]::WriteAllText($f, $text, $utf8)
  } else {
    "Không cần sửa: $f"
  }
}

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

# Đọc snippet từ file UTF-8 riêng: Windows PowerShell 5.1 đọc script không có BOM
# như ANSI, nên nhúng tiếng Việt trực tiếp trong script sẽ bị lỗi font.
$snippetPath = Join-Path $PSScriptRoot 'back-button.snippet.html'
if (-not (Test-Path -LiteralPath $snippetPath)) { throw "Thiếu file: $snippetPath" }
$snippet = [System.IO.File]::ReadAllText($snippetPath, [System.Text.Encoding]::UTF8)

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

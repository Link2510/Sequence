# Chạy sau khi đè file index.html mới vào thư mục game:
#   powershell -ExecutionPolicy Bypass -File .\patch-back-button.ps1
# Script chỉ thêm nút "Về sảnh trò chơi" nếu file chưa có; không sửa gì khác.

param(
  [string[]]$Files = @(
    "$PSScriptRoot\sequence\index.html",
    "$PSScriptRoot\rummikub\index.html",
    "$PSScriptRoot\fotr\index.html"
  )
)

$snippet = @'
<a class="bg-home" href="https://boardgameace.web.app/" title="Về sảnh trò chơi" aria-label="Về sảnh trò chơi">← Sảnh trò chơi</a>
<style>
.bg-home{position:fixed;left:12px;bottom:12px;z-index:2147483647;display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:rgba(15,18,32,.82);color:#fff;text-decoration:none;font:600 13px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 18px rgba(0,0,0,.28);backdrop-filter:blur(6px)}
.bg-home:hover,.bg-home:focus-visible{background:#242b55;color:#ffcc4d;outline:none}
@media (prefers-color-scheme:light){.bg-home{background:rgba(255,255,255,.9);color:#1c2040;border-color:rgba(0,0,0,.15)}.bg-home:hover,.bg-home:focus-visible{color:#d98a00}}
</style>
'@

$utf8 = New-Object System.Text.UTF8Encoding($false)

foreach ($f in $Files) {
  if (-not (Test-Path $f)) { Write-Warning "Không tìm thấy: $f"; continue }
  $text = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
  if ($text.Contains('class="bg-home"')) { "Đã có sẵn: $f"; continue }
  $m = [regex]::Match($text, '<body[^>]*>')
  if (-not $m.Success) { Write-Warning "Không tìm thấy <body> trong: $f"; continue }
  $text = $text.Insert($m.Index + $m.Length, $snippet)
  [System.IO.File]::WriteAllText($f, $text, $utf8)
  "Đã thêm nút: $f"
}

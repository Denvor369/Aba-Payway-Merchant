# apply-guard.ps1 — copies the guard into your project
Param(
  [string]$ProjectRoot = "C:\Den\my-shop",
  [string]$ZipPath = "$env:USERPROFILE\Downloads\payway-guard-min.zip"
)

$Temp = Join-Path $env:TEMP ("payway_guard_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $Temp | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $Temp -Force
Copy-Item (Join-Path $Temp "payway-guard-min.js") (Join-Path $ProjectRoot "payway-guard-min.js") -Force
Write-Host "Copied payway-guard-min.js to $ProjectRoot" -ForegroundColor Green
Write-Host "Now add to checkout.html (just before </body>): <script src=\"payway-guard-min.js\"></script>"

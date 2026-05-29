$ErrorActionPreference = 'Stop'

$workspace = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $workspace 'dist'
$pwa = Join-Path $workspace 'dist-pwa'
$zip = Join-Path $workspace 'ocean-chronicle-pwa.zip'

if (-not (Test-Path $dist)) {
  throw "dist folder does not exist. Run npm run build first."
}

if ((Test-Path $pwa) -and ((Resolve-Path $pwa).Path -like "$workspace*")) {
  Remove-Item -LiteralPath $pwa -Recurse -Force
}

if ((Test-Path $zip) -and ((Resolve-Path $zip).Path -like "$workspace*")) {
  Remove-Item -LiteralPath $zip -Force
}

Copy-Item -LiteralPath $dist -Destination $pwa -Recurse -Force

$videoDir = Join-Path $pwa 'assets\videos'
if ((Test-Path $videoDir) -and ((Resolve-Path $videoDir).Path -like "$pwa*")) {
  Remove-Item -LiteralPath $videoDir -Recurse -Force
}

$assetsDir = Join-Path $pwa 'assets'
if (Test-Path $assetsDir) {
  Get-ChildItem -LiteralPath $assetsDir -Directory | Where-Object { $_.Name -ne 'mobile' } | ForEach-Object {
    if ((Resolve-Path $_.FullName).Path -like "$assetsDir*") {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
  }
}

$items = Get-ChildItem -LiteralPath $pwa -Force
Compress-Archive -Path $items.FullName -DestinationPath $zip -Force

$pwaSize = (Get-ChildItem -LiteralPath $pwa -Recurse -File | Measure-Object Length -Sum).Sum
$zipSize = (Get-Item -LiteralPath $zip).Length

Write-Host "PWA folder: $pwa"
Write-Host "PWA zip: $zip"
Write-Host "PWA folder size: $([math]::Round($pwaSize / 1MB, 2)) MB"
Write-Host "PWA zip size: $([math]::Round($zipSize / 1MB, 2)) MB"

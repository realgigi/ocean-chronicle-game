$ErrorActionPreference = 'Stop'

$workspace = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageJsonPath = Join-Path $workspace 'package.json'
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$version = $packageJson.version
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

Push-Location $workspace
try {
  npm run android:sync

  Push-Location (Join-Path $workspace 'android')
  try {
    .\gradlew.bat clean assembleDebug
  }
  finally {
    Pop-Location
  }

  $sourceApk = Join-Path $workspace 'android\app\build\outputs\apk\debug\app-debug.apk'
  if (-not (Test-Path -LiteralPath $sourceApk)) {
    throw "APK was not created at $sourceApk"
  }

  $outputDir = Join-Path $workspace 'builds\apk'
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

  $baseName = "ocean-chronicle-v$version-$timestamp-debug"
  $destApk = Join-Path $outputDir "$baseName.apk"
  $suffix = 2
  while (Test-Path -LiteralPath $destApk) {
    $destApk = Join-Path $outputDir "$baseName-$suffix.apk"
    $suffix += 1
  }

  Copy-Item -LiteralPath $sourceApk -Destination $destApk
  $sizeMb = [math]::Round((Get-Item -LiteralPath $destApk).Length / 1MB, 2)

  Write-Host "Versioned APK: $destApk"
  Write-Host "APK size: $sizeMb MB"
}
finally {
  Pop-Location
}

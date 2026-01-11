# PowerShell script لبناء APK
Write-Host "Building Android APK..." -ForegroundColor Cyan

# Build web assets
Write-Host "Building web assets..." -ForegroundColor Yellow
npm run build

# Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android

# Build APK
Write-Host "Building APK..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "APK built successfully!" -ForegroundColor Green
    Write-Host "APK location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}

Set-Location ..


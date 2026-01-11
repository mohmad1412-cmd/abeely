# Script to debug Twilio/SMS configuration
Write-Host "Checking Twilio and Supabase settings..." -ForegroundColor Cyan
Write-Host ""

# 1. Check environment variables
Write-Host "1. Checking environment variables:" -ForegroundColor Yellow
$envVars = @("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGE_SERVICE_SID")
$missing = @()

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "User")
    if ($value) {
        Write-Host "   [OK] $var exists" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] $var not found" -ForegroundColor Red
        $missing += $var
    }
}

Write-Host ""

# 2. Check .env.local file
Write-Host "2. Checking .env.local file:" -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   [OK] .env.local file exists" -ForegroundColor Green
    $envContent = Get-Content ".env.local" -Raw
    foreach ($var in $envVars) {
        if ($envContent -match "VITE_$var" -or $envContent -match $var) {
            Write-Host "   [OK] $var found in .env.local" -ForegroundColor Green
        } else {
            Write-Host "   [MISSING] $var not found in .env.local" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [MISSING] .env.local file not found" -ForegroundColor Red
}

Write-Host ""

# 3. Check Supabase config
Write-Host "3. Checking Supabase config.toml:" -ForegroundColor Yellow
if (Test-Path "supabase\config.toml") {
    $config = Get-Content "supabase\config.toml" -Raw
    if ($config -match "\[auth\.sms\.twilio\]") {
        Write-Host "   [OK] Twilio config found in config.toml" -ForegroundColor Green
        if ($config -match "enabled = true") {
            Write-Host "   [OK] Twilio is enabled" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] Twilio may not be enabled" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [MISSING] Twilio config not found in config.toml" -ForegroundColor Red
    }
} else {
    Write-Host "   [MISSING] config.toml file not found" -ForegroundColor Red
}

Write-Host ""

# 4. Check Supabase local
Write-Host "4. Checking Supabase Local:" -ForegroundColor Yellow
$supabaseStatus = Get-Process -Name "supabase" -ErrorAction SilentlyContinue
if ($supabaseStatus) {
    Write-Host "   [OK] Supabase local is running" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] Supabase local may not be running" -ForegroundColor Yellow
    Write-Host "   Tip: Try 'supabase start'" -ForegroundColor Cyan
}

Write-Host ""

# 5. Summary
Write-Host "Summary:" -ForegroundColor Cyan
if ($missing.Count -eq 0) {
    Write-Host "   [OK] All variables exist" -ForegroundColor Green
} else {
    Write-Host "   [MISSING] Missing variables: $($missing -join ', ')" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Solution:" -ForegroundColor Yellow
    Write-Host "   1. Add variables to .env.local file" -ForegroundColor White
    Write-Host "   2. Or add them in Supabase Dashboard -> Settings -> API -> Environment Variables" -ForegroundColor White
    Write-Host "   3. Or add them in Supabase Dashboard -> Authentication -> Providers -> Phone -> Twilio" -ForegroundColor White
}

Write-Host ""
Write-Host "To check errors:" -ForegroundColor Cyan
Write-Host "   1. Open Browser Console (F12)" -ForegroundColor White
Write-Host "   2. Look for messages starting with 'Supabase OTP Error'" -ForegroundColor White
Write-Host "   3. Look for messages starting with '[DEBUG]'" -ForegroundColor White

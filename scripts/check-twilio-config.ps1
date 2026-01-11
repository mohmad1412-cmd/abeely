# Script to check Twilio configuration
Write-Host "Checking Twilio configuration..." -ForegroundColor Cyan
Write-Host ""

# Check .env.local
Write-Host "Checking .env.local:" -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "TWILIO_ACCOUNT_SID=(.+)") {
        $accountSid = $matches[1].Trim()
        Write-Host "   [OK] TWILIO_ACCOUNT_SID: $($accountSid.Substring(0, [Math]::Min(10, $accountSid.Length)))..." -ForegroundColor Green
    } else {
        Write-Host "   [X] TWILIO_ACCOUNT_SID: Not found" -ForegroundColor Red
    }
    
    if ($envContent -match "TWILIO_AUTH_TOKEN=(.+)") {
        $authToken = $matches[1].Trim()
        Write-Host "   [OK] TWILIO_AUTH_TOKEN: Found" -ForegroundColor Green
    } else {
        Write-Host "   [X] TWILIO_AUTH_TOKEN: Not found" -ForegroundColor Red
    }
    
    if ($envContent -match "TWILIO_MESSAGE_SERVICE_SID=(.+)") {
        $serviceSid = $matches[1].Trim()
        if ($serviceSid.StartsWith("VA")) {
            Write-Host "   [OK] TWILIO_MESSAGE_SERVICE_SID: $serviceSid (Correct Verify Service SID)" -ForegroundColor Green
        } else {
            Write-Host "   [WARN] TWILIO_MESSAGE_SERVICE_SID: $serviceSid (Should start with VA...)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [X] TWILIO_MESSAGE_SERVICE_SID: Not found" -ForegroundColor Red
    }
} else {
    Write-Host "   [X] .env.local file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking Supabase URL:" -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
        Write-Host "   [OK] VITE_SUPABASE_URL: $supabaseUrl" -ForegroundColor Green
        
        if ($supabaseUrl -match "gfjtyfwwbpjbwafbnfcc") {
            Write-Host "   [INFO] Project: gfjtyfwwbpjbwafbnfcc" -ForegroundColor Cyan
            Write-Host "   [LINK] Dashboard: https://app.supabase.com/project/gfjtyfwwbpjbwafbnfcc" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "   1. Supabase Production needs Verify Service SID in Dashboard" -ForegroundColor White
Write-Host "   2. Go to: Authentication -> Providers -> Phone -> Twilio" -ForegroundColor White
Write-Host "   3. Add Verify Service SID: VAd3616e461754714a2f8f5b3ada9d5474" -ForegroundColor White
Write-Host "   4. Make sure to save changes" -ForegroundColor White
Write-Host ""
Write-Host "For Development: Use phone 0555555555 with code 0000" -ForegroundColor Green
